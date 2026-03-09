use std::{fmt, vec};
use std::collections::{VecDeque, BTreeSet};
use rustc_hash::{{FxHashMap, FxHashSet}};
use std::cmp::{min, max};
use std::hash::Hash;
use rand::prelude::*;
use std::time::Instant;

const MAX_WIDTH: usize = 128;
const MAX_HEIGHT: usize = 128;
const ZINI_NF_THRESHOLD: i8 = 0;   /* threshold for zini premium to determine to NF click or not */
const ZINI_MIN_PREMIUM: i8 = -9;

/// # Get Adjacent
/// Helper function to get all valid adjacent locations from a given (row, col)
fn get_adjacent(row: usize, col: usize, row_count: usize, col_count: usize) -> Result<Vec<(usize, usize)>, String> {
    if row >= row_count || col >= col_count {
        return Err("Out of bounds".into());
    }

    let mut out: Vec<(usize, usize)> = Vec::with_capacity(8);

    for r in max(1, row) - 1..=min(row_count - 1, row + 1) {
        for c in max(1, col) - 1..=min(col_count - 1, col + 1) {
            if (r, c) == (row, col) { continue }
            out.push((r, c));
        }
    }

    Ok(out)
}

/// # Swapper
/// #### Helper function to swap coordinates for sorting purposes.
/// Running it on swapped coordinates will have the result of setting them back to how they originally were.
pub fn swapper(location: (usize, usize), swap_row: bool, swap_col: bool, swap_row_col: bool, unswap: bool) -> (usize, usize) {
    if !swap_row && !swap_col && !swap_row_col {
        return location;
    }

    let (mut row, mut col) = (location.0, location.1);

    if unswap && swap_row_col {
        (row, col) = (col, row);
    }
    if swap_row {
        row = usize::MAX - row;
    }
    if swap_col {
        col = usize::MAX - col;
    }
    if swap_row_col && !unswap {
        (row, col) = (col, row);
    }

    (row, col)
}

/// # Opening
/// Container struct for an "opening"
/// * Openings include the border and the "inner" (zero) squares
/// * Openings are considered to be one 3bv for the entire region
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Opening {
    pub squares_border: FxHashSet<(usize, usize)>,
    pub squares_inner: FxHashSet<(usize, usize)>,
}

impl Opening {
    pub fn new() -> Self {
        Opening {
            squares_border: FxHashSet::default(),
            squares_inner: FxHashSet::default(),
        }
    }

    pub fn reset(&mut self) {
        self.squares_border.clear();
        self.squares_inner.clear();
    }

    /// # All Squares
    /// Returns an iterator over all squares in the opening (borders + inner)
    pub fn all_squares(&self) -> impl Iterator<Item = &(usize, usize)> {
        self.squares_border.iter().chain(self.squares_inner.iter())
    }

    pub fn len(&self) -> usize {
        self.squares_border.len() + self.squares_inner.len()
    }

    pub fn contains(&self, row: usize, col: usize) -> bool {
        self.squares_border.contains(&(row, col)) || self.squares_inner.contains(&(row, col))
    }
}

/// # Click Type
/// * `NF`, `Chord`, `Flag`
/// * Used for path info
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClickType {
    NF,
    Chord,
    Flag,
}

/// # Click Info
/// * `number`: Order of solve
/// * `c_type`: Click Type (NF, Chord, Flag)
/// * `square`: Square that was clicked
/// * Used for path info
pub struct ClickInfo {
    pub number: u16,
    pub c_type: ClickType,
    pub square: Square,
}

/// # ZINI Square Status
/// * `Unclicked`: Not revealed
/// * `Clicked`: Revealed/Flagged
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SquareStatus {
    Unclicked,
    Clicked,
}

/// # ZINI Square Type
/// * `Opening`: Opening is considered to have one 3bv for the entire non-border region
/// * `Border`: Border is considered to not have 3bv
/// * `Island`: Island is considered to have 3bv
/// * `Mine`: Mines do not have 3bv
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SquareType {
    Opening,
    Border,
    Island,
    Mine,
}

// order matters for sorting - openings need to be before borders
impl Ord for SquareType {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        let priority = |zst: &SquareType| match zst {
            SquareType::Opening => 1,
            SquareType::Border => 2,
            SquareType::Island => 2,
            SquareType::Mine => 4,
        };

        priority(self).cmp(&priority(other))
    }
}

impl PartialOrd for SquareType {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl fmt::Display for SquareType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            SquareType::Opening => write!(f, "o"),
            SquareType::Island => write!(f, "i"),
            SquareType::Border => write!(f, "B"),
            SquareType::Mine => write!(f, "x"),
        }
    }
}

/// # Square
/// ### Default values:
/// * Square Type: Opening
/// * Square Status: Unclicked
/// * Premium: -2
///   * -1 for unclicked, -1 for NF modifier
#[derive(Debug, Clone, Copy)]
pub struct Square {
    pub adjacent_mines: u8,
    pub square_type: SquareType,
    pub square_status: SquareStatus,
    pub premium: i8,
    pub row: u8,
    pub col: u8,
}

impl Square {
    pub fn new() -> Self {
        Square {
            adjacent_mines: 0,
            square_type: SquareType::Opening,
            square_status: SquareStatus::Unclicked,
            premium: -2,
            row: 0,
            col: 0,
        }
    }

    pub fn reset(&mut self) {
        self.adjacent_mines = 0;
        self.square_type = SquareType::Opening;
        self.square_status = SquareStatus::Unclicked;
        self.premium = -2;
        self.row = 0;
        self.col = 0;
    }
}

impl fmt::Display for Square {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        if self.square_type == SquareType::Mine {
            write!(f, "X")
        } else {
            write!(f, "{}", self.adjacent_mines)
        }
    }
}

impl PartialEq for Square {
    fn eq(&self, other: &Self) -> bool {
        self.premium == other.premium
    }
}

impl Eq for Square {}

impl PartialOrd for Square {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Square {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        other.premium.cmp(&self.premium)            // sort descending on premium (highest to lowest)
        .then(self.square_type.cmp(&other.square_type))     // tie-break in this order: opening, island or border, mine
    }
}

/// # Board Info
/// * `bbbv`: 3bv
/// * `zini`: zini score
/// * `openings_count`: number of openings
/// * `islands_count`: number of islands
pub struct BoardInfo {
    pub bbbv: u16,      // all the boys say hey bb, hey bv, hey
    pub zini: u16,
    pub openings_count: u16,
    pub islands_count: u16,
}

impl BoardInfo {
    pub fn new() -> Self {
        BoardInfo {
            bbbv: 0,
            zini: 0,
            openings_count: 0,
            islands_count: 0,
        }
    }

    pub fn reset(&mut self) {
        self.bbbv = 0;
        self.zini = 0;
        self.openings_count = 0;
        self.islands_count = 0;
    }
}

/// # Board
///
/// * `squares`: main grid
/// * `width`, `height`, `mine_count`: self-explanatory
/// * `info`: 3bv, zini, openings count, islands count
/// * `mine_locations`: set of (row, col) for all mine locations
/// * `islands_locations`: vector of sets of (row, col) for island locations
/// * `openings_locations`: vector of openings
/// * `openings_ids`: map `(row, col)`: index in `openings_locations`, in order to look up a square's opening
/// * `all_adjacents`: pre-computed map of all adjacent squares for each square
pub struct Board {
    pub squares: Vec<Vec<Square>>,
    pub width: usize,
    pub height: usize,
    pub mine_count: usize,
    pub info: BoardInfo,
    pub mine_locations: FxHashSet<(usize, usize)>,
    pub islands_locations: Vec<FxHashSet<(usize, usize)>>,
    pub openings_locations: Vec<Opening>,
    pub openings_ids: FxHashMap<(usize, usize), usize>,
    pub all_adjacents: Vec<Vec<Vec<(usize, usize)>>>,
    pub profiler: Profiler
}

/// Main Section
impl Board {
    /// # New Board
    /// Creates empty, uninitialized board
    pub fn new(width: usize, height: usize, mine_count: usize, profiler: Profiler) -> Result<Self, String> {
        // input validation
        if width == 0 || width > MAX_WIDTH {
            return Err(format!("Bad Width {width}"));
        }
        if height == 0 || height > MAX_HEIGHT {
            return Err(format!("Bad Height {height}"));
        }
        if mine_count == 0 || mine_count > (width * height) - 1 {
            return Err(format!("Bad Mine Count {mine_count}"));
        }

        // main
        let squares = vec![
            vec![
                Square::new();
                width
            ];
            height
        ];

        let openings_ids: FxHashMap<(usize, usize), usize> = FxHashMap::with_capacity_and_hasher(width * height - mine_count, Default::default());

        // pre-compute all adjacent locations.
        // i dont know for certain if this is actually faster/better, but it seems good, because squares will definitely require multiple lookups.
        let all_adjacents: Vec<Vec<Vec<(usize, usize)>>> = (0..height).map(|row| {
            (0..width).map(|col| {
                get_adjacent(row, col, height, width).expect("Shouldn't fail?")
            }).collect()
        }).collect();

        Ok(Board {
            squares,
            width,
            height,
            mine_count,
            info: BoardInfo::new(),
            mine_locations: FxHashSet::with_capacity_and_hasher(mine_count, Default::default()),
            openings_locations: Vec::new(),
            islands_locations: Vec::new(),
            openings_ids,
            all_adjacents,
            profiler
        })
    }

    /// # Load Board (.mbf)
    /// * Parse data from a .mbf or .abf file
    /// * Data must be a vector of bytes
    pub fn load_board_mbf(data: Vec<u8>) -> Result<Self, String> {
        // the file must have an even number of bytes
        if data.len() % 2 != 0 {
            return Err("Board file has odd bytes".to_string());     // well that's odd
        }

        // the first 4 bytes of the board file contain basic info about the board
        let width = data.get(0).ok_or_else(|| "No Width".to_owned())?;
        let height = data.get(1).ok_or_else(|| "No Height".to_owned())?;
        let mine_count_first_byte = data.get(2).ok_or_else(|| "No Mine Count 1".to_owned())?;
        let mine_count_second_byte = data.get(3).ok_or_else(|| "No Mine Count 2".to_owned())?;

        if *width as usize > MAX_WIDTH || *height as usize > MAX_HEIGHT {
            return Err(format!("Bad Width or Height\nwidth: {width}\nheight: {height}"));   // that's too much, man!
        }

        // the third & fourth bytes are u16 mine count
        let mine_count = (*mine_count_first_byte as u16) << 8 | (*mine_count_second_byte as u16);

        let confirm_count:u16 = (data.len() as u16 - 4) / 2;
        if confirm_count != mine_count {
            return Err(format!("Mine count mismatch:\nmine count: {mine_count}\nconfirm count: {confirm_count}"));
        }

        let profiler = Profiler::build();
        let mut board = Board::new(*width as usize, *height as usize, mine_count as usize, profiler)?;

        // the rest of the data is (x, y) coordinates of mines, which is why the total byte count must be even
        for bytes in data[4..].chunks(2) {
            board.squares[bytes[1] as usize][bytes[0] as usize].square_type = SquareType::Mine;
            board.mine_locations.insert((bytes[1] as usize, bytes[0] as usize));
        }

        Ok(board)
    }

    /// # Create board from a PTTACG formatted string
    /// * Example format: ?b=3&m=vvvvvvg00000g00201h0104gg08801k50001g02190g00g00g80844k0g000g0920gh00000k000i0g20g00g12200g00001
    /// * The locations of mines are stored as one giant integer, converted to base 32
    /// * In binary, each bit represents a square, 1 for mine, 0 for clear
    pub fn load_board_pttacg(mut pttacg_str: String) -> Result<Self, String> {
        // initialize
        pttacg_str = pttacg_str.to_lowercase();
        let start = pttacg_str.find("?b=").ok_or_else(|| format!("Could not find string start in: {}", pttacg_str))?;
        let board_start = pttacg_str.find("&m=").ok_or_else(|| format!("Could not find board start in: {}", pttacg_str))?;
        let board_size = &pttacg_str[start + 3..board_start];

        let width: usize;
        let height: usize;
        let mut mine_count = 0usize;

        // dimensions
        if board_size == "1" {
            width = 9;
            height = 9;
        } else if board_size == "2" {
            width = 16;
            height = 16;
        } else if board_size == "3" {
            width = 30;
            height = 16;
        } else {
            if board_size.len() % 2 != 0 {
                return Err(format!("Could not parse board size, odd amount of digits: {}", pttacg_str));    // well that's odd
            } else if board_size.len() > 6 {
                return Err(format!("Could not parse board size, too many digits: {}", pttacg_str));
            }
            let mid = board_size.len() / 2;
            let size_parts = board_size.split_at(mid);
            width = size_parts.0.parse::<usize>().map_err(|_| format!("Could not parse board width in: {}", pttacg_str))?;
            height = size_parts.1.parse::<usize>().map_err(|_| format!("Could not parse board height in: {}", pttacg_str))?;
            if width == 0 || height == 0 || width > MAX_WIDTH || height > MAX_HEIGHT {
                return Err(format!("Bad Width or Height detected\nwidth: {width}\nheight: {height}"));
            }
        }

        // mine locations
        let mine_locations_str = pttacg_str[board_start + 3..].trim();
        if mine_locations_str.len() != ((width * height) as f32 / 5.0).ceil() as usize {
            return Err(format!("Width, Height, and mine length do not match:\n {}, {}, {}\n{}", width, height, mine_locations_str, pttacg_str));
        }

        let mut mine_locations_vec:Vec<bool> = Vec::with_capacity(5 * mine_locations_str.len());
        for s in mine_locations_str.chars() {
            // convert from base 32 to binary
            let binary_value = s.to_digit(32).ok_or_else(|| format!("Bad digit '{}' in: {}", s, pttacg_str))?;

            // each character represents 5 bits
            for bit in format!("{:05b}", binary_value).chars() {
                if bit == '1' {
                    mine_locations_vec.push(true);
                    mine_count += 1;
                } else {
                    mine_locations_vec.push(false);
                }
            }
        }

        // create board and add mines
        let profiler = Profiler::build();
        let mut board = Board::new(width, height, mine_count, profiler)?;

        for (index, has_mine) in mine_locations_vec.iter().enumerate() {
            if *has_mine {
                let row = index / width;
                let col = index % width;
                board.squares[row][col].square_type = SquareType::Mine;
                board.mine_locations.insert((row, col));
            }
        }

        Ok(board)
    }

    /// # Generate PTTACG formatted string
    /// * The board is treated as a great big integer, with a length (in bits) of width * height.
    /// * Each bit represents a cell on the board, with 1 for a mine and 0 for no mine.
    /// * It is converted to a base 32 (5-bits) string to shorten it.
    /// * Extra pad bits are added on the right to make the length a multiple of 5.
    pub fn generate_pttacg(&self) -> String {

        let mut result = String::new();

        // board size
        if self.width == 9 && self.height == 9 {
            result.push_str("?b=1&m=");
        } else if self.width == 16 && self.height == 16 {
            result.push_str("?b=2&m=");
        } else if self.width == 30 && self.height == 16 {
            result.push_str("?b=3&m=");
        } else {
            let str_width = self.width.to_string().len().max(self.height.to_string().len());
            result.push_str(&format!("?b={:0>width$}{:0>width$}&m=", self.width, self.height, width=str_width));
        }

        // convert to bits
        let mut flat_mines: Vec<String> = self.squares
            .iter()
            .flat_map(|row| row.iter()
                .map(|cell| if cell.square_type == SquareType::Mine { "1" } else { "0" }.to_string()))
            .collect();

        // pad
        if flat_mines.len() % 5 != 0 {
            flat_mines.extend(vec!["0".to_string(); 5 - (flat_mines.len() % 5)]);
        }

        // convert to base 32
        for chunk in flat_mines.chunks(5) {
            let value = u32::from_str_radix(&chunk.join(""), 2).unwrap();
            result.push(char::from_digit(value, 32).unwrap());
        }

        result
    }

    /// # Reset Board
    /// Resets all squares, info, and state
    pub fn reset(&mut self) {
        for row in 0..self.height {
            for col in 0..self.width {
                self.squares[row][col].reset();
            }
        }

        self.info.reset();
        self.mine_locations.clear();
        self.openings_locations.clear();
        self.openings_ids.clear();
        self.islands_locations.clear();
    }

    /// # Add Mines
    /// Randomly place mines on the board
    pub fn add_mines(&mut self) {
        /* not hugely different from ms-toollib */
        let mut rng = rand::rng();

        let mut locations = vec![false; self.width * self.height];
        locations[(self.width * self.height) - self.mine_count..].fill(true);

        locations.shuffle(&mut rng);

        for x in 0..locations.len() {
            if locations[x] {
                let row = x / self.width;
                let col = x % self.width;
                self.mine_locations.insert((row, col));
                self.squares[row][col].square_type = SquareType::Mine;
            }
        }
    }

    /// # Add Mines (Alternate Version)
    /// "skip and continue" style
    pub fn add_mines_skip_style(&mut self, safe_row: usize, safe_col: usize) {
        let mut rng = rand::rng();

        let safe_index = (safe_row * self.width) + safe_col;
        let minus_one = (self.width * self.height) - 1; // off-by-one errors are fun
        let mut locations = vec![false; minus_one];
        locations[minus_one - self.mine_count..].fill(true); // true = mine

        locations.shuffle(&mut rng);

        let mut new_locations = Vec::with_capacity(self.width * self.height);
        for i in 0..safe_index {
            new_locations.push(locations[i]);
        }
        new_locations.push(false);
        for i in safe_index..locations.len() {
            new_locations.push(locations[i]);
        }

        for (i, mine) in new_locations.into_iter().enumerate() {
            if mine {
                let row = i / self.width;
                let col = i % self.width;
                self.mine_locations.insert((row, col));
                self.squares[row][col].square_type = SquareType::Mine;
            }
        }

        assert!(self.mine_locations.len() == self.mine_count);
    }

    /// # Move Mine
    /// ### Handles the first click scenario of needing to move a mine
    /// * safe_row, safe_col: coordinates for first click
    /// * opening: guarantee an opening
    pub fn move_mine(&mut self, safe_row: usize, safe_col: usize, opening: bool) {

        let mut safe_squares = FxHashSet::with_capacity_and_hasher(9, Default::default());
        safe_squares.insert((safe_row, safe_col));

        if opening {
            safe_squares.extend(self.all_adjacents[safe_row][safe_col].iter().copied());
        }

        let mut all_safe = true;
        for (r, c) in &safe_squares {
            if self.squares[*r][*c].square_type == SquareType::Mine {
                all_safe = false;
                break;
            }
        }
        if all_safe {
            return;
        }

        // random
        let mut rng = rand::rng();

        /*
        iterate entire board to guarantee finding a new location.
        arbitrarily chosen density threshold of 50%.
        case 1: avoid rare case of not finding a new location in the first few tries.
        case 2: guaranteed opening.  a lot higher possibility of bad luck when using 9 squares.
        */
        if self.mine_count as f32 / (self.width as f32 * self.height as f32) > 0.5
        || opening {

            // using vec because the .choose() function doesn't work on hashsets
            let mut clear_spaces = Vec::with_capacity(self.width * self.height - self.mine_count);

            for x in 0..(self.width * self.height) {
                let r = x / self.width;
                let c = x % self.width;
                if self.squares[r][c].square_type != SquareType::Mine {
                    clear_spaces.push((r, c));
                }
            }

            for (row, col) in &safe_squares {
                while self.squares[*row][*col].square_type == SquareType::Mine {
                    let (new_row, new_col) = clear_spaces.choose(&mut rng).expect("no clear spaces???? this should not be possible");
                    if safe_squares.contains(&(*new_row, *new_col))
                    || self.squares[*new_row][*new_col].square_type == SquareType::Mine {  // edge case of choosing the same new location again
                        continue;
                    }

                    self.squares[*new_row][*new_col].square_type = SquareType::Mine;
                    self.squares[*row][*col].square_type = SquareType::Opening;
                    self.mine_locations.remove(&(*row, *col));
                    self.mine_locations.insert((*new_row, *new_col));
                    // intentionally avoiding pushing/popping from clear_spaces because it is vec
                }
            }

            return;
        }

        // randomly choose a new location and hope it is clear.
        // this "should" almost always be faster than iterating the entire board (for a single square),
        // unless choosing random numbers is much slower than iterating.  don't know for sure, but it seems unlikely.
        let mut new_row = rng.random_range(0..self.height);
        let mut new_col = rng.random_range(0..self.width);

        while self.squares[safe_row][safe_col].square_type == SquareType::Mine {
            if self.squares[new_row][new_col].square_type == SquareType::Mine {
                new_row = rng.random_range(0..self.height);
                new_col = rng.random_range(0..self.width);
            } else {
                self.squares[new_row][new_col].square_type = SquareType::Mine;
                self.squares[safe_row][safe_col].square_type = SquareType::Opening;
                self.mine_locations.remove(&(safe_row, safe_col));
                self.mine_locations.insert((new_row, new_col));
            }
        }
    }

    /// # Initialize All
    /// * After mines are added, this runs all the initializations
    pub fn initialize_all(&mut self) -> Result<(), String> {
        self.initialize_squares();
        self.openings_islands_3bv()?;
        self.zini_init_final()?;

        Ok(())
    }

    /// # Initialize Squares
    /// * Next step after adding mines
    /// * Assigns numbers and types
    /// * Adds ZINI premium
    pub fn initialize_squares(&mut self) {
        // number
        for (row, col) in &self.mine_locations {
            for &(adj_row, adj_col) in &self.all_adjacents[*row][*col] {
                self.squares[adj_row][adj_col].adjacent_mines += 1;
            }
        }

        // type & premium
        for row in 0..self.height {
            for col in 0..self.width {
                let current_square = &mut self.squares[row][col];
                current_square.row = row as u8;
                current_square.col = col as u8;

                // the order matters and mines need to be processed first
                // mines go to minimum, they need to be something
                if current_square.square_type == SquareType::Mine {
                    current_square.premium = ZINI_MIN_PREMIUM;
                    continue;
                }

                // opening is the default value, so skip
                if current_square.adjacent_mines == 0 {
                    continue;
                }

                // island or border.  the distinction is borders are adjacent to openings, islands are not
                current_square.square_type = SquareType::Island;
                for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
                    let adj_square = &self.squares[adj_row][adj_col];
                    if adj_square.square_type != SquareType::Mine
                    && adj_square.adjacent_mines == 0 {      // use adjacent_mines instead of square_type because squares haven't been fully assigned yet
                        self.squares[row][col].square_type = SquareType::Border;
                        break;
                    }
                }

                // premium
                let current_square = &mut self.squares[row][col];
                current_square.premium -= current_square.adjacent_mines as i8;

                if current_square.square_type == SquareType::Island {
                    current_square.premium += 1;    // "llama style" offset the -1 "click to open penalty" (which is part of ZiniSquare::new())

                    // islands increase the adjacent 3bv of all their neighbors by 1
                    for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
                        let adj_square = &mut self.squares[adj_row][adj_col];
                        if adj_square.square_type == SquareType::Mine {
                            continue;
                        }
                        adj_square.premium += 1;
                    }
                }
            }
        }
    }

    /// # Openings, Islands, and 3BV
    /// * BFS to group openings and islands.
    /// * Also calculates 3bv.
    fn openings_islands_3bv(&mut self) -> Result<(), String> {
        /* initialize */
        let mut visited: Vec<Vec<bool>> = vec![vec![false; self.width]; self.height];
        self.mine_locations.iter().for_each(|(r,c)| {visited[*r][*c] = true;});
        let mut opening_or_island: bool; // true = opening, false = island

        // iterate all squares
        for row in 0..self.height {
            for col in 0..self.width {
                if visited[row][col] {
                    continue;
                }
                let current_square = &self.squares[row][col];
                if current_square.square_type == SquareType::Mine {
                    return Err("Mine found during BFS".into());     // mines are pre-added to visited
                }

                if current_square.square_type == SquareType::Island {
                    opening_or_island = false;
                    self.info.islands_count += 1;
                } else if current_square.square_type == SquareType::Opening {
                    opening_or_island = true;
                    self.info.openings_count += 1;
                } else if current_square.square_type == SquareType::Border {
                    continue;   // skip because borders get handled by openings
                } else {
                    return Err(format!("Square is neither opening nor island\n{} {}\n{:#?}", row, col, current_square));
                }

                // BFS
                let mut queue: VecDeque<(usize, usize)> = VecDeque::new();
                let mut visiting: FxHashSet<(usize, usize)> = FxHashSet::default();  /* "local visited", because some squares need to be processed more than once */
                let mut current_island: FxHashSet<(usize, usize)> = FxHashSet::default();
                let mut current_opening = Opening::new();
                queue.push_back((row, col));

                // main loop
                while let Some((r, c)) = queue.pop_front() {
                    if visited[r][c] || visiting.contains(&(r, c)) {
                        continue;
                    }
                    visiting.insert((r, c));
                    let current_square = &self.squares[r][c];

                    if opening_or_island {      // process opening
                        if current_square.square_type == SquareType::Opening {
                            current_opening.squares_inner.insert((r, c));
                        } else if current_square.square_type == SquareType::Border {
                            current_opening.squares_border.insert((r, c));
                            continue;
                        } else {
                            continue;
                        }
                    } else {                    // process island
                        if current_square.square_type == SquareType::Island {
                            self.info.bbbv += 1;
                            current_island.insert((r, c));
                        } else {
                            continue;
                        }
                    }

                    for &(adj_row, adj_col) in &self.all_adjacents[r][c] {
                        if visited[adj_row][adj_col] || visiting.contains(&(adj_row, adj_col)) {
                            continue;
                        }
                        queue.push_back((adj_row, adj_col));
                    }
                }

                /* while loop finished */
                if opening_or_island {
                    current_opening.squares_inner.iter().for_each(|(r,c)| {visited[*r][*c] = true;}); // only inner, because borders can be part of multiple openings
                    self.openings_locations.push(current_opening);
                    self.info.bbbv += 1;   // each opening counts as 1 bbbv
                } else {
                    current_island.iter().for_each(|(r,c)| {visited[*r][*c] = true;});
                    self.islands_locations.push(current_island);
                }
            }
        }

        /* set up IDs */
        for (index, opening) in self.openings_locations.iter().enumerate() {
            for square in &opening.squares_inner {
                self.openings_ids.insert(*square, index);
            }
        }

        Ok(())
    }

    /// # To minesArray
    /// * Convert from (row, col) indexing to (x, y) indexing
    /// * Convert to bool for mines (true=mine)
    pub fn to_mines_array(&self) -> Vec<Vec<bool>> {
        let mut mines_array = vec![vec![false; self.height]; self.width];
        for (r, c) in &self.mine_locations {
            mines_array[*c][*r] = true;
        }
        mines_array
    }
}

/// Zini Section
impl Board {
    /// # Generate Efficiency Board
    /// * Generates a single board
    /// * Returns bool true/false if it meets the target
    ///
    /// ***Important Note:*** Does not fully calculate zini, only checks enough to determine if target efficiency is met.
    pub fn generate_eff_board(&mut self, target_eff: f32, use_first_click: bool, first_click_row: usize, first_click_col: usize, opening: bool) -> Result<bool, String> {

        self.add_mines();

        if use_first_click {
            self.move_mine(first_click_row, first_click_col, opening);
        }

        self.initialize_all()?;
        let bbbv = self.info.bbbv as f32;

        // all permutations
        let eight_way: Vec<(bool, bool, bool)> = (0..8)
            .map(|i| (
                i & 1 != 0,      // bit 0
                i & 2 != 0,      // bit 1
                i & 4 != 0,      // bit 2
            ))
            .collect();

        let mut best_zini: u16 = u16::MAX;
        let mut current_eff_score: f32 = 0.0;
        let mut first_check = false;
        for (row_desc, col_desc, swap) in eight_way {
            match self.zini(row_desc, col_desc, swap) {
                Ok((zini_score, _path)) => {
                    if zini_score < best_zini {
                        best_zini = zini_score;
                    }
                },
                Err(e) => {
                    eprintln!("8-Way ZINI failed: {}", e);
                    return Err(format!("8-Way ZINI failed: {}", e));
                }
            }

            // exit early if target met
            current_eff_score = self.info.bbbv as f32 / (best_zini as f32);
            if current_eff_score >= target_eff {
                break;
            }

            // exit early if not close enough
            if !first_check {
                let zini = best_zini as f32;
                if bbbv / (bbbv - (bbbv - zini) * 1.15 - 2.0) < target_eff {
                    break;
                }
                first_check = true;
            }
        }

        self.info.zini = best_zini;

        Ok(current_eff_score >= target_eff)
    }

    /// # Calculate 8-way ZINI
    /// ### All 8 permutations for tie-break
    pub fn calculate_zini_8way(&mut self, print_score: bool) -> Result<u16, String> {

        if print_score {
            println!("\nStarting 8-Way ZINI... Good luck!");
        }

        // all permutations
        let eight_way: Vec<(bool, bool, bool)> = (0..8)
            .map(|i| (
                i & 1 != 0,      // bit 0
                i & 2 != 0,      // bit 1
                i & 4 != 0,      // bit 2
            ))
            .collect();

        let mut best_zini: u16 = u16::MAX;
        let mut best_path: Vec<ClickInfo> = Vec::new();
        let mut best_swaps: (bool, bool, bool) = (false, false, false);
        for (row_desc, col_desc, swap) in eight_way {
            match self.zini(row_desc, col_desc, swap) {
                Ok((zini_score, path)) => {
                    if zini_score < best_zini {
                        best_zini = zini_score;
                        best_path = path;
                        best_swaps = (row_desc, col_desc, swap);
                    }
                },
                Err(e) => {
                    eprintln!("8-Way ZINI failed: {}", e);
                    return Err(format!("8-Way ZINI failed: {}", e));
                }
            }
        }

        if print_score {
            println!("--------------Start Line--------------");
            println!("8-way ZINI Score: {}", best_zini);
            println!("8-way ZINI Swaps: {:?}", best_swaps);
            self.path_printer(&best_path);
            println!("8-way ZINI Score: {}", best_zini);
            println!("---------------End Line---------------");
        }

        self.info.zini = best_zini;

        Ok(best_zini)
    }

    /// # ZINI Algorithm
    /// * tie_break_direction is based on the combination of swaps.
    /// * standard zini (top left) is (false, false, false)
    pub fn zini(&mut self, swap_r: bool, swap_c: bool, swap_r_c: bool) -> Result<(u16, Vec<ClickInfo>), String> {
        // TODO: add check if board initialized

        // TODO: change to time-based emergency brake
        let mut emergency_break = 0u32;
        const EMERGENCY_BREAK_LIMIT: u32 = 10_000;      /* u32 max: 4_294_967_296 */

        let mut current_board: Vec<Vec<Square>> = self.squares.clone();  // duplicating to keep the original unchanged for future iterations
        let mut zini_score = 0u16;
        let mut path: Vec<ClickInfo> = Vec::new();

        let mut changed_squares: FxHashMap<(usize, usize), i8> = FxHashMap::with_capacity_and_hasher(self.width * self.height / 2, Default::default());  // square location: premium before change
        let mut premiums = self.zini_create_premiums(swap_r, swap_c, swap_r_c);
        let mut remaining: u16 = self.width as u16 * self.height as u16 - self.mine_count as u16;

        while remaining > 0 {
            //Get square with highest premium, and if no squares >= 0 then start NF
            let Some((r, c)) = self.zini_get_premium(&mut premiums, swap_r, swap_c, swap_r_c) else {
                self.nf_stage(&mut current_board, &mut zini_score, &mut path, &mut remaining, &mut changed_squares)?;
                break;
            };

            let current_square = current_board[r][c];

            match self.zini_click(&mut current_board, r, c, &mut remaining, &mut zini_score, &mut path, &mut changed_squares) {
                Ok(()) => {},
                Err(e) => {
                    self.error_printer( current_square, zini_score, &e);
                    println!("Final Path:");
                    self.path_printer(&path);
                    println!("\n\n");
                    println!("\n\nOriginal State:");
                    self.zini_premium_printer(&self.squares);
                    println!("\n\nFinal State:");
                    self.zini_premium_printer(&current_board);
                    return Err(format!("ZINI click failed: {}\nClick Count:{:#?}\n", e, zini_score));
                }
            }

            self.zini_update_premium(&mut premiums, &current_board, &changed_squares, swap_r, swap_c, swap_r_c)?;
            changed_squares.clear();

            if emergency_break > EMERGENCY_BREAK_LIMIT {
                eprintln!("Emergency break triggered!\n");

                self.error_printer(current_board[r][c], zini_score, "Emergency break triggered!");
                println!("Final Path:");
                self.path_printer(&path);
                println!("\n\n");
                println!("\n\nOriginal State:");
                self.zini_premium_printer(&self.squares);
                println!("\n\nFinal State:");
                self.zini_premium_printer(&current_board);
                return Err(format!("Emergency break triggered!\n{} clicks\n", zini_score));
            }
            emergency_break += 1;
        }

        if zini_score == 0 {
            eprintln!("\n******************\nZINI final score zero!");

            // fake last click, but its good enough
            self.error_printer(current_board[0][0], zini_score, "ZINI final score zero!");
            println!("Final Path:");
            self.path_printer(&path);
            println!("\n\n");
            println!("\n\nOriginal State:");
            self.zini_premium_printer(&self.squares);
            println!("\n\nFinal State:");
            self.zini_premium_printer(&current_board);

            return Err(format!("ZINI (Simple) failed miserably!\n"));
        }

        // println!("\n\nFinal State:");
        // self.zini_premium_printer(&current_board);

        Ok((zini_score, path))

    }

    /// # ZINI Final Initialization
    /// * Adjust premiums for openings
    /// * Applied after BFS
    pub fn zini_init_final(&mut self) -> Result<(), String> {

        if self.info.bbbv == 0 {
            return Err(format!("Board not initialized!"));    // cursed string
        }

        for opening in &self.openings_locations {
            for opening_square in &opening.squares_inner {     // never want it flagged, so setting it under the nf threshold is important
                self.squares[opening_square.0][opening_square.1].premium = -1;
            }
            for opening_square in &opening.squares_border {
                self.squares[opening_square.0][opening_square.1].premium += 1;    // +1 to treat the entire opening as 1 adjacent 3bv
            }
        }

        Ok(())
    }

    /// # ZINI Create Premiums & Remaining
    /// * Create initial premiums and remaining squares
    /// * Premiums use swapped row/col
    /// * Remainings are normal row/col
    pub fn zini_create_premiums(&mut self, swap_r: bool, swap_c: bool, swap_r_c: bool) -> [BTreeSet<(usize, usize)>; 8] {

        /* creating with vectors first for better performance than repeatedly inserting in a btreeset */
        let mut starting_premiums: [Vec<(usize, usize)>; 8] = std::array::from_fn(|_| Vec::with_capacity(self.width * self.height / 8));

        for r in 0..self.height {
            for c in 0..self.width {
                if self.squares[r][c].square_type != SquareType::Mine {
                    if self.squares[r][c].premium >= 0 {
                        starting_premiums[self.squares[r][c].premium as usize].push(swapper((r, c), swap_r, swap_c, swap_r_c, false))
                    }
                }
            }
        }

        let out_premiums: [BTreeSet<(usize, usize)>; 8] = starting_premiums.map(|vec| vec.into_iter().collect());

        out_premiums
    }

    /// # ZINI Update Premiums
    /// Tie-break options:
    /// * rows descending
    /// * columns descending
    /// * swap rows & columns
    pub fn zini_update_premium(
        &self,
        premiums: &mut [BTreeSet<(usize, usize)>; 8],
        zini_board: &Vec<Vec<Square>>,
        changed_squares: &FxHashMap<(usize, usize), i8>,
        swap_r: bool,
        swap_c: bool,
        swap_r_c: bool
    ) -> Result<(), String> {

        // TODO: new style
        for ((row, col), old_premium) in changed_squares {
            let square = &zini_board[*row][*col];
            let swapped_coords = swapper((*row, *col), swap_r, swap_c, swap_r_c, false);

            let new_premium = square.premium;
            if old_premium == &new_premium {
                continue;
            }

            //New idea - only store non-negative premiums
            if *old_premium >= 0 {
                premiums[*old_premium as usize].remove(&swapped_coords);
            }
            if new_premium >= 0 {
                premiums[new_premium as usize].insert(swapped_coords);
            }
        }

      Ok(())
    }

    /// # ZINI Get Premium
    /// * Get best premium from premiums
    pub fn zini_get_premium(&self, premiums: &mut [BTreeSet<(usize, usize)>], swap_r: bool, swap_c: bool, swap_r_c: bool) -> Option<(usize, usize)> {

        for btree in premiums.iter_mut().rev() {
            match btree.pop_first() {
                Some((r, c)) => {
                    return Some(swapper((r, c), swap_r, swap_c, swap_r_c, true));
                },
                None => {},
            }
        }

        return None;   // No premiums >= 0
    }

    /// # Zini Click
    /// * Basic logic to split up how a click is handled.
    /// * Anything under the threshold gets a left click (NF),
    /// * Otherwise it gets the flag & chord.
    pub fn zini_click(&self,
        zini_board: &mut Vec<Vec<Square>>,
        row: usize,
        col: usize,
        remaining: &mut u16,
        click_count: &mut u16,
        path: &mut Vec<ClickInfo>,
        changed_squares: &mut FxHashMap<(usize, usize), i8>
    ) -> Result<(), String> {

        // error checking
        let current_square = &zini_board[row][col];
        if current_square.square_type == SquareType::Mine {
            return Err(format!("Mine clicks (flags) are only supposed to happen during perform solve: {}, {}", row + 1, col + 1));
        }

        // flag solve
        if current_square.premium >= ZINI_NF_THRESHOLD
        && current_square.square_type != SquareType::Opening {
            match self.zini_perform_solve(zini_board, row, col, remaining, click_count, path, changed_squares) {
                Ok(()) => Ok(()),
                Err(e) => Err(format!("ZINI perform solve failed: {}", e)),
            }
        } else {    // NF solve
            *click_count += 1;
            path.push(ClickInfo {
                number: *click_count,
                square: *current_square,
                c_type: ClickType::NF,  /* TODO: better way to handle islands/openings in NF clicks? */
            });
            match self.zini_reveal_or_flag(zini_board, row, col, remaining, changed_squares) {
                Ok(()) => {},
                Err(e) => return Err(format!("ZINI reveal or flag failed: {}", e)),
            }
            Ok(())
        }
    }

    /// # ZINI Perform Solve
    /// * "perform solve" meaning flag all adjacent (unflagged) mines and then chord.
    pub fn zini_perform_solve(&self,
        zini_board: &mut Vec<Vec<Square>>,
        row: usize,
        col: usize,
        remaining: &mut u16,
        click_count: &mut u16,
        path: &mut Vec<ClickInfo>,
        changed_squares: &mut FxHashMap<(usize, usize), i8>,
    ) -> Result<(), String> {

        // error checking
        if zini_board[row][col].square_type == SquareType::Mine {
            return Err(format!("Something went horribly wrong.\nSolve attempted on a mine: {}, {}", row + 1, col + 1));
        }

        /* flag mines */
        for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
            if zini_board[adj_row][adj_col].square_type == SquareType::Mine
            && zini_board[adj_row][adj_col].square_status != SquareStatus::Clicked {
                *click_count += 1;
                path.push(ClickInfo {
                    number: *click_count,
                    square: zini_board[adj_row][adj_col],
                    c_type: ClickType::Flag,
                });
                self.zini_reveal_or_flag(zini_board, adj_row, adj_col, remaining, changed_squares)?;
            }
        }

        /* open the square if necessary */
        if zini_board[row][col].square_status != SquareStatus::Clicked {
            *click_count += 1;
            path.push(ClickInfo {
                number: *click_count,
                square: zini_board[row][col],
                c_type: ClickType::NF,
            });
            self.zini_reveal_or_flag(zini_board, row, col, remaining, changed_squares)?;
        }

        /* chord */
        *click_count += 1;
        path.push(ClickInfo {
            number: *click_count,
            square: zini_board[row][col],
            c_type: ClickType::Chord,
        });
        match self.zini_chord(zini_board, row, col, remaining, changed_squares) {
            Ok(()) => {},
            Err(e) => return Err(format!("ZINI chord failed: {}", e)),
        }

        Ok(())
    }

    /// # ZINI Chord
    /// ## Does **NOT** include flagging step.
    pub fn zini_chord(&self,
        zini_board: &mut Vec<Vec<Square>>,
        row: usize, col: usize,
        remaining: &mut u16,
        changed_squares: &mut FxHashMap<(usize, usize), i8>,
    ) -> Result<(), String> {

        // error handling
        let current_square = &mut zini_board[row][col];
        if current_square.square_status == SquareStatus::Unclicked {
            return Err(format!("Cannot chord on an unclicked square!: {}, {}", row + 1, col + 1));
        }

        let mut adjacent_mines = false;
        for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
            let adj_square = &zini_board[adj_row][adj_col];
            if adj_square.square_type == SquareType::Mine {
                adjacent_mines = true;

                if adj_square.square_status != SquareStatus::Clicked {
                    return Err(format!("Cannot chord: adjacent unflagged mine at {}, {}", adj_row + 1, adj_col + 1));
                }
            }
        }
        if !adjacent_mines {
            return Err(format!("Cannot chord: no adjacent mines at {}, {}", row + 1, col + 1));
        }

        // actual chording
        for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
            let adj_square = &zini_board[adj_row][adj_col];
            if adj_square.square_status != SquareStatus::Unclicked
            || adj_square.square_type == SquareType::Mine {
                continue;
            }

            match self.zini_reveal_or_flag(zini_board, adj_row, adj_col, remaining, changed_squares) {
                Ok(()) => {},
                Err(e) => return Err(format!("ZINI reveal or flag failed during chord on square: {}, {}\n{}", row + 1, col + 1, e)),
            }
        }

        let current_square = &mut zini_board[row][col];
        changed_squares.entry((row, col)).or_insert(current_square.premium);  // TODO: for removal from premiums
        current_square.square_status = SquareStatus::Clicked;
        current_square.premium = ZINI_MIN_PREMIUM;

        Ok(())
    }

    /// # ZINI Reveal or Flag
    /// * Update status of clicked square.
    /// * Update premium of all adjacent squares.
    /// * Mines being "clicked" means being flagged (right click).
    /// * Non-mines get revealed (left click).
    ///
    /// ## When Clicked:
    /// * Islands and Borders
    ///   * Get their own premium increased by 1.
    ///   * Openings get their own premium decreased to the minimum.
    ///
    /// * Mines
    ///   * Increase premium of adjacent squares by 1.
    /// 	* They go from unflagged (-1 penalty) to flagged (no penalty).
    ///
    /// * Islands
    ///   * Decrease premium of adjacent squares by 1.
    ///   * Slightly different from the original forum post details:
    ///     * Islands currently do not go from unclicked (-1) to clicked (no penalty).
    ///     * Islands do not have the -1 unclicked penalty, so therefore it does not need to be removed.
    ///
    /// * Borders
    ///   * Increase their own premium by 1,
    ///     * But only if revealed by a direct click instead of from an opening.
    ///   * Do not affect premium of adjacent squares.
    ///   * Borders are not considered to have 3bv.
    ///
    /// * Openings
    ///   * Must open all squares that are included in the opening.
    ///   * Opens borders along with zeroes.
    pub fn zini_reveal_or_flag(&self,
        zini_board: &mut Vec<Vec<Square>>,
        row: usize,
        col: usize,
        remaining: &mut u16,
        changed_squares: &mut FxHashMap<(usize, usize), i8>,
    ) -> Result<(), String> {

        // error handling
        if row >= self.height || col >= self.width {
            return Err(format!("Out of bounds click: {}, {}", row + 1, col + 1));
        }

        let current_square = &mut zini_board[row][col];
        if current_square.square_status == SquareStatus::Clicked {
            return Err(format!("Zini Square already clicked: {}, {}", row + 1, col + 1));
        }

        // actual click
        current_square.square_status = SquareStatus::Clicked;
        if current_square.square_type != SquareType::Mine && current_square.square_type != SquareType::Opening {
            //The conditions for if statement are for different reasons
            //Mines don't affect remaining squares as they get flagged
            //Openings do affect remaining squares, but are accounted for later
            *remaining -= 1;
            changed_squares.entry((row, col)).or_insert(current_square.premium);  // TODO: changed squares tracking
        }

        // handle individual cases
        match current_square.square_type {
            SquareType::Mine => {
                for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
                    let adj_square = &mut zini_board[adj_row][adj_col];
                    if adj_square.square_type == SquareType::Mine {
                        continue;
                    }
                    changed_squares.entry((adj_row, adj_col)).or_insert(adj_square.premium);
                    adj_square.premium += 1;  // TODO: changed squares tracking
                }
            },

            SquareType::Island => {
                // commented out for "llama style" premium where clicking an island does not give it a bonus (because it does not have the penalty)
                // current_square.premium += 1;

                for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
                    let adj_square = &mut zini_board[adj_row][adj_col];
                    if adj_square.square_type == SquareType::Mine {
                        continue;
                    }
                    changed_squares.entry((adj_row, adj_col)).or_insert(adj_square.premium);
                    adj_square.premium -= 1;  // TODO: changed squares tracking
                }
            },

            SquareType::Border => {
                current_square.premium += 1;
            },

            SquareType::Opening => {
                current_square.premium = ZINI_MIN_PREMIUM;
                let opening_id = self.openings_ids.get(&(row, col)).expect("all squares should have an id");
                let opening = self.openings_locations.get(*opening_id).expect("all opening ids should be in locations vec");

                for (inner_row, inner_col) in &opening.squares_inner {
                    let inner_square = &mut zini_board[*inner_row][*inner_col];
                    changed_squares.entry((*inner_row, *inner_col)).or_insert(inner_square.premium);  // TODO: for removal from premiums
                    inner_square.square_status = SquareStatus::Clicked;
                    inner_square.premium = ZINI_MIN_PREMIUM;
                    *remaining -= 1;
                }

                for (border_row, border_col) in &opening.squares_border {
                    let border_square = &mut zini_board[*border_row][*border_col];

                    changed_squares.entry((*border_row, *border_col)).or_insert(border_square.premium);
                    border_square.premium -= 1;   // "llama style" (remove the adjacent 3bv from the opening)

                    if border_square.square_status == SquareStatus::Clicked {
                        continue;
                    }
                    self.zini_reveal_or_flag(zini_board, *border_row, *border_col, remaining, changed_squares)?;
                }
            },
        }

        Ok(())
    }

    pub fn nf_stage(&self,
        zini_board: &mut Vec<Vec<Square>>,
        click_count: &mut u16,
        path: &mut Vec<ClickInfo>,
        remaining: &mut u16,
        changed_squares: &mut FxHashMap<(usize, usize), i8>
    ) -> Result<(), String> {

        for r in 0..self.height {
            for c in 0..self.width {
                let current_square = &zini_board[r][c];

                if current_square.square_status == SquareStatus::Clicked
                || current_square.square_type == SquareType::Border 
                || current_square.square_type == SquareType::Mine {
                    continue;
                }

                *click_count += 1;
                path.push(ClickInfo {
                    number: *click_count,
                    square: *current_square,
                    c_type: ClickType::NF,
                });
                // TODO: technically, it would give slightly faster performance to copy the parts from reveal_or_flag() that are specifically required, without the extra parts
                // the main reason to use this for now is to easily handle openings that will reveal all squares
                self.zini_reveal_or_flag(zini_board, r, c, remaining, changed_squares)?;
            }
        }

        Ok(())
    }

    /*
    TODO for zini_small
    Change "remaining" to just be a number instead of a set
    */

    /// # ZINI Algorithm for small boards.
    /// * this uses a full table scan to find the highest premium instead of btree's etc
    /// * tie_break_direction is based on the combination of swaps.
    /// * standard zini (top left) is (false, false, false)
    pub fn zini_small(&mut self, swap_r: bool, swap_c: bool, swap_r_c: bool) -> Result<(u16, Vec<ClickInfo>), String> {
        // TODO: add check if board initialized

        // TODO: change to time-based emergency brake
        let mut emergency_break = 0u32;
        const EMERGENCY_BREAK_LIMIT: u32 = 10_000;      /* u32 max: 4_294_967_296 */

        let mut current_board: Vec<Vec<Square>> = self.squares.clone();  // duplicating to keep the original unchanged for future iterations
        let mut zini_score = 0u16;
        let mut path: Vec<ClickInfo> = Vec::new();

        let mut remaining: u16 = self.width as u16 * self.height as u16 - self.mine_count as u16;

        while remaining > 0 {
            let Some((r, c)) = self.zini_get_premium_small(&current_board, swap_r, swap_c, swap_r_c) else {
                self.nf_stage_small(&mut current_board, &mut zini_score, &mut path, &mut remaining)?;
                break;
            };

            match self.zini_click_small(&mut current_board, r, c, &mut remaining, &mut zini_score, &mut path) {
                Ok(()) => {},
                Err(e) => {
                    //commented out cos remaining changed type
                    //self.error_printer(remaining, current_square, zini_score, &e);
                    println!("Final Path:");
                    self.path_printer(&path);
                    println!("\n\n");
                    println!("\n\nOriginal State:");
                    self.zini_premium_printer(&self.squares);
                    println!("\n\nFinal State:");
                    self.zini_premium_printer(&current_board);
                    return Err(format!("ZINI click failed: {}\nClick Count:{:#?}\n", e, zini_score));
                }
            }

            if emergency_break > EMERGENCY_BREAK_LIMIT {
                eprintln!("Emergency break triggered!\n");

                //commented out cos remaining changed type
                //self.error_printer(remaining, current_board[r][c], zini_score, "Emergency break triggered!");
                println!("Final Path:");
                self.path_printer(&path);
                println!("\n\n");
                println!("\n\nOriginal State:");
                self.zini_premium_printer(&self.squares);
                println!("\n\nFinal State:");
                self.zini_premium_printer(&current_board);
                return Err(format!("Emergency break triggered!\n{} clicks\n", zini_score));
            }
            emergency_break += 1;
        }

        if zini_score == 0 {
            eprintln!("\n******************\nZINI final score zero!");

            // fake last click, but its good enough
            //commented out cos remaining changed type
            //self.error_printer(remaining, current_board[0][0], zini_score, "ZINI final score zero!");
            println!("Final Path:");
            self.path_printer(&path);
            println!("\n\n");
            println!("\n\nOriginal State:");
            self.zini_premium_printer(&self.squares);
            println!("\n\nFinal State:");
            self.zini_premium_printer(&current_board);

            return Err(format!("ZINI (Simple) failed miserably!\n"));
        }

        // println!("\n\nFinal State:");
        // self.zini_premium_printer(&current_board);

        Ok((zini_score, path))

    }

    /// # ZINI Get Premium
    /// * Get best premium from premiums
    pub fn zini_get_premium_small(&self, zini_board: &Vec<Vec<Square>>, swap_r: bool, swap_c: bool, swap_r_c: bool) -> Option<(usize, usize)> {
        /*
            loop through normally
            but when premium is tied, compare it to tie break (whether it is top-lefter than current square)
         */

        let mut highest_premium_so_far = ZINI_NF_THRESHOLD; // = 0; Start off at 0 as we need to at minimum find a square with premium 0 in order to not do NF. 
        let mut lowest_tiebreak_so_far = (usize::MAX, usize::MAX); //Any square will beat this in the tiebreak
        let mut best_coords_so_far: Option<(usize, usize)> = None;

        for r in 0..self.height {
            for c in 0..self.width {
                let premium = zini_board[r][c].premium;

                if premium < highest_premium_so_far {
                    //Square is not an improvement
                    continue;
                }

                //Square has equal or better premium
                let tiebreak = swapper((r, c), swap_r, swap_c, swap_r_c, false);

                if premium > highest_premium_so_far {
                    //Square is a strict improvement on previous best premium
                    highest_premium_so_far = premium;
                    lowest_tiebreak_so_far = tiebreak;
                    best_coords_so_far = Some((r, c));
                    continue; //Improvement found, go to next loop
                }

                // premium == highest_premium_so_far, so compare tie break. Try find lowest first coord, and after that lowest second coord
                
                if tiebreak.0 > lowest_tiebreak_so_far.0 {
                    //Not an improvement
                    continue;
                }

                if tiebreak.0 < lowest_tiebreak_so_far.0 {
                    //Square is a strict improvement based on tied premium and first coord
                    highest_premium_so_far = premium;
                    lowest_tiebreak_so_far = tiebreak;
                    best_coords_so_far = Some((r, c));
                    continue; //Improvement found, go to next loop
                }

                // first coords are equal, check second coord
                if tiebreak.1 < lowest_tiebreak_so_far.1 {
                    //tied premium + first coord, but second coord is improvement
                    highest_premium_so_far = premium;
                    lowest_tiebreak_so_far = tiebreak;
                    best_coords_so_far = Some((r, c));
                }
            }
        }

        return best_coords_so_far;
    }

    /// # Zini Click
    /// * Basic logic to split up how a click is handled.
    /// * Anything under the threshold gets a left click (NF),
    /// * Otherwise it gets the flag & chord.
    pub fn zini_click_small(&self,
        zini_board: &mut Vec<Vec<Square>>,
        row: usize,
        col: usize,
        remaining: &mut u16,
        click_count: &mut u16,
        path: &mut Vec<ClickInfo>
    ) -> Result<(), String> {

        // error checking
        let current_square = &zini_board[row][col];
        if current_square.square_type == SquareType::Mine {
            return Err(format!("Mine clicks (flags) are only supposed to happen during perform solve: {}, {}", row + 1, col + 1));
        }

        // flag solve
        if current_square.premium >= ZINI_NF_THRESHOLD
        && current_square.square_type != SquareType::Opening {
            match self.zini_perform_solve_small(zini_board, row, col, remaining, click_count, path) {
                Ok(()) => Ok(()),
                Err(e) => Err(format!("ZINI perform solve failed: {}", e)),
            }
        } else {    // NF solve
            *click_count += 1;
            path.push(ClickInfo {
                number: *click_count,
                square: *current_square,
                c_type: ClickType::NF,  /* TODO: better way to handle islands/openings in NF clicks? */
            });
            match self.zini_reveal_or_flag_small(zini_board, row, col, remaining) {
                Ok(()) => {},
                Err(e) => return Err(format!("ZINI reveal or flag failed: {}", e)),
            }
            Ok(())
        }
    }

        /// # ZINI Perform Solve
    /// * "perform solve" meaning flag all adjacent (unflagged) mines and then chord.
    pub fn zini_perform_solve_small(&self,
        zini_board: &mut Vec<Vec<Square>>,
        row: usize,
        col: usize,
        remaining: &mut u16,
        click_count: &mut u16,
        path: &mut Vec<ClickInfo>,
    ) -> Result<(), String> {

        // error checking
        if zini_board[row][col].square_type == SquareType::Mine {
            return Err(format!("Something went horribly wrong.\nSolve attempted on a mine: {}, {}", row + 1, col + 1));
        }

        /* flag mines */
        for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
            if zini_board[adj_row][adj_col].square_type == SquareType::Mine
            && zini_board[adj_row][adj_col].square_status != SquareStatus::Clicked {
                *click_count += 1;
                path.push(ClickInfo {
                    number: *click_count,
                    square: zini_board[adj_row][adj_col],
                    c_type: ClickType::Flag,
                });
                self.zini_reveal_or_flag_small(zini_board, adj_row, adj_col, remaining)?;
            }
        }

        /* open the square if necessary */
        if zini_board[row][col].square_status != SquareStatus::Clicked {
            *click_count += 1;
            path.push(ClickInfo {
                number: *click_count,
                square: zini_board[row][col],
                c_type: ClickType::NF,
            });
            self.zini_reveal_or_flag_small(zini_board, row, col, remaining)?;
        }

        /* chord */
        *click_count += 1;
        path.push(ClickInfo {
            number: *click_count,
            square: zini_board[row][col],
            c_type: ClickType::Chord,
        });
        match self.zini_chord_small(zini_board, row, col, remaining) {
            Ok(()) => {},
            Err(e) => return Err(format!("ZINI chord failed: {}", e)),
        }

        Ok(())
    }

    /// # ZINI Chord
    /// ## Does **NOT** include flagging step.
    pub fn zini_chord_small(&self,
        zini_board: &mut Vec<Vec<Square>>,
        row: usize, col: usize,
        remaining: &mut u16
    ) -> Result<(), String> {

        // error handling
        let current_square = &mut zini_board[row][col];
        if current_square.square_status == SquareStatus::Unclicked {
            return Err(format!("Cannot chord on an unclicked square!: {}, {}", row + 1, col + 1));
        }

        let mut adjacent_mines = false;
        for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
            let adj_square = &zini_board[adj_row][adj_col];
            if adj_square.square_type == SquareType::Mine {
                adjacent_mines = true;

                if adj_square.square_status != SquareStatus::Clicked {
                    return Err(format!("Cannot chord: adjacent unflagged mine at {}, {}", adj_row + 1, adj_col + 1));
                }
            }
        }
        if !adjacent_mines {
            return Err(format!("Cannot chord: no adjacent mines at {}, {}", row + 1, col + 1));
        }

        // actual chording
        for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
            let adj_square = &zini_board[adj_row][adj_col];
            if adj_square.square_status != SquareStatus::Unclicked
            || adj_square.square_type == SquareType::Mine {
                continue;
            }

            match self.zini_reveal_or_flag_small(zini_board, adj_row, adj_col, remaining) {
                Ok(()) => {},
                Err(e) => return Err(format!("ZINI reveal or flag failed during chord on square: {}, {}\n{}", row + 1, col + 1, e)),
            }
        }

        let current_square = &mut zini_board[row][col];
        current_square.square_status = SquareStatus::Clicked;
        current_square.premium = ZINI_MIN_PREMIUM;

        Ok(())
    }

    /// # ZINI Reveal or Flag
    /// * Update status of clicked square.
    /// * Update premium of all adjacent squares.
    /// * Mines being "clicked" means being flagged (right click).
    /// * Non-mines get revealed (left click).
    ///
    /// ## When Clicked:
    /// * Islands and Borders
    ///   * Get their own premium increased by 1.
    ///   * Openings get their own premium decreased to the minimum.
    ///
    /// * Mines
    ///   * Increase premium of adjacent squares by 1.
    /// 	* They go from unflagged (-1 penalty) to flagged (no penalty).
    ///
    /// * Islands
    ///   * Decrease premium of adjacent squares by 1.
    ///   * Slightly different from the original forum post details:
    ///     * Islands currently do not go from unclicked (-1) to clicked (no penalty).
    ///     * Islands do not have the -1 unclicked penalty, so therefore it does not need to be removed.
    ///
    /// * Borders
    ///   * Increase their own premium by 1,
    ///     * But only if revealed by a direct click instead of from an opening.
    ///   * Do not affect premium of adjacent squares.
    ///   * Borders are not considered to have 3bv.
    ///
    /// * Openings
    ///   * Must open all squares that are included in the opening.
    ///   * Opens borders along with zeroes.
    pub fn zini_reveal_or_flag_small(&self,
        zini_board: &mut Vec<Vec<Square>>,
        row: usize,
        col: usize,
        remaining: &mut u16,
    ) -> Result<(), String> {

        // error handling
        if row >= self.height || col >= self.width {
            return Err(format!("Out of bounds click: {}, {}", row + 1, col + 1));
        }

        let current_square = &mut zini_board[row][col];
        if current_square.square_status == SquareStatus::Clicked {
            return Err(format!("Zini Square already clicked: {}, {}", row + 1, col + 1));
        }

        // actual click
        current_square.square_status = SquareStatus::Clicked;
        if current_square.square_type != SquareType::Mine && current_square.square_type != SquareType::Opening {
            //The conditions for if statement are for different reasons
            //Mines don't affect remaining squares as they get flagged
            //Openings do affect remaining squares, but are accounted for later
            *remaining -= 1;
        }

        // handle individual cases
        match current_square.square_type {
            SquareType::Mine => {
                for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
                    let adj_square = &mut zini_board[adj_row][adj_col];
                    if adj_square.square_type == SquareType::Mine {
                        continue;
                    }
                    adj_square.premium += 1;  // TODO: changed squares tracking
                }
            },

            SquareType::Island => {
                // commented out for "llama style" premium where clicking an island does not give it a bonus (because it does not have the penalty)
                // current_square.premium += 1;

                for &(adj_row, adj_col) in &self.all_adjacents[row][col] {
                    let adj_square = &mut zini_board[adj_row][adj_col];
                    if adj_square.square_type == SquareType::Mine {
                        continue;
                    }
                    adj_square.premium -= 1;  // TODO: changed squares tracking
                }
            },

            SquareType::Border => {
                current_square.premium += 1;
            },

            SquareType::Opening => {
                current_square.premium = ZINI_MIN_PREMIUM;
                let opening_id = self.openings_ids.get(&(row, col)).expect("all squares should have an id");
                let opening = self.openings_locations.get(*opening_id).expect("all opening ids should be in locations vec");

                for (inner_row, inner_col) in &opening.squares_inner {
                    //Slightly pointless to process these as we never need to chord zero tiles...
                    let inner_square = &mut zini_board[*inner_row][*inner_col];
                    inner_square.square_status = SquareStatus::Clicked;
                    inner_square.premium = ZINI_MIN_PREMIUM;
                    *remaining -= 1;
                }

                for (border_row, border_col) in &opening.squares_border {
                    let border_square = &mut zini_board[*border_row][*border_col];

                    border_square.premium -= 1;   // "llama style" (remove the adjacent 3bv from the opening)

                    if border_square.square_status == SquareStatus::Clicked {
                        continue;
                    }
                    self.zini_reveal_or_flag_small(zini_board, *border_row, *border_col, remaining)?;
                }
            },
        }

        Ok(())
    }

    pub fn nf_stage_small(&self,
        zini_board: &mut Vec<Vec<Square>>,
        click_count: &mut u16,
        path: &mut Vec<ClickInfo>,
        remaining: &mut u16,
    ) -> Result<(), String> {

        for r in 0..self.height {
            for c in 0..self.width {
                let current_square = &zini_board[r][c];

                if current_square.square_status == SquareStatus::Clicked
                || current_square.square_type == SquareType::Border 
                || current_square.square_type == SquareType::Mine {
                    continue;
                }

                *click_count += 1;
                path.push(ClickInfo {
                    number: *click_count,
                    square: *current_square,
                    c_type: ClickType::NF,
                });
                // TODO: technically, it would give slightly faster performance to copy the parts from reveal_or_flag() that are specifically required, without the extra parts
                // the main reason to use this for now is to easily handle openings that will reveal all squares
                self.zini_reveal_or_flag_small(zini_board, r, c, remaining)?;
            }
        }

        Ok(())
    }

        /// # Calculate 8-way ZINI
    /// ### All 8 permutations for tie-break
    pub fn calculate_zini_8way_small(&mut self, print_score: bool) -> Result<u16, String> {

        if print_score {
            println!("\nStarting 8-Way ZINI... Good luck!");
        }

        // all permutations
        let eight_way: Vec<(bool, bool, bool)> = (0..8)
            .map(|i| (
                i & 1 != 0,      // bit 0
                i & 2 != 0,      // bit 1
                i & 4 != 0,      // bit 2
            ))
            .collect();

        let mut best_zini: u16 = u16::MAX;
        let mut best_path: Vec<ClickInfo> = Vec::new();
        let mut best_swaps: (bool, bool, bool) = (false, false, false);
        for (row_desc, col_desc, swap) in eight_way {
            match self.zini_small(row_desc, col_desc, swap) {
                Ok((zini_score, path)) => {
                    if zini_score < best_zini {
                        best_zini = zini_score;
                        best_path = path;
                        best_swaps = (row_desc, col_desc, swap);
                    }
                },
                Err(e) => {
                    eprintln!("8-Way ZINI failed: {}", e);
                    return Err(format!("8-Way ZINI failed: {}", e));
                }
            }
        }

        if print_score {
            println!("--------------Start Line--------------");
            println!("8-way ZINI Score: {}", best_zini);
            println!("8-way ZINI Swaps: {:?}", best_swaps);
            self.path_printer(&best_path);
            println!("8-way ZINI Score: {}", best_zini);
            println!("---------------End Line---------------");
        }

        self.info.zini = best_zini;

        Ok(best_zini)
    }

    /// # Generate Efficiency Board
    /// * Generates a single board
    /// * Returns bool true/false if it meets the target
    ///
    /// ***Important Note:*** Does not fully calculate zini, only checks enough to determine if target efficiency is met.
    pub fn generate_eff_board_small(&mut self, target_eff: f32, use_first_click: bool, first_click_row: usize, first_click_col: usize, opening: bool) -> Result<bool, String> {

        self.add_mines();

        if use_first_click {
            self.move_mine(first_click_row, first_click_col, opening);
        }

        self.initialize_all()?;
        let bbbv = self.info.bbbv as f32;

        // all permutations
        let eight_way: Vec<(bool, bool, bool)> = (0..8)
            .map(|i| (
                i & 1 != 0,      // bit 0
                i & 2 != 0,      // bit 1
                i & 4 != 0,      // bit 2
            ))
            .collect();

        let mut best_zini: u16 = u16::MAX;
        let mut current_eff_score: f32 = 0.0;
        let mut first_check = false;
        for (row_desc, col_desc, swap) in eight_way {
            match self.zini_small(row_desc, col_desc, swap) {
                Ok((zini_score, _path)) => {
                    if zini_score < best_zini {
                        best_zini = zini_score;
                    }
                },
                Err(e) => {
                    eprintln!("8-Way ZINI failed: {}", e);
                    return Err(format!("8-Way ZINI failed: {}", e));
                }
            }

            // exit early if target met
            current_eff_score = self.info.bbbv as f32 / (best_zini as f32);
            if current_eff_score >= target_eff {
                break;
            }

            // exit early if not close enough
            if !first_check {
                let zini = best_zini as f32;
                if bbbv / (bbbv - (bbbv - zini) * 1.15 - 2.0) < target_eff {
                    break;
                }
                first_check = true;
            }
        }

        self.info.zini = best_zini;

        Ok(current_eff_score >= target_eff)
    }

}

/// Printers
impl Board {
    /// # Info Printer
    /// (debug feature)
    /// * `normal_info` - print normal info (bbbv, openings, islands)
    /// * `full_board` - print the full board
    /// * `openings_mode` - print if a square is border, island, opening (full board required)
    /// * `premium_mode` - print zini premiums (full board required)
    pub fn info_printer(&self,
        normal_info: bool,
        full_board: bool,
        openings_mode: bool,
        premium_mode: bool) {

        if normal_info {
            println!("Board Info:");
            println!("BBBV: {}", self.info.bbbv);
            println!("ZINI: {}", self.info.zini);
            println!("Openings: {}", self.info.openings_count);
            println!("Islands: {}", self.info.islands_count);
        }

        if !full_board {    /* indentation control */
            return;
        }

        println!("\nFull Board:");
        if openings_mode {
            for row in &self.squares {
                for square in row {
                    print!("{}  ", square);
                }
                print!("\n");
                for square in row {
                    if square.square_type == SquareType::Border {
                        print!("b  ");
                    }
                    else if square.square_type == SquareType::Island {
                        print!("i  ");
                    }
                    else if square.square_type == SquareType::Opening {
                        print!("o  ");
                    }
                    else if square.square_type == SquareType::Mine {
                        print!("x  ");
                    } else {
                        print!(",  ");
                    }
                }
                print!("\n\n");
            }
        } else {
            for row in &self.squares {
                for square in row {
                    print!("{}  ", square);
                }
                print!("\n");
            }
        }

        if !premium_mode {
            return;
        }

        self.zini_premium_printer(&self.squares);

    }

    /// # Error Printer
    pub fn error_printer(&self, last_click: Square, click_count: u16, message: &str) {
        // important note: added +1 to match llamasweeper one-based
        eprintln!("\n***************\nError Info:\n{}\n", message);

        println!("\n");

        println!("\nLast Click: {}, {} (premium {})\n", last_click.row + 1, last_click.col + 1, last_click.premium);
        println!("Click Count:{:#?}\n", click_count);
        println!("URL: https://llamasweeper.com/#/game/zini-explorer{}", self.generate_pttacg());
    }

    /// # Path Printer
    pub fn path_printer(&self, path: &Vec<ClickInfo>) {
        // important note: added +1 to match llamasweeper one-based
        println!("\nPath Info:");
        for click in path {
            if click.c_type == ClickType::Flag {
                println!("Click #{:02}:\t({:02}, {:02})\tp:   \t {:?}", click.number, click.square.row + 1, click.square.col + 1, click.c_type);
            } else {
                println!("Click #{:02}:\t({:02}, {:02}) {}\tp: {:2}\t {:?}", click.number, click.square.row + 1, click.square.col + 1, click.square.square_type, click.square.premium, click.c_type);
            }
        }
        println!("\n");
    }

    pub fn zini_premium_printer(&self, zini_board: &Vec<Vec<Square>>) {
        println!("\nb = border\ni = island\no = opening\nx = mine\n* = completed\nf = flagged\n. = unclicked\nc = clicked");
        println!("\nZINI Premiums:\n");
        for row in 0..self.height {
            // top row print
            for col in 0..self.width {
                let square = &self.squares[row][col];
                print!("  {} ", square);
            }
            print!("\n");

            // second row print
            for col in 0..self.width {
                let square = &self.squares[row][col];
                if square.square_type == SquareType::Border {
                    print!("  b ");
                }
                else if square.square_type == SquareType::Island {
                    print!("  i ");
                }
                else if square.square_type == SquareType::Opening {
                    print!("  o ");
                }
                else if square.square_type == SquareType::Mine {
                    print!("  x ");
                } else {
                    print!("  , ");
                }
            }
            print!("\n");

            // third row print
            for col in 0..self.width {
                let square = zini_board[row][col];
                print!("{:3} ", square.premium);
            }
            print!("\n");

            // fourth row print
            for col in 0..self.width {
                let square = zini_board[row][col];
                if self.squares[row][col].square_type == SquareType::Mine {
                    if square.square_status == SquareStatus::Clicked {
                        print!("  f ");
                    } else {
                        print!("  x ");
                    }
                    continue;
                }
                match square.square_status {
                    SquareStatus::Clicked => print!("  c "),
                    SquareStatus::Unclicked => print!("  . ")
                }
            }
            print!("\n\n");
        }
        println!("\n\n");
    }

}

pub struct Profiler {
    times: FxHashMap<String, TimeEntry>
}

impl Profiler {
    pub fn build() -> Self {
        let times: FxHashMap<String, TimeEntry> = FxHashMap::default();

        Profiler { times }
    }

    pub fn register_timer(&mut self, time_name: &str) {
        self.times.entry(time_name.to_owned()).or_insert(TimeEntry { time: 0f64, instant: Instant::now(), running: false });
    }

    pub fn start_timer(&mut self, time_name: &str) {
        if let Some(val) = self.times.get_mut(time_name) {
            if !val.running {
                val.instant = Instant::now();
                val.running = true;
            }
        }
    }

    pub fn stop_timer(&mut self, time_name: &str) {
        if let Some(val) = self.times.get_mut(time_name) {
            if val.running {
                val.time += val.instant.elapsed().as_secs_f64();
                val.running = false;
            }
        }
    }

    pub fn stop_all_and_display (&mut self) {
        for (time_name, val) in &mut self.times {
            if val.running {
                val.time += val.instant.elapsed().as_secs_f64();
                val.running = false;
            }

            println!("[profile] {time_name} : {}s", val.time);
        }
    }

    pub fn get_timer (&mut self, time_name: &str) -> f64 {
        match self.times.get_mut(time_name) {
            Some(val) => {
                val.time
            },
            None => {
                0f64
            }
        }
    }
}

struct TimeEntry {
    time: f64,
    instant: Instant,
    running: bool
}