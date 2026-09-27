//Worker for running DOMS (optimal) ZiNi in WASM without clogging up the main thread

import { wasmReadySettled, doms_zini } from "src/classes/RustWasm";

onmessage = function (event) {
  const { width, height, mines, maxStates } = event.data.parameters;

  let lastReport = 0;
  const reportProgress = (processed, total, states) => {
    //Throttle messages, but always report the final layer
    const now = Date.now();
    if (now - lastReport < 100 && processed !== total) {
      return;
    }
    lastReport = now;
    postMessage({
      type: "iteration-update",
      iterations: `Processed ${processed}/${total} candidates, ${states.toLocaleString()} states`,
    });
  };

  try {
    const result = doms_zini(width, height, mines, maxStates, reportProgress);
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
