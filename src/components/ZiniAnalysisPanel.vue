<template>
  <q-card
    square
    style="float: left; margin-bottom: 10px"
    id="zini-explorer-analyse-block"
  >
    <q-card-section>
      <q-markup-table class="q-mb-md" dense flat bordered>
        <thead>
          <tr>
            <th class="text-center">Left</th>
            <th class="text-center">Flag</th>
            <th class="text-center">Chord</th>
            <th class="text-center">Remain</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-right">
              {{ classicPathBreakdown.lefts }}
            </td>
            <td class="text-right">
              {{ classicPathBreakdown.rights }}
            </td>
            <td class="text-right">
              {{ classicPathBreakdown.chords }}
            </td>
            <td class="text-right">
              {{ classicPathBreakdown.remaining3bv }}
            </td>
          </tr>
        </tbody>
      </q-markup-table>

      <p class="text-center text-h6 q-mb-sm">
        {{ analyse3bv }} 3bv / {{ analyseZiniTotal }} zini
      </p>
      <p class="text-center text-h5 q-mb-sm">{{ analyseEff }}% eff</p>
      <div class="row justify-center screenshot-hidden">
        <q-btn
          @click="runZiniAlgorithmModal = true"
          color="positive"
          label="Run ZiNi Algorithm"
        />
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section>
      <q-select
        class="q-mx-md q-mb-md"
        outlined
        options-dense
        dense
        transition-duration="100"
        input-debounce="0"
        v-model="analyseDisplayMode"
        style="width: 175px; flex-shrink: 0"
        :options="[
          {
            label: 'Classic',
            value: 'classic',
          },
          { label: 'Chain', value: 'chain' },
        ]"
        emit-value
        map-options
        stack-label
        label="Input Mode"
        @update:model-value="game?.board?.ziniExplore?.updateUiAndBoard()"
      />
      <q-select
        class="q-mx-md q-mb-md"
        outlined
        options-dense
        dense
        transition-duration="100"
        input-debounce="0"
        v-model="analyseHiddenStyle"
        style="width: 175px; flex-shrink: 0"
        :options="[
          {
            label: 'None',
            value: 'none',
          },
          { label: 'Mines', value: 'mines' },
          { label: 'Transparent', value: 'transparent3' },
          { label: 'Very Transparent', value: 'transparent' },
          { label: 'Transparent + mines', value: 'transparent2' },
          /*{ label: 'Closed numbers', value: 'closed numbers' },*/
          { label: 'Dimmed', value: 'dimmed' },
        ]"
        emit-value
        map-options
        stack-label
        label="Show Hidden"
        @update:model-value="game?.board?.ziniExplore?.updateUiAndBoard()"
      />
      <q-select
        class="q-mx-md q-mb-md"
        outlined
        options-dense
        dense
        transition-duration="100"
        input-debounce="0"
        v-model="analyseShowPremiums"
        style="width: 175px; flex-shrink: 0"
        :options="[
          {
            label: 'None',
            value: 'none',
          },
          { label: 'Numbers', value: 'numbers' },
          { label: 'Numbers >= 0', value: 'numbers positive' },
          { label: 'Highlight Best', value: 'highlight' },
        ]"
        emit-value
        map-options
        stack-label
        label="Show Premiums"
        @update:model-value="game?.board?.ziniExplore?.updateUiAndBoard()"
      />
      <br class="screenshot-hidden" />
      <div class="row justify-center q-mb-md screenshot-hidden">
        <q-btn-dropdown color="primary" label="Open In">
          <q-list>
            <q-item
              clickable
              v-close-popup
              @click="game.board.boardImportExport.sendToBoardEditor()"
            >
              <q-item-section>
                <q-item-label>Board Editor</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="game.board.boardImportExport.sendToPttCalculator()"
            >
              <q-item-section>
                <q-item-label>PTT ZiNi Calculator</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="game.board.boardImportExport.sendToMsCoach()"
            >
              <q-item-section>
                <q-item-label>MSCoach Solver</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
      <div class="row justify-center q-mb-md screenshot-hidden">
        <q-btn-dropdown color="primary" label="Export">
          <q-list>
            <q-item
              clickable
              v-close-popup
              @click="game.board.boardImportExport.copyBoardLink()"
            >
              <q-item-section>
                <q-item-label>Copy Board Link</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="game.board.boardImportExport.sendToMbfDialogue()"
            >
              <q-item-section>
                <q-item-label>MBF Export</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="
                game.board.boardImportExport.showExportScreenshotDialogue()
              "
            >
              <q-item-section>
                <q-item-label>Copy Screenshot</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
      <div class="row justify-center screenshot-hidden">
        <q-btn
          @click="
            game.board.ziniExplore.isReplayPossible() &&
              game.board.initReplay('zini-explore-replay')
          "
          color="primary"
          label="Watch"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import {
  analyseDisplayMode,
  classicPathBreakdown,
  analyseZiniTotal,
  analyse3bv,
  analyseEff,
  analyseShowPremiums,
  analyseHiddenStyle,
  runZiniAlgorithmModal,
} from "src/composables/useSettings";

defineOptions({
  name: "ZiniAnalysisPanel",
});

import { inject } from "vue";
const game = inject("game");
</script>
