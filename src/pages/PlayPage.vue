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
        :options="[
          'normal',
          'board editor',
          'mean openings',
          'eff boards',
          'zini explorer',
        ]"
        stack-label
        label="Variant"
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
        Generating boards with minimum eff: {{ minimumEff }}% (change this in
        settings below)
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
          <q-card-section>
            <pre>{{ statsText }}</pre>
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
                  <template v-if="boardSizePreset === 'beg'">
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
                      label="Minimum beg eff"
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
                  </template>
                  <template v-if="boardSizePreset === 'int'">
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
                      label="Minimum int eff"
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
                  </template>
                  <template v-if="boardSizePreset === 'exp'">
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
                      label="Minimum exp eff"
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
                  </template>
                  <q-input
                    v-if="boardSizePreset === 'custom'"
                    debounce="100"
                    v-model.number="customEffCustom"
                    label="Minimum Custom eff"
                    type="number"
                    dense
                    min="100"
                    max="340"
                    style="width: 110px"
                  />
                </template>

                PttaUrl (VERY HACKY):
                <input v-model="pttaUrl" type="text" value="" /><br />
                <q-checkbox left-label v-model="zeroStart" label="Zero Start" />
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
          left-label
          v-model="showBorders"
          label="Show borders"
          @update:model-value="game.refreshSize()"
        /><br />
        <q-checkbox
          left-label
          v-model="showTimer"
          label="Show timer"
          @update:model-value="game.board.drawTopBar()"
        /><br />
        <q-checkbox
          left-label
          v-model="showMineCount"
          label="Show mine count"
          @update:model-value="game.board.drawTopBar()"
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
</style>

<script setup>
import { useTemplateRef, computed, ref, onMounted, onUnmounted } from "vue";

defineOptions({
  name: "PlayPage",
});

onMounted(() => {
  document.body.addEventListener("keydown", handleKeyDown);
  skinManager.addCallbackWhenAllLoaded(() => {
    game.reset();
  });
});

onUnmounted(() => {
  document.body.removeEventListener("keydown", handleKeyDown);
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

let showStatsBlock = ref(true);
let statsText = ref(`
Default text lol
Time: 30.563s
3bv/s: 5.47
Eff: 170%/200%
Zini: 10
3bv: 20
Clicks: 17`);
let settingsModal = ref(false);
let tileSizeSlider = ref(40);
let gameLeftPadding = ref(30);
let showBorders = ref(true);
let showTimer = ref(true);
let showMineCount = ref(true);

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
let begEffCustom = ref(243);
let intEffPreset = ref(160);
let intEffOptions = Object.freeze([160, 170, 180, "custom"]);
let intEffCustom = ref(189);
let expEffPreset = ref(140);
let expEffOptions = Object.freeze([140, 150, 160, "custom"]);
let expEffCustom = ref(170);
let customEffCustom = ref(130);
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

let useOrgPrem = ref(false);
let use8Way = ref(false);
let bulkIterations = ref(1000);
function bulkrun() {
  for (let i = 0; i < bulkIterations.value; i++) {
    let mines = BoardGenerator.basicShuffle(
      boardWidth.value,
      boardHeight.value,
      boardMines.value
    );

    let is8Way = use8Way.value;
    let orgPrem = useOrgPrem.value;

    benchmark.startTime("full-zini-run");
    algorithms.calcBasicZini(mines, is8Way, orgPrem);
    benchmark.stopTime("full-zini-run");
  }
  benchmark.report();
  benchmark.clearAll();
}

class Game {
  constructor() {}

  reset() {
    if (this.board) {
      this.board.clearTimerTimeout();
    }

    this.board = new Board(
      boardWidth.value,
      boardHeight.value,
      boardMines.value,
      tileSizeSlider.value
    );
    this.gameStage = "pregame";
    showStatsBlock.value = false;
    //this.board.reset();

    mainCanvas.value.width =
      this.board.width * tileSizeSlider.value +
      2 * boardHorizontalPadding.value;
    mainCanvas.value.height =
      this.board.height * tileSizeSlider.value +
      boardTopPadding.value +
      boardBottomPadding.value;

    this.board.draw();
  }

  resetAndUnfocus() {
    //Only needed for when radio buttons for beg/int/exp are click as otherwise they eat "space" inputs...
    game.reset();
    document.activeElement.blur();
  }

  refreshSize() {
    mainCanvas.value.width =
      this.board.width * tileSizeSlider.value +
      2 * boardHorizontalPadding.value;
    mainCanvas.value.height =
      this.board.height * tileSizeSlider.value +
      boardTopPadding.value +
      boardBottomPadding.value;

    this.board.tileSize = tileSizeSlider.value;
    this.board.draw();
  }

  handleMouseDown(event) {
    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return;
    }

    const canvasRawX =
      event.clientX - mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - mainCanvas.value.getBoundingClientRect().top;

    const boardRawX = canvasRawX - boardHorizontalPadding.value;
    const boardRawY = canvasRawY - boardTopPadding.value;

    if (event.button === 0) {
      this.board.holdDownLeftMouse(boardRawX, boardRawY);
      this.board.draw();
    }

    if (
      event.button === 2 &&
      event.target === mainCanvas.value &&
      this.gameStage === "running"
    ) {
      this.board.attemptFlag(boardRawX, boardRawY);
      this.board.draw();
    }
  }

  handleMouseUp(event) {
    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return; //Clicks do nothing on win/lose screen
    }

    const canvasRawX =
      event.clientX - mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - mainCanvas.value.getBoundingClientRect().top;

    const boardRawX = canvasRawX - boardHorizontalPadding.value;
    const boardRawY = canvasRawY - boardTopPadding.value;

    if (event.button === 0) {
      if (this.gameStage === "pregame") {
        const successfullyGenerated = this.board.generateBoard(
          boardRawX,
          boardRawY
        );
        if (successfullyGenerated) {
          this.gameStage = "running";
          //Game then continues with the code below providing the click to open the first square. It's possible we may change this though
        } else {
          let tileX = Math.floor(boardRawX / this.tileSize);
          let tileY = Math.floor(boardRawY / this.tileSize);
          this.board.updateDepressedSquares(tileX, tileY, false);
          return; //Don't start game. Click not inbounds, or something else went wrong
        }
      }
      this.board.attemptChordOrDig(boardRawX, boardRawY);
      if (this.board.blasted) {
        this.board.blast();
        this.gameStage = "lost";
        const finalTime = this.board.getTime();
        this.board.stats.addEndTime(finalTime);
        this.board.end(finalTime);
        this.board.calculateAndDisplayStats(false);
      } else if (this.board.checkWin()) {
        this.board.markRemainingFlags();
        this.gameStage = "won";
        const finalTime = this.board.getTime();
        this.board.stats.addEndTime(finalTime);
        this.board.end(finalTime);
        this.board.calculateAndDisplayStats(true);
      }
      this.board.draw();
    }
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

    //Convert to canvas coords
    const canvasRawX =
      event.clientX - mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - mainCanvas.value.getBoundingClientRect().top;

    //Convert to board coords
    const boardRawX = canvasRawX - boardHorizontalPadding.value;
    const boardRawY = canvasRawY - boardTopPadding.value;

    const isPregame = this.gameStage === "pregame";
    const requiresRedraw = this.board.mouseMove(
      boardRawX,
      boardRawY,
      isPregame
    );
    if (requiresRedraw) {
      this.board.draw();
    }
  }
}

class Board {
  constructor(width, height, mineCount, tileSize = 40) {
    this.width = width;
    this.height = height;
    this.mineCount = mineCount;
    this.tileSize = tileSize;

    this.hoveredSquare = { x: null, y: null }; //Square that is being hovered over
    this.isLeftMouseDown = false;

    this.clearBoard();
  }

  clearBoard() {
    //Set to state of board pregame where everything is unrevealed and mines haven't been generated yet
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
    this.updateTimerSetTimeoutHandle = null; //Handle for starts/stopping setTimeOut process that checks whether timer needs updating
  }

  generateBoard(boardRawX, boardRawY) {
    let tileX = Math.floor(boardRawX / this.tileSize);
    let tileY = Math.floor(boardRawY / this.tileSize);

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return false;
    }

    const firstClick = {
      x: tileX,
      y: tileY,
    };

    if (variant.value === "eff boards") {
      this.mines = BoardGenerator.effBoardShuffle(
        this.width,
        this.height,
        this.mineCount,
        firstClick
      );

      if (this.mines === false) {
        return false; //Failed to generate eff board
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
    this.updateTimerSetTimeoutHandle = setTimeout(
      this.updateIntegerTimerIfNeeded.bind(this),
      100
    );

    return true;
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

  end(finalTime) {
    //May refactor in future
    clearTimeout(this.updateTimerSetTimeoutHandle);
    this.integerTimer = Math.floor(finalTime / 1000);
  }

  clearTimerTimeout() {
    //May refactor in future. Disables setTimeout for timer
    clearTimeout(this.updateTimerSetTimeoutHandle);
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

  attemptFlag(boardRawX, boardRawY) {
    let time = this.getTime();

    let tileX = Math.floor(boardRawX / this.tileSize);
    let tileY = Math.floor(boardRawY / this.tileSize);

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

  attemptChordOrDig(boardRawX, boardRawY) {
    let time = this.getTime();

    let tileX = Math.floor(boardRawX / this.tileSize);
    let tileY = Math.floor(boardRawY / this.tileSize);

    this.updateDepressedSquares(tileX, tileY, false); //Undepress square as we have just done leftMouseUp

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
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

  holdDownLeftMouse(boardRawX, boardRawY) {
    let tileX = Math.floor(boardRawX / this.tileSize);
    let tileY = Math.floor(boardRawY / this.tileSize);

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

  mouseMove(boardRawX, boardRawY, isPregame) {
    let time = this.getTime();

    let unflooredTileX = boardRawX / this.tileSize;
    let unflooredTileY = boardRawY / this.tileSize;

    let tileX = Math.floor(unflooredTileX);
    let tileY = Math.floor(unflooredTileY);

    const requiresRedraw = this.updateDepressedSquares(
      tileX,
      tileY,
      this.isLeftMouseDown
    );

    if (!isPregame) {
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
    this.drawTopBar();
  }

  drawTiles() {
    const ctx = mainCanvas.value.getContext("2d");

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
}

//Class for doing different board gen. E.g. generating boards with fisher yates or maybe selecting boards with certain properties
class BoardGenerator {
  static badUnusedShuffle(width, height, mineCount) {
    //Generate width x height 2D array
    const minesArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    while (mineCount--) {
      //try add mine somewhere random. Not fisher yates, but ok as low density
      do {
        var xMine = Math.floor(width * Math.random());
        var yMine = Math.floor(height * Math.random());
      } while (minesArray[xMine][yMine]);

      minesArray[xMine][yMine] = true;
    }

    return minesArray;
  }

  static basicShuffle(
    width,
    height,
    mineCount,
    safeCoord = null,
    isOpening = false
  ) {
    let knownSafes = [];
    if (safeCoord) {
      knownSafes.push({ x: safeCoord.x, y: safeCoord.y });
      if (isOpening) {
        for (let x = safeCoord.x - 1; x <= safeCoord.x + 1; x++) {
          for (let y = safeCoord.y - 1; y <= safeCoord.y + 1; y++) {
            if (x === safeCoord.x && y === safeCoord.y) {
              continue;
            }
            if (x >= 0 && x <= width - 1 && y >= 0 && y <= height - 1) {
              knownSafes.push({ x, y });
            }
          }
        }
      }
    }

    if (width * height - knownSafes.length < mineCount) {
      if (width * height - 1 >= mineCount) {
        knownSafes = [{ x: safeCoord.x, y: safeCoord.y }]; //Board too dense, so try remove condition about opening start
      } else {
        throw new Error(`Cannot generate ${width}x${height}/${mineCount}`);
      }
    }

    const flatMinesWithoutKnownSafes = new Array(
      width * height - knownSafes.length
    ).fill(false);

    for (let i = 0; i < mineCount; i++) {
      flatMinesWithoutKnownSafes[i] = true;
    }
    BoardGenerator.fisherYatesArrayShuffle(flatMinesWithoutKnownSafes);

    //Generate width x height 2D array
    const minesArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    let flatIndex = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (knownSafes.some((square) => square.x === x && square.y === y)) {
          continue; //False/safe by default as that's how we initialised
        }
        minesArray[x][y] = flatMinesWithoutKnownSafes[flatIndex];
        flatIndex++;
      }
    }

    return minesArray;
  }

  static effBoardShuffle(width, height, mineCount, firstClick) {
    //Optimisation needed. This calls algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings twice (for 3bv and zini)

    const MAX_RUNTIME = 10; //How many seconds we have to generate the board

    const startTime = performance.now();

    let minesArray = false;

    let attempts = 0;

    while (!minesArray) {
      if (performance.now() - startTime > MAX_RUNTIME * 1000) {
        alert("Failed to generate board");
        console.log(`effBoarShuffle had ${attempts}`);
        return false; //Failed to generate a board in time
      }

      let candidateMinesArray = BoardGenerator.basicShuffle(
        width,
        height,
        mineCount,
        firstClick,
        true //First click is an opening
      );

      const zini = algorithms.calcWomZini(candidateMinesArray);

      const bbbv = algorithms.calc3bv(candidateMinesArray, false).bbbv;

      if (bbbv / zini >= minimumEff.value / 100) {
        //Successfully found a board with at least min eff
        minesArray = candidateMinesArray;
      }

      attempts++;
    }

    console.log(`effBoardShuffle had ${attempts}`);

    return minesArray;
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
    //https://stackoverflow.com/questions/59810241/how-to-fisher-yates-shuffle-a-javascript-array
    var i = arr.length,
      j,
      temp;
    while (--i > 0) {
      j = Math.floor(Math.random() * (i + 1));
      temp = arr[j];
      arr[j] = arr[i];
      arr[i] = temp;
    }
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

  /*
  floodOpeningFor3bv(x, y, openingLabels, numbersArray, newLabel) {
    if (openingLabels[x]?.[y] !== 0) {
      //Square outside board or has already been processed
      return;
    }

    if (this.mines[x]?.[y]) {
      //Not really needed as this gets set elsewhere, but just in case
      openingLabels[x][y] = "x";
      return;
    }

    //Check if square is on the board
    if (typeof numbersArray[x]?.[y] === "undefined") {
      //This check isn't really needed since we check earlier. Defensive programming.
      return;
    } else if (numbersArray[x][y] !== 0) {
      openingLabels[x][y] = "+"; //Squares that are on the edge of an opening
      return;
    } else if (numbersArray[x][y] === 0) {
      openingLabels[x][y] = newLabel;
      //Flood square
      this.floodOpeningFor3bv(
        x - 1,
        y - 1,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(x - 1, y, openingLabels, numbersArray, newLabel);
      this.floodOpeningFor3bv(
        x - 1,
        y + 1,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(x, y - 1, openingLabels, numbersArray, newLabel);
      this.floodOpeningFor3bv(x, y + 1, openingLabels, numbersArray, newLabel);
      this.floodOpeningFor3bv(
        x + 1,
        y - 1,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(x + 1, y, openingLabels, numbersArray, newLabel);
      this.floodOpeningFor3bv(
        x + 1,
        y + 1,
        openingLabels,
        numbersArray,
        newLabel
      );
    }
  }
  */

  calcZini() {
    this.zini = algorithms.calcWomZini(this.mines);
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

    if (isWin) {
      statsText.value = `
      Time: ${time.toFixed(3)}s
      3bv: ${bbbv}
      3bv/s: ${bbbvs.toFixed(3)}
      Eff: ${eff.toFixed(0)}%
      Max Eff: ${maxEff.toFixed(0)}%
      Clicks: ${clicks}
      Zini (not WoM): ${zini}`;
    } else {
      statsText.value = `
      Time: ${time.toFixed(3)}s
      Est. Time: ${estTime.toFixed(3)}
      3bv: ${solved3bv}/${bbbv}
      3bv/s: ${bbbvs.toFixed(3)}
      Eff: ${eff.toFixed(0)}%
      Max Eff: ${maxEff.toFixed(0)}%
      Clicks: ${clicks}
      Zini (not WoM): ${zini}`;
    }
  }

  addEndTime(time) {
    this.endTime = time;
  }
}

class Algorithms {
  constructor() {}

  calcBasicZini(mines, is8Way, doBinarySearchOptimisation = false) {
    //Get various data structures which information about numbers and openings
    const { numbersArray, openingLabels, preprocessedOpenings } =
      algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    const width = mines.length;
    const height = mines[0].length;

    //false for unrevealed, true for revealed
    const revealedStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    //false for unflagged, true for flagged
    const flagStates = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(false));

    //saved info for square about what the neighbours are
    const squareInfo = new Array(width).fill(0).map(() =>
      new Array(height).fill(0).map(() => {
        return {
          isMine: false,
          number: null, //Set later
          is3bv: null, //Set later. Note that this info can also be determined by whether this.number = 0 and this.openingsTouched.size = 0
          labelIfOpening: null, //Set later if this is a zero square. This gives the "identifier" of the opening this square is part of
          mineNeighbours: [],
          safeNeighbours: [],
          nonOpening3bvNeighbours: [], //i.e. single "protected" squares
          openingsTouched: new Set(), //These correspond to "3bv" that are openings. Values are the labels of the openings it touches
        };
      })
    );

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const thisSquare = squareInfo[x][y];

        //Is this square a mine
        if (mines[x][y]) {
          thisSquare.isMine = true;
          continue;
        }
        //What number is this square
        thisSquare.number = numbersArray[x][y];

        //Is the square 3bv
        if (openingLabels[x][y] === 0 || numbersArray[x][y] === 0) {
          thisSquare.is3bv = true;
        } else {
          thisSquare.is3bv = false;
        }

        if (numbersArray[x][y] === 0) {
          thisSquare.labelIfOpening = openingLabels[x][y];
        }

        //Gather info about the neighbours of this square
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (i < 0 || i >= width || j < 0 || j >= height) {
              continue; //Neighbour Square outside board
            }
            if (i === x && j === y) {
              continue; //The square itself is not a neighbour
            }

            if (mines[i][j]) {
              thisSquare.mineNeighbours.push({ x: i, y: j });
              continue;
            } else {
              thisSquare.safeNeighbours.push({ x: i, y: j });
            }

            if (openingLabels[i][j] === 0) {
              //Neighbour cell is a protected square
              thisSquare.nonOpening3bvNeighbours.push({ x: i, y: j });
            } else if (
              typeof openingLabels[i][j] === "number" &&
              numbersArray[x][y] !== 0
            ) {
              //Neighbour cell belongs to the opening with label openingLabels[i][j]
              //Note that openingsTouched is a set since a square can have multiple neighbours belonging to the same opening
              //Also note that we don't track openings touched if the square itself is a zero as this messes up zini calc
              thisSquare.openingsTouched.add(openingLabels[i][j]);
            }
          }
        }
      }
    }

    //store premiums of opening + chording each cell
    const premiums = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(null));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (mines[x][y]) {
          continue;
        }
        this.updatePremiumForCoord(
          x,
          y,
          squareInfo,
          flagStates,
          revealedStates,
          premiums,
          preprocessedOpenings
        );
      }
    }

    //Work out how many squares need to be revealed for it to be solved (will typically be width * height - mines, but we may add the option to calc zini from current board state in future)
    let revealedSquaresToSolve = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (!mines[x][y] && !revealedStates[x][y]) {
          revealedSquaresToSolve++;
        }
      }
    }

    //Set up is done, so now prepare to do zini iterations (find best cell, update premiums, repeat)
    let enumerationsOrders;
    if (is8Way) {
      enumerationsOrders = [
        [false, false, false],
        [true, false, false],
        [false, true, false],
        [true, true, false],
        [false, false, true],
        [true, false, true],
        [false, true, true],
        [true, true, true],
      ];
    } else {
      enumerationsOrders = [[false, false, false]];
    }

    let currentZiniValue = Infinity; //Set to the best zini we've found so far
    let currentClicksArray = null; //Set to the clicks array of the best zini solution we've found so far

    for (const enumeration of enumerationsOrders) {
      //Take copies of variable that track board state as they need to be re-initialised for each zini direction
      const thisEnumerationClicks = []; //Track clicks that get done by ZiNi
      const thisEnumerationFlagStates = algorithms.fast2dArrayCopy(flagStates);
      const thisEnumerationRevealedStates =
        algorithms.fast2dArrayCopy(revealedStates);
      const thisEnumerationPremiums = algorithms.fast2dArrayCopy(premiums);
      let squaresSolvedThisRun = 0;
      let thisEnumerationOrganisedPremiums = false;

      if (doBinarySearchOptimisation) {
        thisEnumerationOrganisedPremiums = new OrganisedPremiums(
          enumeration[0],
          enumeration[1],
          enumeration[2],
          width,
          height,
          true
        );

        //Initialise based on premiums
        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            if (mines[x][y]) {
              continue;
            }
            thisEnumerationOrganisedPremiums.lazyAddPremium(
              x,
              y,
              premiums[x][y]
            );
          }
        }
        thisEnumerationOrganisedPremiums.sortAfterLazyAdd();
      }

      let needToDoNFClicks = false;
      benchmark.startTime("zini-core-calc");
      while (squaresSolvedThisRun !== revealedSquaresToSolve) {
        let basicZiniStepResult = this.doBasicZiniStep(
          squareInfo,
          thisEnumerationFlagStates,
          thisEnumerationRevealedStates,
          thisEnumerationPremiums,
          preprocessedOpenings,
          thisEnumerationClicks,
          enumeration[0], //iterate x coord in diff order
          enumeration[1], //iterate y coord in diff order
          enumeration[2], //affects whether we iterate x or y first
          thisEnumerationOrganisedPremiums
        );
        squaresSolvedThisRun += basicZiniStepResult.newlyRevealed;

        if (basicZiniStepResult.onlyNFRemaining) {
          needToDoNFClicks = true;
          break;
        }
      }
      benchmark.stopTime("zini-core-calc");

      if (needToDoNFClicks) {
        this.nfClickEverythingForZini(
          squareInfo,
          thisEnumerationRevealedStates,
          preprocessedOpenings,
          thisEnumerationClicks
        );
      }

      /*
      console.log(
        `Zini with xRev: ${enumeration[0]}, yRev: ${enumeration[1]}, xySwap: ${enumeration[2]} has value ${thisEnumerationClicks.length}`
      );
      */
      if (thisEnumerationClicks.length < currentZiniValue) {
        /*
        console.log(
          `zini improved in a direction. ${currentZiniValue} -> ${thisEnumerationClicks.length}`
        );
        */
        currentZiniValue = thisEnumerationClicks.length;
        currentClicksArray = thisEnumerationClicks;
      }
    }

    return currentZiniValue; //Consider also returning currentClicksArray
  }

  doBasicZiniStep(
    squareInfo,
    flagStates,
    revealedStates,
    premiums,
    preprocessedOpenings,
    clicks,
    xReverse, //If true, prefer the premium with higher x coord
    yReverse, //If true, prefer the premium with higher y coord
    xySwap, //If true, use y in outer loop instead of x,
    organisedPremiums = false //Optimised data structure for storing premiums and retrieving the highest one that is earliest in iteration order
  ) {
    const width = revealedStates.length;
    const height = revealedStates[0].length;
    let squaresRevealedDuringStep = 0;

    //Find move with highest premium
    let highestPremiumSoFar = -1; //Default to -1 as if all premiums negative we need to click a square
    let nfClick = null; //This is the first square in the enumeration, which we nf click if no chords are found
    let chordClick = null; //This is our candidate square for chording

    if (!organisedPremiums) {
      //Set up enumeration order
      const xStart = xReverse ? width - 1 : 0;
      const xEnd = xReverse ? 0 : width - 1;
      const yStart = yReverse ? height - 1 : 0;
      const yEnd = yReverse ? 0 : height - 1;
      const iStart = xySwap ? yStart : xStart;
      const iEnd = xySwap ? yEnd : xEnd;
      const jStart = xySwap ? xStart : yStart;
      const jEnd = xySwap ? xEnd : yEnd;
      const iReverse = xySwap ? yReverse : xReverse;
      const jReverse = xySwap ? xReverse : yReverse;

      for (
        let i = iStart;
        iReverse ? i >= 0 : i <= iEnd;
        iReverse ? i-- : i++
      ) {
        for (
          let j = jStart;
          jReverse ? j >= 0 : j <= jEnd;
          jReverse ? j-- : j++
        ) {
          const [x, y] = xySwap ? [j, i] : [i, j];
          const thisSquare = squareInfo[x][y];
          if (thisSquare.isMine) {
            continue;
          }
          if (nfClick === null && thisSquare.is3bv) {
            //First square enumerated over becomes nfClick
            if (!revealedStates[x][y]) {
              nfClick = { x, y };
            }
          }
          if (highestPremiumSoFar < premiums[x][y]) {
            highestPremiumSoFar = premiums[x][y];
            chordClick = { x, y };
          }
        }
      }
    } else {
      //Use organised premiums to quickly find the best premium

      const { x, y, premium } = organisedPremiums.getHighestPremium();
      chordClick = { x, y };
      highestPremiumSoFar = premium;
    }

    //We've found a good move, now do it and update things. The move will either be an nf click or a chord.
    if (organisedPremiums && highestPremiumSoFar <= -1) {
      //Exit early as everything left will be NF clicks
      return { newlyRevealed: 0, onlyNFRemaining: true };
    }

    //Track squares that will need premium update after doing the nf click or chord
    let squaresThatNeedPremiumUpdated = [];

    if (chordClick === null) {
      ///////////////////////////
      //DOING AN NF CLICK
      ///////////////////////////

      //No chord, try nf click
      if (nfClick === null) {
        throw new Error("No chords or NF clicks found?");
      }
      if (revealedStates[nfClick.x][nfClick.y]) {
        throw new Error("Square already revealed? Should never happen");
      }
      clicks.push({ type: "left", x: nfClick.x, y: nfClick.y });
      revealedStates[nfClick.x][nfClick.y] = true;
      squaresRevealedDuringStep++;

      //Update premiums of neighbour cells as they may go down if this is a 3bv cell
      for (let safeNeighbour of squareInfo[nfClick.x][nfClick.y]
        .safeNeighbours) {
        squaresThatNeedPremiumUpdated.push({
          x: safeNeighbour.x,
          y: safeNeighbour.y,
        });
      }

      //Also handle if this square is an opening. Both opening the squares and also requesting them to have premiums updated
      const labelIfOpening = squareInfo[nfClick.x][nfClick.y].labelIfOpening;
      if (labelIfOpening !== null) {
        const opening = preprocessedOpenings.get(labelIfOpening);
        for (let zero of opening.zeros) {
          if (!revealedStates[zero.x][zero.y]) {
            revealedStates[zero.x][zero.y] = true;
            squaresRevealedDuringStep++;
          }
          squaresThatNeedPremiumUpdated.push({ x: zero.x, y: zero.y });
        }
        for (let edge of opening.edges) {
          if (!revealedStates[edge.x][edge.y]) {
            revealedStates[edge.x][edge.y] = true;
            squaresRevealedDuringStep++;
          }
          squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
        }
      }
    } else {
      ///////////////////////////
      //DOING A CHORD
      ///////////////////////////
      const thisSquare = squareInfo[chordClick.x][chordClick.y];

      const unflaggedAdjacentMines = thisSquare.mineNeighbours.filter(
        (neighbour) => !flagStates[neighbour.x][neighbour.y]
      );

      //If we need to NF click first then we should do so
      if (!revealedStates[chordClick.x][chordClick.y]) {
        clicks.push({ type: "left", x: chordClick.x, y: chordClick.y });
        revealedStates[chordClick.x][chordClick.y] = true;
        squaresRevealedDuringStep++;
      }

      //Place flags
      for (let unflaggedMine of unflaggedAdjacentMines) {
        clicks.push({ type: "right", x: unflaggedMine.x, y: unflaggedMine.y });
        flagStates[unflaggedMine.x][unflaggedMine.y] = true;
      }

      //Do the click for the chord
      clicks.push({ type: "chord", x: chordClick.x, y: chordClick.y });

      //Expand unrevealed openings that it touches
      //(needs to be done before revealing neighbour cells, as we do some hacky stuff with
      //checking a single zero of the opening to see if the whole opening is a zero
      //and if this zero is a neighbour it would otherwise break stuff...)
      const adjacentUnrevealedOpenings = [...thisSquare.openingsTouched]
        .map((openingLabel) => preprocessedOpenings.get(openingLabel))
        .filter((opening) => {
          //Find a zero tile in the opening and check whether this is open or not
          const zeroBelongingToOpening = opening.zeros[0];
          return !revealedStates[zeroBelongingToOpening.x][
            zeroBelongingToOpening.y
          ];
        });

      for (let opening of adjacentUnrevealedOpenings) {
        //Reveal both the zeros and the edges of this opening, also update premiums for these
        //Note that we do not need to update premiums for squares that neighbour the opening edges
        //as opening edges are by definition not 3bv, so don't affect premiums
        for (let zero of opening.zeros) {
          if (!revealedStates[zero.x][zero.y]) {
            revealedStates[zero.x][zero.y] = true;
            squaresRevealedDuringStep++;
          }
          squaresThatNeedPremiumUpdated.push({ x: zero.x, y: zero.y });
        }
        for (let edge of opening.edges) {
          if (!revealedStates[edge.x][edge.y]) {
            revealedStates[edge.x][edge.y] = true;
            squaresRevealedDuringStep++;
          }
          squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
        }
      }

      //Open neighbour cells
      for (let safeNeighbour of thisSquare.safeNeighbours) {
        //Note - it may already be revealed, but easiest to set anyway rather than checking
        if (!revealedStates[safeNeighbour.x][safeNeighbour.y]) {
          revealedStates[safeNeighbour.x][safeNeighbour.y] = true;
          squaresRevealedDuringStep++;
        }
      }

      //5x5 block centred on the square we are chording should have premiums updated
      //Note that bounds check happens in the function for updating premiums, so we can be lazy :)
      for (let x = chordClick.x - 2; x <= chordClick.x + 2; x++) {
        for (let y = chordClick.y - 2; y <= chordClick.y + 2; y++) {
          squaresThatNeedPremiumUpdated.push({ x, y });
        }
      }
    }

    //Now update all the premiums for squares that need to be updated.

    //De-duplicate the list of squaresThatNeedPremiumUpdated as some may be included twice if part of an opening and a neighbour to where we clicked
    //https://stackoverflow.com/questions/2218999/how-to-remove-all-duplicates-from-an-array-of-objects
    squaresThatNeedPremiumUpdated = squaresThatNeedPremiumUpdated.filter(
      (square, index, self) =>
        index ===
        self.findIndex(
          (otherSquare) =>
            otherSquare.x === square.x && otherSquare.y === square.y
        )
    );

    //Update premiums
    for (let square of squaresThatNeedPremiumUpdated) {
      this.updatePremiumForCoord(
        square.x,
        square.y,
        squareInfo,
        flagStates,
        revealedStates,
        premiums,
        preprocessedOpenings,
        organisedPremiums //may be false in which case updatePremiumForCoord will ignore it
      );
    }

    return { newlyRevealed: squaresRevealedDuringStep, onlyNFRemaining: false };
  }

  nfClickEverythingForZini(
    squareInfo,
    revealedStates,
    preprocessedOpenings,
    clicks
  ) {
    const width = revealedStates.length;
    const height = revealedStates[0].length;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const thisSquare = squareInfo[x][y];
        if (thisSquare.isMine) {
          continue;
        }
        if (revealedStates[x][y]) {
          continue;
        }
        if (!thisSquare.is3bv) {
          continue;
        }
        //Square is an unrevealed 3bv, so do an nf click on it

        clicks.push({ type: "left", x: x, y: y });
        revealedStates[x][y] = true;

        //Open connected squares if this is an opening
        const labelIfOpening = squareInfo[x][y].labelIfOpening;
        if (labelIfOpening !== null) {
          const opening = preprocessedOpenings.get(labelIfOpening);
          for (let zero of opening.zeros) {
            revealedStates[zero.x][zero.y] = true;
          }
          for (let edge of opening.edges) {
            revealedStates[edge.x][edge.y] = true;
          }
        }
      }
    }
  }

  calcWomZini(mines) {
    //WoM zini is really 8-way zini
    const is8Way = true;
    const doBinarySearchOptimisation = true;

    return this.calcBasicZini(mines, is8Way, doBinarySearchOptimisation);
  }

  updatePremiumForCoord(
    x,
    y,
    squareInfo,
    flagStates,
    revealedStates,
    premiums,
    preprocessedOpenings,
    organisedPremiums = false
  ) {
    //https://minesweepergame.com/forum/viewtopic.php?t=70&sid=8bb9f4500da68f4ef4a8989e5a89b6a4
    /*
      1. calculate premium for each cell (open or closed) not containing a mine:
      premium= [adjacent 3bv] - [adjacent unflagged mines] - 1_[if cell is closed] - 1
      determine the benifit of performing a double click over a left click.
      '1' represents the double click assuming 1.5 technique

      2. find the (top-left most) cell with the highest premium
      a. if premium non-negative perform solve:
      ZiNi=ZiNi+[adjacent unflagged mines] +1
      a premium of 0 might add evenually benificial flags, which still means a benifit over a left click
      b. if premium is negative open top left most cell (note by llama - top-left-most cell THAT IS 3BV)
      ZiNi=ZiNi+1
      top-left-most to be unambigous

      3. if closed cells remain start from 1.
    */
    const width = revealedStates.length;
    const height = revealedStates[0].length;
    if (x < 0 || x >= width || y < 0 || y >= height) {
      //Exit early as square is outside board
      return;
    }

    const thisSquare = squareInfo[x][y];
    if (thisSquare.isMine) {
      //Exit early if this square is a mine as it makes no sense to do premiums for this
      return;
    }

    const adjacentUnrevealedNonOpening3bv =
      thisSquare.nonOpening3bvNeighbours.filter(
        (neighbour) => !revealedStates[neighbour.x][neighbour.y]
      ).length;

    const adjacentUnrevealedOpenings = [...thisSquare.openingsTouched].filter(
      (openingLabel) => {
        //Find a zero tile in the opening and check whether this is revealed or not
        const zeroBelongingToOpening =
          preprocessedOpenings.get(openingLabel).zeros[0];
        return !revealedStates[zeroBelongingToOpening.x][
          zeroBelongingToOpening.y
        ];
      }
    ).length;

    const bbbvOpenedWithChord =
      adjacentUnrevealedNonOpening3bv + adjacentUnrevealedOpenings;

    const unflaggedAdjacentMines = thisSquare.mineNeighbours.filter(
      (neighbour) => !flagStates[neighbour.x][neighbour.y]
    ).length;

    //Note - the original forum post for zini has premium = [adjacent 3bv] - [adjacent unflagged mines] - 1_[if cell is closed] - 1
    //I believe this is either wrong or misleading. Since we have a term "- 1_[if cell is closed]". Since we are still tied for clicks saved if the cell needs to be revealed first, with the only exception being if the cell we are click on is not 3bv.
    let penaltyForFirstClick = 0;
    if (!thisSquare.is3bv && !revealedStates[x][y]) {
      penaltyForFirstClick = 1;
    }

    const clicksSaved =
      bbbvOpenedWithChord - unflaggedAdjacentMines - 1 - penaltyForFirstClick;

    if (organisedPremiums) {
      //Also save premium to organised premiums assuming it is available
      organisedPremiums.updatePremium(x, y, premiums[x][y], clicksSaved);
    }
    premiums[x][y] = clicksSaved;
  }

  /*[TO REMOVE] Use getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings instead
  //Returns an object with three structures
  //Numbers array gives the numbers of each cell.
  //OpeningLabels tracks which squares are part of the same openings or on opening edges.
  //Preprocessed openings tracks which squares are the edge and inside of openings
  getNumbersArrayAndOpeningLabelsAndPreprocessedOpeningsOld(mines) {
    const width = mines.length;
    const height = mines[0].length;

    const numbersArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (!mines[x][y]) {
          continue;
        }
        numbersArray[x][y] = "x";
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (mines[i]?.[j] === false) {
              numbersArray[i][j]++;
            }
          }
        }
      }
    }
    //Generate grid with labelled openings. Like
    */
  /*
      11+00x
      1++x++
      1+x0+2

      In this grid, 1's are part of the first opening, 2's are part of the 2nd opening.
      0s are not part of any opening, +'s are on the edge of an opening, x's are mines.
    */
  /*
    let openingLabels = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0));

    let nextOpeningLabel = 0;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (mines[x][y]) {
          openingLabels[x][y] = "x";
          continue;
        }

        if (numbersArray[x][y] === 0 && openingLabels[x][y] === 0) {
          nextOpeningLabel++;
          this.floodOpeningFor3bv(
            x,
            y,
            mines,
            openingLabels,
            numbersArray,
            nextOpeningLabel
          );
        }
      }
    }

    //Initialise map with entries for each opening that keeps track of which coords belong to that opening
    const preprocessedOpenings = new Map();
    for (
      let openingLabelNumber = 1;
      openingLabelNumber <= nextOpeningLabel;
      openingLabelNumber++
    ) {
      const thisOpening = {
        zeros: [], //Which coords in this opening have zeros
        edges: [], //Which coords are on the edge of this opening
      };
      preprocessedOpenings.set(openingLabelNumber, thisOpening);
    }

    //Loop through all squares to populate map of openings, figuring out which squares have which neighbours
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const thisCellLabel = openingLabels[x][y];
        if (typeof thisCellLabel === "number" && thisCellLabel !== 0) {
          //Cell is a zero from an opening. So add this info to the map
          preprocessedOpenings.get(thisCellLabel).zeros.push({ x, y });
          continue;
        }

        if (thisCellLabel === "+") {
          //Cell is on the edge of an opening(s), so figure out which
          for (let i = x - 1; i <= x + 1; i++) {
            for (let j = y - 1; j <= y + 1; j++) {
              const neighbourCellLabel = openingLabels[i]?.[j]; //Will be undefined if out of bounds
              if (
                typeof neighbourCellLabel === "number" &&
                neighbourCellLabel !== 0
              ) {
                //Cell has a neighbour in opening "neighbourCellLabel". Therefore it is an edge of this opening
                const preprocessedOpening =
                  preprocessedOpenings.get(neighbourCellLabel);

                //Add to edges of the opening provided it hasn't already been included
                if (
                  !preprocessedOpening.edges.some(
                    (edgeSquare) => edgeSquare.x === x && edgeSquare.y === y
                  )
                ) {
                  preprocessedOpening.edges.push({ x, y });
                }
              }
            }
          }
        }
      }
    }

    return {
      numbersArray,
      openingLabels,
      preprocessedOpenings,
    };
  }
  */

  /* [TO REMOVE] Use floodOpeningForProcessing instead
  floodOpeningFor3bv(x, y, mines, openingLabels, numbersArray, newLabel) {
    if (openingLabels[x]?.[y] !== 0) {
      //Square outside board or has already been processed
      return;
    }

    if (mines[x]?.[y]) {
      //Not really needed as this gets set elsewhere, but just in case
      openingLabels[x][y] = "x";
      return;
    }

    //Check if square is on the board
    if (typeof numbersArray[x]?.[y] === "undefined") {
      //This check isn't really needed since we check earlier. Defensive programming.
      return;
    } else if (numbersArray[x][y] !== 0) {
      openingLabels[x][y] = "+"; //Squares that are on the edge of an opening
      return;
    } else if (numbersArray[x][y] === 0) {
      openingLabels[x][y] = newLabel;
      //Flood square
      this.floodOpeningFor3bv(
        x - 1,
        y - 1,
        mines,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(
        x - 1,
        y,
        mines,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(
        x - 1,
        y + 1,
        mines,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(
        x,
        y - 1,
        mines,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(
        x,
        y + 1,
        mines,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(
        x + 1,
        y - 1,
        mines,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(
        x + 1,
        y,
        mines,
        openingLabels,
        numbersArray,
        newLabel
      );
      this.floodOpeningFor3bv(
        x + 1,
        y + 1,
        mines,
        openingLabels,
        numbersArray,
        newLabel
      );
    }
  }
  */

  //Returns an object with three structures
  //Numbers array gives the numbers of each cell.
  //OpeningLabels tracks which squares are part of the same openings or on opening edges.
  //Preprocessed openings tracks which squares are the edge and inside of openings
  getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines) {
    benchmark.startTime("preprocess-func");
    const width = mines.length;
    const height = mines[0].length;

    const numbersArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0));

    //Populate which numbers squares have. Slightly more efficient to loop over and find mines and increment neighbours since mines are usually rare
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (!mines[x][y]) {
          continue;
        }
        numbersArray[x][y] = "x";
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (mines[i]?.[j] === false) {
              numbersArray[i][j]++;
            }
          }
        }
      }
    }
    //Generate grid with labelled openings. Like
    /*
      11+00x
      1++x++
      1+x0+2

      In this grid, 1's are part of the first opening, 2's are part of the 2nd opening.
      0s are not part of any opening, +'s are on the edge of an opening, x's are mines.
    */
    let openingLabels = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0));

    let nextOpeningLabel = 0;

    //At same time also populate preprocessedOpenings

    //Initialise map for preprocessedOpenings
    /*
      It has the below form:
      opening label number
       =>
      {
        zeros: [], //Which coords in this opening have zeros
        edges: [], //Which coords are on the edge of this opening
      }
    */
    const preprocessedOpenings = new Map();

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (mines[x][y]) {
          openingLabels[x][y] = "x";
          continue;
        }

        if (numbersArray[x][y] === 0 && openingLabels[x][y] === 0) {
          nextOpeningLabel++;
          preprocessedOpenings.set(nextOpeningLabel, {
            zeros: [], //Which coords in this opening have zeros
            edges: [], //Which coords are on the edge of this opening
          });
          this.floodOpeningForProcessing(
            x,
            y,
            mines,
            openingLabels,
            numbersArray,
            preprocessedOpenings,
            nextOpeningLabel
          );
        }
      }
    }

    benchmark.stopTime("preprocess-func");

    return {
      numbersArray,
      openingLabels,
      preprocessedOpenings,
    };
  }

  floodOpeningForProcessing(
    x,
    y,
    mines,
    openingLabels,
    numbersArray,
    preprocessedOpenings,
    newLabel
  ) {
    if (openingLabels[x]?.[y] === undefined) {
      //Square outside board
      return;
    }
    if (openingLabels[x][y] === newLabel) {
      //Square has already been included in this opening
      return;
    }

    if (numbersArray[x][y] !== 0) {
      openingLabels[x][y] = "+"; //Squares that are on the edge of an opening
      //Also add as an edge to preprocessedOpenings
      const preprocessedOpening = preprocessedOpenings.get(newLabel);
      //Add to edges of the opening provided it hasn't already been included
      benchmark.startTime("edge-slow-search");
      if (
        !preprocessedOpening.edges.some(
          (edgeSquare) => edgeSquare.x === x && edgeSquare.y === y
        )
      ) {
        preprocessedOpening.edges.push({ x, y });
      }
      benchmark.stopTime("edge-slow-search");

      return;
    } else if (numbersArray[x][y] === 0) {
      openingLabels[x][y] = newLabel;
      const preprocessedOpening = preprocessedOpenings.get(newLabel);
      preprocessedOpening.zeros.push({ x, y });
      //Flood square
      this.floodOpeningForProcessing(
        x - 1,
        y - 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x - 1,
        y,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x - 1,
        y + 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x,
        y - 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x,
        y + 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x + 1,
        y - 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x + 1,
        y,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
      this.floodOpeningForProcessing(
        x + 1,
        y + 1,
        mines,
        openingLabels,
        numbersArray,
        preprocessedOpenings,
        newLabel
      );
    }
  }

  calc3bv(mines, revealedNumbers = false) {
    // Basic idea = generate grid of numbers
    // Do flood fill with the zeros - this will label openings and find which squares touch which openings
    // Maybe can reuse openings in zini calc? (Or not needed?)

    const width = mines.length;
    const height = mines[0].length;

    //Only destructure openingLabels as other properties aren't needed yet
    const { openingLabels } =
      algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    //Find total number of openings. Each opening is labeled with a non-zero number, so we count up the number of unique opening labels
    const totalNumberOfOpenings = new Set(
      openingLabels.flat().filter((el) => typeof el === "number" && el !== 0)
    ).size;

    const totalNumberOfProtectedSquares = openingLabels
      .flat()
      .filter((el) => el === 0).length;

    let bbbv = totalNumberOfOpenings + totalNumberOfProtectedSquares;

    let solved3bv = 0;

    //Only calculate solved 3bv if we have the array of revealed numbers
    if (revealedNumbers) {
      //Calculate solved 3bv for when it's a lost game
      //Scuffed as this includes openings that have not been fully opened
      //and tiles that were solved from blasted chord

      let solvedProtectedSquares = 0;
      let solvedOpenings = new Set();
      //^ Add openings to this set if there is a cell of them opened
      //Slightly scuffed since this also captures partially opened openings
      //But not worth the effort of trying to catch these

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (typeof revealedNumbers[x][y].state !== "number") {
            //Tile has not been opened, so don't include in solved 3bv
            continue;
          }
          if (openingLabels[x][y] === 0) {
            solvedProtectedSquares++;
          } else if (typeof openingLabels[x][y] === "number") {
            solvedOpenings.add(openingLabels[x][y]); //Add the opening to the set as we've seen a zero tile from it
          }
        }
      }

      solved3bv = solvedProtectedSquares + solvedOpenings.size;
    }

    return {
      bbbv,
      solved3bv,
    };
  }

  fast2dArrayCopy(toBeCopied) {
    //shallow copy for 2d arrays
    return toBeCopied.map((arr) => arr.slice());
  }
}

//Data structure to make it easier to find best premiums. Uses binary search
//Read here for context https://stackoverflow.com/questions/1344500/efficient-way-to-insert-a-number-into-a-sorted-array-of-numbers
//Rough idea is to convert x,y coord into the order they would be iterated over, and store this in ordered arrays keyed to the premium
class OrganisedPremiums {
  constructor(
    xReverse,
    yReverse,
    xySwap,
    width,
    height,
    excludeNegativePremiums
  ) {
    this.premiumsMap = new Map();
    //Map of numbers to arrays, where the key is the premium and the value is an array containing all squares of that premium

    this.xReverse = xReverse;
    this.yReverse = yReverse;
    this.xySwap = xySwap;
    this.width = width;
    this.height = height;
    this.excludeNegativePremiums = excludeNegativePremiums;
  }

  addPremium(x, y, newPremium) {
    if (this.excludeNegativePremiums && newPremium < 0) {
      return;
    }

    let order = this.xyToOrder(x, y);

    let premiumArray = this.premiumsMap.get(newPremium);

    if (!Array.isArray(premiumArray)) {
      //We do not already have anything with this premium
      this.premiumsMap.set(newPremium, [order]);
    } else {
      //Find index to insert this
      let idx = this.sortedIndex(premiumArray, order);

      premiumArray.splice(idx, 0, order);
    }
  }

  lazyAddPremium(x, y, newPremium) {
    //Similar to addPremium, but doesn't store values in order. sortAfterLazyAdd will need to be called later
    //Useful for add premiums in bulk when initialising
    if (this.excludeNegativePremiums && newPremium < 0) {
      return;
    }

    let order = this.xyToOrder(x, y);

    let premiumArray = this.premiumsMap.get(newPremium);

    if (!Array.isArray(premiumArray)) {
      //We do not already have anything with this premium
      this.premiumsMap.set(newPremium, [order]);
    } else {
      //Append to array as we will be sorting later
      premiumArray.push(order);
    }
  }

  sortAfterLazyAdd() {
    for (let premiumArray of this.premiumsMap.values()) {
      premiumArray.sort((a, b) => a - b);
    }
  }

  removePremium(x, y, oldPremium) {
    if (this.excludeNegativePremiums && oldPremium < 0) {
      return;
    }

    let order = this.xyToOrder(x, y);
    let premiumArray = this.premiumsMap.get(oldPremium);

    let idx = this.sortedIndex(premiumArray, order);

    if (premiumArray[idx] !== order) {
      throw new Error("Order not found in premiums array?");
    }

    premiumArray.splice(idx, 1);

    if (premiumArray.length === 0) {
      this.premiumsMap.delete(oldPremium);
    }
  }

  updatePremium(x, y, oldPremium, newPremium) {
    this.removePremium(x, y, oldPremium);
    this.addPremium(x, y, newPremium);
  }

  getHighestPremium() {
    if (this.premiumsMap.size === 0) {
      if (this.excludeNegativePremiums) {
        //Probably a negative premium, return -1 as this will cause zini to start looking for nf clicks
        return { x: "not stored", y: "not stored", premium: -1 };
      } else {
        throw new Error("Empty map");
      }
    }

    const highestPremium = Math.max.apply(null, [...this.premiumsMap.keys()]);

    let order = this.premiumsMap.get(highestPremium)[0];
    let { x, y } = this.orderToXy(order);

    return {
      x,
      y,
      premium: highestPremium,
    };
  }

  xyToOrder(x, y) {
    let possiblyFlippedX = this.xReverse ? this.width - 1 - x : x;
    let possiblyFlippedY = this.yReverse ? this.height - 1 - y : y;

    if (this.xySwap) {
      return possiblyFlippedY + this.height * possiblyFlippedX;
    } else {
      return possiblyFlippedX + this.width * possiblyFlippedY;
    }
  }

  orderToXy(order) {
    let possiblyFlippedX;
    let possiblyFlippedY;

    if (this.xySwap) {
      possiblyFlippedY = order % this.height;
      possiblyFlippedX = Math.floor(order / this.height);
    } else {
      possiblyFlippedX = order % this.width;
      possiblyFlippedY = Math.floor(order / this.width);
    }

    let x = this.xReverse
      ? this.width - 1 - possiblyFlippedX
      : possiblyFlippedX;
    let y = this.yReverse
      ? this.height - 1 - possiblyFlippedY
      : possiblyFlippedY;

    return { x, y };
  }

  sortedIndex(array, value) {
    var low = 0,
      high = array.length;

    while (low < high) {
      var mid = (low + high) >>> 1;
      if (array[mid] < value) low = mid + 1;
      else high = mid;
    }
    return low;
  }
}

class Benchmark {
  constructor() {
    this.times = new Map();
    //Structure
    /*
    'key' ->
    {
      totalTime: time,
      lastStart: performnce.now timestamp
      isRunning: bool
    }
    */
  }

  startTime(key) {
    let timing;
    if (this.times.has(key)) {
      timing = this.times.get(key);
    } else {
      timing = {
        totalTime: 0,
        lastStart: null,
        isRunning: false,
      };
      this.times.set(key, timing);
    }

    if (timing.isRunning) {
      throw new Error("cannot start timer that is already running");
    }

    timing.lastStart = performance.now();
    timing.isRunning = true;
  }

  stopTime(key) {
    let timing = this.times.get(key);
    if (!timing) {
      throw new Error(`timer with key "${key}" does not exist`);
    }
    if (!timing.isRunning) {
      throw new Error("cannot stop timer that is already stopped");
    }
    timing.isRunning = false;
    timing.totalTime += performance.now() - timing.lastStart;
    timing.isRunning = false;
  }

  report() {
    for (let [key, timing] of this.times.entries()) {
      if (timing.isRunning) {
        throw new Error("not all timers stopped");
      }
      console.log(`key: ${key}, timing: ${timing.totalTime / 1000}s`);
    }
  }

  clearAll() {
    this.times = new Map();
  }
}

//Need main loop somewhere

const algorithms = new Algorithms(); //Could probably change to have all static methods, so no need to init?
const benchmark = new Benchmark();
const skinManager = new SkinManager();
const game = new Game();
</script>
