<template>
  <q-dialog v-model="coordsModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Coord Settings</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-checkbox
          v-model="coordsUseLetters"
          label="Use letters for x-axis"
          @update:model-value="
            game.board.boardRenderer.drawBorders();
            game.board.boardRenderer.drawCoords();
          "
        /><br />
        <q-checkbox
          v-model="coordsUseInvertedY"
          label="Invert y-axis"
          @update:model-value="
            game.board.boardRenderer.drawBorders();
            game.board.boardRenderer.drawCoords();
          "
        /><br />
        <q-checkbox
          v-model="coordsUseZeroIndexing"
          label="Start from 0"
          @update:model-value="
            game.board.boardRenderer.drawBorders();
            game.board.boardRenderer.drawCoords();
          "
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn
          flat
          label="Close"
          @click="
            coordsModal = false;
            settingsModal = true;
          "
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import {
  settingsModal,
  coordsModal,
  coordsUseLetters,
  coordsUseInvertedY,
  coordsUseZeroIndexing,
} from "src/composables/useSettings";

defineOptions({
  name: "CoordsModal",
});

import { inject } from "vue";
const game = inject("game");
</script>
