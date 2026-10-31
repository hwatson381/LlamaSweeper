import CONSTANTS from "src/includes/Constants";
import Utils from "src/classes/Utils";
import Algorithms from "src/classes/Algorithms";

import { Dialog, Notify } from "quasar";

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
  editFillPanelOpen,
  editDragInProgress,
  editDragPaint,
  editOverwrite,
  analyseLastAlgorithm,
} from "src/composables/useSettings";

//Approximate cap on each variant's undo stack. Redo needs no cap of its own as it only ever holds entries moved from undo.
const MAX_UNDO_BYTES = 250 * 1024;

class BoardEdit {
  constructor(board) {
    this.board = board;

    //Undo/redo stacks are per variant. Snapshots are { w, h, data, startData } where bit (x * h + y) of data is 1 for a mine
    //startData is the same for start markings, or null on variants without them.
    //undoBytes is the running total size of the snapshots in undo.
    this.stacks = {
      "board editor": { undo: [], redo: [], undoBytes: 0 },
      "zini explorer": { undo: [], redo: [], undoBytes: 0 },
    };

    //In-progress rect/lasso drag, or null. { tool, startX, startY, endX, endY } in tile coords.
    //A lasso drag also has { originX, originY, lastX, lastY (unfloored), marked[x][y], mask[x][y], bounds }
    this.drag = null;

    //Current selection, or null. floating is in its own local coords and never clipped:
    //{ base[x][y], baseStart[x][y], floating: { mask[i][j], mines[i][j], start[i][j], w, h, centreX, centreY }, sourceTool }
    //base/baseStart are the committed board with the selected cells cleared. Committed mines stay in board.mines until commitSession.
    //start is tracked even where start markings aren't used (zini explorer) and just discarded on commit.
    this.session = null;

    //In-progress drag of the floating content: { startX, startY, originCentreX, originCentreY }, or null
    this.moveDrag = null;

    //In-progress toggle/start tool drag, or null. { tool, value, lastX, lastY, undoPushed } where value is what is being painted
    this.paintDrag = null;

    //Tool that was active before a paste switched to the clipboard's tool, restored when the pasted selection is closed
    this.toolBeforePaste = null;

    //Top left of the last paste or duplicate, used to spot a selection that shouldn't be pasted over
    this.lastPlacedTopLeft = null;

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
          if (!this.drag.mask || this.drag.mask[x][y]) {
            tilesArray[x][y].selectedState = "preview";
          }
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
    editFillPanelOpen.value = Boolean(this.fillPanelBackup);
    editDragInProgress.value = Boolean(this.drag || this.moveDrag);

    if (!this.session) {
      editSelectionBox.value = null;
      this.board.boardInput?.setEditMoveCursor(false);
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

  getDisplayedLayer(baseLayer, floatingLayer) {
    //Base with the floating content overlaid, clipped to the board
    const floating = this.session.floating;
    const displayed = baseLayer.map((column) => column.slice());
    const topLeft = this.getFloatingTopLeft(floating);
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        const x = topLeft.x + i;
        const y = topLeft.y + j;
        if (floating.mask[i][j] && this.board.checkCoordsInBounds(x, y)) {
          //Without overwrite, values already on the board stay
          displayed[x][y] =
            floatingLayer[i][j] || (!editOverwrite.value && displayed[x][y]);
        }
      }
    }
    return displayed;
  }

  getDisplayedMines() {
    return this.getDisplayedLayer(
      this.session.base,
      this.session.floating.mines
    );
  }

  getDisplayedStart() {
    return this.getDisplayedLayer(
      this.session.baseStart,
      this.session.floating.start
    );
  }

  getStartGrid() {
    return (
      this.board.startMarks ??
      BoardEdit.createEmptyMines(this.board.width, this.board.height)
    );
  }

  refreshSessionDisplay() {
    if (!this.session) {
      return;
    }
    this.redisplay();
    this.board.boardRenderer.draw();
  }

  redisplay() {
    //Show the session's current content on the tiles (or the committed mines if there is no session). Caller redraws.
    const mines = this.session ? this.getDisplayedMines() : this.board.mines;
    const start = this.session
      ? this.getDisplayedStart()
      : this.board.startMarks;
    this.openBoardForEdit(mines, start);
    const mineCount = mines.flat().filter((val) => val).length;
    this.board.mineCount = mineCount;
    this.board.unflagged = mineCount;
    this.refreshSelectedStates();
  }

  getDragRect() {
    if (this.drag.bounds) {
      return this.drag.bounds; //lasso
    }
    return {
      minX: Math.min(this.drag.startX, this.drag.endX),
      maxX: Math.max(this.drag.startX, this.drag.endX),
      minY: Math.min(this.drag.startY, this.drag.endY),
      maxY: Math.max(this.drag.startY, this.drag.endY),
    };
  }

  isTileInSelection(tileX, tileY) {
    return (
      Boolean(this.session) &&
      this.board.checkCoordsInBounds(tileX, tileY) &&
      this.board.tilesArray[tileX][tileY].selectedState === "final"
    );
  }

  beginDrag(tileX, tileY) {
    //Returns true if the drag was captured. Caller redraws.
    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      return false;
    }

    const tool = editTool.value;
    if (tool === "toggle" || tool === "start") {
      if (!editDragPaint.value) {
        return false;
      }

      //Starting on an unset tile paints the value on, starting on a set tile paints it off
      const grid = tool === "start" ? this.board.startMarks : this.board.mines;
      this.paintDrag = {
        tool,
        value: !grid[tileX][tileY],
        lastX: tileX,
        lastY: tileY,
        undoPushed: false,
      };
      if (this.paintTile(tileX, tileY)) {
        this.openBoardForEdit();
      }
      return true;
    }

    if (this.isTileInSelection(tileX, tileY)) {
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

    if (tool !== "rect" && tool !== "lasso") {
      return false;
    }

    this.commitSession();
    this.drag = {
      tool,
      startX: tileX,
      startY: tileY,
      endX: tileX,
      endY: tileY,
    };
    if (tool === "lasso") {
      //The true pointer position is unknown here, so start from the middle of the tile
      this.drag.originX = this.drag.lastX = tileX + 0.5;
      this.drag.originY = this.drag.lastY = tileY + 0.5;
      this.drag.marked = BoardEdit.createEmptyMines(
        this.board.width,
        this.board.height
      );
      this.drag.marked[tileX][tileY] = true;
      this.updateLassoMask();
    }
    this.refreshSelectedStates();
    return true;
  }

  paintTile(tileX, tileY) {
    //Sets a tile to the value being painted by the current paint drag. Returns true if it changed. Caller refreshes the numbers.
    const drag = this.paintDrag;
    const grid =
      drag.tool === "start" ? this.board.startMarks : this.board.mines;
    if (
      !this.board.checkCoordsInBounds(tileX, tileY) ||
      grid[tileX][tileY] === drag.value
    ) {
      return false;
    }

    if (!drag.undoPushed) {
      this.pushUndoSnapshot(); //One undo step for the whole drag
      drag.undoPushed = true;
    }

    grid[tileX][tileY] = drag.value;
    if (drag.tool === "toggle") {
      this.board.mineCount += drag.value ? 1 : -1;
      this.board.unflagged = this.board.mineCount;
      analyseLastAlgorithm.value = "Custom";
    }
    return true;
  }

  static markSegment(grid, x0, y0, x1, y1) {
    //Marks the tiles a line between two unfloored tile coords passes through. Sampled at least every quarter tile so
    //consecutive marks are 8-connected, which is enough to stop a 4-connected flood fill leaking through.
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.25));
    const maxX = grid.length - 1;
    const maxY = grid[0].length - 1;
    for (let s = 0; s <= steps; s++) {
      const x = Utils.clamp(Math.floor(x0 + ((x1 - x0) * s) / steps), 0, maxX);
      const y = Utils.clamp(Math.floor(y0 + ((y1 - y0) * s) / steps), 0, maxY);
      grid[x][y] = true;
    }
  }

  updateLassoMask() {
    //Selects everything enclosed by the path, with the path closed by a line from the pointer back to the start.
    //Overlapping loops are a union, not XOR: anything the flood fill from outside the board can't reach is selected.
    const drag = this.drag;
    const width = this.board.width;
    const height = this.board.height;

    const boundary = drag.marked.map((column) => column.slice());
    BoardEdit.markSegment(
      boundary,
      drag.lastX,
      drag.lastY,
      drag.originX,
      drag.originY
    );

    const outside = BoardEdit.createEmptyMines(width, height);
    const stack = [];
    const visit = (x, y) => {
      if (!boundary[x][y] && !outside[x][y]) {
        outside[x][y] = true;
        stack.push([x, y]);
      }
    };
    for (let x = 0; x < width; x++) {
      visit(x, 0);
      visit(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      visit(0, y);
      visit(width - 1, y);
    }
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x > 0) visit(x - 1, y);
      if (x < width - 1) visit(x + 1, y);
      if (y > 0) visit(x, y - 1);
      if (y < height - 1) visit(x, y + 1);
    }

    const bounds = { minX: Infinity, maxX: -1, minY: Infinity, maxY: -1 };
    drag.mask = outside.map((column, x) =>
      column.map((isOutside, y) => {
        if (isOutside) {
          return false;
        }
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
        return true;
      })
    );
    drag.bounds = bounds;
  }

  updateDrag(unflooredCoords) {
    //Returns true if the preview changed
    if (this.paintDrag) {
      const drag = this.paintDrag;
      const tileX = Math.floor(unflooredCoords.tileX);
      const tileY = Math.floor(unflooredCoords.tileY);
      if (tileX === drag.lastX && tileY === drag.lastY) {
        return false;
      }

      //Bresenham from the last tile so a fast drag doesn't leave gaps
      const dx = Math.abs(tileX - drag.lastX);
      const dy = Math.abs(tileY - drag.lastY);
      const stepX = drag.lastX < tileX ? 1 : -1;
      const stepY = drag.lastY < tileY ? 1 : -1;
      let err = dx - dy;
      let x = drag.lastX;
      let y = drag.lastY;
      let changed = false;
      while (x !== tileX || y !== tileY) {
        const doubleErr = 2 * err;
        if (doubleErr > -dy) {
          err -= dy;
          x += stepX;
        }
        if (doubleErr < dx) {
          err += dx;
          y += stepY;
        }
        changed = this.paintTile(x, y) || changed;
      }

      drag.lastX = tileX;
      drag.lastY = tileY;
      if (changed) {
        this.openBoardForEdit();
      }
      return changed;
    }
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

    if (this.drag.tool === "lasso") {
      //Just under the board edge so the floor stays on the board
      const pointX = Utils.clamp(
        unflooredCoords.tileX,
        0,
        this.board.width - 1e-6
      );
      const pointY = Utils.clamp(
        unflooredCoords.tileY,
        0,
        this.board.height - 1e-6
      );
      BoardEdit.markSegment(
        this.drag.marked,
        this.drag.lastX,
        this.drag.lastY,
        pointX,
        pointY
      );
      this.drag.lastX = pointX;
      this.drag.lastY = pointY;

      const tileX = Math.floor(pointX);
      const tileY = Math.floor(pointY);
      if (tileX === this.drag.endX && tileY === this.drag.endY) {
        return false;
      }

      this.drag.endX = tileX;
      this.drag.endY = tileY;
      this.updateLassoMask();
      this.refreshSelectedStates();
      return true;
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
    if (this.paintDrag) {
      this.paintDrag = null;
      return;
    }

    if (this.moveDrag) {
      this.moveDrag = null;
      this.syncSelectionUi();
      return;
    }

    if (!this.drag) {
      return;
    }

    if (this.drag.tool === "lasso") {
      this.updateLassoMask(); //The last move may not have refreshed it
    }

    const { minX, maxX, minY, maxY } = this.getDragRect();
    if (minX === maxX && minY === maxY) {
      //A drag that stays on one tile is a click/tap, which deselects rather than selecting a single tile
      this.drag = null;
      const priorTool = this.toolBeforePaste;
      this.toolBeforePaste = null;
      this.refreshSelectedStates();
      if (priorTool) {
        editTool.value = priorTool;
      }
      return;
    }

    //A real selection means the user is now selecting, so don't revert the tool afterwards
    this.toolBeforePaste = null;
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const mask = BoardEdit.createEmptyMines(w, h);
    const mines = BoardEdit.createEmptyMines(w, h);
    const start = BoardEdit.createEmptyMines(w, h);
    const startGrid = this.getStartGrid();
    const base = this.board.mines.map((column) => column.slice());
    const baseStart = startGrid.map((column) => column.slice());
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        if (this.drag.mask && !this.drag.mask[minX + i][minY + j]) {
          continue;
        }
        mask[i][j] = true;
        mines[i][j] = this.board.mines[minX + i][minY + j];
        start[i][j] = startGrid[minX + i][minY + j];
        base[minX + i][minY + j] = false;
        baseStart[minX + i][minY + j] = false;
      }
    }

    const sourceTool = this.drag.tool;
    this.drag = null;
    this.session = {
      base,
      baseStart,
      floating: {
        mask,
        mines,
        start,
        w,
        h,
        centreX: minX + w / 2,
        centreY: minY + h / 2,
      },
      sourceTool,
    };
    this.refreshSelectedStates();
  }

  cancelDrag() {
    this.drag = null;
    this.moveDrag = null;
    this.paintDrag = null;
    this.refreshSelectedStates();
  }

  clearSelectionState() {
    this.drag = null;
    this.moveDrag = null;
    this.paintDrag = null;
    this.session = null;
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
    const displayedStart = this.getDisplayedStart();
    const changed =
      !BoardEdit.minesEqual(displayed, this.board.mines) ||
      (this.board.startMarks !== null &&
        !BoardEdit.minesEqual(displayedStart, this.board.startMarks));
    if (!changed) {
      this.cancelSession();
      return;
    }

    //board.variant rather than variant.value as this can run while switching variant
    this.pushUndoSnapshot(this.board.variant);
    this.replaceMines(displayed, { newStart: displayedStart });
  }

  closeSelection() {
    const priorTool = this.toolBeforePaste;
    this.toolBeforePaste = null;
    this.commitSession();
    if (priorTool) {
      editTool.value = priorTool;
    }
    this.board.boardRenderer.draw();
  }

  handleToolChange() {
    //Pasting changes the tool to match the clipboard, which must not commit the pasted selection
    if (this.session && this.session.sourceTool === editTool.value) {
      return;
    }
    this.toolBeforePaste = null;
    this.closeSelection();
    if (this.board.gameStage === "edit") {
      this.redisplay(); //The Start tool changes how the board is shown
      this.board.boardRenderer.draw();
    }
  }

  transformFloating(newW, newH, mapCoords) {
    //mapCoords(i, j) gives the new local coords of the cell at local coords (i, j). Centre is kept.
    const floating = this.session.floating;
    const mask = BoardEdit.createEmptyMines(newW, newH);
    const mines = BoardEdit.createEmptyMines(newW, newH);
    const start = BoardEdit.createEmptyMines(newW, newH);
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        const [newI, newJ] = mapCoords(i, j);
        mask[newI][newJ] = floating.mask[i][j];
        mines[newI][newJ] = floating.mines[i][j];
        start[newI][newJ] = floating.start[i][j];
      }
    }

    floating.mask = mask;
    floating.mines = mines;
    floating.start = start;
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

    this.fillPanelBackup = null; //Reachable by shortcut while the percentage panel is open
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

  setSelectionStart(isStart) {
    //Mark or unmark every selected cell as starting position
    if (!this.session) {
      return;
    }

    const floating = this.session.floating;
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        if (floating.mask[i][j]) {
          floating.start[i][j] = isStart;
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
    const displayedStart = this.getDisplayedStart();

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
      const croppedStart = BoardEdit.createEmptyMines(
        maxX - minX + 1,
        maxY - minY + 1
      );
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          cropped[x - minX][y - minY] = displayed[x][y];
          croppedStart[x - minX][y - minY] = displayedStart[x][y];
        }
      }

      //Undoes the whole selection session in one step as it snapshots the committed board
      this.replaceMinesWithUndo(cropped, {
        clearPath: true,
        newStart: this.board.startMarks ? croppedStart : undefined,
      });
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

  getStartForVariant(variantName) {
    return variantName === "board editor" ? this.board.boardEditorStart : null;
  }

  static createEmptyMines(width, height) {
    return new Array(width).fill(0).map(() => new Array(height).fill(false));
  }

  static packGrid(grid) {
    const w = grid.length;
    const h = grid[0].length;
    const data = new Uint8Array(Math.ceil((w * h) / 8)); //Final byte may have unused bits
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        if (grid[x][y]) {
          const bitIndex = x * h + y;
          data[bitIndex >> 3] |= 1 << (bitIndex & 7);
        }
      }
    }
    return data;
  }

  static unpackGrid(data, w, h) {
    const grid = BoardEdit.createEmptyMines(w, h);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const bitIndex = x * h + y;
        grid[x][y] = (data[bitIndex >> 3] & (1 << (bitIndex & 7))) !== 0;
      }
    }
    return grid;
  }

  static packMines(mines, start) {
    return {
      w: mines.length,
      h: mines[0].length,
      data: BoardEdit.packGrid(mines),
      startData: start ? BoardEdit.packGrid(start) : null,
    };
  }

  static unpackMines(snapshot) {
    return BoardEdit.unpackGrid(snapshot.data, snapshot.w, snapshot.h);
  }

  static unpackStart(snapshot) {
    return snapshot.startData
      ? BoardEdit.unpackGrid(snapshot.startData, snapshot.w, snapshot.h)
      : null;
  }

  static snapshotBytes(snapshot) {
    return snapshot.data.byteLength + (snapshot.startData?.byteLength ?? 0);
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

    this.pushOntoUndo(
      stack,
      BoardEdit.packMines(mines, this.getStartForVariant(variantName))
    );
    stack.redo = [];
    this.refreshUndoRedoState();
  }

  pushOntoUndo(stack, snapshot) {
    stack.undo.push(snapshot);
    stack.undoBytes += BoardEdit.snapshotBytes(snapshot);

    //Drop oldest entries until under the cap, but always keep the newest
    while (stack.undoBytes > MAX_UNDO_BYTES && stack.undo.length > 1) {
      stack.undoBytes -= BoardEdit.snapshotBytes(stack.undo.shift());
    }
  }

  popFromUndo(stack) {
    const snapshot = stack.undo.pop();
    stack.undoBytes -= BoardEdit.snapshotBytes(snapshot);
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

    stack.redo.push(
      BoardEdit.packMines(this.board.mines, this.board.startMarks)
    );
    const snapshot = this.popFromUndo(stack);
    this.replaceMines(BoardEdit.unpackMines(snapshot), {
      newStart: BoardEdit.unpackStart(snapshot),
    });
    this.refreshUndoRedoState();
  }

  redo() {
    const stack = this.stacks[variant.value];
    if (this.board.gameStage !== "edit" || !stack || stack.redo.length === 0) {
      return;
    }

    this.pushOntoUndo(
      stack,
      BoardEdit.packMines(this.board.mines, this.board.startMarks)
    );
    const snapshot = stack.redo.pop();
    this.replaceMines(BoardEdit.unpackMines(snapshot), {
      newStart: BoardEdit.unpackStart(snapshot),
    });
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
    const startChanged =
      options?.newStart &&
      !BoardEdit.minesEqual(options.newStart, this.board.startMarks);
    if (!BoardEdit.minesEqual(newMines, this.board.mines) || startChanged) {
      this.pushUndoSnapshot();
    }
    this.replaceMines(newMines, options);
  }

  replaceMines(newMines, { clearPath = false, newStart } = {}) {
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
      board.boardEditorStart =
        newStart ?? BoardEdit.createEmptyMines(newWidth, newHeight);
      board.startMarks = board.boardEditorStart;
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

    if (editTool.value === "start") {
      this.board.startMarks[tileX][tileY] =
        !this.board.startMarks[tileX][tileY];
      this.openBoardForEdit();
      return;
    }

    const isAddingMines = !this.board.mines[tileX][tileY]; //adding a mine or removing it?

    this.board.mines[tileX][tileY] = !this.board.mines[tileX][tileY]; //toggle the mine

    this.board.mineCount += isAddingMines ? 1 : -1;
    this.board.unflagged = this.board.mineCount;
    analyseLastAlgorithm.value = "Custom";

    this.openBoardForEdit(); //refreshes all numbers. Maybe too inefficient?
  }

  openBoardForEdit(mines = this.board.mines, start = this.board.startMarks) {
    //Update tilesArray such that it corresponds to an open board with mines as per the given mine board.
    //start (optional) is the start markings, which are drawn as a corner marker and previewed while the Start tool is active.
    const board = this.board;
    if (!board.startMarks) {
      start = null;
    }

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

    this.applyStartMarks(mines, start);
  }

  applyStartMarks(mines, start) {
    const board = this.board;
    const isPreview = Boolean(start) && editTool.value === "start";
    const revealed = isPreview ? this.getStartRevealed(mines, start) : null;

    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        const tile = board.tilesArray[x][y];
        tile.startMarked = Boolean(start) && start[x][y];
        tile.unrevealedState = null;
        if (!isPreview) {
          continue;
        }

        //Preview what the player would see: marked mines flagged, marked safe tiles (and their openings) revealed, the rest faded
        if (mines[x][y]) {
          if (start[x][y]) {
            tile.state = CONSTANTS.FLAG;
          } else {
            tile.state = CONSTANTS.UNREVEALED;
            tile.unrevealedState = "tr2_mine";
          }
        } else if (!revealed[x][y]) {
          tile.unrevealedState = "tr2_" + tile.state;
          tile.state = CONSTANTS.UNREVEALED;
        }
      }
    }
  }

  getStartRevealed(mines, start) {
    //Safe tiles opened by the start markings, including the openings spreading from marked zeros. Needs tile numbers to be up to date.
    const board = this.board;
    const revealed = BoardEdit.createEmptyMines(board.width, board.height);
    const stack = [];
    const reveal = (x, y) => {
      if (!board.checkCoordsInBounds(x, y) || mines[x][y] || revealed[x][y]) {
        return;
      }
      revealed[x][y] = true;
      if (board.tilesArray[x][y].state === 0) {
        stack.push([x, y]);
      }
    };

    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        if (start[x][y]) {
          reveal(x, y);
        }
      }
    }
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      for (let i = x - 1; i <= x + 1; i++) {
        for (let j = y - 1; j <= y + 1; j++) {
          reveal(i, j);
        }
      }
    }
    return revealed;
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
      {
        clearPath: true,
        newStart: this.board.startMarks
          ? BoardEdit.createEmptyMines(size.width, size.height)
          : undefined,
      }
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
    const oldStart = this.board.startMarks;
    const newStart = oldStart
      ? BoardEdit.createEmptyMines(size.width, size.height)
      : undefined;
    const overlapWidth = Math.min(size.width, oldMines.length);
    const overlapHeight = Math.min(size.height, oldMines[0].length);
    for (let x = 0; x < overlapWidth; x++) {
      for (let y = 0; y < overlapHeight; y++) {
        newMines[x][y] = oldMines[x][y];
        if (oldStart) {
          newStart[x][y] = oldStart[x][y];
        }
      }
    }

    this.replaceMinesWithUndo(newMines, { clearPath: true, newStart });
  }

  promptForClearingEditBoard() {
    //Prompt for clearing the edit board.

    this.commitSession();

    //Check if already empty
    if (
      !this.board.mines.some((column) => column.some((val) => val)) &&
      !this.board.startMarks?.some((column) => column.some((val) => val))
    ) {
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
        {
          clearPath: true,
          newStart: this.board.startMarks
            ? BoardEdit.createEmptyMines(this.board.width, this.board.height)
            : undefined,
        }
      );
    });
  }

  //---- Clipboard ----

  copySelection(message = "Selection copied") {
    if (!this.session) {
      return;
    }

    const { floating, sourceTool } = this.session;
    const topLeft = this.getFloatingTopLeft(floating);
    let mask = "";
    let mines = "";
    let start = "";
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        mask += floating.mask[i][j] ? "1" : "0";
        mines += floating.mines[i][j] ? "1" : "0";
        start += floating.start[i][j] ? "1" : "0";
      }
    }

    editClipboard.value = {
      v: 1,
      w: floating.w,
      h: floating.h,
      x: topLeft.x,
      y: topLeft.y,
      tool: sourceTool,
      mask,
      mines,
      start,
    };

    Notify.create({ message, color: "purple", timeout: 1000 });
  }

  cutSelection() {
    if (!this.session) {
      return;
    }

    this.copySelection("Selection cut");
    const floating = this.session.floating;
    for (let i = 0; i < floating.w; i++) {
      for (let j = 0; j < floating.h; j++) {
        if (floating.mask[i][j]) {
          floating.mines[i][j] = false;
          floating.start[i][j] = false;
        }
      }
    }
    this.closeSelection();
  }

  duplicateSelection() {
    //Commits the selection in place, then selects a copy beside it (right, else below, else offset diagonally)
    if (!this.session) {
      return;
    }

    const { floating, sourceTool } = this.session;
    const { w, h } = floating;
    const copy = {
      mask: floating.mask.map((column) => column.slice()),
      mines: floating.mines.map((column) => column.slice()),
      start: floating.start.map((column) => column.slice()),
      w,
      h,
    };

    const topLeft = this.getFloatingTopLeft(floating);
    const { x: newX, y: newY } = this.findAdjacentSpot(
      topLeft.x,
      topLeft.y,
      w,
      h
    );

    this.commitSession();

    this.session = {
      base: this.board.mines.map((column) => column.slice()),
      baseStart: this.getStartGrid().map((column) => column.slice()),
      floating: { ...copy, centreX: newX + w / 2, centreY: newY + h / 2 },
      sourceTool,
    };
    this.lastPlacedTopLeft = { x: newX, y: newY };
    this.redisplay();
    this.board.boardRenderer.draw();
  }

  findAdjacentSpot(x, y, w, h) {
    //Right of the rect, else below, else offset diagonally
    const fits = (px, py) =>
      px >= 0 &&
      py >= 0 &&
      px + w <= this.board.width &&
      py + h <= this.board.height;
    if (fits(x + w, y)) {
      return { x: x + w, y };
    }
    if (fits(x, y + h)) {
      return { x, y: y + h };
    }
    return { x: x + 1, y: y + 1 };
  }

  getPastePosition(clip, atPointer) {
    //Must run before commitSession clears the selection
    if (atPointer) {
      const input = this.board.boardInput;
      const { tileX, tileY } = input.eventToFlooredTileCoords(
        input.lastClientCoords
      );
      if (this.board.checkCoordsInBounds(tileX, tileY)) {
        return { x: tileX, y: tileY };
      }
    }
    if (this.session) {
      const floating = this.session.floating;
      const topLeft = this.getFloatingTopLeft(floating);
      const matches = (spot) =>
        spot && spot.x === topLeft.x && spot.y === topLeft.y;
      //A selection that is the copy source or the last paste/duplicate would just be pasted over
      if (matches(clip) || matches(this.lastPlacedTopLeft)) {
        return this.findAdjacentSpot(
          topLeft.x,
          topLeft.y,
          floating.w,
          floating.h
        );
      }
      return topLeft;
    }
    return this.findAdjacentSpot(clip.x, clip.y, clip.w, clip.h);
  }

  pasteClipboard({ atPointer = false } = {}) {
    if (this.board.gameStage !== "edit") {
      return;
    }

    const clip = this.parseClipboard();
    if (!clip) {
      return;
    }

    const pos = this.getPastePosition(clip, atPointer);
    const priorTool = this.toolBeforePaste ?? editTool.value;
    this.commitSession();

    const { w, h } = clip;
    const mask = BoardEdit.createEmptyMines(w, h);
    const mines = BoardEdit.createEmptyMines(w, h);
    const start = BoardEdit.createEmptyMines(w, h);
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        mask[i][j] = clip.mask[i * h + j] === "1";
        mines[i][j] = clip.mines[i * h + j] === "1";
        start[i][j] = clip.start[i * h + j] === "1";
      }
    }

    //Content bigger than the board on an axis is pinned to 0 there (clipped when the paste is applied)
    const x =
      w >= this.board.width ? 0 : Utils.clamp(pos.x, 0, this.board.width - w);
    const y =
      h >= this.board.height ? 0 : Utils.clamp(pos.y, 0, this.board.height - h);

    this.session = {
      base: this.board.mines.map((column) => column.slice()),
      baseStart: this.getStartGrid().map((column) => column.slice()),
      floating: {
        mask,
        mines,
        start,
        w,
        h,
        centreX: x + w / 2,
        centreY: y + h / 2,
      },
      sourceTool: clip.tool,
    };
    this.lastPlacedTopLeft = { x, y };
    this.toolBeforePaste = priorTool;
    editTool.value = clip.tool;
    this.redisplay();
    this.board.boardRenderer.draw();
  }

  parseClipboard() {
    //Returns the stored clipboard, or null if missing/corrupt/unknown version
    const raw = editClipboard.value;
    if (!raw || typeof raw !== "object" || raw.v !== 1) {
      return null;
    }

    const { w, h, x, y, tool, mask, mines, start } = raw;
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
      typeof start !== "string" ||
      mask.length !== w * h ||
      mines.length !== w * h ||
      start.length !== w * h ||
      !/^[01]+$/.test(mask) ||
      !/^[01]+$/.test(mines) ||
      !/^[01]+$/.test(start)
    ) {
      return null;
    }

    return { w, h, x, y, tool, mask, mines, start };
  }
}

export default BoardEdit;
