If we do premium adjustment stuff (e.g. as would be needed by simulated annealing approach), then note that organised premiums can instead be a single list instead of having maps for each numerical value and lists within.

Is it possible that chain zini could miss a merge that saves a click because it wins the board before seeing it?
Note - this won't happen on inclusion/exclusion zini, and also will be rare as it must happen on a board with no nf clicks

When setting chainIds, how do we find the next one available? Need to track and pass this?
Could use Symbol() to get unique keys all the time?

Benchmark zini alg against Janitor's subzini games?

Do we update (chain) premiums for the correct squares?

When merging chains, try keep the largest chain as the base?
Or as rough heuristic - compare length of "openingsTouched" for each chain

Is computing chainNeighbours (property of chainSquareInfo) slow?
Probably...

Beware of what chainNeighbourhoodGrid values are for squares that have been chorded

Can we make some of the chainNeighbour stuff into a function

For fixed seed chain merging, we have the problem of deciding which chain is the base
One way to do this could be to track entire size of each chain
But a simpler way would be to tiebreak on path length (number of chords)
Also simple - compare length of "openingsTouched" for each chain

Benchmark everything

Do we avoid calculating chainNeighbours at start due to slowness on large low density boards?
Or just don't do stat then?

Be VERY clear on what we do for path/seed of unchordedDigs

Show chainPremiums in the "show premiums" dropdown on zini explorer
Make use of 100Chain in click-loss-replay

There is a lookahead problem -
We can merge chains, but this doesn't happen often because the gain from merging is often locked behind a loss from getting close enough to merge.
Inclusion-exclusion zini would solve this slightly, but would end up being skewed by trying to work around merging rather than with it. Potentially we could do a chain-zini with single-lookahead.
This would be more costly and very complicated, but may be effective

Count how often chain merges happen?

Easier for bad chords to mess things up, so it probably is quite important to have squares we permanently forbid with inclusion-exclusion zini

Inclusion-exclusion quick mode?
Have cutoff based on deepPremiums. For example, we could do all moves with deepPremium >= 2. But before playing each move, we quickly double check it incase the other mvoes have brought it's value below 2.

///////////////////

Inc-ex zini.

Start off with - calculate all various properties
Also need to have a way to forbid a chord

Possible optimisation:
Check if chord is already "naturally" excluded if it doesn't show in any of the baseline grids

Inclusion-Exclusion meta heuristic
What do we do if all moves become "worse" on average?
Do we start forbidding stuff?
Or run 10,000 chain zini?
Or switch to using minimum instead of average?
We probably should restrict average to picking moves with non-negative benefit at very least...

Have adaptive algorithm that tries to find best move, but also takes into account variance to figure out how many zinis to do before before being sure that one move is better than another

Maybe use average at start and then switch to minimum?
If a move has good average but is negative for some priorities, then try to avoid it
Maybe switch to minimum where average is close to baseline (e.g. only 0.5 or smaller improvement)

For average zini
https://minesweeper.online/game/4420379197
(fails)
https://minesweeper.online/game/4420447902
(pass)
https://minesweeper.online/game/2871936290
(pass)
https://minesweeper.online/game/4311671757
(pass)

Try to construct pattern that it can never find

Idea:
What about running deepChain but with single priority grid that is different each time?
The advantage is that each priority grid gets fully used
Since in "minimum mode" we end up ignoring lots of different priority grids

Minimum mode seems to have a tendency to solve from left to right?

Figure out which moves can be trivially removed from considerables, or even added to forbid list
E.g. moves that will always be NF clicks.
Improvement idea -
When we have closed off sections, these can be considered in a smart way?
E.g. normally we loop through all considerable chords before making a move
But for closed off stuff, we could instead just loop through those

Alternate zini idea:
Aggregate up all solutions with lowest clicks, and mark which chords belong to them. Then do same for next lowest and so on.

Benchmark deepChain on top 10 int boards

Alternate meta-alg for deepChain -
We could start with a single priority grid
But if we find all moves are unable to give an improvement, we start trying different priority grids
(probably not worth doing this)

Another idea for deepChain:
Just do lots of runs with 1 deepIteration and then find best

Exclude chords from considerable chords that only reveal a single square and don't merge anything?
Since equivalent to left click?

Some incEx testing:
https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/?b=2&m=2op8000009p4i40p0g94288s001g30g624088g002o980i015g90
min: 76 (BETTER THAN PTT)
avg: 77 (fails)
avg-then-min: 78 (bad)
separate: 76 (woohoo)

Other board
https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/?b=2020&m=240002000202cguh00c0h40o2q120290944431010gc088050g18016002064g40g80g008090j0h1h0
ptta gets 92
min: 91 (better than ptta)
avg: 91
avgthenmin: 91

Test against this board
https://minesweeper.online/game/4490265784
Initial results:
ptt - 138
min (1 iteration) - 137
separate - 136
