import init, {
  eight_way,
  eight_way_benchmark,
  laymine_solvable,
  cal_probability_onboard,
} from "../../wasm/pkg/llamasweeper_rust.js";

/*
  Single shared instantiation of the Rust/WASM module for whichever JS realm
  (the main thread or a specific web worker) imports this file. `init()` is
  called exactly once here; consumers `await wasmReady` before invoking any of
  the exported functions.

  Availability handling:
  WebAssembly can be unavailable (very old browsers, a CSP that blocks wasm, or
  a failed fetch/instantiation of the .wasm binary). Rather than letting the
  synchronous call sites throw or leaving worker job queues stalled, we track a
  synchronously-readable availability flag and expose a promise that always
  resolves (never rejects). The app boot awaits `wasmReadySettled` before
  mounting, so by the time the UI is interactive `isWasmAvailable()` is
  authoritative on the main thread.
*/

// Optimistically true when the WebAssembly global exists; flipped to its final
// value once `wasmReadySettled` resolves.
let wasmAvailable = typeof WebAssembly === "object";

let wasmReady;
if (wasmAvailable) {
  try {
    wasmReady = Promise.resolve(init());
  } catch (err) {
    // `init` threw synchronously (unexpected, but be defensive).
    wasmReady = Promise.reject(err);
  }
} else {
  wasmReady = Promise.reject(
    new Error("WebAssembly is not supported in this environment")
  );
}

/*
  A promise that ALWAYS resolves (never rejects) once init has settled, yielding
  `true` when wasm is usable and `false` otherwise. Consumers should prefer this
  over `wasmReady` so a failed init can't leave `.then`-only chains (e.g. worker
  job queues) waiting forever. Attaching this handler also marks any rejection
  of `wasmReady` as handled, preventing an unhandledrejection.
*/
const wasmReadySettled = wasmReady.then(
  () => {
    wasmAvailable = true;
    return true;
  },
  (err) => {
    wasmAvailable = false;
    console.error("Failed to initialise Rust/WASM module", err);
    return false;
  }
);

function isWasmAvailable() {
  return wasmAvailable;
}

export {
  wasmReady,
  wasmReadySettled,
  isWasmAvailable,
  eight_way,
  eight_way_benchmark,
  laymine_solvable,
  cal_probability_onboard,
};
