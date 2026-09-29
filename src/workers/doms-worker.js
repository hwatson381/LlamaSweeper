//Worker for running DOMS (optimal) ZiNi in WASM without clogging up the main thread

import { wasmReadySettled, doms_zini } from "src/classes/RustWasm";

const MIN_LAYERS_FOR_ESTIMATE = 10;

//Least-squares slope of ln(states) against frontier width, clamped to a sensible range
function fitGrowthRate(layers) {
  const points = layers.filter((layer) => layer.states > 1);
  if (points.length < 2) {
    return 0;
  }
  const n = points.length;
  const meanWidth = points.reduce((sum, p) => sum + p.width, 0) / n;
  const meanLog = points.reduce((sum, p) => sum + Math.log(p.states), 0) / n;
  let covariance = 0;
  let variance = 0;
  for (const p of points) {
    covariance += (p.width - meanWidth) * (Math.log(p.states) - meanLog);
    variance += (p.width - meanWidth) ** 2;
  }
  if (variance === 0) {
    return 0;
  }
  return Math.min(Math.max(covariance / variance, 0), Math.LN2);
}

//Predicts remaining time, assuming each layer's time is proportional to the states entering it
//and that state counts follow the frontier width of the chosen sweep order.
class EtaEstimator {
  constructor() {
    this.cutWidths = null;
    this.layers = [];
    this.startTime = performance.now();
    this.lastLayerTime = this.startTime;
    this.previousStates = 1;
  }

  widthAfter(processed) {
    return this.cutWidths && processed - 1 < this.cutWidths.length
      ? this.cutWidths[processed - 1]
      : 0;
  }

  addLayer(processed, states) {
    const now = performance.now();
    this.layers.push({
      width: this.widthAfter(processed),
      states,
      statesIn: this.previousStates,
      seconds: (now - this.lastLayerTime) / 1000,
    });
    this.lastLayerTime = now;
    this.previousStates = Math.max(states, 1);
  }

  //Returns { elapsedSeconds, remainingSeconds } or null while there is too little data
  estimate(processed, total) {
    if (!this.cutWidths || this.layers.length < MIN_LAYERS_FOR_ESTIMATE) {
      return null;
    }
    const elapsedSeconds = (performance.now() - this.startTime) / 1000;
    const layerSeconds = this.layers.reduce((sum, l) => sum + l.seconds, 0);
    const layerWork = this.layers.reduce((sum, l) => sum + l.statesIn, 0);
    const secondsPerState = layerSeconds / layerWork;

    const growth = fitGrowthRate(this.layers);
    //Anchor the curve on recent layers so it continues from the current state count
    const recent = this.layers.slice(-MIN_LAYERS_FOR_ESTIMATE);
    const offset =
      recent.reduce(
        (sum, l) => sum + Math.log(Math.max(l.states, 1)) - growth * l.width,
        0
      ) / recent.length;

    let remainingWork = 0;
    let statesIn = this.previousStates;
    for (let next = processed + 1; next <= total; next++) {
      remainingWork += statesIn;
      statesIn = Math.exp(offset + growth * this.widthAfter(next));
    }
    return {
      elapsedSeconds,
      remainingSeconds: remainingWork * secondsPerState,
    };
  }
}

onmessage = function (event) {
  const { width, height, mines, maxStates } = event.data.parameters;

  const estimator = new EtaEstimator();
  let lastReport = 0;
  const reportProgress = (progress) => {
    if (progress.type === "plan") {
      estimator.cutWidths = progress.cutWidths;
      return;
    }

    const { processed, total, states } = progress;
    estimator.addLayer(processed, states);

    //Throttle messages, but always report the final layer
    const now = Date.now();
    if (now - lastReport < 500 && processed !== total) {
      return;
    }
    lastReport = now;

    const eta = estimator.estimate(processed, total);
    if (eta) {
      postMessage({
        type: "eta-update",
        totalSeconds: eta.elapsedSeconds + eta.remainingSeconds,
        remainingSeconds: eta.remainingSeconds,
      });
    }
    postMessage({
      type: "iteration-update",
      candidates: { processed, total },
      states,
    });
  };

  try {
    const start = performance.now();
    const result = doms_zini(width, height, mines, maxStates, reportProgress);
    console.log(
      `DOMS complete in ${((performance.now() - start) / 1000).toFixed(
        2
      )} seconds`
    );
    postMessage({ type: "run-complete", result: result });
  } catch (error) {
    postMessage({
      type: "run-error",
      error: {
        kind: error?.kind ?? "internal",
        message: error?.message ?? String(error),
      },
    });
  }
};

//Only accept the "begin" message once wasm has settled, so the job can't run before init.
wasmReadySettled.then((available) => {
  if (!available) {
    postMessage({
      type: "run-error",
      error: {
        kind: "internal",
        message: "WebAssembly could not be loaded.",
      },
    });
    return;
  }
  postMessage({ type: "worker-ready" });
});
