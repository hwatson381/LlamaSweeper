<template>
  <q-card flat bordered style="max-width: 550px">
    <q-card-section>
      <div class="flex q-mb-md" style="gap: 15px">
        <q-input
          debounce="100"
          v-model.number="editBoardUnappliedWidth"
          label="Width"
          type="number"
          dense
          min="1"
          max="100"
        />
        <q-input
          debounce="100"
          v-model.number="editBoardUnappliedHeight"
          label="Height"
          type="number"
          dense
          min="1"
          max="100"
        />
        <q-btn-group>
          <q-btn
            color="primary"
            label="Beg"
            @click="
              editBoardUnappliedWidth = 9;
              editBoardUnappliedHeight = 9;
            "
          />
          <q-btn
            color="primary"
            label="Int"
            @click="
              editBoardUnappliedWidth = 16;
              editBoardUnappliedHeight = 16;
            "
          />
          <q-btn
            color="primary"
            label="Exp"
            @click="
              () => {
                if (verticalExpert) {
                  editBoardUnappliedWidth = 16;
                  editBoardUnappliedHeight = 30;
                } else {
                  editBoardUnappliedWidth = 30;
                  editBoardUnappliedHeight = 16;
                }
              }
            "
          />
        </q-btn-group>
        <q-btn-dropdown
          @click="pttaImportModal = true"
          color="secondary"
          label="ptt import"
          split
        >
          <q-list>
            <q-item clickable v-close-popup @click="mbfImportModal = true">
              <q-item-section>
                <q-item-label>MBF Import</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
      <div class="flex" style="gap: 15px">
        <q-btn-dropdown
          @click="game.board.boardEdit.applyEditBoardWidthHeight()"
          color="positive"
          label="new board"
          split
        >
          <q-list>
            <q-item
              clickable
              v-close-popup
              @click="game.board.boardEdit.resizeEditBoard()"
            >
              <q-item-section>
                <q-item-label>Resize</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn-toggle
          v-if="variant === 'board editor'"
          v-model="isCurrentlyEditModeDisplay"
          push
          glossy
          toggle-color="primary"
          :options="[
            { label: 'Edit', value: true },
            { label: 'Play', value: false },
          ]"
          @update:model-value="
            (val) => {
              val
                ? game.board.switchToEditMode()
                : game.board.switchToPlayMode();
            }
          "
        />
        <q-btn-toggle
          v-if="variant === 'zini explorer'"
          v-model="isCurrentlyEditModeDisplay"
          push
          glossy
          toggle-color="primary"
          :options="[
            { label: 'Edit', value: true },
            { label: 'Analyse', value: false },
          ]"
          @update:model-value="
            (val) => {
              val
                ? game.board.switchToEditMode()
                : game.board.switchToAnalyseMode();
            }
          "
        />
        <q-btn-dropdown
          v-if="variant === 'zini explorer'"
          @click="
            game.board.switchToAnalyseMode(true);
            game.board.ziniExplore.runDomsZini(false);
          "
          color="primary"
          label="Run DOMS"
          split
        >
          <q-list>
            <q-item
              clickable
              v-close-popup
              @click="
                game.board.switchToAnalyseMode(true);
                game.board.ziniExplore.runDefaultAlgorithmOrPromptForInfo();
              "
            >
              <q-item-section>
                <q-item-label>Run DeepChain</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="game.board.boardImportExport.sendToOptimalZiNi()"
            >
              <q-item-section>
                <q-item-label>DOMS (mpk site)</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
      <template v-if="isCurrentlyEditModeDisplay">
        <q-separator class="q-my-md" />
        <div class="flex" style="gap: 15px">
          <q-btn-toggle
            v-model="editTool"
            push
            glossy
            toggle-color="primary"
            :options="[
              { label: 'Toggle', value: 'toggle', icon: 'sym_o_bomb' },
              { label: 'Rect', value: 'rect', icon: 'sym_o_select' },
              { label: 'Lasso', value: 'lasso', icon: 'sym_o_lasso_select' },
            ]"
          />
          <q-btn-group>
            <q-btn
              color="primary"
              icon="undo"
              :disable="!editCanUndo"
              @click="game.board.boardEdit.undo()"
            >
              <q-tooltip>Undo (Ctrl+Z)</q-tooltip>
            </q-btn>
            <q-btn
              color="primary"
              icon="redo"
              :disable="!editCanRedo"
              @click="game.board.boardEdit.redo()"
            >
              <q-tooltip>Redo (Ctrl+Y)</q-tooltip>
            </q-btn>
          </q-btn-group>
          <q-btn
            color="primary"
            icon="content_paste"
            :disable="!editHasClipboard"
            @click="game.board.boardEdit.pasteClipboard()"
          >
            <q-tooltip>Paste (Ctrl+V)</q-tooltip>
          </q-btn>
          <q-toggle
            v-if="editTool === 'toggle'"
            v-model="editDragPaint"
            label="Drag"
            dense
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
            @update:model-value="game.board.boardEdit.refreshSessionDisplay()"
          >
            <q-tooltip max-width="250px">
              Whether moving a selection should overwrite existing mines or
              merge with them
            </q-tooltip>
          </q-toggle>
        </div>
      </template>
    </q-card-section>
  </q-card>
</template>

<script setup>
import {
  variant,
  editBoardUnappliedWidth,
  editBoardUnappliedHeight,
  pttaImportModal,
  mbfImportModal,
  isCurrentlyEditModeDisplay,
  editTool,
  editCanUndo,
  editCanRedo,
  editHasClipboard,
  editDragPaint,
  editOverwrite,
  verticalExpert,
} from "src/composables/useSettings";

defineOptions({
  name: "EditorControls",
});

import { inject } from "vue";
const game = inject("game");
</script>
