<template>
  <q-dialog v-model="effBoardsHiddenSettingsModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Board Storage Settings</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          Here you can change the max number of boards that get stored when the
          "generate in background" setting is enabled. You can also clear out
          the stored boards, which can be useful when changing first click
          location or for benchmarking (although better to use the benchmark
          link on the eff boards config panel).
        </p>
        <q-input
          debounce="100"
          v-model.number="effBoardsMaxStoredCount"
          label="Board Storage Limit"
          type="number"
          dense
          min="5"
          max="1000"
          style="width: 110px"
          @blur="
            effBoardsMaxStoredCount = Math.min(
              1000,
              Math.max(5, Math.floor(effBoardsMaxStoredCount))
            )
          "
        />
        <br />
        <q-btn
          @click="effShuffleManager.clearAllStoredBoards()"
          color="negative"
          label="Clear stored boards"
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import {
  effBoardsHiddenSettingsModal,
  effBoardsMaxStoredCount,
} from "src/composables/useSettings";

import effShuffleManager from "src/classes/EffShuffleManager";

defineOptions({
  name: "EffBoardsHiddenSettingsModal",
});
</script>
