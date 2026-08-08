import CONSTANTS from "src/includes/Constants";
import playSound from "src/includes/Sounds";

import {
  statsRunDeepChain,
  chordingButtons,
  flagToggleShowReset,
  mobileModeEnabled,
  mobileScrollSetting,
  mobileDelayForEnableScroll,
  soundEffectsEnabled,
  meanMineClickBehaviour,
} from "src/composables/useSettings";

class BoardActions {
  constructor(board) {
    this.board = board;
  }

  attemptFlag(
    unflooredTileX,
    unflooredTileY,
    includeInStats = false,
    hasSoundEffect = false
  ) {
    let time = this.board.getTime();

    let { tileX, tileY } = this.board.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (this.board.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED) {
      //Flag the square
      hasSoundEffect && soundEffectsEnabled.value && playSound("flag");
      this.board.tilesArray[tileX][tileY].state = CONSTANTS.FLAG;
      this.board.unflagged--;
      if (
        this.board.mines[tileX][tileY] ||
        (this.board.variant === "mean openings" &&
          this.board.meanMineStates[tileX][tileY].isMine)
      ) {
        //Flags on correct square count towards effective clicks
        includeInStats &&
          this.board.stats.addRight(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
      } else {
        //Flags on incorrect square are wasted
        includeInStats &&
          this.board.stats.addWastedRight(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
      }

      if (this.board.hintActive) {
        const suppressDraw = true;
        this.board.boardHint.hideHint(suppressDraw);
      }
    } else if (this.board.tilesArray[tileX][tileY].state === CONSTANTS.FLAG) {
      //Unflag a square
      hasSoundEffect && soundEffectsEnabled.value && playSound("flag");
      this.board.tilesArray[tileX][tileY].state = CONSTANTS.UNREVEALED;
      this.board.unflagged++;
      includeInStats &&
        this.board.stats.addWastedRight(
          tileX,
          tileY,
          unflooredTileX,
          unflooredTileY,
          time
        );

      if (this.board.hintActive) {
        const suppressDraw = true;
        this.board.boardHint.hideHint(suppressDraw);
      }
    } else {
      //Wasted flag input
      includeInStats &&
        this.board.stats.addWastedRight(
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
    let time = this.board.getTime();

    let { tileX, tileY } = this.board.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      this.board.boardInput.updateDepressedSquares(tileX, tileY, false, touchIdentifier); //Undepress square as we have just done leftMouseUp
      return;
    }

    if (typeof this.board.tilesArray[tileX][tileY].state === "number") {
      //Attempt chord tile
      this.attemptChordOnly(unflooredTileX, unflooredTileY, touchIdentifier);
    } else if (this.board.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED) {
      //Attempt to dig tile
      this.attemptDigOnly(
        unflooredTileX,
        unflooredTileY,
        touchIdentifier,
        eventTimestamp
      );
    } else {
      this.board.stats.addWastedLeft(
        tileX,
        tileY,
        unflooredTileX,
        unflooredTileY,
        time
      );
    }
  }

  attemptChordOnly(unflooredTileX, unflooredTileY, touchIdentifier) {
    let time = this.board.getTime();

    let { tileX, tileY } = this.board.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    this.board.boardInput.updateDepressedSquares(tileX, tileY, false, touchIdentifier); //Undepress square as we have just done leftMouseUp

    //expire the chord for l+r so that releasing let click afterwards doesn't do a dig
    if (touchIdentifier === "mouse" && chordingButtons.value === "l+r") {
      this.board.boardInput.lrChordingState.hoverType = "empty";
    }

    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (typeof this.board.tilesArray[tileX][tileY].state === "number") {
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
      this.board.stats.addWastedChord(
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
    let time = this.board.getTime();

    let { tileX, tileY } = this.board.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    this.board.boardInput.updateDepressedSquares(tileX, tileY, false, touchIdentifier); //Undepress square as we have just done leftMouseUp

    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (this.board.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED) {
      //Attempt to dig tile, although this behaviour may be changed on mean openings mode
      let doDig = true;

      if (
        this.board.variant === "mean openings" &&
        this.board.meanMineStates[tileX][tileY].isMine
      ) {
        //Clicked on a mean mine. So this either blasts, flags, shields or ignores depending on settings

        if (meanMineClickBehaviour.value === "blast") {
          //Do nothing as we will blast later since doDig is set
          doDig = true; //defensive
        } else if (meanMineClickBehaviour.value === "flag") {
          //Click becomes a flag instead
          doDig = false;
          this.board.tilesArray[tileX][tileY].state = CONSTANTS.FLAG;
          this.board.unflagged--;
          this.board.stats.addRight(
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
            this.board.meanMineStates[tileX][tileY].changedToMineTimestamp + 500
          ) {
            //Click occured soon after mean mine was placed, click just gets wasted
            doDig = false;
            this.board.stats.addWastedLeft(
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
          this.board.stats.addWastedLeft(
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
        this.board.stats.addLeft(tileX, tileY, unflooredTileX, unflooredTileY, time);
      }
    } else {
      this.board.stats.addWastedLeft(
        tileX,
        tileY,
        unflooredTileX,
        unflooredTileY,
        time
      );
    }
  }

  attemptFlagOrChord(unflooredTileX, unflooredTileY, touchIdentifier) {
    let time = this.board.getTime();

    let { tileX, tileY } = this.board.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    //Undepress square as we have just done ended a touch input
    //Note that flag touch inputs on numbers will depress surrounding squares as this does a chord
    this.board.boardInput.updateDepressedSquares(tileX, tileY, false, touchIdentifier);

    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (typeof this.board.tilesArray[tileX][tileY].state === "number") {
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

  openTile(x, y, hasSoundEffect = false) {
    if (!this.board.checkCoordsInBounds(x, y)) {
      return; //ignore squares outside board
    }

    //Opens a square, possibly triggering an opening recursively
    if (this.board.tilesArray[x][y].state !== CONSTANTS.UNREVEALED) {
      return;
    }

    const isNormalMine = this.board.mines[x][y];
    const isMeanMine =
      this.board.variant === "mean openings" &&
      this.board.meanMineStates[x][y].isMine &&
      this.board.meanMineStates[x][y].isActive;

    if (isNormalMine || isMeanMine) {
      this.board.tilesArray[x][y].state = CONSTANTS.MINERED;
      this.board.blasted = true;
    } else {
      hasSoundEffect && soundEffectsEnabled.value && playSound("dig");
      const number = this.getNumberSurroundingMines(x, y);
      this.board.tilesArray[x][y].state = number;
      if (
        mobileModeEnabled.value &&
        (mobileScrollSetting.value === "enclosed nf" ||
          mobileScrollSetting.value === "enclosed flag" ||
          mobileScrollSetting.value === "zero") &&
        mobileDelayForEnableScroll.value !== 0
      ) {
        //Track timestamp of when a tile was revealed as they only become scrollable after a delay for the relevant mobile settings
        //We probably don't need all these if conditions, but I've left them in for clarity as to when this applies.
        this.board.tilesArray[x][y].revealedTimeForMobileScrollBehaviour =
          this.board.getTime();
      }
      this.board.openedTiles++;

      if (number === 0) {
        if (this.board.variant === "mean openings") {
          this.board.unprocessedMeanZeros.push({ x, y });
        }
        this.chord(x, y, false);
      }

      if (this.board.gameStage === "running") {
        this.board.lastSquaresChangedForAutoHint.push({ x, y });
      }
    }

    if (this.board.hintActive) {
      const suppressDraw = true;
      this.board.boardHint.hideHint(suppressDraw);
    }
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
    if (!this.board.checkCoordsInBounds(x, y)) {
      return; //ignore squares outside board
    }

    if (typeof this.board.tilesArray[x][y].state !== "number") {
      return; //Can only chord numbers
    }

    const isChordedTileZero = this.board.tilesArray[x][y].state === 0;

    if (!isChordedTileZero) {
      hasSoundEffect && soundEffectsEnabled.value && playSound("chord");
    }

    if (
      this.board.tilesArray[x][y].state === this.getNumberSurroundingFlags(x, y) ||
      isChordedTileZero
    ) {
      let hadUnrevealedNeighbour = false;

      //Correct number of flags (or a zero tile), so do chord
      for (let i = x - 1; i <= x + 1; i++) {
        for (let j = y - 1; j <= y + 1; j++) {
          if (i === x && j === y) {
            continue; //don't open square itself
          }
          if (!this.board.checkCoordsInBounds(i, j)) {
            continue; //ignore squares outside board
          }
          if (
            isChordedTileZero &&
            this.board.tilesArray[i][j].state === CONSTANTS.FLAG
          ) {
            //Openings will open everything around them and annihilate neighbouring flags.
            //Note that because we change the state to CONSTANTS.UNREVEALED, it then gets opened by follow if statement
            this.board.tilesArray[i][j].state = CONSTANTS.UNREVEALED;
            this.board.unflagged++;
          }
          const isChordableMeanMine =
            this.board.variant === "mean openings" &&
            meanMineClickBehaviour.value === "chordable" &&
            this.board.meanMineStates[i][j].isMine &&
            this.board.meanMineStates[i][j].isActive;
          if (
            this.board.tilesArray[i][j].state === CONSTANTS.UNREVEALED &&
            !isChordableMeanMine
          ) {
            this.openTile(i, j);
            hadUnrevealedNeighbour = true;
          }
        }
      }
      if (includeInStats) {
        if (hadUnrevealedNeighbour) {
          this.board.stats.addChord(x, y, unflooredX, unflooredY, time);
        } else {
          this.board.stats.addWastedChord(x, y, unflooredX, unflooredY, time);
        }
      }
    } else {
      if (includeInStats) {
        this.board.stats.addWastedChord(x, y, unflooredX, unflooredY, time);
      }
    }
  }


  getNumberSurroundingMines(x, y, includeMeanMines = false) {
    let count = 0;
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (i === x && j === y) {
          continue; //dont count square itself
        }
        if (!this.board.checkCoordsInBounds(i, j)) {
          continue; //ignore squares outside board
        }
        const isNormalMine = this.board.mines[i][j];
        const isMeanMine =
          includeMeanMines &&
          this.board.meanMineStates[i][j].isMine &&
          this.board.meanMineStates[i][j].isActive;
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
        if (!this.board.checkCoordsInBounds(i, j)) {
          continue; //ignore squares outside board
        }

        const isChordableMeanMine =
          this.board.variant === "mean openings" &&
          meanMineClickBehaviour.value === "chordable" &&
          this.board.meanMineStates[i][j].isMine &&
          this.board.meanMineStates[i][j].isActive;

        if (
          this.board.tilesArray[i][j].state === CONSTANTS.FLAG ||
          isChordableMeanMine
        ) {
          count++;
        }
      }
    }

    return count;
  }

  doLose() {
    const finalTime = this.board.getTime();
    soundEffectsEnabled.value && playSound("lose");
    this.blast();
    this.board.gameStage = "lost";
    this.board.stats.addEndTime(finalTime, false);
    this.board.stats.makeRepeatFlagsWasted();
    if (this.board.variant === "mean openings") {
      this.board.stats.addMeanMines(this.board.meanMineStates);
    }
    this.board.boardInput.clearAllDepressedSquares();
    this.board.boardRenderer.clearTimerTimeout();
    this.board.integerTimer = Math.floor(finalTime);
    this.board.calculateAndDisplayStats(false);
    if (
      (this.board.variant === "eff boards" &&
        statsRunDeepChain.value === "eff always") ||
      statsRunDeepChain.value === "any always"
    ) {
      this.board.stats.lateCalcDeepChainZini();
    }
    flagToggleShowReset.value = true;
    this.board.boardHint.showAutoHintIfNeeded();
  }

  blast() {
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        const isNormalMine = this.board.mines[x][y];
        const isMeanMine =
          this.board.variant === "mean openings" &&
          this.board.meanMineStates[x][y].isMine &&
          this.board.meanMineStates[x][y].isActive;

        if (
          (isNormalMine || isMeanMine) &&
          this.board.tilesArray[x][y].state !== CONSTANTS.FLAG &&
          this.board.tilesArray[x][y].state !== CONSTANTS.MINERED
        ) {
          this.board.tilesArray[x][y].state = CONSTANTS.MINE;
        }

        if (
          !(isNormalMine || isMeanMine) &&
          this.board.tilesArray[x][y].state === CONSTANTS.FLAG
        ) {
          this.board.tilesArray[x][y].state = CONSTANTS.MINEWRONG;
        }
      }
    }
  }

  doWin() {
    const finalTime = this.board.getTime();
    soundEffectsEnabled.value && playSound("win");
    this.markRemainingFlags();
    this.board.gameStage = "won";
    this.board.stats.addEndTime(finalTime, true);
    this.board.stats.makeRepeatFlagsWasted();
    if (this.board.variant === "mean openings") {
      this.board.stats.addMeanMines(this.board.meanMineStates);
    }
    this.board.boardInput.clearAllDepressedSquares();
    this.board.boardRenderer.clearTimerTimeout();
    this.board.integerTimer = Math.floor(finalTime);
    this.board.calculateAndDisplayStats(true);
    if (
      (this.board.variant === "eff boards" &&
        ["eff win", "eff always"].includes(statsRunDeepChain.value)) ||
      ["any win", "any always"].includes(statsRunDeepChain.value)
    ) {
      this.board.stats.lateCalcDeepChainZini();
    }
    flagToggleShowReset.value = true;
  }

  markRemainingFlags() {
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        const isNormalMine = this.board.mines[x][y];
        const isMeanMine =
          this.board.variant === "mean openings" &&
          this.board.meanMineStates[x][y].isMine &&
          this.board.meanMineStates[x][y].isActive;

        if (
          (isNormalMine || isMeanMine) &&
          this.board.tilesArray[x][y].state === CONSTANTS.UNREVEALED
        ) {
          this.board.tilesArray[x][y].state = CONSTANTS.FLAG;
        }
      }
    }

    this.board.unflagged = 0;
  }

  checkWin() {
    if (this.board.width * this.board.height - this.board.mineCount === this.board.openedTiles) {
      return true;
    } else {
      return false;
    }
  }
}

export default BoardActions;