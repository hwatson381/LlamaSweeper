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
import skinManager from "src/classes/SkinManager";
import Tile from "src/classes/Tile";
import Utils from "src/classes/Utils";
import ZiniExplore from "src/classes/ZiniExplore";
import statsWorkerManager from "src/classes/StatsWorkerManager";
import BoardImportExport from "src/classes/BoardImportExport";

import CONSTANTS from "src/includes/Constants";
import playSound from "src/includes/Sounds";

import { Dialog, } from "quasar"

import {
  wasmAvailable,
  showStatsBlock,
  statsRunDeepChain,
  tileSizeSlider,
  gameCentrePadding,
  coordsUseLetters,
  coordsUseInvertedY,
  coordsUseZeroIndexing,
  boardHorizontalPadding,
  boardTopPadding,
  boardBottomPadding,
  topPanelTopAndBottomBorder,
  topPanelHeight,
  showBorders,
  showCoords,
  showMineCount,
  showTimer,
  boardWidth,
  boardHeight,
  boardMines,
  variant,
  chordingButtons,
  zeroStart,
  noGuessing,
  noGuessingMaxAttempts,
  autoHintCriteria,
  autoHintTime,
  autoHintDelay,
  autoHintVariants,
  autoHintBackdrop,
  showQuickPaintOptions,
  quickPaintModeDisplay,
  quickPaintClearable,
  quickPaintInitialOnlyMines,
  quickPaintMinimalMode,
  quickPaintOnlyTrivialLogic,
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
  analyseZiniTotal,
  ziniRunnerActive,
  keyboardClickOpenOnKeyDown,
} from "src/composables/useSettings";

class BoardRenderer {
  constructor(board) {
    this.board = board;
  }

  draw() {
    this.mainCanvasCtx.clearRect(0, 0, this.mainCanvas.value.width, this.mainCanvas.value.height);

    if (this.gameStage === "analyse" || this.gameStage === "replay") {
      this.drawTilesAndAnalysis();
    } else {
      this.drawTiles();
    }
    if (this.quickPaintActive) {
      this.drawTilesPaint();
    }
    if (this.hintActive) {
      this.drawTilesHint();
    }
    this.drawBorders();
    this.drawCoords();
    this.drawTopBar();

    if (this.gameStage === "replay") {
      //this.drawTilesZiniDelta();
      this.drawCursor();
    }
  }

  drawTiles() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].draw(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize
        );
      }
    }
  }

  drawTilesPaint() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].drawPaint(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize
        );
      }
    }
  }

  drawTilesHint() {
    const suppressHighlight = autoHintBackdrop.value === "minimal";

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].drawHint(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize,
          suppressHighlight
        );
      }
    }
  }

  drawTilesZiniDelta() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].drawZiniDelta(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize
        );
      }
    }
  }

  drawTilesAndAnalysis() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].drawIncludingAnalysis(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize
        );
      }
    }
  }

  drawBorders() {
    if (!showBorders.value) {
      return;
    }
    const ctx = this.mainCanvasCtx; //Give it a slightly shorter name...

    //Draw borders
    //top left corner
    ctx.drawImage(
      skinManager.getImage("b_c_up_left"),
      0,
      0,
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value
    );
    //top right corner
    ctx.drawImage(
      skinManager.getImage("b_c_up_right"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      0,
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value
    );
    //bottom left corner
    ctx.drawImage(
      skinManager.getImage("b_c_bot_left"),
      0,
      this.height * this.tileSize + boardTopPadding.value,
      boardHorizontalPadding.value,
      boardBottomPadding.value
    );
    //bottom right corner
    ctx.drawImage(
      skinManager.getImage("b_c_bot_right"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      this.height * this.tileSize + boardTopPadding.value,
      boardHorizontalPadding.value,
      boardBottomPadding.value
    );

    //t pieces (between top of board and mines/timer panel)
    //left t piece
    ctx.drawImage(
      skinManager.getImage("t_left"),
      0,
      topPanelTopAndBottomBorder.value + topPanelHeight.value,
      boardHorizontalPadding.value,
      boardBottomPadding.value
    );
    //right t piece
    ctx.drawImage(
      skinManager.getImage("t_right"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value + topPanelHeight.value,
      boardHorizontalPadding.value,
      boardBottomPadding.value
    );

    //connecting lines
    //top line
    ctx.drawImage(
      skinManager.getImage("b_hor"),
      boardHorizontalPadding.value,
      0,
      this.tileSize * this.width,
      topPanelTopAndBottomBorder.value
    );
    //middle line
    ctx.drawImage(
      skinManager.getImage("b_hor"),
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value + topPanelHeight.value,
      this.tileSize * this.width,
      topPanelTopAndBottomBorder.value
    );
    //bottom line
    ctx.drawImage(
      skinManager.getImage("b_hor"),
      boardHorizontalPadding.value,
      this.height * this.tileSize + boardTopPadding.value,
      this.tileSize * this.width,
      boardBottomPadding.value
    );
    //left short segment
    ctx.drawImage(
      skinManager.getImage("b_vert"),
      0,
      topPanelTopAndBottomBorder.value,
      boardHorizontalPadding.value,
      topPanelHeight.value
    );
    //right short segment
    ctx.drawImage(
      skinManager.getImage("b_vert"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value,
      boardHorizontalPadding.value,
      topPanelHeight.value
    );
    //left long segment
    ctx.drawImage(
      skinManager.getImage("b_vert"),
      0,
      boardTopPadding.value,
      boardHorizontalPadding.value,
      this.height * this.tileSize
    );
    //right long segment
    ctx.drawImage(
      skinManager.getImage("b_vert"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      boardTopPadding.value,
      boardHorizontalPadding.value,
      this.height * this.tileSize
    );
  }

  drawCoords() {
    if (!showCoords.value) {
      return;
    }
    if (!showBorders.value) {
      return;
    }

    const ctx = this.mainCanvasCtx; //Give it a slightly shorter name...

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = `${this.tileSize / 2}px monospace`;
    ctx.fillStyle = skinManager.getCoordTextColour();

    //Horizontal coords
    for (let i = 0; i < this.width; i++) {
      const maxWidth = this.tileSize;

      const yPos =
        topPanelTopAndBottomBorder.value +
        topPanelHeight.value +
        topPanelTopAndBottomBorder.value / 2;

      const xPos =
        boardHorizontalPadding.value + this.tileSize / 2 + i * this.tileSize;

      ctx.fillText(this.coordIndexToText(i, true), xPos, yPos, maxWidth);
    }

    //Vertical coords
    for (let i = 0; i < this.height; i++) {
      const maxWidth = boardHorizontalPadding.value;

      const yPos =
        boardTopPadding.value + this.tileSize / 2 + i * this.tileSize;

      const xPos = boardHorizontalPadding.value / 2;

      ctx.fillText(this.coordIndexToText(i, false), xPos, yPos, maxWidth);
    }
  }

  coordIndexToText(index, isHorizontal) {
    if (isHorizontal && coordsUseLetters.value) {
      //Horizontal on text mode gives excel style values (A->Z, AA->ZZ etc)
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      let txt = "";

      while (true) {
        txt = alphabet.charAt(index % 26) + txt;

        if (index < 26) {
          break;
        }

        index = Math.floor(index / 26) - 1;
      }

      return txt;
    }

    if (!isHorizontal && !coordsUseInvertedY.value) {
      //Handle Y axis getting flipped
      index = this.height - 1 - index;
    }

    if (!coordsUseZeroIndexing.value) {
      //Adjust for coords starting from zero
      index += 1;
    }

    return index.toString();
  }

  drawTopBar() {
    if (this.quickPaintActive) {
      this.drawQuickPaintTopBar();
    } else {
      this.drawStandardTopBar();
    }
  }

  drawStandardTopBar() {
    if (!showBorders.value) {
      return;
    }

    const ctx = this.mainCanvasCtx; //Give it a slightly shorter name...

    //A bunch of variables for positioning things
    const topPanelMiddleHeight = topPanelHeight.value / 2;
    const topPanelMiddleWidth = (this.width * this.tileSize) / 2;
    const topPanelInnerPadding = this.tileSize / 4;
    const mineStartX = boardHorizontalPadding.value + topPanelInnerPadding;
    const timerStartX =
      boardHorizontalPadding.value +
      this.width * this.tileSize -
      topPanelInnerPadding; //note timer is right aligned, so this is where right edge of timer is
    const mineTimerStartY =
      topPanelTopAndBottomBorder.value + topPanelMiddleHeight;
    const faceWidth = topPanelHeight.value - 2 * topPanelInnerPadding;
    const faceStartX =
      boardHorizontalPadding.value + topPanelMiddleWidth - faceWidth / 2;
    const faceStartY = topPanelTopAndBottomBorder.value + topPanelInnerPadding;

    const mineTimerMaxWidth = faceStartX - mineStartX;

    this.drawTopBarFlatBackground();

    //Set up font for mine/timer text
    ctx.textBaseline = "middle";
    ctx.font = `${this.tileSize}px monospace`;

    ctx.fillStyle = skinManager.getMineTimerTextColour();

    //Draw mine counter
    if (showMineCount.value) {
      ctx.textAlign = "left";
      ctx.fillText(
        this.unflagged,
        mineStartX,
        mineTimerStartY,
        mineTimerMaxWidth
      );
    }

    //Draw timer (or zini value if analysing on zini explorer)
    if (showTimer.value) {
      let timerOrZini = this.integerTimer;
      if (this.variant === "zini explorer" && this.gameStage === "analyse") {
        timerOrZini = analyseZiniTotal.value;
      }

      ctx.textAlign = "right";
      ctx.fillText(
        timerOrZini,
        timerStartX,
        mineTimerStartY,
        mineTimerMaxWidth
      );
    }

    //Draw face
    ctx.drawImage(
      skinManager.getImage("f_unpressed"),
      faceStartX,
      faceStartY,
      faceWidth,
      faceWidth
    );
  }

  drawQuickPaintTopBar() {
    if (!showBorders.value) {
      return;
    }

    const ctx = this.mainCanvasCtx; //Give it a slightly shorter name...

    //A bunch of variables for positioning things
    const topPanelMiddleHeight = topPanelHeight.value / 2;
    const topPanelMiddleWidth = (this.width * this.tileSize) / 2;
    const topPanelInnerPadding = this.tileSize / 4;
    const redStartX = boardHorizontalPadding.value + topPanelInnerPadding;
    const dotStartX =
      boardHorizontalPadding.value +
      this.width * this.tileSize -
      topPanelInnerPadding; //note dot counter is right aligned, so this is where right edge of dot counter is
    const counterStartY =
      topPanelTopAndBottomBorder.value + topPanelMiddleHeight;
    const faceWidth = topPanelHeight.value - 2 * topPanelInnerPadding;
    const faceStartX =
      boardHorizontalPadding.value + topPanelMiddleWidth - faceWidth / 2;
    const faceStartY = topPanelTopAndBottomBorder.value + topPanelInnerPadding;

    const largeMaxWidth = faceStartX - redStartX;
    const smallMaxWidth = this.tileSize * 1.5;
    const orangeLeftGap = this.tileSize / 4;
    const orangeStartX = redStartX + smallMaxWidth + orangeLeftGap;

    let noSpaceForOrangeCounter = false;
    if (smallMaxWidth * 2 + orangeLeftGap > largeMaxWidth) {
      noSpaceForOrangeCounter = true;
    }
    const redMaxWidth = noSpaceForOrangeCounter ? largeMaxWidth : smallMaxWidth;

    this.drawTopBarFlatBackground();

    //Set up font for counter text
    ctx.textBaseline = "middle";
    ctx.font = `${this.tileSize}px monospace`;

    //Draw red counter
    ctx.fillStyle = skinManager.getRedCounterTextColour();
    ctx.textAlign = "left";
    ctx.fillText(this.redCount, redStartX, counterStartY, redMaxWidth);

    //Draw orange counter
    if (!noSpaceForOrangeCounter) {
      ctx.fillStyle = skinManager.getOrangeCounterTextColour();
      ctx.fillText(
        this.orangeCount,
        orangeStartX,
        counterStartY,
        smallMaxWidth
      );
    }

    //Draw dots count
    ctx.textAlign = "right";
    ctx.fillStyle = skinManager.getDotsCounterTextColour();
    ctx.fillText(this.dotCount, dotStartX, counterStartY, largeMaxWidth);

    //Draw face
    ctx.drawImage(
      skinManager.getImage("f_unpressed"),
      faceStartX,
      faceStartY,
      faceWidth,
      faceWidth
    );
  }

  drawTopBarFlatBackground() {
    //Draw flat background for top panel
    this.mainCanvasCtx.fillStyle = skinManager.getTopPanelColour();
    this.mainCanvasCtx.fillRect(
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value,
      this.width * this.tileSize,
      topPanelHeight.value
    );
  }

  drawCursor() {
    //Cursor shown on replays
    if (
      this.cursor === null ||
      this.cursor.x === null ||
      this.cursor.y === null
    ) {
      return;
    }

    const cursorStartX =
      boardHorizontalPadding.value + this.cursor.x * this.tileSize;
    const cursorStartY = boardTopPadding.value + this.cursor.y * this.tileSize;

    const mouseImg = skinManager.getImage("cursor");

    const aspectRatio = mouseImg.width / mouseImg.height;

    const cursorHeight = (this.tileSize * 3) / 4; //Height will be 3/4 of a tile
    const cursorWidth = cursorHeight * aspectRatio;

    this.mainCanvasCtx.drawImage(
      mouseImg,
      cursorStartX,
      cursorStartY,
      cursorWidth,
      cursorHeight
    );
  }

  updateBoardPixelDimensions() {
    //Set pixel dimensions for board
    const mainCanvasWidth =
      this.width * tileSizeSlider.value + 2 * boardHorizontalPadding.value;
    const mainCanvasHeight =
      this.height * tileSizeSlider.value +
      boardTopPadding.value +
      boardBottomPadding.value;

    this.mainCanvas.value.width = mainCanvasWidth;
    this.mainCanvas.value.height = mainCanvasHeight;

    //Also set height in style (needed for flex layout to work)
    this.mainCanvas.value.style.width = `${mainCanvasWidth}px`;
    this.mainCanvas.value.style.height = `${mainCanvasHeight}px`;

    //Figure out what left padding should be in order to centre the board
    let gameContainerWidth =
      this.gameContainerDiv.value.getBoundingClientRect().width;

    let marginToCentre = Math.max(
      (gameContainerWidth - mainCanvasWidth) / 2,
      0
    );

    gameCentrePadding.value = marginToCentre;
  }

  refreshCanvasSize() {
    this.updateBoardPixelDimensions();

    this.tileSize = tileSizeSlider.value;
    this.draw();
  }


  updateIntegerTimerIfNeeded() {
    let newTimerValue = Math.floor(this.getTime());

    if (newTimerValue !== this.integerTimer) {
      this.integerTimer = newTimerValue;
      this.drawTopBar();
    }

    this.updateTimerSetTimeoutHandle = setTimeout(
      this.updateIntegerTimerIfNeeded.bind(this),
      100
    );
  }

  clearTimerTimeout() {
    //May refactor in future. Disables setTimeout for timer
    if (this.updateTimerSetTimeoutHandle !== null) {
      clearTimeout(this.updateTimerSetTimeoutHandle);
    }
  }
}

export default BoardRenderer;