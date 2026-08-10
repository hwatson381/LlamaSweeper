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

      <BoardConfigBar />

      <div
        v-if="variant === 'board editor' || variant === 'zini explorer'"
        class="q-mx-md"
      >
        <EditorControls class="margin-centreable" />
      </div>
      <EffBoardsStatusBar
        v-if="variant === 'eff boards'"
        class="text-centreable"
      />

      <MeanOpeningsConfig
        v-if="variant === 'mean openings'"
        class="flex-centreable"
      />

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

      <BoardToolsBar
        v-if="variant !== 'zini explorer'"
        class="flex-centreable"
      />

      <div v-if="variant === 'eff boards'" class="q-mx-md">
        <EffBoardsConfig class="q-my-md margin-centreable" />
      </div>

      <SettingsPanel
        class="margin-centreable"
        @scroll-to-board="scrollToBoard"
      />

      <br />
      <p class="text-centreable q-px-md">(textures from minesweeper.online)</p>
    </div>
  </q-page>

  <!-- Start of Modals -->

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

  <!-- End of Modals -->

  <MobileFlagButton v-if="mobileModeEnabled && !replayIsShown" />

  <QuickStatsBox v-if="flagToggleShowReset && showQuickStats" />

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
import EffBoardsConfig from "src/components/EffBoardsConfig.vue";
import MobileFlagButton from "src/components/MobileFlagButton.vue";
import QuickStatsBox from "src/components/QuickStatsBox.vue";
import EditorControls from "src/components/EditorControls.vue";
import BoardConfigBar from "src/components/BoardConfigBar.vue";
import MeanOpeningsConfig from "src/components/MeanOpeningsConfig.vue";
import EffBoardsStatusBar from "src/components/EffBoardsStatusBar.vue";
import BoardToolsBar from "src/components/BoardToolsBar.vue";

const DevBlock = defineAsyncComponent(() =>
  import("src/components/DevBlock.vue")
);

import { useRoute, useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();

import { debounce } from "quasar";

import {
  showStatsBlock,
  settingsModal,
  variantsHelpModal,
  gameCalculatedMarginLeft,
  gameVerticalPadding,
  gameTopPadding,
  gameBottomPadding,
  centreInterface,
  boardWidth,
  boardHeight,
  boardMines,
  variant,
  generateEffBoardsInBackground,
  effBoardsMaxStoredCount,
  minimumEff,
  isCurrentlyEditModeDisplay,
  flagToggleShowReset,
  mobileModeEnabled,
  mobileScrollSetting,
  touchActionOverride,
  showQuickStats,
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
