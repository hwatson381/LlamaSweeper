import Utils from "./Utils";
import { Dialog } from 'quasar';

//Class to manage running inclusion exclusion zini, and interfacing with web workers
class DeepChainZiniRunner {
  constructor(refs, inclusionExclusionParameters, progressCallbacks, deepReportProgress) {
    this.refs = refs;
    this.inclusionExclusionParameters = inclusionExclusionParameters;
    this.progressCallbacks = progressCallbacks;
    this.deepReportProgress = deepReportProgress;

    if (!window.Worker) {
      alert('Web workers not supported, please contact Llama if this happens.');
      throw new Error('Web workers not support for inclusion exclusion zini.');
    }

    this.refs.ziniRunnerActive.value = true;
    this.refs.ziniRunnerExpectedDuration.value = 'calculating...';
    this.refs.ziniRunnerExpectedFinishTime.value = 'calculating...';
    this.refs.ziniRunnerIterationsDisplay.value = '';
    this.refs.ziniRunnerPercentageProgress.value = '0%';

    this.worker = new Worker(
      new URL("../workers/deepchain-worker.js", import.meta.url),
      {
        type: "module",
      }
    );

    this.worker.onerror = (error) => {
      Dialog.create({
        title: "Alert",
        message: "Error occurred in web worker for DeepChain ZiNi.",
      });
    }

    this.worker.onmessage = this.handleMessage.bind(this);

    console.log(inclusionExclusionParameters);

    this.worker.postMessage({
      command: "begin",
      parameters: inclusionExclusionParameters,
      deepReportProgress: deepReportProgress
    })
  }

  handleMessage(event) {
    const message = event.data;

    /*
      Messages could be:
      Timing run complete
      Progress update (e.g. new board to display)
      Run complete
    */
    switch (message.type) {
      case 'timing-run-done':
        this.timingRunDone(message.timingRun);
        break;
      case 'board-progress':
        this.updateBoardProgress(message.clicks);
        break;
      case 'percentage-progress':
        this.updatePercentageProgress(message.percentage);
        break;
      case 'iteration-update':
        this.updateIterationDisplay(message.iterations);
        break;
      case 'log-update':
        this.addLogEntry(message.logEntry);
        break;
      case 'run-complete':
        this.completeRun(message.result);
        break;
      default:
        throw new Error('disallowed message type');
    }
  }

  timingRunDone(timingRun) {
    console.log(timingRun);
    this.refs.ziniRunnerExpectedDuration.value = Utils.formatTime(timingRun);
    this.refs.ziniRunnerExpectedFinishTime.value = Utils.timeInFuture(timingRun);
  }

  updateBoardProgress(clicks) {
    if (this.progressCallbacks && this.progressCallbacks.onBoardProgress) {
      this.progressCallbacks.onBoardProgress(clicks);
    }
  }

  updatePercentageProgress(percentage) {
    if (this.progressCallbacks && this.progressCallbacks.onPercentageProgress) {
      this.progressCallbacks.onPercentageProgress(percentage);
    }
  }

  updateIterationDisplay(iterations) {
    this.refs.ziniRunnerIterationsDisplay.value = iterations;
  }

  addLogEntry(logEntry) {
    console.log(logEntry);
  }

  completeRun(result) {
    console.log(result);
    this.worker.terminate();
    this.refs.ziniRunnerActive.value = false;
    if (this.progressCallbacks && this.progressCallbacks.onCompleteRun) {
      this.progressCallbacks.onCompleteRun(result);
    }
  }

  killWorker() {
    this.worker.terminate();
    this.refs.ziniRunnerActive.value = false;
  }
}

export default DeepChainZiniRunner;