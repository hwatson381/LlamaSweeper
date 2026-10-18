<template>
  <div ref="box" class="edit-selection-box q-pa-xs" :style="boxStyle">
    <template v-if="!editFillPanelOpen">
      <q-btn
        dense
        size="md"
        color="light-green-2"
        text-color="black"
        icon="rotate_left"
        @click="boardEdit.rotateLeft()"
      >
        <q-tooltip>Rotate left</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="light-green-2"
        text-color="black"
        icon="rotate_right"
        @click="boardEdit.rotateRight()"
      >
        <q-tooltip>Rotate right</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="light-blue-2"
        text-color="black"
        icon="control_point_duplicate"
        @click="boardEdit.duplicateSelection()"
      >
        <q-tooltip>Duplicate</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="light-blue-2"
        text-color="black"
        icon="content_copy"
        @click="boardEdit.copySelection()"
      >
        <q-tooltip>Copy (Ctrl+C)</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="light-blue-2"
        text-color="black"
        icon="content_cut"
        @click="boardEdit.cutSelection()"
      >
        <q-tooltip>Cut (Ctrl+X)</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="yellow-3"
        text-color="black"
        icon="crop"
        @click="boardEdit.cropToSelection()"
      >
        <q-tooltip>Crop board to selection</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="light-green-2"
        text-color="black"
        icon="flip"
        @click="boardEdit.flipHorizontal()"
      >
        <q-tooltip>Flip horizontally</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="light-green-2"
        text-color="black"
        @click="boardEdit.flipVertical()"
      >
        <q-icon name="flip" style="transform: rotate(90deg)" />
        <q-tooltip>Flip vertically</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="deep-orange-2"
        text-color="black"
        icon="format_color_fill"
        @click="boardEdit.setSelectionMines(true)"
      >
        <q-tooltip>Fill with mines</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="deep-orange-2"
        text-color="black"
        icon="delete"
        @click="boardEdit.setSelectionMines(false)"
      >
        <q-tooltip>Clear mines</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="deep-orange-2"
        text-color="black"
        icon="percent"
        @click="boardEdit.openFillPanel(editFillPercent)"
      >
        <q-tooltip>Fill percentage</q-tooltip>
      </q-btn>
      <q-btn
        dense
        size="md"
        color="grey-10"
        text-color="white"
        icon="close"
        @click="boardEdit.closeSelection()"
      >
        <q-tooltip>Deselect</q-tooltip>
      </q-btn>
    </template>
    <div v-else class="fill-panel">
      <div class="fill-slider-row">
        <q-slider
          v-model="editFillPercent"
          :min="0"
          :max="100"
          :step="1"
          color="green"
          :dark="false"
          class="q-px-sm"
          @update:model-value="(val) => boardEdit.fillSelectionPercentage(val)"
        />
        <span class="fill-percent-label">{{ editFillPercent }}%</span>
      </div>
      <div class="fill-buttons-row">
        <q-btn
          dense
          size="md"
          color="white"
          text-color="black"
          icon="arrow_back"
          @click="boardEdit.cancelFillPanel()"
        >
          <q-tooltip>Back (discard)</q-tooltip>
        </q-btn>
        <q-space />
        <q-btn
          dense
          size="md"
          color="white"
          text-color="black"
          icon="refresh"
          @click="boardEdit.fillSelectionPercentage(editFillPercent)"
        >
          <q-tooltip>Refresh mines</q-tooltip>
        </q-btn>
        <q-btn
          dense
          size="md"
          color="positive"
          text-color="white"
          icon="check"
          @click="boardEdit.confirmFillPanel()"
        >
          <q-tooltip>Keep</q-tooltip>
        </q-btn>
      </div>
    </div>
    <q-resize-observer debounce="0" @resize="(size) => (boxSize = size)" />
  </div>
</template>

<style scoped>
.edit-selection-box {
  position: absolute;
  display: grid;
  grid-template-columns: repeat(6, max-content);
  gap: 4px;
  width: max-content;
  background-color: rgba(211, 211, 211, 0.8);
  border-radius: 8px;
  box-shadow: 3px 4px 10px #000000cc;
  user-select: none;
  z-index: 1;
}

body.body--dark .edit-selection-box {
  box-shadow: 3px 4px 10px black;
}

.fill-panel {
  grid-column: 1 / -1;
  width: 174px;
}

.fill-slider-row {
  display: flex;
  align-items: center;
}

.fill-slider-row .q-slider {
  flex: 1;
}

.fill-percent-label {
  min-width: 36px;
  text-align: right;
  color: black;
}

.fill-buttons-row {
  display: flex;
  gap: 4px;
}
</style>

<script setup>
import { computed, inject, onMounted, ref, useTemplateRef } from "vue";

import {
  editSelectionBox,
  editFillPanelOpen,
  editFillPercent,
  effectiveTileSize,
  boardHorizontalPadding,
  boardTopPadding,
} from "src/composables/useSettings";

defineOptions({
  name: "EditSelectionBox",
});

const game = inject("game");
const boardEdit = computed(() => game.board.boardEdit);

const box = useTemplateRef("box");
const boxSize = ref({ width: 0, height: 0 });
//Measured synchronously so the first render is already clamped; the resize observer is too late to avoid a horizontal scrollbar
onMounted(() => {
  boxSize.value = {
    width: box.value.offsetWidth,
    height: box.value.offsetHeight,
  };
});

const GAP = 6;
const VIEWPORT_MARGIN = 4;

//Positioned relative to the canvas wrapper, below the selection, or above if there is no room below
const boxStyle = computed(() => {
  const selection = editSelectionBox.value;
  const wrapper = box.value?.parentElement;
  if (!selection || !wrapper) {
    return {};
  }

  const tileSize = effectiveTileSize.value;
  const selectionLeft =
    boardHorizontalPadding.value + selection.minX * tileSize;
  const selectionTop = boardTopPadding.value + selection.minY * tileSize;
  const selectionBottom =
    boardTopPadding.value + (selection.maxY + 1) * tileSize;

  const { width, height } = boxSize.value;

  const below = selectionBottom + GAP;
  const above = selectionTop - GAP - height;
  const fitsBelow = below + height <= wrapper.clientHeight;
  const top = fitsBelow || above < 0 ? below : above;

  const wrapperLeftInViewport = wrapper.getBoundingClientRect().left;
  const viewportWidth = document.documentElement.clientWidth;
  const minLeft = VIEWPORT_MARGIN - wrapperLeftInViewport;
  const maxLeft =
    viewportWidth - VIEWPORT_MARGIN - wrapperLeftInViewport - width;
  const left = Math.max(minLeft, Math.min(selectionLeft, maxLeft));

  return { left: left + "px", top: top + "px" };
});
</script>
