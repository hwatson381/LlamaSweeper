<template>
  <q-page>
    <div class="q-pa-md">
      <p class="text-h4">Llama's minesweeper variants</p>
      <p>
        This page has several minesweeper variants/tools I've made. Variants can
        be changed with the "variant" dropdown below. This is a work in
        progress, so there may be bugs. Feedback is very welcome, although I
        can't promise that any suggestions will be added. Use the "variants
        info" button below to see what each variant does.
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
      >
        <span>Random dev stuff box</span><br />
        <button @click="bulkrun7">Bulk run</button>
        Iterations: <input v-model.number="bulkIterations" type="text" />
        <button @click="dialogTest">QDialog</button>
        <button @click="playSound('dig')">Play sound</button>
        <button @click="seedRandomTest">Seed Random</button>
      </div>
      <br />
      <div
        class="flex q-mb-md"
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
        class="flex q-gutter-sm"
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
      </div>
      <template
        v-if="
          boardSizePreset === 'custom' &&
          variant !== 'board editor' &&
          variant !== 'zini explorer'
        "
      >
        <div class="flex" style="gap: 10px; margin: 5px">
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
        </div>
        {{ customWarning }}
      </template>

      <q-card
        flat
        bordered
        style="max-width: 550px"
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
            <q-btn
              @click="pttaImportModal = true"
              color="secondary"
              label="ptt import"
            />
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
      <div v-if="variant === 'eff boards'">
        Generating boards with target eff: {{ minimumEff }}% (change this in
        settings below the board)
        <span v-if="generateEffBoardsInBackground" class="text-info"
          >{{ effBoardsStoredDisplayCount }}/20 (click:
          {{ effBoardsStoredFirstClickDisplay }})</span
        >
      </div>
      <div v-if="variant === 'mean openings'" class="flex q-mt-md">
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
        class="clearfix q-my-md"
        :style="{ paddingLeft: gameLeftPadding + 'px', userSelect: 'none' }"
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
              mobileScrollSetting === 'disable' ? 'none' : 'manipulation',
          }"
        >
        </canvas>
        <q-card
          square
          v-if="showStatsBlock"
          style="float: left; margin-bottom: 10px"
        >
          <q-card-section style="font-family: monospace">
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
            <div v-if="statsShowMaxEff && statsObject.maxEff !== null">
              Max Eff:
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
            <div v-if="statsShow8Way && statsObject.eightZini !== null">
              ZiNi (8-way): {{ statsObject.eightZini }}
            </div>
            <div v-if="statsShowChain && statsObject.chainZini !== null">
              ZiNi (100chain): {{ statsObject.chainZini }}
            </div>
            <div v-if="statsShowWomZini">
              ZiNi (WoM):
              <template v-if="statsObject.womZini !== null">
                {{ statsObject.womZini }} | improved: {{ statsObject.cWomZini }}
              </template>
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

              <div v-if="ziniRunnerActive">
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
            <br />
            <q-btn-dropdown color="primary" label="Send To">
              <q-list>
                <q-item
                  v-if="variant !== 'board editor'"
                  clickable
                  v-close-popup
                  @click="game.board.sendToBoardEditor()"
                >
                  <q-item-section>
                    <q-item-label>Board Editor</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item
                  v-if="variant !== 'zini explorer'"
                  clickable
                  v-close-popup
                  @click="game.board.sendToZiniExplorer()"
                >
                  <q-item-section>
                    <q-item-label>Zini Explorer</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item
                  clickable
                  v-close-popup
                  @click="game.board.sendToPttCalculator()"
                >
                  <q-item-section>
                    <q-item-label>PTT ZiNi Calculator</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item
                  clickable
                  v-close-popup
                  @click="game.board.sendToMsCoach()"
                >
                  <q-item-section>
                    <q-item-label>MSCoach Solver</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item
                  v-if="variant === 'board editor'"
                  clickable
                  v-close-popup
                  @click="game.board.copyBoardLink()"
                >
                  <q-item-section>
                    <q-item-label>Copy Board Link</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <br />
            <br />
            <q-btn-dropdown
              v-if="variant !== 'mean openings'"
              color="primary"
              label="Watch"
            >
              <q-list>
                <q-item
                  clickable
                  v-close-popup
                  @click="game.board.initReplay('replay')"
                >
                  <q-item-section>
                    <q-item-label>Replay</q-item-label>
                  </q-item-section>
                </q-item>

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
                    <q-item-label>WoM ZiNi</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item
                  clickable
                  v-close-popup
                  @click="game.board.initReplay('womzinifix')"
                >
                  <q-item-section>
                    <q-item-label>WoM ZiNi Improved</q-item-label>
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

                <q-item
                  clickable
                  v-close-popup
                  @click="game.board.initReplay('compare')"
                >
                  <q-item-section>
                    <q-item-label>Click loss/gain</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <q-btn
              v-else
              color="primary"
              label="Replay"
              @click="game.board.initReplay('replay')"
            ></q-btn>
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
            <div class="row justify-center">
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
            <br />
            <div class="row justify-center q-mb-md">
              <q-btn-dropdown color="primary" label="Send To">
                <q-list>
                  <q-item
                    clickable
                    v-close-popup
                    @click="game.board.sendToBoardEditor()"
                  >
                    <q-item-section>
                      <q-item-label>Board Editor</q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item
                    clickable
                    v-close-popup
                    @click="game.board.sendToPttCalculator()"
                  >
                    <q-item-section>
                      <q-item-label>PTT ZiNi Calculator</q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item
                    clickable
                    v-close-popup
                    @click="game.board.sendToMsCoach()"
                  >
                    <q-item-section>
                      <q-item-label>MSCoach Solver</q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item
                    clickable
                    v-close-popup
                    @click="game.board.copyBoardLink()"
                  >
                    <q-item-section>
                      <q-item-label>Copy Board Link</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </div>
            <div class="row justify-center">
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
        class="flex q-ma-md"
        style="gap: 10px"
        v-if="variant !== 'zini explorer'"
      >
        <q-btn
          @click="game.board.toggleQuickPaint()"
          color="secondary"
          label="QuickPaint (Q)"
          :disabled="variant === 'board editor' && isCurrentlyEditModeDisplay"
        >
        </q-btn>
        <template v-if="showQuickPaintOptions">
          <q-btn
            v-if="!quickPaintMinimalMode"
            @click="game.board.cycleQuickPaintMode()"
            color="secondary"
          >
            {{ quickPaintModeDisplay }} (w)
          </q-btn>
          <q-btn @click="game.board.clearClearableMarkings()" color="secondary">
            {{ quickPaintClearable }} (scrollclick)
          </q-btn>
          <q-btn @click="quickPaintHelpModal = true" color="secondary"
            >Help</q-btn
          >
        </template>
      </div>

      <q-card
        flat
        bordered
        style="max-width: 550px"
        class="q-my-md"
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
        </q-card-section>
      </q-card>

      <div class="q-py-md" style="max-width: 700px">
        <q-list bordered class="rounded-borders">
          <q-expansion-item
            expand-separator
            icon="tune"
            label="General settings"
            group="settings"
          >
            <q-card>
              <q-card-section>
                <q-checkbox v-model="zeroStart" label="Zero Start" />
                <br />
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
                    ,
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Face Hitbox"
                ></q-select>
                <q-checkbox v-model="statsShow8Way" label="Show 8-way ZiNi" />
                <br />
                <q-checkbox
                  v-model="statsShowChain"
                  label="Show 100chain ZiNi"
                />
                <br />
                <q-checkbox
                  v-model="statsShowWomZini"
                  label="Show WoM ZiNi and HZiNi"
                />
                <br />
                <q-checkbox v-model="statsShowMaxEff" label="Show max eff" />
                <div class="flex" style="gap: 15px">
                  <q-input
                    dense
                    rounded
                    outlined
                    style="width: 120px"
                    @keydown.prevent="
                      (event) => (keyboardClickDigKey = event.key)
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
                      (event) => (keyboardClickFlagKey = event.key)
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
                <q-checkbox
                  v-model="mobileModeEnabled"
                  label="Use Mobile Mode"
                /><br />
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
                <br v-else />
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
                ></q-select
                ><br />
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
                ></q-select
                ><br />
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
                  ]"
                  emit-value
                  map-options
                  stack-label
                  label="Mode toggle location"
                />
                <br />
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
                  v-model="verticalExpert"
                  label="Make expert boards portrait"
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
      <p>(textures from minesweeper.online)</p>
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
        Left padding
        <q-slider
          v-model="gameLeftPadding"
          :min="0"
          :max="1000"
          :step="1"
          label
          color="light-green"
        />
        <q-checkbox
          v-model="showBorders"
          label="Show borders"
          @update:model-value="game.refreshSize()"
        /><br />
        <q-checkbox
          v-model="showTimer"
          label="Show timer"
          @update:model-value="game.board.drawTopBar()"
        /><br />
        <q-checkbox
          v-model="showMineCount"
          label="Show mine count"
          @update:model-value="game.board.drawTopBar()"
        /><br />
        <q-checkbox
          v-model="showCoords"
          label="Show coordinates"
          @update:model-value="
            game.board.drawBorders();
            game.board.drawCoords();
          "
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
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
          v-focus
          @keyup.enter="game.board.importPttaBoard()"
        /><br />
        <q-btn @click="game.board.importPttaBoard()" color="primary"
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
              { label: 'WoM ZiNi', value: 'womzini' },
              { label: 'WoM ZiNi Improved', value: 'womzinifix' },
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

  <div
    v-if="mobileModeEnabled && !replayIsShown"
    :class="[
      {
        'flag-toggle': true,
        'flag-active': flagToggleActive,
      },
      flagToggleLocationClass,
      flagToggleSizeClass,
    ]"
    @click.prevent="flagToggleActive = !flagToggleActive"
  >
    <q-icon name="flag" :class="[flagToggleSizeClass, 'flag-toggle-icon']" />
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
</template>

<style scoped>
#main-canvas {
  user-select: none;
  float: left;
  margin-right: 10px;
  margin-bottom: 10px;
  touch-action: manipulation;
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
</style>

<script setup>
import {
  useTemplateRef,
  computed,
  ref,
  onMounted,
  onUnmounted,
  watchEffect,
  watch,
} from "vue";

import Benchmark from "src/classes/Benchmark.js";
import Algorithms from "src/classes/Algorithms";
import Replay from "src/classes/Replay";
import CompareReplay from "src/classes/CompareReplay";
import BoardStats from "src/classes/BoardStats";
import EffShuffleManager from "src/classes/EffShuffleManager";
import BoardGenerator from "src/classes/BoardGenerator";
import SkinManager from "src/classes/SkinManager";
import Tile from "src/classes/Tile";
import Utils from "src/classes/Utils";
import ZiniExplore from "src/classes/ZiniExplore";
import ChainZini from "src/classes/ChainZini";

import ReplayBar from "src/components/ReplayBar.vue";

import CONSTANTS from "src/includes/Constants";
import playSound from "src/includes/Sounds";

import seedrandom from "seedrandom";
import { useLocalStorage } from "@vueuse/core";

import testGames from "src/assets/janitor-test-data";

import { useRoute, useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();

import { event, useQuasar, copyToClipboard } from "quasar";
const $q = useQuasar();

defineOptions({
  name: "PlayPage",
});

onMounted(() => {
  document.body.addEventListener("keydown", handleKeyDown, true);
  document.body.addEventListener("keyup", handleKeyUp, true);
  window.addEventListener("scroll", handlePageScroll);
  skinManager.addCallbackWhenAllLoaded(() => {
    game.initialise();
  });
});

onUnmounted(() => {
  document.body.removeEventListener("keydown", handleKeyDown, true);
  document.body.removeEventListener("keyup", handleKeyUp, true);
  window.removeEventListener("scroll", handlePageScroll);
  game.unmount();
  effShuffleManager.killAllWorkers();
  game?.board?.replay?.pause();
});

function handleKeyDown(event) {
  if (event.key === keyboardClickDigKey.value) {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.sendKeyboardClick(true, false, true, event.timeStamp);
    return;
  }
  if (event.key === keyboardClickFlagKey.value) {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.sendKeyboardClick(false, true, true, event.timeStamp);
    return;
  }
  if (event.key === " " || event.key === "F2") {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.reset();
  }
  if (event.key === "q") {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.toggleQuickPaint();
    //event.preventDefault();
  }
  if (event.key === "w") {
    if (!checkFocusForKeyPress(event)) {
      return;
    }
    game.board.handleCycleQuickPaintModeKeypress();
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
  if (event.key === keyboardClickDigKey.value) {
    game.board.sendKeyboardClick(true, false, false, event.timeStamp);
  }
  if (event.key === keyboardClickFlagKey.value) {
    game.board.sendKeyboardClick(false, true, false, event.timeStamp);
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

  game.board.handlePageScroll(event);
}

function scrollToBoard() {
  const element = document.getElementById("main-canvas");
  element.scrollIntoView({
    behavior: "instant",
    block: "center",
    inline: "nearest",
  });
}

const mainCanvas = useTemplateRef("main-canvas");

let showStatsBlock = ref(false);
let statsObject = ref({
  isWonGame: null, //Affects whether we show estimate stats
  time: null,
  estTime: null,
  solved3bv: null,
  total3bv: null,
  bbbvs: null,
  eff: null,
  maxEff: null,
  deepMaxEff: null,
  clicks: {
    total: null,
    effective: null,
    wasted: null,
    left: null,
    leftWasted: null,
    chord: null,
    chordWasted: null,
    right: null,
    rightWasted: null,
  },
  eightZini: null,
  chainZini: null,
  womZini: null,
  womHzini: null,
  bestZini: null,
  pttaLink: null,
  deepZini: null,
});
let showStatsClicksTable = ref(false);
let statsShow8Way = useLocalStorage("ls_statsShow8Way", true);
let statsShowChain = useLocalStorage("ls_statsShowChain", true);
let statsShowWomZini = useLocalStorage("ls_statsShowWomZini", true);
let statsShowMaxEff = useLocalStorage("ls_statsShowMaxEff", true);

let settingsModal = ref(false);
let variantsHelpModal = ref(false);
let tileSizeSlider = useLocalStorage("ls_tileSizeSlider", 25);
let gameLeftPadding = useLocalStorage("ls_gameLeftPadding", 30);
let showBorders = useLocalStorage("ls_showBorders", true);
let showTimer = useLocalStorage("ls_showTimer", true);
let showMineCount = useLocalStorage("ls_showMineCount", true);
let showCoords = useLocalStorage("ls_showCoords", false);

//Dimensions for border
let boardHorizontalPadding = computed(() => {
  return showBorders.value ? Math.floor(tileSizeSlider.value / 2) : 0;
});
let boardTopPadding = computed(() => {
  const topPanelTopAndBottomBorder = Math.floor(tileSizeSlider.value / 2);
  const topPanelHeight = Math.floor(tileSizeSlider.value * 2);
  return showBorders.value
    ? topPanelHeight + 2 * topPanelTopAndBottomBorder
    : 0; //Around 3 * tileSize, but may be less if values are non-integer to prevent gaps
});
let boardBottomPadding = computed(() => {
  return showBorders.value ? Math.floor(tileSizeSlider.value / 2) : 0;
});
//More dimensions for top panel
let topPanelTopAndBottomBorder = computed(() => {
  return showBorders.value ? Math.floor(tileSizeSlider.value / 2) : 0;
});
let topPanelHeight = computed(() => {
  return showBorders.value ? Math.floor(tileSizeSlider.value * 2) : 0;
});

let pttaUrl = ref("");
let boardSizePreset = ref("beg"); //beg/int/exp. Mainly just used for showing correct thing in dropdown
let customWidth = useLocalStorage("ls_customWidth", 8);
let customHeight = useLocalStorage("ls_customHeight", 8);
let customMines = useLocalStorage("ls_customMines", 10);
let boardWidth = computed(() => {
  switch (boardSizePreset.value) {
    case "beg":
      return 9;
    case "int":
      return 16;
    case "exp":
      return verticalExpert.value ? 16 : 30;
    case "custom":
      return Math.floor(Utils.clamp(customWidth.value, 1, 100));
    default:
      throw new Error("Disallowed preset");
  }
});
let boardHeight = computed(() => {
  switch (boardSizePreset.value) {
    case "beg":
      return 9;
    case "int":
      return 16;
    case "exp":
      return verticalExpert.value ? 30 : 16;
    case "custom":
      return Math.floor(Utils.clamp(customHeight.value, 1, 100));
    default:
      throw new Error("Disallowed preset");
  }
});
let boardMines = computed(() => {
  switch (boardSizePreset.value) {
    case "beg":
      return 10;
    case "int":
      return 40;
    case "exp":
      return 99;
    case "custom":
      if (customMines.value >= customWidth.value * customHeight.value) {
        return Math.floor(
          Utils.clamp(customWidth.value * customHeight.value - 1, 0, 2500)
        );
      }
      return Math.floor(Utils.clamp(customMines.value, 0, 2500));
    default:
      throw new Error("Disallowed preset");
  }
});
let customWarning = computed(() => {
  if (customMines.value > customWidth.value * customHeight.value - 1) {
    return "Too many mines!";
  }
  if (customWidth.value * customHeight.value >= 900) {
    return "Large board! May be laggy - sorry! Hope to fix eventually...";
  }
  return "";
});

let variant = ref(Utils.routeNameToVariant(route.params.variant));

/* OK TO DELETE
// Change variant based on route
watch(
  () => route.params.variant,
  (newVariant) => {
    variant.value = Utils.routeNameToVariant(newVariant);
  }
);

// Change route when variant is changed from dropdown
watch(variant, (newVariant) => {
  let desiredRouteParam = Utils.variantToRouteName(newVariant);

  if (desiredRouteParam !== route.params.variant) {
    router.push({ name: "play", params: { variant: desiredRouteParam } });
    expectedQuery = {};
  }
});

let expectedQuery = {}; //Used to stop unnecessary query updates.

// Watch for query change
watch(
  () => route.query,
  (newQuery) => {
    function updateBoardForQueryChange() {
      if (game && game.board) {
        game.board.updateForQueryChange(newQuery);
      } else {
        //Wait a bit as game.board may be initialised later
        setTimeout(() => {
          updateBoardForQueryChange();
        }, 200);
      }
    }

    updateBoardForQueryChange();
  },
  { immediate: true }
);
*/

let zeroStart = useLocalStorage("ls_zeroStart", true);

let begEffPreset = ref(200);
let begEffOptions = Object.freeze([200, 210, 225, "custom"]);
let begEffCustom = useLocalStorage("ls_begEffCustom", 235);
const begEffSlowGenPoint = 210;
let intEffPreset = ref(160);
let intEffOptions = Object.freeze([160, 170, 180, "custom"]);
let intEffCustom = useLocalStorage("ls_intEffCustom", 190);
const intEffSlowGenPoint = 180;
let expEffPreset = ref(150);
let expEffOptions = Object.freeze([150, 160, 170, "custom"]);
let expEffCustom = useLocalStorage("ls_expEffCustom", 180);
const expEffSlowGenPoint = 170;
let customEffCustom = useLocalStorage("ls_customEffCustom", 150);
let generateEffBoardsInBackground = ref(false);
let effWebWorkerCount = ref(1);
let browserSupportsWebWorkers = window.Worker ? true : false;
let browserSupportsConcurrency =
  browserSupportsWebWorkers && window.navigator.hardwareConcurrency > 2;
let effBoardsStoredDisplayCount = ref(0);
let effBoardsStoredFirstClickDisplay = ref("random");
let effFirstClickType = ref("same");
let minimumEff = computed(() => {
  let minEff = 0;
  switch (boardSizePreset.value) {
    case "beg":
      minEff =
        begEffPreset.value === "custom"
          ? begEffCustom.value
          : begEffPreset.value;
      break;
    case "int":
      minEff =
        intEffPreset.value === "custom"
          ? intEffCustom.value
          : intEffPreset.value;
      break;
    case "exp":
      minEff =
        expEffPreset.value === "custom"
          ? expEffCustom.value
          : expEffPreset.value;
      break;
    case "custom":
      minEff = customEffCustom.value;
      break;
    default:
      throw new Error("Disallowed preset");
  }

  if (typeof minEff !== "number") {
    return 100;
  }

  return Utils.clamp(minEff, 100, 340);
});
let effBoardShowSlowGenerationWarning = computed(() => {
  //Whether we show a warning that generating the target eff on eff boards variant may be slow
  if (variant.value === "eff boards") {
    if (!window.Worker) {
      return false; //No point suggesting background generation if their device can't use web workers
    }
    switch (boardSizePreset.value) {
      case "beg":
        if (minimumEff.value >= begEffSlowGenPoint) {
          return true;
        }
        break;
      case "int":
        if (minimumEff.value >= intEffSlowGenPoint) {
          return true;
        }
        break;
      case "exp":
        if (minimumEff.value >= expEffSlowGenPoint) {
          return true;
        }
        break;
      case "custom":
        //Don't show warning for this as too complicated to figure out when it is slow
        break;
      default:
        throw new Error("Disallowed preset");
    }
  }
  return false;
});
//excellent eff affects whether we show eff stat in purple for eff boards.
let excellentEff = computed(() => {
  switch (boardSizePreset.value) {
    case "beg":
      return statsObject.value.eff >= 300;
    case "int":
      return statsObject.value.eff >= 220;
    case "exp":
      statsObject.value.eff >= 175;
    case "custom":
      return false;
    default:
      throw new Error("Disallowed preset");
  }

  return false;
});
let effWebWorkerCountOptions = [];
if (typeof window.navigator.hardwareConcurrency === "number") {
  for (let i = 1; i <= window.navigator.hardwareConcurrency; i = i * 2) {
    effWebWorkerCountOptions.push(i);
  }

  if (
    !effWebWorkerCountOptions.includes(window.navigator.hardwareConcurrency)
  ) {
    effWebWorkerCountOptions.push(window.navigator.hardwareConcurrency);
  }
} else {
  effWebWorkerCountOptions = [1];
}

watchEffect(() => {
  if (variant.value === "eff boards" && generateEffBoardsInBackground.value) {
    effShuffleManager && effShuffleManager.activateBackgroundGeneration();
  } else {
    effShuffleManager && effShuffleManager.deactivateBackgroundGeneration();
  }
});
watch([boardWidth, boardHeight, boardMines, minimumEff], () => {
  if (variant.value === "eff boards" && generateEffBoardsInBackground.value) {
    effShuffleManager && effShuffleManager.sendWorkersCurrentTaskDebounced();
  }
});

let showQuickPaintOptions = ref(false);
let quickPaintModeDisplay = ref("Guess");
let quickPaintClearable = ref("guesses");
let quickPaintInitialOnlyMines = useLocalStorage(
  "ls_quickPaintInitialOnlyMines",
  true
);
let quickPaintMinimalMode = useLocalStorage("ls_quickPaintMinimalMode", true);
let quickPaintOnlyTrivialLogic = useLocalStorage(
  "ls_quickPaintOnlyTrivialLogic",
  false
);
let quickPaintHelpModal = ref(false);

let editBoardUnappliedWidth = ref(9);
let editBoardUnappliedHeight = ref(9);
let pttaImportModal = ref(false);
let isCurrentlyEditModeDisplay = ref(true); //Lines up with game.board.gameStage = 'edit' - consider making ...gameStage a ref instead.

let flagToggleActive = ref(false); //Whether to swap left and right mouse buttons
let flagToggleLocationClass = useLocalStorage(
  "ls_flagToggleLocationClass",
  "toggle-bot-right"
);
let flagToggleSizeClass = useLocalStorage(
  "ls_flagToggleSizeClass",
  "toggle-normal"
);
let mobileModeEnabled = useLocalStorage(
  "ls_mobileModeEnabled",
  Utils.isMobile()
); //Flag toggle starts enabled on mobile, disabled on desktop
let mobileScrollSetting = useLocalStorage("ls_mobileScrollSetting", "enable"); //Affects whether touches can trigger scroll
let mobileEnclosedScrollLetThrough = useLocalStorage(
  "ls_mobileEnclosedScrollLetThrough",
  true
); //Whether clicks can still affect the board on enclosed setting (typically placing flags)
let scrollLetThroughActive = computed(
  () =>
    (mobileScrollSetting.value === "enclosed nf" ||
      mobileScrollSetting.value === "enclosed flag") &&
    mobileEnclosedScrollLetThrough.value
);
let touchRevealLocation = useLocalStorage("ls_touchRevealLocation", "start"); //Whether we use the location of the touch at the start of it or the end of it
let touchRevealTiming = useLocalStorage("ls_touchRevealTiming", "end"); //Does it reveal the tile on finger up or finger down
let touchLongPressTime = useLocalStorage("ls_touchLongPressTime", 250); //When does long press = flag (or dig) get triggered
let touchLongPressDisabled = useLocalStorage(
  "ls_touchLongPressDisabled",
  false
);
let touchMaxTime = useLocalStorage("ls_touchMaxTime", 1000); //When do long touches get cancelled (maybe these become scrolls?)
let touchScrollDistance = useLocalStorage("ls_touchScrollDistance", 3); //When do touches that move a lot unlock the scroll
let verticalExpert = useLocalStorage("ls_verticalExpert", false);
let faceHitbox = useLocalStorage("ls_faceHitbox", "bar"); //Hitbox for when the face is click to trigger a reset
let soundEffectsEnabled = useLocalStorage(
  "ls_soundEffectsEnabled",
  Utils.isMobile()
);

let meanOpeningMineDensity = useLocalStorage("ls_meanOpeningMineDensity", 0.3); //mean opening settings
let meanOpeningFlagDensity = useLocalStorage("ls_meanOpeningFlagDensity", 1);
let meanMineClickBehaviour = useLocalStorage(
  "ls_meanMineClickBehaviour",
  "shield"
); //flag, blast, shield for 0.5 seconds, ignore

let replayProgress = ref(-1);
let replayProgressRounded = ref("-1.000"); //Same as replayProgress, but only to 3 d.p.
let replayIsPlaying = ref(false);
let replayBarStartValue = ref(0); //First value that can be jumped to on replay bar
let replayBarLastValue = ref(100); //Last value that can be jumped to on replay bar
let replayTypeForceSteppy = ref(false);
let replayType = ref("accurate");
let replayIsShown = ref(false);
let replaySpeedMultiplier = ref(1);
let replayIsPanning = ref(false);
let replayIsInputting = ref(false);
let reorderZini = useLocalStorage("ls_reorderZini", false);
let replayShowHidden = useLocalStorage("ls_replayShowHidden", "transparent3");

let analyseDisplayMode = ref("classic");
let analyseAlgorithm = ref("incexzini");
let analyseAlgorithmScope = ref("beginning");
let analyseIterations = ref(100);
let analyseHistoryRewrite = ref(true);
let analyseDeepType = ref("separate");
let analyseDeepIterations = ref(5);
let analyseVisualise = ref(true);
let analyseForbid = ref(false);
let classicPathBreakdown = ref({
  lefts: 0,
  rights: 0,
  chords: 0,
  remaining3bv: 0,
});
let analyseZiniTotal = ref(0);
let analyse3bv = ref(0);
let analyseEff = ref(0);
let analyseShowPremiums = ref("none");
let analyseHiddenStyle = ref("transparent3");
let analyseAlgorithmScopeOptions = computed(() => {
  const withCurrentOpts = [
    {
      label: "From beginning",
      value: "beginning",
    },
    { label: "From current", value: "current" },
  ];
  const basicOpts = [
    {
      label: "From beginning",
      value: "beginning",
    },
  ];
  if (
    analyseAlgorithm.value === "8 way" ||
    analyseAlgorithm.value === "chainzini" ||
    analyseAlgorithm.value === "incexzini"
  ) {
    return withCurrentOpts;
  } else {
    return basicOpts;
  }
});
watchEffect(() => {
  if (
    analyseAlgorithm.value === "8 way" ||
    analyseAlgorithm.value === "chainzini" ||
    analyseAlgorithm.value === "incexzini"
  ) {
    //Do nothing
  } else {
    //Change scope to beginning if it's a disallowed value
    if (analyseAlgorithmScope.value !== "beginning") {
      analyseAlgorithmScope.value = "beginning";
    }
  }
});
let runZiniAlgorithmModal = ref(false);
let ziniRunnerActive = ref(false);
let synchronousZiniActive = ref(false);
let ziniRunnerExpectedDuration = ref("calculating...");
let ziniRunnerExpectedFinishTime = ref("calculating...");
let ziniRunnerIterationsDisplay = ref("");
let ziniRunnerPercentageProgress = ref("0%");

let keyboardClickOpenOnKeyDown = useLocalStorage(
  "ls_keyboardClickOpenOnKeyDown",
  false
);
let keyboardClickDigKey = useLocalStorage("ls_keyboardClickDigKey", "z");
let keyboardClickFlagKey = useLocalStorage("ls_keyboardClickFlagKey", "x");

const vFocus = {
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

  let womFixZiniOut = "WoM zini WITH FIX stats: \n";
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
    wasTargetHit && targetHitCount++;

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

      let boardStats = new BoardStats(mines, {});
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

function dialogTest() {
  $q.dialog({
    title: "Current click path",
    message: "Would you like to preserve the current click path?",
    ok: {
      flat: true,
      label: "Preserve",
    },
    cancel: {
      flat: true,
      label: "Reset",
    },
    persistent: true,
  })
    .onOk(() => {
      // console.log('>>>> OK')
    })
    .onCancel(() => {
      // console.log('>>>> Cancel')
    })
    .onDismiss(() => {
      // console.log('I am triggered on both OK and Cancel')
    });
}

function seedRandomTest() {
  var myrng = seedrandom(1);
  console.log(myrng());
  console.log(myrng());
  console.log(myrng());

  console.log(Math.random.toString());
}

class Game {
  constructor() {}

  initialise() {
    //Called once at the start to set up the board object.
    this.board = new Board(
      boardWidth.value,
      boardHeight.value,
      boardMines.value,
      tileSizeSlider.value,
      variant.value
    );
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
    game.reset();
    document.activeElement.blur();
  }

  unmount() {
    if (!this.board) {
      //Do nothing
      return;
    }

    this.board.clearTimerTimeout();
    this.board.saveGameIfRunning();
  }

  refreshSize() {
    if (!this.board) {
      //Do nothing, board will pick up new size once initialised.
      return;
    }

    this.board.refreshCanvasSize();
  }

  handleMouseDown(event) {
    if (!this.board) {
      return;
    }

    this.board.handleMouseDown(event);
  }

  handleMouseUp(event) {
    if (!this.board) {
      return;
    }

    this.board.handleMouseUp(event);
  }

  handleMouseMove(event) {
    if (!this.board) {
      return;
    }

    this.board.handleMouseMove(event, false, false);
  }

  handleMouseEnter(event) {
    if (!this.board) {
      return;
    }

    this.board.handleMouseMove(event, true, false);
  }

  handleMouseLeave(event) {
    if (!this.board) {
      return;
    }

    this.board.handleMouseMove(event, false, true);
  }

  handleTouchStart(event) {
    if (!this.board) {
      return;
    }

    this.board.handleTouchStart(event);
  }

  handleTouchEnd(event) {
    if (!this.board) {
      return;
    }

    this.board.handleTouchEnd(event);
  }

  handleTouchMove(event) {
    if (!this.board) {
      return;
    }

    this.board.handleTouchMove(event);
  }

  handleTouchCancel(event) {
    if (!this.board) {
      return;
    }

    this.board.handleTouchCancel(event);
  }
}

class Board {
  constructor() {
    this.gameStage = "uninitialised";
    this.updateTimerSetTimeoutHandle = null; //Handle for starting/stopping setTimeOut process that checks whether timer needs updating
    this.isLeftMouseDown = false;

    this.touchDepressedSquaresMap = new Map(); //Map from touch identifiers to depressed squares (for depressing squares on mobile)
    this.ongoingTouches = new Map(); //Track info about touches such as start location, time started etc.

    this.lastClientCoords = { clientX: 0, clientY: 0 }; //Coords used by keyboard clicks
    this.keyboardClickIsDigDown = false; //Used to help ignore repeating keys
    this.keyboardClickIsFlagDown = false; //Used to help ignore repeating keys

    //Boards used for "edit board" variant and "zini board" variant. These persist across resets.
    this.boardEditorMines = new Array(9)
      .fill(0)
      .map(() => new Array(9).fill(false));
    this.ziniExplorerMines = new Array(9)
      .fill(0)
      .map(() => new Array(9).fill(false));
    this.editingEditBoard = true;
    this.editingZiniBoard = true;

    this.ziniExplore = new ZiniExplore(this, {
      analyseDisplayMode,
      analyseAlgorithm,
      analyseAlgorithmScope,
      analyseIterations,
      analyseHistoryRewrite,
      analyseHiddenStyle,
      analyseDeepType,
      analyseDeepIterations,
      analyseVisualise,
      analyseForbid,
      classicPathBreakdown,
      analyseZiniTotal,
      analyse3bv,
      analyseEff,
      analyseShowPremiums,
      ziniRunnerActive,
      synchronousZiniActive,
      ziniRunnerExpectedDuration,
      ziniRunnerExpectedFinishTime,
      ziniRunnerIterationsDisplay,
      ziniRunnerPercentageProgress,
      replayIsShown,
    });

    watch(
      [() => route.params.variant, () => route.query],
      ([newUrlVariant, newQuery], [oldUrlVariant, oldQuery]) => {
        this.updateForUrlChange(
          newUrlVariant,
          newQuery,
          oldUrlVariant,
          oldQuery
        );
      },
      { immediate: true }
    );

    this.resetBoard(true);
  }

  resetBoard(isVariantChange = false) {
    this.regenerateUrlAndPushIfDifferent();
    if (
      !isVariantChange &&
      (this.variant === "board editor" || this.variant === "zini explorer") &&
      this.gameStage === "edit"
    ) {
      this.promptForClearingEditBoard();
      return;
    }

    if (
      isVariantChange &&
      (this.variant === "board editor" || this.variant === "zini explorer")
    ) {
      this.revertUnappliedWidthHeightSetting();
    }

    //Set to state of board pregame where everything is unrevealed and mines haven't been generated yet
    this.width = boardWidth.value;
    this.height = boardHeight.value;
    this.mineCount = boardMines.value;
    this.tileSize = tileSizeSlider.value;
    this.variant = variant.value;

    this.gameStage = "pregame";

    flagToggleActive.value = false;

    //Perhaps slightly confusing - for editable boards, set this.mines to refer to either the board editor or zini explorer.
    //This way it gets saved when we switch variants
    if (this.variant === "board editor") {
      this.mines = this.boardEditorMines;
    } else if (this.variant === "zini explorer") {
      this.mines = this.ziniExplorerMines;
    } else {
      this.unprocessedMeanZeros = [];
      this.meanMineStates = null; //Only matters for mean openings variant
      this.mines = null;
    }

    //board editor/zini explorer use different width/height/mines
    if (this.variant === "board editor" || this.variant === "zini explorer") {
      this.width = this.mines.length;
      this.height = this.mines[0].length;
      this.mineCount = this.mines.flat().filter((val) => val).length;
    }

    if (this.variant === "board editor" && this.editingEditBoard) {
      this.gameStage = "edit";
      isCurrentlyEditModeDisplay.value = true;
    } else if (this.variant === "zini explorer" && this.editingZiniBoard) {
      this.gameStage = "edit";
      isCurrentlyEditModeDisplay.value = true;
    } else if (this.variant === "zini explorer" && !this.editingZiniBoard) {
      this.gameStage = "analyse";
      isCurrentlyEditModeDisplay.value = false;
    } else {
      this.gameStage = "pregame";
      isCurrentlyEditModeDisplay.value = false;
    }

    this.hoveredSquare = { x: null, y: null }; //Square that is being hovered over
    this.touchDepressedSquaresMap = new Map(); //Map from touch identifiers to depressed squares (for depressing squares on mobile)

    this.resetTiles();

    if (this.gameStage === "edit") {
      this.openBoardForEdit();
    }

    this.blasted = false;
    this.openedTiles = 0;
    if (this.ziniExplore) {
      this.ziniExplore.killDeepChainZiniRunner();
    }
    if (this.stats) {
      this.stats.killDeepChainZiniRunner();
    }
    this.stats = null;
    this.unflagged = this.mineCount;
    this.integerTimer = 0;
    this.boardStartTime = 0;
    this.cursor = { x: null, y: null };
    if (this.replay) {
      this.replay.pause();
      replayIsShown.value = false;
    }
    this.replay = null;

    this.clearTimerTimeout();

    showStatsBlock.value = false;
    this.quickPaintActive = false;
    showQuickPaintOptions.value = false;
    this.quickPaintMode = "known"; //modes are 'known' for drawing red/green, 'guess' for orange/white, 'dots' for marking possible clicks
    quickPaintModeDisplay.value = "Known";
    this.isFirstQuickPaint = true;
    this.redCount = 0;
    this.orangeCount = 0;
    this.dotCount = 0;
    this.whiteOrangeCount = 0; //orange + white

    mainCanvas.value.width =
      this.width * tileSizeSlider.value + 2 * boardHorizontalPadding.value;
    mainCanvas.value.height =
      this.height * tileSizeSlider.value +
      boardTopPadding.value +
      boardBottomPadding.value;

    if (this.gameStage === "analyse") {
      if (!isVariantChange) {
        this.ziniExplore.clearCurrentPath();
      }
      this.ziniExplore.refreshForEditedBoard();
    }

    this.draw();
  }

  resetTiles() {
    this.tilesArray = new Array(this.width)
      .fill(0)
      .map(() =>
        new Array(this.height)
          .fill(0)
          .map(
            () => new Tile(CONSTANTS.UNREVEALED, { mainCanvas }, skinManager)
          )
      );
  }

  populateHiddenNumbers(type) {
    if (type === "none") {
      return;
    }

    //Transparent/dimmed numbers that can show during replays (amongst other use cases)
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.mines[x][y]) {
          switch (type) {
            case "mines":
              this.tilesArray[x][y].unrevealedState = "cl_mine";
              break;
            case "transparent":
              this.tilesArray[x][y].unrevealedState = "tr_mine";
              break;
            case "transparent2":
              this.tilesArray[x][y].unrevealedState = "cl_mine";
              break;
            case "transparent3":
              this.tilesArray[x][y].unrevealedState = "tr2_mine";
              break;
            /*
            case "closed numbers":
              this.tilesArray[x][y].unrevealedState = "cl_mine";
              break;
            */
            case "dimmed":
              this.tilesArray[x][y].unrevealedState = "dm_mine";
              break;
          }
        } else {
          const squareNumber = this.getNumberSurroundingMines(x, y, false);
          switch (type) {
            case "mines":
              //mines only, so don't draw numbeds
              this.tilesArray[x][y].unrevealedState = CONSTANTS.UNREVEALED;
              break;
            case "transparent":
              this.tilesArray[x][y].unrevealedState = "tr_" + squareNumber;
              break;
            case "transparent2":
              this.tilesArray[x][y].unrevealedState = "tr_" + squareNumber;
              break;
            case "transparent3":
              this.tilesArray[x][y].unrevealedState = "tr2_" + squareNumber;
              break;
            /*
            case "closed numbers":
              this.tilesArray[x][y].unrevealedState = "cl_" + squareNumber;
              break;
            */
            case "dimmed":
              this.tilesArray[x][y].unrevealedState = "dm_" + squareNumber;
              break;
          }
        }
      }
    }
  }

  saveGameIfRunning() {
    console.log("saving game (need to implement)");

    //TODO - code to serialise this game and save to boardHistory
  }

  refreshCanvasSize() {
    mainCanvas.value.width =
      this.width * tileSizeSlider.value + 2 * boardHorizontalPadding.value;
    mainCanvas.value.height =
      this.height * tileSizeSlider.value +
      boardTopPadding.value +
      boardBottomPadding.value;

    this.tileSize = tileSizeSlider.value;
    this.draw();
  }

  revertUnappliedWidthHeightSetting() {
    //For board editor and zini explorer, we use a different way to change board size.
    //Update the value shown for this in the width/height inputs to be the current value

    if (variant.value === "board editor") {
      editBoardUnappliedWidth.value = this.boardEditorMines.length;
      editBoardUnappliedHeight.value = this.boardEditorMines[0].length;
    } else if (variant.value === "zini explorer") {
      editBoardUnappliedWidth.value = this.ziniExplorerMines.length;
      editBoardUnappliedHeight.value = this.ziniExplorerMines[0].length;
    }
  }

  applyEditBoardWidthHeight() {
    if (
      typeof editBoardUnappliedWidth.value !== "number" ||
      typeof editBoardUnappliedHeight.value !== "number"
    ) {
      return;
    }

    editBoardUnappliedWidth.value = Utils.clamp(
      Math.floor(editBoardUnappliedWidth.value),
      1,
      100
    );
    editBoardUnappliedHeight.value = Utils.clamp(
      Math.floor(editBoardUnappliedHeight.value),
      1,
      100
    );

    this.width = editBoardUnappliedWidth.value;
    this.height = editBoardUnappliedHeight.value;

    const newBoardMines = new Array(editBoardUnappliedWidth.value)
      .fill(0)
      .map(() => new Array(editBoardUnappliedHeight.value).fill(false));

    if (variant.value === "board editor") {
      this.boardEditorMines = newBoardMines;
      this.mines = this.boardEditorMines; //set mines as a reference to board editor mines
    } else if (variant.value === "zini explorer") {
      this.ziniExplore.killDeepChainZiniRunner(); //Just in case
      this.ziniExplorerMines = newBoardMines;
      this.mines = this.ziniExplorerMines; //set mines as a reference to zini explorer mines
      this.ziniExplore.clearCurrentPath();
    }

    this.switchToEditMode();

    this.draw();
  }

  promptForClearingEditBoard() {
    //Prompt for clearing the edit board.

    //Check if already empty
    let isAlreadyEmpty = true;
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.mines[x][y]) {
          isAlreadyEmpty = false;
          break;
        }
      }
    }
    if (isAlreadyEmpty) {
      //Already empty, do nothing
      return;
    }

    $q.dialog({
      title: "Clear Board?",
      message: "Are you sure you want to clear the board?",
      ok: {
        flat: true,
        label: "Clear",
      },
      cancel: {
        flat: true,
        label: "Cancel",
      },
      persistent: true,
    }).onOk(() => {
      const newBoardMines = new Array(this.width)
        .fill(0)
        .map(() => new Array(this.height).fill(false));

      if (variant.value === "board editor") {
        this.boardEditorMines = newBoardMines;
        this.mines = this.boardEditorMines; //set mines as a reference to board editor mines
      } else if (variant.value === "zini explorer") {
        this.ziniExplorerMines = newBoardMines;
        this.mines = this.ziniExplorerMines; //set mines as a reference to zini explorer mines
        this.ziniExplore.clearCurrentPath();
      }

      this.switchToEditMode();

      this.draw();
    });
  }

  openBoardForEdit() {
    //Update tilesArray such that it corresponds to an open board with mines as per the appropriate mine board.

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.mines[x][y]) {
          this.tilesArray[x][y].state = CONSTANTS.MINE;
          continue;
        }

        let tileNumber = 0;
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (!this.checkCoordsInBounds(i, j)) {
              continue;
            }

            if (this.mines[i][j]) {
              tileNumber++;
            }
          }
        }

        this.tilesArray[x][y].state = tileNumber;
      }
    }
  }

  sendToBoardEditor() {
    //Button on stats window for copying a board from somewhere to the board editor
    if (this.variant === "board editor") {
      //Already on board editor, do nothing
      return;
    }

    this.boardEditorMines = this.mines;
    variant.value = "board editor";
    this.editingEditBoard = true;

    this.resetBoard(true); //full reset as needed for variant change.
  }

  sendToZiniExplorer() {
    //Button on stats window for copying a board from somewhere to the zini explorer
    if (this.variant === "zini explorer") {
      //Already on zini explorer, do nothing
      return;
    }

    this.ziniExplorerMines = this.mines;
    this.ziniExplore.clearCurrentPath();
    variant.value = "zini explorer";

    let pathWithoutWasted = this.stats.clicks.filter(
      (click) => !click.type.includes("wasted")
    );

    if (this.variant === "mean openings") {
      //Remove flags which were place on mean mines
      pathWithoutWasted = pathWithoutWasted.filter((c) => {
        if (c.type === "right" && this.meanMineStates[c.x][c.y].isMine) {
          return false;
        } else {
          return true;
        }
      });
    }

    //If it was a loss, also remove the final dig/chord
    if (this.stats.isWin === false) {
      pathWithoutWasted.pop();
    }

    this.resetBoard(true); //full reset as needed for variant change.
    this.ziniExplore.classicPath = structuredClone(pathWithoutWasted);
    this.switchToAnalyseMode();
  }

  sendToPttCalculator() {
    if (this.variant === "zini explorer") {
      //Need to compute pttaLink. Kinda hacky for zini explorer...
      let tempBoardStats = new BoardStats(this.mines, {});
      window.open(tempBoardStats.getPttaLink(), "_blank").focus();
    } else {
      window.open(statsObject.value.pttaLink, "_blank").focus();
    }
  }

  sendToMsCoach() {
    let msCoachParams = Algorithms.getCompressedData(
      this.tilesArray,
      this.mines
    );

    let msCoachUrl = `https://davidnhill.github.io/JSMinesweeper/index.html?board=${msCoachParams.width}x${msCoachParams.height}x${msCoachParams.mineCount}&analysis=${msCoachParams.analysis}`;

    window.open(msCoachUrl, "_blank").focus();
  }

  handleMouseDown(event) {
    if (mobileModeEnabled.value) {
      return;
    }

    const canvasCoords = this.eventToCanvasCoord(event);
    const flooredCoords = this.eventToFlooredTileCoords(event);
    const unflooredCoords = this.eventToUnflooredTileCoords(event);

    const coordsData = {
      canvasCoords,
      flooredCoords,
      unflooredCoords,
    };

    const isDigInput = event.button === 0;
    const isFlagInput = event.button === 2;
    const isMiddleClick = event.button === 1;
    const isTouchInput = false;
    const isDown = true;

    this.handlePointerInput(
      isDigInput,
      isFlagInput,
      isMiddleClick,
      isTouchInput,
      isDown,
      coordsData,
      event,
      "mouse"
    );

    return;
  }

  handleMouseUp(event) {
    if (mobileModeEnabled.value) {
      return;
    }

    const canvasCoords = this.eventToCanvasCoord(event);
    const flooredCoords = this.eventToFlooredTileCoords(event);
    const unflooredCoords = this.eventToUnflooredTileCoords(event);

    const coordsData = {
      canvasCoords,
      flooredCoords,
      unflooredCoords,
    };

    const isDigInput = event.button === 0;
    const isFlagInput = event.button === 2;
    const isMiddleClick = event.button === 1;
    const isTouchInput = false;
    const isDown = false;

    this.handlePointerInput(
      isDigInput,
      isFlagInput,
      isMiddleClick,
      isTouchInput,
      isDown,
      coordsData,
      event,
      "mouse"
    );

    return;
  }

  handleMouseMove(event, isEnter, isLeave) {
    if (mobileModeEnabled.value) {
      return;
    }

    //Update coords as would be used by keyboard clicks
    this.lastClientCoords.clientX = event.clientX;
    this.lastClientCoords.clientY = event.clientY;

    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return; //only track mouse when game is running or just before
    }

    if (this.quickPaintActive) {
      //Do nothing as quickpaint
      return;
    }
    if (this.gameStage === "edit") {
      //Do nothing as edit mode - consider disabling stats object entirely for this mode
      return;
    }

    let unflooredCoords = this.eventToUnflooredTileCoords(event);

    //checks if left mouse button down
    const isLeftDown =
      Boolean(event.buttons & 1) ||
      (this.keyboardClickIsDigDown && !keyboardClickOpenOnKeyDown.value);

    const requiresRedraw = this.mouseMove(
      unflooredCoords.tileX,
      unflooredCoords.tileY,
      isEnter,
      isLeave,
      isLeftDown
    );
    if (requiresRedraw) {
      this.draw();
    }
  }

  handleTouchStart(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    const touches = event.changedTouches;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if coniditons are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      const canvasCoords = this.eventToCanvasCoord(touch);
      const flooredCoords = this.eventToFlooredTileCoords(touch);
      const unflooredCoords = this.eventToUnflooredTileCoords(touch);

      const coordsData = {
        canvasCoords,
        flooredCoords,
        unflooredCoords,
      };

      let isScrollingTouch = false;
      if (
        mobileScrollSetting.value === "zero" &&
        this.tilesArray[flooredCoords.tileX]?.[flooredCoords.tileY]?.state === 0
      ) {
        //If we have the scroll on zeros setting then this touch gets blocked, and we let the touch through
        isScrollingTouch = true;
        shouldPreventDefault = false;
      }

      if (
        mobileScrollSetting.value === "enclosed nf" &&
        this.gameStage === "running" &&
        this.isTileEnclosed(flooredCoords.tileX, flooredCoords.tileY, false)
      ) {
        isScrollingTouch = true;
        shouldPreventDefault = false;
      }

      if (
        mobileScrollSetting.value === "enclosed flag" &&
        this.gameStage === "running" &&
        this.isTileEnclosed(flooredCoords.tileX, flooredCoords.tileY, true)
      ) {
        isScrollingTouch = true;
        shouldPreventDefault = false;
      }

      let isDigInput;
      let isFlagInput;

      if (mobileModeEnabled.value && flagToggleActive.value) {
        isDigInput = false;
        isFlagInput = true;
      } else {
        isDigInput = true;
        isFlagInput = false;
      }

      const isMiddleClick = false;
      const isTouchInput = true;

      let isDown;

      if (touchRevealTiming.value === "end") {
        isDown = true; //Normally the first touch is down, and the release is up (like mousedown/mouseup except for touches)
      } else if (touchRevealTiming.value === "start") {
        //This is very hacky
        isDown = false;
        //If we are timing it to reveal the square when the finger first makes contact
        //then we fake it by sending an "up" input immediately
        //Later on we deactivate the touch, so it doesn't get processed for a second time
      }

      const touchIdentifier = touch.identifier;

      const screenCoords = {
        x: touch.screenX,
        y: touch.screenY,
      };

      this.ongoingTouches.set(touchIdentifier, {
        startTime: event.timeStamp,
        startCoordsData: structuredClone(coordsData), //Ugly, but just in case it gets changed in handePointerInput function.
        startScreenCoords: screenCoords,
        active: true, //Changes to false if the touch is cancelled (e.g. it moved more than x distance or lasted more than y seconds)
        isScrollingTouch: isScrollingTouch,
      });

      if (isScrollingTouch && !scrollLetThroughActive.value) {
        //this touch is for scrolling, so doesn't need to be processed further
        continue;
      }

      this.handlePointerInput(
        isDigInput,
        isFlagInput,
        isMiddleClick,
        isTouchInput,
        isDown,
        coordsData,
        event,
        touchIdentifier
      );

      if (touchRevealTiming.value === "start") {
        //Since we already processed the touch on the start, we deactivate so it doesn't get processed again
        this.ongoingTouches.get(touchIdentifier).active = false;
      }
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }
  }

  handleTouchEnd(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    const touches = event.changedTouches;

    let redrawNeededForBlockedTouched = false;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if coniditons are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      //Get touch entry and delete it (whilst hanging onto reference inside this function)
      let thisTouch = this.ongoingTouches.get(touch.identifier);
      this.ongoingTouches.delete(touch.identifier);

      if (thisTouch.isScrollingTouch) {
        shouldPreventDefault = false;
        if (!scrollLetThroughActive.value) {
          continue;
        }
      }

      let isDigInput;
      let isFlagInput;

      const isLongPress =
        !touchLongPressDisabled.value &&
        event.timeStamp - thisTouch.startTime >= touchLongPressTime.value;

      //Note - below is the same as doing isFlagMode XOR isLongPress
      if (mobileModeEnabled.value && flagToggleActive.value != isLongPress) {
        isDigInput = false;
        isFlagInput = true;
      } else {
        isDigInput = true;
        isFlagInput = false;
      }

      const isMiddleClick = false;
      const isTouchInput = true;
      const isDown = false;
      const touchIdentifier = touch.identifier;

      const endCanvasCoords = this.eventToCanvasCoord(touch);
      const endFlooredCoords = this.eventToFlooredTileCoords(touch);
      const endUnflooredCoords = this.eventToUnflooredTileCoords(touch);

      const endCoordsData = {
        canvasCoords: endCanvasCoords,
        flooredCoords: endFlooredCoords,
        unflooredCoords: endUnflooredCoords,
      };

      let coordsData;

      if (touchRevealLocation.value === "start") {
        coordsData = thisTouch.startCoordsData;
      } else if (touchRevealLocation.value === "end") {
        coordsData = endCoordsData;
      } else if (touchRevealLocation.value === "block") {
        //Check touch start and touch end are on the same square. Otherwise cancel the touch
        //But only if the touch is on the board, otherwise use end location
        if (
          this.checkCoordsInBounds(
            endCoordsData.flooredCoords.tileX,
            endCoordsData.flooredCoords.tileY
          )
        ) {
          if (
            thisTouch.startCoordsData.flooredCoords.tileX ===
              endCoordsData.flooredCoords.tileX &&
            thisTouch.startCoordsData.flooredCoords.tileY ===
              endCoordsData.flooredCoords.tileY
          ) {
            coordsData = endCoordsData;
          } else {
            //Cancel touch on board as it started and ended on different square
            thisTouch.active = false;
          }
        } else {
          coordsData = endCoordsData;
        }
      }

      //Check if touch has exceeded max time
      if (event.timeStamp - thisTouch.startTime >= touchMaxTime.value) {
        //Cancel touch if it has went on too long
        thisTouch.active = false;
      }

      //Check touch has moved max distance
      if (
        Math.sqrt(
          (touch.screenX - thisTouch.startScreenCoords.x) ** 2 +
            (touch.screenY - thisTouch.startScreenCoords.y) ** 2
        ) /
          this.tileSize >=
        touchScrollDistance.value
      ) {
        //Cancel touch as it has moved too much
        thisTouch.active = false;
      }

      if (!thisTouch.active) {
        //Touch was deactivated, so remove depressed square if needed and exit instead of processing further
        this.updateDepressedSquares(null, null, isDown, touchIdentifier);
        redrawNeededForBlockedTouched = true;
        continue;
      }

      this.handlePointerInput(
        isDigInput,
        isFlagInput,
        isMiddleClick,
        isTouchInput,
        isDown,
        coordsData,
        event,
        touchIdentifier
      );
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (redrawNeededForBlockedTouched) {
      this.draw();
    }
  }

  handleTouchMove(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //NOTE - currently we don't save position changes to stats, but we may start doing this in the future
    //It's a bit more complicated than tracking the mouse as there can be multiple simultaneous paths
    //that start and stop. So we'd also have to save identifier information

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return; //only track touch moves when game is running or just before
    }
    if (this.quickPaintActive) {
      //Do nothing as quickpaint
      return;
    }
    if (this.gameStage === "edit") {
      //Do nothing as edit mode
      return;
    }

    const touches = event.changedTouches;

    let requiresRedraw = false;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if coniditons are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      let thisTouch = this.ongoingTouches.get(touch.identifier);

      if (thisTouch.isScrollingTouch) {
        shouldPreventDefault = false;
        if (!scrollLetThroughActive.value) {
          continue; //This touch is scrolling, so no need to process further
        }
      }

      if (!thisTouch.active) {
        continue;
      }

      let needsDeactivating = false;

      //Check if touch has exceeded max time
      if (event.timeStamp - thisTouch.startTime >= touchMaxTime.value) {
        needsDeactivating = true;
      }

      //Check touch has moved max distance
      if (
        Math.sqrt(
          (touch.screenX - thisTouch.startScreenCoords.x) ** 2 +
            (touch.screenY - thisTouch.startScreenCoords.y) ** 2
        ) /
          this.tileSize >=
        touchScrollDistance.value
      ) {
        needsDeactivating = true;
      }

      if (needsDeactivating) {
        thisTouch.active = false;
        this.updateDepressedSquares(null, null, false, touch.identifier);
        requiresRedraw = true;
        continue;
      }

      if (touchRevealLocation.value === "end") {
        const flooredCoords = this.eventToFlooredTileCoords(touch);

        const isDown = true;
        const touchIdentifier = touch.identifier;

        let thisTouchNeededRedraw = this.updateDepressedSquares(
          flooredCoords.tileX,
          flooredCoords.tileY,
          isDown,
          touchIdentifier
        );

        if (thisTouchNeededRedraw) {
          requiresRedraw = true;
        }
      }
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (requiresRedraw) {
      this.draw();
    }
  }

  handleTouchCancel(event) {
    if (!mobileModeEnabled.value) {
      return;
    }

    //Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

    const touches = event.changedTouches;

    let requiresRedraw = false;

    let shouldPreventDefault = false;
    if (
      (mobileScrollSetting.value === "zero" ||
        mobileScrollSetting.value === "enclosed nf" ||
        mobileScrollSetting.value === "enclosed flag") &&
      this.gameStage === "running"
    ) {
      //If zero, we assume that the scroll gets prevented, but then stop if conditions are met
      shouldPreventDefault = true;
    }

    for (let touch of touches) {
      let thisTouch = this.ongoingTouches.get(touch.identifier);
      this.ongoingTouches.delete(touch.identifier);

      if (thisTouch.isScrollingTouch) {
        shouldPreventDefault = false;
        if (!scrollLetThroughActive.value) {
          continue;
        }
      }

      if (!thisTouch.active) {
        continue;
      }

      const isDown = false;
      const touchIdentifier = touch.identifier;

      let thisTouchNeededRedraw = this.updateDepressedSquares(
        null,
        null,
        isDown,
        touchIdentifier
      );

      if (thisTouchNeededRedraw) {
        requiresRedraw = true;
      }
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (requiresRedraw) {
      this.draw();
    }
  }

  sendKeyboardClick(isDigInput, isFlagInput, isDown, timeStamp) {
    //Sends a keyboard click base on the last location of mouseMove
    //Very hacky

    if (mobileModeEnabled.value) {
      //Just in case - tbh it might be possible to allow this, but simpler to not.
      return;
    }

    if (isDigInput) {
      //defend against repeating keys
      if (isDown && this.keyboardClickIsDigDown) {
        return;
      }
      if (isDown) {
        this.keyboardClickIsDigDown = true;
      }
      if (!isDown) {
        this.keyboardClickIsDigDown = false;
      }
    }

    if (isFlagInput) {
      //defend against repeating keys
      if (isDown && this.keyboardClickIsFlagDown) {
        return;
      }
      if (isDown) {
        this.keyboardClickIsFlagDown = true;
      }
      if (!isDown) {
        this.keyboardClickIsFlagDown = false;
      }
    }

    //If they have the setting for it, we do digs on key down instead of up
    //We do this by faking a key up input, and blocking the real key up
    //This is very hacky
    if (isDigInput && !isDown && keyboardClickOpenOnKeyDown.value) {
      //Block key up from doing anything
      return;
    }
    if (isDigInput && isDown && keyboardClickOpenOnKeyDown.value) {
      //Convert key down into key up
      isDown = false;
    }

    let fakeEvent = {
      clientX: this.lastClientCoords.clientX,
      clientY: this.lastClientCoords.clientY,
      timeStamp: timeStamp,
    };

    const canvasCoords = this.eventToCanvasCoord(fakeEvent);
    const flooredCoords = this.eventToFlooredTileCoords(fakeEvent);
    const unflooredCoords = this.eventToUnflooredTileCoords(fakeEvent);

    const coordsData = {
      canvasCoords,
      flooredCoords,
      unflooredCoords,
    };

    const isMiddleClick = false;
    const isTouchInput = false;

    this.handlePointerInput(
      isDigInput,
      isFlagInput,
      isMiddleClick,
      isTouchInput,
      isDown,
      coordsData,
      fakeEvent,
      "mouse"
    );

    return;
  }

  handlePageScroll(event) {
    //On mobile, if the page starts scrolling, we should cancel all active touches.
    //Try keep this function fast as page scroll gets called a lot

    let redrawRequired = false;

    for (let touch of this.ongoingTouches.values()) {
      if (!touch.active) {
        continue; //Touch already cancelled, so skip it
      }

      touch.active = false;

      const isDown = false;
      const touchIdentifier = touch.identifier;

      let thisTouchNeededRedraw = this.updateDepressedSquares(
        null,
        null,
        isDown,
        touchIdentifier
      );

      if (thisTouchNeededRedraw) {
        redrawRequired = true;
      }
    }

    if (redrawRequired) {
      this.draw();
    }
  }

  handlePointerInput(
    isDigInput,
    isFlagInput,
    isMiddleClick,
    isTouchInput,
    isDown,
    coordsData,
    event,
    touchIdentifier
  ) {
    //generic handler for left/right up/down and also touch

    let isDrawRequired = false;

    const mouseDownOrTouchUp =
      (!isTouchInput && isDown) || (isTouchInput && !isDown);

    let flooredCoords = coordsData.flooredCoords;
    let unflooredCoords = coordsData.unflooredCoords;
    let canvasCoords = coordsData.canvasCoords;

    // ########## Check for face click #############

    //Check for face click and exit early if it was clicked on
    if (
      (!isTouchInput && isDigInput && !isDown) ||
      (isTouchInput && (isDigInput || isFlagInput) && !isDown)
    ) {
      let wasClickOnFace = this.attemptFaceClick(
        canvasCoords,
        flooredCoords,
        touchIdentifier
      );
      if (wasClickOnFace) {
        //Don't process click further
        this.draw(); //just in case
        return; //Note that this includes clicks on face that then got cancelled.
      }
    }

    // ############### Section for mostly mouse down stuff #################

    //Handle clicks in quickpaint, and exit early
    if (this.quickPaintActive && this.gameStage === "running") {
      if (mouseDownOrTouchUp) {
        this.handleQuickPaintClick(
          flooredCoords.tileX,
          flooredCoords.tileY,
          isDigInput,
          isFlagInput,
          isMiddleClick,
          event
        );
        this.draw();
      }
      return;
    }

    //handle clicks in edit mode and exit early if nothing to do
    if (this.gameStage === "edit") {
      if (mouseDownOrTouchUp && (isDigInput || isFlagInput)) {
        this.handleEditClick(flooredCoords.tileX, flooredCoords.tileY);
        this.draw();
      }

      return;
    }

    //handle clicks in analyse mode (used by zini explorer)
    if (this.gameStage === "analyse") {
      if (mouseDownOrTouchUp) {
        this.handleZiniExploreClick(
          flooredCoords.tileX,
          flooredCoords.tileY,
          isDigInput,
          isFlagInput
        );
        this.draw();
      }
      return;
    }

    //handle clicks in replay mode and exit early if nothing to do
    if (this.gameStage === "replay") {
      if (mouseDownOrTouchUp && (isDigInput || isFlagInput)) {
        this.handleReplayClick(flooredCoords.tileX, flooredCoords.tileY);
        this.draw();
      }

      return;
    }

    //Depress squares when hovered over with mouse down
    if (
      (this.gameStage === "running" || this.gameStage === "pregame") &&
      isDown &&
      isDigInput
    ) {
      isDrawRequired = this.holdDownDig(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Depress squares when hovered over with flag toggled on with mobile (chord on flag mode)
    if (this.gameStage === "running" && isDown && isFlagInput && isTouchInput) {
      isDrawRequired = this.holdDownTouchFlag(
        flooredCoords.tileX,
        flooredCoords.tileY,
        touchIdentifier
      );
    }

    //Flag square for mouse
    if (
      this.gameStage === "running" &&
      isDown &&
      isFlagInput &&
      !isTouchInput
    ) {
      this.attemptFlag(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        true,
        true
      );
      isDrawRequired = true;
    }

    // ############### Section for mostly mouse up stuff #################

    //Do first click on board
    if (this.gameStage === "pregame" && !isDown && isDigInput) {
      const generationResult = this.generateBoard(
        flooredCoords.tileX,
        flooredCoords.tileY
      );
      if (generationResult.success) {
        this.gameStage = "running";
        //Game then continues with the code below providing the click to open the first square.
        //Slightly hacky, but we also optionally change where the first click is if the board
        //received requires a different first click
        if (generationResult.rewrittenFirstClick) {
          //unflooredCoords as these are what attemptChordOrDig uses.
          unflooredCoords.tileX = generationResult.rewrittenFirstClick.x;
          unflooredCoords.tileY = generationResult.rewrittenFirstClick.y;
        }
      } else {
        this.updateDepressedSquares(
          flooredCoords.tileX,
          flooredCoords.tileY,
          false,
          touchIdentifier
        );
        this.draw();
        return; //Don't start game. Click not inbounds, or something else went wrong
      }
    }

    let needToCheckForWinOrLoss = false;

    //Try to chord or open square (e.g. mouse left click)
    if (this.gameStage === "running" && !isDown && isDigInput) {
      this.attemptChordOrDig(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier,
        event.timeStamp
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Try to flag or chord (when the flag toggle is active on mobile)
    if (
      this.gameStage === "running" &&
      isFlagInput &&
      !isDown &&
      isTouchInput
    ) {
      this.attemptFlagOrChord(
        unflooredCoords.tileX,
        unflooredCoords.tileY,
        touchIdentifier
      );
      needToCheckForWinOrLoss = true;
      isDrawRequired = true;
    }

    //Edge case - cancel mobile long-press flag input in pregame (otherwise depressed squares get stuck)
    if (
      this.gameStage === "pregame" &&
      isFlagInput &&
      !isDown &&
      isTouchInput
    ) {
      isDrawRequired = this.updateDepressedSquares(
        flooredCoords.tileX,
        flooredCoords.tileY,
        false,
        touchIdentifier
      );
    }

    //Check if an opening has occured on mean openings
    if (
      this.variant === "mean openings" &&
      this.unprocessedMeanZeros?.length !== 0
    ) {
      this.makeOpeningMean(event.timeStamp);
    }

    //Check if board is complete (note that checking gameStage is redundant but defensive)
    if (this.gameStage === "running" && needToCheckForWinOrLoss) {
      if (this.blasted) {
        this.doLose();
      } else if (this.checkWin()) {
        this.doWin();
      }
    }

    if (isDrawRequired) {
      this.draw();
    }
  }

  generateBoard(tileX, tileY) {
    let rewrittenFirstClick = false; //Some generations will change where the first click is

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return { success: false };
    }

    const firstClick = {
      x: tileX,
      y: tileY,
    };

    if (this.variant === "eff boards") {
      const effBoardResult = BoardGenerator.effBoardShuffle(
        this.width,
        this.height,
        this.mineCount,
        firstClick,
        effShuffleManager
      );

      if (effBoardResult === false) {
        return { success: false }; //Failed to generate eff board
      }

      this.mines = effBoardResult.mines;

      if (effBoardResult.firstClick) {
        rewrittenFirstClick = effBoardResult.firstClick;
      }
    } else if (
      this.variant === "board editor" ||
      this.variant === "zini explorer"
    ) {
      //Do nothing as this.mines is constant on these modes, so doesn't need to be regenerated?
    } else if (this.variant === "mean openings") {
      //meanMineStates 2d array tracks which squares contain mines that will only show once an opening is opened
      this.meanMineStates = new Array(this.width).fill(0).map(() =>
        new Array(this.height).fill(0).map(() => {
          let singleMeanSquare = {
            isMine: false, //all squares start off with no mean mines
            changedToMineTimestamp: null,
            startsFlagged: null, //if revealed, should be a flag or unrevealed?
            isActive: false, //used during replays - whether the square is "in play" (e.g. acts like a mine if it is one)
            isLocked: false, //whether the square's final state has been decided
          };
          return singleMeanSquare;
        })
      );
      this.unprocessedMeanZeros = []; //List of recently opened coords that need processing to check if they can have a mean mine.
      this.mines = BoardGenerator.basicShuffle(
        this.width,
        this.height,
        this.mineCount,
        firstClick,
        zeroStart.value
      );
    } else {
      this.mines = BoardGenerator.basicShuffle(
        this.width,
        this.height,
        this.mineCount,
        firstClick,
        zeroStart.value
      );
    }

    //Refresh tiles
    this.resetTiles();

    this.stats = new BoardStats(this.mines, {
      statsObject,
      statsShow8Way,
      statsShowChain,
      statsShowWomZini,
      statsShowMaxEff,
      ziniRunnerActive,
      ziniRunnerExpectedDuration,
      ziniRunnerExpectedFinishTime,
      ziniRunnerIterationsDisplay,
      ziniRunnerPercentageProgress,
    });
    this.boardStartTime = performance.now();
    this.clearTimerTimeout(); //defensive as it should already be disabled since we reset board.
    this.updateTimerSetTimeoutHandle = setTimeout(
      this.updateIntegerTimerIfNeeded.bind(this),
      100
    );

    return { success: true, rewrittenFirstClick: rewrittenFirstClick };
  }

  updateIntegerTimerIfNeeded() {
    let newTimerValue = Math.floor(this.getTime());

    if (newTimerValue !== this.integerTimer) {
      this.integerTimer = newTimerValue;
      this.drawTopBar();
    }

    this.updateTimerSetTimeoutHandle = setTimeout(
      this.updateIntegerTimerIfNeeded.bind(this),
      100
    );
  }

  clearTimerTimeout() {
    //May refactor in future. Disables setTimeout for timer
    if (this.updateTimerSetTimeoutHandle !== null) {
      clearTimeout(this.updateTimerSetTimeoutHandle);
    }
  }

  getTime() {
    return (performance.now() - this.boardStartTime) / 1000;
  }

  checkCoordsInBounds(tileX, tileY) {
    if (tileX === null || tileY === null) {
      //Just in case
      return false;
    }

    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return false;
    }

    return true;
  }

  eventToCanvasCoord(event) {
    //Get coords relative to canvas
    const canvasRawX =
      event.clientX - mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - mainCanvas.value.getBoundingClientRect().top;

    return { canvasRawX, canvasRawY };
  }

  eventToUnflooredTileCoords(event) {
    //Extracts tile coords from mouseEvent. But not floored
    const canvasRawX =
      event.clientX - mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - mainCanvas.value.getBoundingClientRect().top;

    const boardRawX = canvasRawX - boardHorizontalPadding.value;
    const boardRawY = canvasRawY - boardTopPadding.value;

    let tileX = boardRawX / this.tileSize;
    let tileY = boardRawY / this.tileSize;

    return { tileX, tileY };
  }

  eventToFlooredTileCoords(event) {
    //Extracts tile coords from mouseEvent. These are floored
    let { tileX, tileY } = this.eventToUnflooredTileCoords(event);
    let flooredCoords = this.unflooredToFlooredTileCoords(tileX, tileY);

    return flooredCoords; //format is {tileX: ..., tileY: ...}
  }

  unflooredToFlooredTileCoords(tileX, tileY) {
    //Floors both tileX and tileY
    return { tileX: Math.floor(tileX), tileY: Math.floor(tileY) };
  }

  attemptFlag(
    unflooredTileX,
    unflooredTileY,
    includeInStats = false,
    hasSoundEffect = false
  ) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (this.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED) {
      //Flag the square
      hasSoundEffect && soundEffectsEnabled.value && playSound("flag");
      this.tilesArray[tileX][tileY].state = CONSTANTS.FLAG;
      this.unflagged--;
      if (
        this.mines[tileX][tileY] ||
        (this.variant === "mean openings" &&
          this.meanMineStates[tileX][tileY].isMine)
      ) {
        //Flags on correct square count towards effective clicks
        includeInStats &&
          this.stats.addRight(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
      } else {
        //Flags on incorrect square are wasted
        includeInStats &&
          this.stats.addWastedRight(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
      }
    } else if (this.tilesArray[tileX][tileY].state === CONSTANTS.FLAG) {
      //Unflag a square
      hasSoundEffect && soundEffectsEnabled.value && playSound("flag");
      this.tilesArray[tileX][tileY].state = CONSTANTS.UNREVEALED;
      this.unflagged++;
      includeInStats &&
        this.stats.addWastedRight(
          tileX,
          tileY,
          unflooredTileX,
          unflooredTileY,
          time
        );
    } else {
      //Wasted flag input
      includeInStats &&
        this.stats.addWastedRight(
          tileX,
          tileY,
          unflooredTileX,
          unflooredTileY,
          time
        );
    }
  }

  attemptChordOrDig(
    unflooredTileX,
    unflooredTileY,
    touchIdentifier,
    eventTimestamp
  ) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    this.updateDepressedSquares(tileX, tileY, false, touchIdentifier); //Undepress square as we have just done leftMouseUp

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (typeof this.tilesArray[tileX][tileY].state === "number") {
      //Attempt chord tile
      this.chord(
        tileX,
        tileY,
        true,
        time,
        unflooredTileX,
        unflooredTileY,
        true
      );
    } else if (this.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED) {
      //Attempt to dig tile, although this behaviour may be changed on mean openings mode
      let doDig = true;

      if (
        this.variant === "mean openings" &&
        this.meanMineStates[tileX][tileY].isMine
      ) {
        //Clicked on a mean mine. So this either blasts, flags, shields or ignores depending on settings

        if (meanMineClickBehaviour.value === "blast") {
          //Do nothing as we will blast later since doDig is set
          doDig = true; //defensive
        } else if (meanMineClickBehaviour.value === "flag") {
          //Click becomes a flag instead
          doDig = false;
          this.tilesArray[tileX][tileY].state = CONSTANTS.FLAG;
          this.unflagged--;
          this.stats.addRight(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
        } else if (meanMineClickBehaviour.value === "shield") {
          //Waste if click occurred within 0.5s, otherwise blast
          if (
            eventTimestamp <=
            this.meanMineStates[tileX][tileY].changedToMineTimestamp + 500
          ) {
            //Click occred soon after mean mine was placed, click just gets wasted
            doDig = false;
            this.stats.addWastedLeft(
              tileX,
              tileY,
              unflooredTileX,
              unflooredTileY,
              time
            );
          } else {
            //Click happened after, so should blast
            doDig = true; //defensive
          }
        } else if (
          meanMineClickBehaviour.value === "ignore" ||
          meanMineClickBehaviour.value === "chordable"
        ) {
          doDig = false;
          //Not sure whether it is best to waste click or ignore it entirely. I've chosen to waste as maybe people care about clicks per second stat.
          this.stats.addWastedLeft(
            tileX,
            tileY,
            unflooredTileX,
            unflooredTileY,
            time
          );
        } else {
          throw new Error("illegal value for meanMineClickBehaviour");
        }
      }

      if (doDig) {
        this.openTile(tileX, tileY, true);
        this.stats.addLeft(tileX, tileY, unflooredTileX, unflooredTileY, time);
      }
    } else {
      this.stats.addWastedLeft(
        tileX,
        tileY,
        unflooredTileX,
        unflooredTileY,
        time
      );
    }
  }

  attemptFlagOrChord(unflooredTileX, unflooredTileY, touchIdentifier) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    //Undepress square as we have just done ended a touch input
    //Note that flag touch inputs on numbers will depress surrounding squares as this does a chord
    this.updateDepressedSquares(tileX, tileY, false, touchIdentifier);

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (typeof this.tilesArray[tileX][tileY].state === "number") {
      //Attempt chord tile
      this.chord(
        tileX,
        tileY,
        true,
        time,
        unflooredTileX,
        unflooredTileY,
        true
      );
    } else {
      //Try to flag the square
      //Code is slightly scuffed since this repeats some checks (such as square inbounds), but I'm too lazy to fix
      this.attemptFlag(unflooredTileX, unflooredTileY, true, true);
    }
  }

  holdDownDig(tileX, tileY, touchIdentifier) {
    //Don't track this in stats yet (but may add in future)
    //All this does is depress the current square or surrounding squares as the user pressed down left mouse
    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      true,
      touchIdentifier
    );

    return requiresRedraw;
  }

  holdDownTouchFlag(tileX, tileY, touchIdentifier) {
    let requiresRedraw;

    //Only depress stuff if hovering over a number (i.e. for a chord)
    if (typeof this.tilesArray[tileX]?.[tileY]?.state === "number") {
      requiresRedraw = this.updateDepressedSquares(
        tileX,
        tileY,
        true,
        touchIdentifier
      );
    } else {
      requiresRedraw = this.updateDepressedSquares(
        null,
        null,
        true,
        touchIdentifier
      );
    }

    return requiresRedraw;
  }

  openTile(x, y, hasSoundEffect = false) {
    if (!this.checkCoordsInBounds(x, y)) {
      return; //ignore squares outside board
    }

    //Opens a square, possibly triggering an opening recursively
    if (this.tilesArray[x][y].state !== CONSTANTS.UNREVEALED) {
      return;
    }

    const isNormalMine = this.mines[x][y];
    const isMeanMine =
      this.variant === "mean openings" &&
      this.meanMineStates[x][y].isMine &&
      this.meanMineStates[x][y].isActive;

    if (isNormalMine || isMeanMine) {
      this.tilesArray[x][y].state = CONSTANTS.MINERED;
      this.blasted = true;
    } else {
      hasSoundEffect && soundEffectsEnabled.value && playSound("dig");
      const number = this.getNumberSurroundingMines(x, y);
      this.tilesArray[x][y].state = number;
      this.openedTiles++;

      if (number === 0) {
        if (this.variant === "mean openings") {
          this.unprocessedMeanZeros.push({ x, y });
        }
        this.chord(x, y, false);
      }
    }
  }

  mouseMove(unflooredTileX, unflooredTileY, isEnter, isLeave, isLeftDown) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      isLeftDown,
      "mouse"
    );

    if (this.gameStage !== "pregame") {
      if (isEnter) {
        this.stats.addMouseEnter(unflooredTileX, unflooredTileY, time);
      } else if (isLeave) {
        this.stats.addMouseLeave(unflooredTileX, unflooredTileY, time);
      } else {
        this.stats.addMouseMove(unflooredTileX, unflooredTileY, time);
      }
    }

    return requiresRedraw;
  }

  updateDepressedSquares(
    tileX,
    tileY,
    newIsLeftMouseDownValue,
    touchIdentifier = "mouse"
  ) {
    //Handle depressing squares when left mouse is down and over an square or a number (in which case this "prepares" the chord)

    //Set tileX/tileY to null if out of bounds
    if (!this.checkCoordsInBounds(tileX, tileY)) {
      tileX = null;
      tileY = null;
    }

    //Find out where the current hovered square is and whether it is depressed.
    //This works a bit differently for touches as we can have multiple depressed at once
    let isCurrentlyDown;
    let currentLocation;

    if (touchIdentifier === "mouse") {
      isCurrentlyDown = this.isLeftMouseDown;
      currentLocation = this.hoveredSquare;
    } else {
      isCurrentlyDown = this.touchDepressedSquaresMap.has(touchIdentifier);
      if (isCurrentlyDown) {
        currentLocation = this.touchDepressedSquaresMap.get(touchIdentifier);
      } else {
        currentLocation = { x: null, y: null };
      }
    }

    const leftMouseDownChanged = isCurrentlyDown !== newIsLeftMouseDownValue;
    const hoveredSquareMoved =
      tileX !== currentLocation.x || tileY !== currentLocation.y;

    if (!hoveredSquareMoved && !leftMouseDownChanged) {
      const requiresRedraw = false;
      return requiresRedraw;
    }

    //Maybe slightly excessive and inefficient, but easier to clear out hover and reapply each time rather than going through all cases

    let clearHover = (hoverSquareX, hoverSquareY) => {
      for (let x = hoverSquareX - 1; x <= hoverSquareX + 1; x++) {
        for (let y = hoverSquareY - 1; y <= hoverSquareY + 1; y++) {
          if (this.tilesArray[x]?.[y]) {
            this.tilesArray[x][y].depressed = false;
          }
        }
      }
    };

    //Clear out old hover (3x3 block so we don't have to check whether it was a chord or singleton)
    //clear mouse hover
    if (
      this.hoveredSquare.x !== null &&
      this.hoveredSquare.y !== null &&
      this.isLeftMouseDown
    ) {
      clearHover(this.hoveredSquare.x, this.hoveredSquare.y);
    }
    //clear touch hover
    for (let touchedSquare of this.touchDepressedSquaresMap.values()) {
      if (touchedSquare.x !== null && touchedSquare.y !== null) {
        clearHover(touchedSquare.x, touchedSquare.y);
      }
    }

    //Update which squares we store as being hovered
    if (touchIdentifier === "mouse") {
      //for mouse
      this.hoveredSquare.x = tileX;
      this.hoveredSquare.y = tileY;
      this.isLeftMouseDown = newIsLeftMouseDownValue;
    } else {
      //for touch
      if (newIsLeftMouseDownValue) {
        //add if newly touched square
        this.touchDepressedSquaresMap.set(touchIdentifier, {
          x: tileX,
          y: tileY,
        });
      } else {
        //remove if no longer touched
        this.touchDepressedSquaresMap.delete(touchIdentifier);
      }
    }

    //Apply new hover for all squares (from touch and from mouse)
    let applyHover = (hoverSquareX, hoverSquareY) => {
      //Single square
      if (
        this.tilesArray[hoverSquareX][hoverSquareY].state ===
        CONSTANTS.UNREVEALED
      ) {
        this.tilesArray[hoverSquareX][hoverSquareY].depressed = true;
      }

      //Chord
      if (
        typeof this.tilesArray[hoverSquareX][hoverSquareY].state === "number"
      ) {
        for (let x = hoverSquareX - 1; x <= hoverSquareX + 1; x++) {
          for (let y = hoverSquareY - 1; y <= hoverSquareY + 1; y++) {
            //Note that the middle square automatically gets excluded as it's been revealed
            if (this.tilesArray[x]?.[y]?.state === CONSTANTS.UNREVEALED) {
              this.tilesArray[x][y].depressed = true;
            }
          }
        }
      }
    };

    //apply mouse hover
    if (
      this.hoveredSquare.x !== null &&
      this.hoveredSquare.y !== null &&
      this.isLeftMouseDown
    ) {
      applyHover(this.hoveredSquare.x, this.hoveredSquare.y);
    }
    //apply touch hover
    for (let touchedSquare of this.touchDepressedSquaresMap.values()) {
      if (touchedSquare.x !== null && touchedSquare.y !== null) {
        applyHover(touchedSquare.x, touchedSquare.y);
      }
    }

    const requiresRedraw = true;
    return requiresRedraw;
  }

  clearAllDepressedSquares() {
    this.hoveredSquare = { x: null, y: null };
    this.isLeftMouseDown = false;
    this.touchDepressedSquaresMap.clear();
  }

  getNumberSurroundingMines(x, y, includeMeanMines = false) {
    let count = 0;
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (i === x && j === y) {
          continue; //dont count square itself
        }
        if (!this.checkCoordsInBounds(i, j)) {
          continue; //ignore squares outside board
        }
        const isNormalMine = this.mines[i][j];
        const isMeanMine =
          includeMeanMines &&
          this.meanMineStates[i][j].isMine &&
          this.meanMineStates[i][j].isActive;
        if (isNormalMine || isMeanMine) {
          count++;
        }
      }
    }

    return count;
  }

  getNumberSurroundingFlags(x, y) {
    let count = 0;
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (i === x && j === y) {
          continue; //dont count square itself
        }
        if (!this.checkCoordsInBounds(i, j)) {
          continue; //ignore squares outside board
        }

        const isChordableMeanMine =
          this.variant === "mean openings" &&
          meanMineClickBehaviour.value === "chordable" &&
          this.meanMineStates[i][j].isMine &&
          this.meanMineStates[i][j].isActive;

        if (
          this.tilesArray[i][j].state === CONSTANTS.FLAG ||
          isChordableMeanMine
        ) {
          count++;
        }
      }
    }

    return count;
  }

  chord(
    x,
    y,
    includeInStats = false,
    time = 0,
    unflooredX = undefined,
    unflooredY = undefined,
    hasSoundEffect = false
  ) {
    if (!this.checkCoordsInBounds(x, y)) {
      return; //ignore squares outside board
    }

    if (typeof this.tilesArray[x][y].state !== "number") {
      return; //Can only chord numbers
    }

    const isChordedTileZero = this.tilesArray[x][y].state === 0;

    if (!isChordedTileZero) {
      hasSoundEffect && soundEffectsEnabled.value && playSound("chord");
    }

    if (
      this.tilesArray[x][y].state === this.getNumberSurroundingFlags(x, y) ||
      isChordedTileZero
    ) {
      let hadUnrevealedNeighbour = false;

      //Correct number of flags (or a zero tile), so do chord
      for (let i = x - 1; i <= x + 1; i++) {
        for (let j = y - 1; j <= y + 1; j++) {
          if (i === x && j === y) {
            continue; //don't open square itself
          }
          if (!this.checkCoordsInBounds(i, j)) {
            continue; //ignore squares outside board
          }
          if (
            isChordedTileZero &&
            this.tilesArray[i][j].state === CONSTANTS.FLAG
          ) {
            //Openings will open everything around them and annihilate neighbouring flags.
            //Note that because we change the state to CONSTANTS.UNREVEALED, it then gets opened by follow if statement
            this.tilesArray[i][j].state = CONSTANTS.UNREVEALED;
            this.unflagged++;
          }
          const isChordableMeanMine =
            this.variant === "mean openings" &&
            meanMineClickBehaviour.value === "chordable" &&
            this.meanMineStates[i][j].isMine &&
            this.meanMineStates[i][j].isActive;
          if (
            this.tilesArray[i][j].state === CONSTANTS.UNREVEALED &&
            !isChordableMeanMine
          ) {
            this.openTile(i, j);
            hadUnrevealedNeighbour = true;
          }
        }
      }
      if (includeInStats) {
        if (hadUnrevealedNeighbour) {
          this.stats.addChord(x, y, unflooredX, unflooredY, time);
        } else {
          this.stats.addWastedChord(x, y, unflooredX, unflooredY, time);
        }
      }
    } else {
      if (includeInStats) {
        this.stats.addWastedChord(x, y, unflooredX, unflooredY, time);
      }
    }
  }

  doLose() {
    const finalTime = this.getTime();
    soundEffectsEnabled.value && playSound("lose");
    this.blast();
    this.gameStage = "lost";
    this.stats.addEndTime(finalTime, false);
    this.stats.makeRepeatFlagsWasted();
    if (this.gameStage === "mean openings") {
      this.stats.addMeanMines(this.meanMineStates);
    }
    this.clearAllDepressedSquares();
    this.clearTimerTimeout();
    this.integerTimer = Math.floor(finalTime);
    this.calculateAndDisplayStats(false);
  }

  blast() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const isNormalMine = this.mines[x][y];
        const isMeanMine =
          this.variant === "mean openings" &&
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive;

        if (
          (isNormalMine || isMeanMine) &&
          this.tilesArray[x][y].state !== CONSTANTS.FLAG &&
          this.tilesArray[x][y].state !== CONSTANTS.MINERED
        ) {
          this.tilesArray[x][y].state = CONSTANTS.MINE;
        }

        if (
          !(isNormalMine || isMeanMine) &&
          this.tilesArray[x][y].state === CONSTANTS.FLAG
        ) {
          this.tilesArray[x][y].state = CONSTANTS.MINEWRONG;
        }
      }
    }
  }

  doWin() {
    const finalTime = this.getTime();
    soundEffectsEnabled.value && playSound("win");
    this.markRemainingFlags();
    this.gameStage = "won";
    this.stats.addEndTime(finalTime, true);
    this.stats.makeRepeatFlagsWasted();
    if (this.gameStage === "mean openings") {
      this.stats.addMeanMines(this.meanMineStates);
    }
    this.clearAllDepressedSquares();
    this.clearTimerTimeout();
    this.integerTimer = Math.floor(finalTime);
    this.calculateAndDisplayStats(true);
  }

  markRemainingFlags() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const isNormalMine = this.mines[x][y];
        const isMeanMine =
          this.variant === "mean openings" &&
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive;

        if (
          (isNormalMine || isMeanMine) &&
          this.tilesArray[x][y].state === CONSTANTS.UNREVEALED
        ) {
          this.tilesArray[x][y].state = CONSTANTS.FLAG;
        }
      }
    }

    this.unflagged = 0;
  }

  checkWin() {
    if (this.width * this.height - this.mineCount === this.openedTiles) {
      return true;
    } else {
      return false;
    }
  }

  makeOpeningMean(eventTimestamp) {
    //Runs through newly opened zeros and attempts to make them a mine.

    //Randomly set some of these squares to be provisional mines
    for (let zero of this.unprocessedMeanZeros) {
      if (this.meanMineStates[zero.x][zero.y].isLocked) {
        //Locked mines have their state set from before
        continue;
      }

      if (Math.random() < meanOpeningMineDensity.value) {
        this.meanMineStates[zero.x][zero.y].isMine = true;
        this.meanMineStates[zero.x][zero.y].changedToMineTimestamp =
          eventTimestamp;
      }
    }

    //https://stackoverflow.com/a/31054543
    let shuffledUnprocessedUnlockedZeros = this.unprocessedMeanZeros
      .filter((n) => !this.meanMineStates[n.x][n.y].isLocked)
      .map((n) => [Math.random(), n])
      .sort()
      .map((n) => n[1]);

    //Do another pass to make sure each new mine can be deduced from basic logic
    for (let zero of shuffledUnprocessedUnlockedZeros) {
      if (!this.meanMineStates[zero.x][zero.y].isMine) {
        continue;
      }

      let neighbours = [
        { x: zero.x - 1, y: zero.y - 1 },
        { x: zero.x - 1, y: zero.y },
        { x: zero.x - 1, y: zero.y + 1 },
        { x: zero.x, y: zero.y - 1 },
        { x: zero.x, y: zero.y + 1 },
        { x: zero.x + 1, y: zero.y - 1 },
        { x: zero.x + 1, y: zero.y },
        { x: zero.x + 1, y: zero.y + 1 },
      ];
      neighbours = neighbours.filter((square) =>
        this.checkCoordsInBounds(square.x, square.y)
      );

      let hasGoodNeighbour = false; //A good neighbour is one that tells us this square is a mine

      //Check number neighbours to see if any of them can determine this square to be a mine
      for (let neighbour of neighbours) {
        if (this.meanMineStates[neighbour.x][neighbour.y].isMine) {
          //If the neighbour is a mine then it gives no info, keep looking.
          continue;
        }

        //Check if the neighbour is "maxed out" - that is, all it's surrounding unrevealed squares are mines.
        let neighbourNeighbours = [
          { x: neighbour.x - 1, y: neighbour.y - 1 },
          { x: neighbour.x - 1, y: neighbour.y },
          { x: neighbour.x - 1, y: neighbour.y + 1 },
          { x: neighbour.x, y: neighbour.y - 1 },
          { x: neighbour.x, y: neighbour.y + 1 },
          { x: neighbour.x + 1, y: neighbour.y - 1 },
          { x: neighbour.x + 1, y: neighbour.y },
          { x: neighbour.x + 1, y: neighbour.y + 1 },
        ];
        neighbourNeighbours = neighbourNeighbours.filter((square) =>
          this.checkCoordsInBounds(square.x, square.y)
        );

        let foundUnrevealedSafe = false;

        for (let neighbourNeighbour of neighbourNeighbours) {
          //Check if the neighbour to our main cell has neighbours that are unrevealed safe
          if (
            this.tilesArray[neighbourNeighbour.x][neighbourNeighbour.y]
              .state === CONSTANTS.UNREVEALED &&
            !this.mines[neighbourNeighbour.x][neighbourNeighbour.y] &&
            !this.meanMineStates[neighbourNeighbour.x][neighbourNeighbour.y]
              .isMine
          ) {
            foundUnrevealedSafe = true;
            break;
          }
        }

        if (!foundUnrevealedSafe) {
          //Neighbour is surrounded by mines or safe squares.
          // It is good as it tells us our square is a mine.
          hasGoodNeighbour = true;
          break;
        }
      }

      //If we have a read on our square, then keep it as a mine
      //Otherwise, we need to "unmine" one of the neighbouring mines
      //or, barring that, unmine the square itself.

      //Good case - keep this square a mine
      if (hasGoodNeighbour) {
        continue;
      }

      const mineNeighbours = neighbours.filter(
        (n) => this.meanMineStates[n.x][n.y].isMine
      );

      if (mineNeighbours.length !== 0) {
        //Bad case - try to change a neighbour square to a non-mine
        const randomMineNeighbour =
          mineNeighbours[Math.floor(Math.random() * mineNeighbours.length)];

        this.meanMineStates[randomMineNeighbour.x][
          randomMineNeighbour.y
        ].isMine = false;
        this.meanMineStates[randomMineNeighbour.x][
          randomMineNeighbour.y
        ].changedToMineTimestamp = null;
      } else {
        //Very bad case - change the square itself to be a non-mine
        this.meanMineStates[zero.x][zero.y].isMine = false;
        this.meanMineStates[zero.x][zero.y].changedToMineTimestamp = null;
      }
    }

    let cellsThatNeedNumber = [];

    //Do a final pass to make sure number states are updated and squares with means mines are revealed

    for (let zero of this.unprocessedMeanZeros) {
      this.meanMineStates[zero.x][zero.y].isActive = true;
      this.meanMineStates[zero.x][zero.y].isLocked = true;

      if (this.meanMineStates[zero.x][zero.y].isMine) {
        //Close squares with mean mines, or change to flag
        if (Math.random() < meanOpeningFlagDensity.value) {
          this.tilesArray[zero.x][zero.y].state = CONSTANTS.FLAG;
          this.meanMineStates[zero.x][zero.y].startsFlagged = true;
        } else {
          this.unflagged++;
          this.tilesArray[zero.x][zero.y].state = CONSTANTS.UNREVEALED;
          this.meanMineStates[zero.x][zero.y].startsFlagged = false;
        }
      }

      //Mark neighbours that need to have their number calculated
      for (let x = zero.x - 1; x <= zero.x + 1; x++) {
        for (let y = zero.y - 1; y <= zero.y + 1; y++) {
          if (
            this.checkCoordsInBounds(x, y) &&
            !this.meanMineStates[x][y].isMine
          ) {
            cellsThatNeedNumber.push({ x, y });
          }
        }
      }
    }

    //De-duplicate the list of cellsThatNeedNumber
    //https://stackoverflow.com/questions/2218999/how-to-remove-all-duplicates-from-an-array-of-objects
    cellsThatNeedNumber = cellsThatNeedNumber.filter(
      (square, index, self) =>
        index ===
        self.findIndex(
          (otherSquare) =>
            otherSquare.x === square.x && otherSquare.y === square.y
        )
    );

    //Compute numbers to show for all cells that need this
    for (let cell of cellsThatNeedNumber) {
      this.tilesArray[cell.x][cell.y].state = this.getNumberSurroundingMines(
        cell.x,
        cell.y,
        true
      );
    }

    //Truncate as all squares have been processed
    this.unprocessedMeanZeros = [];
  }

  resetMeanMinesActiveness() {
    //Used during replays - an active mean mine is one that has been opened via an opening
    //And so the next click on it will blast (dependent on settings)

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.meanMineStates[x][y].isActive = false;
      }
    }
  }

  isTileEnclosed(tileX, tileY, useFlagVersion) {
    //Check if a tile is surrounded in such a way that we trivially
    // know that all it's neighbours are revealed or known mines

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      return false;
    }

    if (this.gameStage !== "running") {
      throw new Error("Enclosed setting should only apply during running game");
    }

    //As an initial check, look to see if any of the 3x3 block centred on tileX, tileY
    //have squares that are safe, but unrevealed

    for (let x = tileX - 1; x <= tileX + 1; x++) {
      for (let y = tileY - 1; y <= tileY + 1; y++) {
        if (!this.checkCoordsInBounds(x, y)) {
          continue;
        }
        const isMeanMine =
          this.variant === "mean openings" &&
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive;

        const isNormalOrMeanMine = this.mines[x][y] || isMeanMine;

        if (
          typeof this.tilesArray[x][y].state !== "number" &&
          !isNormalOrMeanMine
        ) {
          //Found square in 3x3 block that is unrevealed and safe. So return false as the centre square is not enclosed by known mines
          return false;
        }
      }
    }

    //In the more complicate case, we need to work out which squares surrounding the centre tile are obvious mines
    //Look at the 5x5 block of numbers, and collect the list of mines which are confirmed by these

    //Confirmed mines: {x: number, y: number} coord pairs of squares known to be mines
    //Ideally, we'd use a set for this, and remove duplicated, but it's neglibile for performance
    let confirmedMines = [];

    //Get mines confirmed by 5x5 block centred on tileX, tileY
    for (let x = tileX - 2; x <= tileX + 2; x++) {
      for (let y = tileY - 2; y <= tileY + 2; y++) {
        if (!this.checkCoordsInBounds(x, y)) {
          continue;
        }
        if (typeof this.tilesArray[x][y].state !== "number") {
          continue;
        }

        confirmedMines = confirmedMines.concat(
          this.getMinesConfirmedByTile(x, y)
        );
      }
    }

    //Check mines in 3x3 block centred on tileX, tileY to make sure they are all confirmed
    for (let x = tileX - 1; x <= tileX + 1; x++) {
      for (let y = tileY - 1; y <= tileY + 1; y++) {
        if (!this.checkCoordsInBounds(x, y)) {
          continue;
        }
        if (typeof this.tilesArray[x][y].state === "number") {
          continue;
        }

        //Note - these tiles are guaranteed to be mines due to the loop we did at the start of the method
        if (
          !confirmedMines.some(
            (confMine) => x === confMine.x && y === confMine.y
          )
        ) {
          //Return false as we have found a mine in the 3x3 block that isn't confirmed by basic logic
          return false;
        }
      }
    }

    //Special case for flaggers. Tiles that can be flagged to use in a chord should not be scrollable
    if (
      this.tilesArray[tileX][tileY].state === CONSTANTS.UNREVEALED &&
      useFlagVersion
    ) {
      //Check numbers adjacent to centre tile
      //Make sure each number is maxed out (and therefore can't be chorded)
      for (let x = tileX - 1; x <= tileX + 1; x++) {
        for (let y = tileY - 1; y <= tileY + 1; y++) {
          if (!this.checkCoordsInBounds(x, y)) {
            continue;
          }
          if (typeof this.tilesArray[x][y].state !== "number") {
            continue;
          }
          if (this.tilesArray[x][y].state === 0) {
            continue;
          }

          let minesConfedByCentreAdjacentNumber = this.getMinesConfirmedByTile(
            x,
            y
          );

          if (minesConfedByCentreAdjacentNumber.length === 0) {
            //We know that the tile adjacent to centre, is not a zero, so if it was maxed out
            //it would confirm mines equal to it's number
            //But because it confirms no mines, then it must have surrounding safe squares
            //So it may get chorded. Therefore are flag is not enclosed
            return false; //ret false as flag may be used for chording
          }
        }
      }
    }

    return true;
  }

  getMinesConfirmedByTile(tileX, tileY) {
    if (typeof this.tilesArray[tileX][tileY].state !== "number") {
      throw new Error(
        "This function is expected to be called on a number tile"
      );
    }

    let potentiallyConfirmedMines = [];

    for (let x = tileX - 1; x <= tileX + 1; x++) {
      for (let y = tileY - 1; y <= tileY + 1; y++) {
        if (!this.checkCoordsInBounds(x, y)) {
          continue;
        }
        if (x === tileX && y === tileY) {
          continue;
        }

        const isMeanMine =
          this.variant === "mean openings" &&
          this.meanMineStates[x][y].isMine &&
          this.meanMineStates[x][y].isActive;

        const isNormalOrMeanMine = this.mines[x][y] || isMeanMine;

        if (isNormalOrMeanMine) {
          //Neighbour is a mine. If the centre square turns out to be maxed out then this mine is proven
          potentiallyConfirmedMines.push({ x, y });
        } else if (
          typeof this.tilesArray[x][y].state !== "number" &&
          !isNormalOrMeanMine
        ) {
          //Neighbour is unrevealed and safe. Therefore the centre square is NOT maxed out
          //So we cannot deduce any of the mines used basic "max out" logic
          return [];
        } else {
          //Neighbour is revealed and safe, do nothing
        }
      }
    }

    return potentiallyConfirmedMines;
  }

  calculateAndDisplayStats(isWin) {
    this.stats.calcStats(isWin, this.tilesArray);
    showStatsBlock.value = true;
  }

  attemptFaceClick(canvasCoords, flooredCoords, touchIdentifier) {
    if (
      this.gameStage !== "pregame" &&
      showBorders.value &&
      canvasCoords.canvasRawY <= boardTopPadding.value
    ) {
      //Check if face is being clicked on
      const topPanelMiddleWidth = (this.width * this.tileSize) / 2;
      const topPanelInnerPadding = this.tileSize / 4;
      const faceWidth = topPanelHeight.value - 2 * topPanelInnerPadding;
      const faceStartX =
        boardHorizontalPadding.value + topPanelMiddleWidth - faceWidth / 2;
      const faceStartY =
        topPanelTopAndBottomBorder.value + topPanelInnerPadding;

      const isWithinSmallHitbox =
        canvasCoords.canvasRawX >= faceStartX &&
        canvasCoords.canvasRawX <= faceStartX + faceWidth &&
        canvasCoords.canvasRawY >= faceStartY &&
        canvasCoords.canvasRawY <= faceStartY + faceWidth;

      const isWithinLargeHitbox =
        canvasCoords.canvasRawX >= boardHorizontalPadding.value &&
        canvasCoords.canvasRawX <=
          boardHorizontalPadding.value + this.width * this.tileSize &&
        canvasCoords.canvasRawY >= topPanelTopAndBottomBorder.value &&
        canvasCoords.canvasRawY <=
          topPanelTopAndBottomBorder.value + topPanelHeight.value;

      const useSmallHitbox =
        faceHitbox.value === "face" ||
        (faceHitbox.value === "adaptive" && this.gameStage === "running");

      if (
        (useSmallHitbox && isWithinSmallHitbox) ||
        (!useSmallHitbox && isWithinLargeHitbox)
      ) {
        if (!this.confirmBoardResetIfQuickPaint()) {
          return true; //Clicked on, but stopped, though still need to stop processing click further
        }

        this.updateDepressedSquares(
          flooredCoords.tileX, //Coords not strictly necessary, but including incase this changes
          flooredCoords.tileY,
          false,
          touchIdentifier
        );
        game.reset(); //Reset and don't process the click any further
        return true; //reset, don't process click further
      }
    }

    return false; //Not clicked on
  }

  toggleQuickPaint() {
    if (this.gameStage !== "running") {
      window.alert("QuickPaint can only be used when a game is in progress");
      return;
    }

    this.quickPaintActive = !this.quickPaintActive;
    showQuickPaintOptions.value = this.quickPaintActive;

    if (this.quickPaintActive) {
      this.clearAllDepressedSquares();

      if (this.isFirstQuickPaint) {
        this.quickPaintMode = "guess";
        quickPaintModeDisplay.value = "Guess";
        this.isFirstQuickPaint = false;
        //First quick paint, so prepopulate the "obvious" mines
        this.paintObviousSquares();
      } else {
        //Subsequent quick paint, so remove anything overwritten
        this.removeOverwrittenPaints();
        this.paintObviousSquares();
      }
      this.refreshQuickPaintCounts();
      this.updateQuickPaintClearableDisplay();
    }
    this.draw();
  }

  handleCycleQuickPaintModeKeypress() {
    //W key does stuff when QuickPaint is active
    if (!this.quickPaintActive) {
      return;
    }

    if (quickPaintMinimalMode.value) {
      return;
    }

    this.cycleQuickPaintMode();
  }

  removeOverwrittenPaints() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (
          this.tilesArray[x][y].state !== CONSTANTS.UNREVEALED &&
          this.tilesArray[x][y].paintColour !== null
        ) {
          this.tilesArray[x][y].paintColour = null;
        }
      }
    }
  }

  refreshQuickPaintCounts() {
    let redCount = this.unflagged;
    let orangeCount = this.unflagged;
    let dotCount = 0;
    let whiteOrangeCount = 0;

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const thisTile = this.tilesArray[x][y];

        if (thisTile.paintColour === "red") {
          redCount--;
          orangeCount--;
        }
        if (thisTile.paintColour === "orange") {
          orangeCount--;
          whiteOrangeCount++;
        }
        if (thisTile.paintColour === "white") {
          whiteOrangeCount++;
        }
        dotCount += thisTile.paintDots;
      }
    }

    this.redCount = redCount;
    this.orangeCount = orangeCount;
    this.dotCount = dotCount;
    this.whiteOrangeCount = whiteOrangeCount;
  }

  paintObviousSquares() {
    //Note that code here is EXTREMELY inefficient

    let knownMines = new Array(this.width)
      .fill(0)
      .map(() => new Array(this.height).fill(false));

    let knownSafes = new Array(this.width)
      .fill(0)
      .map(() => new Array(this.height).fill(false));

    //prepopulate knowledge with where flags and safes (numbers) are
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.tilesArray[x][y].state === CONSTANTS.FLAG) {
          knownMines[x][y] = true;
        }
        if (typeof this.tilesArray[x][y].state === "number") {
          knownSafes[x][y] = true;
        }
      }
    }

    let foundThisLoop = false;

    do {
      foundThisLoop = false;

      //Check all squares for "obvious" moves and update if any mines/safes found
      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          let thisTile = this.tilesArray[x][y];
          if (typeof thisTile.state !== "number") {
            continue;
          }
          let thisNumber = thisTile.state;

          //touching squares
          let neighbours = [
            { x: x - 1, y: y - 1 },
            { x: x - 1, y: y },
            { x: x - 1, y: y + 1 },
            { x: x, y: y - 1 },
            { x: x, y: y + 1 },
            { x: x + 1, y: y - 1 },
            { x: x + 1, y: y },
            { x: x + 1, y: y + 1 },
          ];
          neighbours = neighbours.filter((square) =>
            this.checkCoordsInBounds(square.x, square.y)
          );

          let unknownNeighbours = neighbours.filter(
            (square) =>
              !knownSafes[square.x][square.y] && !knownMines[square.x][square.y]
          );
          if (unknownNeighbours.length === 0) {
            //nothing more to find for this square
            continue;
          }
          let mineNeighbours = neighbours.filter(
            (square) => knownMines[square.x][square.y]
          );
          let safeNeighbours = neighbours.filter(
            (square) => knownSafes[square.x][square.y]
          );
          let numberNeighbours = neighbours.filter(
            (square) =>
              typeof this.tilesArray[square.x][square.y].state === "number"
          );

          if (thisNumber === mineNeighbours.length) {
            //all mines found, so remaining are safe
            foundThisLoop = true;
            unknownNeighbours.forEach(
              (square) => (knownSafes[square.x][square.y] = true)
            );
          }
          if (unknownNeighbours.length + mineNeighbours.length === thisNumber) {
            //all safes found, so remaining are mines
            foundThisLoop = true;
            unknownNeighbours.forEach(
              (square) => (knownMines[square.x][square.y] = true)
            );
          }

          //subtraction formula
          if (!quickPaintOnlyTrivialLogic.value) {
            numberNeighbours.forEach((other) => {
              let otherTile = this.tilesArray[other.x][other.y];

              let otherNumber = otherTile.state; //guaranteed to be number as that's how we constructed numberNeighbours

              //touching squares for neighbour cell
              let otherNeighbours = [
                { x: other.x - 1, y: other.y - 1 },
                { x: other.x - 1, y: other.y },
                { x: other.x - 1, y: other.y + 1 },
                { x: other.x, y: other.y - 1 },
                { x: other.x, y: other.y + 1 },
                { x: other.x + 1, y: other.y - 1 },
                { x: other.x + 1, y: other.y },
                { x: other.x + 1, y: other.y + 1 },
              ];
              otherNeighbours = otherNeighbours.filter((square) =>
                this.checkCoordsInBounds(square.x, square.y)
              );

              let onlyThisMine = [];
              let onlyNeighbourMine = [];

              let onlyThisSafe = [];
              let onlyNeighbourSafe = [];

              let onlyThisUnknown = [];
              let onlyNeighbourUnknown = [];

              //Make note of the squares that only belong to thisTile
              for (let thisNeighbour of neighbours) {
                if (
                  otherNeighbours.some(
                    (otherNeighbour) =>
                      thisNeighbour.x === otherNeighbour.x &&
                      thisNeighbour.y === otherNeighbour.y
                  )
                ) {
                  continue;
                }

                if (knownSafes[thisNeighbour.x][thisNeighbour.y]) {
                  onlyThisSafe.push({ x: thisNeighbour.x, y: thisNeighbour.y });
                }
                if (knownMines[thisNeighbour.x][thisNeighbour.y]) {
                  onlyThisMine.push({ x: thisNeighbour.x, y: thisNeighbour.y });
                }
                if (
                  !knownSafes[thisNeighbour.x][thisNeighbour.y] &&
                  !knownMines[thisNeighbour.x][thisNeighbour.y]
                ) {
                  onlyThisUnknown.push({
                    x: thisNeighbour.x,
                    y: thisNeighbour.y,
                  });
                }
              }

              //Make note of the squares that only belong to otherTile
              for (let otherNeighbour of otherNeighbours) {
                if (
                  neighbours.some(
                    (thisNeighbour) =>
                      thisNeighbour.x === otherNeighbour.x &&
                      thisNeighbour.y === otherNeighbour.y
                  )
                ) {
                  continue;
                }

                if (knownSafes[otherNeighbour.x][otherNeighbour.y]) {
                  onlyNeighbourSafe.push({
                    x: otherNeighbour.x,
                    y: otherNeighbour.y,
                  });
                }
                if (knownMines[otherNeighbour.x][otherNeighbour.y]) {
                  onlyNeighbourMine.push({
                    x: otherNeighbour.x,
                    y: otherNeighbour.y,
                  });
                }
                if (
                  !knownSafes[otherNeighbour.x][otherNeighbour.y] &&
                  !knownMines[otherNeighbour.x][otherNeighbour.y]
                ) {
                  onlyNeighbourUnknown.push({
                    x: otherNeighbour.x,
                    y: otherNeighbour.y,
                  });
                }
              }

              //nothing to do if the only unknowns are both empty
              if (onlyThisUnknown.length + onlyNeighbourUnknown.length === 0) {
                return;
              }

              //do checks to find logic from subtraction formula

              //Could all onlyNeighbour unknowns be mines and all onlyThis unknowns be safe
              if (
                onlyNeighbourMine.length +
                  onlyNeighbourUnknown.length -
                  onlyThisMine.length ===
                otherNumber - thisNumber
              ) {
                //onlyNeighbours forced high and onlyThis forced low
                foundThisLoop = true;
                onlyNeighbourUnknown.forEach(
                  (square) => (knownMines[square.x][square.y] = true)
                );
                onlyThisUnknown.forEach(
                  (square) => (knownSafes[square.x][square.y] = true)
                );
              } else if (
                onlyThisMine.length +
                  onlyThisUnknown.length -
                  onlyNeighbourMine.length ===
                thisNumber - otherNumber
              ) {
                //Could all onlyNeighbour unknowns be mines and all onlyThis unknowns be safe

                //onlyNeighbours forced low and onlyThis forced high
                foundThisLoop = true;
                onlyNeighbourUnknown.forEach(
                  (square) => (knownSafes[square.x][square.y] = true)
                );
                onlyThisUnknown.forEach(
                  (square) => (knownMines[square.x][square.y] = true)
                );
              }
            });
          }
        }
      }
    } while (foundThisLoop);

    //Now that all logic has been deduced, paint stuff to match this
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.tilesArray[x][y].state !== CONSTANTS.UNREVEALED) {
          continue;
        }
        if (knownSafes[x][y] && !quickPaintInitialOnlyMines.value) {
          this.tilesArray[x][y].paintColour = "green";
        }
        if (knownMines[x][y]) {
          this.tilesArray[x][y].paintColour = "red";
        }
      }
    }
  }

  cycleQuickPaintMode(forwardDirection = true) {
    let modesList = ["known", "guess", "dots"];
    let modeIndex = modesList.indexOf(this.quickPaintMode);
    if (modeIndex === -1) {
      modeIndex = 0;
    }

    if (forwardDirection) {
      modeIndex = (modeIndex + 1) % modesList.length;
    } else {
      modeIndex = (modeIndex - 1 + modesList.length) % modesList.length;
    }

    this.quickPaintMode = modesList[modeIndex];
    quickPaintModeDisplay.value =
      this.quickPaintMode[0].toUpperCase() + this.quickPaintMode.slice(1);
  }

  updateQuickPaintClearableDisplay() {
    if (this.dotCount > 0) {
      quickPaintClearable.value = "Clear dots";
      return;
    } else if (this.whiteOrangeCount > 0) {
      quickPaintClearable.value = "Clear guesses";
    } else {
      quickPaintClearable.value = "Reset knowns";
    }
  }

  clearClearableMarkings() {
    let thingBeingCleared;
    if (this.dotCount > 0) {
      thingBeingCleared = "dots";
    } else if (this.whiteOrangeCount > 0) {
      thingBeingCleared = "guesses";
    } else {
      thingBeingCleared = "knowns";
    }

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const thisTile = this.tilesArray[x][y];
        if (thingBeingCleared === "dots") {
          thisTile.paintDots = 0;
        } else if (thingBeingCleared === "guesses") {
          if (
            thisTile.paintColour === "orange" ||
            thisTile.paintColour === "white"
          ) {
            thisTile.paintColour = null;
          }
        } else {
          //knowns
          if (
            thisTile.paintColour === "red" ||
            thisTile.paintColour === "green"
          ) {
            thisTile.paintColour = null;
          }
        }
      }
    }

    if (thingBeingCleared === "knowns") {
      this.paintObviousSquares();
    }

    this.refreshQuickPaintCounts();
    this.updateQuickPaintClearableDisplay();

    this.draw();
  }

  handleQuickPaintClick(
    tileX,
    tileY,
    isDigInput,
    isFlagInput,
    isMiddleClick,
    event
  ) {
    const button = event.button;

    if (isMiddleClick) {
      //middle click, doesn't need to be inbounds.
      this.clearClearableMarkings();
      event.preventDefault();
      return;
    }

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit
      return;
    }

    if (!isDigInput && !isFlagInput) {
      //not left/right click. Ignore
      return;
    }

    const thisTile = this.tilesArray[tileX][tileY];
    const tileState = thisTile.state;
    const oldColour = thisTile.paintColour;
    const oldDots = thisTile.paintDots;

    if (quickPaintMinimalMode.value) {
      //minimal mode only has right click = orange, left click = dots
      if (isFlagInput) {
        if (
          tileState !== CONSTANTS.UNREVEALED ||
          (oldColour !== null && oldColour !== "orange")
        ) {
          return;
        }

        if (oldColour === "orange") {
          this.orangeCount++; //unorange the square
          this.whiteOrangeCount--;
          thisTile.paintColour = null;
        } else if (oldColour === null) {
          this.orangeCount--; //orange the square
          this.whiteOrangeCount++;
          thisTile.paintColour = "orange";
        }
      }

      if (isDigInput) {
        let newDots;
        newDots = (oldDots + 1) % 3; //cycle dots forward

        this.dotCount += newDots - oldDots;
        thisTile.paintDots = newDots;
      }
    } else if (
      this.quickPaintMode === "known" ||
      this.quickPaintMode === "guess"
    ) {
      if (tileState !== CONSTANTS.UNREVEALED) {
        return;
      }

      let newColour;
      if (this.quickPaintMode === "known" && isFlagInput) {
        newColour = "red";
      }
      if (this.quickPaintMode === "known" && isDigInput) {
        newColour = "green";
      }
      if (this.quickPaintMode === "guess" && isFlagInput) {
        newColour = "orange";
      }
      if (this.quickPaintMode === "guess" && isDigInput) {
        newColour = "white";
      }

      if (newColour === oldColour) {
        //if it's same colour then instead removed the colour
        newColour = null;
      }

      if (oldColour === "red") {
        this.redCount++; //unredding a square
        this.orangeCount++;
      }
      if (oldColour === "orange") {
        this.orangeCount++; //unoranging a square
        this.whiteOrangeCount--;
      }
      if (oldColour === "white") {
        this.whiteOrangeCount--; //unwhiting a square
      }

      if (newColour === "red") {
        this.redCount--; //redding a square
        this.orangeCount--;
      }
      if (newColour === "orange") {
        this.orangeCount--; //oranging a square
        this.whiteOrangeCount++;
      }
      if (newColour === "white") {
        this.whiteOrangeCount++; //whiting a square
      }

      thisTile.paintColour = newColour;
    } else if (this.quickPaintMode === "dots") {
      let newDots;
      if (isDigInput) {
        newDots = (oldDots + 1) % 3; //cycle dots forward
      } else if (isFlagInput) {
        newDots = (oldDots + 2) % 3; //cycle dots backward
      }

      this.dotCount += newDots - oldDots;
      thisTile.paintDots = newDots;
    }

    this.updateQuickPaintClearableDisplay();
  }

  confirmBoardResetIfQuickPaint() {
    if (!this.quickPaintActive) {
      return true;
    }

    return confirm(
      "Are you sure? This will reset the whole board. If instead you want to exit QuickPaint, this can be done by pressing the QuickPaint button or pressing the Q key."
    );
  }

  handleEditClick(tileX, tileY) {
    //Click on the edit board - typically will toggle a mine
    if (!this.checkCoordsInBounds(tileX, tileY)) {
      return; //just incase
    }

    const isAddingMines = !this.mines[tileX][tileY]; //adding a mine or removing it?

    this.mines[tileX][tileY] = !this.mines[tileX][tileY]; //toggle the mine

    this.mineCount += isAddingMines ? 1 : -1;
    this.unflagged = this.mineCount;

    this.openBoardForEdit(); //refreshes all numbers. Maybe too inefficient?
  }

  handleReplayClick(tileX, tileY) {
    //clicks on replay board will try to jump to timestamp before square is revealed

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      return; //just incase
    }

    if (this.replay) {
      this.replay.handleReplayClick(tileX, tileY);
    }
  }

  handleZiniExploreClick(tileX, tileY, isDigInput, isFlagInput) {
    if (!this.checkCoordsInBounds(tileX, tileY)) {
      return; //just incase
    }

    this.ziniExplore.handleZiniExploreClick(
      tileX,
      tileY,
      isDigInput,
      isFlagInput
    );
  }

  importPttaBoard() {
    if (this.variant !== "board editor" && this.variant !== "zini explorer") {
      return;
    }

    let pttMines = BoardGenerator.readFromPtta(pttaUrl.value);

    if (this.variant === "board editor") {
      this.boardEditorMines = pttMines;
    } else if (this.variant === "zini explorer") {
      this.ziniExplore.killDeepChainZiniRunner(); //just in case
      this.ziniExplorerMines = pttMines;
      this.ziniExplore.clearCurrentPath();
    }

    this.revertUnappliedWidthHeightSetting();

    this.switchToEditMode();

    pttaImportModal.value = false;
    pttaUrl.value = "";
  }

  switchToEditMode() {
    if (this.variant === "board editor") {
      this.editingEditBoard = true;
      //this.gameStage = "edit"; //commented out as gets set from resetBoard
      //isCurrentlyEditModeDisplay.value = true; //commented out as gets set from resetBoard
      this.resetBoard(true); //force a harder reset as if we were switching variants
    } else if (this.variant === "zini explorer") {
      this.ziniExplore.killDeepChainZiniRunner(); //just in case
      this.editingZiniBoard = true;
      //this.gameStage = "edit"; //commented out as gets set from resetBoard
      //isCurrentlyEditModeDisplay.value = true; //commented out as gets set from resetBoard
      this.resetBoard(true); //force a harder reset as if we were switching variants
    } else {
      //do nothing
    }

    this.draw();
  }

  switchToPlayMode() {
    if (this.variant === "board editor") {
      this.editingEditBoard = false;
      this.gameStage = "pregame";
      isCurrentlyEditModeDisplay.value = false;
      this.resetBoard();
    } else if (this.variant === "zini explorer") {
      throw new Error("Analyse mode not available on zini explorer");
    } else {
      //do nothing
    }

    this.draw();
  }

  switchToAnalyseMode(skipAskForPathReset = false) {
    if (this.variant === "board editor") {
      throw new Error("Analyse mode not available on board editor");
    } else if (this.variant === "zini explorer") {
      this.ziniExplore.killDeepChainZiniRunner(); //just in case
      this.editingZiniBoard = false;
      this.gameStage = "analyse";
      isCurrentlyEditModeDisplay.value = false;
      //this.resetBoard(); //Is this needed?
      this.ziniExplore.refreshForEditedBoard(skipAskForPathReset);
      this.regenerateUrlAndPushIfDifferent();
    } else {
      //do nothing
    }

    this.draw();
  }

  draw() {
    const ctx = mainCanvas.value.getContext("2d");
    ctx.clearRect(0, 0, mainCanvas.value.width, mainCanvas.value.height);

    if (this.gameStage === "analyse" || this.gameStage === "replay") {
      this.drawTilesAndAnalysis();
    } else {
      this.drawTiles();
    }
    if (this.quickPaintActive) {
      this.drawTilesPaint();
    }
    this.drawBorders();
    this.drawCoords();
    this.drawTopBar();

    if (this.gameStage === "replay") {
      //this.drawTilesZiniDelta();
      this.drawCursor();
    }

    /* DELETE ME
    if (this.gameStage === "analyse") {
      this.drawTilesExploreAnalysis();
    }
    */
  }

  drawTiles() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].draw(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize
        );
      }
    }
  }

  drawTilesPaint() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].drawPaint(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize
        );
      }
    }
  }

  drawTilesZiniDelta() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].drawZiniDelta(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize
        );
      }
    }
  }

  /* DELETE ME
  drawTilesExploreAnalysis() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].drawExploreAnalysis(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize
        );
      }
    }
  }
  */

  drawTilesAndAnalysis() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.tilesArray[x][y].drawIncludingAnalysis(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardTopPadding.value,
          this.tileSize
        );
      }
    }
  }

  drawBorders() {
    if (!showBorders.value) {
      return;
    }
    const ctx = mainCanvas.value.getContext("2d");

    //Draw borders
    //top left corner
    ctx.drawImage(
      skinManager.getImage("b_c_up_left"),
      0,
      0,
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value
    );
    //top right corner
    ctx.drawImage(
      skinManager.getImage("b_c_up_right"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      0,
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value
    );
    //bottom left corner
    ctx.drawImage(
      skinManager.getImage("b_c_bot_left"),
      0,
      this.height * this.tileSize + boardTopPadding.value,
      boardHorizontalPadding.value,
      boardBottomPadding.value
    );
    //bottom right corner
    ctx.drawImage(
      skinManager.getImage("b_c_bot_right"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      this.height * this.tileSize + boardTopPadding.value,
      boardHorizontalPadding.value,
      boardBottomPadding.value
    );

    //t pieces (between top of board and mines/timer panel)
    //left t piece
    ctx.drawImage(
      skinManager.getImage("t_left"),
      0,
      topPanelTopAndBottomBorder.value + topPanelHeight.value,
      boardHorizontalPadding.value,
      boardBottomPadding.value
    );
    //right t piece
    ctx.drawImage(
      skinManager.getImage("t_right"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value + topPanelHeight.value,
      boardHorizontalPadding.value,
      boardBottomPadding.value
    );

    //connecting lines
    //top line
    ctx.drawImage(
      skinManager.getImage("b_hor"),
      boardHorizontalPadding.value,
      0,
      this.tileSize * this.width,
      topPanelTopAndBottomBorder.value
    );
    //middle line
    ctx.drawImage(
      skinManager.getImage("b_hor"),
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value + topPanelHeight.value,
      this.tileSize * this.width,
      topPanelTopAndBottomBorder.value
    );
    //bottom line
    ctx.drawImage(
      skinManager.getImage("b_hor"),
      boardHorizontalPadding.value,
      this.height * this.tileSize + boardTopPadding.value,
      this.tileSize * this.width,
      boardBottomPadding.value
    );
    //left short segment
    ctx.drawImage(
      skinManager.getImage("b_vert"),
      0,
      topPanelTopAndBottomBorder.value,
      boardHorizontalPadding.value,
      topPanelHeight.value
    );
    //right short segment
    ctx.drawImage(
      skinManager.getImage("b_vert"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value,
      boardHorizontalPadding.value,
      topPanelHeight.value
    );
    //left long segment
    ctx.drawImage(
      skinManager.getImage("b_vert"),
      0,
      boardTopPadding.value,
      boardHorizontalPadding.value,
      this.height * this.tileSize
    );
    //right long segment
    ctx.drawImage(
      skinManager.getImage("b_vert"),
      this.width * this.tileSize + boardHorizontalPadding.value,
      boardTopPadding.value,
      boardHorizontalPadding.value,
      this.height * this.tileSize
    );
  }

  drawCoords() {
    if (!showCoords.value) {
      return;
    }
    if (!showBorders.value) {
      return;
    }

    const ctx = mainCanvas.value.getContext("2d");

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = `${this.tileSize / 2}px monospace`;
    ctx.fillStyle = skinManager.getCoordTextColour();

    //Horizontal coords
    for (let i = 0; i < this.width; i++) {
      const maxWidth = this.tileSize;

      const yPos =
        topPanelTopAndBottomBorder.value +
        topPanelHeight.value +
        topPanelTopAndBottomBorder.value / 2;

      const xPos =
        boardHorizontalPadding.value + this.tileSize / 2 + i * this.tileSize;

      ctx.fillText(i + 1, xPos, yPos, maxWidth);
    }

    //Vertical coords
    for (let i = 0; i < this.height; i++) {
      const maxWidth = boardHorizontalPadding.value;

      const yPos =
        boardTopPadding.value + this.tileSize / 2 + i * this.tileSize;

      const xPos = boardHorizontalPadding.value / 2;

      ctx.fillText(i + 1, xPos, yPos, maxWidth);
    }
  }

  drawTopBar() {
    if (this.quickPaintActive) {
      this.drawQuickPaintTopBar();
    } else {
      this.drawStandardTopBar();
    }
  }

  drawStandardTopBar() {
    if (!showBorders.value) {
      return;
    }

    const ctx = mainCanvas.value.getContext("2d");

    //A bunch of variables for positioning things
    const topPanelMiddleHeight = topPanelHeight.value / 2;
    const topPanelMiddleWidth = (this.width * this.tileSize) / 2;
    const topPanelInnerPadding = this.tileSize / 4;
    const mineStartX = boardHorizontalPadding.value + topPanelInnerPadding;
    const timerStartX =
      boardHorizontalPadding.value +
      this.width * this.tileSize -
      topPanelInnerPadding; //note timer is right aligned, so this is where right edge of timer is
    const mineTimerStartY =
      topPanelTopAndBottomBorder.value + topPanelMiddleHeight;
    const faceWidth = topPanelHeight.value - 2 * topPanelInnerPadding;
    const faceStartX =
      boardHorizontalPadding.value + topPanelMiddleWidth - faceWidth / 2;
    const faceStartY = topPanelTopAndBottomBorder.value + topPanelInnerPadding;

    const mineTimerMaxWidth = faceStartX - mineStartX;

    this.drawTopBarFlatBackground();

    //Set up font for mine/timer text
    ctx.textBaseline = "middle";
    ctx.font = `${this.tileSize}px monospace`;
    ctx.fillStyle = skinManager.getMineTimerTextColour();

    //Draw mine counter
    if (showMineCount.value) {
      ctx.textAlign = "left";
      ctx.fillText(
        this.unflagged,
        mineStartX,
        mineTimerStartY,
        mineTimerMaxWidth
      );
    }

    //Draw timer (or zini value if analysing on zini explorer)
    if (showTimer.value) {
      let timerOrZini = this.integerTimer;
      if (this.variant === "zini explorer" && this.gameStage === "analyse") {
        timerOrZini = analyseZiniTotal.value;
      }

      ctx.textAlign = "right";
      ctx.fillText(
        timerOrZini,
        timerStartX,
        mineTimerStartY,
        mineTimerMaxWidth
      );
    }

    //Draw face
    ctx.drawImage(
      skinManager.getImage("f_unpressed"),
      faceStartX,
      faceStartY,
      faceWidth,
      faceWidth
    );
  }

  drawQuickPaintTopBar() {
    if (!showBorders.value) {
      return;
    }

    const ctx = mainCanvas.value.getContext("2d");

    //A bunch of variables for positioning things
    const topPanelMiddleHeight = topPanelHeight.value / 2;
    const topPanelMiddleWidth = (this.width * this.tileSize) / 2;
    const topPanelInnerPadding = this.tileSize / 4;
    const redStartX = boardHorizontalPadding.value + topPanelInnerPadding;
    const dotStartX =
      boardHorizontalPadding.value +
      this.width * this.tileSize -
      topPanelInnerPadding; //note dot counter is right aligned, so this is where right edge of dot counter is
    const counterStartY =
      topPanelTopAndBottomBorder.value + topPanelMiddleHeight;
    const faceWidth = topPanelHeight.value - 2 * topPanelInnerPadding;
    const faceStartX =
      boardHorizontalPadding.value + topPanelMiddleWidth - faceWidth / 2;
    const faceStartY = topPanelTopAndBottomBorder.value + topPanelInnerPadding;

    const largeMaxWidth = faceStartX - redStartX;
    const smallMaxWidth = this.tileSize * 1.5;
    const orangeLeftGap = this.tileSize / 4;
    const orangeStartX = redStartX + smallMaxWidth + orangeLeftGap;

    let noSpaceForOrangeCounter = false;
    if (smallMaxWidth * 2 + orangeLeftGap > largeMaxWidth) {
      noSpaceForOrangeCounter = true;
    }
    const redMaxWidth = noSpaceForOrangeCounter ? largeMaxWidth : smallMaxWidth;

    this.drawTopBarFlatBackground();

    //Set up font for counter text
    ctx.textBaseline = "middle";
    ctx.font = `${this.tileSize}px monospace`;

    //Draw red counter
    ctx.fillStyle = skinManager.getRedCounterTextColour();
    ctx.textAlign = "left";
    ctx.fillText(this.redCount, redStartX, counterStartY, redMaxWidth);

    //Draw orange counter
    if (!noSpaceForOrangeCounter) {
      ctx.fillStyle = skinManager.getOrangeCounterTextColour();
      ctx.fillText(
        this.orangeCount,
        orangeStartX,
        counterStartY,
        smallMaxWidth
      );
    }

    //Draw dots count
    ctx.textAlign = "right";
    ctx.fillStyle = skinManager.getDotsCounterTextColour();
    ctx.fillText(this.dotCount, dotStartX, counterStartY, largeMaxWidth);

    //Draw face
    ctx.drawImage(
      skinManager.getImage("f_unpressed"),
      faceStartX,
      faceStartY,
      faceWidth,
      faceWidth
    );
  }

  drawTopBarFlatBackground() {
    const ctx = mainCanvas.value.getContext("2d");

    //Draw flat background for top panel
    ctx.fillStyle = skinManager.getTopPanelColour();
    ctx.fillRect(
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value,
      this.width * this.tileSize,
      topPanelHeight.value
    );
  }

  drawCursor() {
    //Cursor shown on replays
    if (
      this.cursor === null ||
      this.cursor.x === null ||
      this.cursor.y === null
    ) {
      return;
    }

    const ctx = mainCanvas.value.getContext("2d");

    const cursorStartX =
      boardHorizontalPadding.value + this.cursor.x * this.tileSize;
    const cursorStartY = boardTopPadding.value + this.cursor.y * this.tileSize;

    const mouseImg = skinManager.getImage("cursor");

    const aspectRatio = mouseImg.width / mouseImg.height;

    const cursorHeight = (this.tileSize * 3) / 4; //Height will be 3/4 of a tile
    const cursorWidth = cursorHeight * aspectRatio;

    ctx.drawImage(
      mouseImg,
      cursorStartX,
      cursorStartY,
      cursorWidth,
      cursorHeight
    );
  }

  initReplay(replayToInit) {
    let replayParams;
    let isReorderableZini = false;

    switch (replayToInit) {
      case "replay":
        replayParams = {
          clicks: this.stats.clicks,
          moves: this.stats.moves,
          board: this,
          isWin: this.stats.isWin,
          forceSteppy: false,
        };
        isReorderableZini = false;
        break;
      case "8-way":
        if (this.stats.eightZini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.eightZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "womzini":
        if (this.stats.womZini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.womZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "womzinifix":
        if (this.stats.womZini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.cWomZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "womhzini":
        if (this.stats.womHzini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.womHziniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = false;
        break;
      case "chainzini":
        if (this.stats.chainZini === null) {
          this.stats.lateCalcForceZinis();
        }
        replayParams = {
          clicks: this.stats.chainZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "deepchain":
        if (this.stats.deepZini === null) {
          throw new Error("DeepChain should already be set");
        }
        replayParams = {
          clicks: this.stats.deepZiniPath,
          board: this,
          forceSteppy: true,
        };
        isReorderableZini = true;
        break;
      case "compare":
        let compareReplay = CompareReplay.generate(
          this.mines,
          this.stats.clicks,
          this.stats.isWin
        );
        if (compareReplay.ziniDeltas.size === 0) {
          $q.dialog({
            title: "Alert",
            message: "No click losses/gains found",
          });
          return;
        }
        replayParams = {
          clicks: compareReplay.clicks,
          board: this,
          isWin: this.stats.isWin,
          forceSteppy: false,
          analysis: {
            ziniDeltas: compareReplay.ziniDeltas,
          },
        };
        isReorderableZini = false;
        break;
      case "zini-explore-replay":
        replayParams = {
          clicks: this.ziniExplore.classicPath,
          board: this,
          forceSteppy: true,
          isComplete: this.ziniExplore.getIsComplete(),
        };
        isReorderableZini = false;
        break;
      default:
        window.alert("Replay type unavailable");
        throw new Error("Replay type unavailable");
    }

    if (isReorderableZini && reorderZini.value) {
      replayParams.clicks = Algorithms.reorderZiniClicks(
        replayParams.clicks,
        this.mines
      );
    }

    //Track info about state we need to return to if exiting replay
    if (replayToInit !== "zini-explore-replay" && this.gameStage !== "replay") {
      this.stateBeforeReplay = {
        gameStage: this.gameState,
        integerTimer: this.integerTimer,
        unflagged: this.unflagged,
        tilesArray: this.cloneTilesArray(),
      };
    }

    this.gameStage = "replay";
    replayIsShown.value = true;

    if (this.replay) {
      this.replay.pause();
    }

    if (ziniRunnerActive.value) {
      this.stats.killDeepChainZiniRunner();
    }

    let refs = {
      replayTypeForceSteppy,
      replayIsPanning,
      replayIsInputting,
      replayType,
      replaySpeedMultiplier,
      replayIsPlaying,
      replayBarStartValue,
      replayBarLastValue,
      replayProgress,
      replayProgressRounded,
      replayShowHidden,
    };

    this.replay = new Replay(replayParams, refs);
  }

  initOrPrepareDeepChainReplay() {
    if (this.stats.deepZini === null) {
      this.stats.lateCalcDeepChainZini(() => {
        this.initReplay("deepchain");
      });
    } else {
      this.initReplay("deepchain");
    }
  }

  closeReplay() {
    //close the replay and return to the board as it looked before the replay was initialised

    if (this.replay) {
      this.replay.pause();
      replayIsShown.value = false;
    }
    this.replay = null;

    //Figure out which mode we should be in
    switch (this.variant) {
      case "normal":
      case "eff boards":
      case "mean openings":
      case "board editor":
        this.gameStage = this.stateBeforeReplay.gameStage;
        this.integerTimer = this.stateBeforeReplay.integerTimer;
        this.unflagged = this.stateBeforeReplay.unflagged;
        this.tilesArray = this.stateBeforeReplay.tilesArray;
        this.draw();
        break;
      case "zini explorer":
        this.switchToAnalyseMode();
        break;
      default:
        alert("Failed to exit replay. Unimplemented.");
    }
  }

  cloneTilesArray() {
    let tilesArrayClone = new Array(this.width)
      .fill(0)
      .map(() => new Array(this.height).fill(0));

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        tilesArrayClone[x][y] = this.tilesArray[x][y].clone();
      }
    }
    return tilesArrayClone;
  }

  updateForQueryChange(newQuery) {
    if (Utils.shallowObjectEquals(newQuery, expectedQuery)) {
      return;
    }

    expectedQuery = newQuery;

    switch (variant.value) {
      case "zini explorer":
        this.updateForZiniExploreQueryChange(newQuery);
        break;
      case "board editor":
        this.updateForBoardEditorQueryChange(newQuery);
        break;
    }
  }

  updateForZiniExploreQueryPossibleChange(newQuery) {
    if (!newQuery.b || !newQuery.m) {
      return false;
    }

    let pttMines = BoardGenerator.readFromPttaSearchParams(
      newQuery.b,
      newQuery.m,
      true
    );

    if (!pttMines) {
      return false;
    }

    let clickPathOrFalse = false; //False if path is missing or invalid
    if (newQuery.c) {
      const pttWidth = pttMines.length;
      const pttHeight = pttMines[0].length;

      clickPathOrFalse = Algorithms.decodeClicks(
        newQuery.c,
        pttWidth,
        pttHeight
      );

      //Set clickPath as false if same as current
      if (
        newQuery.c ===
        Algorithms.encodeClicks(
          this.ziniExplore.classicPath,
          pttWidth,
          pttHeight
        )
      ) {
        clickPathOrFalse = false;
      }
    }

    if (
      Utils.shallow2DArrayEquals(pttMines, this.ziniExplorerMines) &&
      !clickPathOrFalse
    ) {
      return false;
    }

    this.ziniExplore.killDeepChainZiniRunner(); //just in case
    this.ziniExplorerMines = pttMines;

    if (clickPathOrFalse) {
      this.ziniExplore.classicPath = clickPathOrFalse;

      //Very hacky, but this is needed for switching to analyse mode as if this runs immedaitely then this.variant won't be defined
      setTimeout(() => {
        this.switchToAnalyseMode(true);
      }, 100);
    } else {
      this.ziniExplore.clearCurrentPath();
    }

    this.revertUnappliedWidthHeightSetting();

    //this.switchToEditMode(); //Is just reseting the board enough?
    return true;
  }

  updateForBoardEditorQueryPossibleChange(newQuery) {
    if (!newQuery.b || !newQuery.m) {
      return false;
    }

    let pttMines = BoardGenerator.readFromPttaSearchParams(
      newQuery.b,
      newQuery.m,
      true
    );

    if (!pttMines) {
      return false;
    }

    if (Utils.shallow2DArrayEquals(pttMines, this.boardEditorMines)) {
      return false;
    }

    this.boardEditorMines = pttMines;

    this.revertUnappliedWidthHeightSetting();

    //this.switchToEditMode(); //Is just reseting the board enough?
    return true;
  }

  /* OK TO DELETE
  refreshQueryForZiniExplore() {
    let b = Algorithms.getPttaDimensionString(this.ziniExplorerMines);
    let m = Algorithms.getPttaMinesString(this.ziniExplorerMines);

    expectedQuery = {
      b: b,
      m: m,
    };

    if (Utils.shallowObjectEquals(route.query, expectedQuery)) {
      return;
    }

    //Full path required as otherwise might have race condition where query gets set on wrong path
    // and then cleared when the code for watching for variant change runs
    router.push({
      name: "play",
      params: { variant: "zini-explorer" },
      query: expectedQuery,
    });
  }
  */

  /* OK TO DELETE
  refreshQueryForBoardEditor() {
    let b = Algorithms.getPttaDimensionString(this.boardEditorMines);
    let m = Algorithms.getPttaMinesString(this.boardEditorMines);

    expectedQuery = {
      b: b,
      m: m,
    };

    if (Utils.shallowObjectEquals(route.query, expectedQuery)) {
      return;
    }

    //Full path required as otherwise might have race condition where query gets set on wrong path
    // and then cleared when the code for watching for variant change runs
    router.push({
      name: "play",
      params: { variant: "board-editor" },
      query: expectedQuery,
    });
  }
  */

  updateForUrlChange(newUrlVariant, newQuery, oldUrlVariant, oldQuery) {
    console.log("updateForUrlChange called");
    //Watcher function which is called whenever query part of URL changes or variant part of path changes
    //TODO, if these are different from expected, then update relevant data and force board reset.
    let resetNeeded = false;

    let newVariant = Utils.routeNameToVariant(newUrlVariant);
    if (newVariant !== variant.value) {
      variant.value = newVariant;
      resetNeeded = true;
    }

    //Look at query part to see if anything has changed (maybe need to adjust ziniExploreMines etc)
    switch (newVariant) {
      case "zini explorer":
        if (this.updateForZiniExploreQueryPossibleChange(newQuery)) {
          resetNeeded = true;
        }
        break;
      case "board editor":
        if (this.updateForBoardEditorQueryPossibleChange(newQuery)) {
          resetNeeded = true;
        }
        break;
    }

    if (resetNeeded) {
      this.resetBoard(true);
    }
  }

  regenerateUrlAndPushIfDifferent() {
    console.log("regenerateUrlAndPushIfDifferent called");
    //Called at start of board.reset and also whenever we need to change query parameters (e.g. switching to analyse mode on zini explorer)
    let newUrlVariant = Utils.variantToRouteName(variant.value);

    let urlPushNeeded = false;

    if (newUrlVariant !== route.params.variant) {
      urlPushNeeded = true;
    }

    let newQuery = {};
    if (variant.value === "zini explorer") {
      newQuery = {
        b: Algorithms.getPttaDimensionString(this.ziniExplorerMines),
        m: Algorithms.getPttaMinesString(this.ziniExplorerMines),
      };

      if (route.query.b !== newQuery.b || route.query.m !== newQuery.m) {
        urlPushNeeded = true;
      }
    } else if (variant.value === "board editor") {
      newQuery = {
        b: Algorithms.getPttaDimensionString(this.boardEditorMines),
        m: Algorithms.getPttaMinesString(this.boardEditorMines),
      };

      if (route.query.b !== newQuery.b || route.query.m !== newQuery.m) {
        urlPushNeeded = true;
      }
    }

    if (urlPushNeeded) {
      router.push({
        name: "play",
        params: { variant: newUrlVariant },
        query: newQuery,
      });
    }
  }

  copyBoardLink() {
    //Copy the current URL to clipboard
    let urlVariant = Utils.variantToRouteName(variant.value);

    if (variant.value === "zini explorer") {
      //Without click path
      let query = {
        b: Algorithms.getPttaDimensionString(this.ziniExplorerMines),
        m: Algorithms.getPttaMinesString(this.ziniExplorerMines),
      };

      let href = router.resolve({
        name: "play",
        params: { variant: urlVariant },
        query: query,
      }).href;

      let fullUrl = window.location.origin + "/" + href;

      if (this.ziniExplore.classicPath.length === 0) {
        //If there is no click path, then just copy link without clickpath
        copyToClipboard(fullUrl);
        $q.notify({
          message: "Copied.",
          color: "purple",
          timeout: 700,
        });
        return;
      }

      //With click path
      let clickString = Algorithms.encodeClicks(
        this.ziniExplore.classicPath,
        this.ziniExplorerMines.length,
        this.ziniExplorerMines[0].length
      );

      query.c = clickString;

      let hrefWithClickString = router.resolve({
        name: "play",
        params: { variant: urlVariant },
        query: query,
      }).href;

      let fullUrlWithClickpath =
        window.location.origin + "/" + hrefWithClickString;

      $q.dialog({
        title: "Copy Board Link",
        options: {
          type: "checkbox",
          model: [],
          // inline: true
          items: [
            {
              label: "Include click path",
              value: "click-path",
              color: "secondary",
            },
          ],
        },
        cancel: true,
        persistent: true,
      }).onOk((data) => {
        if (data.includes("click-path")) {
          copyToClipboard(fullUrlWithClickpath);
        } else {
          copyToClipboard(fullUrl);
        }
        $q.notify({
          message: "Copied.",
          color: "purple",
          timeout: 700,
        });
      });
    } else if (variant.value === "board editor") {
      let query = {
        b: Algorithms.getPttaDimensionString(this.boardEditorMines),
        m: Algorithms.getPttaMinesString(this.boardEditorMines),
      };

      let href = router.resolve({
        name: "play",
        params: { variant: urlVariant },
        query: query,
      }).href;

      let fullUrl = window.location.origin + "/" + href;

      copyToClipboard(fullUrl);
      $q.notify({
        message: "Copied.",
        color: "purple",
        timeout: 700,
      });
    } else {
      throw new Error("Copying URL not implemented for this variant");
    }
  }
}

class BoardHistory {
  //Stores past games that we can recover and resume
  //Saves to local storage?
  constructor() {}
}

const benchmark = new Benchmark();
const skinManager = new SkinManager();
var effShuffleManager = new EffShuffleManager(
  {
    minimumEff,
    generateEffBoardsInBackground,
    effBoardsStoredDisplayCount,
    effBoardsStoredFirstClickDisplay,
    effFirstClickType,
    effWebWorkerCount,
    boardWidth,
    boardHeight,
    boardMines,
  },
  {
    begEffOptions,
    intEffOptions,
    expEffOptions,
    begEffSlowGenPoint,
    intEffSlowGenPoint,
    expEffSlowGenPoint,
  }
); //Needs to be var to stop an access-before-init error
const boardHistory = new BoardHistory();
var game = new Game(); //Needs to be var to stop an access-before-init error
</script>
