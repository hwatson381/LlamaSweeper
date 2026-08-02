import Algorithms from "./Algorithms";
import { Dialog } from 'quasar';

import {
  minimumEff,
  generateEffBoardsInBackground,
  effBoardsStoredDisplayCount,
  effBoardsMaxStoredCount,
  effBoardsStoredFirstClickDisplay,
  effFirstClickType,
  effWebWorkerCount,
  effBoardsImplementation,
  boardWidth,
  boardHeight,
  boardMines,
  begEffOptions,
  intEffOptions,
  expEffOptions,
  begEffSlowGenPoint,
  intEffSlowGenPoint,
  expEffSlowGenPoint,
} from "src/composables/useSettings";

class EffShuffleManager {
  constructor() {
    this.isWorkerPoolInitialised = false;
    this.workerPool = [];

    //Format is Width-Height-Mines-Eff => [{mines: 2d mines array, firstClick: {x, y}}]
    this.storedBoards = new Map();

    this.isWorkerPoolPaused = true;

    //format is `${width}-${height}-${mineCount}-${targetEff}`
    this.workerPoolCurrentTaskKey = "";

    // which square we use as first click for worker generated boards
    this.workerPoolCurrentFirstClickType = ""; //Values: middle, corner, random, same

    // which implementation of 8way zini the workers are using
    this.workerPoolCurrentImplementationType = ""; //Values: wasm_small, wasm_large, js

    this.sendWorkerCurrentTaskDebounceTimeoutHandle = null;

    //Queue which tracks the most recently played custom games (dimensions and target eff)
    //Boards that are not recently played get garbage collected
    this.recentlyPlayedCustoms = []; //array of `${width}-${height}-${mineCount}-${targetEff}`
    this.maxStoredCustoms = 10;
  }

  provideEffBoard(width, height, mineCount, firstClick) {
    const targetEff = minimumEff.value;
    const timeoutSeconds = 5;

    if (generateEffBoardsInBackground.value) {
      //Check if we have a pre-generated board
      const boardKey = `${width}-${height}-${mineCount}-${targetEff}`;
      const storedBoard = this.storedBoards.get(boardKey);
      this.addRecentlyPlayedCustom(boardKey); //Mark this board as being played since they've requested a board for it (only if it is a custom game)
      if (Array.isArray(storedBoard) && storedBoard.length > 0) {
        let precomputedBoard = storedBoard.shift(); //return precomputed mines array and where the first click was
        effBoardsStoredDisplayCount.value = storedBoard.length;
        effBoardsStoredFirstClickDisplay.value =
          storedBoard[0]?.firstClickType ?? effFirstClickType.value;
        this.sendWorkersCurrentTask(); //Just in case, as workers may need resuming if it was previously paused
        return precomputedBoard;
      }
    }

    //No pre-generated boards (as we would've returned earlier) so try to generate our own

    //change firstClick as needed
    switch (effFirstClickType.value) {
      case "corner":
        firstClick = { x: 0, y: 0 };
        break;
      case "middle":
        firstClick = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
        break;
      //All other cases instead give a random first click
      case "same":
        //Leave first click as is
        break;
      case "random":
        firstClick = null;
        break;
      default:
      //do nothing
    }

    let minesArray = Algorithms.effBoardShuffle(
      width,
      height,
      mineCount,
      firstClick,
      targetEff,
      timeoutSeconds
    );

    if (!minesArray) {
      Dialog.create({
        title: "Alert",
        message: "Failed to generate board. Consider enabling the background generation setting. If it is already enabled, try increasing the number of workers.",
      });
      return false;
    } else {
      if (effFirstClickType.value === "random") {
        firstClick = Algorithms.getRandomZeroCell(minesArray);
      }

      if (effFirstClickType.value === "same") {
        firstClick = false; //Signal that we don't change position of the click
      }

      return {
        mines: minesArray,
        firstClick: firstClick, //False as when generating in main thread, we don't change position of first click
      };
    }
  }

  activateBackgroundGeneration() {
    this.initWorkerPoolIfNotAlreadyInited();
    this.sendWorkersCurrentTask();
  }

  deactivateBackgroundGeneration() {
    //kill all workers
    this.killAllWorkers();

    //run initialisation procedure again
    this.isWorkerPoolInitialised = false;
    this.workerPool = [];
    this.workerPoolCurrentTaskKey = "";
    this.workerPoolCurrentFirstClickType = "";
    this.workerPoolCurrentImplementationType = "";
    this.isWorkerPoolPaused = true;
  }

  initWorkerPoolIfNotAlreadyInited() {
    if (this.isWorkerPoolInitialised) {
      return;
    }

    if (!window.Worker) {
      return;
    }

    console.log("starting initiation");

    let hasReportedWorkerError = false;

    for (let i = 0; i < effWebWorkerCount.value; i++) {
      console.log(`initing worker ${i}`);

      const worker = new Worker(
        new URL("../workers/eff-worker.js", import.meta.url),
        {
          type: "module",
        }
      );

      worker.onmessage = this.handleMessageReceived.bind(this);

      worker.onerror = (error) => {
        if (!hasReportedWorkerError) {
          Dialog.create({
            title: "Alert",
            message: "Error occurred in web worker for eff board generation.",
          });
          hasReportedWorkerError = true;
        }
      }

      this.workerPool.push(worker);
    }

    console.log("finished initiation");

    this.isWorkerPoolInitialised = true;
  }

  sendWorkersCurrentTaskDebounced() {
    //Calls this.sendWorkersCurrentTask, but only if 500ms have passed without being called again.
    //This reduces unnecessary messages when adjusting dimensions/mines/target eff etc
    let self = this;
    if (this.sendWorkerCurrentTaskDebounceTimeoutHandle !== null) {
      clearTimeout(this.sendWorkerCurrentTaskDebounceTimeoutHandle);
      this.sendWorkerCurrentTaskDebounceTimeoutHandle = null;
    }

    this.sendWorkerCurrentTaskDebounceTimeoutHandle = setTimeout(() => {
      console.log("new task sent for board change");
      self.sendWorkersCurrentTask();
      self.sendWorkerCurrentTaskDebounceTimeoutHandle = null;
      self.garbageCollectStoredBoards();
    }, 500);
  }

  sendWorkersCurrentTask() {
    if (!this.isWorkerPoolInitialised) {
      return;
    }

    this.sendUpdateFirstClickIfNeeded();
    this.sendUpdateImplementationIfNeeded();

    const boardKey = `${boardWidth.value}-${boardHeight.value}-${boardMines.value}-${minimumEff.value}`;

    if (
      !this.isWorkerPoolPaused &&
      this.workerPoolCurrentTaskKey === boardKey
    ) {
      //Early exit as workerpool is already generating the board we want
      return;
    }

    const storedBoard = this.storedBoards.get(boardKey);

    if (Array.isArray(storedBoard)) {
      effBoardsStoredDisplayCount.value = storedBoard.length;
      effBoardsStoredFirstClickDisplay.value =
        storedBoard[0]?.firstClickType ?? effFirstClickType.value;
    } else {
      effBoardsStoredDisplayCount.value = 0;
    }

    if (
      Array.isArray(storedBoard) &&
      storedBoard.length >= effBoardsMaxStoredCount.value
    ) {
      //Already generated enough of this board
      this.sendWorkersPauseCommand();
      return;
    }

    this.workerPool.forEach((worker) =>
      worker.postMessage({
        command: "process",
        width: boardWidth.value,
        height: boardHeight.value,
        mineCount: boardMines.value,
        targetEff: minimumEff.value,
      })
    );

    this.workerPoolCurrentTaskKey = boardKey;
    this.isWorkerPoolPaused = false;
  }

  sendWorkersPauseCommand() {
    if (!this.isWorkerPoolInitialised) {
      return;
    }

    if (this.isWorkerPoolPaused) {
      //already paused, do nothing
      return;
    }

    this.workerPool.forEach((worker) =>
      worker.postMessage({
        command: "pause",
      })
    );

    this.isWorkerPoolPaused = true;
  }

  sendUpdateFirstClickIfNeeded() {
    if (effBoardsStoredDisplayCount.value === 0) {
      effBoardsStoredFirstClickDisplay.value = effFirstClickType.value;
    }

    if (!this.isWorkerPoolInitialised) {
      return;
    }

    if (this.workerPoolCurrentFirstClickType === effFirstClickType.value) {
      //worker is already using correct first click
      return;
    }

    this.workerPool.forEach((worker) =>
      worker.postMessage({
        command: "updateFirstClickType",
        firstClickType: effFirstClickType.value,
      })
    );

    this.workerPoolCurrentFirstClickType = effFirstClickType.value;
  }

  sendUpdateImplementationIfNeeded() {
    if (!this.isWorkerPoolInitialised) {
      return;
    }

    if (this.workerPoolCurrentImplementationType === effBoardsImplementation.value) {
      //worker is already using correct implementation
      return;
    }

    this.workerPool.forEach((worker) =>
      worker.postMessage({
        command: "updateImplementationType",
        implementationType: effBoardsImplementation.value,
      })
    );

    this.workerPoolCurrentImplementationType = effBoardsImplementation.value;
  }

  handleMessageReceived(event) {
    if (event.data.message === "foundBoards") {
      this.updateStoredBoard(event);
    } else if (event.data.message === "benchmarkResults") {
      this.handleBenchmarkResults(event);
    }
  }

  updateStoredBoard(event) {
    let workerBoardKey = event.data.boardKey;
    let foundBoards = event.data.foundBoards;
    let workerId = event.data.workerId;

    console.log(
      `Adding ${foundBoards.length} board(s) to ${workerBoardKey} from worker ${workerId}`
    );

    let storedBoardArray = this.storedBoards.get(workerBoardKey);
    if (!storedBoardArray) {
      storedBoardArray = [];
      this.storedBoards.set(workerBoardKey, storedBoardArray);
    }

    for (let board of foundBoards) {
      if (storedBoardArray.length <= effBoardsMaxStoredCount.value - 1) {
        storedBoardArray.push(board);
      }
    }

    //If we are on this board then update counter that tells user how many boards are stored
    if (this.workerPoolCurrentTaskKey === workerBoardKey) {
      effBoardsStoredDisplayCount.value = storedBoardArray.length;
      effBoardsStoredFirstClickDisplay.value =
        storedBoardArray[0]?.firstClickType ?? effFirstClickType.value;
    }

    //Pause workers if we have maxed out the number of stored boards for this size
    if (storedBoardArray.length >= effBoardsMaxStoredCount.value) {
      if (
        this.workerPoolCurrentTaskKey === workerBoardKey &&
        !this.isWorkerPoolPaused
      ) {
        this.sendWorkersPauseCommand();
      }
    }
  }

  handleBenchmarkResults(event) {
    let width = event.data.width;
    let height = event.data.height;
    let mineCount = event.data.mineCount;
    let targetEff = event.data.targetEff;
    let iterations = event.data.iterations;

    let jsTime = event.data.jsTime;
    let wasmSmallTime = event.data.wasmSmallTime;
    let wasmLargeTime = event.data.wasmLargeTime;

    Dialog.create({
      title: "Alert",
      message: `Benchmarking run complete. <br>
      Tested ${iterations} iterations of ${width}x${height}/${mineCount} at ${targetEff}%. <br>
      JS time: ${jsTime.toFixed(5)}s <br>
      WASM small time: ${wasmSmallTime.toFixed(5)}s <br>
      WASM large time: ${wasmLargeTime.toFixed(5)}s`,
      html: true,
      persistent: true,
    });

    if (generateEffBoardsInBackground.value) {
      this.sendWorkersCurrentTaskDebounced(); //Restart workers after. Slightly sketchy because maybe we navigated away but whatever.
    }
  }

  garbageCollectStoredBoards() {
    if (!this.isWorkerPoolInitialised) {
      return;
    }

    for (let key of this.storedBoards.keys()) {
      //Parse out width, height, mineCount, targetEff
      let [, width, height, mineCount, targetEff] = key.match(
        /^(\d+)-(\d+)-(\d+)-(\d+)$/
      );
      width = parseInt(width);
      height = parseInt(height);
      mineCount = parseInt(mineCount);
      targetEff = parseInt(targetEff);

      if (
        width === boardWidth.value &&
        height === boardHeight.value &&
        mineCount === boardMines.value &&
        targetEff === minimumEff.value
      ) {
        //currently active board, don't garbage collect
        continue;
      }

      //beginner
      if (key.startsWith("9-9-10-")) {
        if (
          begEffOptions.includes(targetEff) ||
          targetEff > begEffSlowGenPoint
        ) {
          //Don't garbage collect beg if it's a dropdown option or above a certain value
          continue;
        }
      }

      //int
      if (key.startsWith("16-16-40-")) {
        if (
          intEffOptions.includes(targetEff) ||
          targetEff > intEffSlowGenPoint
        ) {
          //Don't garbage collect int if it's a dropdown option or above a certain value
          continue;
        }
      }

      //exp
      if (key.startsWith("30-16-99-") || key.startsWith("16-30-99-")) {
        if (
          expEffOptions.includes(targetEff) ||
          targetEff > expEffSlowGenPoint
        ) {
          //Don't garbage collect exp if it's a dropdown option or above a certain value
          continue;
        }
      }

      //Check if custom game was played within the last x games
      if (this.recentlyPlayedCustoms.includes(key)) {
        continue;
      }

      //Garbage collect if this is a beg/int/exp non-presets below slow gen point
      //Also garbage collect if it is a non-recent custom game
      console.log("deleting " + key);
      this.storedBoards.delete(key);
    }
  }

  clearAllStoredBoards() {
    this.storedBoards.clear();
    effBoardsStoredFirstClickDisplay.value = effFirstClickType.value;
    effBoardsStoredDisplayCount.value = 0;
    this.sendWorkersCurrentTask(); //just in case as workers may need resuming
  }

  addRecentlyPlayedCustom(boardKey) {
    if (!this.isWorkerPoolInitialised) {
      return;
    }

    //exclude games of regular sizes.
    if (boardKey.startsWith("9-9-10-")) {
      return;
    }
    if (boardKey.startsWith("16-16-40-")) {
      return;
    }
    if (boardKey.startsWith("16-16-40-")) {
      return;
    }

    if (this.recentlyPlayedCustoms.includes(boardKey)) {
      return;
    }

    //Add custom to queue
    this.recentlyPlayedCustoms.push(boardKey);
    if (this.recentlyPlayedCustoms.length > this.maxStoredCustoms) {
      this.recentlyPlayedCustoms.shift();
    }
  }

  killAllWorkers() {
    if (!this.isWorkerPoolInitialised) {
      return;
    }

    this.workerPool.forEach((worker) => worker.terminate());

    this.workerPool = [];
  }

  reinitWorkers() {
    if (!this.isWorkerPoolInitialised) {
      return;
    }

    this.deactivateBackgroundGeneration();
    this.activateBackgroundGeneration();
  }

  doBenchmarkingRun({
    width,
    height,
    mineCount,
    targetEff,
    iterations
  }) {
    this.initWorkerPoolIfNotAlreadyInited();
    this.sendWorkersPauseCommand();

    //Only one worker should do the benchmarking run.
    this.workerPool[0].postMessage({
      command: "benchmark",
      width: width,
      height: height,
      mineCount: mineCount,
      targetEff: targetEff,
      iterations: iterations
    });
  }
}

const effShuffleManager = new EffShuffleManager();
export default effShuffleManager;