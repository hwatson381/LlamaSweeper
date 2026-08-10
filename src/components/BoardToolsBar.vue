<template>
  <div class="flex q-ma-md" style="gap: 10px">
    <q-btn
      @click="game.board.boardHint.toggleHint()"
      color="secondary"
      icon="percent"
      label="Hint (H)"
      :disabled="variant === 'board editor' && isCurrentlyEditModeDisplay"
    >
    </q-btn>
    <q-btn
      @click="game.board.quickPaint.toggleQuickPaint()"
      color="secondary"
      icon="brush"
      label="QuickPaint (Q)"
      :disabled="variant === 'board editor' && isCurrentlyEditModeDisplay"
    >
    </q-btn>
    <template v-if="showQuickPaintOptions">
      <q-btn
        v-if="!quickPaintMinimalMode"
        @click="game.board.quickPaint.cycleQuickPaintMode()"
        color="secondary"
      >
        {{ quickPaintModeDisplay }} (w)
      </q-btn>
      <q-btn
        @click="game.board.quickPaint.clearClearableMarkings()"
        color="secondary"
      >
        {{ quickPaintClearable }} (scrollclick)
      </q-btn>
      <q-btn @click="quickPaintHelpModal = true" color="secondary">Help</q-btn>
    </template>
  </div>
</template>
<script setup>
import {
  variant,
  showQuickPaintOptions,
  quickPaintModeDisplay,
  quickPaintClearable,
  quickPaintMinimalMode,
  quickPaintHelpModal,
  isCurrentlyEditModeDisplay,
} from "src/composables/useSettings";

defineOptions({
  name: "BoardToolsBar",
});

import { inject } from "vue";
const game = inject("game");
</script>
