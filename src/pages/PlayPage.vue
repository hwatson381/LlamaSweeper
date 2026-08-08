<template>
  <q-page>
    <div :class="['q-py-md', centreInterface ? 'centre-interface' : '']">
      <p class="text-h4 text-centreable q-px-md">
        Llama's minesweeper variants
      </p>
      <p
        class="margin-centreable text-centreable q-px-md"
        style="max-width: 700px"
      >
        This page has a collection of minesweeper variants/tools. Variants can
        be changed with the "variant" dropdown below. The "variants info" button
        provides a brief description of how each variant works.
      </p>
      <div
        v-if="devMode"
        style="
          border: 1px solid white;
          margin: 5px;
          border-radius: 5px;
          padding: 5px;
          max-width: 600px;
        "
        class="margin-centreable"
      >
        <span>Random dev stuff box</span><br />
        <button @click="bulkrun8">Bulk run</button>
        Iterations: <input v-model.number="bulkIterations" type="text" />
        <button @click="playSound('dig')">Play sound</button>
      </div>
      <br />
      <div
        class="flex q-mb-md flex-centreable q-mx-md"
        style="gap: 15px; justify-content: start; padding: 5px"
      >
        <q-select
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="variant"
          style="width: 175px"
          :options="[
            { label: 'Normal', value: 'normal' },
            { label: 'Eff Boards', value: 'eff boards' },
            { label: 'Board Editor', value: 'board editor' },
            { label: 'ZiNi Explorer', value: 'zini explorer' },
            { label: 'Mean Openings', value: 'mean openings' },
          ]"
          emit-value
          map-options
          stack-label
          label="Variant"
          @update:model-value="game.reset(true)"
        ></q-select>
        <div>
          <q-btn
            @click="variantsHelpModal = true"
            color="secondary"
            label="Variants info"
          />
        </div>
        <div>
          <q-btn
            @click="settingsModal = true"
            color="secondary"
            label="display settings (scale etc.)"
          />
        </div>
      </div>
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

      <div class="q-mx-md">
        <q-card
          flat
          bordered
          style="max-width: 550px"
          class="margin-centreable"
          v-if="variant === 'board editor' || variant === 'zini explorer'"
        >
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
                  <q-item
                    clickable
                    v-close-popup
                    @click="mbfImportModal = true"
                  >
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
      </div>
      <div class="text-centreable q-mx-md" v-if="variant === 'eff boards'">
        Generating boards with target eff: {{ minimumEff }}% (change this in
        settings below the board)
        <span v-if="generateEffBoardsInBackground" class="text-info"
          ><span
            class="hidden-link"
            @click="effBoardsHiddenSettingsModal = true"
            >{{ effBoardsStoredDisplayCount }}/{{
              effBoardsMaxStoredCount
            }}</span
          >
          (click: {{ effBoardsStoredFirstClickDisplay }})
          <q-icon name="sym_o_help" size="xs">
            <q-tooltip max-width="500px">
              When "Generate in background" is enabled, it will generate boards
              that meet the target efficiency whilst you play and store these
              for later. The "x/{{ effBoardsMaxStoredCount }}" indicates how
              many of these boards are currently stored and ready to play.
              Because these boards are generated in advance, the first click
              will not line up with where you clicked on the board. The "click:
              xxx" shows where the first click will be for the next stored
              board, the location of the first click can be changed with the
              settings below the board, but this will only affect future
              generated boards and not any boards that are already stored.
              Clicking on the "x/{{ effBoardsMaxStoredCount }}" will show
              additional settings where the storage limit can be raised.
            </q-tooltip>
          </q-icon>
        </span>
      </div>
      <div
        v-if="variant === 'mean openings'"
        class="flex q-mt-md flex-centreable q-mx-md"
      >
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="meanOpeningMineDensity"
          style="width: 200px; flex-shrink: 0"
          :options="[
            { label: '10%', value: 0.1 },
            { label: '20%', value: 0.2 },
            { label: '30%', value: 0.3 },
            { label: '40%', value: 0.4 },
            { label: '50%', value: 0.5 },
            { label: '60%', value: 0.6 },
            { label: '70%', value: 0.7 },
            { label: '80%', value: 0.8 },
            { label: '90%', value: 0.9 },
            { label: '100%', value: 1 },
          ]"
          emit-value
          map-options
          stack-label
          label="Opening target mine density"
          @update:model-value="game.reset()"
        ></q-select>
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="meanOpeningFlagDensity"
          style="width: 175px; flex-shrink: 0"
          :options="[
            { label: '0%', value: 0 },
            { label: '10%', value: 0.1 },
            { label: '20%', value: 0.2 },
            { label: '30%', value: 0.3 },
            { label: '40%', value: 0.4 },
            { label: '50%', value: 0.5 },
            { label: '60%', value: 0.6 },
            { label: '70%', value: 0.7 },
            { label: '80%', value: 0.8 },
            { label: '100%', value: 1 },
          ]"
          emit-value
          map-options
          stack-label
          label="Flag density"
          @update:model-value="game.reset()"
        ></q-select>
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="meanMineClickBehaviour"
          style="width: 175px; flex-shrink: 0"
          :options="[
            { label: 'Flag', value: 'flag' },
            { label: 'Blast', value: 'blast' },
            { label: 'Shield for 0.5s', value: 'shield' },
            { label: 'Ignore clicks', value: 'ignore' },
            { label: 'Ignore + chordable', value: 'chordable' },
          ]"
          emit-value
          map-options
          stack-label
          label="Mean mine click action"
          @update:model-value="game.reset()"
        ></q-select>
      </div>

      <div
        ref="game-container"
        id="game-container"
        class="clearfix q-my-md"
        :style="{
          userSelect: 'none',
          paddingLeft: gameCalculatedMarginLeft,
          marginTop:
            gameVerticalPadding === 'custom'
              ? gameTopPadding + 'px'
              : gameVerticalPadding,
          marginBottom:
            gameVerticalPadding === 'custom'
              ? gameBottomPadding + 'px'
              : gameVerticalPadding,
        }"
      >
        <canvas
          ref="main-canvas"
          id="main-canvas"
          @contextmenu.prevent
          @mousedown="game.handleMouseDown($event)"
          @mouseup="game.handleMouseUp($event)"
          @mousemove="game.handleMouseMove($event)"
          @mouseenter="game.handleMouseEnter($event)"
          @mouseleave="game.handleMouseLeave($event)"
          @touchstart="game.handleTouchStart($event)"
          @touchmove="game.handleTouchMove($event)"
          @touchend="game.handleTouchEnd($event)"
          @touchcancel="game.handleTouchCancel($event)"
          :style="{
            touchAction:
              touchActionOverride !== 'ignore'
                ? touchActionOverride
                : mobileScrollSetting === 'disable'
                ? 'none'
                : 'manipulation',
            marginLeft: 0 /*gameCalculatedMarginLeft*/,
            filter: filterStyleProperty,
          }"
        >
        </canvas>
        <q-resize-observer debounce="30" @resize="game.refreshSize()" />
        <q-card
          square
          v-if="showStatsBlock"
          style="float: left; margin-bottom: 10px"
          class="side-panel"
          id="stats-block"
        >
          <q-card-section style="font-family: monospace">
            <div
              style="
                font-family: 'Roboto', '-apple-system', 'Helvetica Neue',
                  Helvetica, Arial, sans-serif;
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
            <div v-if="statsObject.isWonGame">
              3bv: {{ statsObject.total3bv }}
            </div>
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
                  variant === 'eff boards' &&
                  statsObject.isWonGame &&
                  excellentEff,
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
                      parseInt(statsObject.deepMaxEff) >
                        parseInt(statsObject.maxEff)
                        ? 'line-through'
                        : 'none',
                  }"
                  >{{ statsObject.maxEff }}%</span
                >
                <span
                  v-if="
                    statsObject.deepMaxEff !== null &&
                    parseInt(statsObject.deepMaxEff) >
                      parseInt(statsObject.maxEff)
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

        <q-card
          square
          v-if="
            variant === 'zini explorer' &&
            !isCurrentlyEditModeDisplay &&
            !ziniRunnerActive &&
            !replayIsShown
          "
          style="float: left; margin-bottom: 10px"
          class="side-panel"
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

        <q-card
          square
          v-if="variant === 'zini explorer' && ziniRunnerActive"
          style="float: left; margin-bottom: 10px"
          class="side-panel"
        >
          <q-card-section>
            <span class="text-h6">Running DeepChain ZiNi</span><br />
            Expected Duration: {{ ziniRunnerExpectedDuration }}<br />
            Expected Finish Time: {{ ziniRunnerExpectedFinishTime }}<br />
            {{ ziniRunnerIterationsDisplay }}<br />
            <br />
            <q-btn
              @click="game.board.ziniExplore.killDeepChainZiniRunner()"
              color="negative"
              label="Cancel"
            ></q-btn>
          </q-card-section>
        </q-card>
      </div>
      <div
        class="flex q-ma-md flex-centreable"
        style="gap: 10px"
        v-if="variant !== 'zini explorer'"
      >
        <q-btn
          @click="game.board.boardHint.toggleHint()"
          color="secondary"
          icon="percent"
          label="Hint (H)"
          :disabled="variant === 'board editor' && isCurrentlyEditModeDisplay"
        >
        </q-btn>
        <q-btn
          @click="game.board.quickPaint.toggleQuickPaint()"
          color="secondary"
          icon="brush"
          label="QuickPaint (Q)"
          :disabled="variant === 'board editor' && isCurrentlyEditModeDisplay"
        >
        </q-btn>
        <template v-if="showQuickPaintOptions">
          <q-btn
            v-if="!quickPaintMinimalMode"
            @click="game.board.quickPaint.cycleQuickPaintMode()"
            color="secondary"
          >
            {{ quickPaintModeDisplay }} (w)
          </q-btn>
          <q-btn
            @click="game.board.quickPaint.clearClearableMarkings()"
            color="secondary"
          >
            {{ quickPaintClearable }} (scrollclick)
          </q-btn>
          <q-btn @click="quickPaintHelpModal = true" color="secondary"
            >Help</q-btn
          >
        </template>
      </div>

      <div class="q-mx-md">
        <q-card
          flat
          bordered
          style="max-width: 550px"
          class="q-my-md margin-centreable"
          v-if="variant === 'eff boards'"
        >
          <q-card-section>
            <div class="text-h6 q-mb-sm">Eff boards config</div>
            <div v-if="boardSizePreset === 'beg'" class="flex">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="begEffPreset"
                style="width: 130px"
                :options="begEffOptions"
                stack-label
                label="Target beg eff"
              ></q-select>
              <q-input
                v-if="begEffPreset === 'custom'"
                debounce="100"
                v-model.number="begEffCustom"
                label="Custom eff"
                type="number"
                dense
                min="100"
                max="340"
                style="width: 110px"
              />
            </div>
            <div v-if="boardSizePreset === 'int'" class="flex">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="intEffPreset"
                style="width: 130px"
                :options="intEffOptions"
                stack-label
                label="Target int eff"
              ></q-select>
              <q-input
                v-if="intEffPreset === 'custom'"
                debounce="100"
                v-model.number="intEffCustom"
                label="Custom eff"
                type="number"
                dense
                min="100"
                max="340"
                style="width: 110px"
              />
            </div>
            <div v-if="boardSizePreset === 'exp'" class="flex">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="expEffPreset"
                style="width: 130px"
                :options="expEffOptions"
                stack-label
                label="Target exp eff"
              ></q-select>
              <q-input
                v-if="expEffPreset === 'custom'"
                debounce="100"
                v-model.number="expEffCustom"
                label="Custom eff"
                type="number"
                dense
                min="100"
                max="340"
                style="width: 110px"
              />
            </div>
            <div v-if="boardSizePreset === 'custom'">
              <q-input
                debounce="100"
                v-model.number="customEffCustom"
                label="Minimum Custom eff"
                type="number"
                dense
                min="100"
                max="340"
                style="width: 110px"
              />
            </div>
            <div
              v-if="browserSupportsWebWorkers"
              class="flex q-mb-sm"
              style="align-items: center"
            >
              <q-checkbox
                class="q-mr-md"
                style="flex-shrink: 0"
                v-model="generateEffBoardsInBackground"
                label="Generate in background"
              />
              <div
                v-if="
                  effBoardShowSlowGenerationWarning &&
                  !generateEffBoardsInBackground
                "
                class="text-info"
                style="flex: 1 1 200px"
              >
                <b>IMPORTANT:</b> Recommended for high target efficiency
              </div>
            </div>
            <div v-if="browserSupportsConcurrency" class="flex q-mb-sm">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="200"
                v-model="effWebWorkerCount"
                style="width: 210px; flex-shrink: 0"
                :options="effWebWorkerCountOptions"
                stack-label
                label="Number of background workers"
                @update:model-value="effShuffleManager.reinitWorkers()"
              ></q-select>
              <div
                v-if="
                  effBoardShowSlowGenerationWarning &&
                  generateEffBoardsInBackground &&
                  effWebWorkerCount !== effWebWorkerCountOptions.at(-1)
                "
                class="text-info"
                style="flex: 1 1 215px"
              >
                Consider increasing this if background generation is too slow
              </div>
            </div>
            <div class="flex q-mb-sm">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="effFirstClickType"
                @update:model-value="
                  effShuffleManager.sendUpdateFirstClickIfNeeded()
                "
                style="width: 150px; flex-shrink: 0"
                :options="[
                  {
                    label: 'Mouse',
                    value: 'same',
                  },
                  { label: 'Random zero tile', value: 'random' },
                  { label: 'Top left corner', value: 'corner' },
                  { label: 'Middle', value: 'middle' },
                ]"
                emit-value
                map-options
                stack-label
                label="First click location"
              ></q-select>
              <div
                v-if="generateEffBoardsInBackground"
                class="text-info"
                style="flex: 1 1 215px"
              >
                Boards generated in the background will use the value of this
                setting at time of generation and will ignore the "Mouse" option
              </div>
            </div>
            <div class="flex q-mb-sm" v-if="generateEffBoardsInBackground">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="effBoardsImplementation"
                @update:model-value="
                  effShuffleManager.sendUpdateImplementationIfNeeded()
                "
                style="width: 175px; flex-shrink: 0"
                :options="[
                  { label: 'Wasm (fastest)', value: 'wasm' },
                  {
                    label: 'Javascript (slow)',
                    value: 'js',
                  },
                  { label: 'Wasm small', value: 'wasm_small' },
                  { label: 'Wasm large', value: 'wasm_large' },
                ]"
                emit-value
                map-options
                stack-label
                label="8-way implementation"
              ></q-select>
              <div class="text-info" style="flex: 1 1 215px">
                <div
                  v-if="!wasmAvailable && effBoardsImplementation !== 'js'"
                  class="text-negative"
                >
                  Wasm unsupported falling back to Javascript.
                </div>
                Implementation of 8-way ZiNi used for generating eff boards in
                the background. It's recommended to leave this on the default
                option.
                <span @click="effBoardsBenchmarkModal = true" class="fake-link"
                  >Run benchmarks</span
                >
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="q-py-md margin-centreable q-px-md" style="max-width: 700px">
        <q-list bordered class="rounded-borders">
          <q-expansion-item
            expand-separator
            icon="tune"
            label="General settings"
            group="settings"
          >
            <q-card>
              <q-card-section>
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="chordingButtons"
                  style="width: 175px; flex-shrink: 0"
                  :options="[
                    { label: 'Left Click', value: 'l' },
                    { label: 'Left + Right Click', value: 'l+r' },
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Chording"
                ></q-select>
                <q-checkbox v-model="zeroStart" label="Zero Start" />
                <div class="flex q-mb-sm" style="align-items: center">
                  <q-checkbox
                    v-model="noGuessing"
                    label="No Guessing"
                    :disable="!wasmAvailable"
                    class="q-mr-md"
                  />
                  <div
                    v-if="!wasmAvailable"
                    class="text-negative"
                    style="flex: 1 1 200px"
                  >
                    No Guessing needs WebAssembly, which isn't supported.
                  </div>
                </div>
                <template v-if="noGuessing && wasmAvailable">
                  <q-input
                    debounce="100"
                    v-model.number="noGuessingMaxAttempts"
                    label="No guessing iterations"
                    type="number"
                    dense
                    min="100"
                    max="10000000"
                    style="width: 150px"
                  />
                  <br />
                </template>
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="faceHitbox"
                  style="width: 175px; flex-shrink: 0"
                  :options="[
                    { label: 'Whole bar', value: 'bar' },
                    { label: 'Just face', value: 'face' },
                    {
                      label: 'Adaptive',
                      value: 'adaptive',
                    },
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Face Hitbox"
                ></q-select>
                <div class="flex" style="gap: 15px">
                  <q-input
                    dense
                    rounded
                    outlined
                    style="width: 120px"
                    @keydown.prevent="
                      (event) => (keyboardClickDigKey = event.key.toLowerCase())
                    "
                    v-model="keyboardClickDigKey"
                    label="Keyboard Dig Key"
                    input-style="text-align: center"
                  />
                  <q-input
                    dense
                    rounded
                    outlined
                    style="width: 120px"
                    @keydown.prevent="
                      (event) =>
                        (keyboardClickFlagKey = event.key.toLowerCase())
                    "
                    v-model="keyboardClickFlagKey"
                    label="Keyboard Flag Key"
                    input-style="text-align: center"
                  />
                </div>
                <q-checkbox
                  v-model="keyboardClickOpenOnKeyDown"
                  label="Keyboard Click Reveal On Key Down"
                /><br /><br />
                <q-btn
                  @click="
                    scrollToBoard();
                    settingsModal = true;
                  "
                  color="secondary"
                  label="display settings (scale etc.)"
                />
              </q-card-section>
            </q-card>
          </q-expansion-item>

          <q-expansion-item
            expand-separator
            icon="sym_o_bar_chart_4_bars"
            label="Game stat settings"
            group="settings"
          >
            <q-card>
              <q-card-section>
                <q-checkbox v-model="statsShow8Way" label="Show 8-way ZiNi" />
                <br />
                <q-checkbox
                  v-model="statsShowChain"
                  label="Show 100chain ZiNi"
                />
                <br />
                <q-checkbox
                  v-model="statsShowWomZini"
                  label="Show WoM L ZiNi and HZiNi"
                />
                <br />
                <q-checkbox
                  :disable="!statsShowWomZini"
                  v-model="statsShowWomZiniFix"
                  label="Show WoM L ZiNi improved"
                />
                <br />
                <q-checkbox v-model="statsShowMaxEff" label="Show max eff" />
                <br />
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="statsRunDeepChain"
                  style="width: 175px; flex-shrink: 0"
                  :options="[
                    { label: 'Eff Boards win', value: 'eff win' },
                    { label: 'Eff Board win/lose', value: 'eff always' },
                    {
                      label: 'Any win',
                      value: 'any win',
                    },
                    {
                      label: 'Any win/lose',
                      value: 'any always',
                    },
                    {
                      label: 'Never',
                      value: 'never',
                    },
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Run deepChain"
                ></q-select>
                <q-checkbox
                  v-model="statsShowStnb"
                  label="Show STNB for standard sizes"
                />
                <br />
                <q-checkbox v-model="statsShowThrp" label="Show throughput" />
                <br />
                <q-checkbox v-model="statsShowRqp" label="Show RQP" />
                <br />
                <q-checkbox v-model="statsShowCorr" label="Show Correctness" />
              </q-card-section>
            </q-card>
          </q-expansion-item>

          <q-expansion-item
            expand-separator
            icon="smartphone"
            label="Mobile/Touch settings"
            group="settings"
          >
            <q-card>
              <q-card-section>
                <div class="flex q-mb-sm" style="align-items: center">
                  <q-checkbox
                    v-model="soundEffectsEnabled"
                    class="q-mr-md"
                    style="flex-shrink: 0"
                    label="Sound Effects"
                  />
                  <div class="text-info" style="flex: 1 1 200px">
                    Dig/chord/flag sounds provided by Minesweeper Go
                  </div>
                </div>
                <div class="flex q-mb-sm">
                  <q-checkbox
                    v-model="mobileModeEnabled"
                    class="q-mr-md"
                    style="flex-shrink: 0"
                    label="Use Mobile Mode"
                  />
                  <div
                    v-if="!mobileModeEnabled"
                    class="text-info"
                    style="flex: 1 1 290px"
                  >
                    Strongly recommended for touchscreen devices. Enables mobile
                    optimised touch handling and shows additional touch
                    settings.
                  </div>
                </div>
                <template v-if="mobileModeEnabled">
                  <q-select
                    class="q-mx-md q-mb-md"
                    outlined
                    options-dense
                    dense
                    transition-duration="100"
                    input-debounce="0"
                    v-model="mobileScrollSetting"
                    style="width: 175px; flex-shrink: 0"
                    :options="[
                      { label: 'Enable scroll', value: 'enable' },
                      { label: 'Disable scroll', value: 'disable' },
                      {
                        label: 'Scroll on zeros',
                        value: 'zero',
                      },
                      {
                        label: 'Scroll on interior (flag version)',
                        value: 'enclosed flag',
                      },
                      {
                        label: 'Scroll on interior (nf version)',
                        value: 'enclosed nf',
                      },
                    ]"
                    emit-value
                    map-options
                    stack-label
                    label="Touch Scroll Behaviour"
                  ></q-select>
                  <div
                    v-if="
                      mobileScrollSetting === 'enclosed nf' ||
                      mobileScrollSetting === 'enclosed flag'
                    "
                    class="flex q-mb-sm"
                  >
                    <q-checkbox
                      v-model="mobileEnclosedScrollLetThrough"
                      label="Let interior clicks through"
                      style="flex-shrink: 0"
                      class="q-mr-md"
                    />
                    <div
                      v-if="!mobileEnclosedScrollLetThrough"
                      class="text-negative"
                      style="flex: 1 1 240px"
                    >
                      <span v-if="mobileScrollSetting === 'enclosed nf'"
                        ><b>Danger:</b> having this unticked will cause problems
                        if you play using flags.</span
                      >
                      <span v-if="mobileScrollSetting === 'enclosed flag'"
                        ><b>Warning:</b> having this unticked will stop you from
                        placing deeply interior flags. You will still be able to
                        minecount using QuickPaint.</span
                      >
                    </div>
                  </div>
                  <div
                    v-if="
                      mobileScrollSetting === 'enclosed nf' ||
                      mobileScrollSetting === 'enclosed flag' ||
                      mobileScrollSetting === 'zero'
                    "
                    class="flex q-mb-sm"
                  >
                    <q-input
                      debounce="100"
                      v-model.number="mobileDelayForEnableScroll"
                      label="Enabling Scroll Delay (0-500ms)"
                      type="number"
                      dense
                      min="0"
                      max="500"
                      style="width: 170px"
                    />
                  </div>
                  <q-select
                    class="q-mx-md q-mb-md"
                    outlined
                    options-dense
                    dense
                    transition-duration="100"
                    input-debounce="0"
                    v-model="touchRevealLocation"
                    style="width: 175px; flex-shrink: 0"
                    :options="[
                      {
                        label: 'Touch Start',
                        value: 'start',
                      },
                      { label: 'Touch End', value: 'end' },
                      { label: 'Block If Changed', value: 'block' },
                    ]"
                    emit-value
                    map-options
                    stack-label
                    label="Touch Reveal Location"
                  ></q-select>
                  <q-select
                    class="q-mx-md q-mb-md"
                    outlined
                    options-dense
                    dense
                    transition-duration="100"
                    input-debounce="0"
                    v-model="touchRevealTiming"
                    style="width: 175px; flex-shrink: 0"
                    :options="[
                      {
                        label: 'Start of touch',
                        value: 'start',
                      },
                      { label: 'End of touch', value: 'end' },
                    ]"
                    emit-value
                    map-options
                    stack-label
                    label="Touch Reveal Timing"
                  ></q-select>
                  <q-input
                    debounce="100"
                    v-model.number="touchLongPressTime"
                    label="Long press time (80-400ms)"
                    type="number"
                    dense
                    min="80"
                    max="400"
                    style="width: 150px"
                  /><br />
                  <q-checkbox
                    v-model="touchLongPressDisabled"
                    label="Disable long press"
                    style="flex-shrink: 0"
                  /><br />
                  <q-input
                    debounce="100"
                    v-model.number="touchMaxTime"
                    label="Max touch time (300-1500ms)"
                    type="number"
                    dense
                    min="300"
                    max="1500"
                    style="width: 150px"
                  /><br />
                  <q-input
                    debounce="100"
                    v-model.number="touchScrollDistance"
                    label="Max tiles moved for touch (2-5)"
                    type="number"
                    dense
                    min="2"
                    max="5"
                    style="width: 150px"
                  /><br />
                  <q-select
                    class="q-mx-md q-mb-md"
                    outlined
                    options-dense
                    dense
                    transition-duration="100"
                    input-debounce="0"
                    v-model="flagToggleLocationClass"
                    style="width: 175px; flex-shrink: 0"
                    :options="[
                      {
                        label: 'Bottom Right',
                        value: 'toggle-bot-right',
                      },
                      {
                        label: 'Bottom Left',
                        value: 'toggle-bot-left',
                      },
                      {
                        label: 'Hidden',
                        value: 'toggle-hidden',
                      },
                      {
                        label: 'Show Reset Only',
                        value: 'toggle-hidden-reset',
                      },
                    ]"
                    emit-value
                    map-options
                    stack-label
                    label="Mode toggle location"
                  />
                  <q-select
                    class="q-mx-md q-mb-md"
                    outlined
                    options-dense
                    dense
                    transition-duration="100"
                    input-debounce="0"
                    v-model="flagToggleSizeClass"
                    style="width: 175px; flex-shrink: 0"
                    :options="[
                      {
                        label: 'Normal',
                        value: 'toggle-normal',
                      },
                      {
                        label: 'Large',
                        value: 'toggle-large',
                      },
                      {
                        label: 'Small',
                        value: 'toggle-small',
                      },
                    ]"
                    emit-value
                    map-options
                    stack-label
                    label="Mode toggle size"
                  />
                  <q-checkbox
                    v-model="flagToggleSwitchAfterStart"
                    label="Switch to flag mode after start"
                  /><br />
                  <q-select
                    class="q-mx-md q-mb-md"
                    outlined
                    options-dense
                    dense
                    transition-duration="100"
                    input-debounce="0"
                    v-model="touchActionOverride"
                    style="width: 220px; flex-shrink: 0"
                    :options="[
                      {
                        label: 'Use other settings (recommended)',
                        value: 'ignore',
                      },
                      {
                        label: 'pan-x',
                        value: 'pan-x',
                      },
                      {
                        label: 'pan-y',
                        value: 'pan-y',
                      },
                      {
                        label: 'pinch-zoom',
                        value: 'pinch-zoom',
                      },
                      {
                        label: 'pan-x pan-y',
                        value: 'pan-x pan-y',
                      },
                      {
                        label: 'pan-x pinch-zoom',
                        value: 'pan-x pinch-zoom',
                      },
                      {
                        label: 'pan-y pinch-zoom',
                        value: 'pan-y pinch-zoom',
                      },
                      {
                        label: 'pan-x pan-y pinch-zoom',
                        value: 'pan-x pan-y pinch-zoom',
                      },
                      {
                        label: 'none',
                        value: 'none',
                      },
                    ]"
                    emit-value
                    map-options
                    stack-label
                    label="[advanced] Touch action override"
                  />
                </template>
                <q-checkbox
                  v-model="verticalExpert"
                  label="Make expert boards portrait"
                /><br />
                <q-checkbox v-model="showQuickStats" label="Show Quick Stats" />
                <q-select
                  v-if="showQuickStats"
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="quickStatsFontSize"
                  style="width: 170px; flex-shrink: 0"
                  :options="[
                    { label: '8px', value: '8px' },
                    { label: '10px', value: '10px' },
                    { label: '12px', value: '12px' },
                    { label: '14px', value: '14px' },
                    { label: '16px', value: '16px' },
                    { label: '18px', value: '18px' },
                    { label: '20px', value: '20px' },
                    { label: '22px', value: '22px' },
                    { label: '24px', value: '24px' },
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Quick Stats Font Size"
                />
              </q-card-section>
            </q-card>
          </q-expansion-item>

          <q-expansion-item
            expand-separator
            icon="brush"
            label="QuickPaint settings"
            group="settings"
          >
            <q-card>
              <q-card-section>
                <q-checkbox
                  v-model="quickPaintInitialOnlyMines"
                  label="QuickPaint only solves mines"
                /><br />
                <q-checkbox
                  v-model="quickPaintMinimalMode"
                  label="QuickPaint minimal mode"
                /><br />
                <q-checkbox
                  v-model="quickPaintOnlyTrivialLogic"
                  label="QuickPaint only use single number logic (e.g. no 1-2 patterns)"
                />
              </q-card-section>
            </q-card>
          </q-expansion-item>

          <q-expansion-item
            expand-separator
            icon="percent"
            label="Hint settings"
            group="settings"
          >
            <q-card>
              <q-card-section>
                <div v-if="!wasmAvailable" class="text-negative q-mb-md">
                  Hints disabled due to WebAssembly being unsupported
                </div>
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="autoHintCriteria"
                  style="width: 175px; flex-shrink: 0"
                  :options="[
                    {
                      label: 'Always',
                      value: 'always',
                    },
                    { label: 'Never', value: 'never' },
                    { label: 'Time Condition', value: 'time' },
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Show hint after loss"
                ></q-select>
                <template v-if="autoHintCriteria === 'time'">
                  <q-input
                    debounce="100"
                    v-model.number="autoHintTime"
                    label="Hint min game time (seconds)"
                    type="number"
                    dense
                    min="0"
                    max="500"
                    style="width: 150px"
                  /><br />
                </template>
                <q-select
                  v-if="autoHintCriteria !== 'never'"
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="autoHintVariants"
                  style="width: 175px; flex-shrink: 0"
                  :options="[
                    {
                      label: 'All',
                      value: 'all',
                    },
                    { label: 'All but Eff Boards', value: 'not eff boards' },
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Loss hint gamemodes"
                ></q-select>
                <q-select
                  v-if="autoHintCriteria !== 'never'"
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="autoHintDelay"
                  style="width: 175px; flex-shrink: 0"
                  :options="[
                    {
                      label: 'Instant',
                      value: 0,
                    },
                    { label: '0.5s', value: 500 },
                    { label: '0.75s', value: 750 },
                    { label: '1s', value: 1000 },
                    { label: '1.5s', value: 1500 },
                    { label: '2s', value: 2000 },
                    { label: '3s', value: 3000 },
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Loss hint delay"
                ></q-select>
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="autoHintBackdrop"
                  style="width: 175px; flex-shrink: 0"
                  :options="[
                    {
                      label: 'Blast numbers',
                      value: 'numbers',
                    },
                    { label: 'Mines', value: 'mines' },
                    { label: 'No mines', value: 'no mines' },
                    { label: 'No highlight', value: 'minimal' },
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Loss hint backdrop"
                ></q-select>
              </q-card-section>
            </q-card>
          </q-expansion-item>

          <q-expansion-item
            expand-separator
            icon="play_circle_filled"
            label="Replay settings"
            group="settings"
          >
            <q-card>
              <q-card-section>
                <q-checkbox
                  v-model="reorderZini"
                  label="Reorder ZiNi Replay"
                /><br />
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="replayShowHidden"
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
                  label="Show hidden tiles"
                  @update:model-value="game?.board?.replay?.refreshAndDraw()"
                />
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </q-list>
      </div>

      <br />
      <p class="text-centreable q-px-md">(textures from minesweeper.online)</p>
    </div>
  </q-page>

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

  <q-dialog v-model="filtersModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Visual Filters</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          Visual filters are effects that can make the board either easier to
          read (e.g. boosting contrast) or harder to read (e.g. adding blur).
          They can also be used to adjust the board display to your comfort
          (e.g. reducing brightness if playing at night). Please note that
          having lots of filters active may affect performance. Preview for blur
          filter may be inaccurate as it doesn't take into account Tile Size.
        </p>
        <div class="row justify-around q-my-md" style="gap: 10px">
          <img
            src="/img/supporting/filter_preview_light.png"
            loading="lazy"
            :style="{ filter: filterStyleProperty }"
            class="q-mx-sm"
          />
          <img
            src="/img/supporting/filter_preview_dark.png"
            loading="lazy"
            :style="{ filter: filterStyleProperty }"
            class="q-mx-sm"
          />
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterBlur"
            label="Enable Blur"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterBlur"
              v-model.number="filterBlurValue"
              label="Blurriness (pixels)"
              type="number"
              dense
              min="0"
              max="1000"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterBrightness"
            label="Enable Brightness"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterBrightness"
              v-model.number="filterBrightnessValue"
              label="Brightness (< 1 is darker | > 1 is lighter)"
              type="number"
              dense
              min="0"
              max="1000"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterContrast"
            label="Enable Contrast"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterContrast"
              v-model.number="filterContrastValue"
              label="Contrast (< 1 is less | > 1 is more)"
              type="number"
              dense
              min="0"
              max="1000"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterGrayscale"
            label="Enable Grayscale"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterGrayscale"
              v-model.number="filterGrayscaleValue"
              label="Grayscale (0 is normal | 1 is full)"
              type="number"
              dense
              min="0"
              max="1"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterHueRotate"
            label="Enable Hue Rotate"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterHueRotate"
              v-model.number="filterHueRotateValue"
              label="Hue Rotate (degrees)"
              type="number"
              dense
              min="0"
              max="360"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterInvert"
            label="Enable Invert"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterInvert"
              v-model.number="filterInvertValue"
              label="Invert (0 is normal | 1 is inverted)"
              type="number"
              dense
              min="0"
              max="1"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterSaturate"
            label="Enable Saturate"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterSaturate"
              v-model.number="filterSaturateValue"
              label="Saturation (< 1 is less | > 1 is more)"
              type="number"
              dense
              min="0"
              max="10"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn
          flat
          label="Close"
          @click="
            filtersModal = false;
            settingsModal = true;
          "
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="coordsModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Coord Settings</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-checkbox
          v-model="coordsUseLetters"
          label="Use letters for x-axis"
          @update:model-value="
            game.board.boardRenderer.drawBorders();
            game.board.boardRenderer.drawCoords();
          "
        /><br />
        <q-checkbox
          v-model="coordsUseInvertedY"
          label="Invert y-axis"
          @update:model-value="
            game.board.boardRenderer.drawBorders();
            game.board.boardRenderer.drawCoords();
          "
        /><br />
        <q-checkbox
          v-model="coordsUseZeroIndexing"
          label="Start from 0"
          @update:model-value="
            game.board.boardRenderer.drawBorders();
            game.board.boardRenderer.drawCoords();
          "
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn
          flat
          label="Close"
          @click="
            coordsModal = false;
            settingsModal = true;
          "
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="variantsHelpModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Variants info</div>
      </q-card-section>

      <q-markup-table
        v-if="variantsHelpModal"
        class="q-mx-md q-mt-md q-mb-lg"
        style="max-width: 700px"
        dense
        flat
      >
        <thead>
          <tr>
            <th class="text-left">Variant</th>
            <th class="text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-left" style="vertical-align: top">Normal</td>
            <td class="text-left" style="text-wrap: wrap">
              Regular minesweeper.
            </td>
          </tr>
          <tr>
            <td class="text-left" style="vertical-align: top">Eff boards</td>
            <td class="text-left" style="text-wrap: wrap">
              Play minesweeper boards that have a high potential efficiency.
              Efficiency is a measure of how many clicks a game took to solve
              relative to the number of clicks it would take to solve with only
              using left clicks.
            </td>
          </tr>
          <tr>
            <td class="text-left" style="vertical-align: top">Board Editor</td>
            <td class="text-left" style="text-wrap: wrap">
              Create your own minesweeper configuration and play it.
            </td>
          </tr>
          <tr>
            <td class="text-left" style="vertical-align: top">ZiNi Explorer</td>
            <td class="text-left" style="text-wrap: wrap">
              This is a tool for working out how to complete a minesweeper board
              using the minimum number of clicks.
            </td>
          </tr>
          <tr>
            <td class="text-left" style="vertical-align: top">Mean Openings</td>
            <td class="text-left" style="text-wrap: wrap">
              Similar to regular minesweeper, except that openings will get
              randomly filled with mines when revealed (openings are the regions
              that get expanded automatically).
            </td>
          </tr>
        </tbody>
      </q-markup-table>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="quickPaintHelpModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">QuickPaint Help</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          QuickPaint is inspired by the paint feature on minesweeper.online. It
          lets you mark squares to plan out possibly moves. I've intended this
          to be used during minecount situations in efficiency.
        </p>
        <p>
          QuickPaint automatically marks mines (and safes if enabled) that can
          deduced through basic logic. It does not do logic more complex than
          subtraction formula.
        </p>
        <p>
          QuickPaint has different kinds of markings. These can be used how you
          like, however I intended them to be used as follows:
          <br />
          Known Squares: Red = known mine, Green = known safe<br />
          Guess Squares: orange = possible mine, white = possible safe<br />
          Dots: these represent clicks. 1 dot = a click, 2 dots = two clicks
          (e.g. revealing a square then chording).
        </p>
        <p>
          The top bar will update to show counters which from left to right are:
          <br />
          Undiscovered mines | total mines - (flags + reds)<br />
          Undiscovered mines including guessed | total mines - (flags + reds +
          oranges)<br />
          Dot count | How many dots there are. This can be used to work out
          which clicking order uses fewest clicks.
        </p>
        <p>
          There are two modes. Minimal mode (default) lets you place dots with
          left click and guess mines (orange) with right click. Non-minimal mode
          lets you cycle between placing knowns, guesses, dots. Left click will
          place known safe, guess safe, or add a dot. Right click will place
          known mines, guess mine or remove a dot.
        </p>
        <p>
          Markings can be reset by clicking the middle mouse button (scroll
          wheel). It first removes dots and then guesses and then excess known
          squares (if any).
        </p>
        <p>
          Settings for QuickPaint can be adjusted below or from the settings
          beneath the board
        </p>
        <div>
          <q-checkbox
            v-model="quickPaintInitialOnlyMines"
            label="QuickPaint only solves mines"
          /><br />
          <q-checkbox
            v-model="quickPaintMinimalMode"
            label="QuickPaint minimal mode"
          />
          <q-checkbox
            v-model="quickPaintOnlyTrivialLogic"
            label="QuickPaint only use single number logic (e.g. no 1-2 patterns)"
          />
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="pttaImportModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">PTT Import</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          This dialogue can be used to copy boards from the
          <a
            target="_blank"
            href="https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/"
            >PTTACGfans ZiNi calculator</a
          >. Simply copy the full URL when on a board and paste in the text box
          and then click load. This works because the bit at the end of the URL
          on the PTTACGfans calculator encodes board data.
        </p>
        <q-input
          dense
          v-model="pttaUrl"
          label="PTT URL"
          autofocus
          @keyup.enter="game.board.boardImportExport.importPttaBoard()"
        /><br />
        <q-btn
          @click="game.board.boardImportExport.importPttaBoard()"
          color="primary"
          >Load</q-btn
        >
        <br /><br />Importing from minesweeper.online? Try enable the
        <RouterLink to="/wom-setting">LlamaSweeper ZiNi setting</RouterLink>.
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="mbfImportModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">MBF Import</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          This dialogue can be used to copy boards from
          <a target="_blank" href="https://mzrg.com/js/mine/make_board.html"
            >make_board</a
          >. Simply copy the hex string that appears below the board on
          make_board and paste in the text box and then click load. If instead
          you have an .mbf or .abf file, you can import this using the file
          picker instead.
        </p>
        <q-input
          dense
          v-model="mbfStringToImport"
          label="MBF Hex String"
          autofocus
          @update:model-value="mbfFileToImport = null"
          @keyup.enter="game.board.boardImportExport.importMbfBoard()"
        /><br />
        <q-file
          outlined
          clearable
          dense
          label="MBF or ABF File"
          accept=".mbf, .abf"
          input-style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
          v-model="mbfFileToImport"
          @update:model-value="mbfStringToImport = ''"
          style="max-width: 300px"
        >
          <template v-slot:prepend>
            <q-icon name="folder_open" />
          </template>
        </q-file>
        <br />
        <q-btn
          @click="game.board.boardImportExport.importMbfBoard()"
          color="primary"
          >Load</q-btn
        >
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="runZiniAlgorithmModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">ZiNi Algorithms</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          ZiNi algorithms are procedures that try to find the lowest number of
          clicks that a board can be solved in.
        </p>

        <div class="flex justify-around">
          <q-select
            class="q-mx-md q-mb-md"
            outlined
            options-dense
            dense
            transition-duration="100"
            input-debounce="0"
            v-model="analyseAlgorithm"
            style="width: 200px; flex-shrink: 0"
            :options="[
              {
                label: 'DeepChain ZiNi (best)',
                value: 'incexzini',
              },
              {
                label: '8 Way ZiNi',
                value: '8 way',
              },
              { label: 'WoM L ZiNi', value: 'womzini' },
              { label: 'WoM L ZiNi Improved', value: 'womzinifix' },
              { label: 'WoM HZiNi', value: 'womhzini' },
              { label: 'Chain ZiNi', value: 'chainzini' },
            ]"
            emit-value
            map-options
            stack-label
            label="Choose Algorithm"
          />
          <q-select
            class="q-mx-md q-mb-md"
            outlined
            options-dense
            dense
            transition-duration="100"
            input-debounce="0"
            v-model="analyseAlgorithmScope"
            style="width: 200px; flex-shrink: 0"
            :options="analyseAlgorithmScopeOptions"
            emit-value
            map-options
            stack-label
            label="Scope"
          />
        </div>
      </q-card-section>
      <template
        v-if="
          analyseAlgorithm === 'chainzini' || analyseAlgorithm === 'incexzini'
        "
      >
        <q-separator />
        <q-card-section>
          <div
            style="
              display: grid;
              justify-items: center;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            "
          >
            <q-input
              v-if="analyseAlgorithm === 'chainzini'"
              class="q-mb-sm"
              debounce="100"
              v-model.number="analyseIterations"
              label="Iterations"
              type="number"
              dense
              min="1"
              max="1000000"
              style="width: 110px"
            />
            <q-select
              v-if="analyseAlgorithm === 'incexzini'"
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="analyseDeepType"
              style="width: 175px; flex-shrink: 0"
              :options="[
                {
                  label: 'Separate (best)',
                  value: 'separate',
                },
                {
                  label: 'Minimum',
                  value: 'minimum',
                },
                {
                  label: 'Average',
                  value: 'average',
                },
                {
                  label: 'Average then Minimum',
                  value: 'average then minimum',
                },
              ]"
              emit-value
              map-options
              stack-label
              label="Deep analysis type"
            />
            <q-input
              v-if="analyseAlgorithm === 'incexzini'"
              class="q-mb-sm"
              debounce="50"
              v-model.number="analyseDeepIterations"
              label="Deep iterations"
              type="number"
              dense
              min="1"
              max="1000"
              style="width: 110px"
            />
            <q-checkbox
              v-if="analyseAlgorithm === 'incexzini'"
              v-model="analyseVisualise"
              label="Visualise"
            />
            <q-checkbox
              v-if="
                (analyseAlgorithm === 'chainzini' ||
                  analyseAlgorithm === 'incexzini') &&
                analyseAlgorithmScope === 'current'
              "
              v-model="analyseHistoryRewrite"
              label="Allow history rewrite"
            />
            <!--
            <q-checkbox
              v-if="analyseAlgorithm === 'incexzini'"
              v-model="analyseForbid"
              label="Forbid moves"
            />
            -->
          </div>
        </q-card-section>
      </template>

      <q-card-actions align="between" class="text-primary">
        <q-btn label="Cancel" color="negative" v-close-popup />
        <q-btn
          @click="
            Utils.setTimeoutWrapper(() => {
              game.board.ziniExplore.runAlgorithm();
            }, 500)
          "
          color="positive"
          v-close-popup
          label="Run"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="effBoardsBenchmarkModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Benchmark eff boards</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          Eff boards has two different implementations of the 8-way ZiNi
          algorithm. They are exactly the same in result. But the WebAssembly
          version should be much faster than the JavaScript version with no
          downsides. This dialogue lets you run a benchmark to see the
          difference. The benchmark runs on a single background worker.
        </p>
        <p>
          The webAssembly version is further split into "Wasm Small" and "Wasm
          Large" which are optimised for performance on small and large boards
          respectively. By default the "Wasm" option switches from Wasm Small to
          Wasm Large for boards over 1000 squares.
        </p>
        <p>
          Board to run benchmark on: {{ boardWidth }}x{{ boardHeight }}/{{
            boardMines
          }}
          at {{ minimumEff }}%.
        </p>
        <q-input
          v-model.number="effBoardsBenchmarkIterations"
          class="q-mb-sm"
          debounce="50"
          type="number"
          label="Total Iterations"
          dense
          min="1"
          max="1000000"
          style="width: 110px"
        />
      </q-card-section>

      <q-card-actions align="between" class="text-primary">
        <q-btn label="Close" v-close-popup color="negative" />
        <q-btn
          @click="
            //Benchmarking run for zini algs
            () => {
              effShuffleManager.doBenchmarkingRun({
                width: boardWidth,
                height: boardHeight,
                mineCount: boardMines,
                targetEff: minimumEff,
                iterations: effBoardsBenchmarkIterations,
              });
            }
          "
          color="positive"
          v-close-popup
          label="Run Benchmark"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="effBoardsHiddenSettingsModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Board Storage Settings</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          Here you can change the max number of boards that get stored when the
          "generate in background" setting is enabled. You can also clear out
          the stored boards, which can be useful when changing first click
          location or for benchmarking (although better to use the benchmark
          link on the eff boards config panel).
        </p>
        <q-input
          debounce="100"
          v-model.number="effBoardsMaxStoredCount"
          label="Board Storage Limit"
          type="number"
          dense
          min="5"
          max="1000"
          style="width: 110px"
          @blur="
            effBoardsMaxStoredCount = Math.min(
              1000,
              Math.max(5, Math.floor(effBoardsMaxStoredCount))
            )
          "
        />
        <br />
        <q-btn
          @click="effShuffleManager.clearAllStoredBoards()"
          color="negative"
          label="Clear stored boards"
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <div
    v-if="mobileModeEnabled && !replayIsShown"
    :class="[
      {
        'flag-toggle': true,
        'flag-active': flagToggleActive && !flagToggleShowReset,
        'flag-show-reset': flagToggleShowReset,
      },
      flagToggleLocationClass,
      flagToggleSizeClass,
    ]"
    @click.prevent="game.board.toggleFlagButton()"
  >
    <q-icon
      name="flag"
      :class="[flagToggleSizeClass, 'flag-toggle-icon']"
      v-show="!flagToggleShowReset"
    />
    <q-icon
      name="sym_o_sentiment_satisfied"
      style="position: absolute"
      :class="[flagToggleSizeClass, 'flag-toggle-icon']"
      v-show="flagToggleShowReset"
    ></q-icon>
  </div>

  <div
    v-if="flagToggleShowReset && showQuickStats"
    class="quick-stats"
    :style="{ fontSize: quickStatsFontSize }"
  >
    <div>Time: {{ statsObject.time }}s</div>
    <div v-if="!statsObject.isWonGame">
      Est. Time: {{ statsObject.estTime }}s
    </div>
    <div v-if="statsObject.isWonGame">3bv: {{ statsObject.total3bv }}</div>
    <div v-else>
      3bv: {{ statsObject.solved3bv }}/{{ statsObject.total3bv }}
    </div>
    <div>3bv/s: {{ statsObject.bbbvs }}</div>
    <div>Ce/s: {{ statsObject.clicks.effectiveClicksPerSecond }}</div>
    <div>eff: {{ statsObject.eff }}%</div>
    <div v-if="statsShowMaxEff && statsObject.maxEff !== null">
      max eff:
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
    </div>
  </div>

  <div style="height: 150px"></div>

  <ReplayBar
    v-show="replayIsShown"
    :replay-is-playing="replayIsPlaying"
    :replay-progress="replayProgress"
    :replay-progress-rounded="replayProgressRounded"
    :replay-bar-start-value="replayBarStartValue"
    :replay-bar-last-value="replayBarLastValue"
    :replay-type-force-steppy="replayTypeForceSteppy"
    @toggle-play-pause="
      game.board && game.board.replay && game.board.replay.togglePausePlay()
    "
    @jump-to-previous-click="game?.board?.replay?.jumpToPreviousClick()"
    @jump-to-next-click="game?.board?.replay?.jumpToNextClick()"
    @speed-multiplier-change="(val) => (replaySpeedMultiplier = val)"
    @is-inputting-change="(val) => (replayIsInputting = val)"
    @is-panning-change="(val) => (replayIsPanning = val)"
    @handle-slider-change="(val) => game.board?.replay?.handleSliderChange(val)"
    @handle-input-change="(val) => game.board?.replay?.handleInputChange(val)"
    @replay-type-change="
      (val) => {
        replayType = val;
        game.board?.replay?.refreshForReplayTypeChange();
      }
    "
    @close-replay="game?.board?.closeReplay()"
  >
  </ReplayBar>

  <!-- below is needed for to preload icon for flag-toggle reset button -->
  <q-icon
    name="sym_o_sentiment_satisfied"
    style="visibility: hidden; position: absolute"
  ></q-icon>
  <!--end of preload-->
</template>

<style scoped>
#game-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
}

#main-canvas {
  user-select: none;
  float: left;
  margin-right: 10px;
  margin-bottom: 10px;
  touch-action: manipulation;
  -webkit-touch-callout: none;
}

.side-panel {
  user-select: text;
}

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

.flag-toggle {
  background-color: rgba(124, 128, 131, 0.9);
  border-color: #4d4d4d !important;
  border: unset;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  touch-action: none;
}

body.body--dark .flag-toggle {
  background-color: rgba(29, 33, 37, 0.9);
  border-color: white !important;
}

.flag-active {
  background-color: rgba(176, 74, 74, 0.9);
}

body.body--dark .flag-active {
  background-color: rgba(102, 23, 23, 0.9);
}

.flag-toggle.toggle-bot-right {
  border-radius: 10% 0 0 0;
  border-left: 1px solid;
  border-top: 1px solid;
  right: -1px;
  bottom: -1px;
}

.flag-toggle.toggle-bot-left {
  border-radius: 0 10% 0 0;
  border-right: 1px solid;
  border-top: 1px solid;
  left: -1px;
  bottom: -1px;
}

.flag-toggle.toggle-hidden {
  display: none !important;
}

.flag-toggle.toggle-hidden-reset:not(.flag-show-reset) {
  display: none !important;
}

.flag-toggle.toggle-hidden-reset.flag-show-reset {
  border-radius: 10% 0 0 0;
  border-left: 1px solid;
  border-top: 1px solid;
  right: -1px;
  bottom: -1px;
}

.flag-toggle.toggle-normal {
  width: 80px;
  height: 80px;
}
.flag-toggle-icon.toggle-normal {
  font-size: 3em;
}

.flag-toggle.toggle-large {
  width: 120px;
  height: 120px;
}
.flag-toggle-icon.toggle-large {
  font-size: 4.5em;
}

.flag-toggle.toggle-small {
  width: 50px;
  height: 50px;
}
.flag-toggle-icon.toggle-small {
  font-size: 2em;
}

.flag-toggle-icon {
  color: black;
}

body.body--dark .flag-active .flag-toggle-icon {
  color: white;
}

.stats-click-table-container {
  background-color: #e0e0e0;
}

body.body--dark .stats-click-table-container {
  background-color: #616161;
}

.centre-interface .flex-centreable {
  justify-content: center !important;
}

.centre-interface .margin-centreable {
  margin-left: auto !important;
  margin-right: auto !important;
}

.centre-interface .text-centreable {
  text-align: center !important;
}

.quick-stats {
  position: fixed;
  top: 10px;
  left: 10px;
  /*background-color: rgba(124, 128, 131, 0.7);*/
  background-color: #d3d3d3d1;
  color: black;
  padding: 5px 10px;
  border-radius: 10px;
  user-select: none;
  font-size: 10px;
  pointer-events: none;
  font-family: monospace;
  z-index: 10000;
  box-shadow: 3px 4px 10px #000000ad;
}

.screenshot-active .screenshot-hidden {
  display: none !important;
}
</style>

<script setup>
import {
  useTemplateRef,
  ref,
  onMounted,
  onUnmounted,
  watchEffect,
  watch,
} from "vue";

import Benchmark from "src/classes/Benchmark";
import Algorithms from "src/classes/Algorithms";
import BoardStats from "src/classes/BoardStats";
import effShuffleManager from "src/classes/EffShuffleManager";
import BoardGenerator from "src/classes/BoardGenerator";
import skinManager from "src/classes/SkinManager";
import Utils from "src/classes/Utils";
import ChainZini from "src/classes/ChainZini";
import statsWorkerManager from "src/classes/StatsWorkerManager";
import Board from "src/classes/Board";

import ReplayBar from "src/components/ReplayBar.vue";

import playSound from "src/includes/Sounds";

import testGames from "src/assets/janitor-test-data";

import { useRoute, useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();

import { debounce } from "quasar";

defineOptions({
  name: "PlayPage",
});

onMounted(() => {
  resetTransientSettings();
  document.body.addEventListener("keydown", handleKeyDown, true);
  document.body.addEventListener("keyup", handleKeyUp, true);
  window.addEventListener("scroll", handlePageScroll);
  skinManager.addCallbackWhenAllPriorityLoaded(() => {
    game.initialise();
  });
  skinManager.addCallbackWhenSingleImageLoaded(
    debounce(() => {
      game.refreshSize();
      console.log("refresh called");
    }, 100)
  );
});

onUnmounted(() => {
  document.body.removeEventListener("keydown", handleKeyDown, true);
  document.body.removeEventListener("keyup", handleKeyUp, true);
  window.removeEventListener("scroll", handlePageScroll);
  game.unmount();
  effShuffleManager.deactivateBackgroundGeneration();
  statsWorkerManager.softReset();
});

function handleKeyDown(event) {
  if (event.key.toLowerCase() === keyboardClickDigKey.value.toLowerCase()) {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.boardInput.sendKeyboardClick(true, false, true, event.timeStamp);
    return;
  }
  if (event.key.toLowerCase() === keyboardClickFlagKey.value.toLowerCase()) {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.boardInput.sendKeyboardClick(false, true, true, event.timeStamp);
    return;
  }
  if (event.key === " " || event.key === "F2") {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.reset();
  }
  if (event.key === "h") {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.boardHint.toggleHint();
  }
  if (event.key === "q") {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.quickPaint.toggleQuickPaint();
    //event.preventDefault();
  }
  if (event.key === "w") {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.quickPaint.handleCycleQuickPaintModeKeypress();
    //event.preventDefault();
  }
  if (event.key === "ArrowLeft") {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.replay && game.board.replay.jumpToPreviousClick();
    //event.preventDefault();
  }
  if (event.key === "ArrowRight") {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.replay && game.board.replay.jumpToNextClick();
    //event.preventDefault();
  }
}

function handleKeyUp(event) {
  if (event.key.toLowerCase() === keyboardClickDigKey.value.toLowerCase()) {
    game.board.boardInput.sendKeyboardClick(
      true,
      false,
      false,
      event.timeStamp
    );
  }
  if (event.key.toLowerCase() === keyboardClickFlagKey.value.toLowerCase()) {
    game.board.boardInput.sendKeyboardClick(
      false,
      true,
      false,
      event.timeStamp
    );
  }
}

function checkFocusForKeyPress(event) {
  if (
    document.activeElement?.nodeName === "INPUT" &&
    document.activeElement?.classList?.contains("q-field__native")
  ) {
    //We are on an input element, so let the space input go to that instead
    return false; //Exit early, without resetting the board or cancelling the event
  }

  if (
    document.activeElement?.nodeName === "INPUT" &&
    document.activeElement?.classList?.contains("q-select__focus-target") &&
    document.activeElement?.getAttribute("aria-expanded") === "true"
  ) {
    //We are on an open select element. So let that handle the space input instead
    return false;
  }

  //There were some issues with quasar components stealing the spacebar input.
  //Hence we defocus all elements except some input elements
  document.activeElement?.blur();
  event.preventDefault();
  event.stopPropagation();

  return true;
}

function handlePageScroll(event) {
  if (!game.board) {
    return;
  }

  game.board.boardInput.handlePageScroll(event);
}

function scrollToBoard() {
  mainCanvas.value.scrollIntoView({
    behavior: "instant",
    block: "center",
    inline: "nearest",
  });
}

const mainCanvas = useTemplateRef("main-canvas");
const gameContainerDiv = useTemplateRef("game-container");

import {
  wasmAvailable,
  showStatsBlock,
  statsObject,
  showStatsClicksTable,
  statsShow8Way,
  statsShowChain,
  statsShowWomZini,
  statsShowWomZiniFix,
  statsShowMaxEff,
  statsRunDeepChain,
  statsShowStnb,
  statsShowThrp,
  statsShowRqp,
  statsShowCorr,
  settingsModal,
  filtersModal,
  variantsHelpModal,
  tileSizeSlider,
  gamePositioning,
  gameLeftPadding,
  gameCalculatedMarginLeft,
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
  coordsUseLetters,
  coordsUseInvertedY,
  coordsUseZeroIndexing,
  pttaUrl,
  mbfStringToImport,
  mbfFileToImport,
  boardSizePreset,
  customWidth,
  customHeight,
  customMines,
  boardWidth,
  boardHeight,
  boardMines,
  customWarning,
  variant,
  chordingButtons,
  zeroStart,
  noGuessing,
  noGuessingMaxAttempts,
  autoHintCriteria,
  autoHintTime,
  autoHintDelay,
  autoHintVariants,
  autoHintBackdrop,
  begEffPreset,
  begEffOptions,
  begEffCustom,
  intEffPreset,
  intEffOptions,
  intEffCustom,
  expEffPreset,
  expEffOptions,
  expEffCustom,
  customEffCustom,
  generateEffBoardsInBackground,
  effWebWorkerCount,
  browserSupportsWebWorkers,
  browserSupportsConcurrency,
  effBoardsImplementation,
  effBoardsBenchmarkIterations,
  effBoardsBenchmarkModal,
  effBoardsHiddenSettingsModal,
  effBoardsStoredDisplayCount,
  effBoardsMaxStoredCount,
  effBoardsStoredFirstClickDisplay,
  effFirstClickType,
  minimumEff,
  effBoardShowSlowGenerationWarning,
  excellentEff,
  effWebWorkerCountOptions,
  showQuickPaintOptions,
  quickPaintModeDisplay,
  quickPaintClearable,
  quickPaintInitialOnlyMines,
  quickPaintMinimalMode,
  quickPaintOnlyTrivialLogic,
  quickPaintHelpModal,
  editBoardUnappliedWidth,
  editBoardUnappliedHeight,
  pttaImportModal,
  mbfImportModal,
  isCurrentlyEditModeDisplay,
  flagToggleActive,
  flagToggleShowReset,
  flagToggleLocationClass,
  flagToggleSizeClass,
  flagToggleSwitchAfterStart,
  mobileModeEnabled,
  mobileScrollSetting,
  mobileEnclosedScrollLetThrough,
  mobileDelayForEnableScroll,
  touchRevealLocation,
  touchRevealTiming,
  touchLongPressTime,
  touchLongPressDisabled,
  touchMaxTime,
  touchScrollDistance,
  verticalExpert,
  touchActionOverride,
  showQuickStats,
  quickStatsFontSize,
  faceHitbox,
  soundEffectsEnabled,
  meanOpeningMineDensity,
  meanOpeningFlagDensity,
  meanMineClickBehaviour,
  replayProgress,
  replayProgressRounded,
  replayIsPlaying,
  replayBarStartValue,
  replayBarLastValue,
  replayTypeForceSteppy,
  replayType,
  replayIsShown,
  replaySpeedMultiplier,
  replayIsPanning,
  replayIsInputting,
  reorderZini,
  replayShowHidden,
  analyseDisplayMode,
  analyseAlgorithm,
  analyseAlgorithmScope,
  analyseIterations,
  analyseHistoryRewrite,
  analyseDeepType,
  analyseDeepIterations,
  analyseVisualise,
  classicPathBreakdown,
  analyseZiniTotal,
  analyse3bv,
  analyseEff,
  analyseShowPremiums,
  analyseHiddenStyle,
  analyseAlgorithmScopeOptions,
  runZiniAlgorithmModal,
  ziniRunnerActive,
  ziniRunnerExpectedDuration,
  ziniRunnerExpectedFinishTime,
  ziniRunnerIterationsDisplay,
  ziniRunnerPercentageProgress,
  keyboardClickOpenOnKeyDown,
  keyboardClickDigKey,
  keyboardClickFlagKey,
  enableFilters,
  enableFilterBlur,
  enableFilterBrightness,
  enableFilterContrast,
  enableFilterGrayscale,
  enableFilterHueRotate,
  enableFilterInvert,
  enableFilterSaturate,
  filterBlurValue,
  filterBrightnessValue,
  filterContrastValue,
  filterGrayscaleValue,
  filterHueRotateValue,
  filterInvertValue,
  filterSaturateValue,
  filterStyleProperty,
  resetTransientSettings,
} from "src/composables/useSettings";

//variant gets declared in useSettings, but we synchronously set the initial value here
variant.value = Utils.routeNameToVariant(route.params.variant);

watchEffect(() => {
  if (variant.value === "eff boards" && generateEffBoardsInBackground.value) {
    effShuffleManager.activateBackgroundGeneration();
  } else {
    effShuffleManager.deactivateBackgroundGeneration();
  }
});
watch(
  [boardWidth, boardHeight, boardMines, minimumEff, effBoardsMaxStoredCount],
  () => {
    if (variant.value === "eff boards" && generateEffBoardsInBackground.value) {
      effShuffleManager.sendWorkersCurrentTaskDebounced();
    }
  }
);

const vFocus = {
  //directive for focussing an element when mounted, currently unused, because we use autofocus prop for q-input instead
  mounted: (el) => el.focus(),
};

let devMode = localStorage.getItem("devMode") === "1" ? true : false;

let bulkIterations = ref(1000);
function bulkrun() {
  //Entries are diffs and counts
  let oneDiff = new Map();
  let eightDiff = new Map();
  let womFixDiff = new Map();

  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    benchmark.startTime("one-way");
    let oneZini = Algorithms.calcOneWayZini(mines).total;
    benchmark.stopTime("one-way");

    benchmark.startTime("8-way");
    let eightZini = Algorithms.calcEightWayZini(mines).total;
    benchmark.stopTime("8-way");

    //wom zini without correction
    benchmark.startTime("wom-zini-hzini-no-corr");
    let womZini = Algorithms.calcWomZiniAndHZini(mines, false).womZini.total;
    benchmark.stopTime("wom-zini-hzini-no-corr");

    //wom zini with correction
    benchmark.startTime("wom-zini-hzini-with-corr");
    let womFixZini = Algorithms.calcWomZiniAndHZini(mines, true).womZini.total;
    benchmark.stopTime("wom-zini-hzini-with-corr");

    let thisOneDiff = oneZini - womZini;
    let thisEightDiff = eightZini - womZini;
    let thisWomFixDiff = womFixZini - womZini;

    oneDiff.set(thisOneDiff, (oneDiff.get(thisOneDiff) ?? 0) + 1);
    eightDiff.set(thisEightDiff, (eightDiff.get(thisEightDiff) ?? 0) + 1);
    womFixDiff.set(thisWomFixDiff, (womFixDiff.get(thisWomFixDiff) ?? 0) + 1);
  }

  benchmark.report();
  benchmark.clearAll();

  //report zini differences
  let oneZiniOut = "One-way zini stats: \n";
  let oneZiniDiffSum = 0;
  for (let [key, val] of [...oneDiff.entries()].sort((a, b) => a[0] - b[0])) {
    oneZiniOut += `${key} | ${val}` + "\n";
    oneZiniDiffSum += key * val;
  }
  oneZiniOut += `Average-diff: ${oneZiniDiffSum / bulkIterations.value}`;
  console.log(oneZiniOut);

  let eightZiniOut = "Eight-way zini stats: \n";
  let eightZiniDiffSum = 0;
  for (let [key, val] of [...eightDiff.entries()].sort((a, b) => a[0] - b[0])) {
    eightZiniOut += `${key} | ${val}` + "\n";
    eightZiniDiffSum += key * val;
  }
  eightZiniOut += `Average-diff: ${eightZiniDiffSum / bulkIterations.value}`;
  console.log(eightZiniOut);

  let womFixZiniOut = "WoM L zini WITH FIX stats: \n";
  let womFixZiniDiffSum = 0;
  for (let [key, val] of [...womFixDiff.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    womFixZiniOut += `${key} | ${val}` + "\n";
    womFixZiniDiffSum += key * val;
  }
  womFixZiniOut += `Average-diff: ${womFixZiniDiffSum / bulkIterations.value}`;
  console.log(womFixZiniOut);
}

function bulkrun2() {
  //gather data that we can use to figure out for a given 3bv value on a given board, where the 99th percentile of subzini is

  let cutoff = 0.99;

  let bbbvsMap = new Map(); //Entries are another map from subzini => count

  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    let preprocessedData =
      Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    let bbbv = Algorithms.calc3bv(mines, false, preprocessedData).bbbv;

    let singleZini = Algorithms.calcBasicZini(
      mines,
      false,
      preprocessedData
    ).total;
    let eightZini = Algorithms.calcBasicZini(
      mines,
      true,
      preprocessedData
    ).total;

    //Find data so far for the particular 3bv value of this board
    let this3bvEntry = bbbvsMap.get(bbbv);
    if (!this3bvEntry) {
      this3bvEntry = new Map();
      bbbvsMap.set(bbbv, this3bvEntry);
    }

    //Increment data for this subzini amount on this board
    let amountBelowZini = singleZini - eightZini;

    this3bvEntry.set(
      amountBelowZini,
      (this3bvEntry.get(amountBelowZini) ?? 0) + 1
    );
  }

  let out = "";
  for (let [bbbvKey, bbbvEntry] of [...bbbvsMap.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    out += `Results for ${bbbvKey} 3bv:` + "\n";

    let totalCount = [...bbbvEntry.values()].reduce(
      (partialSum, a) => partialSum + a,
      0
    );
    let runningCount = 0; //Used to figure out when we cross xth percentile
    let subziniSum = 0;
    let gamesOverCutoff = 0;

    let cutoffHit = false;
    let cutoffCrossedDuring;

    //Loop through subzini values in order
    for (let [subziniKey, subziniAmount] of [...bbbvEntry.entries()].sort(
      (a, b) => a[0] - b[0]
    )) {
      runningCount += subziniAmount;
      subziniSum += subziniKey * subziniAmount;

      if (cutoffHit) {
        gamesOverCutoff += subziniAmount;
      }

      if (runningCount >= cutoff * totalCount && cutoffHit === false) {
        cutoffHit = true;
        cutoffCrossedDuring = subziniKey;
      }
    }

    const averageSubZini = subziniSum / totalCount;
    const averageSubziniPer3bv = averageSubZini / bbbvKey;

    out +=
      `Total games: ${totalCount}, cutoff-crossed-during-zini: ${cutoffCrossedDuring}, games over cutoff: ${gamesOverCutoff}` +
      "\n";
    out +=
      `Average subzini: ${averageSubZini.toPrecision(
        3
      )}, Average-zini-per-3bv: ${averageSubziniPer3bv.toPrecision(3)}` +
      "\n\n";
  }

  console.log(out);
}

function bulkrun3() {
  let targetHitCount = 0;

  let oldTriggeredTimes = 0;
  let oldSuccess = 0;
  let oldMissed = 0;

  let newTriggeredTimes = 0;
  let newSuccess = 0;
  let newMissed = 0;

  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    let preprocessedData =
      Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    let bbbv = Algorithms.calc3bv(mines, false, preprocessedData).bbbv;

    benchmark.startTime("single-zini");
    let singleZini = Algorithms.calcBasicZini(
      mines,
      false,
      preprocessedData
    ).total;
    benchmark.stopTime("single-zini");

    benchmark.startTime("eight-zini");
    let eightZini = Algorithms.calcBasicZini(
      mines,
      true,
      preprocessedData
    ).total;
    benchmark.stopTime("eight-zini");

    let oldCheckTriggered =
      bbbv / (bbbv - (bbbv - singleZini) * 1.15 - 2) >= minimumEff.value / 100;
    oldCheckTriggered && oldTriggeredTimes++;

    let newCheckTriggered =
      bbbv /
        (singleZini -
          Algorithms.get99thPercentileSubzini(
            boardWidth.value,
            boardHeight.value,
            boardMines.value,
            bbbv,
            singleZini
          )) >=
      minimumEff.value / 100;
    newCheckTriggered && newTriggeredTimes++;

    let wasTargetHit = bbbv / eightZini >= minimumEff.value / 100;

    if (wasTargetHit) {
      targetHitCount++;

      if (oldCheckTriggered) {
        oldSuccess++;
      } else {
        oldMissed++;
      }

      if (newCheckTriggered) {
        newSuccess++;
      } else {
        newMissed++;
      }

      console.log(
        `8way: ${eightZini}, single: ${singleZini}, oldTriggered:${oldCheckTriggered}, newTriggered:${newCheckTriggered} 3bv: ${bbbv}`
      );
    }
  }
  console.log(`8 way found: ${targetHitCount}`);

  console.log(`## OldCheck Summary ###.
  triggered: ${oldTriggeredTimes}, missed: ${oldMissed}, success: ${oldSuccess}`);

  console.log(`## NewCheck Summary ###.
  triggered: ${newTriggeredTimes}, missed: ${newMissed}, success: ${newSuccess}`);

  benchmark.report();
  benchmark.clearAll();
}

function bulkrun4() {
  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    benchmark.startTime("100zini");
    ChainZini.calcNWayChainZini({
      mines: mines,
      numberOfIterations: 100,
    });
    benchmark.stopTime("100zini");
  }
}

function bulkrun5() {
  console.time();
  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    let preprocessedData =
      Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    let bbbv = Algorithms.calc3bv(mines, false, preprocessedData).bbbv;

    if (bbbv !== 39) {
      continue;
    }

    let eightZini = Algorithms.calcBasicZini(
      mines,
      true,
      preprocessedData
    ).total;

    if (eightZini >= 26) {
      console.log("Found candidate");
      console.log(`EightZini: ${eightZini}`);

      let boardStats = new BoardStats(mines, null);
      let link = boardStats.getPttaLink();
      console.log(`Link:
      ${link}`);
    }
  }
  console.timeEnd();
}

function bulkrun6() {
  let results = {
    eightWay: {
      sum: 0,
      bests: 0,
    },
    nChain: {
      sum: 0,
      bests: 0,
    },
    minDeep: {
      sum: 0,
      bests: 0,
    },
    avgDeep: {
      sum: 0,
      bests: 0,
    },
    avgMinDeep: {
      sum: 0,
      bests: 0,
    },
    separateDeep: {
      sum: 0,
      bests: 0,
    },
  };

  for (let i = 0; i < bulkIterations.value; i++) {
    console.log(`Iteration ${i}`);

    //Find board with best eff out of 1000, and use that for benchmarking with
    let bestEffThisIteration = 0;
    let mines;
    for (let j = 0; j < 1000; j++) {
      let minesCandidate = BoardGenerator.basicShuffle(
        boardWidth.value,
        boardHeight.value,
        boardMines.value
      );
      let preprocessedData =
        Algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
          minesCandidate
        );
      let bbbv = Algorithms.calc3bv(
        minesCandidate,
        false,
        preprocessedData
      ).bbbv;
      let eightZini = Algorithms.calcBasicZini(
        minesCandidate,
        true,
        preprocessedData
      ).total;
      let eff = bbbv / eightZini;
      if (eff > bestEffThisIteration) {
        bestEffThisIteration = eff;
        mines = minesCandidate;
      }
    }

    //Compute diff zinis for this mines
    let eightZini = Algorithms.calcBasicZini(mines, true).total;

    benchmark.startTime("10000chain zini");
    let chainZini = ChainZini.calcNWayChainZini({
      mines: mines,
      numberOfIterations: 10000,
    }).total;
    benchmark.stopTime("10000chain zini");

    benchmark.startTime("min deep chain zini");
    let minDeepChainZini = ChainZini.calcInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 10,
      analysisType: "minimum",
    }).total;
    benchmark.stopTime("min deep chain zini");

    benchmark.startTime("average deep chain zini");
    let averageDeepChainZini = ChainZini.calcInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 10,
      analysisType: "average",
    }).total;
    benchmark.stopTime("average deep chain zini");

    benchmark.startTime("avgmin deep chain zini");
    let avgMinDeepChainZini = ChainZini.calcInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 10,
      analysisType: "average then minimum",
    }).total;
    benchmark.stopTime("avgmin deep chain zini");

    benchmark.startTime("separate deep chain zini");
    let separateDeepChainZini = ChainZini.calcNWayInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 10,
    }).total;
    benchmark.stopTime("separate deep chain zini");

    let best = Math.min(
      eightZini,
      chainZini,
      minDeepChainZini,
      averageDeepChainZini,
      avgMinDeepChainZini,
      separateDeepChainZini
    );

    eightZini === best && results.eightWay.bests++;
    chainZini === best && results.nChain.bests++;
    minDeepChainZini === best && results.minDeep.bests++;
    averageDeepChainZini === best && results.avgDeep.bests++;
    avgMinDeepChainZini === best && results.avgMinDeep.bests++;
    separateDeepChainZini === best && results.separateDeep.bests++;

    results.eightWay.sum += eightZini;
    results.nChain.sum += chainZini;
    results.minDeep.sum += minDeepChainZini;
    results.avgDeep.sum += averageDeepChainZini;
    results.avgMinDeep.sum += avgMinDeepChainZini;
    results.separateDeep.sum += separateDeepChainZini;

    console.log(
      `8-way: ${eightZini}, chain: ${chainZini}, min: ${minDeepChainZini}, avg: ${averageDeepChainZini}, avg-min: ${avgMinDeepChainZini}, separate: ${separateDeepChainZini}`
    );
  }

  benchmark.report();
  benchmark.clearAll();

  console.log("Results:");
  console.log(results);
}

function bulkrun7() {
  let ziniSum = 0;

  let csv = "womurl, janitor, separate\n";
  for (let i = 500; i < testGames.length; i++) {
    let testGame = testGames[i];

    let mines = BoardGenerator.readFromPtta(testGame.ptt);

    let separateDeepChainZini = ChainZini.calcNWayInclusionExclusionZini({
      mines: mines,
      numberOfIterations: 5,
    }).total;

    console.log(`
    Url: ${testGame.wom}
    Janitor: ${testGame.zini}, Separate DeepChain: ${separateDeepChainZini}
    `);

    if (testGame.zini < separateDeepChainZini) {
      throw new Error("DeepChain beaten!");
    }

    csv += `${testGame.wom}, ${testGame.zini}, ${separateDeepChainZini}` + "\n";

    ziniSum += separateDeepChainZini;
  }

  console.log(csv);
  console.log(`ziniSum: ${ziniSum}`);
}

function bulkrun8() {
  //Benchmarking run for zini algs
  effShuffleManager.doBenchmarkingRun({
    width: boardWidth.value,
    height: boardHeight.value,
    mineCount: boardMines.value,
    targetEff: minimumEff.value,
    iterations: bulkIterations.value,
  });
}

class Game {
  constructor() {}

  initialise() {
    //Called once at the start to set up the board object.
    this.board = new Board(mainCanvas, gameContainerDiv, route, router);
  }

  reset(isVariantChange = false) {
    if (!this.board) {
      window.alert("Board has not been initialised yet. Reset failed.");
      return;
    }

    this.board.resetBoard(isVariantChange);
  }

  resetAndUnfocus() {
    //Only needed for when radio buttons for beg/int/exp are clicked as otherwise they eat "space" inputs...
    this.reset();
    document.activeElement.blur();
  }

  unmount() {
    if (!this.board) {
      //Do nothing
      return;
    }

    this.board.boardRenderer.clearTimerTimeout();
    this.board.saveGameIfRunning();
    this.board.stopUrlWatch();
    this.board.ziniExplore?.killDeepChainZiniRunner();
    this.board.stats?.killDeepChainZiniRunner();

    this.board?.replay?.pause();
  }

  refreshSize() {
    if (!this.board) {
      //Do nothing, board will pick up new size once initialised.
      return;
    }

    this.board.boardRenderer.refreshCanvasSize();
  }

  handleMouseDown(event) {
    if (!this.board) {
      return;
    }

    this.board.boardInput.handleMouseDown(event);
  }

  handleMouseUp(event) {
    if (!this.board) {
      return;
    }

    this.board.boardInput.handleMouseUp(event);
  }

  handleMouseMove(event) {
    if (!this.board) {
      return;
    }

    this.board.boardInput.handleMouseMove(event, false, false);
  }

  handleMouseEnter(event) {
    if (!this.board) {
      return;
    }

    this.board.boardInput.handleMouseMove(event, true, false);
  }

  handleMouseLeave(event) {
    if (!this.board) {
      return;
    }

    this.board.boardInput.handleMouseMove(event, false, true);
  }

  handleTouchStart(event) {
    if (!this.board) {
      return;
    }

    this.board.boardInput.handleTouchStart(event);
  }

  handleTouchEnd(event) {
    if (!this.board) {
      return;
    }

    this.board.boardInput.handleTouchEnd(event);
  }

  handleTouchMove(event) {
    if (!this.board) {
      return;
    }

    this.board.boardInput.handleTouchMove(event);
  }

  handleTouchCancel(event) {
    if (!this.board) {
      return;
    }

    this.board.boardInput.handleTouchCancel(event);
  }
}

const benchmark = new Benchmark();
var game = new Game(); //Needs to be var to stop an access-before-init error
</script>
