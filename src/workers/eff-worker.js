//Worker that helps us generate eff boards in the background
import Algorithms from "src/classes/Algorithms";
import init, { eight_way, eight_way_benchmark } from "../../wasm/pkg/llamasweeper_rust.js";

const characters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
let workerId = characters.charAt(Math.floor(Math.random() * characters.length));

console.log(`worker ${workerId} initialised`);

let wasmReady = false;
init().then(() => {
  wasmReady = true;
});

let isPaused = true;
let currentTask = {
  width: null,
  height: null,
  mineCount: null,
  targetEff: null,
};
let firstClickType = "random"; //string describing where first click is
let effBoardsImplementation = "js"; //string describing which implementation of effBoards to use, either "wasm", "wasm_small", "wasm_large" or "js"
let timeoutHandle = null;
const MAX_BOARDS_TO_FIND_PER_TASK = 5;
const MAX_WORK_DURATION_SECONDS = 2;

onmessage = function (event) {
  if (event.data.command === "process") {
    handleProcessCommand(event);
  } else if (event.data.command === "pause") {
    handlePauseCommand();
  } else if (event.data.command === "updateFirstClickType") {
    handleUpdateFirstClickType(event);
  } else if (event.data.command === "updateImplementationType") {
    handleUpdateImplementationType(event);
  } else if (event.data.command === "benchmark") {
    setTimeout(async function () { handleBenchmarkCommand(event); }, 0);
  } else {
    throw new Error("unrecognised command received in worker");
  }
};

function handleProcessCommand(event) {
  currentTask.width = event.data.width;
  currentTask.height = event.data.height;
  currentTask.mineCount = event.data.mineCount;
  currentTask.targetEff = event.data.targetEff;

  if (isPaused) {
    resume();
  }
}

function handlePauseCommand() {
  if (!isPaused) {
    clearTimeout(timeoutHandle);
    isPaused = true;
  }
}

function handleUpdateFirstClickType(event) {
  if (["corner", "middle", "random"].includes(event.data.firstClickType)) {
    firstClickType = event.data.firstClickType;
  } else {
    firstClickType = "random"; //default to random
  }
}

function handleUpdateImplementationType(event) {
  if (["wasm", "wasm_small", "wasm_large", "js"].includes(event.data.implementationType)) {
    effBoardsImplementation = event.data.implementationType;
  } else {
    effBoardsImplementation = "js"; //default to js
  }
}

function resume() {
  if (isPaused) {
    timeoutHandle = setTimeout(doCurrentTask, 0);
    isPaused = false;
  }
}

async function doCurrentTask() {
  //Try find best board...
  let doLongerWaitForNextRun = false;
  let foundBoards = [];

  let startTimeSeconds = performance.now() / 1000;
  let endTimeSeconds = startTimeSeconds + MAX_WORK_DURATION_SECONDS;

  let firstClickCoords = null;
  switch (firstClickType) {
    case "corner":
      firstClickCoords = { x: 0, y: 0 };
      break;
    case "middle":
      firstClickCoords = {
        x: Math.floor(currentTask.width / 2),
        y: Math.floor(currentTask.height / 2),
      };
      break;
    //All other cases instead give a random first click
    case "same":
    case "random":
    default:
      firstClickCoords = null;
  }

  /*
    Slightly scuffed, since we should probably just make an alternate version
    of Algorithms.effBoardShuffle instead...

    The way this loop works currently is that it does loops of Algorithms.effBoardShuffle
    until it exceeds time limit or finds MAX_BOARDS_TO_FIND_PER_TASK boards
  */

  if (!wasmReady && effBoardsImplementation.startsWith("wasm")) {
    await init();
    wasmReady = true;
  }

  while (true) {
    if (performance.now() / 1000 > endTimeSeconds) {
      break;
    }

    let minesArray;

    if (effBoardsImplementation.startsWith("wasm")) {
      let useSmall;

      if (effBoardsImplementation === "wasm_small") {
        useSmall = true;
      } else if (effBoardsImplementation === "wasm_large") {
        useSmall = false;
      } else {
        //effboardsImplementation === "wasm" here, so use small for under 1000 squares.
        useSmall = currentTask.width * currentTask.height < 1000;
      }

      //Calculate 8way zini using wasm implementation
      minesArray = eight_way(
        currentTask.width,
        currentTask.height,
        currentTask.mineCount,
        firstClickCoords, //Possibly null in which case we choose a random zero tile later
        currentTask.targetEff,
        Math.max(endTimeSeconds - performance.now() / 1000, 0.1), //How many seconds we have to generate the board
        useSmall //Whether to use the version of 8way optimised for small boards
      );
    } else {
      //effBoardsImplementation === "js" here
      //calculate 8way zini using js implementation
      minesArray = Algorithms.effBoardShuffle(
        currentTask.width,
        currentTask.height,
        currentTask.mineCount,
        firstClickCoords, //Possibly null in which case we choose a random zero tile later
        currentTask.targetEff,
        Math.max(endTimeSeconds - performance.now() / 1000, 0.1) //How many seconds we have to generate the board
      );
    }

    if (minesArray) {
      if (firstClickCoords === null) {
        firstClickCoords = Algorithms.getRandomZeroCell(minesArray);
      }

      foundBoards.push({
        mines: minesArray,
        firstClick: firstClickCoords,
        firstClickType: firstClickType,
      });

      if (foundBoards.length >= MAX_BOARDS_TO_FIND_PER_TASK) {
        //If we found loads of boards then it's very likely we will get told to pause soon
        //So might as well wait longer before starting the next to give time for the pause to be received
        doLongerWaitForNextRun = true;
        break;
      }
    }
  }

  if (foundBoards.length > 0) {
    sendMessageWithFoundBoards(foundBoards);
  }

  if (!isPaused) {
    //Run the next batch of work.
    //If statement is defensive, since the pausing should really happen through the timeout being cleared
    const delayBeforeForNextRun = doLongerWaitForNextRun ? 500 : 0;
    timeoutHandle = setTimeout(doCurrentTask, delayBeforeForNextRun);
  }
}

function sendMessageWithFoundBoards(foundBoards) {
  const boardKey = `${currentTask.width}-${currentTask.height}-${currentTask.mineCount}-${currentTask.targetEff}`;

  postMessage({
    message: "foundBoards",
    boardKey: boardKey,
    workerId: workerId,
    foundBoards: foundBoards,
  });
}

async function handleBenchmarkCommand(event) {
  let firstClickCoords = { x: 0, y: 0 }; //Arbitrary choice because doesn't matter for benchmarking
  let width = event.data.width;
  let height = event.data.height;
  let mineCount = event.data.mineCount;
  let targetEff = event.data.targetEff;
  let iterations = event.data.iterations;

  if (!wasmReady) {
    await init();
    wasmReady = true;
  }

  //Do js run
  let jsTime = Algorithms.effBoardShuffleBenchmarkRun(
    width,
    height,
    mineCount,
    firstClickCoords,
    targetEff,
    iterations //How many iteraitons we should time
  );

  //Do wasm_small run
  let wasmSmallTime = eight_way_benchmark(
    width,
    height,
    mineCount,
    firstClickCoords,
    targetEff,
    iterations, //How many iteraitons we should time
    true //use wasm _small algorithm
  );

  //Do wasm_large run
  let wasmLargeTime = eight_way_benchmark(
    width,
    height,
    mineCount,
    firstClickCoords,
    targetEff,
    iterations, //How many iteraitons we should time
    false //use wasm _large algorithm
  );

  postMessage({
    message: "benchmarkResults",
    width: width,
    height: height,
    mineCount: mineCount,
    targetEff: targetEff,
    iterations: iterations,
    jsTime: jsTime,
    wasmSmallTime: wasmSmallTime,
    wasmLargeTime: wasmLargeTime,
  });
}
