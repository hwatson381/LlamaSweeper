import CONSTANTS from "src/includes/Constants";
import Utils from "src/classes/Utils";

import { Dialog } from "quasar";

import {
  variant,
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
