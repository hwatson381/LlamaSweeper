<template>
  <div
    ref="box"
    class="edit-selection-box q-pa-xs"
    :style="[
      boxStyle,
      { gridTemplateColumns: `repeat(${columns}, max-content)` },
    ]"
  >
    <template v-if="!editFillPanelOpen">
      <q-btn
        v-for="button in buttons"
        :key="button.key"
        dense
        size="md"
        :color="button.color"
        :text-color="button.textColor ?? 'black'"
        @click="button.action()"
      >
        <q-icon :name="button.icon" :style="button.iconStyle" />
        <q-tooltip :delay="500">{{ button.tooltip }}</q-tooltip>
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
          <q-tooltip :delay="500">Back (discard)</q-tooltip>
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
          <q-tooltip :delay="500">Refresh mines</q-tooltip>
        </q-btn>
        <q-btn
          dense
          size="md"
          color="positive"
          text-color="white"
          icon="check"
          @click="boardEdit.confirmFillPanel()"
        >
          <q-tooltip :delay="500">Keep</q-tooltip>
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
  variant,
  effectiveTileSize,
  boardHorizontalPadding,
  boardTopPadding,
} from "src/composables/useSettings";

defineOptions({
  name: "EditSelectionBox",
});

const game = inject("game");
const boardEdit = computed(() => game.board.boardEdit);

const GREEN = "light-green-2";
const BLUE = "light-blue-2";
const ORANGE = "deep-orange-2";
const YELLOW = "yellow-3";

const allButtons = computed(() => ({
  rotateLeft: {
    color: GREEN,
    icon: "rotate_left",
    tooltip: "Rotate left",
    action: () => boardEdit.value.rotateLeft(),
  },
  rotateRight: {
    color: GREEN,
    icon: "rotate_right",
    tooltip: "Rotate right",
    action: () => boardEdit.value.rotateRight(),
  },
  flipHorizontal: {
    color: GREEN,
    icon: "flip",
    tooltip: "Flip horizontally",
    action: () => boardEdit.value.flipHorizontal(),
  },
  flipVertical: {
    color: GREEN,
    icon: "flip",
    iconStyle: "transform: rotate(90deg)",
    tooltip: "Flip vertically",
    action: () => boardEdit.value.flipVertical(),
  },
  duplicate: {
    color: BLUE,
    icon: "control_point_duplicate",
    tooltip: "Duplicate",
    action: () => boardEdit.value.duplicateSelection(),
  },
  copy: {
    color: BLUE,
    icon: "content_copy",
    tooltip: "Copy (Ctrl+C)",
    action: () => boardEdit.value.copySelection(),
  },
  cut: {
    color: BLUE,
    icon: "content_cut",
    tooltip: "Cut (Ctrl+X)",
    action: () => boardEdit.value.cutSelection(),
  },
  fillMines: {
    color: ORANGE,
    icon: "format_color_fill",
    tooltip: "Fill with mines",
    action: () => boardEdit.value.setSelectionMines(true),
  },
  clearMines: {
    color: ORANGE,
    icon: "delete",
    tooltip: "Clear mines",
    action: () => boardEdit.value.setSelectionMines(false),
  },
  fillPercent: {
    color: ORANGE,
    icon: "percent",
    tooltip: "Fill percentage",
    action: () => boardEdit.value.openFillPanel(editFillPercent.value),
  },
  markStart: {
    color: YELLOW,
    icon: "sym_o_visibility",
    tooltip: "Fill start revealed",
    action: () => boardEdit.value.setSelectionStart(true),
  },
  clearStart: {
    color: YELLOW,
    icon: "sym_o_visibility_off",
    tooltip: "Clear start revealed",
    action: () => boardEdit.value.setSelectionStart(false),
  },
  crop: {
    color: "purple-2",
    icon: "crop",
    tooltip: "Crop board to selection",
    action: () => boardEdit.value.cropToSelection(),
  },
  deselect: {
    color: "grey-10",
    textColor: "white",
    icon: "close",
    tooltip: "Deselect",
    action: () => boardEdit.value.closeSelection(),
  },
}));

//Board editor has start markings, so gets 7 columns with the transforms on one row. Zini explorer keeps 6.
const buttonOrder = computed(() =>
  variant.value === "board editor"
    ? [
        "rotateLeft",
        "rotateRight",
        "flipHorizontal",
        "flipVertical",
        "duplicate",
        "copy",
        "cut",
        "fillMines",
        "clearMines",
        "fillPercent",
        "markStart",
        "clearStart",
        "crop",
        "deselect",
      ]
    : [
        "rotateLeft",
        "rotateRight",
        "duplicate",
        "copy",
        "cut",
        "crop",
        "flipHorizontal",
        "flipVertical",
        "fillMines",
        "clearMines",
        "fillPercent",
        "deselect",
      ]
);

const buttons = computed(() =>
  buttonOrder.value.map((key) => ({ key, ...allButtons.value[key] }))
);
const columns = computed(() => (variant.value === "board editor" ? 7 : 6));

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
