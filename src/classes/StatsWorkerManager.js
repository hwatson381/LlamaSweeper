//Interfaces with the basic-stats-worker.js web worker
import { Dialog } from 'quasar';

class StatsWorkerManager {
  constructor() {
    this.statsLock = -1;
    this.autoHintLock = -1;
    this.jobsMap = new Map(); //Map of jobId to {resolve, reject} for promises
    this.nextId = 0;

    if (!window.Worker) {
      alert('Web workers not supported, please contact Llama if this happens.');
      throw new Error('Web workers not supported for stats worker.');
    }

    this.worker = new Worker(
      new URL("../workers/basic-stats-worker.js", import.meta.url),
      {
        type: "module",
      }
    );

    this.worker.onerror = (error) => {
      Dialog.create({
        title: "Alert",
        message: "Error occurred in web worker for Stats calculation.",
      });
    }

    this.worker.onmessage = this.handleMessage.bind(this);
  }

  incrementStatsLock() {
    this.statsLock++;

    this.worker.postMessage({
      command: 'updateStatsLock',
      statsLock: this.statsLock
    });
  }

  incrementAutoHintLock() {
    this.autoHintLock++;

    this.worker.postMessage({
      command: 'updateAutoHintLock',
      autoHintLock: this.autoHintLock
    });
  }

  handleMessage(event) {
    const msg = event.data;

    //Find job with id
    let thisJob = this.jobsMap.get(msg.id);

    if (typeof thisJob === 'undefined') {
      return;
    }




    if (msg.success) {
      //Double check lock info hasn't changed
      if (
        (typeof msg.statsLock === 'number' && msg.statsLock < this.statsLock) ||
        (typeof msg.autoHintLock === 'number' && msg.autoHintLock < this.autoHintLock)
      ) {
        thisJob.reject();
      } else {
        thisJob.resolve(msg.result);
      }
    } else {
      thisJob.reject();
    }

    this.jobsMap.delete(msg.id);
  }

  calc8WayZiniInWorker(mines) {
    let jobPromise = this.createJobPromise('8-way-zini', { mines }, true, false);

    return jobPromise;
  }

  calc100ChainInWorker(mines) {
    let jobPromise = this.createJobPromise('100-chain', { mines }, true, false);

    return jobPromise;
  }

  calcWomZinisInWorker(mines) {
    let jobPromise = this.createJobPromise('wom-zini-hzini', { mines }, true, false);

    return jobPromise;
  }

  createJobPromise(jobName, params, useStatsLock, useAutoHintLock) {
    let jobPromise = new Promise((resolve, reject) => {
      let jobId = this.nextId++;
      this.jobsMap.set(jobId, { resolve, reject });

      let payload = {
        command: 'addJob',
        jobName: jobName,
        parameters: params,
        id: jobId
      };

      if (useStatsLock) {
        payload.statsLock = this.statsLock;
      }

      if (useAutoHintLock) {
        payload.autoHintLock = this.autoHintLock;
      }

      this.worker.postMessage(payload);
    });

    return jobPromise;
  }
}

export default StatsWorkerManager;