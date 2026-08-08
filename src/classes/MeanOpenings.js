import CONSTANTS from "src/includes/Constants";

import {
  meanOpeningMineDensity,
  meanOpeningFlagDensity,
} from "src/composables/useSettings";

class MeanOpenings {
  constructor(board) {
    this.board = board;

    /*
      this.meanMineStates gets set elsewhere to start of as the below shape
      
      [[{
        isMine: false, //all squares start off with no mean mines
        changedToMineTimestamp: null,
        startsFlagged: null, //if revealed, should be a flag or unrevealed?
        isActive: false, //used during replays - whether the square is "in play" (e.g. acts like a mine if it is one)
        isLocked: false, //whether the square's final state has been decided
      }]]
    */
    this.meanMineStates = null;

    this.unprocessedMeanZeros = [];
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
        this.board.checkCoordsInBounds(square.x, square.y)
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
          this.board.checkCoordsInBounds(square.x, square.y)
        );

        let foundUnrevealedSafe = false;

        for (let neighbourNeighbour of neighbourNeighbours) {
          //Check if the neighbour to our main cell has neighbours that are unrevealed safe
          if (
            this.board.tilesArray[neighbourNeighbour.x][neighbourNeighbour.y]
              .state === CONSTANTS.UNREVEALED &&
            !this.board.mines[neighbourNeighbour.x][neighbourNeighbour.y] &&
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
      if (this.meanMineStates[zero.x][zero.y].isMine) {
        let shouldMineBeFlagged;
        if (this.meanMineStates[zero.x][zero.y].isLocked) {
          //Square was locked from before so used saved value (e.g. we are in a replay)
          shouldMineBeFlagged = this.meanMineStates[zero.x][zero.y].startsFlagged;
        } else {
          //Square was not locked, so randomly choose whether to flag
          shouldMineBeFlagged = Math.random() < meanOpeningFlagDensity.value
        }

        //Close squares with mean mines, or change to flag
        if (shouldMineBeFlagged) {
          this.board.tilesArray[zero.x][zero.y].state = CONSTANTS.FLAG;
          this.meanMineStates[zero.x][zero.y].startsFlagged = true; //harmless if this is locked and already flagged
        } else {
          this.board.unflagged++;
          this.board.tilesArray[zero.x][zero.y].state = CONSTANTS.UNREVEALED;
          this.meanMineStates[zero.x][zero.y].startsFlagged = false; //harmless if this is locked and already unflagged
        }
      }

      //Mark neighbours that need to have their number calculated
      for (let x = zero.x - 1; x <= zero.x + 1; x++) {
        for (let y = zero.y - 1; y <= zero.y + 1; y++) {
          if (
            this.board.checkCoordsInBounds(x, y) &&
            !this.meanMineStates[x][y].isMine
          ) {
            cellsThatNeedNumber.push({ x, y });
          }
        }
      }

      this.meanMineStates[zero.x][zero.y].isActive = true;
      this.meanMineStates[zero.x][zero.y].isLocked = true;
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
      this.board.tilesArray[cell.x][cell.y].state = this.board.boardActions.getNumberSurroundingMines(
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

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        this.meanMineStates[x][y].isActive = false;
      }
    }
  }

  getSimplifiedTilesArray() {
    //Create a copy of this.board.tilesArray where the values are what they would be if the mean mines were removed
    let simplifiedTilesArray = this.board.cloneTilesArray();

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        if (
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive
        ) {
          //Flip square to having state = 0 and also subtract 1 from neighbours
          simplifiedTilesArray[x][y].state = 0;
          for (let i = x - 1; i <= x + 1; i++) {
            for (let j = y - 1; j <= y + 1; j++) {
              if (i < 0 || j < 0 || i >= this.board.width || j >= this.board.height) {
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
}

export default MeanOpenings;