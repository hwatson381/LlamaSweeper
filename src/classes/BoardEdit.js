import CONSTANTS from "src/includes/Constants";
import Utils from "src/classes/Utils";

import { Dialog } from "quasar";

import {
  variant,
  editTool,
  editBoardUnappliedWidth,
  editBoardUnappliedHeight,
  editCanUndo,
  editCanRedo,
  editClipboard,
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
    //{ mask[i][j], mines[i][j], w, h, centreX, centreY }, with sourceTool "rect" | "lasso"
    this.session = null;
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
      editTool.value !== "rect" ||
      !this.board.checkCoordsInBounds(tileX, tileY)
    ) {
      return false;
    }

    this.commitSession();
    this.drag = { startX: tileX, startY: tileY, endX: tileX, endY: tileY };
    this.refreshSelectedStates();
    return true;
  }

  updateDrag(unflooredCoords) {
    //Returns true if the preview changed
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
    if (!this.drag) {
      return;
    }

    const { minX, maxX, minY, maxY } = this.getDragRect();
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const mask = BoardEdit.createEmptyMines(w, h);
    const mines = BoardEdit.createEmptyMines(w, h);
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        mask[i][j] = true;
        mines[i][j] = this.board.mines[minX + i][minY + j];
      }
    }

    this.drag = null;
    this.session = {
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
    this.refreshSelectedStates();
  }

  cancelSession() {
    //Drops any selection/drag without applying it
    this.drag = null;
    this.session = null;
    this.board.boardInput.activeDrag = null;
    this.refreshSelectedStates();
  }

  commitSession() {
    //Selections can't yet alter the floating content, so committing is the same as cancelling
    this.cancelSession();
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

  replaceMines(newMines, { clearPath = false } = {}) {
    //Single routine for swapping in a whole new mine array while in edit mode.
    //Does not push undo (callers do that) and does not update the URL (that happens on mode switch).
    const board = this.board;
    const newWidth = newMines.length;
    const newHeight = newMines[0].length;
    const sizeChanged = newWidth !== board.width || newHeight !== board.height;

    this.cancelSession();

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

    this.pushUndoSnapshot();
    this.replaceMines(BoardEdit.createEmptyMines(size.width, size.height), {
      clearPath: true,
    });
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

    const oldMines = this.board.mines;
    const newMines = BoardEdit.createEmptyMines(size.width, size.height);
    const overlapWidth = Math.min(size.width, oldMines.length);
    const overlapHeight = Math.min(size.height, oldMines[0].length);
    for (let x = 0; x < overlapWidth; x++) {
      for (let y = 0; y < overlapHeight; y++) {
        newMines[x][y] = oldMines[x][y];
      }
    }

    this.pushUndoSnapshot();
    this.replaceMines(newMines, { clearPath: true });
  }

  promptForClearingEditBoard() {
    //Prompt for clearing the edit board.

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
      this.pushUndoSnapshot();
      this.replaceMines(
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
