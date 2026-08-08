import skinManager from "src/classes/SkinManager";

import {
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
  autoHintBackdrop,
  analyseZiniTotal,
} from "src/composables/useSettings";

class BoardRenderer {
  constructor(board) {
    this.board = board;
  }

  draw() {
    this.board.mainCanvasCtx.clearRect(0, 0, this.board.mainCanvas.value.width, this.board.mainCanvas.value.height);

    if (this.board.gameStage === "analyse" || this.board.gameStage === "replay") {
      this.drawTilesAndAnalysis();
    } else {
      this.drawTiles();
    }
    if (this.board.quickPaint.quickPaintActive) {
      this.drawTilesPaint();
    }
    if (this.board.hintActive) {
      this.drawTilesHint();
    }
    this.drawBorders();
    this.drawCoords();
    this.drawTopBar();

    if (this.board.gameStage === "replay") {
      //this.drawTilesZiniDelta();
      this.drawCursor();
    }
  }

  drawTiles() {
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        this.board.tilesArray[x][y].draw(
          x * this.board.tileSize + boardHorizontalPadding.value,
          y * this.board.tileSize + boardTopPadding.value,
          this.board.tileSize
        );
      }
    }
  }

  drawTilesPaint() {
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        this.board.tilesArray[x][y].drawPaint(
          x * this.board.tileSize + boardHorizontalPadding.value,
          y * this.board.tileSize + boardTopPadding.value,
          this.board.tileSize
        );
      }
    }
  }

  drawTilesHint() {
    const suppressHighlight = autoHintBackdrop.value === "minimal";

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        this.board.tilesArray[x][y].drawHint(
          x * this.board.tileSize + boardHorizontalPadding.value,
          y * this.board.tileSize + boardTopPadding.value,
          this.board.tileSize,
          suppressHighlight
        );
      }
    }
  }

  drawTilesZiniDelta() {
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        this.board.tilesArray[x][y].drawZiniDelta(
          x * this.board.tileSize + boardHorizontalPadding.value,
          y * this.board.tileSize + boardTopPadding.value,
          this.board.tileSize
        );
      }
    }
  }

  drawTilesAndAnalysis() {
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        this.board.tilesArray[x][y].drawIncludingAnalysis(
          x * this.board.tileSize + boardHorizontalPadding.value,
          y * this.board.tileSize + boardTopPadding.value,
          this.board.tileSize
        );
      }
    }
  }

  drawBorders() {
    if (!showBorders.value) {
      return;
    }
    const ctx = this.board.mainCanvasCtx; //Give it a slightly shorter name...

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
      this.board.width * this.board.tileSize + boardHorizontalPadding.value,
      0,
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value
    );
    //bottom left corner
    ctx.drawImage(
      skinManager.getImage("b_c_bot_left"),
      0,
      this.board.height * this.board.tileSize + boardTopPadding.value,
      boardHorizontalPadding.value,
      boardBottomPadding.value
    );
    //bottom right corner
    ctx.drawImage(
      skinManager.getImage("b_c_bot_right"),
      this.board.width * this.board.tileSize + boardHorizontalPadding.value,
      this.board.height * this.board.tileSize + boardTopPadding.value,
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
      this.board.width * this.board.tileSize + boardHorizontalPadding.value,
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
      this.board.tileSize * this.board.width,
      topPanelTopAndBottomBorder.value
    );
    //middle line
    ctx.drawImage(
      skinManager.getImage("b_hor"),
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value + topPanelHeight.value,
      this.board.tileSize * this.board.width,
      topPanelTopAndBottomBorder.value
    );
    //bottom line
    ctx.drawImage(
      skinManager.getImage("b_hor"),
      boardHorizontalPadding.value,
      this.board.height * this.board.tileSize + boardTopPadding.value,
      this.board.tileSize * this.board.width,
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
      this.board.width * this.board.tileSize + boardHorizontalPadding.value,
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
      this.board.height * this.board.tileSize
    );
    //right long segment
    ctx.drawImage(
      skinManager.getImage("b_vert"),
      this.board.width * this.board.tileSize + boardHorizontalPadding.value,
      boardTopPadding.value,
      boardHorizontalPadding.value,
      this.board.height * this.board.tileSize
    );
  }

  drawCoords() {
    if (!showCoords.value) {
      return;
    }
    if (!showBorders.value) {
      return;
    }

    const ctx = this.board.mainCanvasCtx; //Give it a slightly shorter name...

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = `${this.board.tileSize / 2}px monospace`;
    ctx.fillStyle = skinManager.getCoordTextColour();

    //Horizontal coords
    for (let i = 0; i < this.board.width; i++) {
      const maxWidth = this.board.tileSize;

      const yPos =
        topPanelTopAndBottomBorder.value +
        topPanelHeight.value +
        topPanelTopAndBottomBorder.value / 2;

      const xPos =
        boardHorizontalPadding.value + this.board.tileSize / 2 + i * this.board.tileSize;

      ctx.fillText(this.coordIndexToText(i, true), xPos, yPos, maxWidth);
    }

    //Vertical coords
    for (let i = 0; i < this.board.height; i++) {
      const maxWidth = boardHorizontalPadding.value;

      const yPos =
        boardTopPadding.value + this.board.tileSize / 2 + i * this.board.tileSize;

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
      index = this.board.height - 1 - index;
    }

    if (!coordsUseZeroIndexing.value) {
      //Adjust for coords starting from zero
      index += 1;
    }

    return index.toString();
  }

  drawTopBar() {
    if (this.board.quickPaint.quickPaintActive) {
      this.drawQuickPaintTopBar();
    } else {
      this.drawStandardTopBar();
    }
  }

  drawStandardTopBar() {
    if (!showBorders.value) {
      return;
    }

    const ctx = this.board.mainCanvasCtx; //Give it a slightly shorter name...

    //A bunch of variables for positioning things
    const topPanelMiddleHeight = topPanelHeight.value / 2;
    const topPanelMiddleWidth = (this.board.width * this.board.tileSize) / 2;
    const topPanelInnerPadding = this.board.tileSize / 4;
    const mineStartX = boardHorizontalPadding.value + topPanelInnerPadding;
    const timerStartX =
      boardHorizontalPadding.value +
      this.board.width * this.board.tileSize -
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
    ctx.font = `${this.board.tileSize}px monospace`;

    ctx.fillStyle = skinManager.getMineTimerTextColour();

    //Draw mine counter
    if (showMineCount.value) {
      ctx.textAlign = "left";
      ctx.fillText(
        this.board.unflagged,
        mineStartX,
        mineTimerStartY,
        mineTimerMaxWidth
      );
    }

    //Draw timer (or zini value if analysing on zini explorer)
    if (showTimer.value) {
      let timerOrZini = this.board.integerTimer;
      if (this.board.variant === "zini explorer" && this.board.gameStage === "analyse") {
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

    const ctx = this.board.mainCanvasCtx; //Give it a slightly shorter name...

    //A bunch of variables for positioning things
    const topPanelMiddleHeight = topPanelHeight.value / 2;
    const topPanelMiddleWidth = (this.board.width * this.board.tileSize) / 2;
    const topPanelInnerPadding = this.board.tileSize / 4;
    const redStartX = boardHorizontalPadding.value + topPanelInnerPadding;
    const dotStartX =
      boardHorizontalPadding.value +
      this.board.width * this.board.tileSize -
      topPanelInnerPadding; //note dot counter is right aligned, so this is where right edge of dot counter is
    const counterStartY =
      topPanelTopAndBottomBorder.value + topPanelMiddleHeight;
    const faceWidth = topPanelHeight.value - 2 * topPanelInnerPadding;
    const faceStartX =
      boardHorizontalPadding.value + topPanelMiddleWidth - faceWidth / 2;
    const faceStartY = topPanelTopAndBottomBorder.value + topPanelInnerPadding;

    const largeMaxWidth = faceStartX - redStartX;
    const smallMaxWidth = this.board.tileSize * 1.5;
    const orangeLeftGap = this.board.tileSize / 4;
    const orangeStartX = redStartX + smallMaxWidth + orangeLeftGap;

    let noSpaceForOrangeCounter = false;
    if (smallMaxWidth * 2 + orangeLeftGap > largeMaxWidth) {
      noSpaceForOrangeCounter = true;
    }
    const redMaxWidth = noSpaceForOrangeCounter ? largeMaxWidth : smallMaxWidth;

    this.drawTopBarFlatBackground();

    //Set up font for counter text
    ctx.textBaseline = "middle";
    ctx.font = `${this.board.tileSize}px monospace`;

    //Draw red counter
    ctx.fillStyle = skinManager.getRedCounterTextColour();
    ctx.textAlign = "left";
    ctx.fillText(this.board.quickPaint.redCount, redStartX, counterStartY, redMaxWidth);

    //Draw orange counter
    if (!noSpaceForOrangeCounter) {
      ctx.fillStyle = skinManager.getOrangeCounterTextColour();
      ctx.fillText(
        this.board.quickPaint.orangeCount,
        orangeStartX,
        counterStartY,
        smallMaxWidth
      );
    }

    //Draw dots count
    ctx.textAlign = "right";
    ctx.fillStyle = skinManager.getDotsCounterTextColour();
    ctx.fillText(this.board.quickPaint.dotCount, dotStartX, counterStartY, largeMaxWidth);

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
    this.board.mainCanvasCtx.fillStyle = skinManager.getTopPanelColour();
    this.board.mainCanvasCtx.fillRect(
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value,
      this.board.width * this.board.tileSize,
      topPanelHeight.value
    );
  }

  drawCursor() {
    //Cursor shown on replays
    if (
      this.board.cursor === null ||
      this.board.cursor.x === null ||
      this.board.cursor.y === null
    ) {
      return;
    }

    const cursorStartX =
      boardHorizontalPadding.value + this.board.cursor.x * this.board.tileSize;
    const cursorStartY = boardTopPadding.value + this.board.cursor.y * this.board.tileSize;

    const mouseImg = skinManager.getImage("cursor");

    const aspectRatio = mouseImg.width / mouseImg.height;

    const cursorHeight = (this.board.tileSize * 3) / 4; //Height will be 3/4 of a tile
    const cursorWidth = cursorHeight * aspectRatio;

    this.board.mainCanvasCtx.drawImage(
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
      this.board.width * tileSizeSlider.value + 2 * boardHorizontalPadding.value;
    const mainCanvasHeight =
      this.board.height * tileSizeSlider.value +
      boardTopPadding.value +
      boardBottomPadding.value;

    this.board.mainCanvas.value.width = mainCanvasWidth;
    this.board.mainCanvas.value.height = mainCanvasHeight;

    //Also set height in style (needed for flex layout to work)
    this.board.mainCanvas.value.style.width = `${mainCanvasWidth}px`;
    this.board.mainCanvas.value.style.height = `${mainCanvasHeight}px`;

    //Figure out what left padding should be in order to centre the board
    let gameContainerWidth =
      this.board.gameContainerDiv.value.getBoundingClientRect().width;

    let marginToCentre = Math.max(
      (gameContainerWidth - mainCanvasWidth) / 2,
      0
    );

    gameCentrePadding.value = marginToCentre;
  }

  refreshCanvasSize() {
    this.updateBoardPixelDimensions();

    this.board.tileSize = tileSizeSlider.value;
    this.draw();
  }


  updateIntegerTimerIfNeeded() {
    let newTimerValue = Math.floor(this.board.getTime());

    if (newTimerValue !== this.board.integerTimer) {
      this.board.integerTimer = newTimerValue;
      this.drawTopBar();
    }

    this.board.updateTimerSetTimeoutHandle = setTimeout(
      this.updateIntegerTimerIfNeeded.bind(this),
      100
    );
  }

  clearTimerTimeout() {
    //May refactor in future. Disables setTimeout for timer
    if (this.board.updateTimerSetTimeoutHandle !== null) {
      clearTimeout(this.board.updateTimerSetTimeoutHandle);
    }
  }
}

export default BoardRenderer;