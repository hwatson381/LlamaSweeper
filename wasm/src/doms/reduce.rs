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
//!
//! Two rules: a swap rule (some kept `d` does everything `c` does for no more flags), and a
//! left-click-equivalent rule (chording `c` never beats left clicking what it would solve, with
//! mines no other kept candidate needs counted as a guaranteed saving).
//!
//! `StaticRule::Witness` adds a stronger form of the second rule. The legacy rule assumes every
//! mine of `c` that some other kept candidate needs is flagged for free by that candidate. The
//! witness rule only allows candidates that can really be in the same solution, and charges them
//! the 3BV units of `c` they would also solve.
//!
//! `StaticRule::StrongSwap` adds a stronger swap rule, run after the witness rule. It lets `d` need
//! flags `c` doesn't, or skip units `c` solves, or fail to reveal some neighbours of `c`, as long
//! as the mines and units private to each side, and the extra chain pieces, balance out.

use super::model::ChordModel;
use super::table::{set_bit, test_bit};

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
fn can_drop(sets: &CandidateSets, candidate: usize, neighbours: &[usize], budget: u32) -> bool {
    let units = &sets.units[candidate];
    if units.len() as u32 > budget {
        return false;
    }
    let covers = unit_cover_masks(sets, units, neighbours);
    let all_units = (1u32 << units.len()) - 1;
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StaticRule {
    /// Swap rule and the original left-click-equivalent rule.
    Legacy,
    /// `Legacy`, plus the witness form of the left-click-equivalent rule.
    Witness,
    /// `Witness`, plus a swap rule that weighs the mines and units private to each side.
    StrongSwap,
}

pub const DEFAULT_STATIC_RULE: StaticRule = StaticRule::StrongSwap;

/// Search nodes allowed per candidate in the witness rule; past this the candidate is just kept.
const WITNESS_NODE_LIMIT: u32 = 20_000;

/// A kept candidate `d` that needs at least one mine of `c`, as bitmasks over `c`'s mines and units.
struct Witness {
    candidate: usize,
    mines: u32,
    units: u32,
    is_neighbour: bool,
}

/// Bits of `of_candidate` (the sorted items of `c`) that also appear in `items`.
fn mask_within(of_candidate: &[usize], items: &[usize]) -> u32 {
    of_candidate
        .iter()
        .enumerate()
        .filter(|&(_, item)| items.binary_search(item).is_ok())
        .fold(0u32, |mask, (bit, _)| mask | (1 << bit))
}

/// Drops entries that another entry matches or beats (more mines, no more units).
fn remove_dominated(items: &mut Vec<(u32, u32)>) {
    items.sort_unstable();
    items.dedup();
    let snapshot = items.clone();
    items.retain(|&(mines, units)| {
        !snapshot.iter().any(|&(other_mines, other_units)| {
            (other_mines, other_units) != (mines, units)
                && mines & !other_mines == 0
                && other_units & !units == 0
        })
    });
}

/// Whether some subset of `items[index..]`, added to `covered` mines and `units` solved, has
/// (mines covered - units solved) of at least `need`. Running out of nodes counts as reaching it.
fn costly_gain_reaches(
    nodes: &mut u32,
    limit: u32,
    items: &[(u32, u32)],
    index: usize,
    covered: u32,
    units: u32,
    need: i32,
) -> bool {
    let net = covered.count_ones() as i32 - units.count_ones() as i32;
    if net >= need {
        return true;
    }
    let optimistic = items[index..].iter().fold(covered, |mask, &(mines, _)| mask | mines);
    if index == items.len() || optimistic.count_ones() as i32 - (units.count_ones() as i32) < need {
        return false;
    }
    *nodes += 1;
    if *nodes > limit {
        return true;
    }
    let (mines, solved) = items[index];
    costly_gain_reaches(nodes, limit, items, index + 1, covered | mines, units | solved, need)
        || costly_gain_reaches(nodes, limit, items, index + 1, covered, units, need)
}

/// Exact check of the left-click-equivalent rule with witnesses for one candidate `c`.
///
/// Dropping `c` from a solution `S` changes the cost by `|I| - 2 - saved + lost`, where `I` has one
/// chord from each piece `c`'s chain splits into, `saved` is the mines of `c` no remaining chord
/// needs, and `lost` is the units of `c` no remaining chord solves. `c` can be removed when that is
/// never positive. For a fixed `I` the remaining chords (the witnesses, `D`) are limited to ones
/// that can coexist with `I`:
/// * if `I` is empty, `c` was alone, so no witness is next to `c`;
/// * no witness touches two members of `I`, or those two would be one piece.
///
/// The worst `D` for the rule flags as many of `c`'s mines as possible while solving few of the
/// units `c` needs. Indirect joins between pieces are ignored, which only makes the check stricter.
struct WitnessCheck<'a> {
    sets: &'a CandidateSets,
    neighbours: &'a [usize],
    neighbour_mines: Vec<u32>,
    neighbour_units: Vec<u32>,
    witnesses: Vec<Witness>,
    all_mines: u32,
    all_units: u32,
    nodes: u32,
}

impl<'a> WitnessCheck<'a> {
    fn new(
        model: &ChordModel,
        sets: &'a CandidateSets,
        candidate: usize,
        neighbours: &'a [usize],
        kept: &[bool],
    ) -> Option<Self> {
        let mines = &sets.mines[candidate];
        let units = &sets.units[candidate];
        if mines.len() > 32 || units.len() > 32 {
            return None;
        }
        let mut others: Vec<usize> = mines
            .iter()
            .flat_map(|&mine| model.flag_needed_by[mine].iter().copied())
            .filter(|&other| other != candidate && kept[other])
            .collect();
        others.sort_unstable();
        others.dedup();
        let witnesses = others
            .into_iter()
            .map(|other| Witness {
                candidate: other,
                mines: mask_within(mines, &sets.mines[other]),
                units: mask_within(units, &sets.units[other]),
                is_neighbour: sets.reveals_each_other(candidate, other),
            })
            .collect();
        Some(WitnessCheck {
            sets,
            neighbours,
            neighbour_mines: neighbours.iter().map(|&n| mask_within(mines, &sets.mines[n])).collect(),
            neighbour_units: neighbours.iter().map(|&n| mask_within(units, &sets.units[n])).collect(),
            witnesses,
            all_mines: ((1u64 << mines.len()) - 1) as u32,
            all_units: ((1u64 << units.len()) - 1) as u32,
            nodes: 0,
        })
    }

    /// True when no `D` can make `|I| - 2 - saved + lost` positive for this `I` (indexes into `neighbours`).
    fn within_budget(&mut self, chosen: &[usize]) -> bool {
        self.nodes += 1;
        if self.nodes > WITNESS_NODE_LIMIT {
            return false;
        }
        let (mut units_done, mut mines_done) = (0u32, 0u32);
        for &index in chosen {
            units_done |= self.neighbour_units[index];
            mines_done |= self.neighbour_mines[index];
        }
        let units_left = self.all_units & !units_done;
        let mines_left = self.all_mines & !mines_done;

        // Witnesses solving none of the units still needed cost nothing, so the worst case uses them all.
        let mut free_mines = 0u32;
        let mut costly: Vec<(u32, u32)> = Vec::new();
        for witness in &self.witnesses {
            let mines = witness.mines & mines_left;
            if mines == 0
                || (witness.is_neighbour && chosen.is_empty())
                || chosen.iter().any(|&index| self.neighbours[index] == witness.candidate)
            {
                continue;
            }
            let touching = chosen
                .iter()
                .filter(|&&index| self.sets.reveals_each_other(self.neighbours[index], witness.candidate))
                .count();
            if touching > 1 {
                continue;
            }
            let units = witness.units & units_left;
            if units == 0 {
                free_mines |= mines;
            } else {
                costly.push((mines, units));
            }
        }

        let base = chosen.len() as i32 + units_left.count_ones() as i32 - (mines_left & !free_mines).count_ones() as i32;
        if base > 2 {
            return false;
        }
        // A costly witness helps the worst case only if the mines it adds outnumber the units it solves.
        let need = 3 - base;
        for item in costly.iter_mut() {
            item.0 &= !free_mines;
        }
        costly.retain(|&(mines, _)| mines != 0);
        remove_dominated(&mut costly);
        !costly_gain_reaches(&mut self.nodes, WITNESS_NODE_LIMIT, &costly, 0, 0, 0, need)
    }

    /// Every independent set `I` of neighbours (pairwise not revealing each other) is within budget.
    fn all_within_budget(&mut self, chosen: &mut Vec<usize>, start: usize) -> bool {
        if !self.within_budget(chosen) {
            return false;
        }
        for index in start..self.neighbours.len() {
            let neighbour = self.neighbours[index];
            if chosen.iter().any(|&other| self.sets.reveals_each_other(self.neighbours[other], neighbour)) {
                continue;
            }
            chosen.push(index);
            let within = self.all_within_budget(chosen, index + 1);
            chosen.pop();
            if !within {
                return false;
            }
        }
        true
    }
}

fn can_drop_with_witnesses(
    model: &ChordModel,
    sets: &CandidateSets,
    candidate: usize,
    neighbours: &[usize],
    kept: &[bool],
) -> bool {
    match WitnessCheck::new(model, sets, candidate, neighbours, kept) {
        Some(mut check) => check.all_within_budget(&mut Vec::new(), 0),
        None => false,
    }
}

/// Search nodes allowed per candidate in the strong swap rule, over all its partners and both cases.
const SWAP_NODE_LIMIT: u32 = 20_000;

/// Nodes allowed in one witness-free pre-pass before it gives up and lets the exact check decide.
const SWAP_PREPASS_NODE_LIMIT: u32 = 2_000;

/// Items in `a` but not `b` (both sorted).
fn difference(a: &[usize], b: &[usize]) -> Vec<usize> {
    a.iter().copied().filter(|item| b.binary_search(item).is_err()).collect()
}

/// How many items of `a` are not in `b` (both sorted), without allocating.
fn count_difference(a: &[usize], b: &[usize]) -> usize {
    let (mut count, mut next) = (0, 0);
    for &item in a {
        while next < b.len() && b[next] < item {
            next += 1;
        }
        if next == b.len() || b[next] != item {
            count += 1;
        }
    }
    count
}

/// One case of the strong swap proof, as a budget over two groups of items.
///
/// With `R` the other chords of a solution, `I` one chord from each piece that only `c` was joining
/// (pairwise not revealing each other, and none revealed by the partner `d`), the change in clicks
/// from swapping is at most `|I| + |bad not covered by R| - |good not covered by R|`.
/// `good` items are ones the swap would stop paying for (an adversary wants them covered by `R`),
/// `bad` items ones it would start paying for. The swap is safe in this case when that is
/// never above `budget`.
struct SwapSide {
    good_mines: Vec<usize>,
    good_units: Vec<usize>,
    bad_mines: Vec<usize>,
    bad_units: Vec<usize>,
    budget: i32,
}

impl SwapSide {
    fn good_len(&self) -> usize {
        self.good_mines.len() + self.good_units.len()
    }

    fn bad_len(&self) -> usize {
        self.bad_mines.len() + self.bad_units.len()
    }

    /// Bits of the mines then units of one group that `candidate` needs flagged or solves.
    fn cover_mask(sets: &CandidateSets, mines: &[usize], units: &[usize], candidate: usize) -> u32 {
        let mine_bits = mines
            .iter()
            .enumerate()
            .filter(|&(_, mine)| sets.mines[candidate].binary_search(mine).is_ok())
            .fold(0u32, |mask, (bit, _)| mask | (1 << bit));
        units
            .iter()
            .enumerate()
            .filter(|&(_, unit)| sets.units[candidate].binary_search(unit).is_ok())
            .fold(mine_bits, |mask, (bit, _)| mask | (1 << (mines.len() + bit)))
    }

    fn good_cover(&self, sets: &CandidateSets, candidate: usize) -> u32 {
        Self::cover_mask(sets, &self.good_mines, &self.good_units, candidate)
    }

    fn bad_cover(&self, sets: &CandidateSets, candidate: usize) -> u32 {
        Self::cover_mask(sets, &self.bad_mines, &self.bad_units, candidate)
    }
}

/// A kept candidate other than `c` and `d` that covers some good item of the side being checked.
struct SwapWitness {
    candidate: usize,
    good: u32,
    bad: u32,
    /// Whether it is revealed by `d`. Then it can't share a piece of the chain with a member of `I`.
    touches_partner: bool,
}

/// Exact check of one `SwapSide`, with the same witness search as `WitnessCheck`. Members of `I`
/// are the kept neighbours of `c` that `d` doesn't reveal; a witness can't touch two of them, and
/// one that `d` reveals can't touch any. Indirect joins are ignored, which only makes it stricter.
///
/// Without witnesses it is a cheaper necessary condition: witnesses only help the worst case, so
/// failing without them fails with them. Running out of nodes then proves nothing, so it passes.
struct SwapCheck<'a> {
    sets: &'a CandidateSets,
    neighbours: &'a [usize],
    neighbour_good: Vec<u32>,
    neighbour_bad: Vec<u32>,
    witnesses: Vec<SwapWitness>,
    good_all: u32,
    bad_all: u32,
    budget: i32,
    nodes: &'a mut u32,
    limit: u32,
    /// What running out of nodes counts as: true for the pre-pass, false for the exact check.
    on_limit: bool,
}

impl<'a> SwapCheck<'a> {
    fn new(
        model: &ChordModel,
        sets: &'a CandidateSets,
        side: &SwapSide,
        candidate: usize,
        partner: usize,
        neighbours: &'a [usize],
        kept: &[bool],
        with_witnesses: bool,
        nodes: &'a mut u32,
    ) -> Option<Self> {
        if side.good_len() > 32 || side.bad_len() > 32 {
            return None;
        }
        let mut witnesses = Vec::new();
        if with_witnesses {
            let mut others: Vec<usize> = side
                .good_mines
                .iter()
                .flat_map(|&mine| model.flag_needed_by[mine].iter().copied())
                .chain(side.good_units.iter().flat_map(|&unit| model.bbbv_solved_by[unit].iter().copied()))
                .filter(|&other| other != candidate && other != partner && kept[other])
                .collect();
            others.sort_unstable();
            others.dedup();
            witnesses = others
                .into_iter()
                .map(|other| SwapWitness {
                    candidate: other,
                    good: side.good_cover(sets, other),
                    bad: side.bad_cover(sets, other),
                    touches_partner: sets.reveals_each_other(partner, other),
                })
                .collect();
        }
        Some(SwapCheck {
            sets,
            neighbours,
            neighbour_good: neighbours.iter().map(|&n| side.good_cover(sets, n)).collect(),
            neighbour_bad: neighbours.iter().map(|&n| side.bad_cover(sets, n)).collect(),
            witnesses,
            good_all: ((1u64 << side.good_len()) - 1) as u32,
            bad_all: ((1u64 << side.bad_len()) - 1) as u32,
            budget: side.budget,
            nodes,
            limit: if with_witnesses { SWAP_NODE_LIMIT } else { SWAP_PREPASS_NODE_LIMIT },
            on_limit: !with_witnesses,
        })
    }

    /// True when no witness set can push the change in clicks above the budget for this `I`.
    fn within_budget(&mut self, chosen: &[usize]) -> bool {
        *self.nodes += 1;
        if *self.nodes > self.limit {
            return self.on_limit;
        }
        let (mut good_done, mut bad_done) = (0u32, 0u32);
        for &index in chosen {
            good_done |= self.neighbour_good[index];
            bad_done |= self.neighbour_bad[index];
        }
        let good_left = self.good_all & !good_done;
        let bad_left = self.bad_all & !bad_done;

        // Witnesses covering none of the bad items still left cost nothing, so the worst case uses them all.
        let mut free_good = 0u32;
        let mut costly: Vec<(u32, u32)> = Vec::new();
        for witness in &self.witnesses {
            let good = witness.good & good_left;
            if good == 0 || chosen.iter().any(|&index| self.neighbours[index] == witness.candidate) {
                continue;
            }
            let touching = chosen
                .iter()
                .filter(|&&index| self.sets.reveals_each_other(self.neighbours[index], witness.candidate))
                .count();
            if touching > if witness.touches_partner { 0 } else { 1 } {
                continue;
            }
            let bad = witness.bad & bad_left;
            if bad == 0 {
                free_good |= good;
            } else {
                costly.push((good, bad));
            }
        }

        let base = chosen.len() as i32 + bad_left.count_ones() as i32 - (good_left & !free_good).count_ones() as i32;
        if base > self.budget {
            return false;
        }
        // A costly witness helps the worst case only if the good items it adds outnumber the bad ones it covers.
        let need = self.budget + 1 - base;
        for item in costly.iter_mut() {
            item.0 &= !free_good;
        }
        costly.retain(|&(good, _)| good != 0);
        remove_dominated(&mut costly);
        !costly_gain_reaches(self.nodes, self.limit, &costly, 0, 0, 0, need)
    }

    /// Every independent set `I` of neighbours (pairwise not revealing each other) is within budget.
    fn all_within_budget(&mut self, chosen: &mut Vec<usize>, start: usize) -> bool {
        if !self.within_budget(chosen) {
            return false;
        }
        if *self.nodes > self.limit {
            return self.on_limit;
        }
        for index in start..self.neighbours.len() {
            let neighbour = self.neighbours[index];
            if chosen.iter().any(|&other| self.sets.reveals_each_other(self.neighbours[other], neighbour)) {
                continue;
            }
            chosen.push(index);
            let within = self.all_within_budget(chosen, index + 1);
            chosen.pop();
            if !within {
                return false;
            }
        }
        true
    }
}

/// Root of the exact check for one case, with no allocation: `I` empty and every free witness
/// (a kept chord other than `c` and `d` that covers a good item and no bad one) in the solution.
/// `base` is |bad| - |good|; each good item a free witness covers adds one. When that exceeds
/// `budget` the full check fails at its first set, so the pair can be dropped right away.
fn free_witnesses_break_case(
    model: &ChordModel,
    sets: &CandidateSets,
    candidate: usize,
    partner: usize,
    kept: &[bool],
    swapped_in: bool,
    base: i32,
    budget: i32,
) -> bool {
    let need = budget - base + 1;
    if need <= 0 {
        return true;
    }
    let covers_bad = |other: usize| {
        sets.units[other]
            .iter()
            .any(|unit| sets.units[candidate].binary_search(unit).is_ok() && sets.units[partner].binary_search(unit).is_err())
            || (swapped_in
                && sets.mines[other].iter().any(|mine| {
                    sets.mines[partner].binary_search(mine).is_ok() && sets.mines[candidate].binary_search(mine).is_err()
                }))
    };
    let has_free_cover = |others: &[usize]| {
        others.iter().any(|&other| other != candidate && other != partner && kept[other] && !covers_bad(other))
    };
    let mut covered = 0;
    for &mine in &sets.mines[candidate] {
        if sets.mines[partner].binary_search(&mine).is_err() && has_free_cover(&model.flag_needed_by[mine]) {
            covered += 1;
            if covered >= need {
                return true;
            }
        }
    }
    if swapped_in {
        for &unit in &sets.units[partner] {
            if sets.units[candidate].binary_search(&unit).is_err() && has_free_cover(&model.bbbv_solved_by[unit]) {
                covered += 1;
                if covered >= need {
                    return true;
                }
            }
        }
    }
    false
}

/// A kept `d` such that replacing `c` by `d` (or just dropping `c` when `d` is already chorded)
/// never costs clicks. Both cases are needed: the private units of `d` only help when `d` is
/// swapped in, not when it was already there.
///
/// `D` below is the other chords, `I` one chord from each piece of the chain only `c` was joining:
/// * `d` not chorded: change <= |I| + |M(d)-M(c) uncovered| + |B(c)-B(d) uncovered|
///   - |M(c)-M(d) uncovered| - |B(d)-B(c) uncovered|, which must be <= 0.
/// * `d` chorded: change <= |I| - 1 + |B(c)-B(d) uncovered| - |M(c)-M(d) uncovered|, which must be <= 0.
///
/// `c`'s own reveal set restricted to kept candidates is what `I` is drawn from. Count checks and
/// a root test with free witnesses run first and need no allocation.
fn find_swap_partner(model: &ChordModel, sets: &CandidateSets, candidate: usize, kept: &[bool]) -> Option<usize> {
    let mut partners: Vec<usize> = sets.mines[candidate]
        .iter()
        .flat_map(|&mine| model.flag_needed_by[mine].iter().copied())
        .chain(sets.units[candidate].iter().flat_map(|&unit| model.bbbv_solved_by[unit].iter().copied()))
        .chain(sets.reveals[candidate].iter().copied())
        .filter(|&other| other != candidate && kept[other])
        .collect();
    partners.sort_unstable();
    partners.dedup();

    let mut nodes = 0u32;
    for partner in partners {
        if nodes > SWAP_NODE_LIMIT {
            return None;
        }
        let units_only_c_count = count_difference(&sets.units[candidate], &sets.units[partner]);
        let mines_only_c_count = count_difference(&sets.mines[candidate], &sets.mines[partner]);
        // Each case fails when its counts alone fail (empty `I`, no witnesses), so no search is needed.
        if units_only_c_count > 1 + mines_only_c_count {
            continue;
        }
        let units_only_d_count = count_difference(&sets.units[partner], &sets.units[candidate]);
        let mines_only_d_count = count_difference(&sets.mines[partner], &sets.mines[candidate]);
        if mines_only_d_count + units_only_c_count > mines_only_c_count + units_only_d_count {
            continue;
        }
        let bad_over_good_both = (mines_only_d_count + units_only_c_count) as i32 - (mines_only_c_count + units_only_d_count) as i32;
        let bad_over_good_chorded = units_only_c_count as i32 - mines_only_c_count as i32;
        if free_witnesses_break_case(model, sets, candidate, partner, kept, false, bad_over_good_chorded, 1)
            || free_witnesses_break_case(model, sets, candidate, partner, kept, true, bad_over_good_both, 0)
        {
            continue;
        }
        let mines_only_c = difference(&sets.mines[candidate], &sets.mines[partner]);
        let units_only_c = difference(&sets.units[candidate], &sets.units[partner]);
        let mines_only_d = difference(&sets.mines[partner], &sets.mines[candidate]);
        let units_only_d = difference(&sets.units[partner], &sets.units[candidate]);

        let unrevealed: Vec<usize> = sets.reveals[candidate]
            .iter()
            .copied()
            .filter(|&neighbour| kept[neighbour] && neighbour != partner && !sets.reveals_each_other(partner, neighbour))
            .collect();
        let already_chorded = SwapSide {
            good_mines: mines_only_c.clone(),
            good_units: Vec::new(),
            bad_mines: Vec::new(),
            bad_units: units_only_c.clone(),
            budget: 1,
        };
        let swapped_in = SwapSide {
            good_mines: mines_only_c,
            good_units: units_only_d,
            bad_mines: mines_only_d,
            bad_units: units_only_c,
            budget: 0,
        };
        let within = |side: &SwapSide, with_witnesses: bool, nodes: &mut u32| -> bool {
            match SwapCheck::new(model, sets, side, candidate, partner, &unrevealed, kept, with_witnesses, nodes) {
                Some(mut check) => check.all_within_budget(&mut Vec::new(), 0),
                None => false,
            }
        };
        // Pre-pass without witnesses first: it rejects most pairs before any witness list is built.
        let mut prepass_nodes = 0u32;
        if within(&already_chorded, false, &mut prepass_nodes)
            && within(&swapped_in, false, &mut prepass_nodes)
            && within(&already_chorded, true, &mut nodes)
            && within(&swapped_in, true, &mut nodes)
        {
            return Some(partner);
        }
    }
    None
}

/// The kept `d` the strong swap rule would replace `candidate` with, given which candidates are
/// `kept`. Exposed so tests can check the swap claim directly against every chord set.
pub fn strong_swap_partner(model: &ChordModel, kept: &[bool], candidate: usize) -> Option<usize> {
    let sets = CandidateSets::new(model);
    find_swap_partner(model, &sets, candidate, kept)
}

/// Removes candidates until no rule applies. `witness` also enables the witness rule.
fn reduce_to_fixpoint(model: &ChordModel, sets: &CandidateSets, kept: &mut [bool], witness: bool) {
    let mut changed = true;
    while changed {
        changed = false;
        for candidate in 0..kept.len() {
            if !kept[candidate] {
                continue;
            }
            let neighbours: Vec<usize> =
                sets.reveals[candidate].iter().copied().filter(|&other| kept[other]).collect();
            let credit = private_mines(model, sets, candidate, kept);
            let removable = can_drop(sets, candidate, &neighbours, 2 + credit)
                || has_swap(model, sets, candidate, &neighbours, kept)
                || (witness && can_drop_with_witnesses(model, sets, candidate, &neighbours, kept));
            if removable {
                kept[candidate] = false;
                changed = true;
            }
        }
    }
}

/// For each candidate, the others it shares a mine or a 3BV unit with, or reveals. Every rule's
/// verdict on `x` depends only on which candidates are kept among these and, through the units of
/// its partners, among theirs, so removing `c` can only change verdicts within two steps of `c`.
fn nearby_candidates(model: &ChordModel, sets: &CandidateSets) -> Vec<Vec<usize>> {
    (0..sets.reveals.len())
        .map(|candidate| {
            let mut list = sets.reveals[candidate].clone();
            for &mine in &sets.mines[candidate] {
                list.extend(model.flag_needed_by[mine].iter().copied());
            }
            for &unit in &sets.units[candidate] {
                list.extend(model.bbbv_solved_by[unit].iter().copied());
            }
            list.sort_unstable();
            list.dedup();
            list.retain(|&other| other != candidate);
            list
        })
        .collect()
}

const CHECK_STRONG_ONLY: u8 = 1;
const CHECK_ALL_RULES: u8 = 2;

/// Strong swap phase, run once every other rule has settled, so those still fail for every kept
/// candidate and only the strong swap is tried at first. After a removal, the candidates sharing a
/// mine or unit with it or revealing it are checked again with every rule, and those two steps away
/// with the strong swap only: it alone looks that far, at witnesses for a partner's units.
fn reduce_with_strong_swap(model: &ChordModel, sets: &CandidateSets, kept: &mut [bool]) {
    let near = nearby_candidates(model, sets);
    let mut pending: Vec<u8> = kept.iter().map(|&is_kept| if is_kept { CHECK_STRONG_ONLY } else { 0 }).collect();
    loop {
        let mut more = false;
        for candidate in 0..kept.len() {
            let level = pending[candidate];
            if level == 0 {
                continue;
            }
            pending[candidate] = 0;
            if !kept[candidate] {
                continue;
            }
            let removable = level == CHECK_ALL_RULES && {
                let neighbours: Vec<usize> =
                    sets.reveals[candidate].iter().copied().filter(|&other| kept[other]).collect();
                can_drop(sets, candidate, &neighbours, 2 + private_mines(model, sets, candidate, kept))
                    || has_swap(model, sets, candidate, &neighbours, kept)
                    || can_drop_with_witnesses(model, sets, candidate, &neighbours, kept)
            } || find_swap_partner(model, sets, candidate, kept).is_some();
            if !removable {
                continue;
            }
            kept[candidate] = false;
            for &close in &near[candidate] {
                if kept[close] {
                    pending[close] = CHECK_ALL_RULES;
                    more = true;
                }
                for &far in &near[close] {
                    if kept[far] && pending[far] == 0 {
                        pending[far] = CHECK_STRONG_ONLY;
                        more = true;
                    }
                }
            }
        }
        if !more {
            break;
        }
    }
}

/// Candidates (sorted) that the default rules can't remove.
pub fn kept_candidates(model: &ChordModel) -> Vec<usize> {
    kept_candidates_with(model, DEFAULT_STATIC_RULE)
}

/// Candidates (sorted) that `rule` can't remove.
pub fn kept_candidates_with(model: &ChordModel, rule: StaticRule) -> Vec<usize> {
    let count = model.candidate_cells.len();
    let sets = CandidateSets::new(model);
    let mut kept = vec![true; count];
    // The cheap rules go first so the witness search sees fewer candidates.
    reduce_to_fixpoint(model, &sets, &mut kept, false);
    if rule != StaticRule::Legacy {
        reduce_to_fixpoint(model, &sets, &mut kept, true);
    }
    if rule == StaticRule::StrongSwap {
        reduce_with_strong_swap(model, &sets, &mut kept);
    }
    (0..count).filter(|&candidate| kept[candidate]).collect()
}
