# Project overview

LlamaSweeper is a website for minesweeper players, it's a small project that includes tools/features useful for practise or training specific skills that will be useful to advanced minesweeper players or players who want to improve.

The primary page is the variants page `src/pages/PlayPage.vue` which is where the tools/variants on the site live. It has the following variants (more may be added in the future):

- **Normal** Regular minesweeper.
- **Eff boards** This generates practise boards that have a high potential efficiency. Efficiency is a measure of how many clicks a game took to solve relative to the number of clicks it would take to solve with only using left clicks.
- **Board Editor** Create your own minesweeper configuration and play it.
- **ZiNi Explorer** This is a tool for working out how to complete a minesweeper board using the minimum number of clicks.
- **Mean Openings** Similar to regular minesweeper, except that openings will get randomly filled with mines when revealed (openings are the regions that get expanded automatically). Intended for practising minesweeper patterns with higher numbers

There are also a lot of quality of life features for advanced minesweeper players, including but not limited to:

- Board display settings
- Some customisation over controls such as chording method, keyboard clicks
- Lots of statistics, including ZiNi algorithms which calculate theoretical minimum clicks for a board
- Very strong mobile support and customisation
- A probability system and "QuickPaint" for annotating squares on the board
- Ability to watch back a replay of the most recent game played.
- Various export options

## tech stack

- Vue 3.4.18
- Quasar 2.16.0 (which is a vue framework)
- Rust compiled to WASM (in `/wasm` folder). Used for specific algorithms.
- mstoollib is used in specific cases for no guess generation and probabilities https://crates.io/crates/ms_toollib

## build notes

Refer to scripts in package.json. Note some have :js for skipping the wasm recompilation. The primary dev has an unusual configuration with the project sitting in windows, but the vscode terminal using a bash shell in WSL2, other contributors will naturally have different setups.

## project structure

Notable directories

- `/notes` messy personal notes on planned features, may be inaccurate.
- `/public` static files (primarily images) to be served without additional compilation
- `/src/assets` nothing particularly important in here
- `/src/classes` bulk of the javascript code. `Board.js` is a key file that includes many of the others
- `/src/components` vue components, the majority will be used on `PlayPage.vue`
- `/src/composables` vue composables, `useSettings.js` is a singleton module containing the majority of refs and saved localStorage settings
- `/src/css` global css
- `/src/includes` misc js files for including elsewhere
- `/src/layouts` vue layouts
- `/src/pages` vue pages. `PlayPage.vue` is the main one
- `/src/workers` scripts used in web workers
- `/wasm` rust code that compiles to WASM for specific cases

## Development preferences

- Prefer simple solutions over abstractions that are only useful once.
- Don't add dependencies unless there is a good reason.
- Prefer modifying existing code over creating parallel implementations.
- Avoid "enterprise" patterns unless they solve a real problem.
- Preserve existing behaviour unless the task explicitly requests a change.
- Ask before making large architectural changes.

## Important considerations

Some of the below considerations are with the idea in mind that a new aim trainer mode may be added, although they also apply generally.

- reuse existing functions where it makes sense
- detecting clicks must use the code from the handlePointerInput function unless there is a documented reason not to since this provides support for mobile and keyboard inputs as options. It is very important that mobile and keyboard are supported. New features must support mouse, mouse and keyboard, as well as both l-chord and l+r chord settings unless there is a clearly provided reason why this should not be the case.
- try to respect any settings in the panel below the board that seem relevant `src/components/SettingsPanel.vue`
- visuals on the board should respect the tile scaling settings
- layout settings should be respected (for choosing whether to centre the board or interface other than board)
- layout should ideally look good on all screen sizes including mobile (the thinnest phones could be 350px wide)
- any new graphics should fit into the skinManager system (in particular working for both the dark and light board skin)
- html/css should look good on both dark and light mode (this is the toggle button in the very top right of the page)
- if there are replays then this should ideally fit in to the existing replay system
- try to match the styling of the rest of the site, it makes heavy use of quasar components https://quasar.dev/components
- new graphics should ideally be rendered to the same canvas, this is so the "visual filters" setting and screenshot capture still work

Also consider compatibility with future features and raise this as a concern if it comes up, referencing the AGENTS.md file:

- currently the canvas redraws entirely for each input, but we may want to optimise the performance of this by only redrawing the parts that have changed. This will need consideration if changing the type of thing we draw to the canvas (e.g. drawing complex shapes across many tiles that make it harder to re-render targetted areas)
- we may want to store game history, but this feature has not yet been planned out and needs a lot of careful consideration. And ideal game history feature could include a filter system, ability to replay boards (and possibly edit them slightly) which may need a tree structure for replayed boards having "parent" boards that they are replayed from. And consideration on how to store, such as whether to use localstorage or file system storage and the pros and cons of each.
