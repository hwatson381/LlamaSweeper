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

// Sibling rules: each proves one child of a parent state is never better than the other, so it is not built.
const FORCED_SKIP_RULE: bool = true;
const EXCHANGE_RULE: bool = true;
// Factor cancellation inside the forced skip bound.
const SIBLING_CANCELLATION: bool = true;
// Forced skip bounds merges by what each state's chains don't already reach, not just by the candidate.
const SIGNATURE_ALPHA: bool = true;
const MAX_PARTNERS: usize = 64;
const MAX_EXACT_REVEALS: usize = 24;
const MAX_CANCEL_FACTORS: usize = 32;

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
    /// Children not built, credited to the first of these rules that proved it.
    pub skipped_by_forced_skip: usize,
    pub skipped_by_exchange: usize,
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
    /// Sorted candidates that hit each factor.
    solvers: Vec<Vec<usize>>,
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
            solvers: factors.iter().map(|&(candidates, _)| candidates.clone()).collect(),
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

    /// Solvers of `factor` that are still undecided after `candidate`.
    fn remaining(&self, factor: usize, candidate: usize) -> &[usize] {
        let solvers = &self.solvers[factor];
        &solvers[solvers.partition_point(|&solver| solver <= candidate)..]
    }

    /// Every undecided candidate that hits `factor` also hits `other`, so a future that gains
    /// `factor` always gains `other` too.
    fn is_covered_by(&self, factor: usize, other: usize, candidate: usize) -> bool {
        let other_remaining = self.remaining(other, candidate);
        self.remaining(factor, candidate).iter().all(|solver| other_remaining.binary_search(solver).is_ok())
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

fn bit_row(bits: &[u64], index: usize, words: usize) -> &[u64] {
    &bits[index * words..(index + 1) * words]
}

/// `later_reveals` plus its transpose: whether either of two candidates' chords reveals the other.
fn symmetric_reveals(later: &[u64], count: usize, candidate_words: usize) -> Vec<u64> {
    let mut full = later.to_vec();
    for candidate in 0..count {
        for other in bits_of(bit_row(later, candidate, candidate_words)) {
            set_bit(&mut full[other * candidate_words..(other + 1) * candidate_words], candidate);
        }
    }
    full
}

fn bits_of(row: &[u64]) -> Vec<usize> {
    (0..row.len() * 64).filter(|&index| test_bit(row, index)).collect()
}

/// Size of the largest subset of `nodes` (bitmask over positions) with no two adjacent.
fn max_independent(nodes: u32, adjacent: &[u32]) -> u32 {
    if nodes == 0 {
        return 0;
    }
    let first = nodes.trailing_zeros() as usize;
    let rest = nodes & (nodes - 1);
    let neighbours = adjacent[first] & rest;
    if neighbours == 0 {
        return 1 + max_independent(rest, adjacent);
    }
    (1 + max_independent(rest & !neighbours, adjacent)).max(max_independent(rest, adjacent))
}

/// A later candidate `d` that might make chording `c` pointless.
struct Partner {
    candidate: usize,
    /// Factors `d` needs `c`'s state to have hit already: mines of `d` not of `c`, units of `c` not of `d`.
    need_hits: Vec<u64>,
}

#[derive(Clone, Copy, PartialEq)]
enum Verdict {
    Both,
    /// Not chording is never worse, so the chorded child is skipped.
    ForcedSkip,
    Exchange,
}

/// What the sibling rules need to know about one old connectivity signature, cached per layer.
#[derive(Clone, Copy)]
struct SignatureFacts {
    transitions: [Transition; 2],
    /// Chains that can still reach the candidate being decided.
    chains_reaching: u32,
    /// Bit `i` is set when every chain reaching the candidate also reaches partner `i`.
    partner_ok: u64,
    /// Bound on separate components of later chords the candidate can touch beyond the chains reaching it.
    alpha: u32,
}

/// Per-candidate data for the sibling rules. The value of a completion `F` (a set of later chords)
/// from a state is `cost + |F| + unhit mines of F - unhit units of F + components`, where components
/// join the state's chains and the chords of `F` by the reveal relation. Each rule bounds the
/// difference between chording `c` and not, over every `F`.
struct SiblingRules {
    /// Mines `c` needs flagged that no later candidate needs.
    last_mines: Vec<u64>,
    /// Upper bound on how many separate components of later chords `c` can touch.
    independent_reveals: Vec<u32>,
    /// Later candidates `c` reveals, and which of them reveal each other (bit per position; empty if
    /// there are more than `MAX_EXACT_REVEALS`).
    later_nodes: Vec<Vec<usize>>,
    node_adjacent: Vec<Vec<u32>>,
    /// Factors `c` hits that stay active after it. A mine and a unit cancel when every later candidate
    /// hitting the mine also hits the unit.
    cancel_mines: Vec<Vec<usize>>,
    cancel_units: Vec<Vec<usize>>,
    /// Per mine: positions in `cancel_units` it can cancel.
    skip_pair_masks: Vec<Vec<u32>>,
    partners: Vec<Vec<Partner>>,
}

/// Greedy matching of `first` factors to distinct `second` factors they can cancel, among those unhit in `old_hits`.
fn count_cancellations(first: &[usize], masks: &[u32], second: &[usize], old_hits: &[u64]) -> i32 {
    let mut available = 0u32;
    for (position, &factor) in second.iter().enumerate() {
        if !test_bit(old_hits, factor) {
            available |= 1 << position;
        }
    }
    let mut matched = 0;
    for (position, &factor) in first.iter().enumerate() {
        if test_bit(old_hits, factor) {
            continue;
        }
        let usable = masks[position] & available;
        if usable != 0 {
            available &= !(usable & usable.wrapping_neg());
            matched += 1;
        }
    }
    matched
}

impl SiblingRules {
    /// Everything is built from the reduced and reordered `model`, so rules never rely on a removed candidate.
    fn new(
        model: &ChordModel,
        factors: &FactorLayout,
        later: &[u64],
        full: &[u64],
        candidate_words: usize,
    ) -> Self {
        let count = model.candidate_cells.len();
        let words = factors.factor_words;

        let mut last_mines = vec![0u64; count * words];
        let mut independent_reveals = Vec::with_capacity(count);
        let mut all_later_nodes = Vec::with_capacity(count);
        let mut node_adjacent = Vec::with_capacity(count);
        let mut cancel_mines = Vec::with_capacity(count);
        let mut cancel_units = Vec::with_capacity(count);
        let mut skip_pair_masks = Vec::with_capacity(count);
        let mut partners = Vec::with_capacity(count);
        for candidate in 0..count {
            let (hit_by, active) = (factors.hit_by(candidate), factors.active_after(candidate));
            for word in 0..words {
                let last = hit_by[word] & !active[word];
                last_mines[candidate * words + word] = last & factors.mine_factor_mask[word];
            }

            let (mut mines, mut units) = (Vec::new(), Vec::new());
            for factor in bits_of(hit_by).into_iter().filter(|&factor| test_bit(active, factor)) {
                if test_bit(&factors.mine_factor_mask, factor) {
                    mines.push(factor);
                } else {
                    units.push(factor);
                }
            }
            mines.truncate(MAX_CANCEL_FACTORS);
            units.truncate(MAX_CANCEL_FACTORS);
            skip_pair_masks.push(
                mines
                    .iter()
                    .map(|&mine| {
                        units
                            .iter()
                            .enumerate()
                            .filter(|&(_, &unit)| factors.is_covered_by(mine, unit, candidate))
                            .fold(0u32, |mask, (position, _)| mask | (1 << position))
                    })
                    .collect(),
            );
            cancel_mines.push(mines);
            cancel_units.push(units);

            let later_nodes = bits_of(bit_row(later, candidate, candidate_words));
            if later_nodes.len() > MAX_EXACT_REVEALS {
                independent_reveals.push(later_nodes.len() as u32);
                node_adjacent.push(Vec::new());
            } else {
                let adjacent: Vec<u32> = later_nodes
                    .iter()
                    .map(|&node| {
                        let row = bit_row(full, node, candidate_words);
                        later_nodes
                            .iter()
                            .enumerate()
                            .filter(|&(_, &other)| other != node && test_bit(row, other))
                            .fold(0u32, |mask, (position, _)| mask | (1 << position))
                    })
                    .collect();
                let all = if later_nodes.is_empty() { 0 } else { u32::MAX >> (32 - later_nodes.len()) };
                independent_reveals.push(max_independent(all, &adjacent));
                node_adjacent.push(adjacent);
            }

            // Partners within reveal distance 2 that cover everything `c` reveals later.
            let direct = bit_row(&full, candidate, candidate_words);
            let mut near = direct.to_vec();
            for neighbour in bits_of(direct) {
                for (word, &value) in near.iter_mut().zip(bit_row(&full, neighbour, candidate_words)) {
                    *word |= value;
                }
            }
            let mut found: Vec<Partner> = Vec::new();
            for other in candidate + 1..count {
                if found.len() == MAX_PARTNERS {
                    break;
                }
                if !test_bit(&near, other) {
                    continue;
                }
                let other_row = bit_row(&full, other, candidate_words);
                if later_nodes.iter().any(|&node| node != other && !test_bit(other_row, node)) {
                    continue;
                }
                let other_hit_by = factors.hit_by(other);
                let need_hits: Vec<u64> = (0..words)
                    .map(|word| {
                        (other_hit_by[word] & !hit_by[word] & factors.mine_factor_mask[word])
                            | (hit_by[word] & !other_hit_by[word] & factors.bbbv_factor_mask[word])
                    })
                    .collect();
                // A state can only have hit factors that were already active before `c`.
                let reachable = (0..words).all(|word| {
                    let tracked = if candidate == 0 { 0 } else { factors.active_after(candidate - 1)[word] };
                    need_hits[word] & !tracked == 0
                });
                if reachable {
                    found.push(Partner { candidate: other, need_hits });
                }
            }
            partners.push(found);
            all_later_nodes.push(later_nodes);
        }
        SiblingRules {
            last_mines,
            independent_reveals,
            later_nodes: all_later_nodes,
            node_adjacent,
            cancel_mines,
            cancel_units,
            skip_pair_masks,
            partners,
        }
    }

    fn signature_facts(
        &self,
        signature: &[u64],
        candidate: usize,
        candidate_words: usize,
        transitions: [Transition; 2],
    ) -> SignatureFacts {
        let partners = &self.partners[candidate];
        let nodes = &self.later_nodes[candidate];
        let mut partner_ok = if partners.is_empty() { 0 } else { u64::MAX >> (64 - partners.len()) };
        let mut chains_reaching = 0;
        let mut covered = 0u32;
        for chain in signature.chunks(candidate_words) {
            if !test_bit(chain, candidate) {
                continue;
            }
            chains_reaching += 1;
            for (index, partner) in partners.iter().enumerate() {
                if !test_bit(chain, partner.candidate) {
                    partner_ok &= !(1u64 << index);
                }
            }
            if SIGNATURE_ALPHA && !self.node_adjacent[candidate].is_empty() {
                for (position, &node) in nodes.iter().enumerate() {
                    if test_bit(chain, node) {
                        covered |= 1 << position;
                    }
                }
            }
        }
        // A later chord in a reaching chain's reach joins that chain, which is already counted.
        let mut alpha = self.independent_reveals[candidate];
        if SIGNATURE_ALPHA && chains_reaching > 0 && !self.node_adjacent[candidate].is_empty() {
            let all = u32::MAX >> (32 - nodes.len());
            alpha = max_independent(all & !covered, &self.node_adjacent[candidate]);
        }
        SignatureFacts { transitions, chains_reaching, partner_ok, alpha }
    }

    /// Which children of a state (with hits `old_hits`) need building. Rules are tried in order and
    /// at most one child is ever skipped, so the sibling that proves the bound always survives.
    fn verdict(
        &self,
        factors: &FactorLayout,
        candidate: usize,
        old_hits: &[u64],
        facts: &SignatureFacts,
    ) -> Verdict {
        let words = factors.factor_words;
        let hit_by = factors.hit_by(candidate);
        let (mut unhit_units, mut private_mines) = (0i32, 0i32);
        for word in 0..words {
            let unhit = hit_by[word] & !old_hits[word];
            unhit_units += (unhit & factors.bbbv_factor_mask[word]).count_ones() as i32;
            private_mines += (self.last_mines[candidate * words + word] & !old_hits[word]).count_ones() as i32;
        }
        let chains = facts.chains_reaching as i32;

        // Chording adds at least 1 + the mines nobody later can flag, and gains at most every unhit
        // unit, and merges at most `chains + alpha` components. A mine and a unit that cancel count once.
        if FORCED_SKIP_RULE {
            let slack = 2 + private_mines - unhit_units - chains - facts.alpha as i32;
            if slack >= 0 {
                return Verdict::ForcedSkip;
            }
            if SIBLING_CANCELLATION
                && -slack <= self.cancel_units[candidate].len().min(self.cancel_mines[candidate].len()) as i32
                && count_cancellations(
                    &self.cancel_mines[candidate],
                    &self.skip_pair_masks[candidate],
                    &self.cancel_units[candidate],
                    old_hits,
                ) >= -slack
            {
                return Verdict::ForcedSkip;
            }
        }
        if EXCHANGE_RULE {
            for (index, partner) in self.partners[candidate].iter().enumerate() {
                if facts.partner_ok >> index & 1 == 1
                    && partner.need_hits.iter().zip(old_hits).all(|(&need, &hit)| need & !hit == 0)
                {
                    return Verdict::Exchange;
                }
            }
        }
        Verdict::Both
    }
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
    let full_reveals = symmetric_reveals(&reveals, candidate_count, candidate_words);
    let siblings = SiblingRules::new(&model, &factors, &reveals, &full_reveals, candidate_words);
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
    let (mut skipped_by_forced_skip, mut skipped_by_exchange) = (0usize, 0usize);

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
        // Indexed by old connectivity id.
        let mut transitions: Vec<Option<SignatureFacts>> = vec![None; pool.len()];
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
            let facts = match transitions[connectivity_id] {
                Some(facts) => facts,
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
                    let facts = siblings.signature_facts(signature, candidate, candidate_words, computed);
                    transitions[connectivity_id] = Some(facts);
                    facts
                }
            };
            let transition = facts.transitions;

            let old_hits = table.factor_hits(entry);
            let old_cost = table.cost(entry);
            let verdict = siblings.verdict(&factors, candidate, old_hits, &facts);
            match verdict {
                Verdict::Both => {}
                Verdict::ForcedSkip => skipped_by_forced_skip += 1,
                Verdict::Exchange => skipped_by_exchange += 1,
            }
            for chorded in 0..2 {
                if matches!(verdict, Verdict::ForcedSkip | Verdict::Exchange) && chorded == 1 {
                    continue;
                }
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
        skipped_by_forced_skip,
        skipped_by_exchange,
    })
}
