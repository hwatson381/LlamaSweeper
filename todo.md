Just some random things I need to do

Improve OthersPage to use masonary layout instead of grid
Move project files over to WSL2 (this is needed for hot-reload to work?)

stuff for play page:
implement zini alg
have board-history for exploring past replays (and replays of same game get grouped up)

Use setters and getters for tilesArray (formerly called revealedNumbers). Like setTileState(x, y, newState) and setTileDepressed(x, y, true)

Fix lag on large boards (maybe have canvas draw() that doesn't refresh whole board and only redraws the relevant area?)

Make unfocus a function and call it from all various inputs (where sensible?)

Be careful with setTimeouts to not have loads of them running at the same time...
Remove on component unmount?

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

zini idea: Simulated annealing zini where we randomise priorities/premium adjustments to find neighbour solutions

Be more consistent with using this.variant vs variant.value in Board class.

hide quickpaint button when board editor is in edit mode?

Can we change gameStage to be a ref?

Can I do anything with mutually exclusive mine group theory? See discord message from 195 guy 17/01/2025

For zini - is there a way to analyse benefit of flags? Flag premiums? Some measure of how reusable flags are?

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

Have page with zini benchmarks on diff sizes (beg/int/exp) and comparison to 1-way zini (similar to data I sent Janitor)

Beware of provably "never chords" coming up during inclusion-exclusion zini

- it suffers if there is a group of similar moves that can't be easily disambiguated
  (e.g. we could exclude one chord, but don't spot it's bad because another chord does the same thing)

For inclusion-exclusion zini, allow taking multiple moves at the same time as long as regions of influence are disjoint
(may need a minimum gap inbetween)

Figure out whether using old zini check or new zini check is faster (and also how effective it is)
Beware that high eff games are extraordinary, so may need to use higher cutoff than 99%

Make a fun 404 page?
Background could be a minesweeper grid from an incomplete game (so lots of flagged squares, and some unflagged squares)
404 page not found = mine not found?

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

zini idea - do initial inclusion-exclusion analysis. And then when playing, we try to
do the following: play near solved stuff/edge of board. And we also treat areas that are
never flags/always nf click as also being like the edge of the board. This is because
those regions are quite fixed.

For mean openings, is it possible to be generous with chords (e.g. not requiring mean squares to all be flagged?). Maybe allow this if within 0.5s using the shield setting?

Is it worth making an online repo for very high eff boards (this can then be pulled from instead of generating on client?)

Interesting sub ptta example
https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/?b=2&m=000000000000000000000000000000000000000000mmg80854k0
Relies on greedy rule failing.

Would there be any reason to deprioritise clicks saves that come from chain merge rather than normal?
Possibly, but seems complicated and both categories of click save have possiblity of being "invalidated" later

What else is needed for release? Just replay + click loss?
Can I clean up menus?
Should I include more zinis?
Do I try find some bugs to fix?
More zini explorer features?

click-loss implementation?
Should I have another array for analysis info (similar to clicks/moves)

Replay system can abuse scroll into view to follow clicks?

Allow having a different level of zoom for watching replays?

click loss replay? Have some sort of eval bar for how the 100-way zini changes after each click?
E.g. this could be the number of zini's that reach maximum value? Or maybe based on the average zini value?

tap edge of screen to scroll?

////////////////////

beware of triggering win extra stuff (e.g. win cond) from replays

Can the replay controls be a component?

Is it right to have -1 as a special value for click index stuff?

Break up board class using composition.
E.g. do stuff like the below to handling drawing logic
this.renderer = new Renderer(this); //for drawing logic
this.inputHandler = new InputHanlder(this); //for mouse/touch events
this.quickPaintHandler = new QuickpaintHandler(this); //for quickpaint stuff

Max achievable eff stat? This would only be for lost games - it would be the eff given that zini continues your game

alt icons for steppy:
stairs
sym_o_stairs_2
sym_o_steppers

Find a good way to show clicks (normal and wasted) on replays

replays start at end and highlight clicked/chorded squares (makes it easy to compare zini vs normal etc)

In a few places I use both v-model and @update:model-value
This is bad practise. Consider changing to :modelValue and @update:model-value

Would the replay be more accurate if it used the timeStamp property from events instead of performance.now()?

Gadget idea - hotkey to show coords by mouse when hovering square?
Better idea - show coords in all cells (in small font)

zini replay could show where the mines are?

coords on each cell that invert colours (so always readable?). Do excel style coords (alphabetical?)

Enable keyboard clicks?

Make a "llamasweeper - best features" video

Have a mobile scroll option, similar to scroll on zeros, but that includes non-unrevealed-safe bordering regions
This way it would work on the mean mines setting.
Maybe could be called something like "non-frontier scroll" or "enclosed-scroll"

Move replay stuff to separate file (may need some work to convert refs to dependencies)
Could having it in sep component work?

dumb idea - train neural network to assign premiums for zini?

Need to do option for letting through scrolling touch, or wasting it (if possible)

Have some sort of shield against accidental scrolls? E.g. don't scroll on openings revealed in last 0.5s?

Crazy refactoring
then basic click-loss replay

Replay bar is fiddly on mobile. Maybe make multiplier editable as a number (or have dropdown) by clicking the chip (box with 1.00x)

refactoring
need to split out drawing stuff into "drawHandler"

clean up for release
click loss replay
basic zini explorer stuff?
Or make progress with getting site live?

Is there some large scale hack we can do to prevent issues with buttons/toggle capturing spacebar?
Maybe using capture on event listener, and then preventing default based on value of activeElement?
Try useCapture = true and also calling stopPropagation (stopImmediate?)

The solution seems quite ugly since on some elements, spacebar does both actions (e.g. typing a space and reseting the board).

Maybe a better way is to find out how to individually disable spacebar on specific problem components?

Add quicker way to reset on mobile
Mobile reset button that appears on blast?
Option to reset based on amount of time passed, or perhaps quick reset for games with under 30% progress?

Should keydownhandler be on #q-app element instead of document.body?
