class Benchmark {
  constructor() {
    this.times = new Map();
    //Structure
    /*
    'key' ->
    {
      totalTime: time,
      lastStart: performnce.now timestamp
      isRunning: bool
    }
    */
  }

  startTime(key) {
    let timing;
    if (this.times.has(key)) {
      timing = this.times.get(key);
    } else {
      timing = {
        totalTime: 0,
        lastStart: null,
        isRunning: false,
      };
      this.times.set(key, timing);
    }

    if (timing.isRunning) {
      throw new Error("cannot start timer that is already running");
    }

    timing.lastStart = performance.now();
    timing.isRunning = true;
  }

  stopTime(key) {
    let timing = this.times.get(key);
    if (!timing) {
      throw new Error(`timer with key "${key}" does not exist`);
    }
    if (!timing.isRunning) {
      throw new Error("cannot stop timer that is already stopped");
    }
    timing.isRunning = false;
    timing.totalTime += performance.now() - timing.lastStart;
    timing.isRunning = false;
  }

  report() {
    for (let [key, timing] of this.times.entries()) {
      if (timing.isRunning) {
        throw new Error("not all timers stopped");
      }
      console.log(`key: ${key}, timing: ${timing.totalTime / 1000}s`);
    }
  }

  clearAll() {
    this.times = new Map();
  }
}

export default Benchmark;