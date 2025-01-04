<template>
  <q-page>
    <div
      class="q-pa-md"
      @mousedown="game.handleMouseDown($event)"
      @mouseup="game.handleMouseUp($event)"
      @mousemove="game.handleMouseMove($event)"
    >
      <h5>Llama's minesweeper variants</h5>
      <p>
        This is just a bunch of minesweeper variants I made. I should put an
        explanation of what they are somewhere... Variants can be changed with
        the dropdown immediately below.
      </p>
      <button @click="bulkrun">Bulk run</button>
      Use organised premiums:
      <input v-model="useOrgPrem" type="checkbox" /><br />
      Use 8-way: <input v-model="use8Way" type="checkbox" /><br />
      Iterations: <input v-model.number="bulkIterations" type="text" />
      <!--<button @click="game.reset">reset board</button>--><br />
      <q-select
        class="q-mx-md q-mb-md"
        outlined
        options-dense
        dense
        transition-duration="100"
        input-debounce="0"
        v-model="variant"
        style="width: 175px"
        :options="
          Object.freeze([
            'normal',
            'board editor',
            'mean openings',
            'eff boards',
            'zini explorer',
          ])
        "
        stack-label
        label="Variant"
        @update:model-value="game.reset()"
      ></q-select>
      <div class="flex" style="margin: 5px">
        <div class="q-gutter-sm">
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
        <q-btn
          @click="settingsModal = true"
          color="secondary"
          label="display settings (scale etc.)"
          style="margin-left: 30px"
        />
      </div>
      <template v-if="boardSizePreset === 'custom'">
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
      <div v-if="variant === 'eff boards'">
        Generating boards with target eff: {{ minimumEff }}% (change this in
        settings below)
        <span v-if="generateEffBoardsInBackground" class="text-info"
          >{{ effBoardsStoredDisplayCount }}/20 (click:
          {{ effBoardsStoredFirstClickDisplay }})</span
        >
      </div>

      <div
        class="clearfix q-my-md"
        :style="{ paddingLeft: gameLeftPadding + 'px' }"
      >
        <canvas ref="main-canvas" id="main-canvas" @contextmenu.prevent>
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
                  statsObject.clicks === statsObject.zini,
                'sub-zini':
                  variant === 'eff boards' &&
                  statsObject.isWonGame &&
                  statsObject.clicks < statsObject.zini,
              }"
            >
              Eff: {{ statsObject.eff }}%
            </div>
            <div>Max Eff: {{ statsObject.maxEff }}%</div>
            <div>Clicks: {{ statsObject.clicks }}</div>
            <div>Zini (not WoM): {{ statsObject.zini }}</div>
            <div>
              Zini (ptta):
              <a target="_blank" :href="statsObject.pttaLink">link</a>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div>
        <q-card>
          <q-tabs
            v-model="settingsTab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="justify"
            narrow-indicator
          >
            <q-tab name="main" label="Main Settings" />
            <q-tab name="other" label="Other Settings" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="settingsTab" animated>
            <q-tab-panel name="main">
              <div class="text-h6">Main Settings</div>
              <div>
                <template v-if="variant === 'eff boards'">
                  <div v-if="boardSizePreset === 'beg'" class="flex">
                    <q-select
                      class="q-mx-md q-mb-md"
                      outlined
                      options-dense
                      dense
                      transition-duration="100"
                      input-debounce="0"
                      v-model="begEffPreset"
                      style="width: 145px"
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
                      style="width: 145px"
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
                      style="width: 145px"
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
                      v-if="effBoardShowSlowGenerationWarning"
                      class="text-info"
                      style="flex: 1 1 200px"
                    >
                      <b>IMPORTANT:</b> Recommended for high target efficiencies
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
                      style="width: 175px; flex-shrink: 0"
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
                      Boards generated in the background will use the value of
                      this setting at time of generation and will ignore the
                      "Mouse" option
                    </div>
                  </div>
                </template>

                PttaUrl (VERY HACKY):
                <input v-model="pttaUrl" type="text" value="" /><br />
                <q-checkbox v-model="zeroStart" label="Zero Start" />
              </div>
            </q-tab-panel>

            <q-tab-panel name="other">
              <div class="text-h6">Other Settings</div>
              <div>
                Game-left-padding: <br />
                <q-slider
                  v-model="gameLeftPadding"
                  :min="0"
                  :max="1000"
                  :step="1"
                  label
                  color="light-green"
                  style="width: 50%"
                /><br />
                <button @click="settingsModal = true">
                  Change board display size
                </button>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
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
          :max="60"
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
</template>

<style scoped>
#main-canvas {
  user-select: none;
  float: left;
  margin-right: 10px;
  margin-bottom: 10px;
}

#eff-stat.zini-match {
  color: #007b00;
}

#eff-stat.sub-zini {
  color: #986d00;
}

body.body--dark #eff-stat.zini-match {
  color: lime;
}

body.body--dark #eff-stat.sub-zini {
  color: gold;
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

defineOptions({
  name: "PlayPage",
});

onMounted(() => {
  document.body.addEventListener("keydown", handleKeyDown);
  skinManager.addCallbackWhenAllLoaded(() => {
    game.initialise();
  });
});

onUnmounted(() => {
  document.body.removeEventListener("keydown", handleKeyDown);
  game.unmount();
  effShuffleManager.unmount();
});

function handleKeyDown(event) {
  if (event.key === " " || event.key === "F2") {
    game.reset();
    event.preventDefault();
  }
}

//Utility to restrict number to range
function clamp(number, min, max) {
  return Math.max(Math.min(number, max), min);
}

const mainCanvas = useTemplateRef("main-canvas");
const UNREVEALED = "UNREVEALED";
const FLAG = "FLAG";
const MINE = "MINE";
const MINERED = "MINERED";

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
  clicks: null,
  zini: null,
  pttaLink: null,
});

let settingsModal = ref(false);
let tileSizeSlider = ref(25);
let gameLeftPadding = ref(30);
let showBorders = ref(true);
let showTimer = ref(true);
let showMineCount = ref(true);
let showCoords = ref(false);

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
let customWidth = ref(8);
let customHeight = ref(8);
let customMines = ref(10);
let boardWidth = computed(() => {
  switch (boardSizePreset.value) {
    case "beg":
      return 9;
    case "int":
      return 16;
    case "exp":
      return 30;
    case "custom":
      return Math.floor(clamp(customWidth.value, 1, 100));
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
      return 16;
    case "custom":
      return Math.floor(clamp(customHeight.value, 1, 100));
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
          clamp(customWidth.value * customHeight.value - 1, 0, 2500)
        );
      }
      return Math.floor(clamp(customMines.value, 0, 2500));
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

let variant = ref("normal");
let settingsTab = ref("main");
let zeroStart = ref(true);

let begEffPreset = ref(200);
let begEffOptions = Object.freeze([200, 210, 225, "custom"]);
let begEffCustom = ref(235);
const begEffSlowGenPoint = 210;
let intEffPreset = ref(160);
let intEffOptions = Object.freeze([160, 170, 180, "custom"]);
let intEffCustom = ref(189);
const intEffSlowGenPoint = 180;
let expEffPreset = ref(150);
let expEffOptions = Object.freeze([150, 160, 170, "custom"]);
let expEffCustom = ref(180);
const expEffSlowGenPoint = 170;
let customEffCustom = ref(150);
let generateEffBoardsInBackground = ref(false);
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

  return clamp(minEff, 100, 340);
});
let effBoardShowSlowGenerationWarning = computed(() => {
  //Whether we show a warning that generating the target eff on eff boards variant may be slow
  if (variant.value === "eff boards") {
    if (generateEffBoardsInBackground.value) {
      return false;
    }
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
let browserSupportsWebWorkers = computed(() => {
  if (window.Worker) {
    return true;
  } else {
    return false;
  }
});
watchEffect(() => {
  if (variant.value === "eff boards" && generateEffBoardsInBackground.value) {
    effShuffleManager && effShuffleManager.activateBackgroundGeneration();
  } else {
    effShuffleManager && effShuffleManager.deactivateBackgroundGeneration();
  }
});
watch([boardWidth, boardHeight, boardMines, minimumEff], () => {
  if (variant.value === "eff boards" && generateEffBoardsInBackground.value) {
    effShuffleManager && effShuffleManager.sendWorkerCurrentTaskDebounced();
  }
});

let useOrgPrem = ref(false);
let use8Way = ref(false);
let bulkIterations = ref(1000);
function bulkrun() {
  let eight200 = 0;
  let single200 = 0;
  let singleNeedsInvestigating = 0;
  let investigate200 = 0;
  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    let is8Way = use8Way.value;
    let orgPrem = useOrgPrem.value;

    benchmark.startTime("with-preprocessed");
    let preprocessedData =
      algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    benchmark.startTime("full-3bv-run");
    let bbbv = algorithms.calc3bv(mines, false, preprocessedData).bbbv;
    benchmark.stopTime("full-3bv-run");

    benchmark.startTime("full-zini-run");
    let singleZini = algorithms.calcBasicZini(mines, false, preprocessedData);
    let eightZini = algorithms.calcBasicZini(mines, true, preprocessedData);
    benchmark.stopTime("full-zini-run");
    benchmark.stopTime("with-preprocessed");

    //If saving 1.15x as many clicks as zini (plus 2 more) would breach 200 then investigate further
    let investigate = false;

    if (bbbv / (bbbv - (bbbv - singleZini) * 1.15 - 2) >= 2) {
      singleNeedsInvestigating++;
      investigate = true;
    }

    if (bbbv / eightZini >= 2) {
      eight200++;
      if (bbbv / singleZini >= 2) {
        single200++;
      }
      if (investigate) {
        investigate200++;
      }

      console.log(
        `8way: ${eightZini}, single: ${singleZini}, investigate?:${investigate} 3bv: ${bbbv}`
      );
    }
  }
  console.log(
    `8 way found: ${eight200}, single way found: ${single200}, investigate found: ${investigate200}. Investigate ratio: ${singleNeedsInvestigating}/${bulkIterations.value}`
  );
  benchmark.report();
  benchmark.clearAll();
}

class Game {
  constructor() {}

  initialise() {
    //Called once at the start to set up the board object and do the first draw.
    this.board = new Board(
      boardWidth.value,
      boardHeight.value,
      boardMines.value,
      tileSizeSlider.value,
      variant.value
    );
  }

  reset() {
    if (!this.board) {
      window.alert("Board has not been initialised yet. Reset failed.");
      return;
    }

    this.board.resetBoard(
      boardWidth.value,
      boardHeight.value,
      boardMines.value,
      tileSizeSlider.value,
      variant.value
    );
  }

  resetAndUnfocus() {
    //Only needed for when radio buttons for beg/int/exp are click as otherwise they eat "space" inputs...
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

    this.board.handleMouseMove(event);
  }
}

class Board {
  constructor(width, height, mineCount, tileSize, variant) {
    this.gameStage = "uninitialised";
    this.updateTimerSetTimeoutHandle = null; //Handle for starting/stopping setTimeOut process that checks whether timer needs updating
    this.isLeftMouseDown = false;

    this.resetBoard(width, height, mineCount, tileSize, variant);
  }

  resetBoard(width, height, mineCount, tileSize, variant) {
    //Set to state of board pregame where everything is unrevealed and mines haven't been generated yet
    this.width = width;
    this.height = height;
    this.mineCount = mineCount;
    this.tileSize = tileSize;
    this.variant = variant;

    this.hoveredSquare = { x: null, y: null }; //Square that is being hovered over

    this.mines = null;
    //Which squares have revealed etc
    this.revealedNumbers = new Array(this.width)
      .fill(0)
      .map(() =>
        new Array(this.height).fill(0).map(() => new Tile(UNREVEALED))
      );

    this.blasted = false;
    this.openedTiles = 0;
    this.stats = null;
    this.unflagged = this.mineCount;
    this.integerTimer = 0;
    this.boardStartTime = 0;

    this.clearTimerTimeout();

    this.gameStage = "pregame";
    showStatsBlock.value = false;

    mainCanvas.value.width =
      width * tileSizeSlider.value + 2 * boardHorizontalPadding.value;
    mainCanvas.value.height =
      height * tileSizeSlider.value +
      boardTopPadding.value +
      boardBottomPadding.value;

    this.draw();
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

  handleMouseDown(event) {
    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return;
    }

    let flooredCoords = this.eventToFlooredTileCoords(event);
    let unflooredCoords = this.eventToUnflooredTileCoords(event);

    if (event.button === 0) {
      this.holdDownLeftMouse(flooredCoords.tileX, flooredCoords.tileY);
      this.draw();
    }

    if (
      event.button === 2 &&
      event.target === mainCanvas.value &&
      this.gameStage === "running"
    ) {
      this.attemptFlag(unflooredCoords.tileX, unflooredCoords.tileY);
      this.draw();
    }
  }

  handleMouseUp(event) {
    if (event.button !== 0) {
      //Ignore all mouse up events except for left mouse up
      return;
    }

    let canvasCoords = this.eventToCanvasCoord(event);
    let flooredCoords = this.eventToFlooredTileCoords(event);
    let unflooredCoords = this.eventToUnflooredTileCoords(event);

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
      if (
        canvasCoords.canvasRawX >= faceStartX &&
        canvasCoords.canvasRawX <= faceStartX + faceWidth &&
        canvasCoords.canvasRawY >= faceStartY &&
        canvasCoords.canvasRawY <= faceStartY + faceWidth
      ) {
        this.updateDepressedSquares(
          flooredCoords.tileX, //Coords not strictly necessary, but including incase this changes
          flooredCoords.tileY,
          false
        );
        game.reset(); //Reset and don't process the click any further
        return;
      }
    }

    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return; //Clicks on the board (as opposed to on face) do nothing on win/lose screen
    }

    if (this.gameStage === "pregame") {
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
          false
        );
        return; //Don't start game. Click not inbounds, or something else went wrong
      }
    }
    this.attemptChordOrDig(unflooredCoords.tileX, unflooredCoords.tileY);
    if (this.blasted) {
      this.doLose();
    } else if (this.checkWin()) {
      this.doWin();
    }
    this.draw();
  }

  handleMouseMove(event) {
    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return; //only track mouse when game is running or just before
    }

    //Commented out as we need to track when the canvas is left
    /*
    if (event.target !== mainCanvas.value) {
      return;
    }
    */

    let unflooredCoords = this.eventToUnflooredTileCoords(event);

    const requiresRedraw = this.mouseMove(
      unflooredCoords.tileX,
      unflooredCoords.tileY
    );
    if (requiresRedraw) {
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
        firstClick
      );

      if (effBoardResult === false) {
        return { success: false }; //Failed to generate eff board
      }

      this.mines = effBoardResult.mines;

      if (effBoardResult.firstClick) {
        rewrittenFirstClick = effBoardResult.firstClick;
      }
    } else {
      this.mines = BoardGenerator.basicShuffle(
        this.width,
        this.height,
        this.mineCount,
        firstClick,
        zeroStart.value
      );
    }

    //Which squares have revealed etc
    this.revealedNumbers = new Array(this.width)
      .fill(0)
      .map(() =>
        new Array(this.height).fill(0).map(() => new Tile(UNREVEALED))
      );

    this.stats = new BoardStats(this.mines);
    this.boardStartTime = performance.now();
    this.clearTimerTimeout(); //defensive as it should already be disabled since we reset board.
    this.updateTimerSetTimeoutHandle = setTimeout(
      this.updateIntegerTimerIfNeeded.bind(this),
      100
    );

    return { success: true, rewrittenFirstClick: rewrittenFirstClick };
  }

  updateIntegerTimerIfNeeded() {
    let newTimerValue = Math.floor(this.getTime() / 1000);

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
    return performance.now() - this.boardStartTime;
  }

  /*
  reset() {
    //Which squares contain mines
    if (pttaUrl.value !== "") {
      this.mines = BoardGenerator.readFromPtta(
        this.width,
        this.height,
        this.mineCount
      );
    } else {
      this.mines = BoardGenerator.basicShuffle(
        this.width,
        this.height,
        this.mineCount
      );
    }

    //Which squares have revealed etc
    this.revealedNumbers = new Array(this.width)
      .fill(0)
      .map(() =>
        new Array(this.height).fill(0).map(() => new Tile(UNREVEALED))
      );

    this.blasted = false;
    this.openedTiles = 0;
    this.stats = new BoardStats(this.mines);
  }
  */

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

  attemptFlag(unflooredTileX, unflooredTileY) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (this.revealedNumbers[tileX][tileY].state === UNREVEALED) {
      //Flag the square
      this.revealedNumbers[tileX][tileY].state = FLAG;
      this.unflagged--;
      this.stats.addRight(tileX, tileY, time);
    } else if (this.revealedNumbers[tileX][tileY].state === FLAG) {
      //Unflag a square
      this.revealedNumbers[tileX][tileY].state = UNREVEALED;
      this.unflagged++;
      this.stats.makeMostRecentRightWasted(tileX, tileY);
      this.stats.addWastedRight(tileX, tileY, time);
    } else {
      //Wasted flag input
      this.stats.addWastedRight(tileX, tileY, time);
    }
  }

  attemptChordOrDig(unflooredTileX, unflooredTileY) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    this.updateDepressedSquares(tileX, tileY, false); //Undepress square as we have just done leftMouseUp

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (typeof this.revealedNumbers[tileX][tileY].state === "number") {
      //Attempt chord tile
      this.chord(tileX, tileY, true, time);
    } else if (this.revealedNumbers[tileX][tileY].state === UNREVEALED) {
      this.openTile(tileX, tileY);
      this.stats.addLeft(tileX, tileY, time);
    } else {
      this.stats.addWastedLeft(tileX, tileY, time);
    }
  }

  holdDownLeftMouse(tileX, tileY) {
    //Don't track this in stats yet (but may add in future)
    //All this does is depress the current square or surrounding squares as the user pressed down left mouse
    this.updateDepressedSquares(tileX, tileY, true);
  }

  openTile(x, y) {
    if (!this.checkCoordsInBounds(x, y)) {
      return; //ignore squares outside board
    }

    //Opens a square, possibly triggering an opening recursively
    if (this.revealedNumbers[x][y].state !== UNREVEALED) {
      return;
    }

    if (this.mines[x][y]) {
      this.revealedNumbers[x][y].state = MINERED;
      this.blasted = true;
    } else {
      const number = this.getNumberSurroundingMines(x, y);
      this.revealedNumbers[x][y].state = number;
      this.openedTiles++;

      if (number === 0) {
        this.chord(x, y, false);
      }
    }
  }

  mouseMove(unflooredTileX, unflooredTileY) {
    let time = this.getTime();

    let { tileX, tileY } = this.unflooredToFlooredTileCoords(
      unflooredTileX,
      unflooredTileY
    );

    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      this.isLeftMouseDown
    );

    if (!this.gameStage === "pregame") {
      this.stats.addMouseMove(unflooredTileX, unflooredTileY, time);
    }

    return requiresRedraw;
  }

  updateDepressedSquares(tileX, tileY, newIsLeftMouseDownValue) {
    //Handle depressing squares when left mouse is down and over an square or an number (in which case this "prepares" the chord)

    //Set tileX/tileY to null if out of bounds
    if (!this.checkCoordsInBounds(tileX, tileY)) {
      tileX = null;
      tileY = null;
    }

    const leftMouseDownChanged =
      this.isLeftMouseDown !== newIsLeftMouseDownValue;

    const hoveredSquareMoved =
      tileX !== this.hoveredSquare.x || tileY !== this.hoveredSquare.y;

    if (!hoveredSquareMoved && !leftMouseDownChanged) {
      const requiresRedraw = false;
      return requiresRedraw;
    }

    //Maybe slightly excessive, but easier to clear out hover and reapply each time rather than going through all cases

    //Clear out old hover (3x3 block so we don't have to check whether it was a chord or singleton)
    for (let x = this.hoveredSquare.x - 1; x <= this.hoveredSquare.x + 1; x++) {
      for (
        let y = this.hoveredSquare.y - 1;
        y <= this.hoveredSquare.y + 1;
        y++
      ) {
        if (this.revealedNumbers[x]?.[y]) {
          this.revealedNumbers[x][y].depressed = false;
        }
      }
    }

    //Apply new hover
    if (tileX !== null && tileY !== null && newIsLeftMouseDownValue) {
      //Single square
      if (this.revealedNumbers[tileX][tileY].state === UNREVEALED) {
        this.revealedNumbers[tileX][tileY].depressed = true;
      }

      //Chord
      if (typeof this.revealedNumbers[tileX][tileY].state === "number") {
        for (let x = tileX - 1; x <= tileX + 1; x++) {
          for (let y = tileY - 1; y <= tileY + 1; y++) {
            //Note that the middle square automatically gets excluded as it's been revealed
            if (this.revealedNumbers[x]?.[y]?.state === UNREVEALED) {
              this.revealedNumbers[x][y].depressed = true;
            }
          }
        }
      }
    }

    this.hoveredSquare.x = tileX;
    this.hoveredSquare.y = tileY;
    this.isLeftMouseDown = newIsLeftMouseDownValue;

    const requiresRedraw = true;
    return requiresRedraw;
  }

  getNumberSurroundingMines(x, y) {
    let count = 0;
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (i === x && j === y) {
          continue; //dont count square itself
        }
        if (!this.checkCoordsInBounds(i, j)) {
          continue; //ignore squares outside board
        }
        if (this.mines[i][j]) {
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
        if (this.revealedNumbers[i][j].state === FLAG) {
          count++;
        }
      }
    }

    return count;
  }

  chord(x, y, includeInStats = false, time = 0) {
    if (!this.checkCoordsInBounds(x, y)) {
      return; //ignore squares outside board
    }

    if (typeof this.revealedNumbers[x][y].state !== "number") {
      return; //Can only chord numbers
    }

    if (
      this.revealedNumbers[x][y].state === this.getNumberSurroundingFlags(x, y)
    ) {
      //Correct number of flags, so do chord
      for (let i = x - 1; i <= x + 1; i++) {
        for (let j = y - 1; j <= y + 1; j++) {
          if (i === x && j === y) {
            continue; //don't open square itself
          }
          if (!this.checkCoordsInBounds(i, j)) {
            continue; //ignore squares outside board
          }
          if (this.revealedNumbers[i][j].state === UNREVEALED) {
            this.openTile(i, j);
          }
        }
      }
      if (includeInStats) {
        this.stats.addChord(x, y, time);
      }
    } else {
      if (includeInStats) {
        this.stats.addWastedChord(x, y, time);
      }
    }
  }

  doLose() {
    this.blast();
    this.gameStage = "lost";
    const finalTime = this.getTime();
    this.stats.addEndTime(finalTime);
    this.clearTimerTimeout();
    this.integerTimer = Math.floor(finalTime / 1000);
    this.calculateAndDisplayStats(false);
  }

  blast() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (
          this.mines[x][y] &&
          this.revealedNumbers[x][y].state !== FLAG &&
          this.revealedNumbers[x][y].state !== MINERED
        ) {
          this.revealedNumbers[x][y].state = MINE;
        }
      }
    }
  }

  doWin() {
    this.markRemainingFlags();
    this.gameStage = "won";
    const finalTime = this.getTime();
    this.stats.addEndTime(finalTime);
    this.clearTimerTimeout();
    this.integerTimer = Math.floor(finalTime / 1000);
    this.calculateAndDisplayStats(true);
  }

  markRemainingFlags() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (
          this.mines[x][y] &&
          this.revealedNumbers[x][y].state === UNREVEALED
        ) {
          this.revealedNumbers[x][y].state = FLAG;
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

  calculateAndDisplayStats(isWin) {
    this.stats.calcStats(isWin, this.revealedNumbers);
    showStatsBlock.value = true;
  }

  draw() {
    const ctx = mainCanvas.value.getContext("2d");
    ctx.clearRect(0, 0, mainCanvas.value.width, mainCanvas.value.height);

    this.drawTiles();
    this.drawBorders();
    this.drawCoords();
    this.drawTopBar();
  }

  drawTiles() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.revealedNumbers[x][y].draw(
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

    //Draw flat background for top panel
    ctx.fillStyle = skinManager.getTopPanelColour();
    ctx.fillRect(
      boardHorizontalPadding.value,
      topPanelTopAndBottomBorder.value,
      this.width * this.tileSize,
      topPanelHeight.value
    );

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

    //Draw timer
    if (showTimer.value) {
      ctx.textAlign = "right";
      ctx.fillText(
        this.integerTimer,
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
}

class Tile {
  constructor(state) {
    this.state = state; //Possible values are numbers (e.g. 0, 1, 2... and stuff like UNREVEALED etc)
    this.depressed = false;
  }

  draw(rawX, rawY, size) {
    const ctx = mainCanvas.value.getContext("2d");

    //Depressed squares get drawn as an open tile
    const toDraw = this.depressed ? 0 : this.state;

    ctx.drawImage(skinManager.getImage(toDraw), rawX, rawY, size, size);
  }
}

class SkinManager {
  constructor() {
    const keyImageMapping = [
      [0, "/img/tiles/type0.svg"],
      [1, "/img/tiles/type1.svg"],
      [2, "/img/tiles/type2.svg"],
      [3, "/img/tiles/type3.svg"],
      [4, "/img/tiles/type4.svg"],
      [5, "/img/tiles/type5.svg"],
      [6, "/img/tiles/type6.svg"],
      [7, "/img/tiles/type7.svg"],
      [8, "/img/tiles/type8.svg"],
      [UNREVEALED, "/img/tiles/closed.svg"],
      [FLAG, "/img/tiles/flag.svg"],
      [MINE, "/img/tiles/mine.svg"],
      [MINERED, "/img/tiles/mine_red.svg"],
      ["b_hor", "/img/borders/border_hor_2x.png"],
      ["b_vert", "/img/borders/border_vert_2x.png"],
      ["b_c_bot_left", "/img/borders/corner_bottom_left_2x.png"],
      ["b_c_bot_right", "/img/borders/corner_bottom_right_2x.png"],
      ["b_c_up_left", "/img/borders/corner_up_left_2x.png"],
      ["b_c_up_right", "/img/borders/corner_up_right_2x.png"],
      ["t_left", "/img/borders/t_left_2x.png"],
      ["t_right", "/img/borders/t_right_2x.png"],
      ["f_unpressed", "/img/borders/face_unpressed.svg"],
    ];
    this.imagesLoadedCount = 0;
    this.imagesToLoadCount = keyImageMapping.length;
    this.images = {};
    keyImageMapping.forEach((el) => this.addImage(el[0], el[1]));
  }

  addImage(key, src) {
    let img = new Image();
    img.src = src;
    if (img.complete) {
      this.incrementImagesLoaded();
    } else {
      img.addEventListener("load", () => {
        skinManager.incrementImagesLoaded();
      });
    }

    this.images[key] = img;
  }

  incrementImagesLoaded() {
    this.imagesLoadedCount++;

    if (this.imagesLoadedCount === this.imagesToLoadCount) {
      if (typeof this.callback === "function") {
        this.callback();
      }
    }
  }

  addCallbackWhenAllLoaded(callback) {
    if (this.imagesLoadedCount === this.imagesToLoadCount) {
      callback();
    } else {
      this.callback = callback;
    }
  }

  getImage(value) {
    if (this.images.hasOwnProperty(value)) {
      return this.images[value];
    } else {
      return this.images.MINERED;
    }
  }

  getTopPanelColour() {
    return "#c0c0c0";
  }

  getMineTimerTextColour() {
    return "#000000";
  }

  getCoordTextColour() {
    return "#000000";
  }
}

//Class for doing different board gen. E.g. generating boards with fisher yates or maybe selecting boards with certain properties
class BoardGenerator {
  static basicShuffle(
    width,
    height,
    mineCount,
    safeCoord = null,
    isOpening = false
  ) {
    return algorithms.basicShuffle(
      width,
      height,
      mineCount,
      safeCoord,
      isOpening
    );
  }

  static effBoardShuffle(width, height, mineCount, firstClick) {
    let effBoard = effShuffleManager.provideEffBoard(
      width,
      height,
      mineCount,
      firstClick
    );

    if (!effBoard) {
      //Failed to generate
      return false;
    }

    //Return value has form {mines:[[]], firstClick: {x, y}}.
    //This is because the first click may be changed if using a pregenerated board.
    return effBoard;
  }

  static readFromPtta(width, height, mineCount) {
    //IGNORE width/height/mineCount if diff in ptta and just assume it is correct...
    const minesArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    //VERY HACKY. REDO LATER
    //Mostly lifted from ptta code...
    let b = "";
    let s = "";

    if (pttaUrl.value === "") {
      window.alert("PTTA NOT SET");
      throw new Error("PTTA NOT SET");
    }

    if (pttaUrl.value.startsWith("https")) {
      const pttaAsURL = new URL(pttaUrl.value);
      let b = pttaAsURL.searchParams.get("b");
      console.log(b);
      s = pttaAsURL.searchParams.get("m");
    } else {
      window.alert("PTTA NOT URL");
      throw new Error("PTTA NOT URL");
    }

    for (var i = 0; i < width * height; i += 5) {
      var tempN = parseInt(s.charAt(i / 5), 32);

      if (isNaN(tempN)) continue;

      for (var j = i + 4; j >= i; j--) {
        if (j >= width * height) {
          tempN >>= 1;
          continue;
        }

        //$scope.mines += tempN & 1;
        if (tempN & (1 === 1)) {
          minesArray[j % width][Math.floor(j / width)] = true;
        }
        tempN >>= 1;
      }
    }

    return minesArray;
  }

  static fisherYatesArrayShuffle(arr) {
    algorithms.fisherYatesArrayShuffle(arr);
  }
}

class EffShuffleManager {
  constructor() {
    this.isWorkerInitialised = false;
    this.worker = null;

    //Format is Width-Height-Mines-Eff => [{mines: 2d mines array, firstClick: {x, y}}]
    this.storedBoards = new Map();

    this.isWorkerPaused = true;

    //format is `${width}-${height}-${mineCount}-${targetEff}`
    this.workerCurrentTaskKey = "";

    //string with values such as middle, corner, random, same
    // which square we use as first click for worker generated baords
    this.workerCurrentFirstClickType = "";

    this.maxStoredBoardsPerSize = 20;
    this.sendWorkerCurrentTaskDebounceTimeoutHandle = null;

    //Queue which tracks the most recently played custom games (dimensions and target eff)
    //Boards that are not recently played get garbage collected
    this.recentlyPlayedCustoms = []; //array of `${width}-${height}-${mineCount}-${targetEff}`
    this.maxStoredCustoms = 10;
  }

  provideEffBoard(width, height, mineCount, firstClick) {
    const targetEff = minimumEff.value;
    const timeoutSeconds = 10;

    if (generateEffBoardsInBackground.value) {
      //Check if we have a pre-generated board
      const boardKey = `${width}-${height}-${mineCount}-${targetEff}`;
      const storedBoard = this.storedBoards.get(boardKey);
      this.addRecentlyPlayedCustom(boardKey); //Mark this board as being played since they've requested a board for it (only if it is a custom game)
      if (Array.isArray(storedBoard) && storedBoard.length > 0) {
        let precomputedBoard = storedBoard.shift(); //return precomputed mines array and where the first click was
        effBoardsStoredDisplayCount.value = storedBoard.length;
        effBoardsStoredFirstClickDisplay.value =
          storedBoard[0]?.firstClickType ?? effFirstClickType.value;
        this.sendWorkerCurrentTask(); //Just in case, as worker may need resuming if it was previously paused
        return precomputedBoard;
      }
    }

    //No pre-generated boards (as we would've returned earlier) so try to generate our own

    //change firstClick as needed
    switch (effFirstClickType.value) {
      case "corner":
        firstClick = { x: 0, y: 0 };
        break;
      case "middle":
        firstClick = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
        break;
      //All other cases instead give a random first click
      case "same":
        //Leave first click as is
        break;
      case "random":
        firstClick = null;
        break;
      default:
      //do nothing
    }

    let minesArray = algorithms.effBoardShuffle(
      width,
      height,
      mineCount,
      firstClick,
      targetEff,
      timeoutSeconds
    );

    if (!minesArray) {
      alert("Failed to generate board");
      return false;
    } else {
      if (effFirstClickType.value === "random") {
        firstClick = algorithms.getRandomZeroCell(minesArray);
      }

      if (effFirstClickType.value === "same") {
        firstClick = false; //Signal that we don't change position of the click
      }

      return {
        mines: minesArray,
        firstClick: firstClick, //False as when generating in main thread, we don't change position of first click
      };
    }
  }

  activateBackgroundGeneration() {
    this.initWorkerIfNotAlreadyInited();
    this.sendWorkerCurrentTask();
  }

  deactivateBackgroundGeneration() {
    this.sendWorkerPauseCommand();
  }

  initWorkerIfNotAlreadyInited() {
    if (this.isWorkerInitialised) {
      return;
    }

    if (!window.Worker) {
      return;
    }

    //this.worker = new Worker("src/workers/eff-worker.js");
    this.worker = new Worker(
      new URL("../workers/eff-worker.js", import.meta.url),
      {
        type: "module",
      }
    );

    this.worker.onmessage = this.updateStoredBoard.bind(this);

    this.isWorkerInitialised = true;
  }

  sendWorkerCurrentTaskDebounced() {
    //Calls this.sendWorkerCurrentTask, but only if 500ms have passed without being called again.
    //This reduces unnecessary messages when adjusting dimensions/mines/target eff etc
    let self = this;
    if (this.sendWorkerCurrentTaskDebounceTimeoutHandle !== null) {
      clearTimeout(this.sendWorkerCurrentTaskDebounceTimeoutHandle);
      this.sendWorkerCurrentTaskDebounceTimeoutHandle = null;
    }

    this.sendWorkerCurrentTaskDebounceTimeoutHandle = setTimeout(() => {
      console.log("new task sent for board change");
      self.sendWorkerCurrentTask();
      self.sendWorkerCurrentTaskDebounceTimeoutHandle = null;
      self.garbageCollectStoredBoards();
    }, 500);
  }

  sendWorkerCurrentTask() {
    if (!this.isWorkerInitialised) {
      return;
    }

    this.sendUpdateFirstClickIfNeeded();

    const boardKey = `${boardWidth.value}-${boardHeight.value}-${boardMines.value}-${minimumEff.value}`;

    if (!this.isWorkerPaused && this.workerCurrentTaskKey === boardKey) {
      //Early exit as worker is already generating the board we want
      return;
    }

    const storedBoard = this.storedBoards.get(boardKey);

    if (Array.isArray(storedBoard)) {
      effBoardsStoredDisplayCount.value = storedBoard.length;
      effBoardsStoredFirstClickDisplay.value =
        storedBoard[0]?.firstClickType ?? effFirstClickType.value;
    } else {
      effBoardsStoredDisplayCount.value = 0;
    }

    if (
      Array.isArray(storedBoard) &&
      storedBoard.length >= this.maxStoredBoardsPerSize
    ) {
      //Already generated enough of this board
      this.sendWorkerPauseCommand();
      return;
    }

    this.worker.postMessage({
      command: "process",
      width: boardWidth.value,
      height: boardHeight.value,
      mineCount: boardMines.value,
      targetEff: minimumEff.value,
    });
    this.workerCurrentTaskKey = boardKey;
    this.isWorkerPaused = false;
  }

  sendWorkerPauseCommand() {
    if (!this.isWorkerInitialised) {
      return;
    }

    if (this.isWorkerPaused) {
      //already paused, do nothing
      return;
    }

    this.worker.postMessage({
      command: "pause",
    });

    this.isWorkerPaused = true;
  }

  sendUpdateFirstClickIfNeeded() {
    if (effBoardsStoredDisplayCount.value === 0) {
      effBoardsStoredFirstClickDisplay.value = effFirstClickType.value;
    }

    if (!this.isWorkerInitialised) {
      return;
    }

    if (!this.isWorkerPaused) {
      //Note - ok to return here as unpausing requires calling sendWorkerCurrentTask which also calls this
      return;
    }

    if (this.workerCurrentFirstClickType === effFirstClickType.value) {
      //worker is already using correct first click
      return;
    }

    this.worker.postMessage({
      command: "updateFirstClickType",
      firstClickType: effFirstClickType.value,
    });

    this.workerCurrentFirstClickType = effFirstClickType.value;
  }

  updateStoredBoard(event) {
    let workerBoardKey = event.data.boardKey;
    let foundBoards = event.data.foundBoards;

    console.log(`Adding ${foundBoards.length} board(s) to ${workerBoardKey}`);

    let storedBoardArray = this.storedBoards.get(workerBoardKey);
    if (!storedBoardArray) {
      storedBoardArray = [];
      this.storedBoards.set(workerBoardKey, storedBoardArray);
    }

    for (let board of foundBoards) {
      if (storedBoardArray.length <= this.maxStoredBoardsPerSize - 1) {
        storedBoardArray.push(board);
      }
    }

    //If we are on this board then update counter that tells user how many boards are stored
    if (this.workerCurrentTaskKey === workerBoardKey) {
      effBoardsStoredDisplayCount.value = storedBoardArray.length;
      effBoardsStoredFirstClickDisplay.value =
        storedBoardArray[0]?.firstClickType ?? effFirstClickType.value;
    }

    //Pause worker if we have maxed out the number of stored boards for this size
    if (storedBoardArray.length >= this.maxStoredBoardsPerSize) {
      if (
        this.workerCurrentTaskKey === workerBoardKey &&
        !this.isWorkerPaused
      ) {
        this.sendWorkerPauseCommand();
      }
    }
  }

  garbageCollectStoredBoards() {
    if (!this.isWorkerInitialised) {
      return;
    }

    for (let key of this.storedBoards.keys()) {
      //Parse out width, height, mineCount, targetEff
      let [, width, height, mineCount, targetEff] = key.match(
        /^(\d+)-(\d+)-(\d+)-(\d+)$/
      );
      width = parseInt(width);
      height = parseInt(height);
      mineCount = parseInt(mineCount);
      targetEff = parseInt(targetEff);

      if (
        width === boardWidth.value &&
        height === boardHeight.value &&
        mineCount === boardMines.value &&
        targetEff === minimumEff.value
      ) {
        //currently active board, don't garbage collect
        continue;
      }

      //beginner
      if (key.startsWith("9-9-10-")) {
        if (
          begEffOptions.includes(targetEff) ||
          targetEff > begEffSlowGenPoint
        ) {
          //Don't garbage collect beg if it's a dropdown option or above a certain value
          continue;
        }
      }

      //int
      if (key.startsWith("16-16-40-")) {
        if (
          intEffOptions.includes(targetEff) ||
          targetEff > intEffSlowGenPoint
        ) {
          //Don't garbage collect int if it's a dropdown option or above a certain value
          continue;
        }
      }

      //exp
      if (key.startsWith("16-16-40-")) {
        if (
          expEffOptions.includes(targetEff) ||
          targetEff > expEffSlowGenPoint
        ) {
          //Don't garbage collect exp if it's a dropdown option or above a certain value
          continue;
        }
      }

      //Check if custom game was played within the last x games
      if (this.recentlyPlayedCustoms.includes(key)) {
        continue;
      }

      //Garbage collect if this is a beg/int/exp non-presets below slow gen point
      //Also garbage collect if it is a non-recent custom game
      console.log("deleting " + key);
      this.storedBoards.delete(key);
    }
  }

  addRecentlyPlayedCustom(boardKey) {
    if (!this.isWorkerInitialised) {
      return;
    }

    //exclude games of regular sizes.
    if (boardKey.startsWith("9-9-10-")) {
      return;
    }
    if (boardKey.startsWith("16-16-40-")) {
      return;
    }
    if (boardKey.startsWith("16-16-40-")) {
      return;
    }

    if (this.recentlyPlayedCustoms.includes(boardKey)) {
      return;
    }

    //Add custom to queue
    this.recentlyPlayedCustoms.push(boardKey);
    if (this.recentlyPlayedCustoms.length > this.maxStoredCustoms) {
      this.recentlyPlayedCustoms.shift();
    }
  }

  unmount() {
    if (!this.isWorkerInitialised) {
      return;
    }

    this.worker.terminate();
  }
}

class BoardStats {
  constructor(minesArray) {
    this.mines = structuredClone(minesArray);
    this.clicks = [];
    this.moves = []; //Mouse movements, use separate array as this can get quite large
  }

  addLeft(x, y, time) {
    this.clicks.push({
      type: "left",
      x,
      y,
      time,
    });
  }

  addRight(x, y, time) {
    this.clicks.push({
      type: "right",
      x,
      y,
      time,
    });
  }

  addChord(x, y, time) {
    this.clicks.push({
      type: "chord",
      x,
      y,
      time,
    });
  }

  addWastedLeft(x, y, time) {
    this.clicks.push({
      type: "wasted_left",
      x,
      y,
      time,
    });
  }

  addWastedRight(x, y, time) {
    this.clicks.push({
      type: "wasted_right",
      x,
      y,
      time,
    });
  }

  makeMostRecentRightWasted(x, y) {
    //findLast might be too new? Watch out for browsers not having it
    if (!Array.prototype.findLast) {
      window.alert("Browser missing Array.prototype.findLast");
      return;
    }
    const mostRecentFlag = this.clicks.findLast((click) => {
      return click.type === "right" && click.x === x && click.y === y;
    });

    mostRecentFlag.type = "wasted_right";
  }

  addWastedChord(x, y, time) {
    this.clicks.push({
      type: "wasted_chord",
      x,
      y,
      time,
    });
  }

  addMouseMove(x, y, time) {
    this.moves.push({
      type: "mouse_move",
      x,
      y,
      time,
    });
  }

  calc3bv(revealedNumbers) {
    let { bbbv, solved3bv } = algorithms.calc3bv(this.mines, revealedNumbers);

    this.bbbv = bbbv;
    this.solved3bv = solved3bv;
  }

  calcZini() {
    this.zini = algorithms.calcWomZini(this.mines);
  }

  getPttaLink() {
    let link = new URL(
      "https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/"
    );

    const width = this.mines.length;
    const height = this.mines[0].length;

    let boardDimensions;

    if (width === 9 && height === 9) {
      boardDimensions = "1";
    } else if (width === 16 && height === 16) {
      boardDimensions = "2";
    } else if (width === 30 && height === 16) {
      boardDimensions = "3";
    } else {
      let maxLength = width.toString().length;
      boardDimensions =
        width.toString() + height.toString().padStart(maxLength, "0");
    }

    link.searchParams.set("b", boardDimensions);

    const totalMines = this.mines.flat().filter((s) => s).length;

    if (totalMines != 0) {
      link.searchParams.set("m", this.getPttaMinesString());
    }

    return link.href;
  }

  getPttaMinesString() {
    const width = this.mines.length;
    const height = this.mines[0].length;

    let result = "";

    const totalNumberOfSquares = width * height;
    for (var i = 0; i < totalNumberOfSquares; i += 5) {
      var tempN = 0;
      for (var j = i; j < i + 5; j++) {
        if (j >= totalNumberOfSquares) {
          tempN *= 2;
        } else if (this.mines[j % width][Math.floor(j / width)] === false) {
          tempN *= 2;
        } else {
          tempN *= 2;
          tempN++;
        }
      }
      result += tempN.toString(32);
    }
    return result;
  }

  calcStats(isWin, revealedNumbers) {
    const time = this.endTime / 1000;
    this.calc3bv(revealedNumbers);
    const solved3bv = this.solved3bv;
    const bbbv = this.bbbv;
    const bbbvs = solved3bv / time;

    const estTime = bbbv / bbbvs;

    this.calcZini();
    const zini = this.zini;

    const clicks = this.clicks.length;

    const eff = (100 * solved3bv) / clicks;
    const maxEff = (100 * bbbv) / zini;

    const pttaLink = this.getPttaLink();

    statsObject.value = {};

    if (isWin) {
      statsObject.value.isWonGame = true;
      statsObject.value.time = time.toFixed(3);
      statsObject.value.total3bv = bbbv;
      statsObject.value.bbbvs = bbbvs.toFixed(3);
      statsObject.value.eff = eff.toFixed(0);
      statsObject.value.maxEff = maxEff.toFixed(0);
      statsObject.value.clicks = clicks;
      statsObject.value.zini = zini;
      statsObject.value.pttaLink = pttaLink;
    } else {
      statsObject.value.isWonGame = false;
      statsObject.value.time = time.toFixed(3);
      statsObject.value.estTime = estTime.toFixed(3);
      statsObject.value.solved3bv = solved3bv;
      statsObject.value.total3bv = bbbv;
      statsObject.value.bbbvs = bbbvs.toFixed(3);
      statsObject.value.eff = eff.toFixed(0);
      statsObject.value.maxEff = maxEff.toFixed(0);
      statsObject.value.clicks = clicks;
      statsObject.value.zini = zini;
      statsObject.value.pttaLink = pttaLink;
    }
  }

  addEndTime(time) {
    this.endTime = time;
  }
}

class BoardHistory {
  //Stores past games that we can recover and resume
  //Saves to local storage?
  constructor() {}
}

//Need main loop somewhere

const algorithms = new Algorithms(); //Could probably change to have all static methods, so no need to init?
const benchmark = new Benchmark();
const skinManager = new SkinManager();
var effShuffleManager = new EffShuffleManager(); //Needs to be var to stop an access-before-init error
const boardHistory = new BoardHistory();
const game = new Game();
</script>
