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

Include raw coords in BoardStats.clicks info

Implement womzini

Make algorithms class static

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

zini explorer could display results of initial inclusion-exclusion analysis:
Which chords increase/decrease zini. Which flags are never used?
Which chords have high "weirdness" - this is how often the chords appear in normal zini runs. Weird chords are likely to be ones that give subzini (provided they also decrease zini).

review subzini trick for generating eff boards (is there a better formula? e.g. subzini < 3bv/50 + 2)

multiple workers
womzini

option to use thrp instead of eff

remove unused comments and spammy console.logs

move code in paintObviousSquares into algorithms, so we have option of doing basic hint/logic type stuff in the future

dots dont stand out on top of 1s?
quickpaint button only shows during 'running' games? Or greys out?

consider asking qqwref for minesweeper c++ library to speed up eff boards generation (wasm)

tweak with window.dotMain = "black"; window.dotSecondary = "white";

check that code for reseting knowns is working

quickpaint disabling doesn't happen on face click (also might be too distracting? Or even laggy?)

Make some settings persist (e.g. QuickPaint preferences)

Do random zinis actually vary that much? They probably always do all the 1 chords first which are disjoint.
