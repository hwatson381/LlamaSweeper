## Plan: Edit-mode select tools, undo/redo, clipboard

Add Rect/Lasso selection with a floating context box (move, rotate, flip, fill, clear, crop, copy, cut, duplicate), undo/redo, a persisted clipboard with paste, and a "Resize" option to the edit mode of Board Editor and ZiNi Explorer. New class `src/classes/BoardEdit.js` owns edit-mode logic. Implemented in 4 phases, each validated with `npm run lint` + `npm run build:js` and manual testing.

### Superseded decisions (do NOT implement the earlier versions)

- Selection rendering: alpha fill per tile only. No overlay pass, no outline/border, no screenshot handling (edit mode can't be screenshot).
- Commit model: a selection SESSION that commits on exit (not commit-per-action).
- Rotate near edge: NO auto-shift back onto board. Off-board content kept until commit, clipped only on commit.
- Window mousemove listener: PERMANENT (added on PlayPage mount, like existing window mousedown/mouseup), not added/removed by beginDrag.
- Selection actions in a floating context box (not an extra row). No Invert, no Select all, no subtract-from-selection, no R/H/V shortcuts.
- Clipboard persisted in localStorage (not in-memory).
- Resize CLEARS ZiNi path (same as New board). Do not try to preserve path.
- Clear-board confirmation dialog is KEPT.
- No AGENTS.md change.
- Paste switches tool to the tool the clipboard was copied with (Rect or Lasso). Duplicate only exists in the context box.

### Core data model (BoardEdit)

- committed = board.mines (only changes on commit / toggle / undo / redo / resize / crop / new / import)
- session = { base, floating: { mask, mines, w, h, centreX, centreY }, sourceTool } or null
  - base = committed copy with selection source cells cleared (for paste: committed copy unchanged)
  - floating stored in its own local coords (w x h), never clipped; centre stored as float so 4 rotations return to exact start
  - topLeftX = Math.round(centreX - w/2), topLeftY = Math.round(centreY - h/2) (choose rounding once, use everywhere)
- displayed = base overlaid by floating (within mask: overwrite, including empties), clipped to board
- openBoardForEdit(mines) takes a mines param; during session pass displayed so numbers are live
- Tile.selectedState: "off" | "preview" | "final"; final set on displayed on-board cells of floating mask; preview during an in-progress rect/lasso drag
- Reference rule: replace board.mines with new array then re-point boardEditorMines or ziniExplorerMines (by variant) at it.

---

### Phase 1 — BoardEdit extraction, replaceMines, undo/redo, Resize, clipboard storage (no selection yet)

1. Create `src/classes/BoardEdit.js` (class BoardEdit, constructor(board)). Construct in Board constructor next to BoardInput/BoardActions: `this.boardEdit = new BoardEdit(this)`.
2. Move from Board.js into BoardEdit (update all callers: EditorControls.vue, BoardInput.js line ~904, BoardImportExport.js, Board.resetBoard):
   - handleEditClick(tileX, tileY)
   - openBoardForEdit(mines = this.board.mines)
   - applyEditBoardWidthHeight() (New board)
   - promptForClearingEditBoard()
     Keep in Board.js: boardEditorMines/ziniExplorerMines, switchToEditMode/PlayMode/AnalyseMode, revertUnappliedWidthHeightSetting, regenerateUrlAndPushIfDifferent, URL update handlers.
3. Add BoardEdit.replaceMines(newMines, { clearPath }) — single routine for undo/redo/resize/crop:
   - board.mines = newMines; re-point boardEditorMines or ziniExplorerMines by variant
   - board.width/height/mineCount/unflagged update; analyseLastAlgorithm = "Custom"
   - if zini explorer and (size changed or clearPath): ziniExplore.killDeepChainZiniRunner(); clearCurrentPath()
   - board.resetTiles(); openBoardForEdit(); boardRenderer.updateBoardPixelDimensions(); board.revertUnappliedWidthHeightSetting(); draw
   - does NOT call router push (consistent with handleEditClick; URL updates on mode switch)
4. Undo/redo:
   - Per-variant stacks: { "board editor": {undo:[], redo:[]}, "zini explorer": {...} }, cap 100 entries (drop oldest)
   - Snapshot = { w, h, data: Uint8Array(w\*h) } packed from mines; unpack to tilesArray-style mines[x][y]
   - pushUndoSnapshot() captures current committed board BEFORE a mutation, clears redo
   - undo(): if session active -> cancelSession() only (no stack change). Else pop undo, push current to redo, replaceMines(unpacked)
   - redo(): symmetric
   - Reactive refs in useSettings: editCanUndo, editCanRedo (transient). Update after every stack change and on variant change (stacks are per variant).
   - Entries pushed by: each handleEditClick toggle, commit of a session that changed anything, New board, Clear (after confirm), Resize, Crop, ptt import, MBF import, sendToBoardEditor/sendToZiniExplorer (push onto target variant stack). URL navigation changes do NOT push.
5. Resize: EditorControls "new board" becomes q-btn-dropdown split: main click = New board (existing behaviour); menu item labelled exactly "Resize" (not "Resize (keep mines)"). Resize builds new array of unapplied width/height (clamped 1..100 like applyEditBoardWidthHeight), copies mines from top-left overlap, pushUndoSnapshot, replaceMines(new, {clearPath: true}). Must be in edit mode: call board.switchToEditMode() first if needed (same as New board does).
6. Clipboard storage: in useSettings `editClipboard = useLocalStorage("ls_editClipboard", null)` storing { v: 1, w, h, x, y, tool: "rect"|"lasso", mask: string, mines: string } (strings of "0"/"1" length w\*h, or similar compact encoding). Parse helper in BoardEdit returns null on any failure/unknown v. Computed `editHasClipboard`. New key only — no impact on existing saved values (tell user).
7. EditorControls.vue: add q-separator then tool row (only when isCurrentlyEditModeDisplay): tool q-btn-toggle [Toggle(icon edit) | Rect(icon crop_square / highlight_alt) | Lasso(icon gesture)] bound to editTool ref; Undo (undo icon, disabled !editCanUndo); Redo (redo icon); Paste (content_paste, disabled !editHasClipboard). In Phase 1 Rect/Lasso/Paste can be hidden or disabled until later phases.
8. editTool ref in useSettings (transient, default "toggle", reset in resetTransientSettings()).
9. Keyboard shortcuts (PlayPage.vue handleKeyDown): add at very top a branch `if (event.ctrlKey || event.metaKey)`: handle z (undo), y and shift+z (redo) only when game.board.gameStage === "edit" and checkFocusForKeyPress(event) true; then return (so Ctrl combos never reach keyboard-click handling). Phase 4 extends this branch with c/x/v.
10. Keyboard-click fixes in BoardInput.sendKeyboardClick:
    - ignore a key-up when the corresponding keyboardClickIsDigDown/IsFlagDown is already false (prevents lone up from Ctrl+Z when z is the dig key)
    - skip keyboardClickOpenOnKeyDown conversion when board.gameStage === "edit"
    - also PlayPage handleKeyUp needs no change after the above guard.

Verify Phase 1: lint, build:js; toggle mines then Ctrl+Z/Ctrl+Y/buttons on both variants; undo across Resize restores size; Resize keeps top-left mines and clears zini path; New board/Clear still confirm and are undoable; ptt/MBF import undoable; Ctrl+Z inside Width input does text undo not board undo; dig key set to "z": Ctrl+Z doesn't click; switch variant and back keeps separate stacks.

---

### Phase 2 — Drag infrastructure, Rect select, selection rendering, canvas wrapper

1. Canvas wrapper (PlayPage.vue): wrap <canvas> in `<div class="canvas-wrapper">` (position: relative, takes margin-right/margin-bottom 10px from #main-canvas). Canvas: display: block, remove float: left, keep filter and touchAction on canvas. Wrapper should exactly match canvas size. q-resize-observer stays where it is. Selection box (Phase 3) goes inside wrapper.
2. BoardInput drag state: `this.activeDrag = null | { pointerId: "mouse" | touchIdentifier, source: "mouseButton" | "keyboard" | "touch" }`.
3. Down: in handlePointerInput edit branch (before existing toggle logic):
   - if editTool !== "toggle": if isDown && (isDigInput || isFlagInput) && no activeDrag → boardEdit.beginDrag(coords) returns true if it captured; if captured set activeDrag. Source: "keyboard" if called from sendKeyboardClick (pass a flag or detect fake event), "mouseButton" for mouse, "touch" for touch.
   - if !isDown and activeDrag matches pointer → endDrag (covers keyboard key-up and touch end).
   - With select tool active, NO event falls through to handleEditClick (taps never toggle mines). Right button also selects.
   - Toggle tool: unchanged behaviour (mouseDownOrTouchUp toggles).
4. Touch start (handleTouchStart): when gameStage === "edit" && editTool !== "toggle", before isUsingTouchStartTiming / ongoingTouches deactivation logic: call handlePointerInput with isDown = true. If it captured the drag → event.preventDefault() (only for captured touches). Not captured → let it scroll. Still register in ongoingTouches as needed but skip touchRevealTiming "start" conversion.
5. Move: new BoardInput.handlePointerMove(pointerId, event) → if activeDrag?.pointerId === pointerId → boardEdit.updateDrag(unflooredCoords); draw if changed. Call from:
   - handleTouchMove at top (before its gameStage early return); preventDefault for the active drag touch
   - new window mousemove listener (permanent, registered/unregistered in PlayPage onMounted/onUnmounted alongside existing window mousedown/mouseup; handler `handleWindowMouseMove` → game.board.boardInput.handleWindowMouseMove(event)). Returns immediately when no activeDrag. Updates lastClientCoords during drag (for keyboard drags). Canvas handleMouseMove already returns early in edit stage — no double handling.
6. Up/cancel:
   - handleTouchEnd: if touch is activeDrag → endDrag, skip max time / distance / block / long-press logic.
   - handleTouchCancel: if active → boardEdit.cancelDrag().
   - Window mouseup (existing PlayPage handleWindowMouseUp, capture phase): if activeDrag.source === "mouseButton" → endDrag. Canvas mouseup afterward is harmless (up events are no-ops with select tool).
   - Add window "blur" listener (PlayPage mount/unmount) → if activeDrag → endDrag (always endDrag, for simplicity).
   - Multi-touch: while activeDrag exists, other touches are ignored for edit-select purposes.
7. BoardEdit drag logic (Rect for this phase):
   - beginDrag: rect tool, tile in bounds → commit any existing session, start preview rect from start tile. Return true. Out of bounds → false.
   - updateDrag: rect = start tile to current floored tile inclusive, clamped to board; set Tile.selectedState "preview" on those tiles; redraw.
   - endDrag: create session from selected mask: floating = committed cells in mask's bbox, mask in local coords, centre from bbox; base = committed with mask cells cleared; set selectedState "final"; show box (Phase 3).
8. Rendering: Tile.selectedState (default "off"; resetTiles creates fresh tiles so re-apply after resetTiles). In Tile.draw (or BoardRenderer.drawTiles when gameStage === "edit"), after drawing tile, if selectedState !== "off": ctx.fillStyle = skinManager.getSelectPreviewColour() / getSelectFinalColour(); fillRect whole tile. Colours in SkinManager colours.light/dark: selectPreview (translucent blue, e.g. rgba(60,120,255,0.35)), selectFinal (translucent grey, e.g. rgba(90,90,90,0.4) light / rgba(200,200,200,0.3) dark) — tune visually; getters like existing getHighlightColour pattern.
9. Selection cleared/committed on: Escape (Phase 4 shortcut), ✕ (Phase 3), tool change (watch editTool), switchToEditMode/PlayMode/AnalyseMode, resetBoard, variant change, Resize/New/Crop, starting new selection.

Verify Phase 2: mouse rect drag incl. releasing off-canvas and outside window; keyboard dig key held + mouse move; right-drag; touch drag on board (no scroll) and touch off board (scrolls); touch settings: touchRevealTiming start, touchRevealLocation block, small touchScrollDistance, short touchMaxTime, long press — all must still drag-select; Toggle tool behaviour unchanged with mouse/touch/keyboard, L and L+R chord settings; selection visible in light and dark skins; normal games unaffected (canvas wrapper layout, side panels, centring setting).

---

### Phase 3 — Selection session operations + EditSelectionBox.vue

1. BoardEdit operations on floating (all redraw via displayed → openBoardForEdit(displayed), then re-mark selectedState final):
   - rotateLeft/rotateRight: rotate mask+mines arrays, swap w/h, keep centre
   - flipHorizontal/flipVertical
   - fill: floating mines = true within mask; clear: false within mask
   - move mode toggle: `moveMode` flag. In move mode, beginDrag only captures if the start tile is a "final" selected tile; drag offset = current tile - start tile (whole tiles), applied to centre. Taps/drags elsewhere in move mode do nothing (and scroll on mobile). Move mode ends on ✕, tool change, or pressing Move again.
   - commitSession(): if displayed differs from committed → pushUndoSnapshot(); replaceMines(displayed clipped); clear selectedState; session = null. (In zini explorer set analyseLastAlgorithm "Custom".)
   - cancelSession(): session = null; redisplay committed.
2. Session refs in useSettings (transient): editSelectionActive, editSelectionBox { left, top, placeAbove } or computed by BoardEdit, editMoveMode, editDragInProgress (box hidden while true).
3. New component `src/components/EditSelectionBox.vue`, placed inside canvas wrapper in PlayPage, v-if session active && !drag in progress:
   - Plain div, position absolute, styled like ReplayBar.vue: light grey panel (semi-transparent bg, e.g. rgba(211,211,211,0.8)), box-shadow, border-radius, dense q-btn color="white" text-color="black" (opaque), :dark="false"
   - Buttons (two rows, wrap): Move (open_with, shows active when editMoveMode), rotate_left, rotate_right, flip (horizontal), flip with CSS rotate(90deg) (vertical), Fill (format_color_fill), Clear (backspace or layers_clear), Crop (crop), Copy (content_copy), Cut (content_cut), Duplicate (control_point_duplicate), Close (close)
   - Tooltips on each button
   - Position: from on-board clipped bbox of floating: left = boardHorizontalPadding + minX*tileSize; top below = boardTopPadding + (maxY+1)*tileSize + small gap; if not enough space below within wrapper height, place above bbox. Clamp horizontally so box stays within viewport/wrapper (350px phones). Allowed to overflow wrapper bottom.
   - Buttons must not trigger board input (they're outside canvas; window mousedown/up listeners only record when target != canvas & running, fine).
4. Crop (Phase 3 or 4): commit session, confirm via Dialog.create (like promptForClearingEditBoard), then pushUndoSnapshot handled inside: new mines = committed cropped to on-board bbox of the selection mask; replaceMines(cropped, {clearPath: true}). Lasso → smallest bounding rectangle.

Verify Phase 3: move then rotate then move — intermediate area not wiped; rotate near edge then move back — mines reappear; commit clips; undo after commit restores; Ctrl+Z during session cancels; box position below/above, small boards, 350px width, dark/light mode, mobile zoom; move mode on touch: drag on selection moves, elsewhere scrolls; tool change/mode switch commits.

---

### Phase 4 — Lasso, Copy/Cut/Paste/Duplicate, remaining shortcuts

1. Lasso: during drag keep list of unfloored tile points. Preview each updateDrag: mark tiles crossed by each segment (supercover line, includes closing segment from current point back to start), then flood-fill (4-connected) from all unmarked border tiles; selected = not reached (union semantics, no XOR). Set preview states. endDrag → session with that mask. Max board 100x100 so recompute per move is fine.
2. Copy: write clipboard { v:1, w, h, x: topLeftX, y: topLeftY, tool: session.sourceTool, mask, mines } from floating. Session stays.
3. Cut: copy, clear floating, commitSession(), deselect.
4. Paste (tool row button / Ctrl+V): commit any session; parse clipboard; set editTool to clipboard.tool ("rect" or "lasso"); start session with base = committed (no source clearing), floating from clipboard, centre from stored x,y adjusted so bbox top-left stays on board where possible (clamp top-left into [0, w-1]/[0,h-1]; content may hang off if larger than board). Show box.
5. Duplicate (context box only): commit current session in place, then start a new session (base = new committed) with copy of floating placed: right of original if fits (gap 0 or 1), else below, else offset (+1,+1) even if hanging off. Same sourceTool.
6. Shortcuts (PlayPage handleKeyDown ctrl branch + others), only when gameStage === "edit" and checkFocusForKeyPress:
   - Ctrl/Cmd+C: only if session active → copy (else let browser handle; don't call checkFocusForKeyPress which preventDefaults)
   - Ctrl/Cmd+X: only if session active → cut
   - Ctrl/Cmd+V: only if clipboard exists → paste
   - Delete and Backspace (Mac keyboards lack Delete): session active → clear
   - Escape: session active → commit + deselect
   - Order matters: check conditions before calling checkFocusForKeyPress since it preventDefaults & blurs.

Verify Phase 4: lasso figure-8 and self-overlapping loops select everything enclosed; lasso with tiny path; copy in board editor, paste in zini explorer; clipboard survives reload; corrupted ls_editClipboard value ignored; paste larger than board then move/rotate then commit clips; paste switches to rect/lasso per source; duplicate placement; Ctrl+C on page text outside edit mode still copies.

---

### Relevant files

- src/classes/BoardEdit.js (new)
- src/classes/Board.js — construct BoardEdit; remove moved functions; switchTo\* and resetBoard commit/clear session; resetBoard uses boardEdit.openBoardForEdit
- src/classes/BoardInput.js — activeDrag, handlePointerMove, handleWindowMouseMove, edit branch in handlePointerInput (~line 902), touch start/move/end/cancel branches, sendKeyboardClick fixes
- src/classes/BoardImportExport.js — imports/sendTo\* push undo; callers of switchToEditMode unchanged
- src/classes/Tile.js — selectedState + overlay draw
- src/classes/BoardRenderer.js — drawTiles overlay (if not in Tile.draw)
- src/classes/SkinManager.js — selectPreview/selectFinal colours + getters
- src/composables/useSettings.js — editTool, editCanUndo, editCanRedo, editClipboard (useLocalStorage), editHasClipboard, session/box refs; reset transient ones in resetTransientSettings
- src/components/EditorControls.vue — q-separator, tool row, New board split dropdown with Resize
- src/components/EditSelectionBox.vue (new)
- src/pages/PlayPage.vue — canvas wrapper + CSS, EditSelectionBox, window mousemove + blur listeners, ctrl shortcut branch in handleKeyDown

### Scope exclusions

- No drag-to-paint in Toggle tool, no subtract selection, no select all, no invert, no symmetry, no pattern library, no anchor choice for resize, no analyse-mode undo, no preserving zini path on resize, no Pointer Events migration, no AGENTS.md changes, no changes to recordOffCanvasMouseButton.
