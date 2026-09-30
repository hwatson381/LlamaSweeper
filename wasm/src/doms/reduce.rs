//! Static candidate elimination, run once before the frontier DP.
//!
//! A candidate `c` is removed when every chord set `S` containing it can be changed into one
//! without it that costs no more clicks. The rules only look at, for each candidate,
//! * `M(c)`: the mines its chord needs flagged,
//! * `B(c)`: the 3BV units its chord solves, and
//! * `N(c)`: the candidates its chord reveals, restricted to candidates still kept.
//!
//! Each removal is exact relative to the candidates kept at that point, so the optimum over the
//! final kept set equals the optimum over all candidates. Rules repeat until nothing changes.

use super::model::ChordModel;
use super::table::{set_bit, test_bit};

/// On/off switches, so each rule's effect can be benchmarked.
#[derive(Clone, Copy, Debug)]
pub struct StaticRules {
    /// Swap rule: some kept `d` does everything `c` does for no more flags.
    pub swap: bool,
    /// Nothing-new rule: every neighbour already solves `B(c)`, and dropping `c` splits its chain
    /// into at most two.
    pub nothing_new: bool,
    /// Chording `c` never beats left clicking what it would solve. Contains `nothing_new`.
    pub left_click_equivalent: bool,
    /// Mines no other kept candidate needs are a guaranteed saving when `c` is dropped.
    /// Only affects `left_click_equivalent`.
    pub private_mine_credit: bool,
}

/// The rules the solver uses.
pub const STATIC_RULES: StaticRules =
    StaticRules { swap: true, nothing_new: true, left_click_equivalent: true, private_mine_credit: true };

struct CandidateSets {
    candidate_words: usize,
    /// `N(c)`, sorted.
    reveals: Vec<Vec<usize>>,
    /// `N(c)` as bitsets, `candidate_words` per candidate.
    reveal_bits: Vec<u64>,
    /// `B(c)`, sorted 3BV unit indexes.
    units: Vec<Vec<usize>>,
    /// `M(c)`, sorted indexes into `flag_needed_by`.
    mines: Vec<Vec<usize>>,
}

impl CandidateSets {
    fn new(model: &ChordModel) -> Self {
        let count = model.candidate_cells.len();
        let candidate_words = (count + 63) / 64;
        let mut reveals = Vec::with_capacity(count);
        let mut reveal_bits = vec![0u64; count * candidate_words];
        for candidate in 0..count {
            let mut list = model.adjacent_candidates[candidate].clone();
            for &opening in &model.openings_bordered[candidate] {
                list.extend(model.opening_borders[opening].iter().copied().filter(|&other| other != candidate));
            }
            list.sort_unstable();
            list.dedup();
            let row = &mut reveal_bits[candidate * candidate_words..(candidate + 1) * candidate_words];
            for &other in &list {
                set_bit(row, other);
            }
            reveals.push(list);
        }

        let invert = |lists: &Vec<Vec<usize>>| -> Vec<Vec<usize>> {
            let mut inverted = vec![Vec::new(); count];
            for (item, candidates) in lists.iter().enumerate() {
                for &candidate in candidates {
                    inverted[candidate].push(item);
                }
            }
            inverted
        };

        CandidateSets {
            candidate_words,
            reveals,
            reveal_bits,
            units: invert(&model.bbbv_solved_by),
            mines: invert(&model.flag_needed_by),
        }
    }

    fn reveals_each_other(&self, a: usize, b: usize) -> bool {
        test_bit(&self.reveal_bits[a * self.candidate_words..(a + 1) * self.candidate_words], b)
    }
}

fn is_subset(small: &[usize], big: &[usize]) -> bool {
    small.iter().all(|item| big.binary_search(item).is_ok())
}

/// For each neighbour, a bitmask of which units of `units` (at most 32) it also solves.
fn unit_cover_masks(sets: &CandidateSets, units: &[usize], neighbours: &[usize]) -> Vec<u32> {
    neighbours
        .iter()
        .map(|&neighbour| {
            units
                .iter()
                .enumerate()
                .filter(|&(_, unit)| sets.units[neighbour].binary_search(unit).is_ok())
                .fold(0u32, |mask, (bit, _)| mask | (1 << bit))
        })
        .collect()
}

/// Checks `|I| + (units none of I solve) <= budget` for every non-empty `I` of `neighbours` that
/// pairwise don't reveal each other. Each member of `I` may be left in its own piece of the chain.
fn independent_sets_within_budget(
    sets: &CandidateSets,
    neighbours: &[usize],
    covers: &[u32],
    uncovered: u32,
    chosen: &mut Vec<usize>,
    start: usize,
    budget: u32,
) -> bool {
    for index in start..neighbours.len() {
        let neighbour = neighbours[index];
        if chosen.iter().any(|&other| sets.reveals_each_other(other, neighbour)) {
            continue;
        }
        let still_uncovered = uncovered & !covers[index];
        if chosen.len() as u32 + 1 + still_uncovered.count_ones() > budget {
            return false;
        }
        chosen.push(neighbour);
        let within = independent_sets_within_budget(sets, neighbours, covers, still_uncovered, chosen, index + 1, budget);
        chosen.pop();
        if !within {
            return false;
        }
    }
    true
}

/// Dropping `c` saves its chord, and its seed if it was alone. It can lose each unit of `B(c)`
/// no remaining chord solves, and adds a seed for each extra piece its chain splits into.
fn can_drop(sets: &CandidateSets, candidate: usize, neighbours: &[usize], budget: u32, require_full_cover: bool) -> bool {
    let units = &sets.units[candidate];
    if units.len() as u32 > budget {
        return false;
    }
    let covers = unit_cover_masks(sets, units, neighbours);
    let all_units = (1u32 << units.len()) - 1;
    if require_full_cover && covers.iter().any(|&cover| cover != all_units) {
        return false;
    }
    independent_sets_within_budget(sets, neighbours, &covers, all_units, &mut Vec::new(), 0, budget)
}

/// Mines of `candidate` that no other kept candidate needs flagged.
fn private_mines(model: &ChordModel, sets: &CandidateSets, candidate: usize, kept: &[bool]) -> u32 {
    sets.mines[candidate]
        .iter()
        .filter(|&&mine| model.flag_needed_by[mine].iter().all(|&other| other == candidate || !kept[other]))
        .count() as u32
}

/// Some kept `d` needs no extra flags, solves every unit and reveals every kept candidate `c` does.
/// `d` shares a mine with `c` (`M(d)` is never empty), so only `c`'s mines need searching.
fn has_swap(model: &ChordModel, sets: &CandidateSets, candidate: usize, neighbours: &[usize], kept: &[bool]) -> bool {
    sets.mines[candidate].iter().any(|&mine| {
        model.flag_needed_by[mine].iter().any(|&other| {
            other != candidate
                && kept[other]
                && is_subset(&sets.mines[other], &sets.mines[candidate])
                && is_subset(&sets.units[candidate], &sets.units[other])
                && neighbours.iter().all(|&neighbour| neighbour == other || sets.reveals_each_other(other, neighbour))
        })
    })
}

/// Candidates (sorted) that the rules can't remove.
pub fn kept_candidates(model: &ChordModel, rules: &StaticRules) -> Vec<usize> {
    let count = model.candidate_cells.len();
    let sets = CandidateSets::new(model);
    let mut kept = vec![true; count];
    let mut changed = true;
    while changed {
        changed = false;
        for candidate in 0..count {
            if !kept[candidate] {
                continue;
            }
            let neighbours: Vec<usize> =
                sets.reveals[candidate].iter().copied().filter(|&other| kept[other]).collect();
            let removable = (rules.nothing_new && can_drop(&sets, candidate, &neighbours, 2, true))
                || (rules.left_click_equivalent && {
                    let credit = if rules.private_mine_credit { private_mines(model, &sets, candidate, &kept) } else { 0 };
                    can_drop(&sets, candidate, &neighbours, 2 + credit, false)
                })
                || (rules.swap && has_swap(model, &sets, candidate, &neighbours, &kept));
            if removable {
                kept[candidate] = false;
                changed = true;
            }
        }
    }
    (0..count).filter(|&candidate| kept[candidate]).collect()
}
