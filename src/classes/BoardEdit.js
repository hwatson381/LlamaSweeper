import CONSTANTS from "src/includes/Constants";
import Utils from "src/classes/Utils";
import Algorithms from "src/classes/Algorithms";

import { Dialog } from "quasar";

import {
  variant,
  editTool,
  editBoardUnappliedWidth,
  editBoardUnappliedHeight,
  editCanUndo,
  editCanRedo,
  editClipboard,
  editSelectionActive,
  editSelectionBox,
  editMoveMode,
  editFillPanelOpen,
  editDragInProgress,
  analyseLastAlgorithm,
} from "src/composables/useSettings";

//Approximate cap on each variant's undo stack. Redo needs no cap of its own as it only ever holds entries moved from undo.
const MAX_UNDO_BYTES = 250 * 1024;

class BoardEdit {
  constructor(board) {
    this.board = board;

    //Undo/redo stacks are per variant. Snapshots are { w, h, data } where bit (x * h + y) of data is 1 for a mine
    //undoBytes is the running total size of the snapshots in undo.
    this.stacks = {
      "board editor": { undo: [], redo: [], undoBytes: 0 },
      "zini explorer": { undo: [], redo: [], undoBytes: 0 },
    };

    //In-progress rect drag: { startX, startY, endX, endY } in tile coords, or null
    this.drag = null;

    //Current selection, or null. floating is in its own local coords and never clipped:
    //{ base[x][y], floating: { mask[i][j], mines[i][j], w, h, centreX, centreY }, sourceTool }
    //base is the committed board with the selected cells cleared. Committed mines stay in board.mines until commitSession.
    this.session = null;

    //In-progress drag of the floating content in move mode: { startX, startY, originCentreX, originCentreY }, or null
    this.moveDrag = null;
    this.moveMode = false;

    //While the fill percentage panel is open, a copy of floating.mines from before it was opened (for Back)
    this.fillPanelBackup = null;
  }

  //---- Selection ----

  getFloatingTopLeft(floating) {
    //Rounding is chosen once here so all callers agree on where the floating content sits
    return {
      x: Math.round(floating.centreX - floating.w / 2),
      y: Math.round(floating.centreY - floating.h / 2),
    };
  }

  refreshSelectedStates() {
    this.syncSelectionUi();

    const tilesArray = this.board.tilesArray;
    if (!tilesArray) {
      return;
    }

    for (const column of tilesArray) {
      for (const tile of column) {
        tile.selectedState = "off";
      }
    }

    if (this.drag) {
      const { minX, maxX, minY, maxY } = this.getDragRect();
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tilesArray[x][y].selectedState = "preview";
        }
      }
    } else if (this.session) {
      const floating = this.session.floating;
      const topLeft = this.getFloatingTopLeft(floating);
      for (let i = 0; i < floating.w; i++) {
        for (let j = 0; j < floating.h; j++) {
          const x = topLeft.x + i;
          const y = topLeft.y + j;
          if (floating.mask[i][j] && this.board.checkCoordsInBounds(x, y)) {
            tilesArray[x][y].selectedState = "final";
          }
        }
      }
    }
  }

  syncSelectionUi() {
    editSelectionActive.value = Boolean(this.session);
    editMoveMode.value = this.moveMode;
    editFillPanelOpen.value = Boolean(this.fillPanelBackup);
    editDragInProgress.value = Boolean(this.drag || this.moveDrag);

    if (!this.session) {
      editSelectionBox.value = null;
      return;
    }

    //Bounds of the floating rectangle clipped to the board
    const floating = this.session.floating;
    const topLeft = this.getFloatingTopLeft(floating);
    const maxTileX = this.board.width - 1;
    const maxTileY = this.board.height - 1;
    editSelectionBox.value = {
      minX: Utils.clamp(topLeft.x, 0, maxTileX),
      minY: Utils.clamp(topLeft.y, 0, maxTileY),
      maxX: Utils.clamp(topLeft.x + floating.w - 1, 0, maxTileX),
      maxY: Utils.clamp(topLeft.y + floating.h - 1, 0, maxTileY),
    };
  }

  getDisplayedMines() {
    //Base with the floating content overlaid, clipped to the board
    const { base, floating } = this.session;
    const displayed = base.map((column) => column.slice());
    const topLeft = this.getFloatingTopLeft(floating);
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        const x = topLeft.x + i;
        const y = topLeft.y + j;
        if (floating.mask[i][j] && this.board.checkCoordsInBounds(x, y)) {
          displayed[x][y] = floating.mines[i][j];
        }
      }
    }
    return displayed;
  }

  redisplay() {
    //Show the session's current content on the tiles (or the committed mines if there is no session). Caller redraws.
    const mines = this.session ? this.getDisplayedMines() : this.board.mines;
    this.openBoardForEdit(mines);
    const mineCount = mines.flat().filter((val) => val).length;
    this.board.mineCount = mineCount;
    this.board.unflagged = mineCount;
    this.refreshSelectedStates();
  }

  getDragRect() {
    return {
      minX: Math.min(this.drag.startX, this.drag.endX),
      maxX: Math.max(this.drag.startX, this.drag.endX),
      minY: Math.min(this.drag.startY, this.drag.endY),
      maxY: Math.max(this.drag.startY, this.drag.endY),
    };
  }

  beginDrag(tileX, tileY) {
    //Returns true if the drag was captured. Caller redraws.
    if (
      editTool.value === "toggle" ||
      !this.board.checkCoordsInBounds(tileX, tileY)
    ) {
      return false;
    }

    if (this.session && this.moveMode) {
      //Move mode only grabs the selection itself
      if (this.board.tilesArray[tileX][tileY].selectedState !== "final") {
        return false;
      }

      const floating = this.session.floating;
      this.moveDrag = {
        startX: tileX,
        startY: tileY,
        originCentreX: floating.centreX,
        originCentreY: floating.centreY,
      };
      this.syncSelectionUi();
      return true;
    }

    if (editTool.value !== "rect") {
      return false;
    }

    this.commitSession();
    this.drag = { startX: tileX, startY: tileY, endX: tileX, endY: tileY };
    this.refreshSelectedStates();
    return true;
  }

  updateDrag(unflooredCoords) {
    //Returns true if the preview changed
    if (this.moveDrag) {
      const tileX = Utils.clamp(
        Math.floor(unflooredCoords.tileX),
        0,
        this.board.width - 1
      );
      const tileY = Utils.clamp(
        Math.floor(unflooredCoords.tileY),
        0,
        this.board.height - 1
      );
      const floating = this.session.floating;
      const centreX =
        this.moveDrag.originCentreX + tileX - this.moveDrag.startX;
      const centreY =
        this.moveDrag.originCentreY + tileY - this.moveDrag.startY;
      if (centreX === floating.centreX && centreY === floating.centreY) {
        return false;
      }

      floating.centreX = centreX;
      floating.centreY = centreY;
      this.redisplay();
      return true;
    }

    if (!this.drag) {
      return false;
    }

    const endX = Utils.clamp(
      Math.floor(unflooredCoords.tileX),
      0,
      this.board.width - 1
    );
    const endY = Utils.clamp(
      Math.floor(unflooredCoords.tileY),
      0,
      this.board.height - 1
    );
    if (endX === this.drag.endX && endY === this.drag.endY) {
      return false;
    }

    this.drag.endX = endX;
    this.drag.endY = endY;
    this.refreshSelectedStates();
    return true;
  }

  endDrag() {
    if (this.moveDrag) {
      this.moveDrag = null;
      this.syncSelectionUi();
      return;
    }

    if (!this.drag) {
      return;
    }

    const { minX, maxX, minY, maxY } = this.getDragRect();
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const mask = BoardEdit.createEmptyMines(w, h);
    const mines = BoardEdit.createEmptyMines(w, h);
    const base = this.board.mines.map((column) => column.slice());
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        mask[i][j] = true;
        mines[i][j] = this.board.mines[minX + i][minY + j];
        base[minX + i][minY + j] = false;
      }
    }

    this.drag = null;
    this.session = {
      base,
      floating: {
        mask,
        mines,
        w,
        h,
        centreX: minX + w / 2,
        centreY: minY + h / 2,
      },
      sourceTool: editTool.value,
    };
    this.refreshSelectedStates();
  }

  cancelDrag() {
    this.drag = null;
    this.moveDrag = null;
    this.refreshSelectedStates();
  }

  clearSelectionState() {
    this.drag = null;
    this.moveDrag = null;
    this.session = null;
    this.moveMode = false;
    this.fillPanelBackup = null;
    this.board.boardInput.activeDrag = null;
    this.refreshSelectedStates();
  }

  cancelSession() {
    //Drops any selection/drag without applying it. Caller redraws.
    const hadSession = Boolean(this.session);
    this.clearSelectionState();
    if (hadSession) {
      this.redisplay();
    }
  }

  commitSession() {
    //Applies the selection to the board (as one undo step if it changed anything) and deselects. Caller redraws unless the board changed.
    if (!this.session) {
      this.clearSelectionState();
      return;
    }

    const displayed = this.getDisplayedMines();
    const committed = this.board.mines;
    const changed = displayed.some((column, x) =>
      column.some((val, y) => val !== committed[x][y])
    );
    if (!changed) {
      this.cancelSession();
      return;
    }

    //board.variant rather than variant.value as this can run while switching variant
    this.pushUndoSnapshot(this.board.variant);
    this.replaceMines(displayed);
  }

  closeSelection() {
    this.commitSession();
    this.board.boardRenderer.draw();
  }

  toggleMoveMode() {
    if (!this.session) {
      return;
    }

    this.moveMode = !this.moveMode;
    this.syncSelectionUi();
  }

  transformFloating(newW, newH, mapCoords) {
    //mapCoords(i, j) gives the new local coords of the cell at local coords (i, j). Centre is kept.
    const floating = this.session.floating;
    const mask = BoardEdit.createEmptyMines(newW, newH);
    const mines = BoardEdit.createEmptyMines(newW, newH);
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        const [newI, newJ] = mapCoords(i, j);
        mask[newI][newJ] = floating.mask[i][j];
        mines[newI][newJ] = floating.mines[i][j];
      }
    }

    floating.mask = mask;
    floating.mines = mines;
    floating.w = newW;
    floating.h = newH;
    this.redisplay();
    this.board.boardRenderer.draw();
  }

  rotateRight() {
    if (!this.session) {
      return;
    }
    const { w, h } = this.session.floating;
    this.transformFloating(h, w, (i, j) => [h - 1 - j, i]);
  }

  rotateLeft() {
    if (!this.session) {
      return;
    }
    const { w, h } = this.session.floating;
    this.transformFloating(h, w, (i, j) => [j, w - 1 - i]);
  }

  flipHorizontal() {
    if (!this.session) {
      return;
    }
    const { w, h } = this.session.floating;
    this.transformFloating(w, h, (i, j) => [w - 1 - i, j]);
  }

  flipVertical() {
    if (!this.session) {
      return;
    }
    const { w, h } = this.session.floating;
    this.transformFloating(w, h, (i, j) => [i, h - 1 - j]);
  }

  setSelectionMines(isMine) {
    //Fill or clear every selected cell
    if (!this.session) {
      return;
    }

    const floating = this.session.floating;
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        if (floating.mask[i][j]) {
          floating.mines[i][j] = isMine;
        }
      }
    }
    this.redisplay();
    this.board.boardRenderer.draw();
  }

  openFillPanel(percent) {
    if (!this.session) {
      return;
    }

    this.moveMode = false;
    this.fillPanelBackup = this.session.floating.mines.map((column) =>
      column.slice()
    );
    this.fillSelectionPercentage(percent);
  }

  fillSelectionPercentage(percent) {
    //Re-randomises every time, so the mines move around as the percentage changes
    if (!this.session) {
      return;
    }

    const floating = this.session.floating;
    const cells = [];
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        if (floating.mask[i][j]) {
          cells.push([i, j]);
        }
      }
    }

    Algorithms.fisherYatesArrayShuffle(cells);
    const mineCount = Math.round((cells.length * percent) / 100);
    cells.forEach(([i, j], index) => {
      floating.mines[i][j] = index < mineCount;
    });

    this.redisplay();
    this.board.boardRenderer.draw();
  }

  confirmFillPanel() {
    this.fillPanelBackup = null;
    this.syncSelectionUi();
  }

  cancelFillPanel() {
    if (!this.session || !this.fillPanelBackup) {
      return;
    }

    this.session.floating.mines = this.fillPanelBackup;
    this.fillPanelBackup = null;
    this.redisplay();
    this.board.boardRenderer.draw();
  }

  cropToSelection() {
    //Shrinks the board to the on-board bounding rectangle of the selection, after confirmation
    if (!this.session) {
      return;
    }

    const floating = this.session.floating;
    const topLeft = this.getFloatingTopLeft(floating);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        const x = topLeft.x + i;
        const y = topLeft.y + j;
        if (floating.mask[i][j] && this.board.checkCoordsInBounds(x, y)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (minX === Infinity) {
      return; //Nothing of the selection is on the board
    }

    const displayed = this.getDisplayedMines();

    Dialog.create({
      title: "Crop Board?",
      message:
        "Crop the board to the selection? Everything outside of it will be removed.",
      ok: {
        flat: true,
        label: "Crop",
      },
      cancel: {
        flat: true,
        label: "Cancel",
      },
      persistent: true,
    }).onOk(() => {
      const cropped = BoardEdit.createEmptyMines(
        maxX - minX + 1,
        maxY - minY + 1
      );
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          cropped[x - minX][y - minY] = displayed[x][y];
        }
      }

      //Undoes the whole selection session in one step as it snapshots the committed board
      this.replaceMinesWithUndo(cropped, { clearPath: true });
    });
  }

  //---- Mines helpers ----

  getMinesForVariant(variantName) {
    if (variantName === "board editor") {
      return this.board.boardEditorMines;
    } else if (variantName === "zini explorer") {
      return this.board.ziniExplorerMines;
    }
    return null;
  }

  static createEmptyMines(width, height) {
    return new Array(width).fill(0).map(() => new Array(height).fill(false));
  }

  static packMines(mines) {
    const w = mines.length;
    const h = mines[0].length;
    const data = new Uint8Array(Math.ceil((w * h) / 8)); //Final byte may have unused bits
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        if (mines[x][y]) {
          const bitIndex = x * h + y;
          data[bitIndex >> 3] |= 1 << (bitIndex & 7);
        }
      }
    }
    return { w, h, data };
  }

  static unpackMines(snapshot) {
    const { w, h, data } = snapshot;
    const mines = BoardEdit.createEmptyMines(w, h);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const bitIndex = x * h + y;
        mines[x][y] = (data[bitIndex >> 3] & (1 << (bitIndex & 7))) !== 0;
      }
    }
    return mines;
  }

  //---- Undo/redo ----

  refreshUndoRedoState() {
    const stack = this.stacks[variant.value];
    editCanUndo.value = Boolean(stack && stack.undo.length > 0);
    editCanRedo.value = Boolean(stack && stack.redo.length > 0);
  }

  pushUndoSnapshot(variantName = variant.value) {
    //Call BEFORE mutating the committed board of the given variant
    const stack = this.stacks[variantName];
    const mines = this.getMinesForVariant(variantName);
    if (!stack || !mines) {
      return;
    }

    this.pushOntoUndo(stack, BoardEdit.packMines(mines));
    stack.redo = [];
    this.refreshUndoRedoState();
  }

  pushOntoUndo(stack, snapshot) {
    stack.undo.push(snapshot);
    stack.undoBytes += snapshot.data.byteLength;

    //Drop oldest entries until under the cap, but always keep the newest
    while (stack.undoBytes > MAX_UNDO_BYTES && stack.undo.length > 1) {
      stack.undoBytes -= stack.undo.shift().data.byteLength;
    }
  }

  popFromUndo(stack) {
    const snapshot = stack.undo.pop();
    stack.undoBytes -= snapshot.data.byteLength;
    return snapshot;
  }

  undo() {
    if (this.board.gameStage === "edit" && (this.session || this.drag)) {
      //Undo during a selection just abandons the selection
      this.cancelSession();
      this.board.boardRenderer.draw();
      return;
    }

    const stack = this.stacks[variant.value];
    if (this.board.gameStage !== "edit" || !stack || stack.undo.length === 0) {
      return;
    }

    stack.redo.push(BoardEdit.packMines(this.board.mines));
    const snapshot = this.popFromUndo(stack);
    this.replaceMines(BoardEdit.unpackMines(snapshot));
    this.refreshUndoRedoState();
  }

  redo() {
    const stack = this.stacks[variant.value];
    if (this.board.gameStage !== "edit" || !stack || stack.redo.length === 0) {
      return;
    }

    this.pushOntoUndo(stack, BoardEdit.packMines(this.board.mines));
    const snapshot = stack.redo.pop();
    this.replaceMines(BoardEdit.unpackMines(snapshot));
    this.refreshUndoRedoState();
  }

  //---- Editing ----

  static minesEqual(minesA, minesB) {
    if (
      minesA.length !== minesB.length ||
      minesA[0].length !== minesB[0].length
    ) {
      return false;
    }
    return minesA.every((column, x) =>
      column.every((val, y) => val === minesB[x][y])
    );
  }

  replaceMinesWithUndo(newMines, options) {
    //Only adds an undo entry if the board actually differs, otherwise the entry would be a confusing no-op
    if (!BoardEdit.minesEqual(newMines, this.board.mines)) {
      this.pushUndoSnapshot();
    }
    this.replaceMines(newMines, options);
  }

  replaceMines(newMines, { clearPath = false } = {}) {
    //Single routine for swapping in a whole new mine array while in edit mode.
    //Does not push undo (callers do that) and does not update the URL (that happens on mode switch).
    const board = this.board;
    const newWidth = newMines.length;
    const newHeight = newMines[0].length;
    const sizeChanged = newWidth !== board.width || newHeight !== board.height;

    this.clearSelectionState();

    board.mines = newMines;
    if (board.variant === "board editor") {
      board.boardEditorMines = newMines;
    } else if (board.variant === "zini explorer") {
      board.ziniExplorerMines = newMines;
    }

    board.width = newWidth;
    board.height = newHeight;
    board.mineCount = newMines.flat().filter((val) => val).length;
    board.unflagged = board.mineCount;
    analyseLastAlgorithm.value = "Custom";

    if (board.variant === "zini explorer" && (sizeChanged || clearPath)) {
      board.ziniExplore.killDeepChainZiniRunner();
      board.ziniExplore.clearCurrentPath();
    }

    board.resetTiles();
    this.openBoardForEdit();
    board.boardRenderer.updateBoardPixelDimensions();
    board.revertUnappliedWidthHeightSetting();
    board.boardRenderer.draw();
  }

  handleEditClick(tileX, tileY) {
    //Click on the edit board - typically will toggle a mine
    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      return; //just incase
    }

    this.pushUndoSnapshot();

    const isAddingMines = !this.board.mines[tileX][tileY]; //adding a mine or removing it?

    this.board.mines[tileX][tileY] = !this.board.mines[tileX][tileY]; //toggle the mine

    this.board.mineCount += isAddingMines ? 1 : -1;
    this.board.unflagged = this.board.mineCount;
    analyseLastAlgorithm.value = "Custom";

    this.openBoardForEdit(); //refreshes all numbers. Maybe too inefficient?
  }

  openBoardForEdit(mines = this.board.mines) {
    //Update tilesArray such that it corresponds to an open board with mines as per the given mine board.
    const board = this.board;

    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        if (mines[x][y]) {
          board.tilesArray[x][y].state = CONSTANTS.MINE;
          continue;
        }

        let tileNumber = 0;
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (!board.checkCoordsInBounds(i, j)) {
              continue;
            }

            if (mines[i][j]) {
              tileNumber++;
            }
          }
        }

        board.tilesArray[x][y].state = tileNumber;
      }
    }
  }

  readUnappliedSize() {
    //Reads (and clamps) the width/height inputs. Returns null if they aren't valid numbers
    if (
      typeof editBoardUnappliedWidth.value !== "number" ||
      typeof editBoardUnappliedHeight.value !== "number"
    ) {
      return null;
    }

    editBoardUnappliedWidth.value = Utils.clamp(
      Math.floor(editBoardUnappliedWidth.value),
      1,
      100
    );
    editBoardUnappliedHeight.value = Utils.clamp(
      Math.floor(editBoardUnappliedHeight.value),
      1,
      100
    );

    return {
      width: editBoardUnappliedWidth.value,
      height: editBoardUnappliedHeight.value,
    };
  }

  applyEditBoardWidthHeight() {
    //"New board" - empty board of the size in the width/height inputs
    const size = this.readUnappliedSize();
    if (!size) {
      return;
    }

    if (this.board.gameStage !== "edit") {
      this.board.switchToEditMode();
    }

    this.commitSession();
    this.replaceMinesWithUndo(
      BoardEdit.createEmptyMines(size.width, size.height),
      { clearPath: true }
    );
  }

  resizeEditBoard() {
    //Change to the size in the width/height inputs, keeping mines in the top left overlap
    const size = this.readUnappliedSize();
    if (!size) {
      return;
    }

    if (this.board.gameStage !== "edit") {
      this.board.switchToEditMode();
    }

    this.commitSession();
    const oldMines = this.board.mines;

    if (size.width === oldMines.length && size.height === oldMines[0].length) {
      Dialog.create({
        title: "Board unchanged",
        message: "Please choose a different width/height before resizing.",
      });
      return;
    }

    const newMines = BoardEdit.createEmptyMines(size.width, size.height);
    const overlapWidth = Math.min(size.width, oldMines.length);
    const overlapHeight = Math.min(size.height, oldMines[0].length);
    for (let x = 0; x < overlapWidth; x++) {
      for (let y = 0; y < overlapHeight; y++) {
        newMines[x][y] = oldMines[x][y];
      }
    }

    this.replaceMinesWithUndo(newMines, { clearPath: true });
  }

  promptForClearingEditBoard() {
    //Prompt for clearing the edit board.

    this.commitSession();

    //Check if already empty
    if (!this.board.mines.some((column) => column.some((val) => val))) {
      return;
    }

    Dialog.create({
      title: "Clear Board?",
      message: "Are you sure you want to clear the board?",
      ok: {
        flat: true,
        label: "Clear",
      },
      cancel: {
        flat: true,
        label: "Cancel",
      },
      persistent: true,
    }).onOk(() => {
      this.replaceMinesWithUndo(
        BoardEdit.createEmptyMines(this.board.width, this.board.height),
        { clearPath: true }
      );
    });
  }

  //---- Clipboard ----

  parseClipboard() {
    //Returns the stored clipboard, or null if missing/corrupt/unknown version
    const raw = editClipboard.value;
    if (!raw || typeof raw !== "object" || raw.v !== 1) {
      return null;
    }

    const { w, h, x, y, tool, mask, mines } = raw;
    if (
      !Number.isInteger(w) ||
      !Number.isInteger(h) ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      w < 1 ||
      h < 1 ||
      (tool !== "rect" && tool !== "lasso") ||
      typeof mask !== "string" ||
      typeof mines !== "string" ||
      mask.length !== w * h ||
      mines.length !== w * h ||
      !/^[01]+$/.test(mask) ||
      !/^[01]+$/.test(mines)
    ) {
      return null;
    }

    return { w, h, x, y, tool, mask, mines };
  }
}

export default BoardEdit;
