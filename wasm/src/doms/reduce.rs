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

/// Another candidate as seen from `c`: which of `c`'s mines it needs and which of `c`'s units it
/// solves (bit `i` is the `i`-th of `c`'s sorted items), and whether it is in `N(c)`.
#[derive(Clone, Copy)]
struct Near {
    other: usize,
    mines: u32,
    units: u32,
    reveals: bool,
}

struct CandidateSets {
    candidate_words: usize,
    /// `N(c)` as bitsets, `candidate_words` per candidate.
    reveal_bits: Vec<u64>,
    /// `|M(c)|` and `|B(c)|`.
    mine_count: Vec<u32>,
    unit_count: Vec<u32>,
    /// For each candidate `c`, the candidates sharing a mine or unit with it or in `N(c)`, sorted,
    /// stored flat from `near_starts[c]`. Every rule's verdict on `c` depends only on which of these
    /// are kept, and the strong swap's also on which of theirs are.
    near_entries: Vec<Near>,
    near_starts: Vec<usize>,
}

/// Each candidate's items (ascending) from `lists[item]` = the candidates of each item, stored
/// flat: candidate `c`'s are `items[starts[c]..starts[c + 1]]`.
fn invert(lists: &[Vec<usize>], count: usize) -> (Vec<usize>, Vec<usize>) {
    let mut starts = vec![0usize; count + 1];
    for list in lists {
        for &candidate in list {
            starts[candidate + 1] += 1;
        }
    }
    for candidate in 0..count {
        starts[candidate + 1] += starts[candidate];
    }
    let mut next = starts.clone();
    let mut items = vec![0usize; starts[count]];
    for (item, list) in lists.iter().enumerate() {
        for &candidate in list {
            items[next[candidate]] = item;
            next[candidate] += 1;
        }
    }
    (starts, items)
}

impl CandidateSets {
    fn new(model: &ChordModel) -> Self {
        let count = model.candidate_cells.len();
        let candidate_words = (count + 63) / 64;
        let mut reveal_bits = vec![0u64; count * candidate_words];
        for candidate in 0..count {
            let row = &mut reveal_bits[candidate * candidate_words..(candidate + 1) * candidate_words];
            for &other in &model.adjacent_candidates[candidate] {
                set_bit(row, other);
            }
            for &opening in &model.openings_bordered[candidate] {
                for &other in &model.opening_borders[opening] {
                    set_bit(row, other);
                }
            }
            row[candidate / 64] &= !(1u64 << (candidate % 64));
        }

        let (mine_starts, mine_items) = invert(&model.flag_needed_by, count);
        let (unit_starts, unit_items) = invert(&model.bbbv_solved_by, count);
        let mut mine_masks = vec![0u32; count];
        let mut unit_masks = vec![0u32; count];
        let mut members = vec![0u64; candidate_words];
        let mut near_entries = Vec::new();
        let mut near_starts = Vec::with_capacity(count + 1);
        near_starts.push(0);
        for candidate in 0..count {
            let mines = &mine_items[mine_starts[candidate]..mine_starts[candidate + 1]];
            let units = &unit_items[unit_starts[candidate]..unit_starts[candidate + 1]];
            // The strong swap packs a pair's mines and units into one u64 with these widths.
            assert!(mines.len() <= 8 && units.len() <= 16);
            let row = &reveal_bits[candidate * candidate_words..(candidate + 1) * candidate_words];
            members.copy_from_slice(row);
            for (bit, &mine) in mines.iter().enumerate() {
                for &other in &model.flag_needed_by[mine] {
                    mine_masks[other] |= 1 << bit;
                    set_bit(&mut members, other);
                }
            }
            for (bit, &unit) in units.iter().enumerate() {
                for &other in &model.bbbv_solved_by[unit] {
                    unit_masks[other] |= 1 << bit;
                    set_bit(&mut members, other);
                }
            }
            members[candidate / 64] &= !(1u64 << (candidate % 64));
            for (word_index, &word) in members.iter().enumerate() {
                let mut bits = word;
                while bits != 0 {
                    let other = word_index * 64 + bits.trailing_zeros() as usize;
                    bits &= bits - 1;
                    near_entries.push(Near {
                        other,
                        mines: mine_masks[other],
                        units: unit_masks[other],
                        reveals: test_bit(row, other),
                    });
                    mine_masks[other] = 0;
                    unit_masks[other] = 0;
                }
            }
            mine_masks[candidate] = 0;
            unit_masks[candidate] = 0;
            near_starts.push(near_entries.len());
        }

        let lengths = |starts: &[usize]| -> Vec<u32> { starts.windows(2).map(|pair| (pair[1] - pair[0]) as u32).collect() };
        CandidateSets {
            candidate_words,
            reveal_bits,
            mine_count: lengths(&mine_starts),
            unit_count: lengths(&unit_starts),
            near_entries,
            near_starts,
        }
    }

    fn near(&self, candidate: usize) -> &[Near] {
        &self.near_entries[self.near_starts[candidate]..self.near_starts[candidate + 1]]
    }

    /// Which of `of`'s mines `other` needs and which of its units `other` solves.
    fn near_masks(&self, of: usize, other: usize) -> (u32, u32) {
        let near = self.near(of);
        match near.binary_search_by_key(&other, |entry| entry.other) {
            Ok(index) => (near[index].mines, near[index].units),
            Err(_) => (0, 0),
        }
    }

    fn reveals_each_other(&self, a: usize, b: usize) -> bool {
        test_bit(&self.reveal_bits[a * self.candidate_words..(a + 1) * self.candidate_words], b)
    }

    fn all_mines(&self, candidate: usize) -> u32 {
        (1u32 << self.mine_count[candidate]) - 1
    }

    fn all_units(&self, candidate: usize) -> u32 {
        (1u32 << self.unit_count[candidate]) - 1
    }

    /// `N(c)` restricted to kept candidates, in candidate order.
    fn kept_neighbours(&self, candidate: usize, kept: &[bool], into: &mut Vec<Near>) {
        into.clear();
        into.extend(self.near(candidate).iter().filter(|entry| entry.reveals && kept[entry.other]));
    }
}

/// Neighbours of `c` with one kept from each group that solve the same units of `c` and reveal the
/// same neighbours, counting themselves. Those reveal each other, so at most one is ever in `I`, and
/// any of them can stand in for another. Mostly these are the borders of an opening far from `c`.
#[derive(Default)]
struct Twins {
    members: Vec<u64>,
    rows: Vec<u64>,
    distinct: Vec<Near>,
}

impl Twins {
    fn collapse(&mut self, sets: &CandidateSets, neighbours: &[Near]) {
        let words = sets.candidate_words;
        self.members.clear();
        self.members.resize(words, 0);
        for neighbour in neighbours {
            set_bit(&mut self.members, neighbour.other);
        }
        self.rows.clear();
        self.distinct.clear();
        for neighbour in neighbours {
            let start = self.rows.len();
            let reveals = &sets.reveal_bits[neighbour.other * words..(neighbour.other + 1) * words];
            self.rows.extend(reveals.iter().zip(&self.members).map(|(row, member)| row & member));
            set_bit(&mut self.rows[start..], neighbour.other);
            let row = &self.rows[start..];
            let has_twin = self.distinct.iter().enumerate().any(|(index, other)| {
                other.units == neighbour.units && self.rows[index * words..(index + 1) * words] == *row
            });
            if has_twin {
                self.rows.truncate(start);
            } else {
                self.distinct.push(*neighbour);
            }
        }
    }
}

/// Checks `|I| + (units none of I solve) <= budget` for every non-empty `I` of `neighbours` that
/// pairwise don't reveal each other. Each member of `I` may be left in its own piece of the chain.
fn independent_sets_within_budget(
    sets: &CandidateSets,
    neighbours: &[Near],
    uncovered: u32,
    chosen: &mut Vec<usize>,
    start: usize,
    budget: u32,
) -> bool {
    for index in start..neighbours.len() {
        let neighbour = neighbours[index].other;
        if chosen.iter().any(|&other| sets.reveals_each_other(other, neighbour)) {
            continue;
        }
        let still_uncovered = uncovered & !neighbours[index].units;
        if chosen.len() as u32 + 1 + still_uncovered.count_ones() > budget {
            return false;
        }
        chosen.push(neighbour);
        let within = independent_sets_within_budget(sets, neighbours, still_uncovered, chosen, index + 1, budget);
        chosen.pop();
        if !within {
            return false;
        }
    }
    true
}

/// Dropping `c` saves its chord, and its seed if it was alone. It can lose each unit of `B(c)`
/// no remaining chord solves, and adds a seed for each extra piece its chain splits into.
fn can_drop(sets: &CandidateSets, candidate: usize, neighbours: &[Near], budget: u32, twins: &mut Twins) -> bool {
    if sets.unit_count[candidate] > budget {
        return false;
    }
    twins.collapse(sets, neighbours);
    independent_sets_within_budget(sets, &twins.distinct, sets.all_units(candidate), &mut Vec::new(), 0, budget)
}

/// Mines of `candidate` that no other kept candidate needs flagged.
fn private_mines(sets: &CandidateSets, candidate: usize, kept: &[bool]) -> u32 {
    let needed = sets.near(candidate).iter().filter(|entry| kept[entry.other]).fold(0, |mask, entry| mask | entry.mines);
    (sets.all_mines(candidate) & !needed).count_ones()
}

/// Some kept `d` needs no extra flags, solves every unit and reveals every kept candidate `c` does.
/// `d` shares a mine with `c` (`M(d)` is never empty).
fn has_swap(sets: &CandidateSets, candidate: usize, neighbours: &[Near], kept: &[bool]) -> bool {
    let all_units = sets.all_units(candidate);
    sets.near(candidate).iter().any(|entry| {
        let other = entry.other;
        entry.mines != 0
            && kept[other]
            && entry.mines.count_ones() == sets.mine_count[other]
            && entry.units == all_units
            && neighbours.iter().all(|neighbour| neighbour.other == other || sets.reveals_each_other(other, neighbour.other))
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

/// Drops entries that another entry matches or beats (more mines, no more units).
fn remove_dominated(items: &mut Vec<(u64, u64)>) {
    items.sort_unstable();
    items.dedup();
    // Beating is transitive, so checking against the entries still left gives the same result.
    let mut index = 0;
    while index < items.len() {
        let (mines, units) = items[index];
        let dominated = items.iter().any(|&(other_mines, other_units)| {
            (other_mines, other_units) != (mines, units) && mines & !other_mines == 0 && other_units & !units == 0
        });
        if dominated {
            items.remove(index);
        } else {
            index += 1;
        }
    }
}

/// Whether some subset of `items[index..]`, added to `covered` mines and `units` solved, has
/// (mines covered - units solved) of at least `need`. Running out of nodes counts as reaching it.
fn costly_gain_reaches(
    nodes: &mut u32,
    limit: u32,
    items: &[(u64, u64)],
    index: usize,
    covered: u64,
    units: u64,
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
    neighbours: &'a [Near],
    witnesses: Vec<Witness>,
    all_mines: u32,
    all_units: u32,
    nodes: u32,
    costly: Vec<(u64, u64)>,
}

impl<'a> WitnessCheck<'a> {
    fn new(sets: &'a CandidateSets, candidate: usize, neighbours: &'a [Near], kept: &[bool]) -> Self {
        let witnesses = sets
            .near(candidate)
            .iter()
            .filter(|entry| entry.mines != 0 && kept[entry.other])
            .map(|entry| Witness {
                candidate: entry.other,
                mines: entry.mines,
                units: entry.units,
                is_neighbour: entry.reveals,
            })
            .collect();
        WitnessCheck {
            sets,
            neighbours,
            witnesses,
            all_mines: sets.all_mines(candidate),
            all_units: sets.all_units(candidate),
            nodes: 0,
            costly: Vec::new(),
        }
    }

    /// True when no `D` can make `|I| - 2 - saved + lost` positive for this `I` (indexes into `neighbours`).
    fn within_budget(&mut self, chosen: &[usize]) -> bool {
        self.nodes += 1;
        if self.nodes > WITNESS_NODE_LIMIT {
            return false;
        }
        let (mut units_done, mut mines_done) = (0u32, 0u32);
        for &index in chosen {
            units_done |= self.neighbours[index].units;
            mines_done |= self.neighbours[index].mines;
        }
        let units_left = self.all_units & !units_done;
        let mines_left = self.all_mines & !mines_done;

        // Witnesses solving none of the units still needed cost nothing, so the worst case uses them all.
        let mut free_mines = 0u32;
        let mut costly = std::mem::take(&mut self.costly);
        costly.clear();
        for witness in &self.witnesses {
            let mines = witness.mines & mines_left;
            if mines == 0
                || (witness.is_neighbour && chosen.is_empty())
                || chosen.iter().any(|&index| self.neighbours[index].other == witness.candidate)
            {
                continue;
            }
            let touching = chosen
                .iter()
                .filter(|&&index| self.sets.reveals_each_other(self.neighbours[index].other, witness.candidate))
                .count();
            if touching > 1 {
                continue;
            }
            let units = witness.units & units_left;
            if units == 0 {
                free_mines |= mines;
            } else {
                costly.push((mines as u64, units as u64));
            }
        }

        let base = chosen.len() as i32 + units_left.count_ones() as i32 - (mines_left & !free_mines).count_ones() as i32;
        let within = base <= 2 && {
            // A costly witness helps the worst case only if the mines it adds outnumber the units it solves.
            let need = 3 - base;
            for item in costly.iter_mut() {
                item.0 &= !(free_mines as u64);
            }
            costly.retain(|&(mines, _)| mines != 0);
            remove_dominated(&mut costly);
            !costly_gain_reaches(&mut self.nodes, WITNESS_NODE_LIMIT, &costly, 0, 0, 0, need)
        };
        self.costly = costly;
        within
    }

    /// Every independent set `I` of neighbours (pairwise not revealing each other) is within budget.
    fn all_within_budget(&mut self, chosen: &mut Vec<usize>, start: usize) -> bool {
        if !self.within_budget(chosen) {
            return false;
        }
        for index in start..self.neighbours.len() {
            let neighbour = self.neighbours[index].other;
            if chosen.iter().any(|&other| self.sets.reveals_each_other(self.neighbours[other].other, neighbour)) {
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

fn can_drop_with_witnesses(sets: &CandidateSets, candidate: usize, neighbours: &[Near], kept: &[bool]) -> bool {
    WitnessCheck::new(sets, candidate, neighbours, kept).all_within_budget(&mut Vec::new(), 0)
}

/// Search nodes allowed per candidate in the strong swap rule, over all its partners and both cases.
const SWAP_NODE_LIMIT: u32 = 20_000;

/// Nodes allowed in one witness-free pre-pass before it gives up and lets the exact check decide.
const SWAP_PREPASS_NODE_LIMIT: u32 = 2_000;

/// One candidate's `near` masks laid out by candidate index, so a third candidate's masks against
/// it are a direct lookup. Filled and cleared per use, so it stays all zeros between uses.
struct Spread {
    masks: Vec<(u32, u32)>,
    present: Vec<bool>,
}

impl Spread {
    fn new(count: usize) -> Self {
        Spread { masks: vec![(0, 0); count], present: vec![false; count] }
    }

    fn fill(&mut self, near: &[Near]) {
        for entry in near {
            self.masks[entry.other] = (entry.mines, entry.units);
            self.present[entry.other] = true;
        }
    }

    fn clear(&mut self, near: &[Near]) {
        for entry in near {
            self.masks[entry.other] = (0, 0);
            self.present[entry.other] = false;
        }
    }
}

struct Scratch {
    neighbours: Vec<Near>,
    twins: Twins,
    /// `c`'s kept `near` entries, and those sharing a mine with `c`.
    kept_near: Vec<Near>,
    sharers: Vec<Near>,
    /// Masks against the candidate being checked (`c`) and its current partner (`d`).
    c: Spread,
    d: Spread,
}

impl Scratch {
    fn new(count: usize) -> Self {
        Scratch {
            neighbours: Vec::new(),
            twins: Twins::default(),
            kept_near: Vec::new(),
            sharers: Vec::new(),
            c: Spread::new(count),
            d: Spread::new(count),
        }
    }
}

/// Items of a pair `(c, d)` as one bitmask: `c`'s mines and units, then `d`'s, each by position in
/// its own sorted list. An item both share has a bit on each side, but neither is ever good or bad.
const PAIR_C_UNITS: u32 = 8;
const PAIR_D_MINES: u32 = 24;
const PAIR_D_UNITS: u32 = 32;

fn pack_pair((c_mines, c_units): (u32, u32), (d_mines, d_units): (u32, u32)) -> u64 {
    c_mines as u64
        | (c_units as u64) << PAIR_C_UNITS
        | (d_mines as u64) << PAIR_D_MINES
        | (d_units as u64) << PAIR_D_UNITS
}

/// Which items of the pair `other` needs flagged or solves.
fn pair_cover(scratch: &Scratch, other: usize) -> u64 {
    pack_pair(scratch.c.masks[other], scratch.d.masks[other])
}

/// One case of the strong swap proof, as pair items (see `SwapCheck`).
#[derive(Clone, Copy)]
struct SwapCase {
    good: u64,
    bad: u64,
    budget: i32,
}

/// A kept candidate other than `c` and `d` that covers some good item of the case being checked.
struct SwapWitness {
    candidate: usize,
    good: u64,
    bad: u64,
    /// Whether it is revealed by `d`. Then it can't share a piece of the chain with a member of `I`.
    touches_partner: bool,
}

/// Exact check of one case of the strong swap proof, as a budget over two groups of pair items.
///
/// With `R` the other chords of a solution, `I` one chord from each piece that only `c` was joining
/// (pairwise not revealing each other, and none revealed by the partner `d`), the change in clicks
/// from swapping is at most `|I| + |bad not covered by R| - |good not covered by R|`.
/// `good` items are ones the swap would stop paying for (an adversary wants them covered by `R`),
/// `bad` items ones it would start paying for. The swap is safe in this case when that is
/// never above `budget`.
///
/// Uses the same witness search as `WitnessCheck`. Members of `I` are the kept neighbours of `c`
/// that `d` doesn't reveal; a witness can't touch two of them, and one that `d` reveals can't touch
/// any. Indirect joins are ignored, which only makes it stricter.
///
/// Without witnesses it is a cheaper necessary condition: witnesses only help the worst case, so
/// failing without them fails with them. Running out of nodes then proves nothing, so it passes.
struct SwapCheck<'a> {
    sets: &'a CandidateSets,
    neighbours: &'a [usize],
    neighbour_good: Vec<u64>,
    neighbour_bad: Vec<u64>,
    witnesses: Vec<SwapWitness>,
    good_all: u64,
    bad_all: u64,
    budget: i32,
    nodes: &'a mut u32,
    limit: u32,
    /// What running out of nodes counts as: true for the pre-pass, false for the exact check.
    on_limit: bool,
    costly: Vec<(u64, u64)>,
}

impl<'a> SwapCheck<'a> {
    fn new(
        sets: &'a CandidateSets,
        scratch: &Scratch,
        kept_near: &[Near],
        candidate: usize,
        partner: usize,
        case: SwapCase,
        neighbours: &'a [usize],
        kept: &[bool],
        with_witnesses: bool,
        nodes: &'a mut u32,
    ) -> Self {
        let SwapCase { good, bad, budget } = case;
        let mut witnesses = Vec::new();
        if with_witnesses {
            let mut add = |other: usize| {
                if other == candidate || other == partner || !kept[other] {
                    return;
                }
                let cover = pair_cover(scratch, other);
                if cover & good != 0 {
                    witnesses.push(SwapWitness {
                        candidate: other,
                        good: cover & good,
                        bad: cover & bad,
                        touches_partner: sets.reveals_each_other(partner, other),
                    });
                }
            };
            for entry in kept_near {
                add(entry.other);
            }
            // Good units of `d` can also be covered by candidates that only `d` is near.
            if good >> PAIR_D_MINES != 0 {
                for entry in sets.near(partner).iter().filter(|entry| !scratch.c.present[entry.other]) {
                    add(entry.other);
                }
            }
        }
        SwapCheck {
            sets,
            neighbours,
            neighbour_good: neighbours.iter().map(|&n| pair_cover(scratch, n) & good).collect(),
            neighbour_bad: neighbours.iter().map(|&n| pair_cover(scratch, n) & bad).collect(),
            witnesses,
            good_all: good,
            bad_all: bad,
            budget,
            nodes,
            limit: if with_witnesses { SWAP_NODE_LIMIT } else { SWAP_PREPASS_NODE_LIMIT },
            on_limit: !with_witnesses,
            costly: Vec::new(),
        }
    }

    /// True when no witness set can push the change in clicks above the budget for this `I`.
    fn within_budget(&mut self, chosen: &[usize]) -> bool {
        *self.nodes += 1;
        if *self.nodes > self.limit {
            return self.on_limit;
        }
        let (mut good_done, mut bad_done) = (0u64, 0u64);
        for &index in chosen {
            good_done |= self.neighbour_good[index];
            bad_done |= self.neighbour_bad[index];
        }
        let good_left = self.good_all & !good_done;
        let bad_left = self.bad_all & !bad_done;

        // Witnesses covering none of the bad items still left cost nothing, so the worst case uses them all.
        let mut free_good = 0u64;
        let mut costly = std::mem::take(&mut self.costly);
        costly.clear();
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
        let within = base <= self.budget && {
            // A costly witness helps the worst case only if the good items it adds outnumber the bad ones it covers.
            let need = self.budget + 1 - base;
            for item in costly.iter_mut() {
                item.0 &= !free_good;
            }
            costly.retain(|&(good, _)| good != 0);
            remove_dominated(&mut costly);
            !costly_gain_reaches(self.nodes, self.limit, &costly, 0, 0, 0, need)
        };
        self.costly = costly;
        within
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
/// When that exceeds the budget the full check fails at its first set, so the pair can be dropped.
///
/// Only a candidate sharing a mine with `c` (in `sharers`) can cover a good mine of `c`, and only
/// one sharing a unit with `d` can cover a good unit of `d`, so no others are looked at.
fn free_witnesses_break_case(
    sets: &CandidateSets,
    scratch: &Scratch,
    sharers: &[Near],
    candidate: usize,
    partner: usize,
    kept: &[bool],
    case: SwapCase,
) -> bool {
    let base = case.bad.count_ones() as i32 - case.good.count_ones() as i32;
    let need = case.budget - base + 1;
    if need <= 0 {
        return true;
    }
    let good_c_mines = case.good as u32 & ((1 << PAIR_C_UNITS) - 1);
    let good_d_units = (case.good >> PAIR_D_UNITS) as u32;
    let has_partner_items = (case.good | case.bad) >> PAIR_D_MINES != 0;
    let mut covered = 0u64;
    for sharer in sharers {
        if sharer.other == partner || sharer.mines & good_c_mines == 0 {
            continue;
        }
        let d_masks = if has_partner_items { sets.near_masks(partner, sharer.other) } else { (0, 0) };
        let cover = pack_pair((sharer.mines, sharer.units), d_masks);
        if cover & case.bad == 0 {
            covered |= cover & case.good;
        }
    }
    if good_d_units != 0 {
        for entry in sets.near(partner) {
            if entry.units & good_d_units == 0 || entry.other == candidate || !kept[entry.other] {
                continue;
            }
            let cover = pack_pair(scratch.c.masks[entry.other], (entry.mines, entry.units));
            if cover & case.bad == 0 {
                covered |= cover & case.good;
            }
        }
    }
    covered.count_ones() as i32 >= need
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
fn find_swap_partner(sets: &CandidateSets, candidate: usize, kept: &[bool], scratch: &mut Scratch) -> Option<usize> {
    let mut kept_near = std::mem::take(&mut scratch.kept_near);
    let mut sharers = std::mem::take(&mut scratch.sharers);
    kept_near.clear();
    kept_near.extend(sets.near(candidate).iter().filter(|entry| kept[entry.other]));
    sharers.clear();
    sharers.extend(kept_near.iter().filter(|entry| entry.mines != 0));
    let (all_mines, all_units) = (sets.all_mines(candidate), sets.all_units(candidate));
    let (mine_count, unit_count) = (all_mines.count_ones() as i32, all_units.count_ones() as i32);
    scratch.c.fill(&kept_near);
    let mut nodes = 0u32;
    let mut found = None;
    for entry in &kept_near {
        let partner = entry.other;
        if nodes > SWAP_NODE_LIMIT {
            break;
        }
        let (shared_mines, shared_units) = (entry.mines.count_ones() as i32, entry.units.count_ones() as i32);
        let units_only_c = unit_count - shared_units;
        let mines_only_c = mine_count - shared_mines;
        // Each case fails when its counts alone fail (empty `I`, no witnesses), so no search is needed.
        if units_only_c > 1 + mines_only_c {
            continue;
        }
        let units_only_d = sets.unit_count[partner] as i32 - shared_units;
        let mines_only_d = sets.mine_count[partner] as i32 - shared_mines;
        if mines_only_d + units_only_c > mines_only_c + units_only_d {
            continue;
        }
        let already_chorded = SwapCase {
            good: (all_mines & !entry.mines) as u64,
            bad: ((all_units & !entry.units) as u64) << PAIR_C_UNITS,
            budget: 1,
        };
        if free_witnesses_break_case(sets, scratch, &sharers, candidate, partner, kept, already_chorded) {
            continue;
        }
        let (c_mines_of_d, c_units_of_d) = sets.near_masks(partner, candidate);
        let swapped_in = SwapCase {
            good: already_chorded.good | ((sets.all_units(partner) & !c_units_of_d) as u64) << PAIR_D_UNITS,
            bad: already_chorded.bad | ((sets.all_mines(partner) & !c_mines_of_d) as u64) << PAIR_D_MINES,
            budget: 0,
        };
        if free_witnesses_break_case(sets, scratch, &sharers, candidate, partner, kept, swapped_in) {
            continue;
        }
        scratch.d.fill(sets.near(partner));
        let unrevealed: Vec<usize> = kept_near
            .iter()
            .filter(|n| n.reveals && n.other != partner && !sets.reveals_each_other(partner, n.other))
            .map(|n| n.other)
            .collect();
        let within = |case: SwapCase, with_witnesses: bool, nodes: &mut u32| -> bool {
            SwapCheck::new(sets, scratch, &kept_near, candidate, partner, case, &unrevealed, kept, with_witnesses, nodes)
                .all_within_budget(&mut Vec::new(), 0)
        };
        // Pre-pass without witnesses first: it rejects most pairs before any witness list is built.
        let mut prepass_nodes = 0u32;
        let accepted = within(already_chorded, false, &mut prepass_nodes)
            && within(swapped_in, false, &mut prepass_nodes)
            && within(already_chorded, true, &mut nodes)
            && within(swapped_in, true, &mut nodes);
        scratch.d.clear(sets.near(partner));
        if accepted {
            found = Some(partner);
            break;
        }
    }
    scratch.c.clear(&kept_near);
    scratch.kept_near = kept_near;
    scratch.sharers = sharers;
    found
}

/// The kept `d` the strong swap rule would replace `candidate` with, given which candidates are
/// `kept`. Exposed so tests can check the swap claim directly against every chord set.
pub fn strong_swap_partner(model: &ChordModel, kept: &[bool], candidate: usize) -> Option<usize> {
    let sets = CandidateSets::new(model);
    find_swap_partner(&sets, candidate, kept, &mut Scratch::new(kept.len()))
}

const CHECK_CHEAP: u8 = 1;
const CHECK_WITNESS: u8 = 2;
const CHECK_STRONG: u8 = 4;

/// Whether one of the rules in `checks` removes `candidate`.
fn is_removable(sets: &CandidateSets, candidate: usize, kept: &[bool], checks: u8, scratch: &mut Scratch) -> bool {
    if checks & (CHECK_CHEAP | CHECK_WITNESS) != 0 {
        let mut neighbours = std::mem::take(&mut scratch.neighbours);
        sets.kept_neighbours(candidate, kept, &mut neighbours);
        let removable = (checks & CHECK_CHEAP != 0
            && (can_drop(sets, candidate, &neighbours, 2 + private_mines(sets, candidate, kept), &mut scratch.twins)
                || has_swap(sets, candidate, &neighbours, kept)))
            || (checks & CHECK_WITNESS != 0 && can_drop_with_witnesses(sets, candidate, &neighbours, kept));
        scratch.neighbours = neighbours;
        if removable {
            return true;
        }
    }
    checks & CHECK_STRONG != 0 && find_swap_partner(sets, candidate, kept, scratch).is_some()
}

/// Tries the rules in `pending` on each candidate, in index order, until nothing is pending, which
/// gives the same result as sweeping every candidate until nothing changes. After a removal the
/// `enabled` rules are queued only where its verdict can change. The cheap and witness rules on
/// `c` only read which of `c`'s neighbours and mine sharers are kept. The strong swap reads all of
/// `c`'s `near`, and for each partner `d` which of `d`'s unit sharers are kept.
fn reduce_with_work_list(sets: &CandidateSets, kept: &mut [bool], pending: &mut [u8], enabled: u8, scratch: &mut Scratch) {
    loop {
        let mut more = false;
        for candidate in 0..kept.len() {
            let checks = pending[candidate];
            if checks == 0 {
                continue;
            }
            pending[candidate] = 0;
            if !kept[candidate] || !is_removable(sets, candidate, kept, checks, scratch) {
                continue;
            }
            kept[candidate] = false;
            for close in sets.near(candidate) {
                if kept[close.other] {
                    let mut queued = enabled & CHECK_STRONG;
                    if close.reveals || close.mines != 0 {
                        queued |= enabled & (CHECK_CHEAP | CHECK_WITNESS);
                    }
                    if queued != 0 {
                        pending[close.other] |= queued;
                        more = true;
                    }
                }
                if enabled & CHECK_STRONG != 0 && close.units != 0 && kept[close.other] {
                    for far in sets.near(close.other) {
                        if kept[far.other] {
                            pending[far.other] |= CHECK_STRONG;
                            more = true;
                        }
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
    let mut scratch = Scratch::new(count);
    // The cheap rules go first so the witness search sees fewer candidates. Each later phase starts
    // with only its new rule pending, since the earlier ones already fail for every kept candidate.
    let mut pending = vec![CHECK_CHEAP; count];
    reduce_with_work_list(&sets, &mut kept, &mut pending, CHECK_CHEAP, &mut scratch);
    if rule != StaticRule::Legacy {
        pending.fill(CHECK_WITNESS);
        reduce_with_work_list(&sets, &mut kept, &mut pending, CHECK_CHEAP | CHECK_WITNESS, &mut scratch);
    }
    if rule == StaticRule::StrongSwap {
        pending.fill(CHECK_STRONG);
        reduce_with_work_list(&sets, &mut kept, &mut pending, CHECK_CHEAP | CHECK_WITNESS | CHECK_STRONG, &mut scratch);
    }
    (0..count).filter(|&candidate| kept[candidate]).collect()
}
