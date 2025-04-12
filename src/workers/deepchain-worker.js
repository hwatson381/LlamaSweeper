//Worker used for calculating deepchain (inclusion exclusion) zini without
//Clogging up the main thread.

import ChainZini from "src/classes/ChainZini";

onmessage = function (event) {
  if (event.data.parameters.analysisType === 'separate') {
    beginNWayRun(event.data.parameters, event.data.deepVisualise);
  } else {
    beginNormalRun(event.data.parameters, event.data.deepVisualise);
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

function sendProgressUpdate(clicksAtThisStage) {
  postMessage({
    type: 'board-progress',
    clicks: clicksAtThisStage,
  });
}

function sendRunCompletion(result) {
  postMessage({
    type: 'run-complete',
    result: result,
  });
}