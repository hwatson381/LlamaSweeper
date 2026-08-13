import {
  watch,
} from "vue";

import BoardHistory from "src/classes/BoardHistory";
import Algorithms from "src/classes/Algorithms";
import Replay from "src/classes/Replay";
import CompareReplay from "src/classes/CompareReplay";
import BoardStats from "src/classes/BoardStats";
import effShuffleManager from "src/classes/EffShuffleManager";
import BoardGenerator from "src/classes/BoardGenerator";
import Tile from "src/classes/Tile";
import Utils from "src/classes/Utils";
import ZiniExplore from "src/classes/ZiniExplore";
import statsWorkerManager from "src/classes/StatsWorkerManager";
import BoardImportExport from "src/classes/BoardImportExport";
import BoardRenderer from "src/classes/BoardRenderer";
import BoardHint from "src/classes/BoardHint";
import QuickPaint from "src/classes/QuickPaint";
import MeanOpenings from "src/classes/MeanOpenings";
import BoardInput from "src/classes/BoardInput";
import BoardActions from "src/classes/BoardActions";

import CONSTANTS from "src/includes/Constants";

import { Dialog } from "quasar"

import {
  showStatsBlock,
  tileSizeSlider,
  boardWidth,
  boardHeight,
  boardMines,
  variant,
  zeroStart,
  noGuessing,
  noGuessingMaxAttempts,
  showQuickPaintOptions,
  quickPaintModeDisplay,
  editBoardUnappliedWidth,
  editBoardUnappliedHeight,
  isCurrentlyEditModeDisplay,
  flagToggleActive,
  flagToggleShowReset,
  replayIsShown,
  reorderZini,
  ziniRunnerActive,
  chordingButtons
} from "src/composables/useSettings";

class Board {
  constructor(mainCanvas, gameContainerDiv, route, router) {
    //injected dependencies
    this.mainCanvas = mainCanvas;
    this.mainCanvasCtx = this.mainCanvas.value.getContext("2d"); //save ctx for performance
    this.gameContainerDiv = gameContainerDiv;
    this.route = route;
    this.router = router;

    this.gameStage = "uninitialised";

    //Boards used for "edit board" variant and "zini board" variant. These persist across resets.
    this.boardEditorMines = new Array(9)
      .fill(0)
      .map(() => new Array(9).fill(false));
    this.ziniExplorerMines = new Array(9)
      .fill(0)
      .map(() => new Array(9).fill(false));
    this.editingEditBoard = true;
    this.editingZiniBoard = true;

    this.ziniExplore = new ZiniExplore(this);
    this.boardImportExport = new BoardImportExport(this);
    this.boardRenderer = new BoardRenderer(this);
    this.boardHint = new BoardHint(this);
    this.quickPaint = new QuickPaint(this);
    this.meanOpenings = new MeanOpenings(this);
    this.boardInput = new BoardInput(this);
    this.boardActions = new BoardActions(this);

    this.stopUrlWatch = watch(
      [() => this.route.params.variant, () => this.route.query],
      ([newUrlVariant, newQuery], [oldUrlVariant, oldQuery]) => {
        this.updateForUrlChange(
          newUrlVariant,
          newQuery,
          oldUrlVariant,
          oldQuery
        );
      },
      { immediate: true }
    );

    this.resetBoard(true);
  }

  resetBoard(isVariantChange = false) {
    this.regenerateUrlAndPushIfDifferent();
    if (
      !isVariantChange &&
      (this.variant === "board editor" || this.variant === "zini explorer") &&
      this.gameStage === "edit"
    ) {
      this.promptForClearingEditBoard();
      return;
    }

    if (
      isVariantChange &&
      (this.variant === "board editor" || this.variant === "zini explorer")
    ) {
      this.revertUnappliedWidthHeightSetting();
    }

    //Set to state of board pregame where everything is unrevealed and mines haven't been generated yet
    this.width = boardWidth.value;
    this.height = boardHeight.value;
    this.mineCount = boardMines.value;
    this.tileSize = tileSizeSlider.value;
    this.variant = variant.value;

    this.gameStage = "pregame";

    flagToggleShowReset.value = false;
    flagToggleActive.value = false;

    //Perhaps slightly confusing - for editable boards, set this.mines to refer to either the board editor or zini explorer.
    //This way it gets saved when we switch variants
    if (this.variant === "board editor") {
      this.mines = this.boardEditorMines;
    } else if (this.variant === "zini explorer") {
      this.mines = this.ziniExplorerMines;
    } else {
      this.meanOpenings.unprocessedMeanZeros = [];
      this.meanOpenings.meanMineStates = null; //Only matters for mean openings variant
      this.mines = null;
    }

    //board editor/zini explorer use different width/height/mines
    if (this.variant === "board editor" || this.variant === "zini explorer") {
      this.width = this.mines.length;
      this.height = this.mines[0].length;
      this.mineCount = this.mines.flat().filter((val) => val).length;
    }

    if (this.variant === "board editor" && this.editingEditBoard) {
      this.gameStage = "edit";
      isCurrentlyEditModeDisplay.value = true;
    } else if (this.variant === "zini explorer" && this.editingZiniBoard) {
      this.gameStage = "edit";
      isCurrentlyEditModeDisplay.value = true;
    } else if (this.variant === "zini explorer" && !this.editingZiniBoard) {
      this.gameStage = "analyse";
      isCurrentlyEditModeDisplay.value = false;
    } else {
      this.gameStage = "pregame";
      isCurrentlyEditModeDisplay.value = false;
    }

    this.boardInput.resetInteractionState();

    this.resetTiles();

    if (this.gameStage === "edit") {
      this.openBoardForEdit();
    }

    this.blasted = false;
    this.openedTiles = 0;
    if (this.ziniExplore) {
      this.ziniExplore.killDeepChainZiniRunner();
    }
    if (this.stats) {
      this.stats.killDeepChainZiniRunner();
    }
    if (statsWorkerManager) {
      statsWorkerManager.incrementStatsLock();
      statsWorkerManager.incrementAutoHintLock();
    }
    this.stats = null;
    this.unflagged = this.mineCount;
    this.integerTimer = 0;
    this.boardStartTime = 0;
    this.cursor = { x: null, y: null };
    if (this.replay) {
      this.replay.pause();
      replayIsShown.value = false;
    }
    this.replay = null;

    this.boardRenderer.clearTimerTimeout();

    showStatsBlock.value = false;

    showQuickPaintOptions.value = false;
    quickPaintModeDisplay.value = "Known";
    this.quickPaint.resetQuickPaintState();

    this.boardHint.hintActive = false;
    this.boardHint.lastSquaresChangedForAutoHint = [];

    this.boardRenderer.updateBoardPixelDimensions();

    if (this.gameStage === "analyse") {
      if (!isVariantChange) {
        this.ziniExplore.clearCurrentPath();
      }
      this.ziniExplore.refreshForEditedBoard();
    }

    this.boardRenderer.draw();
  }

  resetTiles() {
    this.tilesArray = new Array(this.width)
      .fill(0)
      .map(() =>
        new Array(this.height)
          .fill(0)
          .map(() => new Tile(CONSTANTS.UNREVEALED, { mainCanvasCtx: this.mainCanvasCtx }))
      );
  }

  populateHiddenNumbers(type) {
    if (type === "none") {
      return;
    }

    //Transparent/dimmed numbers that can show during replays (amongst other use cases)
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.mines[x][y]) {
          switch (type) {
            case "mines":
              this.tilesArray[x][y].unrevealedState = "cl_mine";
              break;
            case "transparent":
              this.tilesArray[x][y].unrevealedState = "tr_mine";
              break;
            case "transparent2":
              this.tilesArray[x][y].unrevealedState = "cl_mine";
              break;
            case "transparent3":
              this.tilesArray[x][y].unrevealedState = "tr2_mine";
              break;
            /*
            case "closed numbers":
              this.tilesArray[x][y].unrevealedState = "cl_mine";
              break;
            */
            case "dimmed":
              this.tilesArray[x][y].unrevealedState = "dm_mine";
              break;
          }
        } else {
          const squareNumber = this.boardActions.getNumberSurroundingMines(x, y, false);
          switch (type) {
            case "mines":
              //mines only, so don't draw numbeds
              this.tilesArray[x][y].unrevealedState = CONSTANTS.UNREVEALED;
              break;
            case "transparent":
              this.tilesArray[x][y].unrevealedState = "tr_" + squareNumber;
              break;
            case "transparent2":
              this.tilesArray[x][y].unrevealedState = "tr_" + squareNumber;
              break;
            case "transparent3":
              this.tilesArray[x][y].unrevealedState = "tr2_" + squareNumber;
              break;
            /*
            case "closed numbers":
              this.tilesArray[x][y].unrevealedState = "cl_" + squareNumber;
              break;
            */
            case "dimmed":
              this.tilesArray[x][y].unrevealedState = "dm_" + squareNumber;
              break;
          }
        }
      }
    }
  }

  saveGameIfRunning() {
    console.log("saving game (need to implement)");

    //TODO - code to serialise this game and save to boardHistory
  }

  revertUnappliedWidthHeightSetting() {
    //For board editor and zini explorer, we use a different way to change board size.
    //Update the value shown for this in the width/height inputs to be the current value

    if (variant.value === "board editor") {
      editBoardUnappliedWidth.value = this.boardEditorMines.length;
      editBoardUnappliedHeight.value = this.boardEditorMines[0].length;
    } else if (variant.value === "zini explorer") {
      editBoardUnappliedWidth.value = this.ziniExplorerMines.length;
      editBoardUnappliedHeight.value = this.ziniExplorerMines[0].length;
    }
  }

  applyEditBoardWidthHeight() {
    if (
      typeof editBoardUnappliedWidth.value !== "number" ||
      typeof editBoardUnappliedHeight.value !== "number"
    ) {
      return;
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

    this.width = editBoardUnappliedWidth.value;
    this.height = editBoardUnappliedHeight.value;

    const newBoardMines = new Array(editBoardUnappliedWidth.value)
      .fill(0)
      .map(() => new Array(editBoardUnappliedHeight.value).fill(false));

    if (variant.value === "board editor") {
      this.boardEditorMines = newBoardMines;
      this.mines = this.boardEditorMines; //set mines as a reference to board editor mines
    } else if (variant.value === "zini explorer") {
      this.ziniExplore.killDeepChainZiniRunner(); //Just in case
      this.ziniExplorerMines = newBoardMines;
      this.mines = this.ziniExplorerMines; //set mines as a reference to zini explorer mines
      this.ziniExplore.clearCurrentPath();
    }

    this.switchToEditMode();

    this.boardRenderer.draw();
  }

  promptForClearingEditBoard() {
    //Prompt for clearing the edit board.

    //Check if already empty
    let isAlreadyEmpty = true;
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.mines[x][y]) {
          isAlreadyEmpty = false;
          break;
        }
      }
    }
    if (isAlreadyEmpty) {
      //Already empty, do nothing
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
      const newBoardMines = new Array(this.width)
        .fill(0)
        .map(() => new Array(this.height).fill(false));

      if (variant.value === "board editor") {
        this.boardEditorMines = newBoardMines;
        this.mines = this.boardEditorMines; //set mines as a reference to board editor mines
      } else if (variant.value === "zini explorer") {
        this.ziniExplorerMines = newBoardMines;
        this.mines = this.ziniExplorerMines; //set mines as a reference to zini explorer mines
        this.ziniExplore.clearCurrentPath();
      }

      this.switchToEditMode();

      this.boardRenderer.draw();
    });
  }

  openBoardForEdit() {
    //Update tilesArray such that it corresponds to an open board with mines as per the appropriate mine board.

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.mines[x][y]) {
          this.tilesArray[x][y].state = CONSTANTS.MINE;
          continue;
        }

        let tileNumber = 0;
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (!this.checkCoordsInBounds(i, j)) {
              continue;
            }

            if (this.mines[i][j]) {
              tileNumber++;
            }
          }
        }

        this.tilesArray[x][y].state = tileNumber;
      }
    }
  }

  generateBoard(tileX, tileY) {
    let rewrittenFirstClick = false; //Some generations will change where the first click is

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return { success: false };
    }

    const firstClick = {
      x: tileX,
      y: tileY,
    };

    if (this.variant === "eff boards") {
      const effBoardResult = BoardGenerator.effBoardShuffle(
        this.width,
        this.height,
        this.mineCount,
        firstClick,
        effShuffleManager
      );

      if (effBoardResult === false) {
        return { success: false }; //Failed to generate eff board
      }

      this.mines = effBoardResult.mines;

      if (effBoardResult.firstClick) {
        rewrittenFirstClick = effBoardResult.firstClick;
      }
    } else if (
      this.variant === "board editor" ||
      this.variant === "zini explorer"
    ) {
      //Do nothing as this.mines is constant on these modes, so doesn't need to be regenerated?
    } else if (this.variant === "mean openings") {
      //meanMineStates 2d array tracks which squares contain mines that will only show once an opening is opened
      this.meanOpenings.meanMineStates = new Array(this.width).fill(0).map(() =>
        new Array(this.height).fill(0).map(() => {
          let singleMeanSquare = {
            isMine: false, //all squares start off with no mean mines
            changedToMineTimestamp: null,
            startsFlagged: null, //if revealed, should be a flag or unrevealed?
            isActive: false, //used during replays - whether the square is "in play" (e.g. acts like a mine if it is one)
            isLocked: false, //whether the square's final state has been decided
          };
          return singleMeanSquare;
        })
      );
      this.meanOpenings.unprocessedMeanZeros = []; //List of recently opened coords that need processing to check if they can have a mean mine.

      if (noGuessing.value) {
        const ngResult = BoardGenerator.ngShuffle(
          this.width,
          this.height,
          this.mineCount,
          firstClick,
          noGuessingMaxAttempts.value
        );
        if (ngResult === false) {
          return { success: false }; //Failed to generate eff board
        }
        this.mines = ngResult;
      } else {
        this.mines = BoardGenerator.basicShuffle(
          this.width,
          this.height,
          this.mineCount,
          firstClick,
          zeroStart.value
        );
      }
    } else {
      if (noGuessing.value) {
        const ngResult = BoardGenerator.ngShuffle(
          this.width,
          this.height,
          this.mineCount,
          firstClick,
          noGuessingMaxAttempts.value
        );
        if (ngResult === false) {
          return { success: false }; //Failed to generate eff board
        }
        this.mines = ngResult;
      } else {
        this.mines = BoardGenerator.basicShuffle(
          this.width,
          this.height,
          this.mineCount,
          firstClick,
          zeroStart.value
        );
      }
    }

    //Refresh tiles
    this.resetTiles();

    this.stats = new BoardStats(this.mines, statsWorkerManager);
    if (noGuessing.value && this.variant !== "eff boards") {
      this.stats.addNoGuessAttribute();
    }
    this.stats.addVariantAttribute(this.variant);
    if (chordingButtons.value === 'l') {
      this.stats.addSuperClickAttribute(); //they could just change during a game, but not important enough for that to force a reset
    }
    this.boardStartTime = performance.now();
    this.boardRenderer.clearTimerTimeout(); //defensive as it should already be disabled since we reset board.
    this.boardRenderer.updateTimerSetTimeoutHandle = setTimeout(
      this.boardRenderer.updateIntegerTimerIfNeeded.bind(this.boardRenderer),
      100
    );

    return { success: true, rewrittenFirstClick: rewrittenFirstClick };
  }

  getTime() {
    return (performance.now() - this.boardStartTime) / 1000;
  }

  checkCoordsInBounds(tileX, tileY) {
    if (tileX === null || tileY === null) {
      //Just in case
      return false;
    }

    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return false;
    }

    return true;
  }

  unflooredToFlooredTileCoords(tileX, tileY) {
    //Floors both tileX and tileY
    return { tileX: Math.floor(tileX), tileY: Math.floor(tileY) };
  }

  calculateAndDisplayStats(isWin) {
    if (this.variant === "mean openings") {
      let simplifiedTilesArray = this.meanOpenings.getSimplifiedTilesArray();
      this.stats.calcStats(isWin, simplifiedTilesArray);
    } else {
      this.stats.calcStats(isWin, this.tilesArray);
    }
    showStatsBlock.value = true;
  }

  handleEditClick(tileX, tileY) {
    //Click on the edit board - typically will toggle a mine
    if (!this.checkCoordsInBounds(tileX, tileY)) {
      return; //just incase
    }

    const isAddingMines = !this.mines[tileX][tileY]; //adding a mine or removing it?

    this.mines[tileX][tileY] = !this.mines[tileX][tileY]; //toggle the mine

    this.mineCount += isAddingMines ? 1 : -1;
    this.unflagged = this.mineCount;

    this.openBoardForEdit(); //refreshes all numbers. Maybe too inefficient?
  }

  handleReplayClick(tileX, tileY) {
    //clicks on replay board will try to jump to timestamp before square is revealed

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      return; //just incase
    }

    if (this.replay) {
      this.replay.handleReplayClick(tileX, tileY);
    }
  }

  handleZiniExploreClick(tileX, tileY, isDigInput, isFlagInput) {
    if (!this.checkCoordsInBounds(tileX, tileY)) {
      return; //just incase
    }

    this.ziniExplore.handleZiniExploreClick(
      tileX,
      tileY,
      isDigInput,
      isFlagInput
    );
  }

  switchToEditMode() {
    if (this.variant === "board editor") {
      this.editingEditBoard = true;
      //this.gameStage = "edit"; //commented out as gets set from resetBoard
      //isCurrentlyEditModeDisplay.value = true; //commented out as gets set from resetBoard
      this.resetBoard(true); //force a harder reset as if we were switching variants
    } else if (this.variant === "zini explorer") {
      this.ziniExplore.killDeepChainZiniRunner(); //just in case
      this.editingZiniBoard = true;
      //this.gameStage = "edit"; //commented out as gets set from resetBoard
      //isCurrentlyEditModeDisplay.value = true; //commented out as gets set from resetBoard
      this.resetBoard(true); //force a harder reset as if we were switching variants
    } else {
      //do nothing
    }

    this.boardRenderer.draw();
  }

  switchToPlayMode() {
    if (this.variant === "board editor") {
      this.editingEditBoard = false;
      this.gameStage = "pregame";
      isCurrentlyEditModeDisplay.value = false;
      this.resetBoard();
    } else if (this.variant === "zini explorer") {
      throw new Error("Play mode not available on zini explorer");
    } else {
      //do nothing
    }

    this.boardRenderer.draw();
  }

  switchToAnalyseMode(skipAskForPathReset = false) {
    if (this.variant === "board editor") {
      throw new Error("Analyse mode not available on board editor");
    } else if (this.variant === "zini explorer") {
      this.ziniExplore.killDeepChainZiniRunner(); //just in case
      this.editingZiniBoard = false;
      this.gameStage = "analyse";
      isCurrentlyEditModeDisplay.value = false;
      //this.resetBoard(); //Is this needed?
      this.ziniExplore.refreshForEditedBoard(skipAskForPathReset);
      this.regenerateUrlAndPushIfDifferent();
    } else {
      //do nothing
    }

    this.boardRenderer.draw();
  }

  toggleFlagButton() {
    if (flagToggleShowReset.value) {
      this.resetBoard(false);
    } else {
      flagToggleActive.value = !flagToggleActive.value;
    }
  }

  initReplay(replayToInit) {
    let replayParams;
    let isReorderableZini = false;

    switch (replayToInit) {
      case "replay":
        replayParams = {
          clicks: this.stats.clicks,
          moves: this.stats.moves,
          board: this,
          isWin: this.stats.isWin,
          forceSteppy: false,
        };
        isReorderableZini = false;
        break;
      case "8-way":
        if (this.stats.eightZini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.eightZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "womzini":
        if (this.stats.womZini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.womZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "womzinifix":
        if (this.stats.womZini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.cWomZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "womhzini":
        if (this.stats.womHzini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.womHziniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = false;
        break;
      case "chainzini":
        if (this.stats.chainZini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.chainZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "deepchain":
        if (this.stats.deepZini === null) {
          throw new Error("DeepChain should already be set");
        }
        replayParams = {
          clicks: this.stats.deepZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "compare":
        let compareReplay = CompareReplay.generate(
          this.mines,
          this.stats.clicks,
          this.stats.isWin
        );
        if (compareReplay.ziniDeltas.size === 0) {
          Dialog.create({
            title: "Alert",
            message: "No click losses/gains found",
          });
          return;
        }
        replayParams = {
          clicks: compareReplay.clicks,
          board: this,
          isWin: this.stats.isWin,
          forceSteppy: false,
          analysis: {
            ziniDeltas: compareReplay.ziniDeltas,
          },
        };
        isReorderableZini = false;
        break;
      case "zini-explore-replay":
        replayParams = {
          clicks: this.ziniExplore.classicPath,
          board: this,
          forceSteppy: true,
          isComplete: this.ziniExplore.getIsComplete(),
        };
        isReorderableZini = false;
        break;
      default:
        window.alert("Replay type unavailable");
        throw new Error("Replay type unavailable");
    }

    if (isReorderableZini && reorderZini.value) {
      replayParams.clicks = Algorithms.reorderZiniClicks(
        replayParams.clicks,
        this.mines
      );
    }

    //Track info about state we need to return to if exiting replay
    if (replayToInit !== "zini-explore-replay" && this.gameStage !== "replay") {
      this.stateBeforeReplay = {
        gameStage: this.gameStage,
        integerTimer: this.integerTimer,
        unflagged: this.unflagged,
        tilesArray: this.cloneTilesArray(),
      };
    }

    this.gameStage = "replay";
    replayIsShown.value = true;

    if (this.replay) {
      this.replay.pause();
    }

    if (ziniRunnerActive.value) {
      this.stats.killDeepChainZiniRunner();
    }

    if (this.boardHint.hintActive) {
      this.boardHint.hideHint(true);
    }

    if (statsWorkerManager) {
      statsWorkerManager.incrementAutoHintLock();
    }

    this.replay = new Replay(replayParams);
  }

  initOrPrepareDeepChainReplay() {
    if (this.stats.deepZini === null) {
      this.stats.lateCalcDeepChainZini(() => {
        this.initReplay("deepchain");
      });
    } else {
      this.initReplay("deepchain");
    }
  }

  closeReplay() {
    //close the replay and return to the board as it looked before the replay was initialised

    if (this.replay) {
      this.replay.pause();
      replayIsShown.value = false;
    }
    this.replay = null;

    //Figure out which mode we should be in
    switch (this.variant) {
      case "normal":
      case "eff boards":
      case "mean openings":
      case "board editor":
        this.gameStage = this.stateBeforeReplay.gameStage;
        this.integerTimer = this.stateBeforeReplay.integerTimer;
        this.unflagged = this.stateBeforeReplay.unflagged;
        this.tilesArray = this.stateBeforeReplay.tilesArray;
        this.boardRenderer.draw();
        break;
      case "zini explorer":
        this.switchToAnalyseMode();
        break;
      default:
        alert("Failed to exit replay. Unimplemented.");
    }
  }

  cloneTilesArray() {
    let tilesArrayClone = new Array(this.width)
      .fill(0)
      .map(() => new Array(this.height).fill(0));

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        tilesArrayClone[x][y] = this.tilesArray[x][y].clone();
      }
    }
    return tilesArrayClone;
  }

  updateForQueryChange(newQuery) {
    if (Utils.shallowObjectEquals(newQuery, expectedQuery)) {
      return;
    }

    expectedQuery = newQuery;

    switch (variant.value) {
      case "zini explorer":
        this.updateForZiniExploreQueryChange(newQuery);
        break;
      case "board editor":
        this.updateForBoardEditorQueryChange(newQuery);
        break;
    }
  }

  updateForZiniExploreQueryPossibleChange(newQuery) {
    if (!newQuery.b || !newQuery.m) {
      return false;
    }

    let pttMines = BoardGenerator.readFromPttaSearchParams(
      newQuery.b,
      newQuery.m,
      true
    );

    if (!pttMines) {
      return false;
    }

    let clickPathOrFalse = false; //False if path is missing or invalid
    if (newQuery.c) {
      const pttWidth = pttMines.length;
      const pttHeight = pttMines[0].length;

      clickPathOrFalse = Algorithms.decodeClicks(
        newQuery.c,
        pttWidth,
        pttHeight
      );

      //Set clickPath as false if same as current
      if (
        newQuery.c ===
        Algorithms.encodeClicks(
          this.ziniExplore.classicPath,
          pttWidth,
          pttHeight
        )
      ) {
        clickPathOrFalse = false;
      }
    }

    if (
      Utils.shallow2DArrayEquals(pttMines, this.ziniExplorerMines) &&
      !clickPathOrFalse
    ) {
      return false;
    }

    this.ziniExplore.killDeepChainZiniRunner(); //just in case
    this.ziniExplorerMines = pttMines;

    if (clickPathOrFalse) {
      this.ziniExplore.classicPath = clickPathOrFalse;

      //Very hacky, but this is needed for switching to analyse mode as if this runs immediately then this.variant won't be defined
      setTimeout(() => {
        this.switchToAnalyseMode(true);
      }, 100);
    } else {
      this.ziniExplore.clearCurrentPath();
    }

    if (newQuery.d === "1" && !newQuery.c) {
      //Run deepchain zini immediately if d=1 query param is set

      //Very hacky, but this is needed for switching to analyse mode as if this runs immediately then this.variant won't be defined
      setTimeout(() => {
        this.switchToAnalyseMode(true);
        this.ziniExplore.runDefaultAlgorithm(false);
      }, 100);
    }

    this.revertUnappliedWidthHeightSetting();

    //this.switchToEditMode(); //Is just reseting the board enough?
    return true;
  }

  updateForBoardEditorQueryPossibleChange(newQuery) {
    if (!newQuery.b || !newQuery.m) {
      return false;
    }

    let pttMines = BoardGenerator.readFromPttaSearchParams(
      newQuery.b,
      newQuery.m,
      true
    );

    if (!pttMines) {
      return false;
    }

    if (Utils.shallow2DArrayEquals(pttMines, this.boardEditorMines)) {
      return false;
    }

    this.boardEditorMines = pttMines;

    this.revertUnappliedWidthHeightSetting();

    //this.switchToEditMode(); //Is just reseting the board enough?
    return true;
  }

  updateForUrlChange(newUrlVariant, newQuery, oldUrlVariant, oldQuery) {
    if (this.route.name !== "play") {
      return; //Don't run if changing to different page
    }
    if (this.mainCanvas.value === null) {
      //Running too early?
      return;
    }
    console.log("updateForUrlChange called");
    //Watcher function which is called whenever query part of URL changes or variant part of path changes
    //TODO, if these are different from expected, then update relevant data and force board reset.
    let resetNeeded = false;

    let newVariant = Utils.routeNameToVariant(newUrlVariant);
    if (newVariant !== variant.value) {
      variant.value = newVariant;
      resetNeeded = true;
    }

    //Look at query part to see if anything has changed (maybe need to adjust ziniExploreMines etc)
    switch (newVariant) {
      case "zini explorer":
        if (this.updateForZiniExploreQueryPossibleChange(newQuery)) {
          resetNeeded = true;
        }
        break;
      case "board editor":
        if (this.updateForBoardEditorQueryPossibleChange(newQuery)) {
          resetNeeded = true;
        }
        break;
    }

    if (resetNeeded) {
      this.resetBoard(true);
    }
  }

  regenerateUrlAndPushIfDifferent() {
    console.log("regenerateUrlAndPushIfDifferent called");
    //Called at start of board.reset and also whenever we need to change query parameters (e.g. switching to analyse mode on zini explorer)
    let newUrlVariant = Utils.variantToRouteName(variant.value);

    let urlPushNeeded = false;

    if (newUrlVariant !== this.route.params.variant) {
      urlPushNeeded = true;
    }

    let newQuery = {};
    if (variant.value === "zini explorer") {
      newQuery = {
        b: Algorithms.getPttaDimensionString(this.ziniExplorerMines),
        m: Algorithms.getPttaMinesString(this.ziniExplorerMines),
      };

      if (this.route.query.b !== newQuery.b || this.route.query.m !== newQuery.m) {
        urlPushNeeded = true;
      }
    } else if (variant.value === "board editor") {
      newQuery = {
        b: Algorithms.getPttaDimensionString(this.boardEditorMines),
        m: Algorithms.getPttaMinesString(this.boardEditorMines),
      };

      if (this.route.query.b !== newQuery.b || this.route.query.m !== newQuery.m) {
        urlPushNeeded = true;
      }
    }

    if (urlPushNeeded) {
      this.router.push({
        name: "play",
        params: { variant: newUrlVariant },
        query: newQuery,
      });
    }
  }
}

const boardHistory = new BoardHistory(); //Unused, but in the future we might decide to save games locally?

export default Board;