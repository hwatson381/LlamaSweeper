import Algorithms from "src/classes/Algorithms";
import statsWorkerManager from "src/classes/StatsWorkerManager";

import CONSTANTS from "src/includes/Constants";

import { Dialog } from "quasar"

import {
  wasmAvailable,
  autoHintCriteria,
  autoHintTime,
  autoHintDelay,
  autoHintVariants,
  autoHintBackdrop,
  showQuickPaintOptions,
} from "src/composables/useSettings";

class BoardHint {
  constructor(board) {
    this.board = board;
  }

  toggleHint() {
    if (!["running", "lost", "won", "replay"].includes(this.board.gameStage)) {
      window.alert("Hints can't be used at this stage of the game");
      return;
    }

    if (!wasmAvailable.value) {
      Dialog.create({
        title: "Failed",
        message: "Hints need WebAssembly which isn't supported.",
      });
      return;
    }

    if (!this.board.hintActive) {
      this.showHintSync();
    } else {
      this.hideHint();
    }
  }

  async showHintAsync(isLossHint = false, useAutoHintDelay = true) {
    //This is currently intended to only be used for loss hints
    //if we expand it to other scenarios then be aware that there may be more race conditions we need to defend against

    if (!wasmAvailable.value) {
      //Probability hints rely on wasm; silently skip when unavailable.
      return;
    }

    if (!statsWorkerManager) {
      //No worker available, fall back to synchronous hint
      this.showHintSync(isLossHint);
      return;
    }

    let delay;
    if (useAutoHintDelay) {
      delay = autoHintDelay.value;
    } else {
      delay = 0;
    }

    statsWorkerManager.incrementAutoHintLock();
    //Capture the lock so we can detect a board change that happens during the delay
    //AFTER the worker has already resolved (the worker's own stale-job rejection only
    //covers changes that happen before it resolves).
    const myLock = statsWorkerManager.autoHintLock;

    //prepare hint
    let { probCalcBoard, totalMines, meanMineAdjustments } =
      this.prepareProbCalcInput(isLossHint);

    //Calculate probability and wait out the configured delay concurrently.
    //Running both together means the total wait is max(delay, computeTime):
    //the delay never gets added on top of the compute time, and we never show
    //the hint sooner than the delay (so the mines stay visible long enough).
    let probabilityGrid;
    try {
      const [grid] = await Promise.all([
        statsWorkerManager.calcBoardProbabilityInWorker(
          probCalcBoard,
          totalMines
        ),
        new Promise((resolve) => setTimeout(resolve, delay)),
      ]);
      probabilityGrid = grid;
    } catch (err) {
      //Do nothing, just return early as hint failed (e.g. board could've changed)
      return;
    }

    //The worker may have resolved successfully but the board could have changed
    //during the remaining delay (e.g. user reset). The lock advancing tells us this.board.
    if (statsWorkerManager.autoHintLock !== myLock) {
      return;
    }

    //apply hint to board
    this.board.hintActive = true;
    this.board.quickPaintActive = false; //hide quickpaint at the same time as otherwise they visually compete
    showQuickPaintOptions.value = false;
    this.board.clearAllDepressedSquares();

    this.updateTilesArrayForHint(
      probCalcBoard,
      probabilityGrid,
      meanMineAdjustments
    );

    if (this.board.gameStage === "running") {
      this.board.stats.addHintUsed();
    }

    this.board.boardRenderer.draw();
  }

  showHintSync(isLossHint = false) {
    if (!wasmAvailable.value) {
      //Probability hints rely on wasm; silently skip when unavailable.
      return;
    }

    if (statsWorkerManager) {
      statsWorkerManager.incrementAutoHintLock();
    }

    //prepare hint
    let { probCalcBoard, totalMines, meanMineAdjustments } =
      this.prepareProbCalcInput(isLossHint);

    //Calculate probability
    let probabilityGrid = Algorithms.calcBoardProbability(
      probCalcBoard,
      totalMines
    );

    //apply hint to board
    this.board.hintActive = true;
    this.board.quickPaintActive = false; //hide quickpaint at the same time as otherwise they visually compete
    showQuickPaintOptions.value = false;
    this.board.clearAllDepressedSquares();

    this.updateTilesArrayForHint(
      probCalcBoard,
      probabilityGrid,
      meanMineAdjustments
    );

    if (this.board.gameStage === "running") {
      this.board.stats.addHintUsed();
    }

    this.board.boardRenderer.draw();
  }

  prepareProbCalcInput(isLossHint = false) {
    //prepare the input that gets sent off to the probability calculation library

    let probCalcBoard = [];

    //Construct 2d array based on which numbers tiles have or whether they are flagged etc
    for (let x = 0; x < this.board.width; x++) {
      probCalcBoard[x] = [];
      for (let y = 0; y < this.board.height; y++) {
        const cellState = this.board.tilesArray[x][y].state;
        if (typeof cellState === "number") {
          probCalcBoard[x][y] = cellState;
        } else if (cellState === CONSTANTS.UNREVEALED) {
          probCalcBoard[x][y] = 10;
        } else {
          probCalcBoard[x][y] = 10; //Everything else can just be treated as unrevealed
          //Note that we also include flags in here as mstoollib crashes if we were to send these
          //as player marked flags (11) in the case where the player places flags in impossible positions
        }
      }
    }

    ////////////////////////////////////////
    ////////////////////////////////////////

    //If this is a hint triggered by losing (e.g. a bad chord that also opens other squares)
    //Then we need to reverse the effects of this chord, including if the chord revealed any openings
    //and if any openings had any corresponding mean mines activated (activate may not be correct word)

    let meanMinesRemovedTotal = 0;
    let meanMineAdjustments = new Map(); //Track how much numbers need to be adjusted by for removing newly revealed mean mines

    if (isLossHint && this.board.lastSquaresChangedForAutoHint.length > 0) {
      let reversedMoveData =
        this.reverseLastMoveForLossHintOnProbCalcBoard(probCalcBoard);
      meanMinesRemovedTotal = reversedMoveData.meanMinesRemovedTotal;
      meanMineAdjustments = reversedMoveData.meanMineAdjustments;
    }

    ////////////////////////////////////////
    ////////////////////////////////////////

    //Figure out what the minecount should be

    let totalMines;
    if (this.board.variant === "mean openings") {
      //mines will differ from starting mine count so need to figure out total mines
      totalMines = 0;

      //count placed flags
      for (let x = 0; x < this.board.width; x++) {
        for (let y = 0; y < this.board.height; y++) {
          if (
            this.board.tilesArray[x][y].state === CONSTANTS.FLAG ||
            this.board.tilesArray[x][y].state === CONSTANTS.MINEWRONG
          ) {
            totalMines++;
          }
        }
      }

      //add unflagged
      totalMines += this.board.unflagged;

      //adjust for mean mines removed earlier
      totalMines -= meanMinesRemovedTotal;
    } else {
      totalMines = this.board.mineCount;
    }

    return {
      probCalcBoard,
      totalMines,
      meanMineAdjustments,
    };
  }

  reverseLastMoveForLossHintOnProbCalcBoard(probCalcBoard) {
    //Update probCalcBoard to undo the last move
    //we don't change hintTextures on the real board here
    //but we do also output meanMineAdjustments which is used for this

    let meanMinesRemovedTotal = 0;
    let meanMineAdjustments = new Map(); //Track how much numbers need to be adjusted by for removing newly revealed mean mines

    //Do a pass to calculate effect of mean mines we need to remove
    //And exclude numbers revealed from affected probability calculation
    for (let changedSquare of this.board.lastSquaresChangedForAutoHint) {
      //Squares revealed by final chord shouldn't influence the probability calculation
      probCalcBoard[changedSquare.x][changedSquare.y] = 10;

      const isMeanMine =
        this.board.variant === "mean openings" &&
        this.board.meanMineStates[changedSquare.x][changedSquare.y].isMine &&
        this.board.meanMineStates[changedSquare.x][changedSquare.y].isActive;

      if (isMeanMine) {
        meanMinesRemovedTotal++;

        //track that mean mines removed should subtract from their neighbours
        for (let i = changedSquare.x - 1; i <= changedSquare.x + 1; i++) {
          for (let j = changedSquare.y - 1; j <= changedSquare.y + 1; j++) {
            if (!this.board.checkCoordsInBounds(i, j)) {
              continue;
            }

            //save number subtraction into meanMineAdjustments
            let val = meanMineAdjustments.get(`${i}-${j}`) || 0;
            val -= 1;
            meanMineAdjustments.set(`${i}-${j}`, val);

            //also manually subtract from probCalcBoard in the very special case when a newly
            //revealed mean mine changes the value of a number that is already on the board
            if (
              !this.board.lastSquaresChangedForAutoHint.some(
                (sq) => sq.x === i && sq.y === j
              ) &&
              typeof this.board.tilesArray[i][j].state === "number" &&
              probCalcBoard[i][j] > 0 &&
              probCalcBoard[i][j] < 9
            ) {
              probCalcBoard[i][j]--;
            }
          }
        }
      }
    }

    return {
      meanMinesRemovedTotal,
      meanMineAdjustments,
    };
  }

  updateTilesArrayForHint(probCalcBoard, probabilityGrid, meanMineAdjustments) {
    //Updating tilesArray with the results of the probability calculation

    ////////////////////////////////////////
    ////////////////////////////////////////

    //Patch tiles based on undoing the last move in the case that this is a lossHint

    for (let changedSquare of this.board.lastSquaresChangedForAutoHint) {
      //Any changed squares from the last move (e.g. a wrong chord) should be changed as follows:
      // Make any numbers revealed transparent
      // reverse the effects of any mean mines revealed from last move

      const thisTile = this.board.tilesArray[changedSquare.x][changedSquare.y];

      const isMeanMine =
        this.board.variant === "mean openings" &&
        this.board.meanMineStates[changedSquare.x][changedSquare.y].isMine &&
        this.board.meanMineStates[changedSquare.x][changedSquare.y].isActive;

      if (typeof thisTile.state === "number") {
        //Make tiles revealed on blast chord transparent
        if (autoHintBackdrop.value === "numbers") {
          const adjustment =
            meanMineAdjustments.get(`${changedSquare.x}-${changedSquare.y}`) ||
            0;
          thisTile.hint.hintTexture = "tr2_" + (thisTile.state + adjustment);
        } else {
          thisTile.hint.hintTexture = CONSTANTS.UNREVEALED;
        }
      } else if (isMeanMine) {
        thisTile.hint.hintTexture = "tr2_0";
      }
    }

    //Rare edge case:
    //Apply any adjustments for mean mines to cells outside the ones that changed from last move
    for (let [key, adjustment] of meanMineAdjustments.entries()) {
      const [i, j] = key.split("-").map(Number);
      const thisTile = this.board.tilesArray[i][j];
      if (
        !this.board.lastSquaresChangedForAutoHint.some(
          (sq) => sq.x === i && sq.y === j
        ) &&
        typeof thisTile.state === "number"
      ) {
        thisTile.hint.render = "textureonly";
        thisTile.hint.hintTexture = thisTile.state + adjustment;
      }
    }

    ////////////////////////////////////////
    ////////////////////////////////////////

    //Set up lots of rendering stuff for tiles
    //Give tiles probabilities
    //Set how the hint should render on each tile

    let safestProbability = Infinity;

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        this.board.tilesArray[x][y].hint.probability = probabilityGrid[x][y];

        let render = "skip"; //fallback of skipping rendering prob.

        if (this.board.tilesArray[x][y].hint.render === "textureonly") {
          //Special case for when mean mines changes an already revealed number
          render = "textureonly";
        } else if (probCalcBoard[x][y] < 10) {
          //This is a revealed number (as opposed to unopened/bomb/flag etc), so doesn't need a hint
          //Use probCalcBoard here as it has last move removed in case of loss hint.
          render = "skip";
        } else if (
          this.board.tilesArray[x][y].state === CONSTANTS.FLAG &&
          probabilityGrid[x][y] === 1
        ) {
          //Player marked as flag and it's 100% a mine
          render = "skip";
        } else if (
          (this.board.tilesArray[x][y].state === CONSTANTS.FLAG ||
            this.board.tilesArray[x][y].state === CONSTANTS.MINEWRONG) &&
          probabilityGrid[x][y] < 1
        ) {
          //Player marked as flag and this is only probabilistic, so still need to show probability
          render = "onflag";
        } else if (this.board.tilesArray[x][y].state === CONSTANTS.MINERED) {
          render = "onblastmine";
        } else if (this.board.tilesArray[x][y].state === CONSTANTS.MINE) {
          render = "onmine";
        } else {
          render = "frontier"; //Set all other squares to frontier, but later we may change some of these to floating
        }

        //Track safest probability on board
        if (
          render !== "skip" &&
          render !== "textureonly" &&
          probabilityGrid[x][y] !== 1 &&
          probabilityGrid[x][y] < safestProbability
        ) {
          safestProbability = probabilityGrid[x][y];
        }

        //Show different textures for hints
        if (
          this.board.tilesArray[x][y].hint.hintTexture === null &&
          this.board.gameStage !== "running"
        ) {
          if (this.board.tilesArray[x][y].state === CONSTANTS.MINE) {
            if (
              autoHintBackdrop.value === "numbers" ||
              autoHintBackdrop.value === "mines"
            ) {
              this.board.tilesArray[x][y].hint.hintTexture = "hint_mine";
            } else {
              this.board.tilesArray[x][y].hint.hintTexture = CONSTANTS.UNREVEALED;
            }
          } else if (this.board.tilesArray[x][y].state === CONSTANTS.UNREVEALED) {
            this.board.tilesArray[x][y].hint.hintTexture = CONSTANTS.UNREVEALED; //Needed in case this is a replay and we need to suppress the "show hidden tiles setting"
          }
        }

        this.board.tilesArray[x][y].hint.render = render;
      }
    }

    ////////////////////////////////////////
    ////////////////////////////////////////

    //Set colourScales, also change render method for floating

    let safestTilesCount = 0;
    let notSafestTilesCount = 0;
    let safestTiles = [];

    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        const thisTileHint = this.board.tilesArray[x][y].hint;

        if (
          thisTileHint.render === "skip" ||
          thisTileHint.render === "textureonly"
        ) {
          thisTileHint.colourScale = 0;
          continue;
        }

        if (thisTileHint.probability === safestProbability) {
          safestTiles.push({ x, y });
          safestTilesCount++;
        } else if (thisTileHint.probability !== 1) {
          notSafestTilesCount++;
        }

        //All floating cells should be grey unless they are the safest move
        if (
          thisTileHint.probability !== safestProbability &&
          !this.hasNumberNeighbourProbCalcBoardVersion(probCalcBoard, x, y)
        ) {
          thisTileHint.render = "floating";
        }

        if (thisTileHint.probability === 0) {
          thisTileHint.colourScale = 0;
          continue;
        }
        if (thisTileHint.probability === 1) {
          thisTileHint.colourScale = 1;
          continue;
        }

        thisTileHint.colourScale = this.hintProbabilityToScaleNormalCdf(
          thisTileHint.probability
        );
      }
    }

    //Only set highlight if fewer than 1/3 of tiles are safest or fewer than 10
    if (
      safestTilesCount / (safestTilesCount + notSafestTilesCount) < 1 / 3 ||
      safestTilesCount < 10
    ) {
      for (const tile of safestTiles) {
        this.board.tilesArray[tile.x][tile.y].hint.highlight = true;
      }
    }
  }

  hideHint(suppressDraw = false) {
    if (statsWorkerManager) {
      statsWorkerManager.incrementAutoHintLock();
    }

    if (!this.board.hintActive) {
      //already hidden, do nothing
      return;
    }

    this.board.hintActive = false;

    //Not really needed as setting hintActive is sufficient to hide, but just in case.
    for (let x = 0; x < this.board.width; x++) {
      for (let y = 0; y < this.board.height; y++) {
        this.board.tilesArray[x][y].hint = {
          probability: null,
          colourScale: null,
          render: "skip",
          hintTexture: null,
          highlight: false,
        };
      }
    }

    if (!suppressDraw) {
      this.board.boardRenderer.draw();
    }
  }

  showAutoHintIfNeeded() {
    const meetsTimeCriteria =
      autoHintCriteria.value === "time" &&
      typeof this.board.stats.endTime === "number" &&
      this.board.stats.endTime > autoHintTime.value;

    const meetsModeCriteria =
      autoHintVariants.value === "all" ||
      (autoHintVariants.value === "not eff boards" &&
        this.board.variant !== "eff boards");

    if (
      meetsModeCriteria &&
      (autoHintCriteria.value === "always" || meetsTimeCriteria)
    ) {
      if (autoHintDelay.value === 0) {
        //Compute synchronously so that mines don't briefly flash
        this.showHintSync(true);
      } else {
        //boardHint.showHintAsync has a built in delay so that mine positions can briefly be seen
        this.showHintAsync(true);
      }
    }
  }

  hasNumberNeighbourProbCalcBoardVersion(probCalcBoard, x, y) {
    //Used for hints to check whether a square is floating
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (!this.board.checkCoordsInBounds(i, j)) {
          continue;
        }

        if (probCalcBoard[i][j] < 10) {
          //Neighbour is a revealed number, so this isn't floating
          return true;
        }
      }
    }

    return false;
  }

  hintProbabilityToScalePiecewise(probability) {
    const boardDensity = this.board.mineCount / (this.board.width * this.board.height);
    const greenBias = 0.15 * (1 - boardDensity);
    const greenPoint = boardDensity + greenBias;

    let scale = probability;

    if (probability <= boardDensity) {
      scale = (probability / boardDensity) * greenPoint;
    } else {
      scale =
        greenPoint +
        ((probability - boardDensity) / (1 - boardDensity)) * (1 - greenPoint);
    }

    //shift it to be between 0.1 and 0.9 to separate from the safe/mine colours
    scale = scale * 0.8 + 0.1;

    return scale;
  }

  hintProbabilityToScaleNormalCdf(probability) {
    /*
      This was written by an llm so unverified.
      The idea is that the probabilities we see on a minesweeper board might follow a beta distribution
      (Think like a binomial distribution where the base probability is the board density)
      We approximate a beta distribution with a normal distribution and get the cdf (which uses polynomial approximation)
    */
    const d = this.board.mineCount / (this.board.width * this.board.height);
    const greenBias = 0.1 * (1 - d); // fades to 0 as density → 1
    const mu = d + greenBias;
    const sigma = 0.5 * Math.sqrt(d * (1 - d)); // spread; tune this based on how varied probs are

    // erf approximation (Abramowitz & Stegun)
    const erf = (x) => {
      const t = 1 / (1 + 0.3275911 * Math.abs(x));
      const poly =
        t *
        (0.254829592 +
          t *
          (-0.284496736 +
            t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
      const result = 1 - poly * Math.exp(-x * x);
      return x >= 0 ? result : -result;
    };

    const scale = 0.5 * (1 + erf((probability - mu) / (sigma * Math.sqrt(2))));
    return Math.max(0.05, Math.min(0.95, scale)); // clamp to avoid touching 0/1 endpoints
  }
}

export default BoardHint;