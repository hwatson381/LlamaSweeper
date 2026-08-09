<template>
  <q-card flat bordered style="max-width: 550px">
    <q-card-section>
      <div class="text-h6 q-mb-sm">Eff boards config</div>
      <div v-if="boardSizePreset === 'beg'" class="flex">
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="begEffPreset"
          style="width: 130px"
          :options="begEffOptions"
          stack-label
          label="Target beg eff"
        ></q-select>
        <q-input
          v-if="begEffPreset === 'custom'"
          debounce="100"
          v-model.number="begEffCustom"
          label="Custom eff"
          type="number"
          dense
          min="100"
          max="340"
          style="width: 110px"
        />
      </div>
      <div v-if="boardSizePreset === 'int'" class="flex">
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="intEffPreset"
          style="width: 130px"
          :options="intEffOptions"
          stack-label
          label="Target int eff"
        ></q-select>
        <q-input
          v-if="intEffPreset === 'custom'"
          debounce="100"
          v-model.number="intEffCustom"
          label="Custom eff"
          type="number"
          dense
          min="100"
          max="340"
          style="width: 110px"
        />
      </div>
      <div v-if="boardSizePreset === 'exp'" class="flex">
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="expEffPreset"
          style="width: 130px"
          :options="expEffOptions"
          stack-label
          label="Target exp eff"
        ></q-select>
        <q-input
          v-if="expEffPreset === 'custom'"
          debounce="100"
          v-model.number="expEffCustom"
          label="Custom eff"
          type="number"
          dense
          min="100"
          max="340"
          style="width: 110px"
        />
      </div>
      <div v-if="boardSizePreset === 'custom'">
        <q-input
          debounce="100"
          v-model.number="customEffCustom"
          label="Minimum Custom eff"
          type="number"
          dense
          min="100"
          max="340"
          style="width: 110px"
        />
      </div>
      <div
        v-if="browserSupportsWebWorkers"
        class="flex q-mb-sm"
        style="align-items: center"
      >
        <q-checkbox
          class="q-mr-md"
          style="flex-shrink: 0"
          v-model="generateEffBoardsInBackground"
          label="Generate in background"
        />
        <div
          v-if="
            effBoardShowSlowGenerationWarning && !generateEffBoardsInBackground
          "
          class="text-info"
          style="flex: 1 1 200px"
        >
          <b>IMPORTANT:</b> Recommended for high target efficiency
        </div>
      </div>
      <div v-if="browserSupportsConcurrency" class="flex q-mb-sm">
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="200"
          v-model="effWebWorkerCount"
          style="width: 210px; flex-shrink: 0"
          :options="effWebWorkerCountOptions"
          stack-label
          label="Number of background workers"
          @update:model-value="effShuffleManager.reinitWorkers()"
        ></q-select>
        <div
          v-if="
            effBoardShowSlowGenerationWarning &&
            generateEffBoardsInBackground &&
            effWebWorkerCount !== effWebWorkerCountOptions.at(-1)
          "
          class="text-info"
          style="flex: 1 1 215px"
        >
          Consider increasing this if background generation is too slow
        </div>
      </div>
      <div class="flex q-mb-sm">
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="effFirstClickType"
          @update:model-value="effShuffleManager.sendUpdateFirstClickIfNeeded()"
          style="width: 150px; flex-shrink: 0"
          :options="[
            {
              label: 'Mouse',
              value: 'same',
            },
            { label: 'Random zero tile', value: 'random' },
            { label: 'Top left corner', value: 'corner' },
            { label: 'Middle', value: 'middle' },
          ]"
          emit-value
          map-options
          stack-label
          label="First click location"
        ></q-select>
        <div
          v-if="generateEffBoardsInBackground"
          class="text-info"
          style="flex: 1 1 215px"
        >
          Boards generated in the background will use the value of this setting
          at time of generation and will ignore the "Mouse" option
        </div>
      </div>
      <div class="flex q-mb-sm" v-if="generateEffBoardsInBackground">
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="effBoardsImplementation"
          @update:model-value="
            effShuffleManager.sendUpdateImplementationIfNeeded()
          "
          style="width: 175px; flex-shrink: 0"
          :options="[
            { label: 'Wasm (fastest)', value: 'wasm' },
            {
              label: 'Javascript (slow)',
              value: 'js',
            },
            { label: 'Wasm small', value: 'wasm_small' },
            { label: 'Wasm large', value: 'wasm_large' },
          ]"
          emit-value
          map-options
          stack-label
          label="8-way implementation"
        ></q-select>
        <div class="text-info" style="flex: 1 1 215px">
          <div
            v-if="!wasmAvailable && effBoardsImplementation !== 'js'"
            class="text-negative"
          >
            Wasm unsupported falling back to Javascript.
          </div>
          Implementation of 8-way ZiNi used for generating eff boards in the
          background. It's recommended to leave this on the default option.
          <span @click="effBoardsBenchmarkModal = true" class="fake-link"
            >Run benchmarks</span
          >
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import effShuffleManager from "src/classes/EffShuffleManager";

import {
  wasmAvailable,
  boardSizePreset,
  begEffPreset,
  begEffOptions,
  begEffCustom,
  intEffPreset,
  intEffOptions,
  intEffCustom,
  expEffPreset,
  expEffOptions,
  expEffCustom,
  customEffCustom,
  generateEffBoardsInBackground,
  effWebWorkerCount,
  browserSupportsWebWorkers,
  browserSupportsConcurrency,
  effBoardsImplementation,
  effBoardsBenchmarkModal,
  effFirstClickType,
  effBoardShowSlowGenerationWarning,
  effWebWorkerCountOptions,
} from "src/composables/useSettings";

defineOptions({
  name: "EffBoardsConfig",
});
</script>
