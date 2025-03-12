What's needed?

1d array of all squares

properties are
id
coords
neighbours
chord-neighbours

uhhh, just have 2d grid of squareInfo stuff

2d for flag states, revealedStates

2d for chainIds

Also array of "chainObjects" which goes other way

OrganisedPremiums2? Or can re-use?

priority grids

need to make sure to allow (but with care) chords with 0 premium that merge chains

Need to have a concept of an "unchorded chain" where it's just a seed
note that a seed can possibly be smothered

If we do premium adjustment stuff (e.g. as would be needed by simulated annealing approach), then note that organised premiums can instead be a single list instead of having maps for each numerical value and lists within.

There are some special cases which need extra attention
If solving from an initial state, then some seeds may be locked, which affects whether we can saved clicks with chord merge from them
Also if solving from an initial state, there may be some single click that get smothered. Care is needed again. Potentially these single clicks could be chorded to merge

How do we handle openings in chain zini?

Make random priority grid accept a seed (so that it can give consistent rng)

Is it possible that chain zini could miss a merge that saves a click because it wins the board before seeing it?
Note - this won't happen on inclusion/exclusion zini, and also will be rare as it must happen on a board with no nf clicks

When setting chainIds, how do we find the next one available? Need to track and pass this?
Could use Symbol() to get unique keys all the time?

Trick for faster premiums - if chainIds[x][y] !== null, then square was chorded so has premium = -1

Benchmark zini alg against Janitor's subzini games?

We may have missed that opening digs can be smothered.
This needs a lot of care

Do we update (chain) premiums for the correct squares?

Will updating chain premiums process become very slow when updating openings?
Speedup idea - we could cache which chord chains border openings? Instead of repeatedly checking same neighbours

Need way to convert solution to clicks array

Huge problem -
Very slow with openings, also unsure if we recompute premiums for the right squares after chain merge
