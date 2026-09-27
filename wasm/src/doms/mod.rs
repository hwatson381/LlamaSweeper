//! # DOMS - Deterministically Optimal Minesweeper Solver
//! Finds a provably minimal click sequence (flags, left clicks and chords) for a board with
//! known mines. Rust port of the algorithm by qqwref.
//!
//! The objective for a chosen set `S` of numbered squares to chord is
//! `|S| + mines adjacent to S + chord components of S + 3bv units not solved by S`.

mod frontier;
pub mod model;
mod order;
mod prune;
pub mod solution;
mod table;

use crate::board_gen_8way::{Board, ClickInfo, ClickType, Square, SquareType};
use model::Model;
use std::fmt;

pub const DEFAULT_MAX_STATES: usize = 2_000_000;
pub const DEFAULT_DOMINANCE_COMPARISONS: u64 = 1_000_000;

#[derive(Debug)]
pub enum DomsError {
    StateLimitExceeded { states: usize, processed: usize, candidates: usize },
    Invalid(String),
    Internal(String),
}

impl fmt::Display for DomsError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            DomsError::StateLimitExceeded { states, processed, candidates } => write!(
                f,
                "frontier grew to {} states after {}/{} chord candidates; increase max states",
                states, processed, candidates
            ),
            DomsError::Invalid(message) => write!(f, "{}", message),
            DomsError::Internal(message) => write!(f, "internal DOMS error: {}", message),
        }
    }
}

impl From<String> for DomsError {
    fn from(message: String) -> Self {
        DomsError::Invalid(message)
    }
}

#[derive(Debug, Default, Clone)]
pub struct DomsStats {
    pub three_bv: usize,
    pub candidate_chords: usize,
    pub selected_chords: usize,
    pub flag_clicks: usize,
    pub seed_clicks: usize,
    pub remaining_3bv_clicks: usize,
    pub order_name: String,
    pub peak_states: usize,
    pub max_boundary: usize,
    pub max_active_factors: usize,
}

pub struct DomsResult {
    pub total: usize,
    pub clicks: Vec<ClickInfo>,
    pub stats: DomsStats,
}

fn to_click_infos(board: &Board, actions: &[(ClickType, usize)]) -> Vec<ClickInfo> {
    actions
        .iter()
        .enumerate()
        .map(|(i, &(c_type, cell))| ClickInfo {
            number: (i + 1) as u16,
            c_type,
            square: board.squares[cell / board.width][cell % board.width],
        })
        .collect()
}

fn to_result(board: &Board, model: &Model, solution: solution::Solution) -> DomsResult {
    DomsResult {
        total: solution.clicks,
        clicks: to_click_infos(board, &solution.actions),
        stats: DomsStats {
            three_bv: model.three_bv(),
            candidate_chords: model.candidates.len(),
            selected_chords: solution.selected.len(),
            flag_clicks: solution.flags.len(),
            seed_clicks: solution.components.len(),
            remaining_3bv_clicks: solution.uncovered_units.len(),
            ..Default::default()
        },
    }
}

/// Board must already have been through `initialize_all`.
pub fn solve_board(
    board: &Board,
    max_states: usize,
    progress: &mut dyn FnMut(usize, usize, usize),
) -> Result<DomsResult, DomsError> {
    let model = Model::from_board(board);
    let outcome = frontier::solve_frontier(&model, max_states, DEFAULT_DOMINANCE_COMPARISONS, progress)?;
    let solution = solution::construct_solution(&model, &outcome.selected, Some(outcome.cost))?;
    let mut result = to_result(board, &model, solution);
    result.stats.order_name = outcome.order_name;
    result.stats.peak_states = outcome.peak_states;
    result.stats.max_boundary = outcome.max_boundary;
    result.stats.max_active_factors = outcome.max_active_factors;
    Ok(result)
}

/// Exhaustive reference solver for tiny boards. Board must already have been through `initialize_all`.
pub fn solve_board_bruteforce(board: &Board, max_candidates: usize) -> Result<DomsResult, DomsError> {
    let model = Model::from_board(board);
    let solution = solution::solve_bruteforce(&model, max_candidates)?;
    Ok(to_result(board, &model, solution))
}

/// Solve from a row-major mine layout (non-zero = mine).
pub fn solve_mines(
    width: usize,
    height: usize,
    mines: &[u8],
    max_states: usize,
    progress: &mut dyn FnMut(usize, usize, usize),
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
        return Ok(DomsResult { total: 0, clicks: Vec::new(), stats: DomsStats::default() });
    }
    if mine_count == 0 {
        let mut square = Square::new();
        square.square_type = SquareType::Opening;
        let click = ClickInfo { number: 1, c_type: ClickType::NF, square };
        let stats = DomsStats { three_bv: 1, remaining_3bv_clicks: 1, ..Default::default() };
        return Ok(DomsResult { total: 1, clicks: vec![click], stats });
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
