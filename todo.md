Just some random things I need to do

Improve OthersPage to use masonary layout instead of grid
Move project files over to WSL2 (this is needed for hot-reload to work?)

stuff for play page:
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

zini tiebreak idea: choose the chord that is closest to other stuff
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

Would there be any reason to deprioritise click saves that come from chain merge rather than normal?
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

Make a "llamasweeper - best features" video

dumb idea - train neural network to assign premiums for zini?

Have some sort of shield against accidental scrolls? E.g. don't scroll on openings revealed in last 0.5s?

Replay bar is fiddly on mobile. Maybe make multiplier editable as a number (or have dropdown) by clicking the chip (box with 1.00x)

refactoring
need to split out drawing stuff into "drawHandler"

Add quicker way to reset on mobile
Mobile reset button that appears on blast?
Option to reset based on amount of time passed, or perhaps quick reset for games with under 30% progress?

Should keydownhandler be on #q-app element instead of document.body?

8-way zini is too volatile? Though not worth implementing a better zini just yet.

[probably skip] Includes moves info in click-loss replay?

Small bug - wasted flags that lose the game get removed from click-loss replay

Have checkboxes for UPK, where we show transparent numbers during a game?
Or maybe even have "layer 1" UPK, where we only show transparent numbers that neighbour stuff?

Transparent tiles cause lag - is it just because of transparency, or could it be because they have large width/height?
Consider having small numbers in bottom right instead of doing transparency stuff?
Show "zero" as a number for transparent

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

Change opengraph image to the recommended size of 1200x630px
Consider improving preview image as well (can I do better than just logo?)

quickpaint in board editor doesn't clear on reset
(or am I just dumb?)

removing flags on zini explorer chain mode shouldn't break the whole chain

run button on zini explorer should show loading icon on eff% indicator

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
Bug - DeepChain also fails on this

Games with sub 2 ptt
https://minesweeper.online/game/4420379197 (passed)
https://minesweeper.online/game/4420447902 (passed)
https://minesweeper.online/game/2871936290 (passed)
https://minesweeper.online/game/4311671757 (passed)

Probably not worth doing - have equivalent to safeNeighbours property which also excludes zeros

Show mine density next to custom size picker?

Should ChainZini.convertClickPathToChainInput also give other output such as chainSquareInfo

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

Need to have dialogue for params (batch size (currently 50) and number of zini iterations to finish with)

Does there need to be a setting for click volume? Probably not.

Consider using different tap sounds?
Maybe mp3 is laggy and better to use wav?
Or try to find something EXTREMELY short to avoid overlap issue.
Or edit current sound to be shorter (only if dead space at end)
Or have a noise for "cancelled touch"

Try 0.5 gain to stop sound overlaps from clipping?

Are sounds robust to changing tba [tab?] and changing make [mode?] (since this kills and re-runs the vue component)
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

need to do stuff for bulk testing
Maybe collect boards where zini is improvement on 8-way?
Or normalise for speed?

How often is 10 iteration separate deep chain better than 5 iteration?

How much should be saved in localStorage? E.g. specific settings for effBoards/mean openings?

Should space be remapped to play/pause on replay?

mini tasks:
Figure out pattern that it can't spot?
optimise algorithm speed. (prune chords that are "dominated" by other chords)

Highlight squares on "watch" in zini explorer

Consider moving the zini-replays in the "watch" menu into a popup menu

Make progress on "getConsiderableChordsImproved"

Should worker limit be changed to concurrency - 1?
https://stackoverflow.com/questions/72679437/re-use-web-workers-vs-closing-spawning-new-once
Relevant quote below
"Actually, as a rule of thumb, you should even never start more Workers than navigator.hardwareConcurrency - 1. Failing to do so, your Workers's concurrency would be done through task-switching instead of true parallelism, ant that would incur a significant performance penalty.""

What's needed for release?

Do we need to make it use multiple background workers?
Note - "separate" could either allow "deepIterations" to run parallel, or split considerable chords amongst workers. 1 worker would always be needed for managing workload
Need to make heavy use of async await
Should a worker be the coordinator? Or use main thread?

Investigate scroll options, e.g. scrolling to specific locations, or having scroll "snap" points
Should there be a threshold for only cancelling clicks when it scrolled more than x amount?
Also have options for restricting to vertical/horizontal zoom
and option for "no pinch zoom"

Multitouch seems to be buggy and randomly discard touches
Maybe these show up as cancelled touches?
Any way to control this behaviour?

Highlight squares on "watch" in zini explorer

Do I need more help documentation?

Check for semantic html. Run lighthouse report.

Look at making it so that zini explorer/board editor alter the URL

There is a slight problem with images taking a while to load.
Maybe show a message if board is invisible?
Or maybe try preload important images first?
Or signal that they should be cached?

Keyboard clicking on eff boards doesn't show depressed square

(trialing) Change lightmode blue text
https://quasar.dev/style/color-palette/

(trialing) Also include display settings in box

Have enter button as shortcut for submitting on some dialogs? E.g. DeepChain dialog?
[this has been done for input on ptt dialog]

Review excellent eff

Can we make clickPath query param even more compact by assuming each click is sensible (e.g. click on mine = flag and click on square = dig first time, chord second time)
A third way could be - convert x/y clicks to their number on the board (e.g. something like x \* width + y), and then figure out max bytes that uses and pack things tighter if there is more space. E.g. in beginner, each coord can be represented by a number 0-80 which is 7 bits per coord pair

DeepChain fails this :(
Similar, but smaller than other pattern that relies on greedy rule failing
https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/?b=93&m=dc014g

Maybe to do with left side bias?

VERY IMPORTANT:
Can the board be centred by default?

Path that beats deepChain zini (on real game) - from Potatoes, with improvement from master_hai
https://minesweeper.online/game/4634307343

For mscoach export -
See here https://github.com/DavidNHill/JSMinesweeper/blob/master/Minesweeper/client/Board.js#L745
In particular, the "isSolverFoundBomb" part

Get help on wasm gen for eff boards?

Allow specifying squares (or flags) to start open in board editor. Also make it possible to link to this (and go straight to play screen to prevent spoilers)

Make it possible to send to zini explorer with path from particular timestamp via replay?

Play noise on scroll cancel or other touch cancels to debug issues with ignored touches

Consider whether to add mineswifter, also https://minesweepe.rs

Small time save by getting fisher yates shuffle to terminate after first [number of mines] shuffles?

Sort out skins -
Delay showing until the current skin "main" and also replay + zini explorer skin are loaded
In this period, we will have other skins use the missing texture
Then let everything else load in at own pace.
Is this extendable? What if we add more modes that use more skins?
Have "priority" for loading images
Also default all textures to the missing one, and then update on load callback

Can canvas be made higher res?

```
canvas.width = width * window.devicePixelRatio;
canvas.height = height * window.devicePixelRatio;
canvas.style.width = width + 'px';
canvas.style.height = height + 'px';
```

Also look at https://stackoverflow.com/questions/41763580/svg-rendered-into-canvas-blurred-on-retina-display
css - image-rendering: pixelated;
or js - ctx.imageSmoothingEnabled = false;

Have stat whilst eff boards is playing for "live eff"

To consider - have page for curiosities (like minesweeper board museum stuff)

Need to have secondary callback for after images are loaded?
Or just spam refresh board each time...

Do a gif for installing bookmarklet

Add KeyHunter?

Does lack of mobile viewport hurt mobile performance?
Or maybe it's somehow the 1s time limit getting triggered?
Could that be shared between touches?
