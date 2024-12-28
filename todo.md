Just some random things I need to do

Improve OthersPage to use masonary layout instead of grid
Move project files over to WSL2 (this is needed for hot-reload to work?)

stuff for play page:
implement zini alg
add replays
have board-history for exploring past replays (and replays of same game get grouped up)
add proper border around board (and mine counter/timer?)

Change revealedNumbers stuff to be tiles[x][y] and then hide behind getters/setters. Like setTileState(x, y, newState) and setTileDepressed(x, y, true)

Look at mouseEvent.buttons to check whether the left button is depressed when hovering (fixes issues with left click down outside the window etc)

Benchmark my zini implementation against WoMs
Do more checks that it is correct

Mini zini benchmarks - tested on teamworm 100k (100x100/2184). My 8-way zini ran in 15s, and gave 2612 whereas WoM zini ran in 90s and gave 2618

Some errors here?
Uncaught TypeError: Cannot read properties of undefined (reading 'state')
at Board.attemptChordOrDig (PlayPage.vue:592:51)
[this line: typeof this.revealedNumbers[tileX][tileY].state === "number"]

For a single zini:
key: full-zini, timing: 0.3457999999523163s
PlayPage.vue:2054 key: find-highest-premium, timing: 0.3244999985694885s
PlayPage.vue:2054 key: click-and-update-premiums, timing: 0.01780000114440918s

So - definitely need to improve finding highest premium...

For a small board (exp) it is instead:
key: full-zini, timing: 0.004200000047683716s
PlayPage.vue:2026 key: find-highest-premium, timing: 0.0010999999046325684s
PlayPage.vue:2026 key: click-and-update-premiums, timing: 0.0010999996662139893s

Optimise basicZini to improve efficiency of finding highestPremium square (basically keep queues of premiums, and do binary search updates)

Fix lag on large boards (maybe have canvas draw() that doesn't refresh whole board and only redraws the relevant area?)

Implement effBoardShuffle function

Improve effBoardShuffle: Don't call algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings twice (for 3bv and zini)

Improve efficiency of effBoardsGen (maybe only try 1 direction of zini and then try other directions if it is close? This gives up to 8x improvement)

Have display setting for hiding border (maybe useful for mobile). Also hiding flag count and/or timer

Make clicking top bar trigger a reset

Make unfocus a function and call it from all various inputs (where sensible?)

Really need to do refactoring to pull startTime into Board from Game class
