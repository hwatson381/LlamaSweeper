import CONSTANTS from "src/includes/Constants";
import Algorithms from "./Algorithms";
import { Dialog } from 'quasar'

class ZiniExplore {
  constructor(board, refs) {
    this.board = board
    this.refs = refs

    this.classicPath = []; //Array of clicks {type:'left', x: 1, y: 2} etc for classic display mode
    this.chains = []; //Array of chord chains, for chain display mode

    this.preprocessedData = {
      numbersArray: false,
      openingLabels: false,
      preprocessedOpenings: false
    }
  }

  handleZiniExploreClick(tileX, tileY, isDigInput, isFlagInput) {
    console.log('received zini explore clicks')

    if (this.refs.analyseDisplayMode.value === 'classic') {
      this.handleClassicClick(tileX, tileY, isDigInput, isFlagInput);
    } else if (this.refs.analyseDisplayMode.value === 'chain') {
      this.handleChainClick(tileX, tileY, isDigInput, isFlagInput);
    } else {
      throw new Error('Unrecognised display mode');
    }

    this.updateUiAndBoard();
  }

  handleClassicClick(tileX, tileY, isDigInput, isFlagInput) {
    //Clicks on mines will always either flag or unflag
    const squareProperties = this.getSquareProperties(tileX, tileY);

    //Unflagged mine, so flag it
    if (squareProperties.isMine && !squareProperties.isFlagged) {
      this.classicPath.push({ type: 'right', x: tileX, y: tileY })
      return;
    }

    //Flagged mine, so unflag it
    if (squareProperties.isMine && squareProperties.isFlagged) {
      this.classicPath = this.classicPath.filter(c => !(c.type === 'right' && c.x === tileX && c.y === tileY))
      return;
    }

    //Below we can assume it is a safe tile

    //Unrevealed square, so dig it
    if (!squareProperties.isRevealed) {
      this.classicPath.push({ type: 'left', x: tileX, y: tileY })
      return;
    }

    //Revealed and chordable, so chord it
    if (squareProperties.isChordable) {
      this.classicPath.push({ type: 'chord', x: tileX, y: tileY })
      return;
    }

    //Was digged, but not chordable, so undig it
    if (squareProperties.isDigged && !squareProperties.isChordable) {
      this.classicPath = this.classicPath.filter(c => !(c.type === 'left' && c.x === tileX && c.y === tileY))
      return;
    }

    //Was chorded and digged, so undig + unchord it
    if (squareProperties.isDigged && squareProperties.isChorded) {
      this.classicPath = this.classicPath.filter(c => !((c.type === 'left' || c.type === 'chord') && c.x === tileX && c.y === tileY))
      return;
    }

    //Was chorded and not digged, so just unchord it
    if (!squareProperties.isDigged && squareProperties.isChorded) {
      this.classicPath = this.classicPath.filter(c => !(c.type === 'chord' && c.x === tileX && c.y === tileY))
      return;
    }

    //Was a zero that was digged from elsewhere, so undig the zero that digged it
    if (squareProperties.isDiggedZero) {
      const openingLabel = this.preprocessedData.openingLabels[tileX][tileY];

      const sharedZeros = this.preprocessedData.preprocessedOpenings.get(openingLabel).zeros

      this.classicPath = this.classicPath.filter(c => {
        if (c.type !== 'left') {
          //Keep chords/flags
          return true;
        }

        //Remove digs if they are on one of the zeros that would reveal the square we initial clicked on
        return !sharedZeros.some(zero => c.x === zero.x && c.y === zero.y);
      });
    }
  }

  handleChainClick(tileX, tileY, isDigInput, isFlagInput) {

  }

  getSquareProperties(tileX, tileY) {
    //This function makes the assumption that the click path is valid (e.g. all chords are from squares that were opened before)
    //Check whether square is mine/flagged/digged/chorded/open/closed/part of opening etc

    let isMine = this.board.mines[tileX][tileY];

    let isFlagged = this.classicPath.some(c => c.type === 'right' && c.x === tileX && c.y === tileY);

    let isDigged = this.classicPath.some(c => c.type === 'left' && c.x === tileX && c.y === tileY);

    let isRevealed = this.board.tilesArray[tileX][tileY].state !== CONSTANTS.UNREVEALED;

    let isZero = this.preprocessedData.numbersArray[tileX][tileY] === 0;

    //zeros in openings are merged (if one is digged then all are digged etc)
    //Figure out if there was another zero in the same opening that was clicked on
    let isDiggedZero = false;
    if (isRevealed && isZero) {
      const openingLabel = this.preprocessedData.openingLabels[tileX][tileY];

      const sharedZeros = this.preprocessedData.preprocessedOpenings.get(openingLabel).zeros
      if (sharedZeros.some(zero => this.classicPath.some(c => c.type === 'left' && c.x === zero.x && c.y === zero.y))) {
        //Shared zero was digged, so this one is also digged
        isDiggedZero = true;
      }
    }

    let isChorded = this.classicPath.some(c => c.type === 'chord' && c.x === tileX && c.y === tileY);

    let isChordable = false;
    //Chordable if it has an unrevealed neighbour and right number of flags
    if (isRevealed && !isZero && this.board.getNumberSurroundingFlags(tileX, tileY) === this.board.getNumberSurroundingMines(tileX, tileY, false)) {
      //Check to see if any neighbours are unrevealed
      let hasUnrevealedNeighbour = false;

      for (let x = tileX - 1; x <= tileX + 1; x++) {
        for (let y = tileY - 1; y <= tileY + 1; y++) {
          if (x === tileX && y === tileY) {
            continue;
          }
          if (!this.board.checkCoordsInBounds(x, y)) {
            continue; //ignore squares outside board
          }
          if (
            this.board.tilesArray[x][y].state === CONSTANTS.UNREVEALED
          ) {
            hasUnrevealedNeighbour = true;
          }
        }
      }

      if (hasUnrevealedNeighbour) {
        isChordable = true;
      }
    }

    return {
      isMine,
      isFlagged,
      isDigged,
      isRevealed,
      isZero,
      isDiggedZero,
      isChorded,
      isChordable,
    }
  }

  promptForPathReset() {
    Dialog.create({
      title: "Current click path",
      message: "Would you like to preserve the current click path?",
      ok: {
        flat: true,
        label: "Preserve",
      },
      cancel: {
        flat: true,
        label: "Reset",
      },
      persistent: true,
    })
      .onOk(() => {
        // Do nothing
      })
      .onCancel(() => {
        // Clear path
        this.clearCurrentPath();
        this.updateUiAndBoard();
      })
  }

  removeInvalidDigsAndFlags() {
    const oldClassicPathLength = this.classicPath.length;

    this.classicPath = this.classicPath.filter(c => {
      //remove bad flags
      if (c.type === 'right' && !this.board.mines[c.x][c.y]) {
        return false
      }
      //remove bad digs
      if (c.type === 'left' && this.board.mines[c.x][c.y]) {
        return false
      }
      return true
    });

    return oldClassicPathLength !== this.classicPath.length
  }

  //Replays moves on tilesArray whilst also removing invalid moves
  removeInvalidChordsAndRegenerateTileStates() {
    this.board.resetTiles();

    //Clear moves, then replay stuff, keeping track of what to remove
    let invalidChordIndices = [];

    for (let clickPointer = 0; clickPointer < this.classicPath.length; clickPointer++) {
      let clickToDo = this.classicPath[clickPointer];

      if (clickToDo.type === 'left') {
        this.board.openTile(clickToDo.x, clickToDo.y);
      } else if (clickToDo.type === 'right') {
        this.board.attemptFlag(clickToDo.x, clickToDo.y, false);
      } else if (clickToDo.type === 'chord') {
        //For chords, we need to verify that they are chordable before taking
        const isChordable = this.board.tilesArray[clickToDo.x][clickToDo.y].state !== CONSTANTS.UNREVEALED &&
          this.board.getNumberSurroundingFlags(clickToDo.x, clickToDo.y) === this.board.getNumberSurroundingMines(clickToDo.x, clickToDo.y, false);

        if (isChordable) {
          this.board.chord(clickToDo.x, clickToDo.y, false);
        } else {
          invalidChordIndices.push(clickPointer);
        }
      }
    }

    let pathWithInvalidChordsRemoved = this.classicPath.filter((val, idx) => !invalidChordIndices.includes(idx));

    let flagIndicesToCheck = new Set(); //Use a set just because of flags being checked multiple times (though array would be fine in practise)

    //Check which flags are next to chords we removed
    for (let invalidChordIndex of invalidChordIndices) {
      let removedChord = this.classicPath[invalidChordIndex];

      for (let i = 0; i < this.classicPath.length; i++) {
        let possibleFlagClick = this.classicPath[i];
        if (possibleFlagClick.type !== 'right') {
          continue;
        }
        if (Math.abs(possibleFlagClick.x - removedChord.x) <= 1 &&
          Math.abs(possibleFlagClick.y - removedChord.y) <= 1) {
          flagIndicesToCheck.add(i);
          continue;
        }
      }
    }

    let flagsIndicesToRemove = [];

    //Check whether or not these flags are next to other chords that are kept
    for (let flagIndexToCheck of flagIndicesToCheck) {
      let flagToCheck = this.classicPath[flagIndexToCheck];

      let flagHasKeptNeighbourChord = false
      for (let i = 0; i < pathWithInvalidChordsRemoved.length; i++) {
        let possibleNeighbouringKeptChord = pathWithInvalidChordsRemoved[i];
        if (possibleNeighbouringKeptChord.type !== 'chord') {
          continue;
        }
        if (Math.abs(possibleNeighbouringKeptChord.x - flagToCheck.x) <= 1 &&
          Math.abs(possibleNeighbouringKeptChord.y - flagToCheck.y) <= 1) {
          flagHasKeptNeighbourChord = true;
          break;
        }
      }

      if (!flagHasKeptNeighbourChord) {
        flagsIndicesToRemove.push(flagIndexToCheck);
      }
    }

    //Unmark the flags on the board that were removed
    for (let i of flagsIndicesToRemove) {
      let flagToRemove = this.classicPath[i];

      this.board.tilesArray[flagToRemove.x][flagToRemove.y].state = CONSTANTS.UNREVEALED;
    }

    //Finally, remove the flags that are no longer needed (were only used by invalid chord)
    this.classicPath = this.classicPath.filter((val, idx) => !invalidChordIndices.includes(idx) && !flagsIndicesToRemove.includes(idx));
  }

  updateFlagCounter() {
    this.board.unflagged = this.board.mineCount - this.classicPath.filter(c => c.type === 'right').length
  }

  updateZiniSumRefs() {
    if (this.refs.analyseDisplayMode.value === 'classic') {
      this.refs.classicPathBreakdown.value.lefts = this.classicPath.filter(c => c.type === 'left').length;
      this.refs.classicPathBreakdown.value.rights = this.classicPath.filter(c => c.type === 'right').length;
      this.refs.classicPathBreakdown.value.chords = this.classicPath.filter(c => c.type === 'chord').length;

      const bbbv = Algorithms.calc3bv(this.board.mines, this.board.tilesArray, this.preprocessedData);
      const remaining3bv = bbbv.bbbv - bbbv.solved3bv;
      this.refs.classicPathBreakdown.value.remaining3bv = remaining3bv;

      this.refs.analyseZiniTotal.value = remaining3bv + this.classicPath.length;
      this.refs.analyse3bv.value = bbbv.bbbv;
      this.refs.analyseEff.value = Math.round((this.refs.analyse3bv.value / this.refs.analyseZiniTotal.value) * 100)
    } else if (this.refs.analyseDisplayMode.value === 'chain') {
      throw new Error('Not implemented')
    } else {
      throw new Error('Unrecognised display mode');
    }
  }

  updatePremiums() {
    const width = this.board.mines.length;
    const height = this.board.mines[0].length;

    //array of saved info for square about what the neighbours are
    const squareInfo = Algorithms.computeSquareInfo(
      this.board.mines,
      this.preprocessedData.numbersArray,
      this.preprocessedData.openingLabels
    );

    //Figure out which flags/revealed squares are based on board states
    const flagStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));
    const revealedStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (this.board.tilesArray[x][y].state === CONSTANTS.FLAG) {
          flagStates[x][y] = true;
          continue
        }
        if (typeof this.board.tilesArray[x][y].state === 'number') {
          revealedStates[x][y] = true
        }
      }
    }

    //store premiums of opening + chording each cell
    const premiums = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(null));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (this.board.mines[x][y]) {
          continue;
        }
        Algorithms.updatePremiumForCoord(
          x,
          y,
          squareInfo,
          flagStates,
          revealedStates,
          premiums,
          this.preprocessedData.preprocessedOpenings
        );
      }
    }

    console.log(premiums)

    let highestPremium = premiums
      .flat()
      .filter(s => s !== null)
      .reduce(function (p, v) {
        return (p > v ? p : v);
      }, -1);

    if (this.refs.analyseShowPremiums.value === 'highlight' && highestPremium === -1) {
      //exit early on highlight if no non-negative premiums
      return;
    }

    //Add premium info to tiles
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        //Only add premiums when a cell has potential to be chorded
        if (this.board.mines[x][y]) {
          //Mines can't be chorded!
          continue;
        }
        if (this.preprocessedData.numbersArray[x][y] === 0) {
          //Zeros can't be chorded
          continue;
        }
        //Check if there is an unopened safe neighbour cell
        let hasUnopenedSafeNeighbour = false
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (i < 0 || j < 0 || i >= width || j >= height) {
              continue;
            }
            if (this.board.tilesArray[i][j].state === CONSTANTS.UNREVEALED && !this.board.mines[i][j]) {
              hasUnopenedSafeNeighbour = true;
            }
          }
        }
        if (!hasUnopenedSafeNeighbour) {
          //Never chordable
          continue;
        }
        if (
          this.refs.analyseShowPremiums.value === 'numbers' ||
          (
            this.refs.analyseShowPremiums.value === 'numbers positive' &&
            premiums[x][y] >= 0
          )
        ) {
          //On numbers mode, we show the number of the premium in the cell
          this.board.tilesArray[x][y].addPremium(premiums[x][y]);
        }
        if (this.refs.analyseShowPremiums.value === 'highlight' && premiums[x][y] === highestPremium) {
          //On highlight mode, we just highlight the top cells 
          this.board.tilesArray[x][y].addHighlight();
        }
      }
    }
  }

  clearCurrentPath() {
    this.classicPath = [];
    this.chains = [];
  }

  refreshForEditedBoard() {
    //This is ran when we switch to analyse mode
    this.preprocessedData = Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(this.board.mines);
    if (this.removeInvalidDigsAndFlags()) {
      this.promptForPathReset();
    }
    this.updateUiAndBoard();
  }

  updateUiAndBoard() {
    this.removeInvalidChordsAndRegenerateTileStates();
    this.board.populateTransparentNumbers();
    this.updateFlagCounter();
    this.updateZiniSumRefs();
    this.updateTileAnnotations();
    if (this.refs.analyseShowPremiums.value !== 'none') {
      this.updatePremiums();
    }
    this.board.draw();
  }

  updateTileAnnotations() {
    if (this.refs.analyseDisplayMode.value === 'classic') {
      for (const click of this.classicPath) {
        if (click.type === 'left') {
          this.board.tilesArray[click.x][click.y].addClassicDig();
        }
        if (click.type === 'chord') {
          this.board.tilesArray[click.x][click.y].addClassicChord();
        }
      }
    }
  }
}

export default ZiniExplore;