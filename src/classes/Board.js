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

import CONSTANTS from "src/includes/Constants";
import playSound from "src/includes/Sounds";

import { Dialog } from "quasar"

import {
  showStatsBlock,
  statsRunDeepChain,
  tileSizeSlider,
  boardHorizontalPadding,
  boardTopPadding,
  topPanelTopAndBottomBorder,
  topPanelHeight,
  showBorders,
  boardWidth,
  boardHeight,
  boardMines,
  variant,
  chordingButtons,
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
  flagToggleSwitchAfterStart,
  mobileModeEnabled,
  mobileScrollSetting,
  scrollLetThroughActive,
  mobileDelayForEnableScroll,
  touchRevealLocation,
  touchRevealTiming,
  touchLongPressTime,
  touchLongPressDisabled,
  touchMaxTime,
  touchScrollDistance,
  faceHitbox,
  soundEffectsEnabled,
  meanOpeningMineDensity,
  meanOpeningFlagDensity,
  meanMineClickBehaviour,
  replayIsShown,
  reorderZini,
  ziniRunnerActive,
  keyboardClickOpenOnKeyDown,
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
    this.updateTimerSetTimeoutHandle = null; //Handle for starting/stopping setTimeOut process that checks whether timer needs updating
    this.isLeftMouseDown = false;

    this.lrChordingState = {
      leftDown: false,
      rightDown: false,
      hoverType: "single", //block/single/empty (how the hover shows when left mouse down)
      lastDrawnHoverType: "single",
    };

    this.touchDepressedSquaresMap = new Map(); //Map from touch identifiers to depressed squares (for depressing squares on mobile)
    this.ongoingTouches = new Map(); //Track info about touches such as start location, time started etc.

    this.lastClientCoords = { clientX: 0, clientY: 0 }; //Coords used by keyboard clicks
    this.keyboardClickIsDigDown = false; //Used to help ignore repeating keys
    this.keyboardClickIsFlagDown = false; //Used to help ignore repeating keys

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
      this.unprocessedMeanZeros = [];
      this.meanMineStates = null; //Only matters for mean openings variant
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

    this.hoveredSquare = { x: null, y: null }; //Square that is being hovered over
    this.touchDepressedSquaresMap = new Map(); //Map from touch identifiers to depressed squares (for depressing squares on mobile)

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
    this.quickPaintActive = false;
    showQuickPaintOptions.value = false;
    this.quickPaintMode = "known"; //modes are 'known' for drawing red/green, 'guess' for orange/white, 'dots' for marking possible clicks
    quickPaintModeDisplay.value = "Known";
    this.isFirstQuickPaint = true;
    this.redCount = 0;
    this.orangeCount = 0;
    this.dotCount = 0;
    this.whiteOrangeCount = 0; //orange + white

    this.hintActive = false;
    this.lastSquaresChangedForAutoHint = [];

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
          const squareNumber = this.getNumberSurroundingMines(x, y, false);
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

  handleMouseDown(event) {
    if (mobileModeEnabled.value) {
      return;
    }

    const canvasCoords = this.eventToCanvasCoord(event);
    const flooredCoords = this.eventToFlooredTileCoords(event);
    const unflooredCoords = this.eventToUnflooredTileCoords(event);

    const coordsData = {
      canvasCoords,
      flooredCoords,
      unflooredCoords,
    };

    const isDigInput = event.button === 0;
    const isFlagInput = event.button === 2;
    const isMiddleClick = event.button === 1;
    const isTouchInput = false;
    const isDown = true;

    this.handlePointerInput(
      isDigInput,
      isFlagInput,
      isMiddleClick,
      isTouchInput,
      isDown,
      coordsData,
      event,
      "mouse"
    );

    return;
  }

  handleMouseUp(event) {
    if (mobileModeEnabled.value) {
      return;
    }

    const canvasCoords = this.eventToCanvasCoord(event);
    const flooredCoords = this.eventToFlooredTileCoords(event);
    const unflooredCoords = this.eventToUnflooredTileCoords(event);

    const coordsData = {
      canvasCoords,
      flooredCoords,
      unflooredCoords,
    };

    const isDigInput = event.button === 0;
    const isFlagInput = event.button === 2;
    const isMiddleClick = event.button === 1;
    const isTouchInput = false;
    const isDown = false;

    this.handlePointerInput(
      isDigInput,
      isFlagInput,
      isMiddleClick,
      isTouchInput,
      isDown,
      coordsData,
      event,
      "mouse"
    );

    return;
  }

  handleMouseMove(event, isEnter, isLeave) {
    if (mobileModeEnabled.value) {
      return;
    }

    //Update coords as would be used by keyboard clicks
    this.lastClientCoords.clientX = event.clientX;
    this.lastClientCoords.clientY = event.clientY;

    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return; //only track mouse when game is running or just before
    }

    if (this.quickPaintActive) {
      //Do nothing as quickpaint
      return;
    }
    if (this.gameStage === "edit") {
      //Do nothing as edit mode - consider disabling stats object entirely for this mode
      return;
    }

    let unflooredCoords = this.eventToUnflooredTileCoords(event);

    //checks if left mouse button down
    const isLeftDown =
      Boolean(event.buttons & 1) ||
      (this.keyboardClickIsDigDown && !keyboardClickOpenOnKeyDown.value);

    //checks if right mouse button down
    const isRightDown =
      Boolean(event.buttons & 2) || this.keyboardClickIsFlagDown;

    const requiresRedraw = this.mouseMove(
      unflooredCoords.tileX,
      unflooredCoords.tileY,
      isEnter,
      isLeave,
      isLeftDown,
      isRightDown
    );
    if (requiresRedraw) {
      this.boardRenderer.draw();
    }
  }

  handleTouchStart(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    const touches = event.changedTouches;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if conditions are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      const canvasCoords = this.eventToCanvasCoord(touch);
      const flooredCoords = this.eventToFlooredTileCoords(touch);
      const unflooredCoords = this.eventToUnflooredTileCoords(touch);

      const coordsData = {
        canvasCoords,
        flooredCoords,
        unflooredCoords,
      };

      let isScrollingTouch = false;
      if (
        mobileScrollSetting.value === "zero" &&
        this.gameStage === "running" &&
        this.tilesArray[flooredCoords.tileX]?.[flooredCoords.tileY]?.state ===
        0 &&
        this.canTileBeUsedForMobileScrollConditions(
          flooredCoords.tileX,
          flooredCoords.tileY
        )
      ) {
        //If we have the scroll on zeros setting then this touch gets blocked, and we let the touch through
        //We also check the timestamp incase there is a delay that must pass before the tile becomes scrollable
        isScrollingTouch = true;
        shouldPreventDefault = false;
      }

      if (
        mobileScrollSetting.value === "enclosed nf" &&
        this.gameStage === "running" &&
        this.isTileEnclosed(flooredCoords.tileX, flooredCoords.tileY, false)
      ) {
        isScrollingTouch = true;
        shouldPreventDefault = false;
      }

      if (
        mobileScrollSetting.value === "enclosed flag" &&
        this.gameStage === "running" &&
        this.isTileEnclosed(flooredCoords.tileX, flooredCoords.tileY, true)
      ) {
        isScrollingTouch = true;
        shouldPreventDefault = false;
      }

      let isDigInput;
      let isFlagInput;

      if (mobileModeEnabled.value && flagToggleActive.value) {
        isDigInput = false;
        isFlagInput = true;
      } else {
        isDigInput = true;
        isFlagInput = false;
      }

      const isMiddleClick = false;
      const isTouchInput = true;

      let isDown;

      if (touchRevealTiming.value === "end") {
        isDown = true; //Normally the first touch is down, and the release is up (like mousedown/mouseup except for touches)
      } else if (touchRevealTiming.value === "start") {
        //This is very hacky
        isDown = false;
        //If we are timing it to reveal the square when the finger first makes contact
        //then we fake it by sending an "up" input immediately
        //Later on we deactivate the touch, so it doesn't get processed for a second time
      }

      const touchIdentifier = touch.identifier;

      const screenCoords = {
        x: touch.screenX,
        y: touch.screenY,
      };

      this.ongoingTouches.set(touchIdentifier, {
        startTime: event.timeStamp,
        startCoordsData: structuredClone(coordsData), //Ugly, but just in case it gets changed in handlePointerInput function.
        startScreenCoords: screenCoords,
        active: true, //Changes to false if the touch is cancelled (e.g. it moved more than x distance or lasted more than y seconds)
        isScrollingTouch: isScrollingTouch,
      });

      if (isScrollingTouch && !scrollLetThroughActive.value) {
        //this touch is for scrolling, so doesn't need to be processed further
        continue;
      }

      this.handlePointerInput(
        isDigInput,
        isFlagInput,
        isMiddleClick,
        isTouchInput,
        isDown,
        coordsData,
        event,
        touchIdentifier
      );

      if (touchRevealTiming.value === "start") {
        //Since we already processed the touch on the start, we deactivate so it doesn't get processed again
        this.ongoingTouches.get(touchIdentifier).active = false;
      }
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }
  }

  handleTouchEnd(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    const touches = event.changedTouches;

    let redrawNeededForBlockedTouched = false;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if conditions are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      //Get touch entry and delete it (whilst hanging onto reference inside this function)
      let thisTouch = this.ongoingTouches.get(touch.identifier);
      this.ongoingTouches.delete(touch.identifier);

      if (thisTouch.isScrollingTouch) {
        shouldPreventDefault = false;
        if (!scrollLetThroughActive.value) {
          continue;
        }
      }

      let isDigInput;
      let isFlagInput;

      const isLongPress =
        !touchLongPressDisabled.value &&
        event.timeStamp - thisTouch.startTime >= touchLongPressTime.value;

      //Note - below is the same as doing isFlagMode XOR isLongPress
      if (mobileModeEnabled.value && flagToggleActive.value != isLongPress) {
        isDigInput = false;
        isFlagInput = true;
      } else {
        isDigInput = true;
        isFlagInput = false;
      }

      const isMiddleClick = false;
      const isTouchInput = true;
      const isDown = false;
      const touchIdentifier = touch.identifier;

      const endCanvasCoords = this.eventToCanvasCoord(touch);
      const endFlooredCoords = this.eventToFlooredTileCoords(touch);
      const endUnflooredCoords = this.eventToUnflooredTileCoords(touch);

      const endCoordsData = {
        canvasCoords: endCanvasCoords,
        flooredCoords: endFlooredCoords,
        unflooredCoords: endUnflooredCoords,
      };

      let coordsData;

      if (touchRevealLocation.value === "start") {
        coordsData = thisTouch.startCoordsData;
      } else if (touchRevealLocation.value === "end") {
        coordsData = endCoordsData;
      } else if (touchRevealLocation.value === "block") {
        //Check touch start and touch end are on the same square. Otherwise cancel the touch
        //But only if the touch is on the board, otherwise use end location
        if (
          this.checkCoordsInBounds(
            endCoordsData.flooredCoords.tileX,
            endCoordsData.flooredCoords.tileY
          )
        ) {
          if (
            thisTouch.startCoordsData.flooredCoords.tileX ===
            endCoordsData.flooredCoords.tileX &&
            thisTouch.startCoordsData.flooredCoords.tileY ===
            endCoordsData.flooredCoords.tileY
          ) {
            coordsData = endCoordsData;
          } else {
            //Cancel touch on board as it started and ended on different square
            thisTouch.active = false;
          }
        } else {
          coordsData = endCoordsData;
        }
      }

      //Check if touch has exceeded max time
      if (event.timeStamp - thisTouch.startTime >= touchMaxTime.value) {
        //Cancel touch if it has went on too long
        thisTouch.active = false;
      }

      //Check touch has moved max distance
      if (
        Math.sqrt(
          (touch.screenX - thisTouch.startScreenCoords.x) ** 2 +
          (touch.screenY - thisTouch.startScreenCoords.y) ** 2
        ) /
        this.tileSize >=
        touchScrollDistance.value
      ) {
        //Cancel touch as it has moved too much
        thisTouch.active = false;
      }

      if (!thisTouch.active) {
        //Touch was deactivated, so remove depressed square if needed and exit instead of processing further
        this.updateDepressedSquares(null, null, isDown, touchIdentifier);
        redrawNeededForBlockedTouched = true;
        continue;
      }

      this.handlePointerInput(
        isDigInput,
        isFlagInput,
        isMiddleClick,
        isTouchInput,
        isDown,
        coordsData,
        event,
        touchIdentifier
      );
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (redrawNeededForBlockedTouched) {
      this.boardRenderer.draw();
    }
  }

  handleTouchMove(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //NOTE - currently we don't save position changes to stats, but we may start doing this in the future
    //It's a bit more complicated than tracking the mouse as there can be multiple simultaneous paths
    //that start and stop. So we'd also have to save identifier information

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return; //only track touch moves when game is running or just before
    }
    if (this.quickPaintActive) {
      //Do nothing as quickpaint
      return;
    }
    if (this.gameStage === "edit") {
      //Do nothing as edit mode
      return;
    }

    const touches = event.changedTouches;

    let requiresRedraw = false;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if coniditons are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      let thisTouch = this.ongoingTouches.get(touch.identifier);

      if (thisTouch.isScrollingTouch) {
        shouldPreventDefault = false;
        if (!scrollLetThroughActive.value) {
          continue; //This touch is scrolling, so no need to process further
        }
      }

      if (!thisTouch.active) {
        continue;
      }

      let needsDeactivating = false;

      //Check if touch has exceeded max time
      if (event.timeStamp - thisTouch.startTime >= touchMaxTime.value) {
        needsDeactivating = true;
      }

      //Check touch has moved max distance
      if (
        Math.sqrt(
          (touch.screenX - thisTouch.startScreenCoords.x) ** 2 +
          (touch.screenY - thisTouch.startScreenCoords.y) ** 2
        ) /
        this.tileSize >=
        touchScrollDistance.value
      ) {
        needsDeactivating = true;
      }

      if (needsDeactivating) {
        thisTouch.active = false;
        this.updateDepressedSquares(null, null, false, touch.identifier);
        requiresRedraw = true;
        continue;
      }

      if (touchRevealLocation.value === "end") {
        const flooredCoords = this.eventToFlooredTileCoords(touch);

        const isDown = true;
        const touchIdentifier = touch.identifier;

        let thisTouchNeededRedraw = this.updateDepressedSquares(
          flooredCoords.tileX,
          flooredCoords.tileY,
          isDown,
          touchIdentifier
        );

        if (thisTouchNeededRedraw) {
          requiresRedraw = true;
        }
      }
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (requiresRedraw) {
      this.boardRenderer.draw();
    }
  }

  handleTouchCancel(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    const touches = event.changedTouches;

    let requiresRedraw = false;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if conditions are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      let thisTouch = this.ongoingTouches.get(touch.identifier);
      this.ongoingTouches.delete(touch.identifier);

      if (thisTouch.isScrollingTouch) {
        shouldPreventDefault = false;
        if (!scrollLetThroughActive.value) {
          continue;
        }
      }

      if (!thisTouch.active) {
        continue;
      }

      const isDown = false;
      const touchIdentifier = touch.identifier;

      let thisTouchNeededRedraw = this.updateDepressedSquares(
        null,
        null,
        isDown,
        touchIdentifier
      );

      if (thisTouchNeededRedraw) {
        requiresRedraw = true;
      }
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (requiresRedraw) {
      this.boardRenderer.draw();
    }
  }

  sendKeyboardClick(isDigInput, isFlagInput, isDown, timeStamp) {
    //Sends a keyboard click base on the last location of mouseMove
    //Very hacky

    if (mobileModeEnabled.value) {
      //Just in case - tbh it might be possible to allow this, but simpler to not.
      return;
    }

    if (isDigInput) {
      //defend against repeating keys
      if (isDown && this.keyboardClickIsDigDown) {
        return;
      }
      if (isDown) {
        this.keyboardClickIsDigDown = true;
      }
      if (!isDown) {
        this.keyboardClickIsDigDown = false;
      }
    }

    if (isFlagInput) {
      //defend against repeating keys
      if (isDown && this.keyboardClickIsFlagDown) {
        return;
      }
      if (isDown) {
        this.keyboardClickIsFlagDown = true;
      }
      if (!isDown) {
        this.keyboardClickIsFlagDown = false;
      }
    }

    //If they have the setting for it, we do digs on key down instead of up
    //We do this by faking a key up input, and blocking the real key up
    //This is very hacky
    if (isDigInput && !isDown && keyboardClickOpenOnKeyDown.value) {
      //Block key up from doing anything
      return;
    }
    if (isDigInput && isDown && keyboardClickOpenOnKeyDown.value) {
      //Convert key down into key up
      isDown = false;
    }

    let fakeEvent = {
      clientX: this.lastClientCoords.clientX,
      clientY: this.lastClientCoords.clientY,
      timeStamp: timeStamp,
    };

    const canvasCoords = this.eventToCanvasCoord(fakeEvent);
    const flooredCoords = this.eventToFlooredTileCoords(fakeEvent);
    const unflooredCoords = this.eventToUnflooredTileCoords(fakeEvent);

    const coordsData = {
      canvasCoords,
      flooredCoords,
      unflooredCoords,
    };

    const isMiddleClick = false;
    const isTouchInput = false;

    this.handlePointerInput(
      isDigInput,
      isFlagInput,
      isMiddleClick,
      isTouchInput,
      isDown,
      coordsData,
      fakeEvent,
      "mouse"
    );

    return;
  }

  handlePageScroll(event) {
    //On mobile, if the page starts scrolling, we should cancel all active touches.
    //Try keep this function fast as page scroll gets called a lot

    let redrawRequired = false;

    for (let touch of this.ongoingTouches.values()) {
      if (!touch.active) {
        continue; //Touch already cancelled, so skip it
      }

      touch.active = false;

      const isDown = false;
      const touchIdentifier = touch.identifier;

      let thisTouchNeededRedraw = this.updateDepressedSquares(
        null,
        null,
        isDown,
        touchIdentifier
      );

      if (thisTouchNeededRedraw) {
        redrawRequired = true;
      }
    }

    if (redrawRequired) {
      this.boardRenderer.draw();
    }
  }

  handlePointerInput(
    isDigInput,
    isFlagInput,
    isMiddleClick,
    isTouchInput,
    isDown,
    coordsData,
    event,
    touchIdentifier
  ) {
    //generic handler for left/right up/down and also touch

    let isDrawRequired = false;

    const mouseDownOrTouchUp =
      (!isTouchInput && isDown) || (isTouchInput && !isDown);

    let flooredCoords = coordsData.flooredCoords;
    let unflooredCoords = coordsData.unflooredCoords;
    let canvasCoords = coordsData.canvasCoords;

    if (this.gameStage === "running") {
      this.lastSquaresChangedForAutoHint = [];
    }

    if (touchIdentifier === "mouse" && chordingButtons.value === "l+r") {
      //Update states for l+r chord
      if (isDigInput) {
        //Track whether left click is up or down
        this.lrChordingState.leftDown = isDown;
      }
      if (isFlagInput) {
        //Track whether right click is up or down
        this.lrChordingState.rightDown = isDown;
      }

      //Update whether the hover is a 3x3 block or a single square, but only if there has been a new click event
      if (isDigInput || isFlagInput) {
        if (this.lrChordingState.leftDown && this.lrChordingState.rightDown) {
          //Both down => hover should be 3x3 block
          this.lrChordingState.hoverType = "block";
        } else if (
          this.lrChordingState.leftDown &&
          !this.lrChordingState.rightDown &&
          this.lrChordingState.hoverType !== "empty"
        ) {
          //Only left down => hover should be single square
          this.lrChordingState.hoverType = "single";
        } else if (
          !this.lrChordingState.leftDown &&
          !this.lrChordingState.rightDown &&
          this.lrChordingState.hoverType !== "empty"
        ) {
          //If nothing is down then reset to default behaviour of single square hover
          this.lrChordingState.hoverType = "single";
        }
      }
    }

    // ########## Check for face click #############

    //Check for face click and exit early if it was clicked on
    if (
      (!isTouchInput && isDigInput && !isDown) ||
      (isTouchInput && (isDigInput || isFlagInput) && !isDown)
    ) {
      let wasClickOnFace = this.attemptFaceClick(
        canvasCoords,
        flooredCoords,
        touchIdentifier
      );
      if (wasClickOnFace) {
        //Don't process click further
        this.boardRenderer.draw(); //just in case
        return; //Note that this includes clicks on face that then got cancelled.
      }
    }

    // ############### Section for mostly mouse down stuff #################

    //Handle clicks in quickpaint, and exit early
    if (this.quickPaintActive && this.gameStage === "running") {
      if (mouseDownOrTouchUp) {
        this.quickPaint.handleQuickPaintClick(
          flooredCoords.tileX,
          flooredCoords.tileY,
          isDigInput,
          isFlagInput,
          isMiddleClick,
          event
        );
        this.boardRenderer.draw();
      }
      return;
    }

    //handle clicks in edit mode and exit early if nothing to do
    if (this.gameStage === "edit") {
      if (mouseDownOrTouchUp && (isDigInput || isFlagInput)) {
        this.handleEditClick(flooredCoords.tileX, flooredCoords.tileY);
        this.boardRenderer.draw();
      }

      return;
    }

    //handle clicks in analyse mode (used by zini explorer)
    if (this.gameStage === "analyse") {
      if (mouseDownOrTouchUp) {
        this.handleZiniExploreClick(
          flooredCoords.tileX,
          flooredCoords.tileY,
          isDigInput,
          isFlagInput
        );
        this.boardRenderer.draw();
      }
      return;
    }

    //handle clicks in replay mode and exit early if nothing to do
    if (this.gameStage === "replay") {
      if (mouseDownOrTouchUp && (isDigInput || isFlagInput)) {
        this.handleReplayClick(flooredCoords.tileX, flooredCoords.tileY);
        this.boardRenderer.draw();
      }

      return;
    }

    //Depress squares when hovered over with mouse down
    if (
      (this.gameStage === "running" || this.gameStage === "pregame") &&
      isDown &&
      isDigInput
    ) {
      isDrawRequired = this.holdDownDig(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Potentially change hover when right click is down and on l+r chording
    if (
      chordingButtons.value === "l+r" &&
      touchIdentifier === "mouse" &&
      isFlagInput &&
      isDown
    ) {
      isDrawRequired = this.holdDownFlag(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Potentially change hover when right click is up and on l+r chording
    if (
      chordingButtons.value === "l+r" &&
      touchIdentifier === "mouse" &&
      isFlagInput &&
      !isDown
    ) {
      isDrawRequired = this.releaseFlag(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Depress squares when hovered over with flag toggled on with mobile (chord on flag mode)
    if (this.gameStage === "running" && isDown && isFlagInput && isTouchInput) {
      isDrawRequired = this.holdDownTouchFlag(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Flag square for mouse
    if (
      this.gameStage === "running" &&
      isDown &&
      isFlagInput &&
      !isTouchInput &&
      !(
        touchIdentifier === "mouse" &&
        chordingButtons.value === "l+r" &&
        this.lrChordingState.leftDown
      )
    ) {
      this.attemptFlag(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        true,
        true
      );
      isDrawRequired = true;
    }

    // ############### Section for mostly mouse up stuff #################

    //Do first click on board
    if (this.gameStage === "pregame" && !isDown && isDigInput) {
      const generationResult = this.generateBoard(
        flooredCoords.tileX,
        flooredCoords.tileY
      );
      if (generationResult.success) {
        this.gameStage = "running";
        //Game then continues with the code below providing the click to open the first square.
        //Slightly hacky, but we also optionally change where the first click is if the board
        //received requires a different first click
        if (generationResult.rewrittenFirstClick) {
          //unflooredCoords as these are what attemptChordOrDig uses.
          unflooredCoords.tileX = generationResult.rewrittenFirstClick.x;
          unflooredCoords.tileY = generationResult.rewrittenFirstClick.y;
        }
        if (mobileModeEnabled.value && flagToggleSwitchAfterStart.value) {
          flagToggleActive.value = true;
        }
      } else {
        this.updateDepressedSquares(
          flooredCoords.tileX,
          flooredCoords.tileY,
          false,
          touchIdentifier
        );
        this.boardRenderer.draw();
        return; //Don't start game. Click not inbounds, or something else went wrong
      }
    }

    let needToCheckForWinOrLoss = false;

    //Try to chord or open square with left click (e.g. mouse left click)
    if (
      this.gameStage === "running" &&
      !isDown &&
      isDigInput &&
      !(touchIdentifier === "mouse" && chordingButtons.value === "l+r")
    ) {
      this.attemptChordOrDig(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier,
        event.timeStamp
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Try to chord square using l+r chord
    //Lifting up either left click or right click when both were down
    if (
      this.gameStage === "running" &&
      !isDown &&
      ((isDigInput && this.lrChordingState.rightDown) || //Lift up left whilst right down
        (isFlagInput && this.lrChordingState.leftDown)) && //Or lift up right whilst left down
      touchIdentifier === "mouse" &&
      chordingButtons.value === "l+r"
    ) {
      this.attemptChordOnly(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Try to dig square when on l+r chord
    //Lifting up left click when only left click was down, and also a chord was not spent
    if (
      this.gameStage === "running" &&
      !isDown &&
      isDigInput &&
      !this.lrChordingState.rightDown &&
      touchIdentifier === "mouse" &&
      chordingButtons.value === "l+r" &&
      this.lrChordingState.hoverType !== "empty"
    ) {
      this.attemptDigOnly(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier,
        event.timeStamp
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Try to flag or chord (when the flag toggle is active on mobile)
    if (
      this.gameStage === "running" &&
      isFlagInput &&
      !isDown &&
      isTouchInput
    ) {
      this.attemptFlagOrChord(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Edge case - cancel mobile long-press flag input in pregame (otherwise depressed squares get stuck)
    if (
      this.gameStage === "pregame" &&
      isFlagInput &&
      !isDown &&
      isTouchInput
    ) {
      isDrawRequired = this.updateDepressedSquares(
        flooredCoords.tileX,
        flooredCoords.tileY,
        false,
        touchIdentifier
      );
    }

    //Edge case, return to single hover when everything released and empty hover (has to happen at end so that we can block a secondary dig that would happen after chording)
    if (
      touchIdentifier === "mouse" &&
      chordingButtons.value === "l+r" &&
      (isDigInput || isFlagInput) &&
      !this.lrChordingState.leftDown &&
      !this.lrChordingState.rightDown &&
      this.lrChordingState.hoverType === "empty"
    ) {
      //If nothing is down then reset to default behaviour of single square hover
      this.lrChordingState.hoverType = "single";
    }

    //Check if an opening has occured on mean openings
    if (
      this.variant === "mean openings" &&
      this.unprocessedMeanZeros?.length !== 0
    ) {
      this.makeOpeningMean(event.timeStamp);
    }

    //Check if board is complete (note that checking gameStage is redundant but defensive)
    if (this.gameStage === "running" && needToCheckForWinOrLoss) {
      if (this.blasted) {
        this.doLose();
      } else if (this.checkWin()) {
        this.doWin();
      }
    }

    if (isDrawRequired) {
      this.boardRenderer.draw();
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
      this.meanMineStates = new Array(this.width).fill(0).map(() =>
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
      this.unprocessedMeanZeros = []; //List of recently opened coords that need processing to check if they can have a mean mine.

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
    this.boardStartTime = performance.now();
    this.boardRenderer.clearTimerTimeout(); //defensive as it should already be disabled since we reset board.
    this.updateTimerSetTimeoutHandle = setTimeout(
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

  eventToCanvasCoord(event) {
    //Get coords relative to canvas
    const canvasRawX =
      event.clientX - this.mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - this.mainCanvas.value.getBoundingClientRect().top;

    return { canvasRawX, canvasRawY };
  }

  eventToUnflooredTileCoords(event) {
    //Extracts tile coords from mouseEvent. But not floored
    const canvasRawX =
      event.clientX - this.mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - this.mainCanvas.value.getBoundingClientRect().top;

    const boardRawX = canvasRawX - boardHorizontalPadding.value;
    const boardRawY = canvasRawY - boardTopPadding.value;

    let tileX = boardRawX / this.tileSize;
    let tileY = boardRawY / this.tileSize;

    return { tileX, tileY };
  }

  eventToFlooredTileCoords(event) {
    //Extracts tile coords from mouseEvent. These are floored
    let { tileX, tileY } = this.eventToUnflooredTileCoords(event);
    let flooredCoords = this.unflooredToFlooredTileCoords(tileX, tileY);

    return flooredCoords; //format is {tileX: ..., tileY: ...}
  }

  unflooredToFlooredTileCoords(tileX, tileY) {
    //Floors both tileX and tileY
    return { tileX: Math.floor(tileX), tileY: Math.floor(tileY) };
  }

  attemptFlag(
    unflooredTileX,
    unflooredTileY,
    includeInStats = false,
    hasSoundEffect = false
  ) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (this.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED) {
      //Flag the square
      hasSoundEffect && soundEffectsEnabled.value && playSound("flag");
      this.tilesArray[tileX][tileY].state = CONSTANTS.FLAG;
      this.unflagged--;
      if (
        this.mines[tileX][tileY] ||
        (this.variant === "mean openings" &&
          this.meanMineStates[tileX][tileY].isMine)
      ) {
        //Flags on correct square count towards effective clicks
        includeInStats &&
          this.stats.addRight(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
      } else {
        //Flags on incorrect square are wasted
        includeInStats &&
          this.stats.addWastedRight(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
      }

      if (this.hintActive) {
        const suppressDraw = true;
        this.boardHint.hideHint(suppressDraw);
      }
    } else if (this.tilesArray[tileX][tileY].state === CONSTANTS.FLAG) {
      //Unflag a square
      hasSoundEffect && soundEffectsEnabled.value && playSound("flag");
      this.tilesArray[tileX][tileY].state = CONSTANTS.UNREVEALED;
      this.unflagged++;
      includeInStats &&
        this.stats.addWastedRight(
          tileX,
          tileY,
          unflooredTileX,
          unflooredTileY,
          time
        );

      if (this.hintActive) {
        const suppressDraw = true;
        this.boardHint.hideHint(suppressDraw);
      }
    } else {
      //Wasted flag input
      includeInStats &&
        this.stats.addWastedRight(
          tileX,
          tileY,
          unflooredTileX,
          unflooredTileY,
          time
        );
    }
  }

  attemptChordOrDig(
    unflooredTileX,
    unflooredTileY,
    touchIdentifier,
    eventTimestamp
  ) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      this.updateDepressedSquares(tileX, tileY, false, touchIdentifier); //Undepress square as we have just done leftMouseUp
      return;
    }

    if (typeof this.tilesArray[tileX][tileY].state === "number") {
      //Attempt chord tile
      this.attemptChordOnly(unflooredTileX, unflooredTileY, touchIdentifier);
    } else if (this.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED) {
      //Attempt to dig tile
      this.attemptDigOnly(
        unflooredTileX,
        unflooredTileY,
        touchIdentifier,
        eventTimestamp
      );
    } else {
      this.stats.addWastedLeft(
        tileX,
        tileY,
        unflooredTileX,
        unflooredTileY,
        time
      );
    }
  }

  attemptChordOnly(unflooredTileX, unflooredTileY, touchIdentifier) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    this.updateDepressedSquares(tileX, tileY, false, touchIdentifier); //Undepress square as we have just done leftMouseUp

    //expire the chord for l+r so that releasing let click afterwards doesn't do a dig
    if (touchIdentifier === "mouse" && chordingButtons.value === "l+r") {
      this.lrChordingState.hoverType = "empty";
    }

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (typeof this.tilesArray[tileX][tileY].state === "number") {
      //Attempt chord tile (can only happen on a number, otherwise wasted)
      this.chord(
        tileX,
        tileY,
        true,
        time,
        unflooredTileX,
        unflooredTileY,
        true
      );
    } else {
      this.stats.addWastedChord(
        tileX,
        tileY,
        unflooredTileX,
        unflooredTileY,
        time
      );
    }
  }

  attemptDigOnly(
    unflooredTileX,
    unflooredTileY,
    touchIdentifier,
    eventTimestamp
  ) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    this.updateDepressedSquares(tileX, tileY, false, touchIdentifier); //Undepress square as we have just done leftMouseUp

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (this.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED) {
      //Attempt to dig tile, although this behaviour may be changed on mean openings mode
      let doDig = true;

      if (
        this.variant === "mean openings" &&
        this.meanMineStates[tileX][tileY].isMine
      ) {
        //Clicked on a mean mine. So this either blasts, flags, shields or ignores depending on settings

        if (meanMineClickBehaviour.value === "blast") {
          //Do nothing as we will blast later since doDig is set
          doDig = true; //defensive
        } else if (meanMineClickBehaviour.value === "flag") {
          //Click becomes a flag instead
          doDig = false;
          this.tilesArray[tileX][tileY].state = CONSTANTS.FLAG;
          this.unflagged--;
          this.stats.addRight(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
        } else if (meanMineClickBehaviour.value === "shield") {
          //Waste if click occurred within 0.5s, otherwise blast
          if (
            eventTimestamp <=
            this.meanMineStates[tileX][tileY].changedToMineTimestamp + 500
          ) {
            //Click occured soon after mean mine was placed, click just gets wasted
            doDig = false;
            this.stats.addWastedLeft(
              tileX,
              tileY,
              unflooredTileX,
              unflooredTileY,
              time
            );
          } else {
            //Click happened after, so should blast
            doDig = true; //defensive
          }
        } else if (
          meanMineClickBehaviour.value === "ignore" ||
          meanMineClickBehaviour.value === "chordable"
        ) {
          doDig = false;
          //Not sure whether it is best to waste click or ignore it entirely. I've chosen to waste as maybe people care about clicks per second stat.
          this.stats.addWastedLeft(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
        } else {
          throw new Error("illegal value for meanMineClickBehaviour");
        }
      }

      if (doDig) {
        this.openTile(tileX, tileY, true);
        this.stats.addLeft(tileX, tileY, unflooredTileX, unflooredTileY, time);
      }
    } else {
      this.stats.addWastedLeft(
        tileX,
        tileY,
        unflooredTileX,
        unflooredTileY,
        time
      );
    }
  }

  attemptFlagOrChord(unflooredTileX, unflooredTileY, touchIdentifier) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    //Undepress square as we have just done ended a touch input
    //Note that flag touch inputs on numbers will depress surrounding squares as this does a chord
    this.updateDepressedSquares(tileX, tileY, false, touchIdentifier);

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (typeof this.tilesArray[tileX][tileY].state === "number") {
      //Attempt chord tile
      this.chord(
        tileX,
        tileY,
        true,
        time,
        unflooredTileX,
        unflooredTileY,
        true
      );
    } else {
      //Try to flag the square
      //Code is slightly scuffed since this repeats some checks (such as square inbounds), but I'm too lazy to fix
      this.attemptFlag(unflooredTileX, unflooredTileY, true, true);
    }
  }

  holdDownDig(tileX, tileY, touchIdentifier) {
    //Don't track this in stats yet (but may add in future)
    //All this does is depress the current square or surrounding squares as the user pressed down left mouse
    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      true,
      touchIdentifier
    );

    return requiresRedraw;
  }

  holdDownFlag(tileX, tileY, touchIdentifier) {
    //Currently only needed for l+r chord
    //Don't track this in stats yet (but may add in future)
    //All this does is potentially change depressed squares to block hover (if left mouse is also down)
    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      this.lrChordingState.leftDown,
      touchIdentifier
    );

    return requiresRedraw;
  }

  releaseFlag(tileX, tileY, touchIdentifier) {
    //Currently only needed for l+r chord
    //Don't track this in stats yet (but may add in future)
    //All this does is potentially change depressed squares to single hover (if left mouse is still down)
    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      this.lrChordingState.leftDown,
      touchIdentifier
    );

    return requiresRedraw;
  }

  holdDownTouchFlag(tileX, tileY, touchIdentifier) {
    let requiresRedraw;

    //Only depress stuff if hovering over a number (i.e. for a chord)
    if (typeof this.tilesArray[tileX]?.[tileY]?.state === "number") {
      requiresRedraw = this.updateDepressedSquares(
        tileX,
        tileY,
        true,
        touchIdentifier
      );
    } else {
      requiresRedraw = this.updateDepressedSquares(
        null,
        null,
        true,
        touchIdentifier
      );
    }

    return requiresRedraw;
  }

  openTile(x, y, hasSoundEffect = false) {
    if (!this.checkCoordsInBounds(x, y)) {
      return; //ignore squares outside board
    }

    //Opens a square, possibly triggering an opening recursively
    if (this.tilesArray[x][y].state !== CONSTANTS.UNREVEALED) {
      return;
    }

    const isNormalMine = this.mines[x][y];
    const isMeanMine =
      this.variant === "mean openings" &&
      this.meanMineStates[x][y].isMine &&
      this.meanMineStates[x][y].isActive;

    if (isNormalMine || isMeanMine) {
      this.tilesArray[x][y].state = CONSTANTS.MINERED;
      this.blasted = true;
    } else {
      hasSoundEffect && soundEffectsEnabled.value && playSound("dig");
      const number = this.getNumberSurroundingMines(x, y);
      this.tilesArray[x][y].state = number;
      if (
        mobileModeEnabled.value &&
        (mobileScrollSetting.value === "enclosed nf" ||
          mobileScrollSetting.value === "enclosed flag" ||
          mobileScrollSetting.value === "zero") &&
        mobileDelayForEnableScroll.value !== 0
      ) {
        //Track timestamp of when a tile was revealed as they only become scrollable after a delay for the relevant mobile settings
        //We probably don't need all these if conditions, but I've left them in for clarity as to when this applies.
        this.tilesArray[x][y].revealedTimeForMobileScrollBehaviour =
          this.getTime();
      }
      this.openedTiles++;

      if (number === 0) {
        if (this.variant === "mean openings") {
          this.unprocessedMeanZeros.push({ x, y });
        }
        this.chord(x, y, false);
      }

      if (this.gameStage === "running") {
        this.lastSquaresChangedForAutoHint.push({ x, y });
      }
    }

    if (this.hintActive) {
      const suppressDraw = true;
      this.boardHint.hideHint(suppressDraw);
    }
  }

  mouseMove(
    unflooredTileX,
    unflooredTileY,
    isEnter,
    isLeave,
    isLeftDown,
    isRightDown
  ) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    if (chordingButtons.value === "l+r") {
      //Update states for l+r chord
      let buttonsChanged = false;
      if (this.lrChordingState.leftDown !== isLeftDown) {
        //left button changed, possibly off canvas
        this.lrChordingState.leftDown = isLeftDown;
        buttonsChanged = true;
      }

      if (this.lrChordingState.rightDown !== isRightDown) {
        //right button changed, possibly off canvas
        this.lrChordingState.rightDown = isRightDown;
        buttonsChanged = true;
      }

      //Update whether the hover is a 3x3 block or a single square, but only if there has been a new click event
      if (buttonsChanged) {
        if (this.lrChordingState.leftDown && this.lrChordingState.rightDown) {
          //Both down => hover should be 3x3 block
          this.lrChordingState.hoverType = "block";
        } else if (
          this.lrChordingState.leftDown &&
          !this.lrChordingState.rightDown &&
          this.lrChordingState.hoverType !== "empty"
        ) {
          //Only left down => hover should be single square
          this.lrChordingState.hoverType = "single";
        } else if (
          !this.lrChordingState.leftDown &&
          !this.lrChordingState.rightDown &&
          this.lrChordingState.hoverType !== "empty"
        ) {
          //If nothing is down then reset to default behaviour of single square hover
          this.lrChordingState.hoverType = "single";
        }
      }
    }

    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      isLeftDown,
      "mouse"
    );

    if (this.gameStage !== "pregame") {
      if (isEnter) {
        this.stats.addMouseEnter(unflooredTileX, unflooredTileY, time);
      } else if (isLeave) {
        this.stats.addMouseLeave(unflooredTileX, unflooredTileY, time);
      } else {
        this.stats.addMouseMove(unflooredTileX, unflooredTileY, time);
      }
    }

    return requiresRedraw;
  }

  updateDepressedSquares(
    tileX,
    tileY,
    newIsLeftMouseDownValue,
    touchIdentifier = "mouse"
  ) {
    //Handle depressing squares when left mouse is down and over a square or a number (in which case this "prepares" the chord)

    //Set tileX/tileY to null if out of bounds
    if (!this.checkCoordsInBounds(tileX, tileY)) {
      tileX = null;
      tileY = null;
    }

    //Find out where the current hovered square is and whether it is depressed.
    //This works a bit differently for touches as we can have multiple depressed at once
    let isCurrentlyDown;
    let currentLocation;

    if (touchIdentifier === "mouse") {
      isCurrentlyDown = this.isLeftMouseDown;
      currentLocation = this.hoveredSquare;
    } else {
      isCurrentlyDown = this.touchDepressedSquaresMap.has(touchIdentifier);
      if (isCurrentlyDown) {
        currentLocation = this.touchDepressedSquaresMap.get(touchIdentifier);
      } else {
        currentLocation = { x: null, y: null };
      }
    }

    const leftMouseDownChanged = isCurrentlyDown !== newIsLeftMouseDownValue;
    const hoveredSquareMoved =
      tileX !== currentLocation.x || tileY !== currentLocation.y;

    const hoverTypeChanged =
      this.lrChordingState.hoverType !==
      this.lrChordingState.lastDrawnHoverType;

    if (
      !hoveredSquareMoved &&
      !leftMouseDownChanged &&
      !(
        touchIdentifier === "mouse" &&
        chordingButtons.value === "l+r" &&
        hoverTypeChanged
      )
    ) {
      const requiresRedraw = false;
      return requiresRedraw;
    }

    this.lrChordingState.lastDrawnHoverType = this.lrChordingState.hoverType; //for l+r chord only

    //Maybe slightly excessive and inefficient, but easier to clear out hover and reapply each time rather than going through all cases

    let clearHover = (hoverSquareX, hoverSquareY) => {
      for (let x = hoverSquareX - 1; x <= hoverSquareX + 1; x++) {
        for (let y = hoverSquareY - 1; y <= hoverSquareY + 1; y++) {
          if (this.tilesArray[x]?.[y]) {
            this.tilesArray[x][y].depressed = false;
          }
        }
      }
    };

    //Clear out old hover (3x3 block so we don't have to check whether it was a chord or singleton)
    //clear mouse hover
    if (
      this.hoveredSquare.x !== null &&
      this.hoveredSquare.y !== null &&
      this.isLeftMouseDown
    ) {
      clearHover(this.hoveredSquare.x, this.hoveredSquare.y);
    }
    //clear touch hover
    for (let touchedSquare of this.touchDepressedSquaresMap.values()) {
      if (touchedSquare.x !== null && touchedSquare.y !== null) {
        clearHover(touchedSquare.x, touchedSquare.y);
      }
    }

    //Update which squares we store as being hovered
    if (touchIdentifier === "mouse") {
      //for mouse
      this.hoveredSquare.x = tileX;
      this.hoveredSquare.y = tileY;
      this.isLeftMouseDown = newIsLeftMouseDownValue;
    } else {
      //for touch
      if (newIsLeftMouseDownValue) {
        //add if newly touched square
        this.touchDepressedSquaresMap.set(touchIdentifier, {
          x: tileX,
          y: tileY,
        });
      } else {
        //remove if no longer touched
        this.touchDepressedSquaresMap.delete(touchIdentifier);
      }
    }

    //Apply new hover for all squares (from touch and from mouse)
    let applyHover = (hoverSquareX, hoverSquareY) => {
      var doSingleHover = false;
      var doBlockHover = false;

      if (touchIdentifier === "mouse" && chordingButtons.value === "l+r") {
        //l+r chord does hover based on what buttons are depressed
        if (this.lrChordingState.hoverType === "single") {
          doSingleHover = true;
        } else if (this.lrChordingState.hoverType === "block") {
          doBlockHover = true;
        } else {
          //empty or something else, so don't hover anything
          return;
        }
      } else {
        //l chord does single hover on unrevealed squares
        doSingleHover =
          this.tilesArray[hoverSquareX][hoverSquareY].state ===
          CONSTANTS.UNREVEALED;

        //l chord does 3x3 block hover on numbers
        doBlockHover =
          typeof this.tilesArray[hoverSquareX][hoverSquareY].state === "number";
      }

      //Single square
      if (doSingleHover) {
        this.tilesArray[hoverSquareX][hoverSquareY].depressed = true;
      }

      //Chord
      if (doBlockHover) {
        for (let x = hoverSquareX - 1; x <= hoverSquareX + 1; x++) {
          for (let y = hoverSquareY - 1; y <= hoverSquareY + 1; y++) {
            //Note that the middle square automatically gets excluded as it's been revealed
            if (this.tilesArray[x]?.[y]?.state === CONSTANTS.UNREVEALED) {
              this.tilesArray[x][y].depressed = true;
            }
          }
        }
      }
    };

    //apply mouse hover
    if (
      this.hoveredSquare.x !== null &&
      this.hoveredSquare.y !== null &&
      this.isLeftMouseDown
    ) {
      applyHover(this.hoveredSquare.x, this.hoveredSquare.y);
    }
    //apply touch hover
    for (let touchedSquare of this.touchDepressedSquaresMap.values()) {
      if (touchedSquare.x !== null && touchedSquare.y !== null) {
        applyHover(touchedSquare.x, touchedSquare.y);
      }
    }

    const requiresRedraw = true;
    return requiresRedraw;
  }

  clearAllDepressedSquares() {
    this.hoveredSquare = { x: null, y: null };
    this.isLeftMouseDown = false;
    this.lrChordingState = {
      leftDown: false,
      rightDown: false,
      hoverType: "single", //single, block, empty
      lastDrawnHoverType: "single", //for l+r chord only
    };
    this.touchDepressedSquaresMap.clear();
  }

  getNumberSurroundingMines(x, y, includeMeanMines = false) {
    let count = 0;
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (i === x && j === y) {
          continue; //dont count square itself
        }
        if (!this.checkCoordsInBounds(i, j)) {
          continue; //ignore squares outside board
        }
        const isNormalMine = this.mines[i][j];
        const isMeanMine =
          includeMeanMines &&
          this.meanMineStates[i][j].isMine &&
          this.meanMineStates[i][j].isActive;
        if (isNormalMine || isMeanMine) {
          count++;
        }
      }
    }

    return count;
  }

  getNumberSurroundingFlags(x, y) {
    let count = 0;
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (i === x && j === y) {
          continue; //dont count square itself
        }
        if (!this.checkCoordsInBounds(i, j)) {
          continue; //ignore squares outside board
        }

        const isChordableMeanMine =
          this.variant === "mean openings" &&
          meanMineClickBehaviour.value === "chordable" &&
          this.meanMineStates[i][j].isMine &&
          this.meanMineStates[i][j].isActive;

        if (
          this.tilesArray[i][j].state === CONSTANTS.FLAG ||
          isChordableMeanMine
        ) {
          count++;
        }
      }
    }

    return count;
  }

  chord(
    x,
    y,
    includeInStats = false,
    time = 0,
    unflooredX = undefined,
    unflooredY = undefined,
    hasSoundEffect = false
  ) {
    if (!this.checkCoordsInBounds(x, y)) {
      return; //ignore squares outside board
    }

    if (typeof this.tilesArray[x][y].state !== "number") {
      return; //Can only chord numbers
    }

    const isChordedTileZero = this.tilesArray[x][y].state === 0;

    if (!isChordedTileZero) {
      hasSoundEffect && soundEffectsEnabled.value && playSound("chord");
    }

    if (
      this.tilesArray[x][y].state === this.getNumberSurroundingFlags(x, y) ||
      isChordedTileZero
    ) {
      let hadUnrevealedNeighbour = false;

      //Correct number of flags (or a zero tile), so do chord
      for (let i = x - 1; i <= x + 1; i++) {
        for (let j = y - 1; j <= y + 1; j++) {
          if (i === x && j === y) {
            continue; //don't open square itself
          }
          if (!this.checkCoordsInBounds(i, j)) {
            continue; //ignore squares outside board
          }
          if (
            isChordedTileZero &&
            this.tilesArray[i][j].state === CONSTANTS.FLAG
          ) {
            //Openings will open everything around them and annihilate neighbouring flags.
            //Note that because we change the state to CONSTANTS.UNREVEALED, it then gets opened by follow if statement
            this.tilesArray[i][j].state = CONSTANTS.UNREVEALED;
            this.unflagged++;
          }
          const isChordableMeanMine =
            this.variant === "mean openings" &&
            meanMineClickBehaviour.value === "chordable" &&
            this.meanMineStates[i][j].isMine &&
            this.meanMineStates[i][j].isActive;
          if (
            this.tilesArray[i][j].state === CONSTANTS.UNREVEALED &&
            !isChordableMeanMine
          ) {
            this.openTile(i, j);
            hadUnrevealedNeighbour = true;
          }
        }
      }
      if (includeInStats) {
        if (hadUnrevealedNeighbour) {
          this.stats.addChord(x, y, unflooredX, unflooredY, time);
        } else {
          this.stats.addWastedChord(x, y, unflooredX, unflooredY, time);
        }
      }
    } else {
      if (includeInStats) {
        this.stats.addWastedChord(x, y, unflooredX, unflooredY, time);
      }
    }
  }

  doLose() {
    const finalTime = this.getTime();
    soundEffectsEnabled.value && playSound("lose");
    this.blast();
    this.gameStage = "lost";
    this.stats.addEndTime(finalTime, false);
    this.stats.makeRepeatFlagsWasted();
    if (this.variant === "mean openings") {
      this.stats.addMeanMines(this.meanMineStates);
    }
    this.clearAllDepressedSquares();
    this.boardRenderer.clearTimerTimeout();
    this.integerTimer = Math.floor(finalTime);
    this.calculateAndDisplayStats(false);
    if (
      (this.variant === "eff boards" &&
        statsRunDeepChain.value === "eff always") ||
      statsRunDeepChain.value === "any always"
    ) {
      this.stats.lateCalcDeepChainZini();
    }
    flagToggleShowReset.value = true;
    this.boardHint.showAutoHintIfNeeded();
  }

  blast() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const isNormalMine = this.mines[x][y];
        const isMeanMine =
          this.variant === "mean openings" &&
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive;

        if (
          (isNormalMine || isMeanMine) &&
          this.tilesArray[x][y].state !== CONSTANTS.FLAG &&
          this.tilesArray[x][y].state !== CONSTANTS.MINERED
        ) {
          this.tilesArray[x][y].state = CONSTANTS.MINE;
        }

        if (
          !(isNormalMine || isMeanMine) &&
          this.tilesArray[x][y].state === CONSTANTS.FLAG
        ) {
          this.tilesArray[x][y].state = CONSTANTS.MINEWRONG;
        }
      }
    }
  }

  doWin() {
    const finalTime = this.getTime();
    soundEffectsEnabled.value && playSound("win");
    this.markRemainingFlags();
    this.gameStage = "won";
    this.stats.addEndTime(finalTime, true);
    this.stats.makeRepeatFlagsWasted();
    if (this.variant === "mean openings") {
      this.stats.addMeanMines(this.meanMineStates);
    }
    this.clearAllDepressedSquares();
    this.boardRenderer.clearTimerTimeout();
    this.integerTimer = Math.floor(finalTime);
    this.calculateAndDisplayStats(true);
    if (
      (this.variant === "eff boards" &&
        ["eff win", "eff always"].includes(statsRunDeepChain.value)) ||
      ["any win", "any always"].includes(statsRunDeepChain.value)
    ) {
      this.stats.lateCalcDeepChainZini();
    }
    flagToggleShowReset.value = true;
  }

  markRemainingFlags() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const isNormalMine = this.mines[x][y];
        const isMeanMine =
          this.variant === "mean openings" &&
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive;

        if (
          (isNormalMine || isMeanMine) &&
          this.tilesArray[x][y].state === CONSTANTS.UNREVEALED
        ) {
          this.tilesArray[x][y].state = CONSTANTS.FLAG;
        }
      }
    }

    this.unflagged = 0;
  }

  checkWin() {
    if (this.width * this.height - this.mineCount === this.openedTiles) {
      return true;
    } else {
      return false;
    }
  }

  makeOpeningMean(eventTimestamp) {
    //Runs through newly opened zeros and attempts to make them a mine.

    //Randomly set some of these squares to be provisional mines
    for (let zero of this.unprocessedMeanZeros) {
      if (this.meanMineStates[zero.x][zero.y].isLocked) {
        //Locked mines have their state set from before
        continue;
      }

      if (Math.random() < meanOpeningMineDensity.value) {
        this.meanMineStates[zero.x][zero.y].isMine = true;
        this.meanMineStates[zero.x][zero.y].changedToMineTimestamp =
          eventTimestamp;
      }
    }

    //https://stackoverflow.com/a/31054543
    let shuffledUnprocessedUnlockedZeros = this.unprocessedMeanZeros
      .filter((n) => !this.meanMineStates[n.x][n.y].isLocked)
      .map((n) => [Math.random(), n])
      .sort()
      .map((n) => n[1]);

    //Do another pass to make sure each new mine can be deduced from basic logic
    for (let zero of shuffledUnprocessedUnlockedZeros) {
      if (!this.meanMineStates[zero.x][zero.y].isMine) {
        continue;
      }

      let neighbours = [
        { x: zero.x - 1, y: zero.y - 1 },
        { x: zero.x - 1, y: zero.y },
        { x: zero.x - 1, y: zero.y + 1 },
        { x: zero.x, y: zero.y - 1 },
        { x: zero.x, y: zero.y + 1 },
        { x: zero.x + 1, y: zero.y - 1 },
        { x: zero.x + 1, y: zero.y },
        { x: zero.x + 1, y: zero.y + 1 },
      ];
      neighbours = neighbours.filter((square) =>
        this.checkCoordsInBounds(square.x, square.y)
      );

      let hasGoodNeighbour = false; //A good neighbour is one that tells us this square is a mine

      //Check number neighbours to see if any of them can determine this square to be a mine
      for (let neighbour of neighbours) {
        if (this.meanMineStates[neighbour.x][neighbour.y].isMine) {
          //If the neighbour is a mine then it gives no info, keep looking.
          continue;
        }

        //Check if the neighbour is "maxed out" - that is, all it's surrounding unrevealed squares are mines.
        let neighbourNeighbours = [
          { x: neighbour.x - 1, y: neighbour.y - 1 },
          { x: neighbour.x - 1, y: neighbour.y },
          { x: neighbour.x - 1, y: neighbour.y + 1 },
          { x: neighbour.x, y: neighbour.y - 1 },
          { x: neighbour.x, y: neighbour.y + 1 },
          { x: neighbour.x + 1, y: neighbour.y - 1 },
          { x: neighbour.x + 1, y: neighbour.y },
          { x: neighbour.x + 1, y: neighbour.y + 1 },
        ];
        neighbourNeighbours = neighbourNeighbours.filter((square) =>
          this.checkCoordsInBounds(square.x, square.y)
        );

        let foundUnrevealedSafe = false;

        for (let neighbourNeighbour of neighbourNeighbours) {
          //Check if the neighbour to our main cell has neighbours that are unrevealed safe
          if (
            this.tilesArray[neighbourNeighbour.x][neighbourNeighbour.y]
              .state === CONSTANTS.UNREVEALED &&
            !this.mines[neighbourNeighbour.x][neighbourNeighbour.y] &&
            !this.meanMineStates[neighbourNeighbour.x][neighbourNeighbour.y]
              .isMine
          ) {
            foundUnrevealedSafe = true;
            break;
          }
        }

        if (!foundUnrevealedSafe) {
          //Neighbour is surrounded by mines or safe squares.
          // It is good as it tells us our square is a mine.
          hasGoodNeighbour = true;
          break;
        }
      }

      //If we have a read on our square, then keep it as a mine
      //Otherwise, we need to "unmine" one of the neighbouring mines
      //or, barring that, unmine the square itself.

      //Good case - keep this square a mine
      if (hasGoodNeighbour) {
        continue;
      }

      const mineNeighbours = neighbours.filter(
        (n) => this.meanMineStates[n.x][n.y].isMine
      );

      if (mineNeighbours.length !== 0) {
        //Bad case - try to change a neighbour square to a non-mine
        const randomMineNeighbour =
          mineNeighbours[Math.floor(Math.random() * mineNeighbours.length)];

        this.meanMineStates[randomMineNeighbour.x][
          randomMineNeighbour.y
        ].isMine = false;
        this.meanMineStates[randomMineNeighbour.x][
          randomMineNeighbour.y
        ].changedToMineTimestamp = null;
      } else {
        //Very bad case - change the square itself to be a non-mine
        this.meanMineStates[zero.x][zero.y].isMine = false;
        this.meanMineStates[zero.x][zero.y].changedToMineTimestamp = null;
      }
    }

    let cellsThatNeedNumber = [];

    //Do a final pass to make sure number states are updated and squares with means mines are revealed

    for (let zero of this.unprocessedMeanZeros) {
      this.meanMineStates[zero.x][zero.y].isActive = true;
      this.meanMineStates[zero.x][zero.y].isLocked = true;

      if (this.meanMineStates[zero.x][zero.y].isMine) {
        //Close squares with mean mines, or change to flag
        if (Math.random() < meanOpeningFlagDensity.value) {
          this.tilesArray[zero.x][zero.y].state = CONSTANTS.FLAG;
          this.meanMineStates[zero.x][zero.y].startsFlagged = true;
        } else {
          this.unflagged++;
          this.tilesArray[zero.x][zero.y].state = CONSTANTS.UNREVEALED;
          this.meanMineStates[zero.x][zero.y].startsFlagged = false;
        }
      }

      //Mark neighbours that need to have their number calculated
      for (let x = zero.x - 1; x <= zero.x + 1; x++) {
        for (let y = zero.y - 1; y <= zero.y + 1; y++) {
          if (
            this.checkCoordsInBounds(x, y) &&
            !this.meanMineStates[x][y].isMine
          ) {
            cellsThatNeedNumber.push({ x, y });
          }
        }
      }
    }

    //De-duplicate the list of cellsThatNeedNumber
    //https://stackoverflow.com/questions/2218999/how-to-remove-all-duplicates-from-an-array-of-objects
    cellsThatNeedNumber = cellsThatNeedNumber.filter(
      (square, index, self) =>
        index ===
        self.findIndex(
          (otherSquare) =>
            otherSquare.x === square.x && otherSquare.y === square.y
        )
    );

    //Compute numbers to show for all cells that need this
    for (let cell of cellsThatNeedNumber) {
      this.tilesArray[cell.x][cell.y].state = this.getNumberSurroundingMines(
        cell.x,
        cell.y,
        true
      );
    }

    //Truncate as all squares have been processed
    this.unprocessedMeanZeros = [];
  }

  resetMeanMinesActiveness() {
    //Used during replays - an active mean mine is one that has been opened via an opening
    //And so the next click on it will blast (dependent on settings)

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.meanMineStates[x][y].isActive = false;
      }
    }
  }

  getSimplifiedTilesArray() {
    //Create a copy of this.tilesArray where the values are what they would be if the mean mines were removed
    let simplifiedTilesArray = this.cloneTilesArray();

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive
        ) {
          //Flip square to having state = 0 and also subtract 1 from neighbours
          simplifiedTilesArray[x][y].state = 0;
          for (let i = x - 1; i <= x + 1; i++) {
            for (let j = y - 1; j <= y + 1; j++) {
              if (i < 0 || j < 0 || i >= this.width || j >= this.height) {
                continue;
              }
              if (i === x && y === j) {
                continue;
              }
              if (
                typeof simplifiedTilesArray[i][j].state === "number" &&
                simplifiedTilesArray[i][j].state !== 0
              ) {
                simplifiedTilesArray[i][j].state--;
              }
            }
          }
        }
      }
    }

    return simplifiedTilesArray;
  }

  isTileEnclosed(tileX, tileY, useFlagVersion) {
    //Check if a tile is surrounded in such a way that we trivially
    // know that all it's neighbours are revealed or known mines

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      return false;
    }

    if (this.gameStage !== "running") {
      throw new Error("Enclosed setting should only apply during running game");
    }

    //As an initial check, look to see if any of the 3x3 block centred on tileX, tileY
    //have squares that are safe, but unrevealed

    for (let x = tileX - 1; x <= tileX + 1; x++) {
      for (let y = tileY - 1; y <= tileY + 1; y++) {
        if (!this.checkCoordsInBounds(x, y)) {
          continue;
        }
        const isMeanMine =
          this.variant === "mean openings" &&
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive;

        const isNormalOrMeanMine = this.mines[x][y] || isMeanMine;

        if (
          (typeof this.tilesArray[x][y].state !== "number" ||
            !this.canTileBeUsedForMobileScrollConditions(x, y)) &&
          !isNormalOrMeanMine
        ) {
          //Found square in 3x3 block that is unrevealed (see next comment) and safe. So return false as the centre square is not enclosed by known mines
          //We also count squares that were revealed very recently (within mobile scroll delay) as unrevealed
          return false;
        }
      }
    }

    //In the more complicated case, we need to work out which squares surrounding the centre tile are obvious mines
    //Look at the 5x5 block of numbers, and collect the list of mines which are confirmed by these

    //Confirmed mines: {x: number, y: number} coord pairs of squares known to be mines
    //Ideally, we'd use a set for this, and remove duplicated, but it's neglibile for performance
    let confirmedMines = [];

    //Get mines confirmed by 5x5 block centred on tileX, tileY
    for (let x = tileX - 2; x <= tileX + 2; x++) {
      for (let y = tileY - 2; y <= tileY + 2; y++) {
        if (!this.checkCoordsInBounds(x, y)) {
          continue;
        }
        if (typeof this.tilesArray[x][y].state !== "number") {
          continue;
        }
        if (!this.canTileBeUsedForMobileScrollConditions(x, y)) {
          continue;
        }

        confirmedMines = confirmedMines.concat(
          this.getMinesConfirmedByTile(x, y)
        );
      }
    }

    //Check mines in 3x3 block centred on tileX, tileY to make sure they are all confirmed
    for (let x = tileX - 1; x <= tileX + 1; x++) {
      for (let y = tileY - 1; y <= tileY + 1; y++) {
        if (!this.checkCoordsInBounds(x, y)) {
          continue;
        }
        if (typeof this.tilesArray[x][y].state === "number") {
          continue;
        }

        //Note - these tiles are guaranteed to be mines due to the loop we did at the start of the method
        if (
          !confirmedMines.some(
            (confMine) => x === confMine.x && y === confMine.y
          )
        ) {
          //Return false as we have found a mine in the 3x3 block that isn't confirmed by basic logic
          return false;
        }
      }
    }

    //Special case for flaggers. Tiles that can be flagged to use in a chord should not be scrollable
    if (
      this.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED &&
      useFlagVersion
    ) {
      //Check numbers adjacent to centre tile
      //Make sure each number is maxed out (and therefore can't be chorded)
      for (let x = tileX - 1; x <= tileX + 1; x++) {
        for (let y = tileY - 1; y <= tileY + 1; y++) {
          if (!this.checkCoordsInBounds(x, y)) {
            continue;
          }
          if (typeof this.tilesArray[x][y].state !== "number") {
            continue;
          }
          if (this.tilesArray[x][y].state === 0) {
            continue;
          }

          let minesConfedByCentreAdjacentNumber = this.getMinesConfirmedByTile(
            x,
            y
          );

          if (minesConfedByCentreAdjacentNumber.length === 0) {
            //We know that the tile adjacent to centre, is not a zero, so if it was maxed out
            //it would confirm mines equal to it's number
            //But because it confirms no mines, then it must have surrounding safe squares
            //So it may get chorded. Therefore are flag is not enclosed
            return false; //ret false as flag may be used for chording
          }
        }
      }
    }

    return true;
  }

  getMinesConfirmedByTile(tileX, tileY) {
    if (typeof this.tilesArray[tileX][tileY].state !== "number") {
      throw new Error(
        "This function is expected to be called on a number tile"
      );
    }

    let potentiallyConfirmedMines = [];

    for (let x = tileX - 1; x <= tileX + 1; x++) {
      for (let y = tileY - 1; y <= tileY + 1; y++) {
        if (!this.checkCoordsInBounds(x, y)) {
          continue;
        }
        if (x === tileX && y === tileY) {
          continue;
        }

        const isMeanMine =
          this.variant === "mean openings" &&
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive;

        const isNormalOrMeanMine = this.mines[x][y] || isMeanMine;

        if (isNormalOrMeanMine) {
          //Neighbour is a mine. If the centre square turns out to be maxed out then this mine is proven
          potentiallyConfirmedMines.push({ x, y });
        } else if (
          (typeof this.tilesArray[x][y].state !== "number" ||
            !this.canTileBeUsedForMobileScrollConditions(x, y)) &&
          !isNormalOrMeanMine
        ) {
          //Neighbour is unrevealed and safe. Therefore the centre square is NOT maxed out
          //So we cannot deduce any of the mines used basic "max out" logic
          //Note we treat squares that have been revealed very recently (within mobile scroll delay) as unrevealed
          return [];
        } else {
          //Neighbour is revealed and safe, do nothing
        }
      }
    }

    return potentiallyConfirmedMines;
  }

  //Check if tile was revealed a while ago
  canTileBeUsedForMobileScrollConditions(tileX, tileY) {
    if (!this.checkCoordsInBounds(tileX, tileY)) {
      return false; //Defensive
    }

    let tileRevealedSufficientlyLongAgo =
      this.tilesArray[tileX][tileY]?.revealedTimeForMobileScrollBehaviour ===
      null ||
      this.getTime() -
      this.tilesArray[tileX][tileY]?.revealedTimeForMobileScrollBehaviour >=
      mobileDelayForEnableScroll.value / 1000;

    return tileRevealedSufficientlyLongAgo;
  }

  calculateAndDisplayStats(isWin) {
    if (this.variant === "mean openings") {
      let simplifiedTilesArray = this.getSimplifiedTilesArray();
      this.stats.calcStats(isWin, simplifiedTilesArray);
    } else {
      this.stats.calcStats(isWin, this.tilesArray);
    }
    showStatsBlock.value = true;
  }

  attemptFaceClick(canvasCoords, flooredCoords, touchIdentifier) {
    if (
      this.gameStage !== "pregame" &&
      showBorders.value &&
      canvasCoords.canvasRawY <= boardTopPadding.value
    ) {
      //Check if face is being clicked on
      const topPanelMiddleWidth = (this.width * this.tileSize) / 2;
      const topPanelInnerPadding = this.tileSize / 4;
      const faceWidth = topPanelHeight.value - 2 * topPanelInnerPadding;
      const faceStartX =
        boardHorizontalPadding.value + topPanelMiddleWidth - faceWidth / 2;
      const faceStartY =
        topPanelTopAndBottomBorder.value + topPanelInnerPadding;

      const isWithinSmallHitbox =
        canvasCoords.canvasRawX >= faceStartX &&
        canvasCoords.canvasRawX <= faceStartX + faceWidth &&
        canvasCoords.canvasRawY >= faceStartY &&
        canvasCoords.canvasRawY <= faceStartY + faceWidth;

      const isWithinLargeHitbox =
        canvasCoords.canvasRawX >= boardHorizontalPadding.value &&
        canvasCoords.canvasRawX <=
        boardHorizontalPadding.value + this.width * this.tileSize &&
        canvasCoords.canvasRawY >= topPanelTopAndBottomBorder.value &&
        canvasCoords.canvasRawY <=
        topPanelTopAndBottomBorder.value + topPanelHeight.value;

      const useSmallHitbox =
        faceHitbox.value === "face" ||
        (faceHitbox.value === "adaptive" && this.gameStage === "running");

      if (
        (useSmallHitbox && isWithinSmallHitbox) ||
        (!useSmallHitbox && isWithinLargeHitbox)
      ) {
        if (!this.quickPaint.confirmBoardResetIfQuickPaint()) {
          return true; //Clicked on, but stopped, though still need to stop processing click further
        }

        this.updateDepressedSquares(
          flooredCoords.tileX, //Coords not strictly necessary, but including incase this changes
          flooredCoords.tileY,
          false,
          touchIdentifier
        );
        this.resetBoard(false); //Reset and don't process the click any further
        return true; //reset, don't process click further
      }
    }

    return false; //Not clicked on
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

    if (this.hintActive) {
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