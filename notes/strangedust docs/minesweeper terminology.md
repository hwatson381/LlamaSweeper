# Important Minesweeper Terminology

### Cells
A cell (grid/board location) may be referred to as a square.

Opening a cell is also referred to as revealing the cell.
### Clicks
(Left/Right/Middle) Mouse button down: down & pressed mean the same thing.

(Left/Right/Middle) Mouse button up: up & release mean the same thing.

"Chord" click is when:
* the left & right mouse buttons are both held at the same time, 
    * and then either of the buttons are released, 
* while hovering over an opened cell.
A chord click has the effect of opening all the cells adjacent to the hovered cells, but 
* it requires enough adjacent flags to be at least equal to the number on the cell
* it will also activate if there are too many flags, which often results in a blast.

SuperClick (super click) means left click on opened square behaves as a chord without requiring the right mouse button; it is also commonly known as left click chord, or L-chord.
#### Wasted Clicks
A wasted click is any click that does not change the status of the board (no new cells are revealed, no flag is placed).

For example, after a numbered cell is revealed, you can left-click it as much as you want, and nothing will happen.  Those are all wasted clicks.
#### Click counts
* Click count is an important measure, with some very specific behaviour:
* Left click count is incremented on button up (release) event
  * important note: if the release event causes a chord click, it is counted as a chord, not as a left click.
* Right click count is incremented on button down (press) event if a flag is placed/removed, 
  * important note: if no flag is placed/removed, and the button down event eventually becomes part of a chord click, it is counted as part of the chord, not as a right click.
* Chord click count is incremented when either left or right mouse button is released
  * important note: both left and right mouse button MUST have been held down simultaneously prior to release (exception: super click).
#### Wasted Flags
A wasted flag is any flag that is placed, but never contributes to a successful chord.

A successful chord (reveals new cells) can occur at any time after the flag is placed, and will therefore make the flag become used (not wasted).
### Game status / Termination
Win is the standard term; occasionally, this may be referred to as completed.  The player has opened all of the (safe) cells on the board.

Loss is the same as blast (very common), or boom (less common).  The player has opened a cell that contains a mine.  Opening a mine (blast) means that the game is lost.

Unknown may also been referred to as other, or as "nonstandard".  This is when the game ends prematurely for various reasons, such as board reset, crash, etc.
### Playstyle
Flag: also referred to as "FL".  This means that at least 1 flag was used by the player.

No-Flag: also referred to as "NF".  This means that the player has so much skill that they do not need any flags, and they are a fun, cool person with lots of friends.
### Openings, Islands, and 3BV
#### Opening
An opening consists of a contiguous area of adjacent cells that:
* have a value of zero (no adjacent mines), AND
* the border cells, such that:
  * the border cells must be adjacent to one of the 0-value cells in the opening
  * the border cells have a value above 0 (at least one adjacent mine)
#### Island
An island consists of a contiguous area of adjacent cells that:
* all have a value above 0 (at least one adjacent mine)
* are not adjacent to any cells that have a value of 0 (no adjacent mines)
### 3BV
Island cells all individually contribute one point each towards the board's total 3BV.

Openings only contribute one point of 3BV for the entire opening.

The border cells of an opening are considered to not have 3BV.
* This is because the entire opening only requires 1 click to open all of its cells.
