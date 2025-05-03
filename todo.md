Just some random things I need to do

Improve OthersPage to use masonary layout instead of grid
Move project files over to WSL2 (this is needed for hot-reload to work?)

stuff for play page:
implement zini alg
have board-history for exploring past replays (and replays of same game get grouped up)

Use setters and getters for tilesArray (formerly called revealedNumbers). Like setTileState(x, y, newState) and setTileDepressed(x, y, true)

Fix lag on large boards (maybe have canvas draw() that doesn't refresh whole board and only redraws the relevant area?)

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
See here: https://stackoverflow.com/questions/26193667/css-positionfixed-mobile-zoom

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

Replay system can abuse scroll into view to follow clicks?

Allow having a different level of zoom for watching replays?

click loss replay? Have some sort of eval bar for how the 100-way zini changes after each click?
E.g. this could be the number of zini's that reach maximum value? Or maybe based on the average zini value?

tap edge of screen to scroll?

////////////////////

beware of triggering win extra stuff (e.g. win cond) from replays

Is it right to have -1 as a special value for click index stuff?

Break up board class using composition.
E.g. do stuff like the below to handling drawing logic
this.renderer = new Renderer(this); //for drawing logic
this.inputHandler = new InputHandler(this); //for mouse/touch events
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

coords on each cell that invert colours (so always readable?). Do excel style coords (alphabetical?)
ctx.globalCompositeOperation = "difference", and then use white font?
(I tried invert for premiums and it looked bad)

Enable keyboard clicks?

Make a "llamasweeper - best features" video

dumb idea - train neural network to assign premiums for zini?

Have some sort of shield against accidental scrolls? E.g. don't scroll on openings revealed in last 0.5s?

Replay bar is fiddly on mobile. Maybe make multiplier editable as a number (or have dropdown) by clicking the chip (box with 1.00x)

refactoring
need to split out drawing stuff into "drawHandler"

clean up for release
click loss replay
basic zini explorer stuff?
save some settings to client (such as tileSize)
implement chain merge zini, so that I can improve click-loss replay?

Add quicker way to reset on mobile
Mobile reset button that appears on blast?
Option to reset based on amount of time passed, or perhaps quick reset for games with under 30% progress?

Should keydownhandler be on #q-app element instead of document.body?

8-way zini is too volatile? Though not worth implementing a better zini just yet.

[probably skip] Includes moves info in click-loss replay?

Small bug - wasted flags that lose the game get removed from click-loss replay

Have checkboxes for UPK, where we show transparent numbers during a game?
Or maybe even have "layer 1" UPK, where we only show transparent numbers that neighbour stuff?

Trnasparent tiles cause lag - is it just because of transparency, or could it be because they have large width/height?
Consider having small numbers in bottom right instead of doing transparency stuff?
Show "zero" as a number for transparent

Continue to implement handleZiniExploreClick

Allow exporting to ptta from board editor/zini explorer

When changing edit board on analyse mode, we could try preserve openings when opening-click is overwritten
Though this is probably not worth the effort

Show which cells are 3bv? Overlaps too much with A-O-S clone?

Do I need the box behind premiums? (currently set-able with window.box = true)

Reduce maxwidth when drawing premiums? 1.5 x textScale never seems to be hit?

For "edit" mode (on board editor and zini explorer), maybe we should allow face-click, with a warning prompt?

Have button to return to previous mode (after clicking send-to button)

https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/?b=2&m=0000000000u00ag04402500l805201100ag03o00000000000000
Interesting pattern. Chain merge alone won't save us here.
It needs some lookahead, as the chord before chain merge doesn't get done because it doesn't
understand that there is 2-step click gain

https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/?b=2&m=0000000000u00ag04402100k8052018g08802k00u00000000000
Better pattern. Ptta fails this, whereas pure chain merge will spot it

Make it possible to watch replay from zini explorer?

Should dimmed exclude tile border? Probably
(Tried this and it didn't look as good)

Do we show closed mines or open mines with the "Mines" upk option
(doesn't matter)

Change opengraph image to the recommended size of 1200x630px
Consider improving preview image as well (can I do better than just logo?)

quickpaint in board editor doesn't clear on reset
(or am I just dumb?)

removing flags on zini explorer chain mode shouldn't break the whole chain

run button on zini explorer should show loading icon on eff% indicator

My variants page should have descriptions moved elsewhere (maybe hidden under help button?)

Different idea related to inc-ex zini:
Maybe once we have a candidate chord, we check all options around it before playing it
That is - all options where we exclude that chord and force a neighbour

For end of game stats, calc 100chain in worker to reduce endgame lag?

mini-tasks:
(done) Show chainPremiums in the "show premiums" dropdown on zini explorer
(done) Make use of 100Chain in click-loss-replay

Try Chrome performance tab profiler

Test stuff by making heavy duty function that checks every premium/rebuilds chainIds/chainMap/chainNeighbourhoodGrid every move?

Possible bug - scroll input doesn't get blocked when scrolling on number input?

Zini Explorer should make it more obvious when algorithm is running

Pregenerating priority grids for n-way chain can cause out-of-memory error

New bug:
[fixed] Floating smothering doesn't work when there isn't a base chain?
[fixed] Do we allow floating opening edge unchordedDig to be base chain?

validate against code that checks premium for every single square?
Also validate by looking for chainNeighbourGrids that don't exist in chainIds (and vice-versa)
Beware of chainID and chainNeighbourHood grid stuff being set on zero tiles

See if we can find 196% on this game? https://minesweeper.online/game/4415263702

(probably won't do) Click loss replay - deep red if a move loses 2 clicks? Similarly also have deep green for gaining 2?

[done] Do chainNeighbour optimisation

Bug - 100x100/600 hits error with exceeding call stack size

Games with sub 2 ptt
https://minesweeper.online/game/4420379197 (passed)
https://minesweeper.online/game/4420447902 (passed)
https://minesweeper.online/game/2871936290 (passed)
https://minesweeper.online/game/4311671757 (passed)

Probably not worth doing - have equivalent to safeNeighbours property which also excludes zeros

Show density next custom size picker?

Save settings to localStorage

Add click sounds

Try incEx zini with average instead of minimum

Should ChainZini.convertClickPathToChainInput also give other output such as chainSquareInfo

Have setting for doing "timing" run first, before running deepPremium

Minimum and average both need tiebreaks

Have warning for chainIterations > 100000 (use deepPremium instead)

It doesn't find 200% :(
Maybe average will have better luck?
Average is reallllly bad...
Maybe because average forbids too many moves?
Try without any forbids

We could also try comparing "average" to baselineAverage instead of average with exclusion?
Or can we do something better with minimums?
Like could there be some way to look at minimum for a run whilst comparing it against minimums of other runs? (Vague idea - not sure how put into words)

Having algorithms in separate tab is bad because we can't see the result?

Idea - count up how many zini-priorities a particular move is maximum for?

Consider using pure average instead of average benefit?

Can we re-introduce forbids?

Alternate UI idea for zini explore -
Maybe just have a "run" button. And then it shows a dialogue box where all settings can be configured

Need to collect games to benchmark against

Need to have dialogue for params (batch size (currently 50) and number of zini iterations to finish with)

Does there need to be a setting for click volume? Probably not.

Consider using different tap sounds?
Maybe mp3 is laggy and better to use wav?
Or try to find something EXTREMELY short to avoid overlap issue.
Or edit current sound to be shorter (only if dead space at end)
Or have a noise for "cancelled touch"

Try 0.5 gain to stop sound overlaps from clipping?

Are sounds robust to changing tba and changing make (since this kills and re-runs the vue component)
Do a pool of AudioBufferSourceNodes?
Use wavs?
Do I need to worry about sounds being suspended?
"If you want near-zero latency (e.g. per-frame sounds), consider using OscillatorNodes or even AudioWorklet (advanced)." (Chatgpt suggestion)

Grace period where recently revealed squares can't scroll
Option to lock scroll to horizontal or vertical

Improvement for reordering zini:
Use shortest path alg for showing clicks in an order that makes more sense
Rather than jumping about a lot.

https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/?b=1&m=00000000010000g80
Simple case that chain zini doesn't spot (from PTT's doc about his alg)

Do timing run stuff
Have more parameters for deep chain zini
Also have web worker

Harmless bug -
When doing the first click on eff boards, if you accidentally double click. Then it won't show the warning modal when it fails to generate. Likely because the second click dismisses the modal. Fix would be to remove backdrop click dismiss, but this is realllly minor.

Change minimum to use average tiebreak
and average to use minimum tiebreak (or instead switch to minimum after threshold?)

Todo:
test different analysis types (min/average/minThenAverage)
Also implement analysis that does single priority grid inclusion exclusion, but then repeats for different priority grids

Benchmark stuff by generating 20x20/72 boards with eff > 185%?

Change default scroll setting to enabled.
Consider whether to make max eff be based on all zini stats.

need to do stuff for bulk testing
Maybe collect boards where zini is improvement on 8-way?
Or normalise for speed?

How often is 10 iteration separate deep chain better than 5 iteration?

Add jswole website

How much should be saved in localStorage? E.g. specific settings for effBoards/mean openings?

Should space be remapped to play/pause on replay?

mini tasks:
Figure out pattern that it can't spot?
optimise algorithm speed. (prune chords that are "dominated" by other chords)

Highlight squares on "watch" in zini explorer

Make deepchain possible to run from board stats panel (could even run it in background?)
Make it run in background...

Implement lateCalcDeepChainZini and make sure statsObject.value.deepZini is correct

Consider moving the zini-replays in the "watch" menu into a popup menu

Make progress on "getConsiderableChordsImproved"

ChainSquareInfo (for reference)
isMine: false
number: null
is3bv: null
labelIfOpening: null
mineNeighbours: [],
safeNeighbours: [],
nonOpening3bvNeighbours: [],
openingsTouched: new Set(),
chainNeighbours: []

Should worker limit be changed to concurrency - 1?
https://stackoverflow.com/questions/72679437/re-use-web-workers-vs-closing-spawning-new-once
Relevant quote below
"Actually, as a rule of thumb, you should even never start more Workers than navigator.hardwareConcurrency - 1. Failing to do so, your Workers's concurrency would be done through task-switching instead of true parallelism, ant that would incur a significant performance penalty.""

What's needed for release?

Do we need to make it use multiple background workers?
Note - "separate" could either allow "deepIterations" to run parallel, or split considerable chords amongst workers. 1 worker would always be needed for managing workload
Need to make heavy use of async await
Should a worker be the coordinator? Or use main thread?

Clean up deepChain zini menu

Bug - board asked to check click path
