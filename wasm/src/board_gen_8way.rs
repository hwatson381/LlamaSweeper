use std::{fmt, vec};
use std::collections::{HashMap, HashSet, VecDeque};
use std::cmp::{min, max};
use std::hash::Hash;
use rand::prelude::*;

const MAX_WIDTH: usize = 128;
const MAX_HEIGHT: usize = 128;
const ZINI_NF_THRESHOLD: i8 = 0;   /* threshold for zini premium to determine to NF click or not */
const ZINI_MIN_PREMIUM: i8 = -9;   /* arbitrary low value */

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

/// # Opening
/// Container struct for an "opening"
/// * Openings include the border and the "inner" (zero) squares
/// * Openings are considered to be one 3bv for the entire region
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Opening {
    pub squares_border: HashSet<(usize, usize)>,
    pub squares_inner: HashSet<(usize, usize)>,
}

impl Opening {
    pub fn new() -> Self {
        Opening {
            squares_border: HashSet::new(),
            squares_inner: HashSet::new(),
        }
    }

    pub fn reset(&mut self) {
        self.squares_border.clear();
        self.squares_inner.clear();
    }

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
/// * `Completed`: Finished, nothing left to do
/// * `Unclicked`: Not revealed
/// * `Clicked`: Revealed/Flagged
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SquareStatus {
    Completed,
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
    pub mine_locations: HashSet<(usize, usize)>,
    pub islands_locations: Vec<HashSet<(usize, usize)>>,
    pub openings_locations: Vec<Opening>,
    pub openings_ids: HashMap<(usize, usize), usize>,
    pub all_adjacents: HashMap<(usize, usize), Vec<(usize, usize)>>,
}

/// Main Section
impl Board {
    /// # New Board
    /// Creates empty, uninitialized board
    pub fn new(width: usize, height: usize, mine_count: usize) -> Result<Self, String> {
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

        let openings_ids: HashMap<(usize, usize), usize> = HashMap::with_capacity(width * height - mine_count);

        // pre-compute all adjacent locations.  
        // i dont know for certain if this is actually faster/better, but it seems good, because squares will definitely require multiple lookups.
        let mut all_adjacents = HashMap::with_capacity(width * height);
        for row in 0..height {
            for col in 0..width {
                let adjacent_cells = get_adjacent(row, col, height, width).map_err(|_| "Error generating adjacents")?;
                all_adjacents.insert((row, col), adjacent_cells);
            }
        }

        Ok(Board {
            squares,
            width,
            height,
            mine_count,
            info: BoardInfo::new(),
            mine_locations: HashSet::with_capacity(mine_count),
            openings_locations: Vec::new(),
            islands_locations: Vec::new(),
            openings_ids,
            all_adjacents,
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

        let mut board = Board::new(*width as usize, *height as usize, mine_count as usize)?;

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

        let mut mine_locations_vec:Vec<bool> = Vec::with_capacity(mine_locations_str.len());
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
        let mut board = Board::new(width, height, mine_count)?;

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
            result.push_str(&format!("?b={:<width$}{:<width$}&m=", self.width, self.height, width=str_width));
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
            let row = x / self.width;
            let col = x % self.width;
            if locations[x] {
                self.mine_locations.insert((row, col));
                self.squares[row][col].square_type = SquareType::Mine;
            }
        }
    }

    /// # Move Mine
    /// ### Handles the first click scenario of needing to move a mine
    /// * safe_row, safe_col: coordinates for first click
    /// * opening: guarantee an opening
    pub fn move_mine(&mut self, safe_row: usize, safe_col: usize, opening: bool) {

        let mut safe_squares = HashSet::from([(safe_row, safe_col)]);

        if opening {
            safe_squares.extend(self.all_adjacents.get(&(safe_row, safe_col)).expect("error during move mine (opening)"));
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
    pub fn initialize_squares(&mut self) {
        // number
        for (row, col) in &self.mine_locations {
            for (adj_row, adj_col) in self.all_adjacents.get(&(*row, *col)).expect("initialize square (numbers)") {
                self.squares[*adj_row][*adj_col].adjacent_mines += 1;
            }
        }

        // type & premium
        for row in 0..self.height {
            for col in 0..self.width {
                self.squares[row][col].row = row as u8;
                self.squares[row][col].col = col as u8;

                // mines go to minimum, mainly for debug purposes
                // also, the order matters and mines need to be first
                if self.squares[row][col].square_type == SquareType::Mine {
                    self.squares[row][col].premium = ZINI_MIN_PREMIUM;
                    continue;
                }

                // opening is default
                if self.squares[row][col].adjacent_mines == 0 {
                    continue;
                }

                // island or border.  the distinction is borders are adjacent to openings, islands are not
                self.squares[row][col].square_type = SquareType::Island;
                for (adj_row, adj_col) in self.all_adjacents.get(&(row, col)).expect("initialize square (adjacent to zero)") {
                    if self.squares[*adj_row][*adj_col].square_type != SquareType::Mine 
                    && self.squares[*adj_row][*adj_col].adjacent_mines == 0 {      // use adjacent_mines instead of square_type because squares haven't been fully assigned yet
                        self.squares[row][col].square_type = SquareType::Border;
                        break;
                    }
                }

                // premium
                self.squares[row][col].premium -= self.squares[row][col].adjacent_mines as i8;

                if self.squares[row][col].square_type == SquareType::Island {
                    self.squares[row][col].premium += 1;    // "llama style" offset the -1 "click to open penalty" (which is part of ZiniSquare::new())

                    // islands increase the adjacent 3bv of all their neighbors by 1
                    for (adj_row, adj_col) in self.all_adjacents.get(&(row, col)).expect("error during initialize squares (island)") {
                        if self.squares[*adj_row][*adj_col].square_type == SquareType::Mine {
                            continue;
                        } 
                        self.squares[*adj_row][*adj_col].premium += 1;    
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
        let mut visited: HashSet<(usize, usize)> = HashSet::with_capacity(self.width * self.height);
        visited.extend(self.mine_locations.iter().cloned());
        let mut opening_or_island: bool; // true = opening, false = island 

        // iterate all squares
        for row in 0..self.height {
            for col in 0..self.width {
                if visited.contains(&(row, col)) {
                    continue;
                }
                if self.squares[row][col].square_type == SquareType::Mine {
                    return Err("Mine found during BFS".into());     // mines are pre-added to visited
                }

                if self.squares[row][col].square_type == SquareType::Island {
                    opening_or_island = false;
                    self.info.islands_count += 1;
                } else if self.squares[row][col].square_type == SquareType::Opening {
                    opening_or_island = true;
                    self.info.openings_count += 1;
                } else if self.squares[row][col].square_type == SquareType::Border {
                    continue;   // skip because borders get handled by openings
                } else {
                    return Err(format!("Square is neither opening nor island\n{} {}\n{:#?}", row, col, self.squares[row][col]));
                }

                // BFS
                let mut queue: VecDeque<(usize, usize)> = VecDeque::new();
                let mut visiting: HashSet<(usize, usize)> = HashSet::new();  /* "local visited", because some squares need to be processed more than once */
                let mut current_island: HashSet<(usize, usize)> = HashSet::new();
                let mut current_opening = Opening::new();
                queue.push_back((row, col));

                // main loop
                while let Some((r, c)) = queue.pop_front() {
                    if visited.contains(&(r, c)) || visiting.contains(&(r, c)) {
                        continue;
                    }
                    visiting.insert((r, c));

                    if opening_or_island {      // process opening
                        if self.squares[r][c].square_type == SquareType::Opening {   
                            current_opening.squares_inner.insert((r, c));
                        } else if self.squares[r][c].square_type == SquareType::Border {
                            current_opening.squares_border.insert((r, c));
                            continue;
                        } else {
                            continue;
                        }
                    } else {                    // process island
                        if self.squares[r][c].square_type == SquareType::Island {
                            self.info.bbbv += 1;
                            current_island.insert((r, c));
                        } else {
                            continue;
                        }
                    }

                    for (adj_row, adj_col) in self.all_adjacents.get(&(r, c)).expect("Error During BFS") {
                        if visited.contains(&(*adj_row, *adj_col)) || visiting.contains(&(*adj_row, *adj_col)) {
                            continue;
                        }
                        queue.push_back((*adj_row, *adj_col));
                    }
                }

                /* while loop finished */
                if opening_or_island {
                    visited.extend(current_opening.squares_inner.iter());   // only inner, because borders can be part of multiple openings
                    self.openings_locations.push(current_opening);
                    self.info.bbbv += 1;   // each opening counts as 1 bbbv
                } else {
                    visited.extend(current_island.iter());
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
    pub fn generate_eff_board(&mut self, target_score: f32, use_first_click: bool, first_click_row: usize, first_click_col: usize, opening: bool) -> Result<bool, String> {

        self.add_mines();

        if use_first_click {
            self.move_mine(first_click_row, first_click_col, opening);
        }

        self.initialize_all()?;
        
        let current_zini = self.calculate_zini_8way(false)? as f32;
        let current_eff_score = self.info.bbbv as f32 / current_zini;

        Ok(current_eff_score >= target_score)
    }

    /// # Calculate 8-way ZINI
    /// ### All 8 permutations for tie-break
    /// (includes zini init)
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
        for (row_desc, col_desc, swap) in eight_way {
            match self.zini(row_desc, col_desc, swap) {
                Ok((zini_score, path)) => {
                    if zini_score < best_zini {
                        best_zini = zini_score;
                        best_path = path;
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
            self.path_printer(&best_path);
            println!("8-way ZINI Score: {}", best_zini);
            println!("---------------End Line---------------");
        }

        self.info.zini = best_zini;

        Ok(best_zini)
    }

    /// # ZINI Algorithm
    /// * tie_break_direction is based on the combination of row_desc, col_desc, and swap_row_col.
    /// * standard zini (top left) is (false, false, false)
    pub fn zini(&mut self, row_desc: bool, col_desc: bool, swap_row_col: bool) -> Result<(u16, Vec<ClickInfo>), String> {

        let mut emergency_break = 0u32;
        const EMERGENCY_BREAK_LIMIT: u32 = 1_000;      /* u32 max: 4_294_967_296 */

        let mut zini_score = 0u16;
        let mut path: Vec<ClickInfo> = Vec::new();
        let mut changed_squares: Vec<(usize, usize)> = Vec::with_capacity(self.width * self.height / 2);    // more than necessary almost always
        let mut remaining: HashSet<(usize, usize)> = HashSet::with_capacity(self.width * self.height - self.mine_count);
        let mut premiums: Vec<(usize, usize)> = Vec::with_capacity(self.width * self.height - self.mine_count);
        self.zini_create_premium_remain(&mut premiums, &mut remaining)?;
        
        let mut current_board: Vec<Vec<Square>> = self.squares.clone();  // the idea behind duplicating here is to keep the original for debug purposes

        while !remaining.is_empty() {
            self.zini_sort_premium(&mut premiums, &current_board, row_desc, col_desc, swap_row_col)?;
            let (r, c) = self.zini_get_premium(&premiums, &current_board)?;

            match self.zini_click(&mut current_board, r, c, &mut remaining, &mut zini_score, &mut path, &mut changed_squares) {
                Ok(()) => {},
                Err(e) => {
                    self.error_printer(remaining, current_board[r][c], zini_score, &e);
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

            self.zini_check_changed(&mut current_board, &mut changed_squares)?;
            changed_squares.clear();

            if emergency_break > EMERGENCY_BREAK_LIMIT {
                eprintln!("Emergency break triggered!\n");
            
                self.error_printer(remaining, current_board[r][c], zini_score, "Emergency break triggered!");
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
            self.error_printer(remaining, current_board[0][0], zini_score, "ZINI final score zero!");
            println!("Final Path:");
            self.path_printer(&path);
            println!("\n\n");
            println!("\n\nOriginal State:");
            self.zini_premium_printer(&self.squares);
            println!("\n\nFinal State:");
            self.zini_premium_printer(&current_board);

            return Err(format!("ZINI (Simple) failed miserably!\n"));
        }

        Ok((zini_score, path))

    }
    
    /// # ZINI Final Initialization
    /// * Adjust premiums for openings
    /// * Applied after BFS
    pub fn zini_init_final(&mut self) -> Result<(), String> {
      
        if self.info.bbbv == 0 {
            return Err(format!("Board not initialized!"));
        }

        for opening in &self.openings_locations {
            for opening_square in &opening.squares_inner {     // never want it flagged, so under the nf threshold is important
                self.squares[opening_square.0][opening_square.1].premium = -1; 
            }
            for opening_square in &opening.squares_border {
                self.squares[opening_square.0][opening_square.1].premium += 1;    // +1 to treat the entire opening as 1 adjacent 3bv
            }
        }

        Ok(())
    }

    pub fn zini_create_premium_remain(&mut self, premiums: &mut Vec<(usize, usize)>, remaining: &mut HashSet<(usize, usize)>) -> Result<(), String> {
        
        for row in 0..self.height {
            for col in 0..self.width {
                if self.squares[row][col].square_type != SquareType::Mine
                && self.squares[row][col].square_status != SquareStatus::Completed {
                    premiums.push((row, col));
                    remaining.insert((row, col));
                }
            }
        }

        if premiums.is_empty() {
            return Err(format!("No valid locations found during premium list creation"));
        }

        Ok(())
    }
    /// # ZINI Sort Premiums
    /// Tie-break options:
    /// * rows descending
    /// * columns descending
    /// * swap rows & columns
    pub fn zini_sort_premium(
        &self, 
        premiums: &mut Vec<(usize, usize)>, 
        zini_board: &Vec<Vec<Square>>, 
        row_desc: bool, 
        col_desc: bool, 
        swap_row_col: bool
    ) -> Result<(), String> {

      /* 
      a little crazy to read, 
      but basically this is just using the built-in sort (timsort), 
      and swapping the order of comparisons based on the parameters.
      the logic of which fields go in which order is defined on the structs.
      because the data is semi-sorted, the time complexity is very good.
      after sorting, the first element is the best premium.
      */

      premiums
          .sort_by(|&(r1, c1), &(r2, c2)| {
          let a = &zini_board[r1][c1];
          let b = &zini_board[r2][c2];
          
          a.cmp(&b)
              .then(
                  if !swap_row_col {
                      if !row_desc { r1.cmp(&r2) } else { r2.cmp(&r1) }
                      .then(if !col_desc { c1.cmp(&c2) } else { c2.cmp(&c1) })
                  } else {
                      if !col_desc { c1.cmp(&c2) } else { c2.cmp(&c1) }
                      .then(if !row_desc { r1.cmp(&r2) } else { r2.cmp(&r1) })
                  }
              )
          });

      Ok(())
}

    pub fn zini_get_premium(&self, premiums: &Vec<(usize, usize)>, zini_board: &Vec<Vec<Square>>) -> Result<(usize, usize), String> {
        
        for (r, c) in premiums {
            if zini_board[*r][*c].premium >= ZINI_NF_THRESHOLD {
                return Ok((*r, *c));
            } else {    // skips NF squares that are already revealed
                if zini_board[*r][*c].square_status == SquareStatus::Unclicked {
                    return Ok((*r, *c));
                }
            }
        }

        return Err(format!("No premium found"));
    } 

    /// # ZINI Find Completed (All)
    /// Check entire board
    /// * (Not currently used)
    pub fn zini_find_completed_all(&self, zini_board: &mut Vec<Vec<Square>>) -> Result<(), String> {

        for row in 0..self.height {
            for col in 0..self.width {
                if zini_board[row][col].square_type == SquareType::Mine 
                || zini_board[row][col].square_status == SquareStatus::Completed
                || zini_board[row][col].square_status == SquareStatus::Unclicked {
                    continue;
                }

                self.zini_check_completed(zini_board, row, col)?;
            }
        }

        Ok(())
    }

    /// # ZINI Check Completed
    /// Check single square
    fn zini_check_completed(&self, zini_board: &mut Vec<Vec<Square>>, row: usize, col: usize) -> Result<(), String> {
        // TODO: mines should be filtered out before getting here, but aren't
        if zini_board[row][col].square_type == SquareType::Mine {
            return Err(format!("Mines should not be checked: {}, {}", row + 1, col + 1));
        }
        let mut finished = true;
        for (adj_row, adj_col) in self.all_adjacents.get(&(row, col)).expect("error during check completed") {    
            if zini_board[*adj_row][*adj_col].square_type == SquareType::Mine 
            || zini_board[*adj_row][*adj_col].square_status == SquareStatus::Completed {
                continue;
            }
            if zini_board[*adj_row][*adj_col].square_status == SquareStatus::Unclicked {
                finished = false;
                break;
            }
        }
        if finished {
            zini_board[row][col].square_status = SquareStatus::Completed;
            zini_board[row][col].premium = ZINI_MIN_PREMIUM;
        }

        Ok(())
    }

    /// # ZINI Check Changed
    /// ### Check all changed squares for completion.
    /// When a square is changed, all adjacent squares are also changed and must be checked.
    pub fn zini_check_changed(&self, zini_board: &mut Vec<Vec<Square>>, changed_squares: &mut Vec<(usize, usize)>) -> Result<(), String> {
        let mut checked_squares: HashSet<(usize, usize)> = HashSet::new();
        let mut to_check: HashSet<(usize, usize)> = HashSet::with_capacity(changed_squares.capacity());

        for (row, col) in changed_squares {
            to_check.insert((*row, *col));
            for (adj_row, adj_col) in self.all_adjacents.get(&(*row, *col)).expect("error during check changed") {
                if zini_board[*adj_row][*adj_col].square_type == SquareType::Mine 
                || zini_board[*adj_row][*adj_col].square_status == SquareStatus::Completed
                || zini_board[*adj_row][*adj_col].square_status == SquareStatus::Unclicked 
                || checked_squares.contains(&(*adj_row, *adj_col)) {
                    continue;
                }
                to_check.insert((*adj_row, *adj_col));
            }
        }

        for (row, col) in to_check {
            if checked_squares.contains(&(row, col)) {
                continue;
            }
            checked_squares.insert((row, col));

            self.zini_check_completed(zini_board, row, col)?;
        }

        Ok(())
    }
    
    /// # Zini Click
    /// * Basic logic to split up how a click is handled.
    /// * Anything under the threshold gets a left click (NF),
    /// * Otherwise it gets the flag & chord.
    pub fn zini_click(&self, 
        zini_board: &mut Vec<Vec<Square>>, 
        row: usize, 
        col: usize, 
        remaining: &mut HashSet<(usize, usize)>, 
        click_count: &mut u16, 
        path: &mut Vec<ClickInfo>,
        changed_squares: &mut Vec<(usize, usize)>
    ) -> Result<(), String> {
        // error checking
        if zini_board[row][col].square_type == SquareType::Mine {
            return Err(format!("Mine clicks (flags) are only supposed to happen during perform solve: {}, {}", row + 1, col + 1));
        }
        if zini_board[row][col].square_status == SquareStatus::Completed {
            return Err(format!("Clicked on a completed square: {}, {}", row + 1, col + 1));
        }

        // flag solve
        if zini_board[row][col].premium >= ZINI_NF_THRESHOLD 
        && zini_board[row][col].square_type != SquareType::Opening {
            match self.zini_perform_solve(zini_board, row, col, remaining, click_count, path, changed_squares) {
                Ok(()) => Ok(()),
                Err(e) => Err(format!("ZINI perform solve failed: {}", e)),
            }
        } else {    // NF solve
            *click_count += 1;
            path.push(ClickInfo {
                number: *click_count,
                square: zini_board[row][col],
                c_type: ClickType::NF,
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
        remaining: &mut HashSet<(usize, usize)>, 
        click_count: &mut u16, 
        path: &mut Vec<ClickInfo>,
        changed_squares: &mut Vec<(usize, usize)>,
    ) -> Result<(), String> {
        // error checking
        if zini_board[row][col].square_type == SquareType::Mine {
            return Err(format!("Something went horribly wrong.\nSolve attempted on a mine: {}, {}", row + 1, col + 1));
        }
        if zini_board[row][col].square_status == SquareStatus::Completed {
            return Err(format!("Something went horribly wrong.\nSolve attempted on a completed square: {}, {}", row + 1, col + 1));
        }


        /* flag mines */
        for (adj_row, adj_col) in self.all_adjacents.get(&(row, col)).expect("error in zini perform solve") {
            if zini_board[*adj_row][*adj_col].square_type == SquareType::Mine
            && zini_board[*adj_row][*adj_col].square_status != SquareStatus::Clicked {
                *click_count += 1;
                path.push(ClickInfo {
                    number: *click_count,
                    square: zini_board[*adj_row][*adj_col],
                    c_type: ClickType::Flag,
                });
                self.zini_reveal_or_flag(zini_board, *adj_row, *adj_col, remaining, changed_squares)?;
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
        remaining: &mut HashSet<(usize, usize)>,
        changed_squares: &mut Vec<(usize, usize)>,
    ) -> Result<(), String> {

        // error handling
        if zini_board[row][col].square_status == SquareStatus::Unclicked {
            return Err(format!("Cannot chord on an unclicked square!: {}, {}", row + 1, col + 1));
        }
        if zini_board[row][col].square_status == SquareStatus::Completed {
            return Err(format!("Chord on a completed square!: {}, {}", row + 1, col + 1));
        }

        let mut adjacent_mines = false;
        for (adj_row, adj_col) in self.all_adjacents.get(&(row, col)).expect("error in zini chord") {
            if zini_board[*adj_row][*adj_col].square_type == SquareType::Mine {
                adjacent_mines = true;

                if zini_board[*adj_row][*adj_col].square_status != SquareStatus::Clicked {
                    return Err(format!("Cannot chord: adjacent unflagged mine at {}, {}", adj_row + 1, adj_col + 1));
                }
            }
        }
        if !adjacent_mines {
            return Err(format!("Cannot chord: no adjacent mines at {}, {}", row + 1, col + 1));
        }

        // actual chording
        for (adj_row, adj_col) in self.all_adjacents.get(&(row, col)).expect("error in zini chord") {
            if zini_board[*adj_row][*adj_col].square_status != SquareStatus::Unclicked
            || zini_board[*adj_row][*adj_col].square_type == SquareType::Mine {
                continue;
            }

            match self.zini_reveal_or_flag(zini_board, *adj_row, *adj_col, remaining, changed_squares) {
                Ok(()) => {},
                Err(e) => return Err(format!("ZINI reveal or flag failed during chord on square: {}, {}\n{}", row + 1, col + 1, e)),
            }
        }
        zini_board[row][col].square_status = SquareStatus::Completed;
        zini_board[row][col].premium = ZINI_MIN_PREMIUM;

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
        remaining: &mut HashSet<(usize, usize)>,
        changed_squares: &mut Vec<(usize, usize)>,
    ) -> Result<(), String> {

        // error handling
        if row >= self.height || col >= self.width {
            return Err(format!("Out of bounds click: {}, {}", row + 1, col + 1));
        }
        if zini_board[row][col].square_status == SquareStatus::Clicked {
            return Err(format!("Zini Square already clicked: {}, {}", row + 1, col + 1));
        }
        if zini_board[row][col].square_status == SquareStatus::Completed {
            return Err(format!("Zini Square already completed: {}, {}", row + 1, col + 1));
        }

        // actual click
        zini_board[row][col].square_status = SquareStatus::Clicked;
        if zini_board[row][col].square_type != SquareType::Mine {
            remaining.remove(&(row, col));
            changed_squares.push((row, col));
        }
        
        // handle individual cases
        match zini_board[row][col].square_type {
            SquareType::Mine => {
                for (adj_row, adj_col) in self.all_adjacents.get(&(row, col)).expect("error during zini click (mine)") {
                    if zini_board[*adj_row][*adj_col].square_type == SquareType::Mine {
                        continue;
                    }
                    zini_board[*adj_row][*adj_col].premium += 1;
                }
            },

            SquareType::Island => {
                // commented out for "llama style" premium where clicking an island does not give it a bonus (because it does not have the penalty)
                // zini_board[row][col].premium += 1;  

                for (adj_row, adj_col) in self.all_adjacents.get(&(row, col)).expect("error during zini click (island)") {
                    if zini_board[*adj_row][*adj_col].square_type == SquareType::Mine {
                        continue;
                    }
                    zini_board[*adj_row][*adj_col].premium -= 1;
                }
            },

            SquareType::Border => {
                zini_board[row][col].premium += 1;
            },

            SquareType::Opening => {
                zini_board[row][col].premium = ZINI_MIN_PREMIUM;

                let opening_id = self.openings_ids.get(&(row, col)).ok_or(format!("Opening ID not found for {}, {}", row + 1, col + 1))?;

                let opening = self.openings_locations.get(*opening_id).ok_or(format!("Opening not found for ID {}", opening_id))?;
                let border_squares = opening.squares_border.clone(); 
                let inner_squares = opening.squares_inner.clone();  /* cloning for recursive call */ // TODO: maybe there is a better way?

                for inner_square in inner_squares {
                    zini_board[inner_square.0][inner_square.1].square_status = SquareStatus::Completed;
                    zini_board[inner_square.0][inner_square.1].premium = ZINI_MIN_PREMIUM;
                    remaining.remove(&(inner_square.0, inner_square.1));
                }
                
                for border_square in border_squares {                    
                    // "llama style" version where opening borders indirectly doesn't improve their premium.
                    // negative one to offset the +1 during the reveal_or_flag(), for net no-change.
                    // alterate explanation: to remove the +1 adjacent 3bv bonus from the opening.
                    zini_board[border_square.0][border_square.1].premium -= 1;  

                    if zini_board[border_square.0][border_square.1].square_status == SquareStatus::Clicked 
                    || zini_board[border_square.0][border_square.1].square_status == SquareStatus::Completed {
                        continue;
                    }
                    self.zini_reveal_or_flag(zini_board, border_square.0, border_square.1, remaining, changed_squares)?;
                }
            },
        }

        Ok(())
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
    pub fn error_printer(&self, remaining: HashSet<(usize, usize)>, last_click: Square, click_count: u16, message: &str) {
        // important note: added +1 to match llamasweeper one-based
        eprintln!("\n***************\nError Info:\n{}\n", message);
        println!("\nFinal Remaining Squares:");
        for (row, col) in &remaining {
            println!("({}, {})", row + 1, col + 1);
        }
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
                if self.squares[row][col].square_type == SquareType::Mine {
                    if zini_board[row][col].square_status == SquareStatus::Clicked {
                        print!("  f ");
                    } else {
                        print!("  x ");
                    }
                    continue;
                }
                let square = zini_board[row][col];
                match square.square_status {
                    SquareStatus::Clicked => print!("  c "),
                    SquareStatus::Unclicked => print!("  . "),
                    SquareStatus::Completed => print!("  * "),
                }
            }
            print!("\n\n");
        }
        println!("\n\n");
    }
    
}