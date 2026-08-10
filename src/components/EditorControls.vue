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
        <q-btn
          @click="game.board.applyEditBoardWidthHeight()"
          color="positive"
          label="new board"
        />
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
        <q-btn
          v-if="variant === 'zini explorer'"
          @click="
            game.board.switchToAnalyseMode(true);
            game.board.ziniExplore.runDefaultAlgorithmOrPromptForInfo();
          "
          color="primary"
          label="DeepChain ZiNi"
        />
      </div>
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
  verticalExpert,
} from "src/composables/useSettings";

defineOptions({
  name: "EditorControls",
});

import { inject } from "vue";
const game = inject("game");
</script>
