//! The board reduced to what matters for choosing chords.
//!
//! Every numbered safe cell (border or island cell) is a *chord candidate*. For each candidate
//! the solver only needs to know which other candidates a chord on it would reveal, which mines
//! it needs flagged, and which 3BV units it would solve.

use crate::board_gen_8way::{Board, SquareType};

pub const NO_CANDIDATE: u32 = u32::MAX;

/// Cells are row-major indexes (`row * width + col`).
/// Candidates are indexes into `candidate_cells`; every candidate list is sorted.
#[derive(Clone)]
pub struct ChordModel {
    pub height: usize,
    pub width: usize,
    pub mines: Vec<bool>,
    pub adjacent_mines: Vec<u8>,
    pub adjacent_cells: Vec<Vec<usize>>,
    /// Zero cells of each opening.
    pub opening_inner_cells: Vec<Vec<usize>>,
    /// Cell of each chord candidate.
    pub candidate_cells: Vec<usize>,
    /// Candidate index of each cell, or `NO_CANDIDATE`.
    pub candidate_of_cell: Vec<u32>,
    /// Candidates next to each candidate. Chording either one reveals the other.
    pub adjacent_candidates: Vec<Vec<usize>>,
    /// Border candidates of each opening. Chording any of them opens the whole opening,
    /// which reveals every other border cell too.
    pub opening_borders: Vec<Vec<usize>>,
    /// Openings each candidate borders (the inverse of `opening_borders`).
    pub openings_bordered: Vec<Vec<usize>>,
    pub mine_cells: Vec<usize>,
    /// For each mine, the candidates whose chord needs that mine flagged.
    pub flag_needed_by: Vec<Vec<usize>>,
    /// For each 3BV unit (openings first, then island cells), the candidates whose chord chain
    /// reveals it. An island cell is included in its own list because it gets revealed either as
    /// a chain's seed or by an adjacent chord.
    pub bbbv_solved_by: Vec<Vec<usize>>,
    /// Cell to left click for each 3BV unit that no chord solves.
    pub bbbv_click_cells: Vec<usize>,
}

fn cells_to_candidates(cells: impl Iterator<Item = usize>, candidate_of_cell: &[u32]) -> Vec<usize> {
    let mut candidates: Vec<usize> = cells
        .filter(|&cell| candidate_of_cell[cell] != NO_CANDIDATE)
        .map(|cell| candidate_of_cell[cell] as usize)
        .collect();
    candidates.sort_unstable();
    candidates.dedup();
    candidates
}

impl ChordModel {
    pub fn bbbv(&self) -> usize {
        self.bbbv_solved_by.len()
    }

    /// Board must already have been through `initialize_all`.
    pub fn from_board(board: &Board) -> Self {
        let (width, height) = (board.width, board.height);
        let cells = width * height;

        let mut mines = vec![false; cells];
        let mut adjacent_mines = vec![0u8; cells];
        let mut adjacent_cells = Vec::with_capacity(cells);
        for row in 0..height {
            for col in 0..width {
                let cell = row * width + col;
                let square = &board.squares[row][col];
                mines[cell] = square.square_type == SquareType::Mine;
                adjacent_mines[cell] = square.adjacent_mines;
                adjacent_cells.push(
                    board.all_adjacents[row][col]
                        .iter()
                        .map(|&(r, c)| r * width + c)
                        .collect::<Vec<usize>>(),
                );
            }
        }

        let candidate_cells: Vec<usize> =
            (0..cells).filter(|&cell| !mines[cell] && adjacent_mines[cell] > 0).collect();
        let mut candidate_of_cell = vec![NO_CANDIDATE; cells];
        for (candidate, &cell) in candidate_cells.iter().enumerate() {
            candidate_of_cell[cell] = candidate as u32;
        }

        let adjacent_candidates: Vec<Vec<usize>> = candidate_cells
            .iter()
            .map(|&cell| cells_to_candidates(adjacent_cells[cell].iter().copied(), &candidate_of_cell))
            .collect();

        // Openings are discovered in row-major order, so they are already sorted by their first zero.
        let mut opening_inner_cells = Vec::with_capacity(board.openings_locations.len());
        let mut opening_borders = Vec::with_capacity(board.openings_locations.len());
        for opening in &board.openings_locations {
            let mut inner: Vec<usize> = opening.squares_inner.iter().map(|&(r, c)| r * width + c).collect();
            inner.sort_unstable();
            opening_inner_cells.push(inner);
            opening_borders.push(cells_to_candidates(
                opening.squares_border.iter().map(|&(r, c)| r * width + c),
                &candidate_of_cell,
            ));
        }

        let mine_cells: Vec<usize> = (0..cells).filter(|&cell| mines[cell]).collect();
        let mut openings_bordered: Vec<Vec<usize>> = vec![Vec::new(); candidate_cells.len()];
        for (opening, border) in opening_borders.iter().enumerate() {
            for &candidate in border {
                openings_bordered[candidate].push(opening);
            }
        }

        let flag_needed_by: Vec<Vec<usize>> = mine_cells
            .iter()
            .map(|&mine| cells_to_candidates(adjacent_cells[mine].iter().copied(), &candidate_of_cell))
            .collect();

        let mut bbbv_solved_by = opening_borders.clone();
        let mut bbbv_click_cells: Vec<usize> = opening_inner_cells.iter().map(|inner| inner[0]).collect();
        for cell in 0..cells {
            if board.squares[cell / width][cell % width].square_type != SquareType::Island {
                continue;
            }
            bbbv_solved_by.push(cells_to_candidates(
                std::iter::once(cell).chain(adjacent_cells[cell].iter().copied()),
                &candidate_of_cell,
            ));
            bbbv_click_cells.push(cell);
        }

        ChordModel {
            height,
            width,
            mines,
            adjacent_mines,
            adjacent_cells,
            opening_inner_cells,
            candidate_cells,
            candidate_of_cell,
            adjacent_candidates,
            opening_borders,
            openings_bordered,
            mine_cells,
            flag_needed_by,
            bbbv_solved_by,
            bbbv_click_cells,
        }
    }

    /// Relabel candidates so that `order[new_index] == old_index`.
    pub fn reordered(&self, order: &[usize]) -> ChordModel {
        let mut new_index = vec![0usize; order.len()];
        for (next, &old) in order.iter().enumerate() {
            new_index[old] = next;
        }
        let remap = |candidates: &Vec<usize>| -> Vec<usize> {
            let mut remapped: Vec<usize> = candidates.iter().map(|&old| new_index[old]).collect();
            remapped.sort_unstable();
            remapped
        };
        let remap_all = |lists: &Vec<Vec<usize>>| -> Vec<Vec<usize>> { lists.iter().map(|list| remap(list)).collect() };

        let mut result = self.clone();
        result.candidate_cells = order.iter().map(|&old| self.candidate_cells[old]).collect();
        result.candidate_of_cell = vec![NO_CANDIDATE; self.height * self.width];
        for (candidate, &cell) in result.candidate_cells.iter().enumerate() {
            result.candidate_of_cell[cell] = candidate as u32;
        }
        result.adjacent_candidates = order.iter().map(|&old| remap(&self.adjacent_candidates[old])).collect();
        result.opening_borders = remap_all(&self.opening_borders);
        result.openings_bordered = order.iter().map(|&old| self.openings_bordered[old].clone()).collect();
        result.flag_needed_by = remap_all(&self.flag_needed_by);
        result.bbbv_solved_by = remap_all(&self.bbbv_solved_by);
        result
    }
}
