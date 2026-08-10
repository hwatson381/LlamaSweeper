<template>
  <div class="flex q-mt-md q-mx-md">
    <q-select
      class="q-mx-md q-mb-md"
      outlined
      options-dense
      dense
      transition-duration="100"
      input-debounce="0"
      v-model="meanOpeningMineDensity"
      style="width: 200px; flex-shrink: 0"
      :options="[
        { label: '10%', value: 0.1 },
        { label: '20%', value: 0.2 },
        { label: '30%', value: 0.3 },
        { label: '40%', value: 0.4 },
        { label: '50%', value: 0.5 },
        { label: '60%', value: 0.6 },
        { label: '70%', value: 0.7 },
        { label: '80%', value: 0.8 },
        { label: '90%', value: 0.9 },
        { label: '100%', value: 1 },
      ]"
      emit-value
      map-options
      stack-label
      label="Opening target mine density"
      @update:model-value="game.reset()"
    ></q-select>
    <q-select
      class="q-mx-md q-mb-md"
      outlined
      options-dense
      dense
      transition-duration="100"
      input-debounce="0"
      v-model="meanOpeningFlagDensity"
      style="width: 175px; flex-shrink: 0"
      :options="[
        { label: '0%', value: 0 },
        { label: '10%', value: 0.1 },
        { label: '20%', value: 0.2 },
        { label: '30%', value: 0.3 },
        { label: '40%', value: 0.4 },
        { label: '50%', value: 0.5 },
        { label: '60%', value: 0.6 },
        { label: '70%', value: 0.7 },
        { label: '80%', value: 0.8 },
        { label: '100%', value: 1 },
      ]"
      emit-value
      map-options
      stack-label
      label="Flag density"
      @update:model-value="game.reset()"
    ></q-select>
    <q-select
      class="q-mx-md q-mb-md"
      outlined
      options-dense
      dense
      transition-duration="100"
      input-debounce="0"
      v-model="meanMineClickBehaviour"
      style="width: 175px; flex-shrink: 0"
      :options="[
        { label: 'Flag', value: 'flag' },
        { label: 'Blast', value: 'blast' },
        { label: 'Shield for 0.5s', value: 'shield' },
        { label: 'Ignore clicks', value: 'ignore' },
        { label: 'Ignore + chordable', value: 'chordable' },
      ]"
      emit-value
      map-options
      stack-label
      label="Mean mine click action"
      @update:model-value="game.reset()"
    ></q-select>
  </div>
</template>

<script setup>
import {
  meanOpeningMineDensity,
  meanOpeningFlagDensity,
  meanMineClickBehaviour,
} from "src/composables/useSettings";

defineOptions({
  name: "MeanOpeningsConfig",
});

import { inject } from "vue";
const game = inject("game");
</script>
