//Worker used for calculating deepchain (inclusion exclusion) zini without
//Clogging up the main thread.

import ChainZini from "src/classes/ChainZini";
import Chain from "src/classes/Chain";

onmessage = function (event) {
  hydrateParameters(event.data.parameters);

  if (event.data.parameters.analysisType === 'separate') {
    beginNWayRun(event.data.parameters, event.data.deepReportProgress);
  } else {
    beginNormalRun(event.data.parameters, event.data.deepReportProgress);
  }
}

function beginNormalRun(parameters, visualise) {
  let timingRunParameters = { ...parameters, doTimingRun: true };

  let timingRunResult = ChainZini.calcInclusionExclusionZini(timingRunParameters);
  sendTimingRunDone(timingRunResult.expectedTimeForRealRun);

  let realRunParameters = {
    ...parameters,
    progressUpdateFunction: visualise ? sendProgressUpdate : false
  };
  let realRunResult = ChainZini.calcInclusionExclusionZini(realRunParameters);

  sendRunCompletion(realRunResult);
}

function beginNWayRun(parameters, visualise) {
  //Use regular incEx for timing
  let timingRunParameters = { ...parameters, doTimingRun: true };

  let timingRunResult = ChainZini.calcInclusionExclusionZini(timingRunParameters);
  sendTimingRunDone(timingRunResult.expectedTimeForRealRun);

  //Do n-way incEx zini. Keep parameters the same, although this object will have extra stuff that is not used
  let realRunParameters = {
    ...parameters,
    progressUpdateFunction: visualise ? sendProgressUpdate : false
  };
  let realRunResult = ChainZini.calcNWayInclusionExclusionZini(realRunParameters);

  sendRunCompletion(realRunResult);
}

function sendTimingRunDone(timingRun) {
  postMessage({
    type: 'timing-run-done',
    timingRun: timingRun,
  });
}

function sendProgressUpdate(updateType, data) {
  switch (updateType) {
    case 'board-progress':
      postMessage({
        type: 'board-progress',
        clicks: data,
      });
      break;
    case 'percentage-progress':
      postMessage({
        type: 'percentage-progress',
        percentage: data,
      });
      break;
    case 'iteration-update':
      postMessage({
        type: 'iteration-update',
        iterations: data,
      });
      break;
    case 'log-update':
      postMessage({
        type: 'log-update',
        logEntry: data,
      });
      break;
    default:
      throw new Error('Unrecognised update type: ' + updateType);
  }
}

function sendRunCompletion(result) {
  postMessage({
    type: 'run-complete',
    result: result,
  });
}

function hydrateParameters(parameters) {
  //Re-add the prototype for any parameters that are missing it
  //In particular, this should be done for initialChainMap

  if (parameters.initialChainMap) {
    for (let chain of parameters.initialChainMap.values()) {
      Object.setPrototypeOf(chain, Chain.prototype);
    }
  }
}