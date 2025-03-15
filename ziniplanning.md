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

Need to come up with faster way to do things
How about - for each square, have "expansionChainsIds" which are based on what squares a chain touches
and if a square gains/loses this, then its premium will update. Really need an object for each square -
{
floatingChainIdNeighbours: new Set(), //2, 3, 7 etc
fixedChainIdNeighbours: new Set(), //1, 5
smotheredChainIdNeighbours: new Set(), //8, 7 etc
}

Arrays can be faster than sets for small data sizes

Currently -
chording any op edge (even if it is already revealed) always causes whole op edge premiums to be recomputed
and this uses extremely inefficient n^2 alg

Maybe we need a map neighbours data structure as well
Since we can use the 2d array with the sets to figure out stuff
But then when merging chains, we don't know where neighbours are, so need to use that

When merging chains, try keep the largest chain as the base?

Is computing chainNeighbours (property of chainSquareInfo) slow?
Probably...

chainNeighbourhoodGrid (name for new property)

Once you have a fixed neighbour, you always have a fixed neighbour...

Does using array.filter unnecessarily slow us down? Replace with for loop where relevant?
In particular in updatingPremiums function

Beware of what chainNeighbourhoodGrid values are for squares that have been chorded

How often do chain merges happen?

Can we make some of the chainNeighbour stuff into a function

For fixed seed chain merging, we have the problem of deciding which chain is the base
One way to do this could be to track entire size of each chain
But a simpler way would be to tiebreak on path length (number of chords)

Benchmark everything
