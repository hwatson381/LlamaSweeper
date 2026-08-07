import CONSTANTS from "src/includes/Constants";

import {
  meanOpeningMineDensity,
  meanOpeningFlagDensity,
} from "src/composables/useSettings";

class MeanOpenings {
  constructor(board) {
    this.board = board;
  }

  makeOpeningMean(eventTimestamp) {
    //Runs through newly opened zeros and attempts to make them a mine.

    //Randomly set some of these squares to be provisional mines
    for (let zero of this.board.unprocessedMeanZeros) {
      if (this.board.meanMineStates[zero.x][zero.y].isLocked) {
        //Locked mines have their state set from before
        continue;
      }

      if (Math.random() < meanOpeningMineDensity.value) {
        this.board.meanMineStates[zero.x][zero.y].isMine = true;
        this.board.meanMineStates[zero.x][zero.y].changedToMineTimestamp =
          eventTimestamp;
      }
    }

    //https://stackoverflow.com/a/31054543
    let shuffledUnprocessedUnlockedZeros = this.board.unprocessedMeanZeros
      .filter((n) => !this.board.meanMineStates[n.x][n.y].isLocked)
      .map((n) => [Math.random(), n])
      .sort()
      .map((n) => n[1]);

    //Do another pass to make sure each new mine can be deduced from basic logic
    for (let zero of shuffledUnprocessedUnlockedZeros) {
      if (!this.board.meanMineStates[zero.x][zero.y].isMine) {
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
        if (this.board.meanMineStates[neighbour.x][neighbour.y].isMine) {
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
            !this.board.meanMineStates[neighbourNeighbour.x][neighbourNeighbour.y]
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
        (n) => this.board.meanMineStates[n.x][n.y].isMine
      );

      if (mineNeighbours.length !== 0) {
        //Bad case - try to change a neighbour square to a non-mine
        const randomMineNeighbour =
          mineNeighbours[Math.floor(Math.random() * mineNeighbours.length)];

        this.board.meanMineStates[randomMineNeighbour.x][
          randomMineNeighbour.y
        ].isMine = false;
        this.board.meanMineStates[randomMineNeighbour.x][
          randomMineNeighbour.y
        ].changedToMineTimestamp = null;
      } else {
        //Very bad case - change the square itself to be a non-mine
        this.board.meanMineStates[zero.x][zero.y].isMine = false;
        this.board.meanMineStates[zero.x][zero.y].changedToMineTimestamp = null;
      }
    }

    let cellsThatNeedNumber = [];

    //Do a final pass to make sure number states are updated and squares with means mines are revealed

    for (let zero of this.board.unprocessedMeanZeros) {
      if (this.board.meanMineStates[zero.x][zero.y].isMine) {
        let shouldMineBeFlagged;
        if (this.board.meanMineStates[zero.x][zero.y].isLocked) {
          //Square was locked from before so used saved value (e.g. we are in a replay)
          shouldMineBeFlagged = this.board.meanMineStates[zero.x][zero.y].startsFlagged;
        } else {
          //Square was not locked, so randomly choose whether to flag
          shouldMineBeFlagged = Math.random() < meanOpeningFlagDensity.value
        }

        //Close squares with mean mines, or change to flag
        if (shouldMineBeFlagged) {
          this.board.tilesArray[zero.x][zero.y].state = CONSTANTS.FLAG;
          this.board.meanMineStates[zero.x][zero.y].startsFlagged = true; //harmless if this is locked and already flagged
        } else {
          this.board.unflagged++;
          this.board.tilesArray[zero.x][zero.y].state = CONSTANTS.UNREVEALED;
          this.board.meanMineStates[zero.x][zero.y].startsFlagged = false; //harmless if this is locked and already unflagged
        }
      }

      //Mark neighbours that need to have their number calculated
      for (let x = zero.x - 1; x <= zero.x + 1; x++) {
        for (let y = zero.y - 1; y <= zero.y + 1; y++) {
          if (
            this.board.checkCoordsInBounds(x, y) &&
            !this.board.meanMineStates[x][y].isMine
          ) {
            cellsThatNeedNumber.push({ x, y });
          }
        }
      }

      this.board.meanMineStates[zero.x][zero.y].isActive = true;
      this.board.meanMineStates[zero.x][zero.y].isLocked = true;
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
      this.board.tilesArray[cell.x][cell.y].state = this.board.getNumberSurroundingMines(
        cell.x,
        cell.y,
        true
      );
    }

    //Truncate as all squares have been processed
    this.board.unprocessedMeanZeros = [];
  }

  resetMeanMinesActiveness() {
    //Used during replays - an active mean mine is one that has been opened via an opening
    //And so the next click on it will blast (dependent on settings)

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        this.board.meanMineStates[x][y].isActive = false;
      }
    }
  }

  getSimplifiedTilesArray() {
    //Create a copy of this.board.tilesArray where the values are what they would be if the mean mines were removed
    let simplifiedTilesArray = this.board.cloneTilesArray();

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        if (
          this.board.meanMineStates[x][y].isMine &&
          this.board.meanMineStates[x][y].isActive
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