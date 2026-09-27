//! Turning a chosen chord set into an ordered, validated click sequence.
//!
//! Click order: every flag first, then each chain (seed left click followed by its chords in BFS
//! order), then a left click for each 3BV unit no chain solved.

use super::model::ChordModel;
use super::DomsError;
use crate::board_gen_8way::ClickType;
use std::collections::VecDeque;

pub struct Evaluation {
    pub total_clicks: usize,
    /// Mine cells that need flagging.
    pub flags: Vec<usize>,
    /// Chorded candidates grouped into chains, each needing one seed left click.
    pub chains: Vec<Vec<usize>>,
    /// 3BV units that still need their own left click.
    pub unsolved_bbbv: Vec<usize>,
}

pub struct Solution {
    pub total_clicks: usize,
    pub chords: Vec<usize>,
    pub flags: Vec<usize>,
    pub chains: Vec<Vec<usize>>,
    pub unsolved_bbbv: Vec<usize>,
    /// `(click type, cell)` in play order. `ClickType::NF` is a left click.
    pub clicks: Vec<(ClickType, usize)>,
}

fn openings_bordered(model: &ChordModel) -> Vec<Vec<usize>> {
    let mut openings = vec![Vec::new(); model.candidate_cells.len()];
    for (opening, border) in model.opening_borders.iter().enumerate() {
        for &candidate in border {
            openings[candidate].push(opening);
        }
    }
    openings
}

/// Click cost of chording exactly `chords` (candidate indexes).
pub fn evaluate_chords(model: &ChordModel, chords: &[usize]) -> Evaluation {
    let candidate_count = model.candidate_cells.len();
    let mut chorded = vec![false; candidate_count];
    for &candidate in chords {
        chorded[candidate] = true;
    }
    let any_chorded = |candidates: &Vec<usize>| candidates.iter().any(|&candidate| chorded[candidate]);

    let flags: Vec<usize> = model
        .flag_needed_by
        .iter()
        .zip(&model.mine_cells)
        .filter(|(candidates, _)| any_chorded(candidates))
        .map(|(_, &mine)| mine)
        .collect();

    // Chords are in the same chain when one reveals the other, directly or via a shared opening.
    let bordered = openings_bordered(model);
    let mut unvisited = chorded.clone();
    let mut opening_unvisited = vec![true; model.opening_borders.len()];
    let mut chains = Vec::new();
    for start in 0..candidate_count {
        if !unvisited[start] {
            continue;
        }
        unvisited[start] = false;
        let mut chain = Vec::new();
        let mut stack = vec![start];
        while let Some(candidate) = stack.pop() {
            chain.push(candidate);
            for &other in &model.adjacent_candidates[candidate] {
                if unvisited[other] {
                    unvisited[other] = false;
                    stack.push(other);
                }
            }
            for &opening in &bordered[candidate] {
                if !opening_unvisited[opening] {
                    continue;
                }
                opening_unvisited[opening] = false;
                for &other in &model.opening_borders[opening] {
                    if unvisited[other] {
                        unvisited[other] = false;
                        stack.push(other);
                    }
                }
            }
        }
        chain.sort_unstable();
        chains.push(chain);
    }
    chains.sort_by_key(|chain: &Vec<usize>| model.candidate_cells[chain[0]]);

    let unsolved_bbbv: Vec<usize> = (0..model.bbbv_solved_by.len())
        .filter(|&unit| !any_chorded(&model.bbbv_solved_by[unit]))
        .collect();

    Evaluation {
        total_clicks: chords.len() + flags.len() + chains.len() + unsolved_bbbv.len(),
        flags,
        chains,
        unsolved_bbbv,
    }
}

/// BFS chord order for a chain, seeded from its top-left candidate. Every chord after the seed
/// is revealed by an earlier chord in the order, so it is open by the time it is played.
fn chain_chord_order(model: &ChordModel, chain: &[usize]) -> Result<Vec<usize>, DomsError> {
    let candidate_count = model.candidate_cells.len();
    let mut in_chain = vec![false; candidate_count];
    for &candidate in chain {
        in_chain[candidate] = true;
    }
    let seed = *chain
        .iter()
        .min_by_key(|&&candidate| model.candidate_cells[candidate])
        .ok_or_else(|| DomsError::Internal("empty chord chain".into()))?;
    let bordered = openings_bordered(model);
    let mut opening_unvisited = vec![true; model.opening_borders.len()];
    let mut queued = vec![false; candidate_count];
    let mut queue = VecDeque::new();
    queue.push_back(seed);
    queued[seed] = true;
    let mut order = Vec::with_capacity(chain.len());
    while let Some(candidate) = queue.pop_front() {
        order.push(candidate);
        let mut adjacent = model.adjacent_candidates[candidate].clone();
        adjacent.sort_by_key(|&other| model.candidate_cells[other]);
        for other in adjacent {
            if in_chain[other] && !queued[other] {
                queued[other] = true;
                queue.push_back(other);
            }
        }
        for &opening in &bordered[candidate] {
            if !opening_unvisited[opening] {
                continue;
            }
            opening_unvisited[opening] = false;
            let mut border = model.opening_borders[opening].clone();
            border.sort_by_key(|&other| model.candidate_cells[other]);
            for other in border {
                if in_chain[other] && !queued[other] {
                    queued[other] = true;
                    queue.push_back(other);
                }
            }
        }
    }
    if order.len() != chain.len() {
        return Err(DomsError::Internal("reported chord chain is disconnected".into()));
    }
    Ok(order)
}

/// Replay the clicks on a plain board to prove they win it.
fn validate_clicks(model: &ChordModel, clicks: &[(ClickType, usize)]) -> Result<(), DomsError> {
    let cells = model.height * model.width;
    let mut revealed = vec![false; cells];
    let mut flagged = vec![false; cells];
    let mut opening_of_cell = vec![usize::MAX; cells];
    for (opening, inner) in model.opening_inner_cells.iter().enumerate() {
        for &cell in inner {
            opening_of_cell[cell] = opening;
        }
    }
    let invalid = |message: &str| -> Result<(), DomsError> {
        Err(DomsError::Internal(format!("invalid click sequence: {}", message)))
    };

    let reveal = |start: usize, revealed: &mut Vec<bool>, flagged: &Vec<bool>| -> Result<(), DomsError> {
        if model.mines[start] || flagged[start] {
            return invalid("attempted to reveal a mine or flag");
        }
        if revealed[start] {
            return Ok(());
        }
        revealed[start] = true;
        if model.adjacent_mines[start] == 0 {
            for &inner in &model.opening_inner_cells[opening_of_cell[start]] {
                revealed[inner] = true;
                for &other in &model.adjacent_cells[inner] {
                    if !model.mines[other] {
                        revealed[other] = true;
                    }
                }
            }
        }
        Ok(())
    };

    for &(click_type, cell) in clicks {
        match click_type {
            ClickType::Flag => {
                if !model.mines[cell] || revealed[cell] {
                    return invalid("illegal flag");
                }
                flagged[cell] = true;
            }
            ClickType::NF => reveal(cell, &mut revealed, &flagged)?,
            ClickType::Chord => {
                if !revealed[cell] || model.mines[cell] || model.adjacent_mines[cell] == 0 {
                    return invalid("illegal chord centre");
                }
                let flag_count = model.adjacent_cells[cell].iter().filter(|&&other| flagged[other]).count();
                if flag_count != model.adjacent_mines[cell] as usize {
                    return invalid("wrong adjacent flag count for chord");
                }
                for &other in &model.adjacent_cells[cell] {
                    if !flagged[other] && !model.mines[other] {
                        reveal(other, &mut revealed, &flagged)?;
                    }
                }
            }
        }
    }
    let unrevealed = (0..cells).filter(|&cell| !model.mines[cell] && !revealed[cell]).count();
    if unrevealed != 0 {
        return invalid(&format!("{} safe cells left unrevealed", unrevealed));
    }
    Ok(())
}

pub fn construct_solution(
    model: &ChordModel,
    chords: &[usize],
    expected_clicks: Option<i32>,
) -> Result<Solution, DomsError> {
    let evaluation = evaluate_chords(model, chords);
    if let Some(expected) = expected_clicks {
        if evaluation.total_clicks as i32 != expected {
            return Err(DomsError::Internal(format!(
                "DP cost {} disagrees with evaluated cost {}",
                expected, evaluation.total_clicks
            )));
        }
    }

    let mut clicks: Vec<(ClickType, usize)> = evaluation.flags.iter().map(|&mine| (ClickType::Flag, mine)).collect();
    for chain in &evaluation.chains {
        let order = chain_chord_order(model, chain)?;
        clicks.push((ClickType::NF, model.candidate_cells[order[0]]));
        clicks.extend(order.iter().map(|&candidate| (ClickType::Chord, model.candidate_cells[candidate])));
    }
    clicks.extend(
        evaluation
            .unsolved_bbbv
            .iter()
            .map(|&unit| (ClickType::NF, model.bbbv_click_cells[unit])),
    );
    if clicks.len() != evaluation.total_clicks {
        return Err(DomsError::Internal("constructed click count disagrees with objective".into()));
    }
    validate_clicks(model, &clicks)?;

    Ok(Solution {
        total_clicks: evaluation.total_clicks,
        chords: chords.to_vec(),
        flags: evaluation.flags,
        chains: evaluation.chains,
        unsolved_bbbv: evaluation.unsolved_bbbv,
        clicks,
    })
}

/// Exhaustive search over every chord set. Only practical for tiny boards (used by tests).
pub fn solve_bruteforce(model: &ChordModel, max_candidates: usize) -> Result<Solution, DomsError> {
    let candidate_count = model.candidate_cells.len();
    if candidate_count > max_candidates {
        return Err(DomsError::Invalid(format!(
            "brute force is limited to {} candidates; board has {}",
            max_candidates, candidate_count
        )));
    }
    let mut best_clicks = usize::MAX;
    let mut best = Vec::new();
    for mask in 0u64..(1u64 << candidate_count) {
        let chords: Vec<usize> = (0..candidate_count).filter(|&i| (mask >> i) & 1 == 1).collect();
        let clicks = evaluate_chords(model, &chords).total_clicks;
        if clicks < best_clicks {
            best_clicks = clicks;
            best = chords;
        }
    }
    construct_solution(model, &best, Some(best_clicks as i32))
}
