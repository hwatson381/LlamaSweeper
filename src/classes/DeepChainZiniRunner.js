import Utils from "./Utils";
import { Dialog } from "quasar";
import {
  ziniRunnerActive,
  ziniRunnerTitle,
  ziniRunnerExpectedDuration,
  ziniRunnerExpectedFinishTime,
  ziniRunnerIterationsDisplay,
  ziniRunnerCandidatesDisplay,
  ziniRunnerStatesDisplay,
  ziniRunnerPercentageProgress,
} from "src/composables/useSettings";

//Class to manage running inclusion exclusion zini (or DOMS), and interfacing with web workers
class DeepChainZiniRunner {
  constructor(
    inclusionExclusionParameters,
    progressCallbacks,
    deepReportProgress,
    workerType = "deepchain"
  ) {
    this.inclusionExclusionParameters = inclusionExclusionParameters;
    this.progressCallbacks = progressCallbacks;
    this.deepReportProgress = deepReportProgress;

    if (!window.Worker) {
      alert("Web workers not supported, please contact Llama if this happens.");
      throw new Error("Web workers not support for inclusion exclusion zini.");
    }

    const isDoms = workerType === "doms";

    ziniRunnerActive.value = true;
    ziniRunnerTitle.value = isDoms
      ? "Running DOMS ZiNi"
      : "Running DeepChain ZiNi";
    ziniRunnerExpectedDuration.value = "calculating...";
    ziniRunnerExpectedFinishTime.value = "calculating...";
    ziniRunnerIterationsDisplay.value = "";
    ziniRunnerCandidatesDisplay.value = "";
    ziniRunnerStatesDisplay.value = "";
    ziniRunnerPercentageProgress.value = "0%";

    //Vite needs literal worker URLs to bundle them
    if (isDoms) {
      this.worker = new Worker(
        new URL("../workers/doms-worker.js", import.meta.url),
        {
          type: "module",
        }
      );
    } else {
      this.worker = new Worker(
        new URL("../workers/deepchain-worker.js", import.meta.url),
        {
          type: "module",
        }
      );
    }

    this.worker.onerror = (error) => {
      Dialog.create({
        title: "Alert",
        message: isDoms
          ? "Error occurred in web worker for DOMS ZiNi."
          : "Error occurred in web worker for DeepChain ZiNi.",
      });
    };

    this.worker.onmessage = this.handleMessage.bind(this);

    //A module worker loads asynchronously. If we post "begin" before the worker
    //has finished evaluating and registered its onmessage handler, the message can
    //be silently dropped (intermittently), leaving the run stuck. So we stash the
    //payload and only send it once the worker posts back "worker-ready".
    this.beginPayload = {
      command: "begin",
      parameters: inclusionExclusionParameters,
      deepReportProgress: deepReportProgress,
    };
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
      case "worker-ready":
        this.worker.postMessage(this.beginPayload);
        break;
      case "timing-run-done":
        this.timingRunDone(message.timingRun);
        break;
      case "eta-update":
        this.etaUpdate(message.totalSeconds, message.remainingSeconds);
        break;
      case "board-progress":
        this.updateBoardProgress(message.clicks);
        break;
      case "percentage-progress":
        this.updatePercentageProgress(message.percentage);
        break;
      case "iteration-update":
        this.updateIterationDisplay(message);
        break;
      case "log-update":
        this.addLogEntry(message.logEntry);
        break;
      case "run-complete":
        this.completeRun(message.result);
        break;
      case "run-error":
        this.errorRun(message.error);
        break;
      default:
        throw new Error("disallowed message type");
    }
  }

  timingRunDone(timingRun) {
    ziniRunnerExpectedDuration.value = Utils.formatTime(timingRun);
    ziniRunnerExpectedFinishTime.value = Utils.timeInFuture(timingRun);
  }

  etaUpdate(totalSeconds, remainingSeconds) {
    ziniRunnerExpectedDuration.value = Utils.formatTime(totalSeconds);
    ziniRunnerExpectedFinishTime.value = Utils.timeInFuture(remainingSeconds);
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

  //DeepChain sends a preformatted `iterations` string, DOMS sends `candidates` and `states` separately
  updateIterationDisplay({ iterations, candidates, states }) {
    if (iterations !== undefined) {
      ziniRunnerIterationsDisplay.value = iterations;
    }
    if (candidates) {
      ziniRunnerCandidatesDisplay.value = `${candidates.processed}/${candidates.total}`;
    }
    if (states !== undefined) {
      ziniRunnerStatesDisplay.value = states.toLocaleString();
    }
  }

  addLogEntry(logEntry) {
    console.log(logEntry);
  }

  completeRun(result) {
    console.log(result);
    this.worker.terminate();
    ziniRunnerActive.value = false;
    if (this.progressCallbacks && this.progressCallbacks.onCompleteRun) {
      this.progressCallbacks.onCompleteRun(result);
    }
  }

  errorRun(error) {
    this.worker.terminate();
    ziniRunnerActive.value = false;
    if (this.progressCallbacks && this.progressCallbacks.onError) {
      this.progressCallbacks.onError(error);
    }
  }

  killWorker() {
    this.worker.terminate();
    ziniRunnerActive.value = false;
  }
}

export default DeepChainZiniRunner;
