Dark skin for the board

is there already a legend somehwere that defines what the highlighted cells are. I could deduce what the yellow and blue are but as a efficiency/zini noob it would be nice to have that defined somewhere
middle click to reset board?

I also think it would be nice to see information about how many boards its generating per second while finding eff boards

Set a LIMIT for the max eff of boards, so it's possible to find bad efficiency boards as well
Resume playing a blasted board

To consider, but only do if demand - make a split q-btn-dropdown on "new board" button for zini explorer for generating a random board.

To consider - could zini explorer be in a separate tab all on it's own

Option for advanced logic to be calculated in Quick paint, everything derivable

Have images in quickpaint help modal.

Do too many zini stats get shown by default? E.g. 8-way, 100chain, wom zini. People have to hunt to find minimum

Have setting for starting deepChain automatically when board finishes

Probably won't do - if I decrease my custom eff, it should continue to store any that are already there as they are guaranteed to be higher still, similarly with increasing eff

Would be nice if possible to have an undo? (For board editor, but also zini explorer)

Add eff boards mastery/win streak

Add setting for increase board storage limit on eff boards from 20

Small bug - clicking run button twice on deepChain dialog cancels it

Can the board be centred by default?

Improve human-ness of replay

Probably won't do - you could make a variation where you blast whenever you make a move that lowers the remaining achievable max eff

In the board editor, could we get a setting to toggle live stats when editing so you don't have to click play and fail for it to display them?

Should there me slight edge around board with touch-action: manipulation?

Basically harmless bug - when board is horizontally large, it touches right edge instead of having a small amount of padding as buffer

Replaying from timestamp is REALLY important

Do L+R chord

Toggle flag mode on opening (problematic as no semi-transparent flags)

Setting for 3bv limits?

Should expert default for eff boards be raised? (150% too low?)

Keyboard clicks don't register if not focussed

Rectangle select tool for board editor/zini explorer (drag around/copy paste mines)

Setting to allow drag clicking to place mines on board editor/llamasweeper

there is still no option to disable overshoot when scroll right?
(from Jeff) - but in general, have more options for customising scroll, such as scroll slop, scroll multiplier etc. Could be complicated as may need to implement my own scroll from scratch.

chatgpt suggests this
.scroll-area {
overscroll-behavior: contain; /_ Prevent scroll chaining (no bounce to parent) _/
scroll-snap-type: y mandatory;
}
.scroll-item {
scroll-snap-align: start;
}

Or using library such as
https://better-scroll.github.io/docs/en-US/
https://github.com/pbakaus/scroller

Also this

```
If your game doesn’t actually need the page to scroll — e.g. it just pans a game area — it’s often better to:

disable scrolling entirely (touch-action: none),

and implement camera movement or content drag inside a fixed <div> using transforms.

That way, your game never fights the browser’s inertial scroll.
```
