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
