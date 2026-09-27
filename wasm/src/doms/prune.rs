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

fn chain_contains(coarse: &[u64], fine: &[u64], signature_words: usize, c: usize, f: usize) -> bool {
    let range = |index: usize| index * signature_words..(index + 1) * signature_words;
    is_subset(&fine[range(f)], &coarse[range(c)])
}

/// Matching with each coarse chain's eligible fine chains as a bitmask (at most 64 fine chains).
fn coarsens_by_mask(coarse: &[u64], fine: &[u64], signature_words: usize) -> bool {
    let coarse_count = coarse.len() / signature_words;
    let fine_count = fine.len() / signature_words;
    let mut eligible = vec![0u64; coarse_count];
    let mut represented = 0u64;
    for c in 0..coarse_count {
        for f in 0..fine_count {
            if chain_contains(coarse, fine, signature_words, c, f) {
                eligible[c] |= 1u64 << f;
            }
        }
        represented |= eligible[c];
    }
    let all_fine = if fine_count == 64 { u64::MAX } else { (1u64 << fine_count) - 1 };
    if represented != all_fine {
        return false;
    }
    let mut fine_match = vec![-1i32; fine_count];
    for c in 0..coarse_count {
        let mut seen = 0u64;
        if !kuhn_augment_mask(c, &eligible, &mut seen, &mut fine_match) {
            return false;
        }
    }
    true
}

fn coarsens_general(coarse: &[u64], fine: &[u64], signature_words: usize) -> bool {
    let coarse_count = coarse.len() / signature_words;
    let fine_count = fine.len() / signature_words;
    let mut eligible = vec![vec![false; fine_count]; coarse_count];
    for f in 0..fine_count {
        let mut represented = false;
        for c in 0..coarse_count {
            eligible[c][f] = chain_contains(coarse, fine, signature_words, c, f);
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

/// Returns the number of removed states. `comparison_limit` caps state-to-state comparisons;
/// reaching it only keeps more states, it never makes the result inexact.
pub fn prune_dominated(
    table: &mut StateTable,
    comparison_limit: u64,
    bbbv_factor_mask: &[u64],
    pool: &ConnectivityPool,
    signature_words: usize,
) -> usize {
    if comparison_limit == 0 || table.len() < 2 {
        return 0;
    }
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
    let mut bucket_ids: Vec<Vec<u32>> = Vec::new();
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
        let next_bucket = bucket_ids.len();
        let bucket = *bucket_by_reach.entry(total_reach).or_insert(next_bucket);
        if bucket == next_bucket {
            bucket_ids.push(Vec::new());
        }
        connectivity_bucket[id] = bucket;
        bucket_ids[bucket].push(id as u32);
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
    summaries.sort_by_key(|summary| (summary.bucket, summary.key));

    let dominates = |dominator: &StateSummary, target: &StateSummary| -> bool {
        let allowance = table.cost(target.entry) - table.cost(dominator.entry);
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
            is_dominated = kept.iter().any(|&prior| dominates(&summaries[prior], summary));
        }
        if is_dominated {
            dominated[position] = true;
        } else {
            survivors[connectivity_id].push(position);
            minimum_quasi[connectivity_id] = minimum_quasi[connectivity_id].min(summary.quasi_score);
            maximum_quasi[connectivity_id] = maximum_quasi[connectivity_id].max(summary.quasi_score);
        }
    }

    // Chain counts and reach sizes, used to reject impossible coarsenings cheaply.
    let mut chain_counts = vec![0usize; connectivity_count];
    let mut chain_reach_sizes: Vec<Vec<u32>> = vec![Vec::new(); connectivity_count];
    let mut minimum_reach_size = vec![u32::MAX; connectivity_count];
    let mut maximum_reach_size = vec![0u32; connectivity_count];
    for id in 0..connectivity_count {
        if survivors[id].is_empty() {
            continue;
        }
        let signature = pool.get(id as u32);
        chain_counts[id] = signature.len() / signature_words;
        for chain in signature.chunks(signature_words) {
            let reach_size: u32 = chain.iter().map(|word| word.count_ones()).sum();
            minimum_reach_size[id] = minimum_reach_size[id].min(reach_size);
            maximum_reach_size[id] = maximum_reach_size[id].max(reach_size);
            chain_reach_sizes[id].push(reach_size);
        }
        chain_reach_sizes[id].sort_unstable();
    }

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
        for &coarse_id in &bucket_ids[connectivity_bucket[fine_id]] {
            let coarse_id = coarse_id as usize;
            if coarse_id == fine_id || survivors[coarse_id].is_empty() {
                continue;
            }
            if chain_counts[coarse_id] > chain_counts[fine_id] {
                continue;
            }
            if maximum_reach_size[fine_id] > maximum_reach_size[coarse_id]
                || minimum_reach_size[fine_id] > minimum_reach_size[coarse_id]
            {
                continue;
            }
            // Each coarse chain contains a distinct fine chain, so the sorted sizes must pair up.
            let matching_possible = (0..chain_counts[coarse_id])
                .all(|c| chain_reach_sizes[fine_id][c] <= chain_reach_sizes[coarse_id][c]);
            if !matching_possible {
                continue;
            }
            if summaries[survivors[coarse_id][0]].key > fine_last_key {
                continue;
            }
            if minimum_quasi[coarse_id] > maximum_quasi[fine_id] {
                continue;
            }
            // Within a bucket, a single coarse chain already contains every fine chain.
            let relation = chain_counts[coarse_id] == 1
                || connectivity_coarsens(pool.get(coarse_id as u32), pool.get(fine_id as u32), signature_words);
            if relation {
                coarser.push(coarse_id);
            }
        }
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
                        break 'coarse;
                    }
                    remaining -= 1;
                    if dominates(dominator, target) {
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

    let mut removed = 0;
    for position in 0..summaries.len() {
        if dominated[position] || cross_dominated[position] {
            table.erase(summaries[position].entry);
            removed += 1;
        }
    }
    removed
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
