<template>
  <q-dialog v-model="effBoardsBenchmarkModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Benchmark eff boards</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          Eff boards has two different implementations of the 8-way ZiNi
          algorithm. They are exactly the same in result. But the WebAssembly
          version should be much faster than the JavaScript version with no
          downsides. This dialogue lets you run a benchmark to see the
          difference. The benchmark runs on a single background worker.
        </p>
        <p>
          The webAssembly version is further split into "Wasm Small" and "Wasm
          Large" which are optimised for performance on small and large boards
          respectively. By default the "Wasm" option switches from Wasm Small to
          Wasm Large for boards over 1000 squares.
        </p>
        <p>
          Board to run benchmark on: {{ boardWidth }}x{{ boardHeight }}/{{
            boardMines
          }}
          at {{ minimumEff }}%.
        </p>
        <q-input
          v-model.number="effBoardsBenchmarkIterations"
          class="q-mb-sm"
          debounce="50"
          type="number"
          label="Total Iterations"
          dense
          min="1"
          max="1000000"
          style="width: 110px"
        />
      </q-card-section>

      <q-card-actions align="between" class="text-primary">
        <q-btn label="Close" v-close-popup color="negative" />
        <q-btn
          @click="
            //Benchmarking run for zini algs
            () => {
              effShuffleManager.doBenchmarkingRun({
                width: boardWidth,
                height: boardHeight,
                mineCount: boardMines,
                targetEff: minimumEff,
                iterations: effBoardsBenchmarkIterations,
              });
            }
          "
          color="positive"
          v-close-popup
          label="Run Benchmark"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from "vue";
import {
  boardWidth,
  boardHeight,
  boardMines,
  effBoardsBenchmarkModal,
  minimumEff,
} from "src/composables/useSettings";

import effShuffleManager from "src/classes/EffShuffleManager";

defineOptions({
  name: "EffBoardsBenchmarkModal",
});

const effBoardsBenchmarkIterations = ref(1000);
</script>
