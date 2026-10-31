<template>
  <q-card
    flat
    bordered
    class="edit-toolbar"
    :class="$q.dark.isActive ? 'edit-toolbar--dark' : 'bg-grey-2'"
    style="max-width: 550px; touch-action: manipulation"
  >
    <q-card-section class="edit-toolbar-content">
      <div class="edit-toolbar-section" role="group" aria-label="Editing tools">
        <q-btn
          v-for="tool in availableTools"
          :key="tool.value"
          flat
          dense
          no-caps
          :text-color="toolTextColor(tool.value)"
          class="edit-toolbar-button edit-tool-button"
          :aria-pressed="editTool === tool.value"
          :aria-label="tool.ariaLabel"
          @click="editTool = tool.value"
          :icon="tool.icon"
        >
          <span class="edit-toolbar-label">{{ tool.label }}</span>
          <q-tooltip :delay="500">{{ tool.tooltip }}</q-tooltip>
        </q-btn>
      </div>
      <div class="edit-toolbar-section" role="group" aria-label="Edit history">
        <q-btn
          flat
          dense
          :text-color="buttonTextColor"
          class="edit-toolbar-button edit-toolbar-icon-button"
          icon="undo"
          aria-label="Undo"
          :disable="!editCanUndo"
          @click="game.board.boardEdit.undo()"
        >
          <q-tooltip :delay="500">Undo (Ctrl+Z)</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          :text-color="buttonTextColor"
          class="edit-toolbar-button edit-toolbar-icon-button"
          icon="redo"
          aria-label="Redo"
          :disable="!editCanRedo"
          @click="game.board.boardEdit.redo()"
        >
          <q-tooltip :delay="500">Redo (Ctrl+Y)</q-tooltip>
        </q-btn>
      </div>
      <div class="edit-toolbar-section" role="group" aria-label="Clipboard">
        <q-btn
          flat
          dense
          :text-color="buttonTextColor"
          class="edit-toolbar-button edit-toolbar-icon-button"
          icon="content_paste"
          aria-label="Paste"
          :disable="!editHasClipboard"
          @click="game.board.boardEdit.pasteClipboard()"
        >
          <q-tooltip :delay="500">Paste (Ctrl+V)</q-tooltip>
        </q-btn>
      </div>
      <div class="edit-toolbar-section" role="group" aria-label="Tool options">
        <q-toggle
          v-if="editTool === 'toggle' || editTool === 'start'"
          v-model="editDragPaint"
          label="Drag"
          dense
        >
          <q-tooltip :delay="500" max-width="250px">
            Allow mouse drag for editing mines or initial reveals
          </q-tooltip>
        </q-toggle>
        <q-toggle
          v-if="editTool === 'rect' || editTool === 'lasso'"
          v-model="editOverwrite"
          label="Overwrite"
          dense
          @update:model-value="game.board.boardEdit.refreshSessionDisplay()"
        >
          <q-tooltip :delay="500" max-width="250px">
            Whether selections should overwrite the existing board or merge with
            it
          </q-tooltip>
        </q-toggle>
      </div>
    </q-card-section>
  </q-card>
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
  variant,
} from "src/composables/useSettings";

defineOptions({
  name: "EditorToolbar",
});

const $q = useQuasar();
const game = inject("game");

const tools = [
  {
    value: "toggle",
    label: "Mine",
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
  {
    value: "start",
    label: "Reveal",
    icon: "sym_o_visibility",
    ariaLabel: "Toggle initial reveals",
    tooltip: "Toggle start revealed",
  },
];

//Start markings only exist on the board editor
const availableTools = computed(() =>
  tools.filter(
    (tool) => tool.value !== "start" || variant.value === "board editor"
  )
);

const buttonTextColor = computed(() =>
  $q.dark.isActive ? "grey-2" : "grey-9"
);

function toolTextColor(tool) {
  return editTool.value === tool ? "primary" : buttonTextColor.value;
}
</script>

<style scoped>
.edit-toolbar-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 5px 7px;
  touch-action: manipulation;
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

.edit-toolbar-button {
  min-height: 34px;
  border-radius: 5px;
  touch-action: manipulation;
}

.edit-toolbar-icon-button {
  min-width: 34px;
}

.edit-tool-button :deep(.q-btn__content) {
  gap: 6px;
}

@media (max-width: 600px) {
  .edit-toolbar-label {
    display: none;
  }
}
</style>
