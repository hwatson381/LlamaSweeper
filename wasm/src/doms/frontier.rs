//! Frontier dynamic program over chord sets.
//!
//! Candidates are processed in sweep order. After each candidate the DP keeps states of
//! * a connectivity signature: for each unfinished component of chosen chords, which later
//!   candidates it can still reach (directly or via a shared opening), and
//! * which still-active factors have been hit (a mine needing a flag, or a 3bv unit solved).
//!
//! The cost starts at 3bv. Hitting a flag factor costs +1 once, hitting a base factor saves 1
//! once, each chosen chord costs +1, and each component that can no longer grow costs +1 for
//! its seed left click.

use super::model::Model;
use super::order::choose_order;
use super::prune::prune_dominated;
use super::table::{set_bit, test_bit, ConnectivityPool, Table};
use super::DomsError;

pub struct FrontierOutcome {
    /// Chosen chord candidates, as indexes into the original model.
    pub selected: Vec<usize>,
    pub cost: i32,
    pub order_name: String,
    pub peak_states: usize,
    pub max_boundary: usize,
    pub max_active_factors: usize,
}

/// Scratch buffers reused for every connectivity transition in a layer.
struct TransitionScratch {
    outgoing: Vec<u64>,
    offsets: Vec<usize>,
    merged: Vec<u64>,
    canonical: Vec<u64>,
}

/// Connectivity after deciding whether to chord candidate `i`. Returns the new signature id
/// and how many components closed (each needs one seed click).
fn transition(
    old_signature: &[u64],
    selected: bool,
    i: usize,
    future_neighbours: &[u64],
    scratch: &mut TransitionScratch,
    next_pool: &mut ConnectivityPool,
) -> (u32, i32) {
    let words = future_neighbours.len();
    let (word_i, bit_i) = (i / 64, 1u64 << (i % 64));
    let mut closed = 0;
    scratch.outgoing.clear();
    scratch.offsets.clear();
    if selected {
        scratch.merged.copy_from_slice(future_neighbours);
    } else {
        scratch.merged.iter_mut().for_each(|word| *word = 0);
    }

    for component in old_signature.chunks(words) {
        let touches = component[word_i] & bit_i != 0;
        if selected && touches {
            for (merged, &value) in scratch.merged.iter_mut().zip(component) {
                *merged |= value;
            }
            continue;
        }
        let start = scratch.outgoing.len();
        let mut nonempty = false;
        for (word, &value) in component.iter().enumerate() {
            let value = if word == word_i { value & !bit_i } else { value };
            scratch.outgoing.push(value);
            nonempty |= value != 0;
        }
        if nonempty {
            scratch.offsets.push(start);
        } else {
            scratch.outgoing.truncate(start);
            closed += 1;
        }
    }
    if selected {
        scratch.merged[word_i] &= !bit_i;
        if scratch.merged.iter().any(|&word| word != 0) {
            scratch.offsets.push(scratch.outgoing.len());
            let merged = &scratch.merged;
            scratch.outgoing.extend_from_slice(merged);
        } else {
            closed += 1;
        }
    }

    let outgoing = &scratch.outgoing;
    scratch.offsets.sort_by(|&a, &b| outgoing[a..a + words].cmp(&outgoing[b..b + words]));
    scratch.canonical.clear();
    for &offset in &scratch.offsets {
        scratch.canonical.extend_from_slice(&outgoing[offset..offset + words]);
    }
    (next_pool.intern(&scratch.canonical), closed)
}

pub fn solve_frontier(
    original: &Model,
    max_states: usize,
    dominance_comparisons: u64,
    progress: &mut dyn FnMut(usize, usize, usize),
) -> Result<FrontierOutcome, DomsError> {
    let (model, order_name) = choose_order(original);
    let q = model.candidates.len();

    let mut scopes: Vec<&Vec<usize>> = Vec::new();
    let mut is_flag: Vec<bool> = Vec::new();
    for scope in model.mine_scopes.iter().filter(|scope| !scope.is_empty()) {
        scopes.push(scope);
        is_flag.push(true);
    }
    for scope in model.base_scopes.iter().filter(|scope| !scope.is_empty()) {
        scopes.push(scope);
        is_flag.push(false);
    }
    let factor_count = scopes.len();
    let fw = (factor_count + 63) / 64;
    let cw = (q + 63) / 64;

    let mut flag_mask = vec![0u64; fw];
    let mut base_mask = vec![0u64; fw];
    let mut factor_member = vec![0u64; q * fw];
    let mut active_after = vec![0u64; q * fw];
    for (f, scope) in scopes.iter().enumerate() {
        set_bit(if is_flag[f] { &mut flag_mask } else { &mut base_mask }, f);
        for &variable in scope.iter() {
            set_bit(&mut factor_member[variable * fw..(variable + 1) * fw], f);
        }
        // A factor stays active from its first candidate until just before its last.
        let (first, last) = (scope[0], scope[scope.len() - 1]);
        for i in first..last {
            set_bit(&mut active_after[i * fw..(i + 1) * fw], f);
        }
    }

    let mut zero_memberships: Vec<Vec<usize>> = vec![Vec::new(); q];
    for (z, scope) in model.zero_scopes.iter().enumerate() {
        for &variable in scope {
            zero_memberships[variable].push(z);
        }
    }
    let mut future_neighbours = vec![0u64; q * cw];
    for i in 0..q {
        let row = &mut future_neighbours[i * cw..(i + 1) * cw];
        for &other in &model.graph[i] {
            if other > i {
                set_bit(row, other);
            }
        }
        for &z in &zero_memberships[i] {
            for &other in &model.zero_scopes[z] {
                if other > i {
                    set_bit(row, other);
                }
            }
        }
    }

    // Frontier sizes, only used for reporting.
    let last_future: Vec<usize> = (0..q)
        .map(|i| model.graph[i].iter().copied().filter(|&other| other > i).max().unwrap_or(i))
        .collect();
    let boundary_size = |i: usize| -> usize {
        let vertices = (0..=i).filter(|&v| last_future[v] > i).count();
        let zeros = model
            .zero_scopes
            .iter()
            .filter(|scope| !scope.is_empty() && scope[0] <= i && i < scope[scope.len() - 1])
            .count();
        vertices + zeros
    };

    let mut table = Table::new(fw, cw);
    table.reserve(16);
    table.insert(0, &vec![0u64; fw], model.three_bv() as i32, &vec![0u64; cw]);
    let mut pool = ConnectivityPool::with_capacity(1);
    let mut peak_states = 1usize;
    let mut max_boundary = 0usize;
    let mut max_active = 0usize;

    let mut scratch = TransitionScratch {
        outgoing: Vec::new(),
        offsets: Vec::new(),
        merged: vec![0u64; cw],
        canonical: Vec::new(),
    };
    let mut new_hits = vec![0u64; fw];

    for i in 0..q {
        let member = &factor_member[i * fw..(i + 1) * fw];
        let active = &active_after[i * fw..(i + 1) * fw];
        let future = &future_neighbours[i * cw..(i + 1) * cw];

        let mut next = Table::new(fw, cw);
        next.reserve(max_states.saturating_add(1).min(table.len().saturating_mul(2).saturating_add(16)));
        let mut next_pool = ConnectivityPool::with_capacity(pool.len() * 2 + 16);
        let mut transitions: Vec<Option<[(u32, i32); 2]>> = vec![None; pool.len()];

        for entry in 0..table.entry_count() {
            if !table.is_alive(entry) {
                continue;
            }
            let old_conn = table.conn(entry) as usize;
            let connection = match transitions[old_conn] {
                Some(connection) => connection,
                None => {
                    let signature = pool.get(old_conn as u32);
                    let computed = [
                        transition(signature, false, i, future, &mut scratch, &mut next_pool),
                        transition(signature, true, i, future, &mut scratch, &mut next_pool),
                    ];
                    transitions[old_conn] = Some(computed);
                    computed
                }
            };

            let old_hits = table.hits(entry);
            let old_cost = table.cost(entry);
            for selected in 0..2 {
                let mut factor_cost = 0i32;
                for word in 0..fw {
                    let mut hits = old_hits[word];
                    if selected == 1 {
                        let fresh = member[word] & !old_hits[word];
                        factor_cost += (fresh & flag_mask[word]).count_ones() as i32;
                        factor_cost -= (fresh & base_mask[word]).count_ones() as i32;
                        hits |= member[word];
                    }
                    new_hits[word] = hits & active[word];
                }
                let (conn_id, closed) = connection[selected];
                let new_cost = old_cost + selected as i32 + closed + factor_cost;
                match next.find(conn_id, &new_hits) {
                    None => {
                        let inserted = next.insert(conn_id, &new_hits, new_cost, table.chosen(entry));
                        if selected == 1 {
                            set_bit(next.chosen_mut(inserted), i);
                        }
                    }
                    Some(found) => {
                        if new_cost < next.cost(found) {
                            next.set_cost(found, new_cost);
                            next.chosen_mut(found).copy_from_slice(table.chosen(entry));
                            if selected == 1 {
                                set_bit(next.chosen_mut(found), i);
                            }
                        }
                    }
                }
            }
        }

        // Release the previous layer before pruning allocates its temporary structures.
        drop(std::mem::replace(&mut table, Table::new(fw, cw)));
        drop(std::mem::replace(&mut pool, ConnectivityPool::with_capacity(0)));
        drop(transitions);

        prune_dominated(&mut next, dominance_comparisons, &base_mask, &next_pool, cw);
        table = next;
        pool = next_pool;

        peak_states = peak_states.max(table.len());
        max_boundary = max_boundary.max(boundary_size(i));
        max_active = max_active.max(active.iter().map(|word| word.count_ones() as usize).sum());
        progress(i + 1, q, table.len());

        if table.len() > max_states {
            return Err(DomsError::StateLimitExceeded {
                states: table.len(),
                processed: i + 1,
                candidates: q,
            });
        }
    }

    let final_entry = table
        .find(0, &vec![0u64; fw])
        .ok_or_else(|| DomsError::Internal("frontier DP did not reach an empty final state".into()))?;
    let chosen = table.chosen(final_entry);
    let mut selected: Vec<usize> = (0..q)
        .filter(|&i| test_bit(chosen, i))
        .map(|i| original.candidate_index[model.candidates[i]] as usize)
        .collect();
    selected.sort_unstable();

    Ok(FrontierOutcome {
        selected,
        cost: table.cost(final_entry),
        order_name,
        peak_states,
        max_boundary,
        max_active_factors: max_active,
    })
}
