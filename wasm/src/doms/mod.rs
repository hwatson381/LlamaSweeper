//! # DOMS - Deterministically Optimal Minesweeper Solver
//! Finds a provably minimal click sequence (flags, left clicks and chords) for a board with
//! known mines. Rust port of the algorithm by qqwref.
//!
//! For a chosen set `S` of numbered cells to chord, the total clicks are
//! `|S|` chords + mines adjacent to `S` (right clicks) + chains of `S` (seed left clicks)
//! + 3BV units no chain solves (left clicks). The solver finds the `S` minimising this.
//!
//! * `model`: the board reduced to chord candidates.
//! * `reduce`: static rules removing candidates no optimal solution needs to chord.
//! * `order`: choosing the sweep order over candidates.
//! * `frontier`: the dynamic program over chord sets.
//! * `table` / `prune`: DP state storage and exact dominance pruning.
//! * `solution`: turning the chosen chords into a validated click sequence.

mod frontier;
pub mod model;
mod order;
mod prune;
pub mod reduce;
pub mod solution;
mod table;

use crate::board_gen_8way::{Board, ClickInfo, ClickType, Square, SquareType};
use model::ChordModel;
use std::fmt;

pub const DEFAULT_MAX_STATES: usize = 2_000_000;
pub const DEFAULT_DOMINANCE_COMPARISONS: u64 = 1_000_000;

#[derive(Debug)]
pub enum DomsError {
    /// The search grew beyond `max_states`; retrying with a higher limit may succeed.
    StateLimitExceeded { states: usize, processed: usize, candidates: usize },
    /// Bad input, such as a mine layout that doesn't match the board size.
    Invalid(String),
    /// A self-check or board setup failed, which indicates a bug.
    Internal(String),
}

impl fmt::Display for DomsError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            DomsError::StateLimitExceeded { states, processed, candidates } => write!(
                f,
                "Frontier grew to {} states after {}/{} chord candidates",
                states, processed, candidates
            ),
            DomsError::Invalid(message) => write!(f, "{}", message),
            DomsError::Internal(message) => write!(f, "internal DOMS error: {}", message),
        }
    }
}

impl From<String> for DomsError {
    fn from(message: String) -> Self {
        DomsError::Internal(message)
    }
}

pub enum DomsProgress<'a> {
    /// Sent once before the DP starts: frontier width after each candidate, which predicts
    /// where the slow part of the sweep will be.
    Plan { cut_widths: &'a [i32] },
    /// Sent after each candidate is decided.
    Layer { processed: usize, total: usize, states: usize },
}

#[derive(Debug, Default, Clone)]
pub struct DomsStats {
    pub bbbv: usize,
    pub chord_candidates: usize,
    pub chord_clicks: usize,
    pub flag_clicks: usize,
    pub seed_clicks: usize,
    pub remaining_bbbv_clicks: usize,
    pub sweep_order: String,
    pub peak_states: usize,
    pub max_boundary: usize,
    pub max_active_factors: usize,
    /// Chord candidates removed by the static rules; the DP decides the rest.
    pub static_removed: usize,
    /// DP children not built because a sibling rule proved the other child no worse.
    pub skipped_by_forced_chord: usize,
    pub skipped_by_forced_skip: usize,
    pub skipped_by_exchange: usize,
}

pub struct DomsResult {
    pub total_clicks: usize,
    pub clicks: Vec<ClickInfo>,
    pub stats: DomsStats,
}

fn to_click_infos(board: &Board, clicks: &[(ClickType, usize)]) -> Vec<ClickInfo> {
    clicks
        .iter()
        .enumerate()
        .map(|(i, &(c_type, cell))| ClickInfo {
            number: (i + 1) as u16,
            c_type,
            square: board.squares[cell / board.width][cell % board.width],
        })
        .collect()
}

fn to_result(board: &Board, model: &ChordModel, solution: solution::Solution) -> DomsResult {
    DomsResult {
        total_clicks: solution.total_clicks,
        clicks: to_click_infos(board, &solution.clicks),
        stats: DomsStats {
            bbbv: model.bbbv(),
            chord_candidates: model.candidate_cells.len(),
            chord_clicks: solution.chords.len(),
            flag_clicks: solution.flags.len(),
            seed_clicks: solution.chains.len(),
            remaining_bbbv_clicks: solution.unsolved_bbbv.len(),
            ..Default::default()
        },
    }
}

/// Board must already have been through `initialize_all`.
pub fn solve_board(
    board: &Board,
    max_states: usize,
    progress: &mut dyn FnMut(DomsProgress),
) -> Result<DomsResult, DomsError> {
    let model = ChordModel::from_board(board);
    let outcome = frontier::solve_frontier(&model, max_states, DEFAULT_DOMINANCE_COMPARISONS, progress)?;
    let solution = solution::construct_solution(&model, &outcome.chords, Some(outcome.total_clicks))?;
    let mut result = to_result(board, &model, solution);
    result.stats.sweep_order = outcome.sweep_order;
    result.stats.peak_states = outcome.peak_states;
    result.stats.max_boundary = outcome.max_boundary;
    result.stats.max_active_factors = outcome.max_active_factors;
    result.stats.static_removed = outcome.static_removed;
    result.stats.skipped_by_forced_chord = outcome.skipped_by_forced_chord;
    result.stats.skipped_by_forced_skip = outcome.skipped_by_forced_skip;
    result.stats.skipped_by_exchange = outcome.skipped_by_exchange;
    Ok(result)
}

/// Exhaustive reference solver for tiny boards. Board must already have been through `initialize_all`.
pub fn solve_board_bruteforce(board: &Board, max_candidates: usize) -> Result<DomsResult, DomsError> {
    let model = ChordModel::from_board(board);
    let solution = solution::solve_bruteforce(&model, max_candidates)?;
    Ok(to_result(board, &model, solution))
}

/// Solve from a row-major mine layout (non-zero = mine).
pub fn solve_mines(
    width: usize,
    height: usize,
    mines: &[u8],
    max_states: usize,
    progress: &mut dyn FnMut(DomsProgress),
) -> Result<DomsResult, DomsError> {
    if width == 0 || height == 0 || mines.len() != width * height {
        return Err(DomsError::Invalid(format!(
            "mine layout has {} cells, expected {} x {}",
            mines.len(),
            width,
            height
        )));
    }
    let mine_count = mines.iter().filter(|&&mine| mine != 0).count();

    // Board::new rejects both of these, but they are trivial.
    if mine_count == mines.len() {
        return Ok(DomsResult { total_clicks: 0, clicks: Vec::new(), stats: DomsStats::default() });
    }
    if mine_count == 0 {
        // The whole board is one opening, so any single left click wins.
        let mut square = Square::new();
        square.square_type = SquareType::Opening;
        let click = ClickInfo { number: 1, c_type: ClickType::NF, square };
        let stats = DomsStats { bbbv: 1, remaining_bbbv_clicks: 1, ..Default::default() };
        return Ok(DomsResult { total_clicks: 1, clicks: vec![click], stats });
    }

    let mut board = Board::new(width, height, mine_count)?;
    for (cell, &mine) in mines.iter().enumerate() {
        if mine != 0 {
            let (row, col) = (cell / width, cell % width);
            board.squares[row][col].square_type = SquareType::Mine;
            board.mine_locations.insert((row, col));
        }
    }
    board.initialize_all()?;
    solve_board(&board, max_states, progress)
}
