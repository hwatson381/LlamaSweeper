//! Frontier dynamic program over chord sets.
//!
//! Candidates are decided one at a time in sweep order: either chorded or not. After each
//! decision the DP keeps one cheapest state per distinct
//! * connectivity signature: the unfinished chains, and which undecided candidates each can
//!   still reveal (so chording one of those would extend the chain), and
//! * set of active factors already hit. A *mine factor* is hit when a chord needs that mine
//!   flagged; a *3BV factor* is hit when a chord chain solves that 3BV unit.
//!
//! Cost accounting, which ends up equal to the total clicks:
//! * start at 3BV (every unit left clicked, nothing chorded),
//! * +1 for each chord,
//! * +1 the first time each mine factor is hit (its right click),
//! * -1 the first time each 3BV factor is hit (that left click is no longer needed),
//! * +1 when a chain can no longer grow (its seed left click).
//! * +1 when a chain is absorbed: its reach is exactly the undecided borders of an opening that is
//!   already solved. That state equals one with no chain and the opening unsolved, one click dearer.

use super::model::ChordModel;
use super::order::{choose_sweep_order, coverage, cut_widths};
use super::prune::prune_dominated;
use super::reduce::kept_candidates;
use super::table::{set_bit, test_bit, ConnectivityPool, Lookup, StateTable};
use super::{DomsError, DomsProgress};

pub struct FrontierOutcome {
    /// Chorded candidates, as indexes into the original (unordered) model.
    pub chords: Vec<usize>,
    pub total_clicks: i32,
    pub sweep_order: String,
    pub peak_states: usize,
    pub max_boundary: usize,
    pub max_active_factors: usize,
    /// Candidates removed by the static rules before the DP.
    pub static_removed: usize,
}

/// Per-candidate factor bitsets. Mine factors come first, then 3BV factors.
struct FactorLayout {
    factor_words: usize,
    bbbv_factor_mask: Vec<u64>,
    mine_factor_mask: Vec<u64>,
    factors_hit_by: Vec<u64>,
    /// A factor only needs remembering while some but not all of its candidates are decided.
    active_factors_after: Vec<u64>,
    /// `(factor, opening)` for every 3BV factor that is an opening.
    opening_factors: Vec<(usize, usize)>,
}

impl FactorLayout {
    fn new(model: &ChordModel) -> Self {
        let candidate_count = model.candidate_cells.len();
        let mut factors: Vec<(&Vec<usize>, bool)> = Vec::new();
        factors.extend(model.flag_needed_by.iter().filter(|c| !c.is_empty()).map(|c| (c, true)));
        let mut next_factor = factors.len();
        factors.extend(model.bbbv_solved_by.iter().filter(|c| !c.is_empty()).map(|c| (c, false)));

        // Openings come first among the 3BV units.
        let mut opening_factors = Vec::new();
        for (unit, solvers) in model.bbbv_solved_by.iter().enumerate() {
            if solvers.is_empty() {
                continue;
            }
            if unit < model.opening_borders.len() {
                opening_factors.push((next_factor, unit));
            }
            next_factor += 1;
        }

        let factor_words = (factors.len() + 63) / 64;
        let mut layout = FactorLayout {
            factor_words,
            bbbv_factor_mask: vec![0u64; factor_words],
            mine_factor_mask: vec![0u64; factor_words],
            factors_hit_by: vec![0u64; candidate_count * factor_words],
            active_factors_after: vec![0u64; candidate_count * factor_words],
            opening_factors,
        };
        for (factor, &(candidates, is_mine_factor)) in factors.iter().enumerate() {
            let mask = if is_mine_factor { &mut layout.mine_factor_mask } else { &mut layout.bbbv_factor_mask };
            set_bit(mask, factor);
            let row = |candidate: usize| candidate * factor_words..(candidate + 1) * factor_words;
            for &candidate in candidates.iter() {
                set_bit(&mut layout.factors_hit_by[row(candidate)], factor);
            }
            let (first, last) = (candidates[0], candidates[candidates.len() - 1]);
            for candidate in first..last {
                set_bit(&mut layout.active_factors_after[row(candidate)], factor);
            }
        }
        layout
    }

    fn hit_by(&self, candidate: usize) -> &[u64] {
        &self.factors_hit_by[candidate * self.factor_words..(candidate + 1) * self.factor_words]
    }

    fn active_after(&self, candidate: usize) -> &[u64] {
        &self.active_factors_after[candidate * self.factor_words..(candidate + 1) * self.factor_words]
    }
}

/// For each candidate, the later candidates its chord reveals: adjacent candidates, plus the
/// other borders of any opening it borders.
fn later_reveals(model: &ChordModel, candidate_words: usize) -> Vec<u64> {
    let candidate_count = model.candidate_cells.len();
    let mut reveals = vec![0u64; candidate_count * candidate_words];
    for candidate in 0..candidate_count {
        let row = &mut reveals[candidate * candidate_words..(candidate + 1) * candidate_words];
        for &other in &model.adjacent_candidates[candidate] {
            if other > candidate {
                set_bit(row, other);
            }
        }
        for &opening in &model.openings_bordered[candidate] {
            for &other in &model.opening_borders[opening] {
                if other > candidate {
                    set_bit(row, other);
                }
            }
        }
    }
    reveals
}

/// Scratch buffers reused for every connectivity transition in a layer.
struct TransitionScratch {
    kept_chains: Vec<u64>,
    chain_starts: Vec<usize>,
    merged_chain: Vec<u64>,
    signature: Vec<u64>,
    reduced: Vec<u64>,
    removed_chains: Vec<usize>,
}

/// Opening factors still active after a candidate, with their undecided borders as bitsets.
struct OpenReach {
    factors: Vec<usize>,
    reach: Vec<u64>,
}

/// Removing `chain` from a signature absorbs `factor`'s opening, if that factor's bit is set.
struct Absorption {
    factor: usize,
    chain: usize,
    absorbed_id: u32,
}

/// Result of deciding a candidate for one old connectivity id and one choice.
#[derive(Clone, Copy)]
struct Transition {
    id: u32,
    finished_chains: i32,
    /// Range into the layer's absorption list.
    absorptions: (usize, usize),
}

/// `chain_transition`, plus the absorptions that its new signature allows.
fn full_transition(
    old_signature: &[u64],
    chorded: bool,
    candidate: usize,
    reveals: &[u64],
    open: &OpenReach,
    scratch: &mut TransitionScratch,
    next_pool: &mut ConnectivityPool,
    absorptions: &mut Vec<Absorption>,
) -> Transition {
    let (id, finished_chains) = chain_transition(old_signature, chorded, candidate, reveals, scratch, next_pool);
    let words = reveals.len();
    let start = absorptions.len();
    for (n, &factor) in open.factors.iter().enumerate() {
        let target = &open.reach[n * words..(n + 1) * words];
        let Some(chain) = scratch.signature.chunks(words).position(|chain| chain == target) else {
            continue;
        };
        scratch.reduced.clear();
        for (index, other) in scratch.signature.chunks(words).enumerate() {
            if index != chain {
                scratch.reduced.extend_from_slice(other);
            }
        }
        absorptions.push(Absorption { factor, chain, absorbed_id: next_pool.intern(&scratch.reduced) });
    }
    Transition { id, finished_chains, absorptions: (start, absorptions.len()) }
}

/// New connectivity after deciding `candidate`. Returns the new signature id and how many chains
/// finished (each needs one seed left click).
///
/// Chording merges every chain that could reveal `candidate` into one chain, together with what
/// the new chord reveals. Either way `candidate` is removed from every chain's reach, and a chain
/// with nothing left to reach is finished.
fn chain_transition(
    old_signature: &[u64],
    chorded: bool,
    candidate: usize,
    reveals: &[u64],
    scratch: &mut TransitionScratch,
    next_pool: &mut ConnectivityPool,
) -> (u32, i32) {
    let words = reveals.len();
    let (word, bit) = (candidate / 64, 1u64 << (candidate % 64));
    let mut finished_chains = 0;
    scratch.kept_chains.clear();
    scratch.chain_starts.clear();
    if chorded {
        scratch.merged_chain.copy_from_slice(reveals);
    } else {
        scratch.merged_chain.iter_mut().for_each(|w| *w = 0);
    }

    for chain in old_signature.chunks(words) {
        let reaches_candidate = chain[word] & bit != 0;
        if chorded && reaches_candidate {
            for (merged, &value) in scratch.merged_chain.iter_mut().zip(chain) {
                *merged |= value;
            }
            continue;
        }
        let start = scratch.kept_chains.len();
        let mut can_grow = false;
        for (index, &value) in chain.iter().enumerate() {
            let value = if index == word { value & !bit } else { value };
            scratch.kept_chains.push(value);
            can_grow |= value != 0;
        }
        if can_grow {
            scratch.chain_starts.push(start);
        } else {
            scratch.kept_chains.truncate(start);
            finished_chains += 1;
        }
    }
    if chorded {
        scratch.merged_chain[word] &= !bit;
        if scratch.merged_chain.iter().any(|&w| w != 0) {
            scratch.chain_starts.push(scratch.kept_chains.len());
            let merged = &scratch.merged_chain;
            scratch.kept_chains.extend_from_slice(merged);
        } else {
            finished_chains += 1;
        }
    }

    // Sort chains so the same set of chains always gives the same signature.
    let kept = &scratch.kept_chains;
    scratch.chain_starts.sort_by(|&a, &b| kept[a..a + words].cmp(&kept[b..b + words]));
    scratch.signature.clear();
    for &start in &scratch.chain_starts {
        scratch.signature.extend_from_slice(&kept[start..start + words]);
    }
    (next_pool.intern(&scratch.signature), finished_chains)
}

pub fn solve_frontier(
    original: &ChordModel,
    max_states: usize,
    dominance_comparisons: u64,
    progress: &mut dyn FnMut(DomsProgress),
) -> Result<FrontierOutcome, DomsError> {
    let kept = kept_candidates(original);
    let static_removed = original.candidate_cells.len() - kept.len();
    let (model, sweep_order) = choose_sweep_order(&original.reordered(&kept));
    let candidate_count = model.candidate_cells.len();
    let candidate_words = (candidate_count + 63) / 64;
    let factors = FactorLayout::new(&model);
    let factor_words = factors.factor_words;
    let reveals = later_reveals(&model, candidate_words);
    progress(DomsProgress::Plan { cut_widths: &cut_widths(&model) });

    // Candidates still waiting on an adjacent candidate, plus partly decided openings, after each
    // candidate. Only used for reporting.
    let mut boundary_intervals: Vec<(usize, usize)> = (0..candidate_count)
        .filter_map(|c| {
            let last = model.adjacent_candidates[c].iter().copied().filter(|&other| other > c).max()?;
            Some((c, last - 1))
        })
        .collect();
    boundary_intervals.extend(
        model
            .opening_borders
            .iter()
            .filter(|border| border.len() > 1 && border[0] < border[border.len() - 1])
            .map(|border| (border[0], border[border.len() - 1] - 1)),
    );
    let boundary_sizes = coverage(&boundary_intervals, candidate_count);

    let mut table = StateTable::new(factor_words, candidate_words);
    table.reserve(16);
    if let Lookup::Vacant(slot) = table.lookup(0, &vec![0u64; factor_words]) {
        table.insert_vacant(slot, 0, &vec![0u64; factor_words], model.bbbv() as i32, &vec![0u64; candidate_words]);
    }
    let mut pool = ConnectivityPool::with_capacity(1);
    let mut peak_states = 1usize;
    let mut max_boundary = 0usize;
    let mut max_active_factors = 0usize;

    let mut scratch = TransitionScratch {
        kept_chains: Vec::new(),
        chain_starts: Vec::new(),
        merged_chain: vec![0u64; candidate_words],
        signature: Vec::new(),
        reduced: Vec::new(),
        removed_chains: Vec::new(),
    };
    let mut next_hits = vec![0u64; factor_words];

    for candidate in 0..candidate_count {
        let hit_by = factors.hit_by(candidate);
        let active = factors.active_after(candidate);
        let candidate_reveals = &reveals[candidate * candidate_words..(candidate + 1) * candidate_words];

        let mut next = StateTable::new(factor_words, candidate_words);
        next.reserve(max_states.saturating_add(1).min(table.len().saturating_mul(2).saturating_add(16)));
        let mut next_pool = ConnectivityPool::with_capacity(pool.len() * 2 + 16);
        // Indexed by old connectivity id: [not chorded, chorded].
        let mut transitions: Vec<Option<[Transition; 2]>> = vec![None; pool.len()];
        let mut absorptions: Vec<Absorption> = Vec::new();

        let mut open = OpenReach { factors: Vec::new(), reach: Vec::new() };
        for &(factor, opening) in &factors.opening_factors {
            if !test_bit(active, factor) {
                continue;
            }
            open.factors.push(factor);
            let start = open.reach.len();
            open.reach.resize(start + candidate_words, 0);
            for &border in model.opening_borders[opening].iter().filter(|&&border| border > candidate) {
                set_bit(&mut open.reach[start..], border);
            }
        }

        for entry in 0..table.entry_count() {
            if !table.is_alive(entry) {
                continue;
            }
            let connectivity_id = table.connectivity_id(entry) as usize;
            let transition = match transitions[connectivity_id] {
                Some(transition) => transition,
                None => {
                    let signature = pool.get(connectivity_id as u32);
                    let mut compute = |chorded| {
                        full_transition(
                            signature,
                            chorded,
                            candidate,
                            candidate_reveals,
                            &open,
                            &mut scratch,
                            &mut next_pool,
                            &mut absorptions,
                        )
                    };
                    let computed = [compute(false), compute(true)];
                    transitions[connectivity_id] = Some(computed);
                    computed
                }
            };

            let old_hits = table.factor_hits(entry);
            let old_cost = table.cost(entry);
            for chorded in 0..2 {
                let mut factor_delta = 0i32;
                for word in 0..factor_words {
                    let mut hits = old_hits[word];
                    if chorded == 1 {
                        let first_hits = hit_by[word] & !old_hits[word];
                        factor_delta += (first_hits & factors.mine_factor_mask[word]).count_ones() as i32;
                        factor_delta -= (first_hits & factors.bbbv_factor_mask[word]).count_ones() as i32;
                        hits |= hit_by[word];
                    }
                    next_hits[word] = hits & active[word];
                }
                let state_transition = transition[chorded];
                let mut next_connectivity = state_transition.id;
                let mut next_cost = old_cost + chorded as i32 + state_transition.finished_chains + factor_delta;

                let (first, end) = state_transition.absorptions;
                if first != end {
                    scratch.removed_chains.clear();
                    let mut absorbed_id = next_connectivity;
                    for absorption in &absorptions[first..end] {
                        if test_bit(&next_hits, absorption.factor)
                            && !scratch.removed_chains.contains(&absorption.chain)
                        {
                            scratch.removed_chains.push(absorption.chain);
                            next_hits[absorption.factor / 64] &= !(1u64 << (absorption.factor % 64));
                            absorbed_id = absorption.absorbed_id;
                        }
                    }
                    let absorbed = scratch.removed_chains.len();
                    if absorbed == 1 {
                        next_connectivity = absorbed_id;
                    } else if absorbed > 1 {
                        scratch.reduced.clear();
                        for (index, chain) in next_pool.get(next_connectivity).chunks(candidate_words).enumerate() {
                            if !scratch.removed_chains.contains(&index) {
                                scratch.reduced.extend_from_slice(chain);
                            }
                        }
                        next_connectivity = next_pool.intern(&scratch.reduced);
                    }
                    next_cost += absorbed as i32;
                }
                match next.lookup(next_connectivity, &next_hits) {
                    Lookup::Vacant(slot) => {
                        let inserted =
                            next.insert_vacant(slot, next_connectivity, &next_hits, next_cost, table.chords(entry));
                        if chorded == 1 {
                            set_bit(next.chords_mut(inserted), candidate);
                        }
                    }
                    Lookup::Found(found) => {
                        if next_cost < next.cost(found) {
                            next.set_cost(found, next_cost);
                            next.chords_mut(found).copy_from_slice(table.chords(entry));
                            if chorded == 1 {
                                set_bit(next.chords_mut(found), candidate);
                            }
                        }
                    }
                }
            }
        }

        // Release the previous layer before pruning allocates its temporary structures.
        drop(std::mem::replace(&mut table, StateTable::new(factor_words, candidate_words)));
        drop(std::mem::replace(&mut pool, ConnectivityPool::with_capacity(0)));
        drop(transitions);

        prune_dominated(&mut next, dominance_comparisons, &factors.bbbv_factor_mask, &next_pool, candidate_words);
        table = next;
        pool = next_pool;

        peak_states = peak_states.max(table.len());
        max_boundary = max_boundary.max(boundary_sizes[candidate] as usize);
        max_active_factors = max_active_factors.max(active.iter().map(|word| word.count_ones() as usize).sum());
        progress(DomsProgress::Layer { processed: candidate + 1, total: candidate_count, states: table.len() });

        if table.len() > max_states {
            return Err(DomsError::StateLimitExceeded {
                states: table.len(),
                processed: candidate + 1,
                candidates: candidate_count,
            });
        }
    }

    // Everything is decided, so the answer has no unfinished chains and no active factors.
    let final_entry = table
        .find(0, &vec![0u64; factor_words])
        .ok_or_else(|| DomsError::Internal("frontier DP did not reach an empty final state".into()))?;
    let chord_bits = table.chords(final_entry);
    let mut chords: Vec<usize> = (0..candidate_count)
        .filter(|&candidate| test_bit(chord_bits, candidate))
        .map(|candidate| original.candidate_of_cell[model.candidate_cells[candidate]] as usize)
        .collect();
    chords.sort_unstable();

    Ok(FrontierOutcome {
        chords,
        total_clicks: table.cost(final_entry),
        sweep_order,
        peak_states,
        max_boundary,
        max_active_factors,
        static_removed,
    })
}
