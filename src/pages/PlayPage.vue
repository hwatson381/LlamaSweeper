<template>
  <q-page class="flex flex-center">
    <div
      class="q-pa-md"
      style="max-width: 800px"
      @mousedown="game.handleMouseDown($event)"
      @mouseup="game.handleMouseUp($event)"
    >
      <p>Play Page (textures from minesweeper.online)</p>
      <h4>Beg Eff practise (only 200+ boards)</h4>
      <button @click="settingsModal = true">settings</button>
      <button @click="game.reset">reset board</button><br /><br />

      <canvas
        ref="main-canvas"
        id="main-canvas"
        width="500"
        height="500"
        @contextmenu.prevent
      >
      </canvas>
      <div v-if="showStatsBlock" style="background-color: #222222">
        <pre>{{ statsText }}</pre>
      </div>
    </div>
  </q-page>

  <q-dialog v-model="settingsModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Settings</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-slider
          v-model="tileSizeSlider"
          :min="10"
          :max="60"
          :step="1"
          label
          color="light-green"
          @update:model-value="game.refreshSize()"
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
  border: 1px solid red;
  user-select: none;
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

let boardHorizontalPadding = computed(() => {
  return Math.floor(tileSizeSlider.value / 2);
});
let boardVerticalPadding = computed(() => {
  return Math.floor(tileSizeSlider.value / 2);
});

class Game {
  constructor() {}

  reset() {
    this.board = new Board(9, 9, 10, tileSizeSlider.value);
    this.gameStage = "pregame";
    showStatsBlock.value = false;
    //this.board.reset();

    mainCanvas.value.width =
      this.board.width * tileSizeSlider.value +
      2 * boardHorizontalPadding.value;
    mainCanvas.value.height =
      this.board.height * tileSizeSlider.value + 2 * boardVerticalPadding.value;

    this.startTime = 0;

    this.board.draw();
  }

  refreshSize() {
    mainCanvas.value.width =
      this.board.width * tileSizeSlider.value +
      2 * boardHorizontalPadding.value;
    mainCanvas.value.height =
      this.board.height * tileSizeSlider.value + 2 * boardVerticalPadding.value;

    this.board.tileSize = tileSizeSlider.value;
    this.board.draw();
  }

  handleMouseDown(event) {
    if (this.gameStage !== "running") {
      return; //Clicks do nothing unless game is running. Notably we restrict pre-placed flags cos why not
    }

    if (event.target !== mainCanvas.value) {
      return;
    }

    const canvasRawX =
      event.clientX - mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - mainCanvas.value.getBoundingClientRect().top;

    //Check board within canvas is being clicked on (overkill idk?)
    if (
      canvasRawX >= boardHorizontalPadding.value &&
      canvasRawX <
        this.board.width * this.board.tileSize + boardHorizontalPadding.value &&
      canvasRawY >= boardVerticalPadding.value &&
      canvasRawY <
        this.board.height * this.board.tileSize + boardVerticalPadding.value
    ) {
      const boardRawX = canvasRawX - boardHorizontalPadding.value;
      const boardRawY = canvasRawY - boardVerticalPadding.value;

      if (event.button === 2) {
        this.board.attemptFlag(
          boardRawX,
          boardRawY,
          performance.now() - this.startTime
        );
        this.board.draw();
      }
    }
  }

  handleMouseUp(event) {
    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return; //Clicks do nothing on win/lose screen
    }

    if (event.target !== mainCanvas.value) {
      return;
    }

    const canvasRawX =
      event.clientX - mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - mainCanvas.value.getBoundingClientRect().top;

    //Check board within canvas is being clicked on (overkill idk?)
    if (
      canvasRawX >= boardHorizontalPadding.value &&
      canvasRawX <
        this.board.width * this.board.tileSize + boardHorizontalPadding.value &&
      canvasRawY >= boardVerticalPadding.value &&
      canvasRawY <
        this.board.height * this.board.tileSize + boardVerticalPadding.value
    ) {
      const boardRawX = canvasRawX - boardHorizontalPadding.value;
      const boardRawY = canvasRawY - boardVerticalPadding.value;

      if (event.button === 0) {
        if (this.gameStage === "pregame") {
          this.gameStage = "running";
          this.startTime = performance.now();
        }
        this.board.attemptChordOrDig(
          boardRawX,
          boardRawY,
          performance.now() - this.startTime
        );
        if (this.board.blasted) {
          this.board.blast();
          this.gameStage = "lost";
          this.board.stats.addEndTime(performance.now() - this.startTime);
          this.board.stats.calcStats();
          showStatsBlock.value = true;
        } else if (this.board.checkWin()) {
          this.board.markRemainingFlags();
          this.gameStage = "won";
          this.board.stats.addEndTime(performance.now() - this.startTime);
          this.board.stats.calcStats();
          showStatsBlock.value = true;
        }
        this.board.draw();
      }
    }
  }
}

class Board {
  constructor(width, height, mineCount, tileSize = 40) {
    this.width = width;
    this.height = height;
    this.mineCount = mineCount;
    this.tileSize = tileSize;

    this.reset();
  }

  reset() {
    //Which squares contain mines
    this.mines = BoardGenerator.basicShuffle(
      this.width,
      this.height,
      this.mineCount
    );

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

  attemptFlag(boardRawX, boardRawY, time) {
    let tileX = Math.floor(boardRawX / this.tileSize);
    let tileY = Math.floor(boardRawY / this.tileSize);

    if (this.revealedNumbers[tileX][tileY].state === UNREVEALED) {
      this.revealedNumbers[tileX][tileY].state = FLAG;
      this.stats.addRight(tileX, tileY, time);
    } else if (this.revealedNumbers[tileX][tileY].state === FLAG) {
      this.revealedNumbers[tileX][tileY].state = UNREVEALED;
      this.stats.addWastedRight(tileX, tileY, time);
    } else {
      this.stats.addWastedRight(tileX, tileY, time);
    }
  }

  attemptChordOrDig(boardRawX, boardRawY, time) {
    let tileX = Math.floor(boardRawX / this.tileSize);
    let tileY = Math.floor(boardRawY / this.tileSize);

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

  openTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
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

  getNumberSurroundingMines(x, y) {
    let count = 0;
    for (let i = x - 1; i <= x + 1; i++) {
      for (let j = y - 1; j <= y + 1; j++) {
        if (i === x && j === y) {
          continue; //dont count square itself
        }
        if (i < 0 || i >= this.width || j < 0 || j >= this.height) {
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
        if (i < 0 || i >= this.width || j < 0 || j >= this.height) {
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
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
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
          if (i < 0 || i >= this.width || j < 0 || j >= this.height) {
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
  }

  checkWin() {
    if (this.width * this.height - this.mineCount === this.openedTiles) {
      return true;
    } else {
      return false;
    }
  }

  draw() {
    const ctx = mainCanvas.value.getContext("2d");
    ctx.clearRect(0, 0, mainCanvas.value.width, mainCanvas.value.height);
    ctx.fillStyle = "#222222";
    ctx.fillRect(
      0,
      0,
      this.width * this.tileSize + 2 * boardHorizontalPadding.value,
      this.height * this.tileSize + 2 * boardVerticalPadding.value
    );

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.revealedNumbers[x][y].draw(
          x * this.tileSize + boardHorizontalPadding.value,
          y * this.tileSize + boardVerticalPadding.value,
          this.tileSize
        );
      }
    }
  }
}

class Tile {
  constructor(state) {
    this.state = state; //Possible values are numbers (e.g. 0, 1, 2... and stuff like UNREVEALED etc)
    this.depressed = false;
  }

  draw(rawX, rawY, size) {
    const ctx = mainCanvas.value.getContext("2d");
    /*
    ctx.font = `${size}px`;

    let drawValue = this.state;

    if (this.state === UNREVEALED) {
      drawValue = "#";
    }
    if (this.state === FLAG) {
      drawValue = "F";
    }

    ctx.strokeText(drawValue, rawX, rawY);
    */
    ctx.drawImage(skinManager.getImage(this.state), rawX, rawY, size, size);
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
    ];
    this.imagesLoadedCount = 0;
    this.imagesToLoadCount = keyImageMapping.length;
    this.images = {};
    keyImageMapping.forEach((el) => this.addImage(el[0], el[1]));

    /*
    this.images = {
      0: Object.assign(new Image(), {
        src: "/img/tiles/type0.svg",
      }),
      1: Object.assign(new Image(), {
        src: "/img/tiles/type1.svg",
      }),
      2: Object.assign(new Image(), {
        src: "/img/tiles/type2.svg",
      }),
      3: Object.assign(new Image(), {
        src: "/img/tiles/type3.svg",
      }),
      4: Object.assign(new Image(), {
        src: "/img/tiles/type4.svg",
      }),
      5: Object.assign(new Image(), {
        src: "/img/tiles/type5.svg",
      }),
      6: Object.assign(new Image(), {
        src: "/img/tiles/type6.svg",
      }),
      7: Object.assign(new Image(), {
        src: "/img/tiles/type7.svg",
      }),
      8: Object.assign(new Image(), {
        src: "/img/tiles/type8.svg",
      }),
      UNREVEALED: Object.assign(new Image(), {
        src: "/img/tiles/closed.svg",
      }),
      FLAG: Object.assign(new Image(), {
        src: "/img/tiles/flag.svg",
      }),
      MINE: Object.assign(new Image(), {
        src: "/img/tiles/mine.svg",
      }),
      MINERED: Object.assign(new Image(), {
        src: "/img/tiles/mine_red.svg",
      }),
    };
    */
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
}

//Class for doing different board gen. E.g. generating boards with fisher yates or maybe selecting boards with certain properties
class BoardGenerator {
  //todo - improve to use fisher yates?
  static basicShuffle(width, height, mineCount) {
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
}

class BoardStats {
  constructor(minesArray) {
    this.mines = structuredClone(minesArray);
    this.clicks = [];
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

  addWastedChord(x, y, time) {
    this.clicks.push({
      type: "wasted_chord",
      x,
      y,
      time,
    });
  }

  calc3bv() {
    // Basic idea = generate grid of numbers
    // Do flood fill with the zeros - this will label openings and find which squares touch which openings
    // Maybe can reuse openings in zini calc? (Or not needed?)

    const width = this.mines.length;
    const height = this.mines[0].length;

    const numbersArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (this.mines[x][y]) {
          continue;
        }

        let number = 0;
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (this.mines[i]?.[j]) {
              number++;
            }
          }
        }
        numbersArray[x][y] = number;
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

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (this.mines[x][y]) {
          openingLabels[x][y] = "x";
          continue;
        }

        if (numbersArray[x][y] === 0 && openingLabels[x][y] === 0) {
          nextOpeningLabel++;
          this.floodOpeningFor3bv(
            x,
            y,
            openingLabels,
            numbersArray,
            nextOpeningLabel
          );
        }
      }
    }

    const totalNumberOfOpenings = nextOpeningLabel;
    const totalNumberOfProtectedSquares = openingLabels
      .flat()
      .filter((el) => el === 0).length;

    this.bbbv = totalNumberOfOpenings + totalNumberOfProtectedSquares;
  }

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

  calcZini() {
    this.zini = 300;
  }

  calcStats() {
    const time = this.endTime / 1000;
    this.calc3bv();
    const bbbv = this.bbbv;
    const bbbvs = bbbv / time;

    this.calcZini();
    const zini = this.zini;

    const clicks = this.clicks.length;

    const eff = (100 * bbbv) / clicks;
    const maxEff = (100 * bbbv) / zini;

    statsText.value = `Time: ${time.toFixed(3)}s
    3bv/s: ${bbbvs.toFixed(3)}
    Eff: ${eff.toFixed(0)}%
    Max Eff: ${maxEff.toFixed(0)}%
    Zini: ${zini}
    3bv: ${bbbv}
    Clicks: ${clicks}`;
  }

  addEndTime(time) {
    this.endTime = time;
  }
}

//Need main loop somewhere

const skinManager = new SkinManager();
const game = new Game();
</script>
