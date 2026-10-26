<template>
  <div class="toolbar-comparison-item">
    <div class="text-caption toolbar-title">{{ props.label }}</div>
    <q-card
      :flat="!isReplayAppearance"
      :bordered="props.appearance !== 'minimal'"
      class="edit-toolbar"
      :class="[
        `edit-toolbar--${props.appearance}`,
        { 'edit-toolbar--dark': $q.dark.isActive },
        { 'bg-grey-2': props.appearance === 'quasar' && !$q.dark.isActive },
      ]"
    >
      <q-card-section class="edit-toolbar-content">
        <div
          class="edit-toolbar-section edit-toolbar-tools"
          role="group"
          aria-label="Editing tools"
        >
          <q-btn
            v-for="tool in tools"
            :key="tool.value"
            :flat="!isReplayAppearance"
            dense
            no-caps
            :color="
              isReplayAppearance && editTool !== tool.value
                ? 'white'
                : undefined
            "
            :text-color="toolTextColor(tool.value)"
            class="edit-toolbar-button edit-tool-button"
            :class="{
              'edit-tool-button--active':
                editTool === tool.value && props.appearance === 'reference',
              'edit-tool-button--replay-active':
                editTool === tool.value && isReplayAppearance,
            }"
            :aria-pressed="editTool === tool.value"
            :aria-label="tool.ariaLabel"
            @click="editTool = tool.value"
          >
            <q-icon :name="tool.icon" />
            <span class="edit-toolbar-label">{{ tool.label }}</span>
            <q-tooltip>{{ tool.tooltip }}</q-tooltip>
          </q-btn>
        </div>
        <div
          class="edit-toolbar-section"
          role="group"
          aria-label="Edit history"
        >
          <q-btn
            :flat="!isReplayAppearance"
            dense
            :color="isReplayAppearance ? 'white' : undefined"
            :text-color="buttonTextColor"
            class="edit-toolbar-button edit-toolbar-icon-button"
            icon="undo"
            aria-label="Undo"
            :disable="!editCanUndo"
            @click="game.board.boardEdit.undo()"
          >
            <q-tooltip>Undo (Ctrl+Z)</q-tooltip>
          </q-btn>
          <q-btn
            :flat="!isReplayAppearance"
            dense
            :color="isReplayAppearance ? 'white' : undefined"
            :text-color="buttonTextColor"
            class="edit-toolbar-button edit-toolbar-icon-button"
            icon="redo"
            aria-label="Redo"
            :disable="!editCanRedo"
            @click="game.board.boardEdit.redo()"
          >
            <q-tooltip>Redo (Ctrl+Y)</q-tooltip>
          </q-btn>
        </div>
        <div class="edit-toolbar-section" role="group" aria-label="Clipboard">
          <q-btn
            :flat="!isReplayAppearance"
            dense
            :color="isReplayAppearance ? 'white' : undefined"
            :text-color="buttonTextColor"
            class="edit-toolbar-button edit-toolbar-icon-button"
            icon="content_paste"
            aria-label="Paste"
            :disable="!editHasClipboard"
            @click="game.board.boardEdit.pasteClipboard()"
          >
            <q-tooltip>Paste (Ctrl+V)</q-tooltip>
          </q-btn>
        </div>
        <div
          class="edit-toolbar-section edit-toolbar-options"
          role="group"
          aria-label="Tool options"
        >
          <q-toggle
            v-if="editTool === 'toggle'"
            v-model="editDragPaint"
            label="Drag"
            dense
            class="edit-toolbar-toggle"
            :class="{ 'edit-toolbar-toggle--replay': isReplayAppearance }"
            :dark="isReplayAppearance ? false : $q.dark.isActive"
          >
            <q-tooltip max-width="250px">
              Allow mouse drag for editing mines
            </q-tooltip>
          </q-toggle>
          <q-toggle
            v-if="editTool === 'rect' || editTool === 'lasso'"
            v-model="editOverwrite"
            label="Overwrite"
            dense
            class="edit-toolbar-toggle"
            :class="{ 'edit-toolbar-toggle--replay': isReplayAppearance }"
            :dark="isReplayAppearance ? false : $q.dark.isActive"
            @update:model-value="game.board.boardEdit.refreshSessionDisplay()"
          >
            <q-tooltip max-width="250px">
              Whether moving a selection should overwrite existing mines or
              merge with them
            </q-tooltip>
          </q-toggle>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { computed, inject } from "vue";
import { useQuasar } from "quasar";
import {
  editTool,
  editCanUndo,
  editCanRedo,
  editHasClipboard,
  editDragPaint,
  editOverwrite,
} from "src/composables/useSettings";

defineOptions({
  name: "EditorToolbar",
});

const props = defineProps({
  appearance: {
    type: String,
    required: true,
    validator: (value) =>
      ["reference", "quasar", "replay", "minimal"].includes(value),
  },
  label: {
    type: String,
    required: true,
  },
});

const $q = useQuasar();
const game = inject("game");
const isReplayAppearance = computed(() => props.appearance === "replay");

const tools = [
  {
    value: "toggle",
    label: "Toggle",
    icon: "svguse:/icons/mine_icon.svg#fragment",
    ariaLabel: "Toggle mines",
    tooltip: "Toggle mines",
  },
  {
    value: "rect",
    label: "Rect",
    icon: "sym_o_select",
    ariaLabel: "Rectangle selection tool",
    tooltip: "Rectangle selection",
  },
  {
    value: "lasso",
    label: "Lasso",
    icon: "sym_o_lasso_select",
    ariaLabel: "Lasso selection tool",
    tooltip: "Lasso selection",
  },
];

const buttonTextColor = computed(() => {
  if (isReplayAppearance.value) {
    return "black";
  }
  if ($q.dark.isActive) {
    return "grey-2";
  }
  return props.appearance === "quasar" ? "grey-9" : "grey-8";
});

function toolTextColor(tool) {
  if (isReplayAppearance.value && editTool.value === tool) {
    return "white";
  }
  if (editTool.value === tool) {
    return "primary";
  }
  return buttonTextColor.value;
}
</script>

<style scoped>
.toolbar-comparison-item {
  width: min(100%, 550px);
  margin-bottom: 12px;
}

.toolbar-title {
  margin: 0 0 3px 4px;
}

.edit-toolbar {
  overflow: visible;
  border-radius: 7px;
}

.edit-toolbar-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 5px 7px;
}

.edit-toolbar-section {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
  min-height: 36px;
}

.edit-toolbar-section + .edit-toolbar-section {
  padding-left: 7px;
  border-left: 1px solid rgba(0, 0, 0, 0.2);
}

.edit-toolbar--dark .edit-toolbar-section + .edit-toolbar-section {
  border-left-color: rgba(255, 255, 255, 0.24);
}

.edit-toolbar {
  --edit-toolbar-button-size: 34px;
}

.edit-toolbar-button {
  min-height: var(--edit-toolbar-button-size);
  border-radius: 5px;
}

.edit-toolbar-icon-button {
  min-width: var(--edit-toolbar-button-size);
}

.edit-tool-button :deep(.q-btn__content) {
  gap: 6px;
}

.edit-tool-button--active {
  color: var(--q-primary) !important;
  background-color: rgba(25, 118, 210, 0.12);
  box-shadow: inset 0 0 0 1px var(--q-primary);
}

.edit-toolbar--reference {
  border-color: rgba(0, 0, 0, 0.16);
  background-color: rgba(0, 0, 0, 0.035);
}

.edit-toolbar--reference.edit-toolbar--dark {
  border-color: rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.055);
}

.edit-toolbar--reference.edit-toolbar--dark .edit-tool-button--active {
  background-color: rgba(100, 181, 246, 0.16);
}

.edit-toolbar--quasar {
  border-radius: 4px;
}

.edit-toolbar--replay {
  border: 0;
  border-radius: 10px;
  background-color: lightgray;
  box-shadow: 3px 5px 12px #00000080;
}

.edit-toolbar--replay {
  --edit-toolbar-button-size: 40px;
}

.edit-toolbar--replay .edit-toolbar-content {
  gap: 0;
  padding: 10px 12px;
}

.edit-toolbar--replay .edit-toolbar-section {
  gap: 8px;
  min-height: var(--edit-toolbar-button-size);
}

.edit-toolbar--replay .edit-toolbar-section + .edit-toolbar-section {
  margin-left: 12px;
  padding-left: 12px;
}

.edit-toolbar--replay .edit-toolbar-button {
  border-radius: 6px;
}

.edit-toolbar--replay .edit-tool-button--replay-active {
  color: white !important;
  background-color: var(--q-primary);
  box-shadow: none;
}

.edit-toolbar--replay .edit-toolbar-toggle--replay :deep(.q-toggle__label) {
  color: #212121 !important;
}

.edit-toolbar--replay .edit-toolbar-section + .edit-toolbar-section {
  border-left-color: rgba(0, 0, 0, 0.28);
}

.edit-toolbar--minimal {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.edit-toolbar--minimal .edit-toolbar-content {
  padding-left: 0;
  padding-right: 0;
}

.edit-toolbar--minimal .edit-toolbar-section + .edit-toolbar-section {
  border-left-color: rgba(127, 127, 127, 0.5);
}

@media (max-width: 540px) {
  .edit-toolbar-label {
    display: none;
  }
}
</style>
