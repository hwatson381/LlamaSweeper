//Worker for running basic stats calculation jobs
//without clogging up the main thread
import Algorithms from "src/classes/Algorithms";
import ChainZini from "src/classes/ChainZini";

let statsLock = -1;
let autoHintLock = -1;

let jobs = [];
/*
  jobs structure:
  {
    command: 'addJob' | 'updateStatsLock' | 'updateAutoHintLock',
    jobName: string,
    statsLock?: null | number
    autoHintLock?: null | number,
    parameters?: {
      ...
    },
    id: number
  }
*/

let timeoutHandle = null;

onmessage = function (event) {
  const msg = event.data;

  switch (msg.command) {
    case 'addJob':
      jobs.push(msg);
      processNextJobAsync();
      break;
    case 'updateStatsLock':
      if (typeof msg.statsLock !== 'number') {
        throw new Error('invalid payload');
      }
      statsLock = msg.statsLock;
      break;
    case 'updateAutoHintLock':
      if (typeof msg.autoHintLock !== 'number') {
        throw new Error('invalid payload');
      }
      autoHintLock = msg.autoHintLock;
      break;
    default:
      throw new Error('invalid payload');
  }
}

function processNextJobAsync() {
  if (timeoutHandle !== null) {
    clearTimeout(timeoutHandle);
  }

  //No delay, but intentionally call timeout so that other messages can squeeze in
  timeoutHandle = setTimeout(processJob, 0);
}

function processJob() {
  clearTimeout(timeoutHandle); //Stop processJob being spammed because we call it after this job is processed

  let job = jobs.shift();

  if (typeof job === 'undefined') {
    return; //No jobs to process
  }

  if (
    (typeof job.statsLock === 'number' && job.statsLock < statsLock) ||
    (typeof job.autoHintLock === 'number' && job.autoHintLock < autoHintLock)
  ) {
    postMessage({
      success: false,
      id: job.id
    });

    processNextJobAsync();
    return;
  }

  try {
    let result;

    switch (job.jobName) {
      case '8-way-zini':
        result = compute8Way(job.parameters);
        break;
      case '100-chain':
        result = compute100Chain(job.parameters);
        break;
      case 'wom-zini-hzini':
        result = computeWomZinis(job.parameters);
        break;
      case 'calc-board-probability':
        result = calcBoardProbability(job.parameters);
        break;
      default:
        throw new Error('invalid jobName');
    }

    let payload = {
      success: true,
      id: job.id,
      result: result
    }

    if (typeof job.statsLock === 'number') {
      payload.statsLock = job.statsLock;
    }

    if (typeof job.autoHintLock === 'number') {
      payload.autoHintLock = job.autoHintLock;
    }

    postMessage(payload);
  } catch (err) {
    postMessage({
      success: false,
      id: job.id
    });
  } finally {
    processNextJobAsync();
  }
}

function compute8Way({
  mines
}) {
  return Algorithms.calcEightWayZini(mines);
}

function compute100Chain({
  mines
}) {
  const { total, clicks } = ChainZini.calcNWayChainZini({
    mines: mines,
    numberOfIterations: 100,
    includeClickPath: true
  });

  //Only return total and clicks as other properties e.g. solution will lose prototypes when serialising and sending across worker boundary
  return { total, clicks };
}

function computeWomZinis({
  mines
}) {
  //wom zini without correction
  let { womZini, womHzini } = Algorithms.calcWomZiniAndHZini(
    mines,
    false
  );
  //wom zini with correction
  let { womZini: cWomZini, womHzini: cWomHzini } =
    Algorithms.calcWomZiniAndHZini(mines, true);

  return {
    womZini: womZini,
    womHzini: womHzini,
    cWomZini: cWomZini,
    cWomHzini: cWomHzini
  }
}

function calcBoardProbability({
  probCalcBoard,
  totalMines
}) {
  let probabilityGrid = Algorithms.calcBoardProbability(
    probCalcBoard,
    totalMines
  );

  return probabilityGrid;
}