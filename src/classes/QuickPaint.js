import CONSTANTS from "src/includes/Constants";

import {
  showQuickPaintOptions,
  quickPaintModeDisplay,
  quickPaintClearable,
  quickPaintInitialOnlyMines,
  quickPaintMinimalMode,
  quickPaintOnlyTrivialLogic,
} from "src/composables/useSettings";

class QuickPaint {
  constructor(board) {
    this.board = board;
  }

  toggleQuickPaint() {
    if (this.board.gameStage !== "running") {
      window.alert("QuickPaint can only be used when a game is in progress");
      return;
    }

    this.board.quickPaintActive = !this.board.quickPaintActive;
    showQuickPaintOptions.value = this.board.quickPaintActive;

    if (this.board.quickPaintActive) {
      this.board.boardInput.clearAllDepressedSquares();

      this.board.boardHint.hideHint(true); //hide probabilities as otherwise they visually compete

      if (this.board.isFirstQuickPaint) {
        this.board.quickPaintMode = "guess";
        quickPaintModeDisplay.value = "Guess";
        this.board.isFirstQuickPaint = false;
        //First quick paint, so prepopulate the "obvious" mines
        this.paintObviousSquares();
      } else {
        //Subsequent quick paint, so remove anything overwritten
        this.removeOverwrittenPaints();
        this.paintObviousSquares();
      }
      this.refreshQuickPaintCounts();
      this.updateQuickPaintClearableDisplay();
    }
    this.board.boardRenderer.draw();
  }

  handleCycleQuickPaintModeKeypress() {
    //W key does stuff when QuickPaint is active
    if (!this.board.quickPaintActive) {
      return;
    }

    if (quickPaintMinimalMode.value) {
      return;
    }

    this.cycleQuickPaintMode();
  }

  removeOverwrittenPaints() {
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        if (
          this.board.tilesArray[x][y].state !== CONSTANTS.UNREVEALED &&
          this.board.tilesArray[x][y].paintColour !== null
        ) {
          this.board.tilesArray[x][y].paintColour = null;
        }
      }
    }
  }

  refreshQuickPaintCounts() {
    let redCount = this.board.unflagged;
    let orangeCount = this.board.unflagged;
    let dotCount = 0;
    let whiteOrangeCount = 0;

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        const thisTile = this.board.tilesArray[x][y];

        if (thisTile.paintColour === "red") {
          redCount--;
          orangeCount--;
        }
        if (thisTile.paintColour === "orange") {
          orangeCount--;
          whiteOrangeCount++;
        }
        if (thisTile.paintColour === "white") {
          whiteOrangeCount++;
        }
        dotCount += thisTile.paintDots;
      }
    }

    this.board.redCount = redCount;
    this.board.orangeCount = orangeCount;
    this.board.dotCount = dotCount;
    this.board.whiteOrangeCount = whiteOrangeCount;
  }

  paintObviousSquares() {
    //Note that code here is EXTREMELY inefficient

    let knownMines = new Array(this.board.width)
      .fill(0)
      .map(() => new Array(this.board.height).fill(false));

    let knownSafes = new Array(this.board.width)
      .fill(0)
      .map(() => new Array(this.board.height).fill(false));

    //prepopulate knowledge with where flags and safes (numbers) are
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        if (this.board.tilesArray[x][y].state === CONSTANTS.FLAG) {
          knownMines[x][y] = true;
        }
        if (typeof this.board.tilesArray[x][y].state === "number") {
          knownSafes[x][y] = true;
        }
      }
    }

    let foundThisLoop = false;

    do {
      foundThisLoop = false;

      //Check all squares for "obvious" moves and update if any mines/safes found
      for (let x = 0; x < this.board.width; x++) {
        for (let y = 0; y < this.board.height; y++) {
          let thisTile = this.board.tilesArray[x][y];
          if (typeof thisTile.state !== "number") {
            continue;
          }
          let thisNumber = thisTile.state;

          //touching squares
          let neighbours = [
            { x: x - 1, y: y - 1 },
            { x: x - 1, y: y },
            { x: x - 1, y: y + 1 },
            { x: x, y: y - 1 },
            { x: x, y: y + 1 },
            { x: x + 1, y: y - 1 },
            { x: x + 1, y: y },
            { x: x + 1, y: y + 1 },
          ];
          neighbours = neighbours.filter((square) =>
            this.board.checkCoordsInBounds(square.x, square.y)
          );

          let unknownNeighbours = neighbours.filter(
            (square) =>
              !knownSafes[square.x][square.y] && !knownMines[square.x][square.y]
          );
          if (unknownNeighbours.length === 0) {
            //nothing more to find for this square
            continue;
          }
          let mineNeighbours = neighbours.filter(
            (square) => knownMines[square.x][square.y]
          );
          let safeNeighbours = neighbours.filter(
            (square) => knownSafes[square.x][square.y]
          );
          let numberNeighbours = neighbours.filter(
            (square) =>
              typeof this.board.tilesArray[square.x][square.y].state === "number"
          );

          if (thisNumber === mineNeighbours.length) {
            //all mines found, so remaining are safe
            foundThisLoop = true;
            unknownNeighbours.forEach(
              (square) => (knownSafes[square.x][square.y] = true)
            );
          }
          if (unknownNeighbours.length + mineNeighbours.length === thisNumber) {
            //all safes found, so remaining are mines
            foundThisLoop = true;
            unknownNeighbours.forEach(
              (square) => (knownMines[square.x][square.y] = true)
            );
          }

          //subtraction formula
          if (!quickPaintOnlyTrivialLogic.value) {
            numberNeighbours.forEach((other) => {
              let otherTile = this.board.tilesArray[other.x][other.y];

              let otherNumber = otherTile.state; //guaranteed to be number as that's how we constructed numberNeighbours

              //touching squares for neighbour cell
              let otherNeighbours = [
                { x: other.x - 1, y: other.y - 1 },
                { x: other.x - 1, y: other.y },
                { x: other.x - 1, y: other.y + 1 },
                { x: other.x, y: other.y - 1 },
                { x: other.x, y: other.y + 1 },
                { x: other.x + 1, y: other.y - 1 },
                { x: other.x + 1, y: other.y },
                { x: other.x + 1, y: other.y + 1 },
              ];
              otherNeighbours = otherNeighbours.filter((square) =>
                this.board.checkCoordsInBounds(square.x, square.y)
              );

              let onlyThisMine = [];
              let onlyNeighbourMine = [];

              let onlyThisSafe = [];
              let onlyNeighbourSafe = [];

              let onlyThisUnknown = [];
              let onlyNeighbourUnknown = [];

              //Make note of the squares that only belong to thisTile
              for (let thisNeighbour of neighbours) {
                if (
                  otherNeighbours.some(
                    (otherNeighbour) =>
                      thisNeighbour.x === otherNeighbour.x &&
                      thisNeighbour.y === otherNeighbour.y
                  )
                ) {
                  continue;
                }

                if (knownSafes[thisNeighbour.x][thisNeighbour.y]) {
                  onlyThisSafe.push({ x: thisNeighbour.x, y: thisNeighbour.y });
                }
                if (knownMines[thisNeighbour.x][thisNeighbour.y]) {
                  onlyThisMine.push({ x: thisNeighbour.x, y: thisNeighbour.y });
                }
                if (
                  !knownSafes[thisNeighbour.x][thisNeighbour.y] &&
                  !knownMines[thisNeighbour.x][thisNeighbour.y]
                ) {
                  onlyThisUnknown.push({
                    x: thisNeighbour.x,
                    y: thisNeighbour.y,
                  });
                }
              }

              //Make note of the squares that only belong to otherTile
              for (let otherNeighbour of otherNeighbours) {
                if (
                  neighbours.some(
                    (thisNeighbour) =>
                      thisNeighbour.x === otherNeighbour.x &&
                      thisNeighbour.y === otherNeighbour.y
                  )
                ) {
                  continue;
                }

                if (knownSafes[otherNeighbour.x][otherNeighbour.y]) {
                  onlyNeighbourSafe.push({
                    x: otherNeighbour.x,
                    y: otherNeighbour.y,
                  });
                }
                if (knownMines[otherNeighbour.x][otherNeighbour.y]) {
                  onlyNeighbourMine.push({
                    x: otherNeighbour.x,
                    y: otherNeighbour.y,
                  });
                }
                if (
                  !knownSafes[otherNeighbour.x][otherNeighbour.y] &&
                  !knownMines[otherNeighbour.x][otherNeighbour.y]
                ) {
                  onlyNeighbourUnknown.push({
                    x: otherNeighbour.x,
                    y: otherNeighbour.y,
                  });
                }
              }

              //nothing to do if the only unknowns are both empty
              if (onlyThisUnknown.length + onlyNeighbourUnknown.length === 0) {
                return;
              }

              //do checks to find logic from subtraction formula

              //Could all onlyNeighbour unknowns be mines and all onlyThis unknowns be safe
              if (
                onlyNeighbourMine.length +
                onlyNeighbourUnknown.length -
                onlyThisMine.length ===
                otherNumber - thisNumber
              ) {
                //onlyNeighbours forced high and onlyThis forced low
                foundThisLoop = true;
                onlyNeighbourUnknown.forEach(
                  (square) => (knownMines[square.x][square.y] = true)
                );
                onlyThisUnknown.forEach(
                  (square) => (knownSafes[square.x][square.y] = true)
                );
              } else if (
                onlyThisMine.length +
                onlyThisUnknown.length -
                onlyNeighbourMine.length ===
                thisNumber - otherNumber
              ) {
                //Could all onlyNeighbour unknowns be mines and all onlyThis unknowns be safe

                //onlyNeighbours forced low and onlyThis forced high
                foundThisLoop = true;
                onlyNeighbourUnknown.forEach(
                  (square) => (knownSafes[square.x][square.y] = true)
                );
                onlyThisUnknown.forEach(
                  (square) => (knownMines[square.x][square.y] = true)
                );
              }
            });
          }
        }
      }
    } while (foundThisLoop);

    //Now that all logic has been deduced, paint stuff to match this
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        if (this.board.tilesArray[x][y].state !== CONSTANTS.UNREVEALED) {
          continue;
        }
        if (knownSafes[x][y] && !quickPaintInitialOnlyMines.value) {
          this.board.tilesArray[x][y].paintColour = "green";
        }
        if (knownMines[x][y]) {
          this.board.tilesArray[x][y].paintColour = "red";
        }
      }
    }
  }

  cycleQuickPaintMode(forwardDirection = true) {
    let modesList = ["known", "guess", "dots"];
    let modeIndex = modesList.indexOf(this.board.quickPaintMode);
    if (modeIndex === -1) {
      modeIndex = 0;
    }

    if (forwardDirection) {
      modeIndex = (modeIndex + 1) % modesList.length;
    } else {
      modeIndex = (modeIndex - 1 + modesList.length) % modesList.length;
    }

    this.board.quickPaintMode = modesList[modeIndex];
    quickPaintModeDisplay.value =
      this.board.quickPaintMode[0].toUpperCase() + this.board.quickPaintMode.slice(1);
  }

  updateQuickPaintClearableDisplay() {
    if (this.board.dotCount > 0) {
      quickPaintClearable.value = "Clear dots";
      return;
    } else if (this.board.whiteOrangeCount > 0) {
      quickPaintClearable.value = "Clear guesses";
    } else {
      quickPaintClearable.value = "Reset knowns";
    }
  }

  clearClearableMarkings() {
    let thingBeingCleared;
    if (this.board.dotCount > 0) {
      thingBeingCleared = "dots";
    } else if (this.board.whiteOrangeCount > 0) {
      thingBeingCleared = "guesses";
    } else {
      thingBeingCleared = "knowns";
    }

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        const thisTile = this.board.tilesArray[x][y];
        if (thingBeingCleared === "dots") {
          thisTile.paintDots = 0;
        } else if (thingBeingCleared === "guesses") {
          if (
            thisTile.paintColour === "orange" ||
            thisTile.paintColour === "white"
          ) {
            thisTile.paintColour = null;
          }
        } else {
          //knowns
          if (
            thisTile.paintColour === "red" ||
            thisTile.paintColour === "green"
          ) {
            thisTile.paintColour = null;
          }
        }
      }
    }

    if (thingBeingCleared === "knowns") {
      this.paintObviousSquares();
    }

    this.refreshQuickPaintCounts();
    this.updateQuickPaintClearableDisplay();

    this.board.boardRenderer.draw();
  }

  handleQuickPaintClick(
    tileX,
    tileY,
    isDigInput,
    isFlagInput,
    isMiddleClick,
    event
  ) {
    const button = event.button;

    if (isMiddleClick) {
      //middle click, doesn't need to be inbounds.
      this.clearClearableMarkings();
      event.preventDefault();
      return;
    }

    if (!this.board.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit
      return;
    }

    if (!isDigInput && !isFlagInput) {
      //not left/right click. Ignore
      return;
    }

    const thisTile = this.board.tilesArray[tileX][tileY];
    const tileState = thisTile.state;
    const oldColour = thisTile.paintColour;
    const oldDots = thisTile.paintDots;

    if (quickPaintMinimalMode.value) {
      //minimal mode only has right click = orange, left click = dots
      if (isFlagInput) {
        if (
          tileState !== CONSTANTS.UNREVEALED ||
          (oldColour !== null && oldColour !== "orange")
        ) {
          return;
        }

        if (oldColour === "orange") {
          this.board.orangeCount++; //unorange the square
          this.board.whiteOrangeCount--;
          thisTile.paintColour = null;
        } else if (oldColour === null) {
          this.board.orangeCount--; //orange the square
          this.board.whiteOrangeCount++;
          thisTile.paintColour = "orange";
        }
      }

      if (isDigInput) {
        let newDots;
        newDots = (oldDots + 1) % 3; //cycle dots forward

        this.board.dotCount += newDots - oldDots;
        thisTile.paintDots = newDots;
      }
    } else if (
      this.board.quickPaintMode === "known" ||
      this.board.quickPaintMode === "guess"
    ) {
      if (tileState !== CONSTANTS.UNREVEALED) {
        return;
      }

      let newColour;
      if (this.board.quickPaintMode === "known" && isFlagInput) {
        newColour = "red";
      }
      if (this.board.quickPaintMode === "known" && isDigInput) {
        newColour = "green";
      }
      if (this.board.quickPaintMode === "guess" && isFlagInput) {
        newColour = "orange";
      }
      if (this.board.quickPaintMode === "guess" && isDigInput) {
        newColour = "white";
      }

      if (newColour === oldColour) {
        //if it's same colour then instead removed the colour
        newColour = null;
      }

      if (oldColour === "red") {
        this.board.redCount++; //unredding a square
        this.board.orangeCount++;
      }
      if (oldColour === "orange") {
        this.board.orangeCount++; //unoranging a square
        this.board.whiteOrangeCount--;
      }
      if (oldColour === "white") {
        this.board.whiteOrangeCount--; //unwhiting a square
      }

      if (newColour === "red") {
        this.board.redCount--; //redding a square
        this.board.orangeCount--;
      }
      if (newColour === "orange") {
        this.board.orangeCount--; //oranging a square
        this.board.whiteOrangeCount++;
      }
      if (newColour === "white") {
        this.board.whiteOrangeCount++; //whiting a square
      }

      thisTile.paintColour = newColour;
    } else if (this.board.quickPaintMode === "dots") {
      let newDots;
      if (isDigInput) {
        newDots = (oldDots + 1) % 3; //cycle dots forward
      } else if (isFlagInput) {
        newDots = (oldDots + 2) % 3; //cycle dots backward
      }

      this.board.dotCount += newDots - oldDots;
      thisTile.paintDots = newDots;
    }

    this.updateQuickPaintClearableDisplay();
  }

  confirmBoardResetIfQuickPaint() {
    if (!this.board.quickPaintActive) {
      return true;
    }

    return confirm(
      "Are you sure? This will reset the whole board. If instead you want to exit QuickPaint, this can be done by pressing the QuickPaint button or pressing the Q key."
    );
  }
}

export default QuickPaint;