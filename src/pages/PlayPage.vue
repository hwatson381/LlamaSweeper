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

      <DevBlock v-if="devMode" class="margin-centreable" />

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

        <StatsPanel v-if="showStatsBlock" class="side-panel" />

        <ZiniAnalysisPanel
          v-if="
            variant === 'zini explorer' &&
            !isCurrentlyEditModeDisplay &&
            !ziniRunnerActive &&
            !replayIsShown
          "
          class="side-panel"
        />

        <DeepChainRunnerPanel
          v-if="variant === 'zini explorer' && ziniRunnerActive"
          class="side-panel"
        />
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

      <SettingsPanel
        class="margin-centreable"
        @scroll-to-board="scrollToBoard"
      />

      <br />
      <p class="text-centreable q-px-md">(textures from minesweeper.online)</p>
    </div>
  </q-page>

  <SettingsModal />

  <FiltersModal />

  <CoordsModal />

  <VariantsHelpModal />

  <QuickPaintHelpModal />

  <PttaImportModal />

  <MbfImportModal />

  <RunZiniAlgorithmModal />

  <EffBoardsBenchmarkModal />

  <EffBoardsHiddenSettingsModal />

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
</style>

<script setup>
import {
  useTemplateRef,
  onMounted,
  onUnmounted,
  watchEffect,
  watch,
  provide,
  defineAsyncComponent,
} from "vue";

import effShuffleManager from "src/classes/EffShuffleManager";
import skinManager from "src/classes/SkinManager";
import Utils from "src/classes/Utils";
import statsWorkerManager from "src/classes/StatsWorkerManager";
import Board from "src/classes/Board";

import ReplayBar from "src/components/ReplayBar.vue";
import SettingsModal from "src/components/modals/SettingsModal.vue";
import FiltersModal from "src/components/modals/FiltersModal.vue";
import CoordsModal from "src/components/modals/CoordsModal.vue";
import VariantsHelpModal from "src/components/modals/VariantsHelpModal.vue";
import QuickPaintHelpModal from "src/components/modals/QuickPaintHelpModal.vue";
import PttaImportModal from "src/components/modals/PttaImportModal.vue";
import MbfImportModal from "src/components/modals/MbfImportModal.vue";
import RunZiniAlgorithmModal from "src/components/modals/RunZiniAlgorithmModal.vue";
import EffBoardsBenchmarkModal from "src/components/modals/EffBoardsBenchmarkModal.vue";
import EffBoardsHiddenSettingsModal from "src/components/modals/EffBoardsHiddenSettingsModal.vue";
import SettingsPanel from "src/components/SettingsPanel.vue";
import StatsPanel from "src/components/StatsPanel.vue";
import ZiniAnalysisPanel from "src/components/ZiniAnalysisPanel.vue";
import DeepChainRunnerPanel from "src/components/DeepChainRunnerPanel.vue";

const DevBlock = defineAsyncComponent(() =>
  import("src/components/DevBlock.vue")
);

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
  statsShowMaxEff,
  settingsModal,
  variantsHelpModal,
  gameCalculatedMarginLeft,
  gameVerticalPadding,
  gameTopPadding,
  gameBottomPadding,
  centreInterface,
  boardSizePreset,
  customWidth,
  customHeight,
  customMines,
  boardWidth,
  boardHeight,
  boardMines,
  customWarning,
  variant,
  noGuessing,
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
  effBoardsBenchmarkModal,
  effBoardsHiddenSettingsModal,
  effBoardsStoredDisplayCount,
  effBoardsMaxStoredCount,
  effBoardsStoredFirstClickDisplay,
  effFirstClickType,
  minimumEff,
  effBoardShowSlowGenerationWarning,
  effWebWorkerCountOptions,
  showQuickPaintOptions,
  quickPaintModeDisplay,
  quickPaintClearable,
  quickPaintMinimalMode,
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
  mobileModeEnabled,
  mobileScrollSetting,
  verticalExpert,
  touchActionOverride,
  showQuickStats,
  quickStatsFontSize,
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
  ziniRunnerActive,
  keyboardClickDigKey,
  keyboardClickFlagKey,
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

var game = new Game(); //Needs to be var to stop an access-before-init error
provide("game", game);
</script>
