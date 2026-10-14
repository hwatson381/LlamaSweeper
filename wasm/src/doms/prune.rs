//! Exact dominance pruning.
//!
//! State `A` dominates state `B` when `A` is guaranteed to finish at least as cheaply as `B` for
//! every possible choice of the remaining chords. Only factor hits can make the futures differ:
//! * a mine `B` has already flagged but `A` hasn't may still cost `A` one extra right click, and
//! * a 3BV unit `A` has already solved but `B` hasn't may still save `B` one left click.
//!
//! So `A` dominates `B` when `cost(B) - cost(A)` covers the number of such factors. States with
//! the same connectivity are compared first; then a state may also be dominated by one whose
//! chains are a coarser grouping of the same future reach (it can never need more seed clicks).
//! Finally a state whose chains exactly split a coarser state's chains may dominate it if its cost
//! lead also covers one click per extra chain (each could need its own seed).
//! Removing a state is always proven safe, so pruning never makes the answer approximate.

use super::table::{ConnectivityPool, StateTable};
use rustc_hash::FxHashMap;

/// In "good bit" form (mine hit, or 3BV unit not yet solved) the penalty is simply the good
/// bits `target` has that `dominator` lacks.
fn dominance_penalty_at_most(dominator: &[u64], target: &[u64], bbbv_factor_mask: &[u64], allowance: i32) -> bool {
    let mut penalty = 0i32;
    for word in 0..dominator.len() {
        let dominator_good = dominator[word] ^ bbbv_factor_mask[word];
        let target_good = target[word] ^ bbbv_factor_mask[word];
        penalty += (target_good & !dominator_good).count_ones() as i32;
        if penalty > allowance {
            return false;
        }
    }
    true
}

fn is_subset(fine: &[u64], coarse: &[u64]) -> bool {
    fine.iter().zip(coarse).all(|(&f, &c)| f | c == c)
}

/// Kuhn's augmenting path step, with each coarse chain's eligible fine chains as a bitmask.
fn kuhn_augment_mask(coarse: usize, eligible: &[u64], seen: &mut u64, fine_match: &mut [i32]) -> bool {
    let mut choices = eligible[coarse] & !*seen;
    while choices != 0 {
        let fine = choices.trailing_zeros() as usize;
        choices &= choices - 1;
        let bit = 1u64 << fine;
        if *seen & bit != 0 {
            continue;
        }
        *seen |= bit;
        if fine_match[fine] < 0 || kuhn_augment_mask(fine_match[fine] as usize, eligible, seen, fine_match) {
            fine_match[fine] = coarse as i32;
            return true;
        }
    }
    false
}

/// Kuhn's augmenting path step for more than 64 fine chains.
fn kuhn_augment(coarse: usize, eligible: &[Vec<bool>], seen: &mut [bool], fine_match: &mut [i32]) -> bool {
    for fine in 0..seen.len() {
        if !eligible[coarse][fine] || seen[fine] {
            continue;
        }
        seen[fine] = true;
        if fine_match[fine] < 0 || kuhn_augment(fine_match[fine] as usize, eligible, seen, fine_match) {
            fine_match[fine] = coarse as i32;
            return true;
        }
    }
    false
}

/// A coarser signature can stand in for a finer one when every fine chain's future reach is
/// contained in some coarse chain, and every coarse chain can be matched to a distinct fine chain
/// (otherwise the coarse state could need a seed click the fine state doesn't).
fn connectivity_coarsens(coarse: &[u64], fine: &[u64], signature_words: usize) -> bool {
    let coarse_count = coarse.len() / signature_words;
    let fine_count = fine.len() / signature_words;
    if coarse_count > fine_count {
        return false;
    }
    if coarse_count == 0 {
        return fine_count == 0;
    }
    if fine_count <= 64 {
        coarsens_by_mask(coarse, fine, signature_words)
    } else {
        coarsens_general(coarse, fine, signature_words)
    }
}

/// Matching with each coarse chain's eligible fine chains as a bitmask (at most 64 fine chains).
fn coarsens_by_mask(coarse: &[u64], fine: &[u64], signature_words: usize) -> bool {
    let coarse_count = coarse.len() / signature_words;
    let fine_count = fine.len() / signature_words;
    let mut eligible = [0u64; 64];
    for (f, fine_chain) in fine.chunks_exact(signature_words).enumerate() {
        let mut represented = false;
        for (c, coarse_chain) in coarse.chunks_exact(signature_words).enumerate() {
            if is_subset(fine_chain, coarse_chain) {
                eligible[c] |= 1u64 << f;
                represented = true;
            }
        }
        if !represented {
            return false;
        }
    }
    let mut fine_match = [-1i32; 64];
    for c in 0..coarse_count {
        let mut seen = 0u64;
        if !kuhn_augment_mask(c, &eligible[..coarse_count], &mut seen, &mut fine_match[..fine_count]) {
            return false;
        }
    }
    true
}

fn coarsens_general(coarse: &[u64], fine: &[u64], signature_words: usize) -> bool {
    let coarse_count = coarse.len() / signature_words;
    let fine_count = fine.len() / signature_words;
    let mut eligible = vec![vec![false; fine_count]; coarse_count];
    for (f, fine_chain) in fine.chunks_exact(signature_words).enumerate() {
        let mut represented = false;
        for (c, coarse_chain) in coarse.chunks_exact(signature_words).enumerate() {
            eligible[c][f] = is_subset(fine_chain, coarse_chain);
            represented |= eligible[c][f];
        }
        if !represented {
            return false;
        }
    }
    let mut fine_match = vec![-1i32; fine_count];
    for c in 0..coarse_count {
        let mut seen = vec![false; fine_count];
        if !kuhn_augment(c, &eligible, &mut seen, &mut fine_match) {
            return false;
        }
    }
    true
}

/// True when every fine chain lies in exactly one coarse chain and each coarse chain is exactly the
/// union of its fine chains. Any future then leaves the fine side at most `fine - coarse` seeds
/// worse. Containment in several coarse chains is rejected, since the fine chain could join any.
fn refines_exactly(coarse: &[u64], fine: &[u64], signature_words: usize, scratch: &mut Vec<u64>) -> bool {
    scratch.clear();
    scratch.resize(coarse.len(), 0);
    for fine_chain in fine.chunks_exact(signature_words) {
        let mut owner = usize::MAX;
        for (c, coarse_chain) in coarse.chunks_exact(signature_words).enumerate() {
            if is_subset(fine_chain, coarse_chain) {
                if owner != usize::MAX {
                    return false;
                }
                owner = c;
            }
        }
        if owner == usize::MAX {
            return false;
        }
        for (word, &value) in scratch[owner * signature_words..(owner + 1) * signature_words].iter_mut().zip(fine_chain) {
            *word |= value;
        }
    }
    scratch.as_slice() == coarse
}

/// Seconds spent in each stage of `prune_dominated`; all 0 on wasm32, where `Instant` isn't available.
#[derive(Debug, Default, Clone, Copy)]
pub struct PruneTimes {
    /// Bucketing signatures by reach and building a summary for every state.
    pub summaries: f64,
    pub sort: f64,
    pub pass1: f64,
    /// Per-signature chain data shared by passes 2 and 3.
    pub setup: f64,
    pub pass2: f64,
    pub pass3: f64,
}

impl PruneTimes {
    pub fn add(&mut self, other: &PruneTimes) {
        self.summaries += other.summaries;
        self.sort += other.sort;
        self.pass1 += other.pass1;
        self.setup += other.setup;
        self.pass2 += other.pass2;
        self.pass3 += other.pass3;
    }
}

impl std::fmt::Display for PruneTimes {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(
            f,
            "summaries {:.3}s, sort {:.3}s, pass 1 {:.3}s, setup {:.3}s, pass 2 {:.3}s, pass 3 {:.3}s",
            self.summaries, self.sort, self.pass1, self.setup, self.pass2, self.pass3
        )
    }
}

pub(super) struct Lap {
    #[cfg(not(target_arch = "wasm32"))]
    started: std::time::Instant,
}

impl Lap {
    #[cfg(not(target_arch = "wasm32"))]
    pub(super) fn start() -> Self {
        Lap { started: std::time::Instant::now() }
    }

    #[cfg(target_arch = "wasm32")]
    pub(super) fn start() -> Self {
        Lap {}
    }

    /// Seconds since the previous lap, then restarts.
    #[cfg(not(target_arch = "wasm32"))]
    pub(super) fn lap(&mut self) -> f64 {
        let now = std::time::Instant::now();
        let seconds = now.duration_since(self.started).as_secs_f64();
        self.started = now;
        seconds
    }

    #[cfg(target_arch = "wasm32")]
    pub(super) fn lap(&mut self) -> f64 {
        0.0
    }
}

/// What one `prune_dominated` call did. The reverse fields describe pass 3 only.
#[derive(Debug, Default, Clone, Copy)]
pub struct PruneReport {
    pub removed: usize,
    /// States pass 3 removed.
    pub reverse_dominated: usize,
    pub reverse_comparisons: u64,
    pub reverse_limited: bool,
    pub times: PruneTimes,
    /// Pass 1 skipped a state, or pass 2 stopped, because the comparison budget ran out.
    pub limited: bool,
}

/// `(cost + bbbv hits, cost, -total hits)`. A dominator's first element never exceeds its
/// target's, so after sorting only earlier states need to be tried as dominators.
type DominanceKey = (i32, i32, i32);

struct StateSummary {
    bucket: usize,
    entry: usize,
    key: DominanceKey,
    bbbv_hits: i32,
    mine_hits: i32,
    /// `cost + bbbv hits - mine hits`. Domination requires `quasi(dominator) <= quasi(target)`.
    quasi_score: i32,
}

/// Pass 2 filter data for one connectivity id, stored contiguously in scan order.
struct CoarseCandidate {
    id: usize,
    bucket: usize,
    chain_count: usize,
    first_key: DominanceKey,
    minimum_quasi: i32,
    minimum_reach_size: u32,
    maximum_reach_size: u32,
    reach_start: usize,
}

/// Returns what was removed. `comparison_limit` caps state-to-state comparisons in passes 1 and 2
/// and `reverse_limit` those in pass 3 (0 turns it off); reaching either only keeps more states, it
/// never makes the result inexact.
pub fn prune_dominated(
    table: &mut StateTable,
    comparison_limit: u64,
    reverse_limit: u64,
    bbbv_factor_mask: &[u64],
    pool: &ConnectivityPool,
    signature_words: usize,
) -> PruneReport {
    let mut report = PruneReport::default();
    if comparison_limit == 0 || table.len() < 2 {
        return report;
    }
    let mut lap = Lap::start();
    let connectivity_count = pool.len();
    let mut state_counts = vec![0usize; connectivity_count];
    for entry in 0..table.entry_count() {
        if table.is_alive(entry) {
            state_counts[table.connectivity_id(entry) as usize] += 1;
        }
    }

    // Only signatures with the same total future reach can be coarsenings of each other.
    let mut bucket_by_reach: FxHashMap<Vec<u64>, usize> =
        FxHashMap::with_capacity_and_hasher(connectivity_count, Default::default());
    let mut bucket_count = 0;
    let mut connectivity_bucket = vec![usize::MAX; connectivity_count];
    for id in 0..connectivity_count {
        if state_counts[id] == 0 {
            continue;
        }
        let mut total_reach = vec![0u64; signature_words];
        for chain in pool.get(id as u32).chunks(signature_words) {
            for (word, &value) in total_reach.iter_mut().zip(chain) {
                *word |= value;
            }
        }
        let bucket = *bucket_by_reach.entry(total_reach).or_insert(bucket_count);
        if bucket == bucket_count {
            bucket_count += 1;
        }
        connectivity_bucket[id] = bucket;
    }

    let mut summaries: Vec<StateSummary> = Vec::with_capacity(table.len());
    for entry in 0..table.entry_count() {
        if !table.is_alive(entry) {
            continue;
        }
        let bucket = connectivity_bucket[table.connectivity_id(entry) as usize];
        let (mut bbbv_hits, mut total_hits) = (0i32, 0i32);
        for (&hits, &bbbv) in table.factor_hits(entry).iter().zip(bbbv_factor_mask) {
            bbbv_hits += (hits & bbbv).count_ones() as i32;
            total_hits += hits.count_ones() as i32;
        }
        let mine_hits = total_hits - bbbv_hits;
        let cost = table.cost(entry);
        summaries.push(StateSummary {
            bucket,
            entry,
            key: (cost + bbbv_hits, cost, -total_hits),
            bbbv_hits,
            mine_hits,
            quasi_score: cost + bbbv_hits - mine_hits,
        });
    }
    // `entry` makes keys unique, so this gives the same order a stable sort would.
    report.times.summaries = lap.lap();
    summaries.sort_unstable_by_key(|summary| (summary.bucket, summary.key, summary.entry));
    report.times.sort = lap.lap();

    // `charge` is the extra clicks the dominator's future may cost; 0 outside pass 3.
    let dominates = |dominator: &StateSummary, target: &StateSummary, charge: i32| -> bool {
        let allowance = table.cost(target.entry) - table.cost(dominator.entry) - charge;
        if allowance < 0 {
            return false;
        }
        // Hit-count differences give a cheap lower bound on the bit penalty.
        let lower_bound = (target.mine_hits - dominator.mine_hits).max(0)
            + (dominator.bbbv_hits - target.bbbv_hits).max(0);
        if lower_bound > allowance {
            return false;
        }
        dominance_penalty_at_most(
            table.factor_hits(dominator.entry),
            table.factor_hits(target.entry),
            bbbv_factor_mask,
            allowance,
        )
    };

    let mut remaining = comparison_limit;
    let mut dominated = vec![false; summaries.len()];
    let mut survivors: Vec<Vec<usize>> = state_counts.iter().map(|&count| Vec::with_capacity(count)).collect();
    let mut minimum_quasi = vec![i32::MAX; connectivity_count];
    let mut maximum_quasi = vec![i32::MIN; connectivity_count];

    // Pass 1: same connectivity, compare factor hits only.
    for position in 0..summaries.len() {
        let summary = &summaries[position];
        let connectivity_id = table.connectivity_id(summary.entry) as usize;
        let kept = &survivors[connectivity_id];
        let mut is_dominated = false;
        if remaining >= kept.len() as u64 {
            remaining -= kept.len() as u64;
            is_dominated = kept.iter().any(|&prior| dominates(&summaries[prior], summary, 0));
        } else {
            report.limited = true;
        }
        if is_dominated {
            dominated[position] = true;
        } else {
            survivors[connectivity_id].push(position);
            minimum_quasi[connectivity_id] = minimum_quasi[connectivity_id].min(summary.quasi_score);
            maximum_quasi[connectivity_id] = maximum_quasi[connectivity_id].max(summary.quasi_score);
        }
    }

    report.times.pass1 = lap.lap();

    // Chain counts and reach sizes, used to reject impossible coarsenings cheaply.
    let mut chain_counts = vec![0usize; connectivity_count];
    // Each id's chain reach sizes, sorted, at `reach_sizes[reach_start[id]..][..chain_counts[id]]`.
    let mut reach_sizes: Vec<u32> = Vec::new();
    let mut reach_start = vec![0usize; connectivity_count];
    let mut minimum_reach_size = vec![u32::MAX; connectivity_count];
    let mut maximum_reach_size = vec![0u32; connectivity_count];
    let mut coarse_candidates: Vec<CoarseCandidate> = Vec::with_capacity(connectivity_count);
    for id in 0..connectivity_count {
        if survivors[id].is_empty() {
            continue;
        }
        let signature = pool.get(id as u32);
        chain_counts[id] = signature.len() / signature_words;
        reach_start[id] = reach_sizes.len();
        for chain in signature.chunks(signature_words) {
            let reach_size: u32 = chain.iter().map(|word| word.count_ones()).sum();
            minimum_reach_size[id] = minimum_reach_size[id].min(reach_size);
            maximum_reach_size[id] = maximum_reach_size[id].max(reach_size);
            reach_sizes.push(reach_size);
        }
        reach_sizes[reach_start[id]..].sort_unstable();
        coarse_candidates.push(CoarseCandidate {
            id,
            bucket: connectivity_bucket[id],
            chain_count: chain_counts[id],
            first_key: summaries[survivors[id][0]].key,
            minimum_quasi: minimum_quasi[id],
            minimum_reach_size: minimum_reach_size[id],
            maximum_reach_size: maximum_reach_size[id],
            reach_start: reach_start[id],
        });
    }

    // Possible coarse ids grouped by (bucket, chain count) and sorted by first key within each
    // group, so a fine id only visits ids that can pass the chain-count and key checks.
    coarse_candidates
        .sort_unstable_by_key(|candidate| (candidate.bucket, candidate.chain_count, candidate.first_key, candidate.id));
    // (chain count, start, end) runs of `coarse_candidates`, and each bucket's range of runs.
    let mut count_groups: Vec<(usize, usize, usize)> = Vec::new();
    let mut bucket_groups = vec![(0usize, 0usize); bucket_count];
    let mut start = 0;
    while start < coarse_candidates.len() {
        let (bucket, count) = (coarse_candidates[start].bucket, coarse_candidates[start].chain_count);
        let mut end = start + 1;
        while end < coarse_candidates.len()
            && coarse_candidates[end].bucket == bucket
            && coarse_candidates[end].chain_count == count
        {
            end += 1;
        }
        if bucket_groups[bucket].0 == bucket_groups[bucket].1 {
            bucket_groups[bucket] = (count_groups.len(), count_groups.len());
        }
        count_groups.push((count, start, end));
        bucket_groups[bucket].1 = count_groups.len();
        start = end;
    }
    report.times.setup = lap.lap();

    // Pass 2: coarser connectivity dominating finer connectivity. Dominated states stay
    // available as dominators until the scan finishes.
    let mut cross_dominated = vec![false; summaries.len()];
    let mut coarser: Vec<usize> = Vec::new();
    let mut exhausted = false;
    for fine_id in 0..connectivity_count {
        if exhausted {
            break;
        }
        if survivors[fine_id].is_empty() {
            continue;
        }
        coarser.clear();
        let fine_last_key = summaries[*survivors[fine_id].last().unwrap()].key;
        let fine_chain_count = chain_counts[fine_id];
        let fine_reach_sizes = &reach_sizes[reach_start[fine_id]..reach_start[fine_id] + fine_chain_count];
        let (first_group, end_group) = bucket_groups[connectivity_bucket[fine_id]];
        for &(count, start, end) in &count_groups[first_group..end_group] {
            if count > fine_chain_count {
                break;
            }
            for candidate in &coarse_candidates[start..end] {
                if candidate.first_key > fine_last_key {
                    break;
                }
                if candidate.id == fine_id || candidate.minimum_quasi > maximum_quasi[fine_id] {
                    continue;
                }
                if maximum_reach_size[fine_id] > candidate.maximum_reach_size
                    || minimum_reach_size[fine_id] > candidate.minimum_reach_size
                {
                    continue;
                }
                // Each coarse chain contains a distinct fine chain, so the sorted sizes must pair up.
                let coarse_reach_sizes = &reach_sizes[candidate.reach_start..candidate.reach_start + count];
                if !fine_reach_sizes.iter().zip(coarse_reach_sizes).all(|(fine, coarse)| fine <= coarse) {
                    continue;
                }
                // Within a bucket, a single coarse chain already contains every fine chain.
                if count == 1
                    || connectivity_coarsens(
                        pool.get(candidate.id as u32),
                        pool.get(fine_id as u32),
                        signature_words,
                    )
                {
                    coarser.push(candidate.id);
                }
            }
        }
        // Restore id order so dominators are tried in the same order as a plain bucket scan.
        coarser.sort_unstable();
        if coarser.is_empty() {
            continue;
        }
        for &position in &survivors[fine_id] {
            let target = &summaries[position];
            let mut is_dominated = false;
            'coarse: for &coarse_id in &coarser {
                for &prior in &survivors[coarse_id] {
                    let dominator = &summaries[prior];
                    if dominator.key > target.key {
                        break;
                    }
                    if remaining == 0 {
                        exhausted = true;
                        report.limited = true;
                        break 'coarse;
                    }
                    remaining -= 1;
                    if dominates(dominator, target, 0) {
                        is_dominated = true;
                        break 'coarse;
                    }
                }
            }
            cross_dominated[position] = is_dominated;
            if exhausted {
                break;
            }
        }
    }

    report.times.pass2 = lap.lap();

    // Pass 3: finer connectivity dominating coarser connectivity, which also pays one click per
    // extra chain. Every such edge has a positive charge, so it can't close a dominance cycle.
    let mut reverse_dominated = vec![false; summaries.len()];
    if reverse_limit > 0 {
        let mut reverse_remaining = reverse_limit;
        let mut finer: Vec<(usize, i32)> = Vec::new();
        let mut refine_scratch: Vec<u64> = Vec::new();
        'targets: for coarse_id in 0..connectivity_count {
            let coarse_count = chain_counts[coarse_id];
            if coarse_count == 0 || survivors[coarse_id].iter().all(|&position| cross_dominated[position]) {
                continue;
            }
            let coarse_last_key = summaries[*survivors[coarse_id].last().unwrap()].key;
            finer.clear();
            let (first_group, end_group) = bucket_groups[connectivity_bucket[coarse_id]];
            for &(count, start, end) in &count_groups[first_group..end_group] {
                if count <= coarse_count {
                    continue;
                }
                let charge = (count - coarse_count) as i32;
                for candidate in &coarse_candidates[start..end] {
                    if candidate.first_key.0 + charge > coarse_last_key.0 {
                        break;
                    }
                    if candidate.minimum_quasi + charge > maximum_quasi[coarse_id]
                        || candidate.maximum_reach_size > maximum_reach_size[coarse_id]
                        || candidate.minimum_reach_size > minimum_reach_size[coarse_id]
                    {
                        continue;
                    }
                    // Within a bucket, a single coarse chain is exactly the union of every fine chain.
                    if coarse_count == 1
                        || refines_exactly(
                            pool.get(coarse_id as u32),
                            pool.get(candidate.id as u32),
                            signature_words,
                            &mut refine_scratch,
                        )
                    {
                        finer.push((candidate.id, charge));
                    }
                }
            }
            if finer.is_empty() {
                continue;
            }
            for &position in &survivors[coarse_id] {
                if cross_dominated[position] {
                    continue;
                }
                let target = &summaries[position];
                'finer: for &(fine_id, charge) in &finer {
                    for &prior in &survivors[fine_id] {
                        let dominator = &summaries[prior];
                        if dominator.key.0 + charge > target.key.0 {
                            break;
                        }
                        if reverse_remaining == 0 {
                            report.reverse_limited = true;
                            break 'targets;
                        }
                        reverse_remaining -= 1;
                        if dominates(dominator, target, charge) {
                            reverse_dominated[position] = true;
                            report.reverse_dominated += 1;
                            break 'finer;
                        }
                    }
                }
            }
        }
        report.reverse_comparisons = reverse_limit - reverse_remaining;
    }
    report.times.pass3 = lap.lap();

    for position in 0..summaries.len() {
        if dominated[position] || cross_dominated[position] || reverse_dominated[position] {
            table.erase(summaries[position].entry);
            report.removed += 1;
        }
    }
    report
}

#[cfg(test)]
mod tests {
    use super::super::table::set_bit;
    use super::*;
    use rand::rngs::StdRng;
    use rand::{Rng, SeedableRng};

    /// Random fine chains, and a coarse signature made by grouping them (always a valid coarsening).
    fn random_signatures(rng: &mut StdRng, fine_count: usize, words: usize) -> (Vec<u64>, Vec<Vec<u64>>) {
        let mut fine = vec![0u64; fine_count * words];
        for chain in fine.chunks_mut(words) {
            for _ in 0..rng.random_range(1..=3) {
                set_bit(chain, rng.random_range(0..words * 64));
            }
        }
        let group_count = rng.random_range(1..=fine_count);
        let mut groups = vec![vec![0u64; words]; group_count];
        for chain in fine.chunks(words) {
            let group = &mut groups[rng.random_range(0..group_count)];
            for (word, &value) in group.iter_mut().zip(chain) {
                *word |= value;
            }
        }
        groups.retain(|group| group.iter().any(|&word| word != 0));
        (fine, groups)
    }

    #[test]
    fn mask_and_general_matching_agree() {
        let mut rng = StdRng::seed_from_u64(7);
        for _ in 0..5000 {
            let words = rng.random_range(1..=2);
            let fine_count = rng.random_range(1..=64);
            let (fine, mut groups) = random_signatures(&mut rng, fine_count, words);
            // Perturb sometimes, so both true and false answers get compared.
            if rng.random_bool(0.5) {
                let group = rng.random_range(0..groups.len());
                let word = rng.random_range(0..words);
                groups[group][word] &= groups[group][word].wrapping_sub(1);
            }
            let coarse: Vec<u64> = groups.concat();
            assert_eq!(
                coarsens_by_mask(&coarse, &fine, words),
                coarsens_general(&coarse, &fine, words)
            );
        }
    }

    #[test]
    fn exact_refinement_rejects_overlapping_chains() {
        let mut scratch = Vec::new();
        // coarse {x,y},{y,z}; fine {x},{y,z}: same reach and chain count differs, but {x,y} is not covered.
        assert!(!refines_exactly(&[0b011, 0b110], &[0b001, 0b110], 1, &mut scratch));
        // A fine chain inside two coarse chains is ambiguous.
        assert!(!refines_exactly(&[0b011, 0b110], &[0b010, 0b001, 0b100], 1, &mut scratch));
        assert!(refines_exactly(&[0b111], &[0b001, 0b110], 1, &mut scratch));
        assert!(refines_exactly(&[0b0011, 0b1100], &[0b0001, 0b0010, 0b1100], 1, &mut scratch));
    }

    /// Seeds a future costs: connected components of chains and chorded cells, where a chord joins
    /// every chain whose reach contains it.
    fn future_seeds(signature: &[u64], chorded: &[usize], edges: &[(usize, usize)]) -> usize {
        fn find(parent: &mut Vec<usize>, mut node: usize) -> usize {
            while parent[node] != node {
                parent[node] = parent[parent[node]];
                node = parent[node];
            }
            node
        }
        let chain_count = signature.len();
        let mut parent: Vec<usize> = (0..chain_count + chorded.len()).collect();
        let mut components = parent.len();
        let mut join = |parent: &mut Vec<usize>, a: usize, b: usize| {
            let (a, b) = (find(parent, a), find(parent, b));
            if a != b {
                parent[a] = b;
                components -= 1;
            }
        };
        for (index, &cell) in chorded.iter().enumerate() {
            for (chain, &reach) in signature.iter().enumerate() {
                if (reach >> cell) & 1 == 1 {
                    join(&mut parent, chain, chain_count + index);
                }
            }
        }
        for &(a, b) in edges {
            join(&mut parent, chain_count + a, chain_count + b);
        }
        components
    }

    #[test]
    fn exact_refinement_costs_at_most_the_extra_chains() {
        let mut rng = StdRng::seed_from_u64(23);
        let (mut accepted, mut rejected) = (0, 0);
        for _ in 0..4000 {
            let universe = 10;
            let fine_count = rng.random_range(2..=4);
            let fine: Vec<u64> = (0..fine_count)
                .map(|_| (0..rng.random_range(1..=3)).fold(0u64, |chain, _| chain | 1 << rng.random_range(0..universe)))
                .collect();
            let mut coarse = vec![0u64; rng.random_range(1..fine_count)];
            for &chain in &fine {
                let group = rng.random_range(0..coarse.len());
                coarse[group] |= chain;
            }
            coarse.retain(|&chain| chain != 0);
            let mut scratch = Vec::new();
            if !refines_exactly(&coarse, &fine, 1, &mut scratch) {
                rejected += 1;
                continue;
            }
            accepted += 1;
            for _ in 0..50 {
                let chorded: Vec<usize> = (0..universe).filter(|_| rng.random_bool(0.4)).collect();
                let edges: Vec<(usize, usize)> = (0..rng.random_range(0..4))
                    .filter(|_| chorded.len() > 1)
                    .map(|_| (rng.random_range(0..chorded.len()), rng.random_range(0..chorded.len())))
                    .collect();
                let fine_seeds = future_seeds(&fine, &chorded, &edges);
                let coarse_seeds = future_seeds(&coarse, &chorded, &edges);
                assert!(
                    fine_seeds <= coarse_seeds + fine.len() - coarse.len(),
                    "fine {:?} coarse {:?} chorded {:?} edges {:?}",
                    fine,
                    coarse,
                    chorded,
                    edges
                );
            }
        }
        assert!(accepted > 100 && rejected > 100, "accepted {} rejected {}", accepted, rejected);
    }

    #[test]
    fn general_matching_handles_more_than_64_chains() {
        let mut rng = StdRng::seed_from_u64(11);
        for _ in 0..200 {
            let words = 2;
            let fine_count = rng.random_range(65..=100);
            let (fine, groups) = random_signatures(&mut rng, fine_count, words);
            let coarse: Vec<u64> = groups.concat();
            assert!(connectivity_coarsens(&coarse, &fine, words));

            // An extra coarse chain that anchors no fine chain breaks the matching.
            let mut extra = coarse.clone();
            extra.extend(std::iter::repeat(0u64).take(words));
            let last = extra.len() - words;
            extra[last] = 1u64 << 63;
            extra[last + 1] = 1u64 << 63;
            let has_matching_fine = fine.chunks(words).any(|chain| is_subset(chain, &extra[last..]));
            if !has_matching_fine {
                assert!(!connectivity_coarsens(&extra, &fine, words));
            }
        }
    }
}
