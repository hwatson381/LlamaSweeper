Just some random things I need to do

Improve OthersPage to use masonary layout instead of grid
Move project files over to WSL2 (this is needed for hot-reload to work?)

stuff for play page:
implement zini alg
add replays
have board-history for exploring past replays (and replays of same game get grouped up)

Use setters and getters for tilesArray (formerly called revealedNumbers). Like setTileState(x, y, newState) and setTileDepressed(x, y, true)

Look at mouseEvent.buttons to check whether the left button is depressed when hovering (fixes issues with left click down outside the window etc)

Fix lag on large boards (maybe have canvas draw() that doesn't refresh whole board and only redraws the relevant area?)

Make unfocus a function and call it from all various inputs (where sensible?)

Be careful with setTimeouts to not have loads of them running at the same time...
Remove on component unmount?

Compare old version of effBoardShuffle to new version (performance-wise)?

Add support for generating effBoards in background

Include raw coords in BoardStats.clicks info

Implement womzini

Make algorithms class static

Does having two workers result in 2x speedup? See window.navigator.hardwareConcurrency

Have button that means you don't have to minecount for eff? It just flags all guaranteed flags.
and shows provisional minecount. Also lets you place "temp" flags? Maybe it marks up all red/green squares, similar to how someone would in paint. Also lets you place "provisional safe/mines" - orange/white. And lets you place "click dots" and clear these all out with button (each square can have up to 2 click-dots). And has click dot counter. Marking stay after playing moves except when squares are revealed coverring them

Undo button? Too similar to replay feature?

inclusion-exclusion zini:
For each chord on the board we will run 100 iterations of random chain link zini
with that chord either be forceably taken or forbidden

Then we can analyse the results - we can look at the random zinis produced by
including or excluding that chord. If it improves zini then it's good, if it worsens then it's bad.

To make this more stable we can run the random zinis using random priority grids.
We assign each square a priority and use that (in a similar way to OrganisedPremiums)
to tie break when there is a premium tie.

There are different ways we could make use of this.

We could run it repeatedly and each time choose the best chord.

Or we could run it at the start to figure out "never chords" and then use this info to
divide-and-conquer the board.

We could go further and instead of just including + excluding single chords, we could look at
the effects of including/excluding chainlets of chords
these chainlets would be 2 (or 3, though maybe ambitious) chords that neighbour eachother (like ptta wide moves)

review subzini trick for generating eff boards (is there a better formula? e.g. subzini < 3bv/50 + 2)

multiple workers
womzini

option to use thrp instead of eff

remove unused comments and spammy console.logs

move code in paintObviousSquares into algorithms, so we have option of doing basic hint/logic type stuff in the future

Have scroll wheel to cycle quick paint type

middle click to clear guesses and dots? How about: middle click first removes dots, and then doing it again removes guesses

middle click should also clear excess knowns?
dots dont stand out on top of 1s?
quickpaint button only shows during 'running' games? Or greys out?

consider asking qqwref for minesweeper c++ library to speed up eff boards generation (wasm)
