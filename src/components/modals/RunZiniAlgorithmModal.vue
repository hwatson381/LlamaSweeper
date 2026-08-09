<template>
  <q-dialog v-model="runZiniAlgorithmModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">ZiNi Algorithms</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          ZiNi algorithms are procedures that try to find the lowest number of
          clicks that a board can be solved in.
        </p>

        <div class="flex justify-around">
          <q-select
            class="q-mx-md q-mb-md"
            outlined
            options-dense
            dense
            transition-duration="100"
            input-debounce="0"
            v-model="analyseAlgorithm"
            style="width: 200px; flex-shrink: 0"
            :options="[
              {
                label: 'DeepChain ZiNi (best)',
                value: 'incexzini',
              },
              {
                label: '8 Way ZiNi',
                value: '8 way',
              },
              { label: 'WoM L ZiNi', value: 'womzini' },
              { label: 'WoM L ZiNi Improved', value: 'womzinifix' },
              { label: 'WoM HZiNi', value: 'womhzini' },
              { label: 'Chain ZiNi', value: 'chainzini' },
            ]"
            emit-value
            map-options
            stack-label
            label="Choose Algorithm"
          />
          <q-select
            class="q-mx-md q-mb-md"
            outlined
            options-dense
            dense
            transition-duration="100"
            input-debounce="0"
            v-model="analyseAlgorithmScope"
            style="width: 200px; flex-shrink: 0"
            :options="analyseAlgorithmScopeOptions"
            emit-value
            map-options
            stack-label
            label="Scope"
          />
        </div>
      </q-card-section>
      <template
        v-if="
          analyseAlgorithm === 'chainzini' || analyseAlgorithm === 'incexzini'
        "
      >
        <q-separator />
        <q-card-section>
          <div
            style="
              display: grid;
              justify-items: center;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            "
          >
            <q-input
              v-if="analyseAlgorithm === 'chainzini'"
              class="q-mb-sm"
              debounce="100"
              v-model.number="analyseIterations"
              label="Iterations"
              type="number"
              dense
              min="1"
              max="1000000"
              style="width: 110px"
            />
            <q-select
              v-if="analyseAlgorithm === 'incexzini'"
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="analyseDeepType"
              style="width: 175px; flex-shrink: 0"
              :options="[
                {
                  label: 'Separate (best)',
                  value: 'separate',
                },
                {
                  label: 'Minimum',
                  value: 'minimum',
                },
                {
                  label: 'Average',
                  value: 'average',
                },
                {
                  label: 'Average then Minimum',
                  value: 'average then minimum',
                },
              ]"
              emit-value
              map-options
              stack-label
              label="Deep analysis type"
            />
            <q-input
              v-if="analyseAlgorithm === 'incexzini'"
              class="q-mb-sm"
              debounce="50"
              v-model.number="analyseDeepIterations"
              label="Deep iterations"
              type="number"
              dense
              min="1"
              max="1000"
              style="width: 110px"
            />
            <q-checkbox
              v-if="analyseAlgorithm === 'incexzini'"
              v-model="analyseVisualise"
              label="Visualise"
            />
            <q-checkbox
              v-if="
                (analyseAlgorithm === 'chainzini' ||
                  analyseAlgorithm === 'incexzini') &&
                analyseAlgorithmScope === 'current'
              "
              v-model="analyseHistoryRewrite"
              label="Allow history rewrite"
            />
            <!--
            <q-checkbox
              v-if="analyseAlgorithm === 'incexzini'"
              v-model="analyseForbid"
              label="Forbid moves"
            />
            -->
          </div>
        </q-card-section>
      </template>

      <q-card-actions align="between" class="text-primary">
        <q-btn label="Cancel" color="negative" v-close-popup />
        <q-btn
          @click="
            Utils.setTimeoutWrapper(() => {
              game.board.ziniExplore.runAlgorithm();
            }, 500)
          "
          color="positive"
          v-close-popup
          label="Run"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import {
  analyseAlgorithm,
  analyseAlgorithmScope,
  analyseIterations,
  analyseHistoryRewrite,
  analyseDeepType,
  analyseDeepIterations,
  analyseVisualise,
  analyseAlgorithmScopeOptions,
  runZiniAlgorithmModal,
} from "src/composables/useSettings";

import Utils from "src/classes/Utils";

defineOptions({
  name: "RunZiniAlgorithmModal",
});

import { inject } from "vue";
const game = inject("game");
</script>
