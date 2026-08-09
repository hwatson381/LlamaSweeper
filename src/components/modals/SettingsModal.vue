<template>
  <q-dialog v-model="settingsModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Settings</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        Tile size
        <q-slider
          v-model="tileSizeSlider"
          :min="10"
          :max="80"
          :step="1"
          label
          color="light-green"
          @update:model-value="game.refreshSize()"
        />
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="gamePositioning"
          style="width: 200px; flex-shrink: 0"
          :options="[
            {
              label: 'Centre',
              value: 'centre',
            },
            {
              label: 'Left with padding',
              value: 'left',
            },
          ]"
          emit-value
          map-options
          stack-label
          label="Board Positioning"
        />
        <template v-if="gamePositioning === 'left'">
          Left padding
          <q-slider
            v-model="gameLeftPadding"
            :min="-16"
            :max="1000"
            :step="1"
            label
            color="light-green"
          />
        </template>
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="gameVerticalPadding"
          style="width: 200px; flex-shrink: 0"
          :options="[
            {
              label: '16px (default)',
              value: '16px',
            },
            {
              label: '32px',
              value: '32px',
            },
            {
              label: '48px',
              value: '48px',
            },
            {
              label: 'Custom',
              value: 'custom',
            },
          ]"
          emit-value
          map-options
          stack-label
          label="Board Vertical Padding"
        />
        <template v-if="gameVerticalPadding === 'custom'">
          <q-input
            debounce="100"
            v-model.number="gameTopPadding"
            label="Board Top Padding"
            type="number"
            dense
            min="4"
            max="2000"
            style="width: 110px"
          />
          <q-input
            debounce="100"
            v-model.number="gameBottomPadding"
            label="Board Bottom Padding"
            type="number"
            dense
            min="4"
            max="2000"
            style="width: 110px"
          />
        </template>
        <q-checkbox
          v-model="centreInterface"
          label="Centre interface (other than board)"
        /><br />
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="boardSkin"
          style="width: 200px; flex-shrink: 0"
          :options="[
            {
              label: 'Light',
              value: 'light',
            },
            {
              label: 'Dark',
              value: 'dark',
            },
          ]"
          emit-value
          map-options
          stack-label
          label="Board Skin"
          @update:model-value="game.refreshSize()"
        />
        <q-checkbox
          v-model="showBorders"
          label="Show borders"
          @update:model-value="game.refreshSize()"
        /><br />
        <q-checkbox
          v-model="showTimer"
          label="Show timer"
          @update:model-value="game.board.boardRenderer.drawTopBar()"
        /><br />
        <q-checkbox
          v-model="showMineCount"
          label="Show mine count"
          @update:model-value="game.board.boardRenderer.drawTopBar()"
        />
        <div class="flex q-mb-sm" style="align-items: center">
          <q-checkbox
            v-model="showCoords"
            label="Show coordinates"
            @update:model-value="
              game.board.boardRenderer.drawBorders();
              game.board.boardRenderer.drawCoords();
            "
            class="q-pr-md"
            style="flex-shrink: 0"
          />
          <q-btn
            v-if="showCoords"
            dense
            flat
            color="info"
            @click="
              coordsModal = true;
              settingsModal = false;
            "
            label="options"
            icon="settings"
          >
          </q-btn>
        </div>
        <div class="flex q-mb-sm" style="align-items: center">
          <q-checkbox
            v-model="enableFilters"
            label="Enable Visual Filters"
            class="q-pr-md"
            style="flex-shrink: 0"
          />
          <q-btn
            v-if="enableFilters"
            dense
            flat
            color="info"
            @click="
              filtersModal = true;
              settingsModal = false;
            "
            label="options"
            icon="settings"
          >
          </q-btn>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import {
  settingsModal,
  filtersModal,
  tileSizeSlider,
  gamePositioning,
  gameLeftPadding,
  gameVerticalPadding,
  gameTopPadding,
  gameBottomPadding,
  centreInterface,
  showBorders,
  showTimer,
  showMineCount,
  showCoords,
  boardSkin,
  coordsModal,
  enableFilters,
} from "src/composables/useSettings";

defineOptions({
  name: "SettingsModal",
});

import { inject } from "vue";
const game = inject("game");
</script>
