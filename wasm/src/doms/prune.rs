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

/// Largest factor bitset the cancellation matching keeps on the stack.
const MAX_CANCELLATION_WORDS: usize = 16;

/// Factor cancellation: row `p` of `covers` has bit `q` set when every undecided candidate that hits
/// factor `p` also hits factor `q`, so a penalty on `p` can be paid for by a bonus on `q`.
pub struct Cancellation<'a> {
    pub covers: &'a [u64],
    pub factor_words: usize,
    /// Number of factors with at least one cover; bounds how many matches a pair can use.
    pub coverable: u32,
}

#[derive(Default)]
pub struct PruneOptions<'a> {
    pub cancellation: Option<Cancellation<'a>>,
    /// Symmetric reveal rows (`signature_words` per candidate), used to spot chains that can only cost a seed.
    pub reveal_rows: Option<&'a [u64]>,
}

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

/// Like `dominance_penalty_at_most`, but a penalty bit can be cancelled by a distinct bonus bit that it
/// covers. Any matching gives a valid bound, so a greedy one is used.
fn cancelled_penalty_at_most(
    dominator: &[u64],
    target: &[u64],
    bbbv_factor_mask: &[u64],
    cancellation: &Cancellation,
    allowance: i32,
) -> bool {
    let words = cancellation.factor_words;
    let mut bonus = [0u64; MAX_CANCELLATION_WORDS];
    let (mut penalty, mut bonus_count) = (0i32, 0i32);
    for word in 0..words {
        let dominator_good = dominator[word] ^ bbbv_factor_mask[word];
        let target_good = target[word] ^ bbbv_factor_mask[word];
        bonus[word] = dominator_good & !target_good;
        penalty += (target_good & !dominator_good).count_ones() as i32;
        bonus_count += bonus[word].count_ones() as i32;
    }
    if penalty - bonus_count > allowance {
        return false;
    }
    for word in 0..words {
        let mut penalty_bits = (target[word] ^ bbbv_factor_mask[word]) & !(dominator[word] ^ bbbv_factor_mask[word]);
        while penalty_bits != 0 {
            let factor = word * 64 + penalty_bits.trailing_zeros() as usize;
            penalty_bits &= penalty_bits - 1;
            let covers = &cancellation.covers[factor * words..(factor + 1) * words];
            if let Some(index) = (0..words).find(|&index| covers[index] & bonus[index] != 0) {
                let available = covers[index] & bonus[index];
                bonus[index] &= !(available & available.wrapping_neg());
                penalty -= 1;
                if penalty <= allowance {
                    return true;
                }
            }
        }
    }
    penalty <= allowance
}

/// A chain whose reach cells all reveal each other can join at most one future component, so it can only
/// cost a seed, never save one.
fn reach_reveals_pairwise(chain: &[u64], reveal_rows: &[u64]) -> bool {
    let words = chain.len();
    for (word_index, &word) in chain.iter().enumerate() {
        let mut bits = word;
        while bits != 0 {
            let cell = word_index * 64 + bits.trailing_zeros() as usize;
            bits &= bits - 1;
            let row = &reveal_rows[cell * words..(cell + 1) * words];
            let missing = chain.iter().zip(row).enumerate().any(|(index, (&reach, &neighbours))| {
                let own = if index == cell / 64 { 1u64 << (cell % 64) } else { 0 };
                reach & !neighbours & !own != 0
            });
            if missing {
                return false;
            }
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
/// `fine_liability` flags fine chains that can only cost a seed (empty means none): dropping one is never
/// worse, so it needs no coarse chain to contain it, though it can still be matched to one.
fn connectivity_coarsens(coarse: &[u64], fine: &[u64], signature_words: usize, fine_liability: &[bool]) -> bool {
    let coarse_count = coarse.len() / signature_words;
    let fine_count = fine.len() / signature_words;
    if coarse_count > fine_count {
        return false;
    }
    if coarse_count == 0 {
        return (0..fine_count).all(|f| fine_liability.get(f) == Some(&true));
    }
    if fine_count <= 64 {
        coarsens_by_mask(coarse, fine, signature_words, fine_liability)
    } else {
        coarsens_general(coarse, fine, signature_words, fine_liability)
    }
}

/// Matching with each coarse chain's eligible fine chains as a bitmask (at most 64 fine chains).
fn coarsens_by_mask(coarse: &[u64], fine: &[u64], signature_words: usize, fine_liability: &[bool]) -> bool {
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
        if !represented && fine_liability.get(f) != Some(&true) {
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

fn coarsens_general(coarse: &[u64], fine: &[u64], signature_words: usize, fine_liability: &[bool]) -> bool {
    let coarse_count = coarse.len() / signature_words;
    let fine_count = fine.len() / signature_words;
    let mut eligible = vec![vec![false; fine_count]; coarse_count];
    for (f, fine_chain) in fine.chunks_exact(signature_words).enumerate() {
        let mut represented = false;
        for (c, coarse_chain) in coarse.chunks_exact(signature_words).enumerate() {
            eligible[c][f] = is_subset(fine_chain, coarse_chain);
            represented |= eligible[c][f];
        }
        if !represented && fine_liability.get(f) != Some(&true) {
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
    /// The only chain is one that can only cost a seed.
    lone_chain_is_liability: bool,
}

/// Returns the number of removed states. `comparison_limit` caps state-to-state comparisons;
/// reaching it only keeps more states, it never makes the result inexact.
///
/// With cancellation on, the sort-key and quasi-score shortcuts below are no longer implied by
/// domination, so they only decide which pairs are tried; every removal is still proven.
pub fn prune_dominated(
    table: &mut StateTable,
    comparison_limit: u64,
    bbbv_factor_mask: &[u64],
    pool: &ConnectivityPool,
    signature_words: usize,
    options: &PruneOptions,
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

    // Per chain of each live signature: can it only cost a seed?
    let mut liability: Vec<bool> = Vec::new();
    let mut liability_range = vec![(0usize, 0usize); connectivity_count];
    if let Some(reveal_rows) = options.reveal_rows {
        for id in 0..connectivity_count {
            if state_counts[id] == 0 {
                continue;
            }
            let start = liability.len();
            liability.extend(
                pool.get(id as u32).chunks(signature_words).map(|chain| reach_reveals_pairwise(chain, reveal_rows)),
            );
            liability_range[id] = (start, liability.len());
        }
    }
    let liability_of = |id: usize| &liability[liability_range[id].0..liability_range[id].1];

    // Only signatures with the same total future reach can be coarsenings of each other. Chains
    // that can only cost a seed don't count towards it, so they may be present on one side only.
    let mut bucket_by_reach: FxHashMap<Vec<u64>, usize> =
        FxHashMap::with_capacity_and_hasher(connectivity_count, Default::default());
    let mut bucket_count = 0;
    let mut connectivity_bucket = vec![usize::MAX; connectivity_count];
    for id in 0..connectivity_count {
        if state_counts[id] == 0 {
            continue;
        }
        let flags = liability_of(id);
        let mut total_reach = vec![0u64; signature_words];
        for (index, chain) in pool.get(id as u32).chunks(signature_words).enumerate() {
            if flags.get(index) == Some(&true) {
                continue;
            }
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
    summaries.sort_unstable_by_key(|summary| (summary.bucket, summary.key, summary.entry));

    let cancellation = options
        .cancellation
        .as_ref()
        .filter(|c| c.factor_words <= MAX_CANCELLATION_WORDS && c.factor_words == bbbv_factor_mask.len());
    let dominates = |dominator: &StateSummary, target: &StateSummary| -> bool {
        let allowance = table.cost(target.entry) - table.cost(dominator.entry);
        if allowance < 0 {
            return false;
        }
        // Hit-count differences give a cheap lower bound on the bit penalty. Each matched pair can
        // cancel one penalty, and bonus bits are mines the dominator hit or units the target hit.
        let lower_bound = (target.mine_hits - dominator.mine_hits).max(0)
            + (dominator.bbbv_hits - target.bbbv_hits).max(0);
        let slack = cancellation
            .map_or(0, |c| (c.coverable as i32).min(dominator.mine_hits + target.bbbv_hits));
        if lower_bound > allowance + slack {
            return false;
        }
        let (dominator_hits, target_hits) = (table.factor_hits(dominator.entry), table.factor_hits(target.entry));
        if dominance_penalty_at_most(dominator_hits, target_hits, bbbv_factor_mask, allowance) {
            return true;
        }
        match cancellation {
            Some(cancellation) if slack > 0 => {
                cancelled_penalty_at_most(dominator_hits, target_hits, bbbv_factor_mask, cancellation, allowance)
            }
            _ => false,
        }
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
    // Each id's chain reach sizes, sorted, at `reach_sizes[reach_start[id]..][..chain_counts[id]]`.
    let mut reach_sizes: Vec<u32> = Vec::new();
    let mut reach_start = vec![0usize; connectivity_count];
    let mut minimum_reach_size = vec![u32::MAX; connectivity_count];
    let mut maximum_reach_size = vec![0u32; connectivity_count];
    // Largest reach among chains that must be contained in a coarse chain (not seed-only chains).
    let mut covered_maximum_reach_size = vec![0u32; connectivity_count];
    let mut coarse_candidates: Vec<CoarseCandidate> = Vec::with_capacity(connectivity_count);
    for id in 0..connectivity_count {
        if survivors[id].is_empty() {
            continue;
        }
        let signature = pool.get(id as u32);
        let flags = liability_of(id);
        chain_counts[id] = signature.len() / signature_words;
        reach_start[id] = reach_sizes.len();
        for (index, chain) in signature.chunks(signature_words).enumerate() {
            let reach_size: u32 = chain.iter().map(|word| word.count_ones()).sum();
            minimum_reach_size[id] = minimum_reach_size[id].min(reach_size);
            maximum_reach_size[id] = maximum_reach_size[id].max(reach_size);
            if flags.get(index) != Some(&true) {
                covered_maximum_reach_size[id] = covered_maximum_reach_size[id].max(reach_size);
            }
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
            lone_chain_is_liability: chain_counts[id] == 1 && flags.first() == Some(&true),
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
                if covered_maximum_reach_size[fine_id] > candidate.maximum_reach_size
                    || minimum_reach_size[fine_id] > candidate.minimum_reach_size
                {
                    continue;
                }
                // Each coarse chain contains a distinct fine chain, so the sorted sizes must pair up.
                let coarse_reach_sizes = &reach_sizes[candidate.reach_start..candidate.reach_start + count];
                if !fine_reach_sizes.iter().zip(coarse_reach_sizes).all(|(fine, coarse)| fine <= coarse) {
                    continue;
                }
                // Within a bucket, a single coarse chain already contains every fine chain, unless
                // that chain was left out of the bucket for only costing a seed.
                if (count == 1 && !candidate.lone_chain_is_liability)
                    || connectivity_coarsens(
                        pool.get(candidate.id as u32),
                        pool.get(fine_id as u32),
                        signature_words,
                        liability_of(fine_id),
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
                coarsens_by_mask(&coarse, &fine, words, &[]),
                coarsens_general(&coarse, &fine, words, &[])
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
            assert!(connectivity_coarsens(&coarse, &fine, words, &[]));

            // An extra coarse chain that anchors no fine chain breaks the matching.
            let mut extra = coarse.clone();
            extra.extend(std::iter::repeat(0u64).take(words));
            let last = extra.len() - words;
            extra[last] = 1u64 << 63;
            extra[last + 1] = 1u64 << 63;
            let has_matching_fine = fine.chunks(words).any(|chain| is_subset(chain, &extra[last..]));
            if !has_matching_fine {
                assert!(!connectivity_coarsens(&extra, &fine, words, &[]));
            }
        }
    }
}
