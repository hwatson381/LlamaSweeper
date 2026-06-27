import { wasmReadySettled } from "src/classes/RustWasm";

/*
  Ensure the Rust/WASM module is instantiated on the main thread before the app
  mounts. Several main-thread call sites (no-guess board generation and
  probability hints) call the wasm functions synchronously, so the module must
  be ready by the time the UI can trigger them.

  `wasmReadySettled` never rejects: it resolves to `true` when wasm is usable
  and `false` otherwise. Call sites that need wasm check `isWasmAvailable()`
  separately and degrade gracefully, so we just wait for init to settle here.
*/
export default async () => {
  await wasmReadySettled;
};
