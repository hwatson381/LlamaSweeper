Just some random things I need to do

Improve OthersPage to use masonary layout instead of grid
Move project files over to WSL2 (this is needed for hot-reload to work?)

stuff for play page:
implement zini alg
add replays
have board-history for exploring past replays (and replays of same game get grouped up)

Change revealedNumbers stuff to be tiles[x][y] and then hide behind getters/setters. Like setTileState(x, y, newState) and setTileDepressed(x, y, true)

Look at mouseEvent.buttons to check whether the left button is depressed when hovering (fixes issues with left click down outside the window etc)

Fix lag on large boards (maybe have canvas draw() that doesn't refresh whole board and only redraws the relevant area?)

Make clicking top bar trigger a reset

Make unfocus a function and call it from all various inputs (where sensible?)

[IMPORTANT] Really need to do refactoring to pull startTime into Board from Game class

Be careful with setTimeouts to not have loads of them running at the same time...
Remove on component unmount?

Compare old version of effBoardShuffle to new version (performance-wise)?

Add support for generating effBoards in background

Include raw coords in BoardStats.clicks info

Implement womzini
