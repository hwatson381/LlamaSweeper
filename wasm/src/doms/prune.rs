//! Exact dominance pruning. A state is only removed when another state in the same
//! layer is proven to be at least as good for every possible completion.

use super::table::{ConnectivityPool, Table};
use rustc_hash::FxHashMap;

/// In "good-bit" form flag hits and unhit base factors are both desirable, so the
/// candidate's worst extra future cost relative to `other` is `good(other) & !good(candidate)`.
fn dominance_penalty_at_most(candidate: &[u64], other: &[u64], base_mask: &[u64], allowance: i32) -> bool {
    let mut penalty = 0i32;
    for word in 0..candidate.len() {
        let candidate_good = candidate[word] ^ base_mask[word];
        let other_good = other[word] ^ base_mask[word];
        penalty += (other_good & !candidate_good).count_ones() as i32;
        if penalty > allowance {
            return false;
        }
    }
    true
}

fn is_subset(fine: &[u64], coarse: &[u64]) -> bool {
    fine.iter().zip(coarse).all(|(&f, &c)| f | c == c)
}

fn augment_mask(candidate: usize, eligible: &[u64], seen: &mut u64, fine_match: &mut [i32]) -> bool {
    let mut choices = eligible[candidate] & !*seen;
    while choices != 0 {
        let f = choices.trailing_zeros() as usize;
        choices &= choices - 1;
        let bit = 1u64 << f;
        if *seen & bit != 0 {
            continue;
        }
        *seen |= bit;
        if fine_match[f] < 0 || augment_mask(fine_match[f] as usize, eligible, seen, fine_match) {
            fine_match[f] = candidate as i32;
            return true;
        }
    }
    false
}

fn augment_general(candidate: usize, eligible: &[Vec<bool>], seen: &mut [bool], fine_match: &mut [i32]) -> bool {
    for f in 0..seen.len() {
        if !eligible[candidate][f] || seen[f] {
            continue;
        }
        seen[f] = true;
        if fine_match[f] < 0 || augment_general(fine_match[f] as usize, eligible, seen, fine_match) {
            fine_match[f] = candidate as i32;
            return true;
        }
    }
    false
}

/// A coarser signature can stand in for a finer one when every fine component's future
/// reachability is contained in some coarse component, and every coarse component anchors
/// a distinct fine component (so it never adds a future seed-click liability).
fn connectivity_coarsens(coarse: &[u64], fine: &[u64], signature_words: usize) -> bool {
    let coarse_count = coarse.len() / signature_words;
    let fine_count = fine.len() / signature_words;
    if coarse_count > fine_count {
        return false;
    }
    if coarse_count == 0 {
        return fine_count == 0;
    }
    let range = |index: usize| index * signature_words..(index + 1) * signature_words;
    let subset = |f: usize, c: usize| is_subset(&fine[range(f)], &coarse[range(c)]);

    if fine_count <= 64 {
        let mut eligible = vec![0u64; coarse_count];
        let mut represented = 0u64;
        for c in 0..coarse_count {
            for f in 0..fine_count {
                if subset(f, c) {
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
            if !augment_mask(c, &eligible, &mut seen, &mut fine_match) {
                return false;
            }
        }
        return true;
    }

    let mut eligible = vec![vec![false; fine_count]; coarse_count];
    for f in 0..fine_count {
        let mut represented = false;
        for c in 0..coarse_count {
            eligible[c][f] = subset(f, c);
            represented |= eligible[c][f];
        }
        if !represented {
            return false;
        }
    }
    let mut fine_match = vec![-1i32; fine_count];
    for c in 0..coarse_count {
        let mut seen = vec![false; fine_count];
        if !augment_general(c, &eligible, &mut seen, &mut fine_match) {
            return false;
        }
    }
    true
}

type DominanceKey = (i32, i32, i32);

struct CachedItem {
    bucket: usize,
    entry: usize,
    key: DominanceKey,
    base_hits: i32,
    flag_hits: i32,
    quasi_score: i32,
}

/// Returns the number of removed states. `comparison_limit` caps state-to-state
/// comparisons; reaching it only keeps more states, it never makes the result inexact.
pub fn prune_dominated(
    table: &mut Table,
    comparison_limit: u64,
    base_mask: &[u64],
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
            state_counts[table.conn(entry) as usize] += 1;
        }
    }

    // Group connectivity signatures by their total future reachability.
    let mut bucket_by_union: FxHashMap<Vec<u64>, usize> =
        FxHashMap::with_capacity_and_hasher(connectivity_count, Default::default());
    let mut bucket_ids: Vec<Vec<u32>> = Vec::new();
    let mut connectivity_bucket = vec![usize::MAX; connectivity_count];
    for id in 0..connectivity_count {
        if state_counts[id] == 0 {
            continue;
        }
        let mut combined = vec![0u64; signature_words];
        for component in pool.get(id as u32).chunks(signature_words) {
            for (word, &value) in combined.iter_mut().zip(component) {
                *word |= value;
            }
        }
        let next_bucket = bucket_ids.len();
        let bucket = *bucket_by_union.entry(combined).or_insert(next_bucket);
        if bucket == next_bucket {
            bucket_ids.push(Vec::new());
        }
        connectivity_bucket[id] = bucket;
        bucket_ids[bucket].push(id as u32);
    }

    // All states grouped by bucket, each bucket sorted by key.
    let mut items: Vec<CachedItem> = Vec::with_capacity(table.len());
    for entry in 0..table.entry_count() {
        if !table.is_alive(entry) {
            continue;
        }
        let bucket = connectivity_bucket[table.conn(entry) as usize];
        let (mut base_hits, mut total_hits) = (0i32, 0i32);
        for (&hits, &base) in table.hits(entry).iter().zip(base_mask) {
            base_hits += (hits & base).count_ones() as i32;
            total_hits += hits.count_ones() as i32;
        }
        let flag_hits = total_hits - base_hits;
        let cost = table.cost(entry);
        items.push(CachedItem {
            bucket,
            entry,
            key: (cost + base_hits, cost, -total_hits),
            base_hits,
            flag_hits,
            quasi_score: cost + base_hits - flag_hits,
        });
    }
    items.sort_by_key(|item| (item.bucket, item.key));

    let dominates = |candidate: &CachedItem, target: &CachedItem| -> bool {
        let allowance = table.cost(target.entry) - table.cost(candidate.entry);
        if allowance < 0 {
            return false;
        }
        // Count differences give a cheap lower bound on the bit penalty.
        let lower_bound = (target.flag_hits - candidate.flag_hits).max(0)
            + (candidate.base_hits - target.base_hits).max(0);
        if lower_bound > allowance {
            return false;
        }
        dominance_penalty_at_most(table.hits(candidate.entry), table.hits(target.entry), base_mask, allowance)
    };

    let mut remaining = comparison_limit;
    let mut dominated = vec![false; items.len()];
    let mut survivors: Vec<Vec<usize>> = state_counts.iter().map(|&count| Vec::with_capacity(count)).collect();
    let mut minimum_quasi = vec![i32::MAX; connectivity_count];
    let mut maximum_quasi = vec![i32::MIN; connectivity_count];

    // First remove factor-dominated states with identical connectivity.
    for position in 0..items.len() {
        let item = &items[position];
        let connectivity_id = table.conn(item.entry) as usize;
        let kept = &survivors[connectivity_id];
        let mut is_dominated = false;
        if remaining >= kept.len() as u64 {
            remaining -= kept.len() as u64;
            is_dominated = kept.iter().any(|&prior| dominates(&items[prior], item));
        }
        if is_dominated {
            dominated[position] = true;
        } else {
            survivors[connectivity_id].push(position);
            minimum_quasi[connectivity_id] = minimum_quasi[connectivity_id].min(item.quasi_score);
            maximum_quasi[connectivity_id] = maximum_quasi[connectivity_id].max(item.quasi_score);
        }
    }

    let mut component_counts = vec![0usize; connectivity_count];
    let mut component_populations: Vec<Vec<u32>> = vec![Vec::new(); connectivity_count];
    let mut minimum_population = vec![u32::MAX; connectivity_count];
    let mut maximum_population = vec![0u32; connectivity_count];
    for id in 0..connectivity_count {
        if survivors[id].is_empty() {
            continue;
        }
        let signature = pool.get(id as u32);
        component_counts[id] = signature.len() / signature_words;
        for component in signature.chunks(signature_words) {
            let population: u32 = component.iter().map(|word| word.count_ones()).sum();
            minimum_population[id] = minimum_population[id].min(population);
            maximum_population[id] = maximum_population[id].max(population);
            component_populations[id].push(population);
        }
        component_populations[id].sort_unstable();
    }

    // Then apply connectivity-coarsening dominance among exact survivors. Dominated states
    // stay available as witnesses until the scan finishes.
    let mut cross_dominated = vec![false; items.len()];
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
        let fine_last_key = items[*survivors[fine_id].last().unwrap()].key;
        for &coarse_id in &bucket_ids[connectivity_bucket[fine_id]] {
            let coarse_id = coarse_id as usize;
            if coarse_id == fine_id || survivors[coarse_id].is_empty() {
                continue;
            }
            if component_counts[coarse_id] > component_counts[fine_id] {
                continue;
            }
            if maximum_population[fine_id] > maximum_population[coarse_id]
                || minimum_population[fine_id] > minimum_population[coarse_id]
            {
                continue;
            }
            let population_matching_possible = (0..component_counts[coarse_id])
                .all(|c| component_populations[fine_id][c] <= component_populations[coarse_id][c]);
            if !population_matching_possible {
                continue;
            }
            if items[survivors[coarse_id][0]].key > fine_last_key {
                continue;
            }
            if minimum_quasi[coarse_id] > maximum_quasi[fine_id] {
                continue;
            }
            // Within a common-union bucket a single coarse component contains every fine one.
            let relation = component_counts[coarse_id] == 1
                || connectivity_coarsens(pool.get(coarse_id as u32), pool.get(fine_id as u32), signature_words);
            if relation {
                coarser.push(coarse_id);
            }
        }
        if coarser.is_empty() {
            continue;
        }
        for &position in &survivors[fine_id] {
            let cached = &items[position];
            let mut is_dominated = false;
            'coarse: for &coarse_id in &coarser {
                for &prior in &survivors[coarse_id] {
                    let prior = &items[prior];
                    if prior.key > cached.key {
                        break;
                    }
                    if remaining == 0 {
                        exhausted = true;
                        break 'coarse;
                    }
                    remaining -= 1;
                    if dominates(prior, cached) {
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
    for position in 0..items.len() {
        if dominated[position] || cross_dominated[position] {
            table.erase(items[position].entry);
            removed += 1;
        }
    }
    removed
}
