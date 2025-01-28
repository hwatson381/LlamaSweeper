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

option to use thrp instead of eff

remove unused comments and spammy console.logs

move code in paintObviousSquares into algorithms, so we have option of doing basic hint/logic type stuff in the future

consider asking qqwref for minesweeper c++ library to speed up eff boards generation (wasm)
Or find someone in the community discord willing to code a wasm zini?

Make some settings persist (e.g. QuickPaint preferences)

Do random zinis actually vary that much? They probably always do all the 1 chords first which are disjoint.

During inclusion-exclusion zini, try profile how much each chord affects the global solution (e.g. Which squares need to be recomputed depending on it's inclusion?)

Add freesweeper to others page?

make stuff that lets you edit boards and show what the path is that womzini took

zini idea: Simulated annealing zini where we randomise priorities/premium adjustments to find neighbour solutions

Be more consistent with using this.variant vs variant.value in Board class.

What do I need for board editor?

hide quickpaint button on edit mode?
maybe mode switch a toggle button (or similar)
import ptta button

Can we change gameStage to be a ref?

Can I do anything with mutally exclusive min group theory? See discord message from 195 guy 17/01/2025

Can I do early release for hc + cashew? Need planned features page?

For zini - is there a way to analyse benefit of flags? Flag premiums? Some measure of how reusable flags are?

and also have:
menu button for "watch"
with options for:
replay
8-way replay
womzini replay
womzini improved replay
click-loss replay (in future)

post game (or post zini run), do a click save heatmap showing the locations of where all the click saves were.
This may even be useful for doing a genetic zini algorithm where we breed solutions by "subtracting" heatmaps
from two different solutions and then this produces a child where the genes are taken by looking at which areas
one solution does better on and the other does worse at. In this case, the genes could be either a premium adjustment
or a priority adjustment (see random priority grid idea).

zini tiebreak idea: chose the chord that is closest to other stuff
(the reason would be that choosing stuff in the middle may have disadvantages that only get discovered later).
Note that random zini is bad at discovering global improvements that are very specific

Note example gets missed on ptt unless iterations is quite high
https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/?b=4005&m=vvvvvvvv000000010000000194i94i95vvvvvvvv

Have board editor do "something" when face is clicked (maybe just tell user to click edit/play toggle?)

Have page with zini benchmarks on diff sizes (beg/int/exp) and comparison to 1-way zini (similar to data I sent Janitor)

Need to have "toggle flag" button before early release

Beware of provably "never chords" coming up during inclusion-exclusion zini

- it suffers if there is a group of similar moves that can't be easily disambiguated
  (e.g. we could exclude one chord, but don't spot it's bad because another chord does the same thing)

For inclusion-exclusion zini, allow taking multiple moves at the same time as long as regions of influence are disjoint
(may need a minimum gap inbetween)

Figure out whether using old zini check or new zini check is faster (and also how effective it is)
Beware that high eff games are extraordinary, so may need to use higher cutoff than 99%

[fixed but needs testing] Wasted flags stat is incorrect. Flags on non-mine squares are always wasted. Unflags are always wasted.

Make a fun 404 page?

Maybe openings should annihilate flags instead of being blocked by them?

Count games tested in x amount of time for eff board gen (this is a way to check the speed improvements help)

Make first touch in pregame still open stuff even if it's a flag input? Easier to just reset flag mode for now...

Should mobile only depress squares for chords and not digs? This is how msgo does it.

Moving mouse with left click down quickly across large board could be slow cos each depressed square change requires redraw

Consider adding touchMove data to mobile replay (need to track multiple path segments as touches can be concurrent)

Consider having a mobile mode that disables mouse listeners?
Or have a global variable hittouchlistener that sets itself to true and then disables itself after the events have been processed. (We do the first, but could do the second instead. Or maybe look at pointer events instead of treating mouse/touch differently)

Sound effects (wooshes like msgo?)

Split todos into different large features with their own text files (e.g. mobile, zini, UI etc)

Try killing all active touches on board scroll? (Done not tested)

consider more options for handling board scroll

wom just has inital-scale without min/max.
I've removed maximum-scale=1, minimum-scale=1, . Needs testing. Works, but looks terrible. Oh well.

pointermove may be better than touch move as touchmove only triggers for ~10px movements

Have the flag-toggle track properly when zoomed in (is this even possible?)

Consider making topbar scrollable?
