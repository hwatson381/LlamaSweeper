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

Refer to scripts in package.json. Note some have :js for skipping the wasm recompilation. The primary developer has an unusual configuration with the project sitting in windows, but the vscode terminal using a bash shell in WSL2, other contributors will naturally have different setups.

## validation

- Run `npm run lint` after JavaScript or Vue changes where practical.
- Run `npm run build:js` before considering a larger UI or gameplay change complete. This skips the WASM rebuild.
- `npm test` is currently a placeholder and does not run a test suite.
- For changes to board interactions, manually verify the relevant paths with mouse, touch, keyboard clicks, L-chord, and L+R chord settings.
- Changes under `/wasm` require rebuilding the WASM package before browser verification. Use `npm run build:wasm`, or use the full `npm run dev` / `npm run build` scripts.

## project structure

Notable directories

- `/notes` messy personal notes on planned features, may be inaccurate.
- `/public` static files (primarily images) to be served without additional compilation
- `/src/assets` nothing particularly important in here
- `/src/classes` bulk of the javascript code. `Board.js` is a key file that imports many of the others
- `/src/components` vue components, the majority will be used on `PlayPage.vue`
- `/src/composables` vue composables, `useSettings.js` is a singleton module containing the majority of refs and saved localStorage settings
- `/src/css` global css
- `/src/includes` misc js files for including elsewhere
- `/src/layouts` vue layouts
- `/src/pages` vue pages. `PlayPage.vue` is the main one
- `/src/workers` scripts used in web workers
- `/wasm` rust code that compiles to WASM for specific cases

## key ownership

- `Board.js` is the central coordinator for a board.
- `BoardInput.js` owns DOM-event normalisation, pointer and gesture state, and input dispatch.
- `BoardActions.js` owns tile-state mutations, opening, flagging, chording, and win/loss handling.
- `BoardRenderer.js`, `Tile.js`, and `SkinManager.js` own canvas drawing and board-skin assets.
- `useSettings.js` owns persisted settings and resets transient settings on PlayPage mount. `SettingsPanel.vue` exposes most board-related settings.
- `PlayPage.vue` coordinates variants and the main board UI.

## Development preferences

- Prefer simple solutions over abstractions that are only useful once.
- Don't add dependencies unless there is a good reason.
- Prefer modifying existing code over creating parallel implementations.
- Avoid "enterprise" patterns unless they solve a real problem.
- Preserve existing behaviour unless the task explicitly requests a change.
- Ask before making large architectural changes.

## Important considerations

Some of the below considerations are with the idea in mind that a new aim trainer mode may be added, although they also apply generally.

- Reuse existing functions where it makes sense.
- detecting clicks must use the code from the handlePointerInput function unless there is a documented reason not to since this provides support for mobile and keyboard inputs as options. It is very important that mobile and keyboard are supported. New features must support mouse, mouse and keyboard, as well as both l-chord and l+r chord settings unless there is a clearly provided reason why this should not be the case.
- Consider and respect any applicable settings in `src/components/SettingsPanel.vue`.
- Visuals on the board should respect the tile scaling settings.
- layout settings should be respected (for choosing whether to centre the board or interface other than board)
- layout should ideally look good on all screen sizes including mobile (the thinnest phones could be 350px wide)
- any new graphics should fit into the skinManager system (in particular working for both the dark and light board skin)
- html/css should look good on both dark and light mode (this is the toggle button in the very top right of the page)
- if there are replays then this should ideally fit in to the existing replay system
- try to match the styling of the rest of the site, it makes heavy use of quasar components https://quasar.dev/components
- New board graphics should be rendered through the existing canvas pipeline unless they are explicitly UI-only. This ensures the "visual filters" setting and screenshot capture continue to work.
- Whenever making an addition or change to persisted settings, warn the user if anything could make pre-existing saved values unusable.

## Future compatibility

Raise a concern before introducing state, rendering, or replay designs that would materially make either of these planned directions harder:

- The canvas currently redraws fully for each input. Future partial redraw optimisation may be harder if a feature adds graphics that span multiple tiles or change continuously, such as a mouse path drawn over the board. Raise this before adding such graphics so their redraw boundaries or rendering layer can be designed deliberately.
- The only current replay support is the most recently played game, which remains available until the board is reset. Persisted game history may later need filtering, replay, limited editing, and branching parent boards. Do not add ad hoc saved-game or variant-specific history storage; raise it first so a coherent history system and storage approach can be designed.

## Coordinate convention

- Board arrays use `tilesArray[x][y]`: `x` is the horizontal column and `y` is the vertical row.
- Pixel coordinates use the same `(x, y)` order.
- Keep coordinate names explicit (`tileX`, `tileY`, `canvasX`, `canvasY`) rather than using ambiguous generic names.

## New variants and experimental modes

- Keep a new variant integrated with the existing `Board`, input, rendering, settings, replay, and variant-selection systems where practical. Do not create parallel board, tile, input, or rendering implementations without discussing the tradeoff first.
- Keep feature work scoped to the requested mode. Do not refactor unrelated gameplay, settings, rendering, or statistics code as part of an experimental feature unless required to complete it safely.
- Before adding a dependency, persistent storage, a new worker, a new canvas/rendering layer, or a new replay format, explain the need and get approval.
- Prefer a small playable vertical slice before adding optional settings, statistics, export support, visual effects, or broad configurability.
- Preserve normal, Eff boards, Board Editor, ZiNi Explorer, and Mean Openings behaviour unless the change explicitly affects them.
- New UI controls should use existing Quasar patterns and be wired through the existing settings system only when persistence is genuinely useful.

## Aim trainer compatibility

- Aim trainer board interactions must continue to support mouse, touch, keyboard clicks, L-chord, and L+R chord unless the mode has a documented gameplay reason to limit an input path.
- Reuse `handlePointerInput` for interaction dispatch. Do not attach independent board pointer handlers.
- Aim-trainer visuals drawn over the board must respect tile size, board padding, skins, dark/light mode, visual filters, and screenshot capture.
- Do not persist aim-trainer runs or create variant-specific history storage without discussing the future game-history design first.

## Maintaining these instructions

If work reveals a durable project convention, architectural constraint, validation requirement, or common environment pitfall that would help future contributors, mention a concise proposed update to this file in the final response. Do not edit `AGENTS.md` unless the user asks.
