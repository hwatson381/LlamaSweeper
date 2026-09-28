# Minesweeper Technical Terminology

## 1. The Board

### Board
The 2-dimensional grid of cells that the player plays on. 

Defined by its width (columns), height (rows), and mine count.

### Cell
* Alternate names: Cell, Square, Tile, "Box" (very uncommon)
Each cell can have either a mine, a number, or nothing (equivalent to a zero number).

When the cell has a number, the number indicates the total amount of adjacent cells that contain a mine.  Adjacency includes diagonals.

#### Coordinates
Cell coordinates are inconsistent and not standardized.  People coming from a programming background will often prefer to use (row, column) with 0-based indexing, while people with a mathematical background typically prefer (x, y) with 1-based indexing.  

Neither is correct or incorrect, merely different choices; the most important thing is to be aware of which convention is being used, because there will be problems if they get mixed together unintentionally.

### Square Size
The size of each cell in pixels (default 16). 

Required to convert between pixel coordinates and cell coordinates. 

Some versions of Minesweeper support changeable square sizes, but many are fixed size at 16 pixels.

### Board Sizes
#### Standard Sizes
The three named sizes are Beginner, Intermediate, and Expert.
Beginner can be either 8x8 or 9x9, depending on the specific version of Minesweeper, but both sizes will have 10 mines.

| Level | Dimensions | Mines |
|-------|-----------|-------|
| Beginner | 8×8 or 9×9 | 10 |
| Intermediate | 16×16 | 40 |
| Expert | 30×16 | 99 |

#### Custom Sizes
Any board that does not match one of the four standard configurations. 

### Mine
* Alternate names: Mine, Bomb
A hidden hazard placed randomly on the board. 

During gameplay, mines are not visible to the player. 

Revealing a cell containing a mine causes a blast (loss).

### Adjacent Mines (Cell Value / Number)
The count of mines in the 8 cells surrounding a given cell (0–8). When a non-mine cell is opened, it reveals this number. Cells with an adjacent mine count of 0 are the basis for openings.


## 1.5 Game States

### Default State
The game starts with the timer set to 0 and all squares on the board in their unrevealed, unflagged state.

During this time, the player can place "pre-flags". 

After the first cell is revealed by the player, the timer starts and the game has begun.

Note 1: rarely, in some versions of Minesweeper, the timer may begin upon placing a pre-flag.

Note 2: In replays, the standard is to have the replay begin after the first left click reveals a cell, but some versions will start the recording of the replay when the first button press occurs, instead of waiting for the button release, even though the timer has not started yet.

### Game in Progress
The timer is incrementing, and the player is solving the board.

### Win
* Alternate names: Won, Completed
The win condition is for all non-mine cells to be revealed.

### Loss
* Alternate names: Loss, Blast, Explosion
If the player reveals a cell that contains a mine, the game is over and the player has lost.

The most common term for this is "Blast".

---

## 2. Cell States

### Closed
* Alternate names: Closed, Unrevealed, Hidden, Unclicked
A cell that has not yet been opened or flagged. 

The player cannot see whether it contains a mine.

### Revealed
* Alternate names: Revealed, Opened, Clicked, Uncovered
A cell that has been revealed by the player. 

If the cell has a number, it will be shown.

Revealing a mine causes a blast.

### Flagged
The player can right click to place a flag on a cell.  It is meant to represent a location that is known to contain a mine.

A flag placed on a cell which does not contain a mine is called a misflag.

If a numbered cell has enough flags placed on its adjacent cells, that numbered cell can be chorded.

A flagged cell cannot be opened by a left click.

### Question Mark
An optional cell state, that is generally un-used, but still maintained for historical accuracy.  By default, the vast majority of Minesweeper versions have question marks disabled.

After flagging a cell, a second right click will cycle the cell to a question mark (`?`) rather than back to unflagged. 

Question marks provide no mechanical function; they serve only as a visual annotation for the player. 

### Pressed
* Alternate names: Pressed, Depressed
A transient visual state.  Does not change the cell's actual state. Used for visual feedback only.

A cell that is currently being held down by the player's mouse button, but not yet released. 

### Blasted Cell
In the case of a blast (loss), this is the cell containing the mine that was opened. 

Displayed with a red background, instead of the normal gray background.

### Misflag
Alternate names: Misflag, Bad Flag
A flag placed, incorrectly, on a cell that does not contain a mine, revealed at the end of the game (on a loss).

Shown as a red `X` over the flag.

### Wasted Flag
A flag that was placed during the game, but was never used in a chord.

---

## 3. Cell Classification

### Opening
A contiguous region of cells consisting of both of the following:
- **Inner cells**
- **Border cells**

The entire opening (inner + border cells) will be revealed if the player reveals any of the cells in the inner region (zero cells). This is commonly referred to as a "cascade" or "flood-fill" to reveal the entire opening.

"An opening" refers to the entire group (both inner and border), even though only the inner cells will open the entire group of cells.

#### Inner Cell
Alternate names: Inner cell, zero cell, zero, opening cell.
A cell with an adjacent mine count of 0; part of the interior of an opening. 

#### Border Cell
A numbered cell (adjacent mine count `>= 1`) that is adjacent to at least one inner cell of an opening. 

It is possible for border cells to be part of multiple openings.

### Island
A contiguous group of cells where **all** cells: 
* have an adjacent mine count of `>= 1`, and
* are not adjacent to any zero-cell.

### Mined Cell
A cell containing a mine. 

### Floating Cell / Floating Tile
A closed cell that is **not adjacent to any revealed cell**. 

Floating cells are the "interior" of the unsolved area; the player has no direct information about them. 

All floating cells share the same mine probability, known as the **floating probability**.

---

## 4. Clicks and Mouse Input

### Left Mouse Button (LMB)
The primary action button. 

Used to reveal a single cell.

Also participates in chord clicks when combined with the right button.

### Right Mouse Button (RMB)
The secondary action button. 

Used to place and remove flags. 

Also participates in chord clicks.

### Middle Mouse Button (MMB)
An alternate chord trigger. 

A middle-click on an opened cell always acts as a chord, regardless of the current state of any other mouse button.

### Button Down
* Alternate names: Button down, button pressed, press
The event fired when a mouse button is physically depressed. 

Some actions (right click flag) are triggered on **press**.

### Button Up
* Alternate names: Button up, button released, release
The event fired when a held mouse button is physically released. 

Some actions (left click, chord) are triggered on **release**.

### Move Event
A mouse position update without any button state change. 

### Left Click
A left mouse button down followed by a left mouse button up, on a **closed** cell. 

The open action is performed on **release**. 

### Right Click
A right mouse button down on a closed or flagged cell. 

The flag toggle action is performed on **press**. 

"Flag toggle" means that a flag will either be placed or removed, depending on whether or not a flag is already placed.

### Chord Click
A click that opens all cells adjacent to the currently hovered **revealed** cell, subject to the following conditions:

1. Both the left **and** right mouse buttons must be held simultaneously (or middle button is pressed), **and**
2. The cursor must be hovering over a **revealed**, numbered cell, **and**
3. The revealed cell must have adjacent flags equal to its number.

The chord action executes when **either** held button is released (whichever is released first).

If the flag count **exceeds** the cell's number, the chord action will not execute.

### L-Chord
* Alternate names: LCC (Left Click Chord), Super Click
An alternative chording mechanism where a **left click alone** acts as a chord, without requiring the right mouse button to be held.

- When L-Chord is enabled, the standard L+R chord mechanism is completely disabled. The right mouse button then **only** toggles flags, regardless of whether the left button is held.
- Only available in programs that support the setting.

Note: In the original `rawvf` specification from 2009, this was listed as "SuperClick" in the cheats section.


---

## 5. Click Counting Rules

Click counting in minesweeper is very precise.  

This section explains the details for how each click type gets counted.

As a rule, the count is incremented regardless of the actual result.  For example, even if a click did not actually change anything, it is still counted towards the total amount of clicks.

### Left Click Count
Incremented on **left button up** (release),

**Exception:** when the release triggers a chord, it is counted as a chord, not a left click.

### Right Click Count
Incremented on **right button down** (press), **only if** the press places or removes a flag.

Examples:
- If no flag is toggled and the press eventually becomes part of a chord click, 
	- it is **not** counted as a right click (it is counted in the chord).
- If no flag is toggled and the press does **not** become part of a chord, 
	- it is counted as a right click.

### Chord Click Count
Incremented when either the left or right mouse button (or middle button) is released.  

**Important**: Both buttons MUST have been held simultaneously. 

Examples:
* If the sequence is: press L, then press R, then release L
	* that is a chord. 
* If the sequence is: press L, release L, then press R
	* those are separate left and right clicks, not a chord.
* If the sequence is: press R, release R, then press L, then press R, then release R
	* that is a right click followed by a chord. 


---

## 6. Click Effectiveness

### Effective Click
A click that **changes the state of the board**.

Examples: 
* Left-click to reveal a cell
* Right-click to place or remove a flag
* Chord-click to reveal several cells

### Wasted Click
A click that does **not** change the state of the board.  

In other words, any click that does not count as an "effective click".

Examples:
- Left-clicking a revealed cell
- Chord on an opened cell with the wrong number of flags
- Right-clicking a revealed, numbered cell

### Less Effective Click
A left click that reveals a **border cell** of an opening, when at least one **inner cell** of that same opening is already guaranteed to be safe (0% mine probability).

- The player could have safely clicked the inner cell instead, 
	- which would have revealed the entire opening in a single click.
- Uses only the player's available information (mine probabilities).
- A less-effective click never increases the current 3BV solved, 
	- because border cells do not contribute directly to 3BV score.

It is still an "effective" click, however it is not as effective as a click that would reveal the entire opening.

### Effective Left Click
A left click that revealed a cell.

### Effective Right Click
A right click that placed or removed a flag.

**Note**: removing a flag is sometimes thought of as "wasted" because it does not bring the board closer to being solved, but because "effective click" is defined as a click that changes the state of the board (regardless of completion level), it is not a "wasted" right click to remove a flag.

### Effective Chord Click
A chord click that revealed at least one cell.

---

## 7. Flags

### Flag
A marker placed on a closed cell by right-clicking.

Flags indicate suspected (or known via deduction) mine locations.

A cell must be flagged to be counted toward the chord on an adjacent numbered cell.

### Flag Count
The amount of flags currently placed on the board.

### Wasted Flag
A flag that was placed, but was **never** used in a successful chord.

### Toggling a Flag
The act of placing or removing a flag. 

A flag toggle is an effective right click.

### Pre-Flag
* Alternate names: Pre-flag, preflag
A flag placed **before the game timer starts** (before the player's first effective left click). 

Pre-flags are present on the board at the moment the timer begins.

Pre-flags do count towards the click count, as 1 right click each.

---

## 8. Game Timer and Time

### Game Timer
The official game clock. 

The timer begins on the **first left-click** (cell revealed). 

The timer stops when the game ends (win or lose).

The standard implementation is that pre-flags do not start the timer.

Note: some versions of Minesweeper do start the timer upon playing a pre-flag, but this is very uncommon and non-standard.

### Game Time / Time
The elapsed time from timer start to timer stop. 

Measured in milliseconds. 

Display is typically in seconds, but some versions will optionally show a single decimal place (tenths), or allow disabling the timer display, so that it will not distract the player.

---

## 9. Game Result / Termination

### Win
* Alternate names: Win, Completed, Solved
The game ends in a win when **all non-mine cells have been revealed**. 

### Loss
* Alternate names: Loss, Blast, Boom
The game ends in a loss if the player reveals a cell containing a mine.

The mine that was revealed is shown with a red background.

### Other
* Alternate names: Other, Unknown, Nonstandard
The game ended for a reason other than a win or loss. 

Common causes: board reset mid-game, program crash, incomplete recording.

---

## 10. Playstyle

### Flag
- Abbreviation: **FL**
The player placed **at least one flag** during the game. 

### No-Flag
- Abbreviation: **NF**
The player placed **zero flags** during the entire game. 

Note: NF play is widely regarded as a more difficult, more skilful, and more enjoyable way to play Minesweeper.

### Efficiency
* Abbreviation: Eff
A playstyle in which the goal is to have the highest `IOE` score possible.

In other words, the goal is to solve the board using the fewest clicks.

---

## 11. Difficulty Levels

Note: Sizes are `width` x `height`.
### Beginner
* Abbreviation: Beg
Size: 8x8 or 9x9
Mines: 10

### Intermediate
* Abbreviation: Int
Size: 16x16
Mines: 40

### Expert
* Abbreviation: Exp
Size: 30x16
Mines: 99

### Custom
Any other board size that is not Beginner, Intermediate, or Expert.

### Level Number
In some formulas, beginner, intermediate, and expert are assigned the numbers 1, 2, 3, respectively.

