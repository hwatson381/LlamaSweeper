<template>
  <div
    class="flex q-gutter-sm flex-centreable q-px-md"
    style="margin: 5px"
    v-if="variant !== 'board editor' && variant !== 'zini explorer'"
  >
    <q-radio
      dense
      v-model="boardSizePreset"
      val="beg"
      label="Beg"
      @update:model-value="game.resetAndUnfocus()"
    />
    <q-radio
      dense
      v-model="boardSizePreset"
      val="int"
      label="Int"
      @update:model-value="game.resetAndUnfocus()"
    />
    <q-radio
      dense
      v-model="boardSizePreset"
      val="exp"
      label="Exp"
      @update:model-value="game.resetAndUnfocus()"
    />
    <q-radio
      dense
      v-model="boardSizePreset"
      val="custom"
      label="Custom"
      @update:model-value="game.resetAndUnfocus()"
    />
    <q-badge
      rounded
      color="pink"
      label="No Guess"
      v-if="noGuessing && variant !== 'eff boards'"
    />
  </div>
  <template
    v-if="
      boardSizePreset === 'custom' &&
      variant !== 'board editor' &&
      variant !== 'zini explorer'
    "
  >
    <div
      class="flex flex-centreable q-px-md"
      style="gap: 10px; margin: 5px; align-items: center"
    >
      <q-input
        debounce="100"
        v-model.number="customWidth"
        label="Width"
        type="number"
        dense
        min="1"
        max="100"
        @update:model-value="game.reset()"
      />
      <q-input
        debounce="100"
        v-model.number="customHeight"
        label="Height"
        type="number"
        dense
        min="1"
        max="100"
        @update:model-value="game.reset()"
      />
      <q-input
        debounce="100"
        v-model.number="customMines"
        label="Mines"
        type="number"
        dense
        min="0"
        max="2500"
        @update:model-value="game.reset()"
      />
      <div>
        <q-badge outline color="info"
          >{{
            ((customMines / (customWidth * customHeight)) * 100).toFixed(2)
          }}%</q-badge
        >
      </div>
    </div>
    <p class="text-centreable q-px-md">{{ customWarning }}</p>
  </template>
</template>

<script setup>
import {
  boardSizePreset,
  customWidth,
  customHeight,
  customMines,
  customWarning,
  variant,
  noGuessing,
} from "src/composables/useSettings";

defineOptions({
  name: "BoardConfigBar",
});

import { inject } from "vue";
const game = inject("game");
</script>
