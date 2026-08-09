<template>
  <q-card square style="float: left; margin-bottom: 10px" id="stats-block">
    <q-card-section style="font-family: monospace">
      <div
        style="
          font-family: 'Roboto', '-apple-system', 'Helvetica Neue', Helvetica,
            Arial, sans-serif;
        "
      >
        <q-badge
          rounded
          color="pink"
          label="NG"
          v-if="statsObject.attributes.noGuess"
        >
          <q-tooltip> No Guess</q-tooltip>
        </q-badge>
        <q-badge
          rounded
          color="amber"
          label="H"
          v-if="statsObject.attributes.hintsUsed"
          class="q-mr-xs"
        >
          <q-tooltip> Hints used </q-tooltip>
        </q-badge>
      </div>
      <div>Time: {{ statsObject.time }}s</div>
      <div v-if="!statsObject.isWonGame">
        Est. Time: {{ statsObject.estTime }}s
      </div>
      <div v-if="statsObject.isWonGame">3bv: {{ statsObject.total3bv }}</div>
      <div v-else>
        3bv: {{ statsObject.solved3bv }}/{{ statsObject.total3bv }}
      </div>
      <div>3bv/s: {{ statsObject.bbbvs }}</div>
      <div
        id="eff-stat"
        :class="{
          'zini-match':
            variant === 'eff boards' &&
            statsObject.isWonGame &&
            statsObject.clicks.total === statsObject.bestZini &&
            statsShowMaxEff &&
            statsObject.bestZini !== null,
          'sub-zini':
            variant === 'eff boards' &&
            statsObject.isWonGame &&
            statsObject.clicks.total < statsObject.bestZini &&
            statsShowMaxEff &&
            statsObject.bestZini !== null,
          'excellent-eff':
            variant === 'eff boards' && statsObject.isWonGame && excellentEff,
        }"
      >
        Eff: {{ statsObject.eff }}%
      </div>
      <div v-if="statsShowThrp && statsObject.thrp !== null">
        Thrp: {{ statsObject.thrp }}%
      </div>
      <div v-if="statsShowMaxEff">
        Max Eff:
        <template v-if="statsObject.maxEff !== null">
          <span
            :style="{
              'text-decoration':
                statsObject.deepMaxEff !== null &&
                parseInt(statsObject.deepMaxEff) > parseInt(statsObject.maxEff)
                  ? 'line-through'
                  : 'none',
            }"
            >{{ statsObject.maxEff }}%</span
          >
          <span
            v-if="
              statsObject.deepMaxEff !== null &&
              parseInt(statsObject.deepMaxEff) > parseInt(statsObject.maxEff)
            "
            class="text-info"
            >&nbsp;{{ statsObject.deepMaxEff }}%</span
          >
        </template>
        <span v-else>-</span>
      </div>
      <div>
        Clicks: {{ statsObject.clicks.effective }} +
        {{ statsObject.clicks.wasted }}
        <q-icon
          size="xs"
          name="bar_chart"
          @mouseenter="showStatsClicksTable = true"
          @mouseleave="showStatsClicksTable = false"
        >
          <q-menu
            anchor="top middle"
            self="bottom middle"
            :offset="[10, 10]"
            v-model="showStatsClicksTable"
          >
            <div class="row no-wrap q-pa-sm stats-click-table-container">
              <table style="text-align: right">
                <thead>
                  <tr>
                    <th></th>
                    <th>Active</th>
                    <th>Wasted</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Left</th>
                    <td>
                      {{ statsObject.clicks.left }}
                    </td>
                    <td>
                      {{ statsObject.clicks.leftWasted }}
                    </td>
                  </tr>
                  <tr>
                    <th>Right</th>
                    <td>
                      {{ statsObject.clicks.right }}
                    </td>
                    <td>
                      {{ statsObject.clicks.rightWasted }}
                    </td>
                  </tr>
                  <tr>
                    <th>Chord</th>
                    <td>
                      {{ statsObject.clicks.chord }}
                    </td>
                    <td>
                      {{ statsObject.clicks.chordWasted }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </q-menu>
        </q-icon>
      </div>
      <div>
        Ce/s@Cl/s: {{ statsObject.clicks.effectiveClicksPerSecond }}@{{
          statsObject.clicks.clicksPerSecond
        }}
      </div>
      <div v-if="statsShowCorr && statsObject.corr !== null">
        Corr: {{ statsObject.corr }}
      </div>
      <div v-if="statsShowStnb && statsObject.stnb !== null">
        STNB: {{ statsObject.stnb }}
      </div>
      <div v-if="statsShowRqp && statsObject.rqp !== null">
        RQP: {{ statsObject.rqp }}
      </div>
      <div v-if="statsShow8Way">
        ZiNi (8-way): {{ statsObject.eightZini ?? "-" }}
      </div>
      <div v-if="statsShowChain">
        ZiNi (100chain): {{ statsObject.chainZini ?? "-" }}
      </div>
      <div v-if="statsShowWomZini">
        L ZiNi (WoM):
        <template v-if="statsObject.womZini !== null">
          {{ statsObject.womZini }}
          <template v-if="statsShowWomZiniFix">
            | i: {{ statsObject.cWomZini }}</template
          >
        </template>
        <span v-else-if="statsObject.total3bv < 500">-</span>
        <span
          v-else
          class="text-info"
          style="text-decoration: underline; cursor: pointer"
          @click="game.board.stats.lateCalcForceZinis()"
          >run</span
        >
      </div>
      <div v-if="statsShowWomZini">
        H.ZiNi (WoM):
        <template v-if="statsObject.womHzini !== null">
          {{ statsObject.womHzini }}
        </template>
        <span v-else-if="statsObject.total3bv < 500">-</span>
        <span
          v-else
          class="text-info"
          style="text-decoration: underline; cursor: pointer"
          @click="game.board.stats.lateCalcForceZinis()"
          >run</span
        >
      </div>
      <div>
        ZiNi (DeepChain):
        <template v-if="statsObject.deepZini !== null">
          {{ statsObject.deepZini }}
        </template>
        <span
          v-else-if="!ziniRunnerActive"
          class="text-info"
          style="text-decoration: underline; cursor: pointer"
          @click="game.board.stats.lateCalcDeepChainZini()"
        >
          run
        </span>
        <span v-else> running </span>

        <div v-if="ziniRunnerActive" class="screenshot-hidden">
          Progress: {{ ziniRunnerPercentageProgress }}<br />
          Est. Duration: {{ ziniRunnerExpectedDuration }}<br />
          Est. Finish: {{ ziniRunnerExpectedFinishTime }}<br />
          <span
            @click="game.board.stats.killDeepChainZiniRunner()"
            class="text-info"
            style="text-decoration: underline; cursor: pointer"
          >
            cancel
          </span>
        </div>
      </div>
      <br class="screenshot-hidden" />
      <div class="row justify-center q-mb-md screenshot-hidden">
        <q-btn-dropdown color="primary" label="Open In">
          <q-list>
            <q-item
              v-if="variant !== 'board editor'"
              clickable
              v-close-popup
              @click="game.board.boardImportExport.sendToBoardEditor()"
            >
              <q-item-section>
                <q-item-label>Board Editor</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              v-if="variant !== 'zini explorer'"
              clickable
              v-close-popup
              @click="game.board.boardImportExport.sendToZiniExplorer()"
            >
              <q-item-section>
                <q-item-label>Zini Explorer</q-item-label>
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

            <q-item
              v-if="variant !== 'mean openings'"
              clickable
              v-close-popup
              @click="game.board.boardImportExport.sendToStrangeDust()"
            >
              <q-item-section>
                <q-item-label>StrangeDust Analyser</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
      <div class="row justify-center q-mb-md screenshot-hidden">
        <q-btn-dropdown color="primary" label="Export">
          <q-list>
            <q-item
              v-if="variant === 'board editor'"
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
              v-if="variant !== 'mean openings'"
              clickable
              v-close-popup
              @click="game.board.boardImportExport.downloadRawVf()"
            >
              <q-item-section>
                <q-item-label>RawVF Download</q-item-label>
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
        <q-btn-dropdown
          v-if="variant !== 'mean openings'"
          color="primary"
          label="Watch"
          split
          @click="game.board.initReplay('replay')"
        >
          <q-list>
            <q-item
              clickable
              v-close-popup
              @click="game.board.initReplay('compare')"
            >
              <q-item-section>
                <q-item-label>Click loss/gain</q-item-label>
              </q-item-section>
            </q-item>

            <q-separator />

            <q-item
              clickable
              v-close-popup
              @click="game.board.initReplay('8-way')"
            >
              <q-item-section>
                <q-item-label>8-way ZiNi</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="game.board.initReplay('womzini')"
            >
              <q-item-section>
                <q-item-label>WoM L ZiNi</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="game.board.initReplay('womzinifix')"
            >
              <q-item-section>
                <q-item-label>WoM L ZiNi Improved</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="game.board.initReplay('womhzini')"
            >
              <q-item-section>
                <q-item-label>WoM HZiNi</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="game.board.initReplay('chainzini')"
            >
              <q-item-section>
                <q-item-label>100Chain Zini</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="game.board.initOrPrepareDeepChainReplay()"
            >
              <q-item-section>
                <q-item-label>DeepChain Zini</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn
          v-else
          color="primary"
          label="Watch"
          @click="game.board.initReplay('replay')"
        ></q-btn>
      </div>
    </q-card-section>
  </q-card>
</template>

<style scoped>
#eff-stat.zini-match {
  color: #007b00;
}

#eff-stat.sub-zini {
  color: #986d00;
}

#eff-stat.excellent-eff {
  color: #770083;
}

body.body--dark #eff-stat.zini-match {
  color: lime;
}

body.body--dark #eff-stat.sub-zini {
  color: gold;
}

body.body--dark #eff-stat.excellent-eff {
  color: #cb00ff;
}

.stats-click-table-container {
  background-color: #e0e0e0;
}

body.body--dark .stats-click-table-container {
  background-color: #616161;
}
</style>

<script setup>
import {
  statsObject,
  showStatsClicksTable,
  statsShow8Way,
  statsShowChain,
  statsShowWomZini,
  statsShowWomZiniFix,
  statsShowMaxEff,
  statsShowStnb,
  statsShowThrp,
  statsShowRqp,
  statsShowCorr,
  variant,
  excellentEff,
  ziniRunnerActive,
  ziniRunnerExpectedDuration,
  ziniRunnerExpectedFinishTime,
  ziniRunnerPercentageProgress,
} from "src/composables/useSettings";

defineOptions({
  name: "StatsPanel",
});

import { inject } from "vue";
const game = inject("game");
</script>
