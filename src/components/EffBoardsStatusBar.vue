<template>
  <div class="q-mx-md">
    Generating boards with target eff: {{ minimumEff }}% (change this in
    settings below the board)
    <span v-if="generateEffBoardsInBackground" class="text-info"
      ><span class="hidden-link" @click="effBoardsHiddenSettingsModal = true"
        >{{ effBoardsStoredDisplayCount }}/{{ effBoardsMaxStoredCount }}</span
      >
      (click: {{ effBoardsStoredFirstClickDisplay }})
      <q-icon name="sym_o_help" size="xs">
        <q-tooltip max-width="500px">
          When "Generate in background" is enabled, it will generate boards that
          meet the target efficiency whilst you play and store these for later.
          The "x/{{ effBoardsMaxStoredCount }}" indicates how many of these
          boards are currently stored and ready to play. Because these boards
          are generated in advance, the first click will not line up with where
          you clicked on the board. The "click: xxx" shows where the first click
          will be for the next stored board, the location of the first click can
          be changed with the settings below the board, but this will only
          affect future generated boards and not any boards that are already
          stored. Clicking on the "x/{{ effBoardsMaxStoredCount }}" will show
          additional settings where the storage limit can be raised.
        </q-tooltip>
      </q-icon>
    </span>
  </div>
</template>

<script setup>
import {
  generateEffBoardsInBackground,
  effBoardsHiddenSettingsModal,
  effBoardsStoredDisplayCount,
  effBoardsMaxStoredCount,
  effBoardsStoredFirstClickDisplay,
  minimumEff,
} from "src/composables/useSettings";

defineOptions({
  name: "EffBoardsStatusBar",
});
</script>
