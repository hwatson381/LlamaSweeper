use crate::board_gen_8way::{Board, SquareType};

pub const NO_CANDIDATE: u32 = u32::MAX;

/// Flattened board description used by the solver.
/// * Cells are row-major indexes (`row * width + col`).
/// * Candidates are the numbered safe cells, i.e. every cell that could be chorded.
/// * Scopes are sorted lists of candidate indexes.
#[derive(Clone)]
pub struct Model {
    pub height: usize,
    pub width: usize,
    pub mines: Vec<bool>,
    pub numbers: Vec<u8>,
    pub neighbours: Vec<Vec<usize>>,
    pub zeros: Vec<Vec<usize>>,
    pub candidates: Vec<usize>,
    pub candidate_index: Vec<u32>,
    /// Candidates adjacent to each candidate (chording one reveals the other).
    pub graph: Vec<Vec<usize>>,
    /// Border candidates of each opening. Chording any of them opens the whole opening.
    pub zero_scopes: Vec<Vec<usize>>,
    pub mine_cells: Vec<usize>,
    /// Candidates whose chord would require flagging each mine.
    pub mine_scopes: Vec<Vec<usize>>,
    /// Candidates whose chord would solve each 3bv unit (openings first, then islands).
    pub base_scopes: Vec<Vec<usize>>,
    /// Cell to left click for each 3bv unit if no chord solves it.
    pub base_representatives: Vec<usize>,
}

fn candidate_scope(cells: impl Iterator<Item = usize>, candidate_index: &[u32]) -> Vec<usize> {
    let mut scope: Vec<usize> = cells
        .filter(|&cell| candidate_index[cell] != NO_CANDIDATE)
        .map(|cell| candidate_index[cell] as usize)
        .collect();
    scope.sort_unstable();
    scope.dedup();
    scope
}

impl Model {
    pub fn three_bv(&self) -> usize {
        self.base_scopes.len()
    }

    /// Board must already have been through `initialize_all`.
    pub fn from_board(board: &Board) -> Self {
        let (width, height) = (board.width, board.height);
        let cells = width * height;

        let mut mines = vec![false; cells];
        let mut numbers = vec![0u8; cells];
        let mut neighbours = Vec::with_capacity(cells);
        for row in 0..height {
            for col in 0..width {
                let cell = row * width + col;
                let square = &board.squares[row][col];
                mines[cell] = square.square_type == SquareType::Mine;
                numbers[cell] = square.adjacent_mines;
                neighbours.push(
                    board.all_adjacents[row][col]
                        .iter()
                        .map(|&(r, c)| r * width + c)
                        .collect::<Vec<usize>>(),
                );
            }
        }

        let candidates: Vec<usize> = (0..cells).filter(|&cell| !mines[cell] && numbers[cell] > 0).collect();
        let mut candidate_index = vec![NO_CANDIDATE; cells];
        for (i, &cell) in candidates.iter().enumerate() {
            candidate_index[cell] = i as u32;
        }

        let graph: Vec<Vec<usize>> = candidates
            .iter()
            .map(|&cell| candidate_scope(neighbours[cell].iter().copied(), &candidate_index))
            .collect();

        // Openings are discovered in row-major order, so they are already sorted by their first zero.
        let mut zeros = Vec::with_capacity(board.openings_locations.len());
        let mut zero_scopes = Vec::with_capacity(board.openings_locations.len());
        for opening in &board.openings_locations {
            let mut inner: Vec<usize> = opening.squares_inner.iter().map(|&(r, c)| r * width + c).collect();
            inner.sort_unstable();
            zeros.push(inner);
            zero_scopes.push(candidate_scope(
                opening.squares_border.iter().map(|&(r, c)| r * width + c),
                &candidate_index,
            ));
        }

        let mine_cells: Vec<usize> = (0..cells).filter(|&cell| mines[cell]).collect();
        let mine_scopes: Vec<Vec<usize>> = mine_cells
            .iter()
            .map(|&mine| candidate_scope(neighbours[mine].iter().copied(), &candidate_index))
            .collect();

        let mut base_scopes = zero_scopes.clone();
        let mut base_representatives: Vec<usize> = zeros.iter().map(|zero| zero[0]).collect();
        for cell in 0..cells {
            if board.squares[cell / width][cell % width].square_type != SquareType::Island {
                continue;
            }
            base_scopes.push(candidate_scope(
                std::iter::once(cell).chain(neighbours[cell].iter().copied()),
                &candidate_index,
            ));
            base_representatives.push(cell);
        }

        Model {
            height,
            width,
            mines,
            numbers,
            neighbours,
            zeros,
            candidates,
            candidate_index,
            graph,
            zero_scopes,
            mine_cells,
            mine_scopes,
            base_scopes,
            base_representatives,
        }
    }

    /// Relabel candidates so that `order[new_index] == old_index`.
    pub fn reordered(&self, order: &[usize]) -> Model {
        let q = order.len();
        let mut inverse = vec![0usize; q];
        for (next, &old) in order.iter().enumerate() {
            inverse[old] = next;
        }

        let mut result = self.clone();
        result.candidates = order.iter().map(|&old| self.candidates[old]).collect();
        result.candidate_index = vec![NO_CANDIDATE; self.height * self.width];
        for (i, &cell) in result.candidates.iter().enumerate() {
            result.candidate_index[cell] = i as u32;
        }

        let remap = |scopes: &Vec<Vec<usize>>| -> Vec<Vec<usize>> {
            scopes
                .iter()
                .map(|scope| {
                    let mut next: Vec<usize> = scope.iter().map(|&value| inverse[value]).collect();
                    next.sort_unstable();
                    next
                })
                .collect()
        };
        result.graph = order
            .iter()
            .map(|&old| {
                let mut next: Vec<usize> = self.graph[old].iter().map(|&value| inverse[value]).collect();
                next.sort_unstable();
                next
            })
            .collect();
        result.zero_scopes = remap(&self.zero_scopes);
        result.mine_scopes = remap(&self.mine_scopes);
        result.base_scopes = remap(&self.base_scopes);
        result
    }
}
