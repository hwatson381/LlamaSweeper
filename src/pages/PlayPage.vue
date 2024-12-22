<template>
  <q-page class="flex flex-center">
    <div
      class="q-pa-md"
      style="max-width: 800px"
      @mousedown="game.handleMouseDown($event)"
      @mouseup="game.handleMouseUp($event)"
      @mousemove="game.handleMouseMove($event)"
    >
      <p>Play Page (textures from minesweeper.online)</p>
      <h4>Beg Eff practise (only 200+ boards)</h4>
      <button @click="settingsModal = true">settings</button>
      <button @click="game.reset">reset board</button><br /><br />

      <canvas ref="main-canvas" id="main-canvas" @contextmenu.prevent> </canvas>
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
    if (this.gameStage !== "pregame" && this.gameStage !== "running") {
      return;
    }

    const canvasRawX =
      event.clientX - mainCanvas.value.getBoundingClientRect().left;
    const canvasRawY =
      event.clientY - mainCanvas.value.getBoundingClientRect().top;

    const boardRawX = canvasRawX - boardHorizontalPadding.value;
    const boardRawY = canvasRawY - boardVerticalPadding.value;

    if (event.button === 0) {
      this.board.holdDownLeftMouse(boardRawX, boardRawY);
      this.board.draw();
    }

    if (
      event.button === 2 &&
      event.target === mainCanvas.value &&
      this.gameStage === "running"
    ) {
      this.board.attemptFlag(
        boardRawX,
        boardRawY,
        performance.now() - this.startTime
      );
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
        this.board.calculateAndDisplayStats(false);
      } else if (this.board.checkWin()) {
        this.board.markRemainingFlags();
        this.gameStage = "won";
        this.board.stats.addEndTime(performance.now() - this.startTime);
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
    const boardRawY = canvasRawY - boardVerticalPadding.value;

    const isPregame = this.gameStage === "pregame";
    const time = performance.now() - this.startTime;
    const requiresRedraw = this.board.mouseMove(
      boardRawX,
      boardRawY,
      time,
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

  attemptFlag(boardRawX, boardRawY, time) {
    let tileX = Math.floor(boardRawX / this.tileSize);
    let tileY = Math.floor(boardRawY / this.tileSize);

    if (!this.checkCoordsInBounds(tileX, tileY)) {
      //Click not on board, exit (doesn't count as wasted click)
      return;
    }

    if (this.revealedNumbers[tileX][tileY].state === UNREVEALED) {
      //Flag the square
      this.revealedNumbers[tileX][tileY].state = FLAG;
      this.stats.addRight(tileX, tileY, time);
    } else if (this.revealedNumbers[tileX][tileY].state === FLAG) {
      //Unflag a square
      this.revealedNumbers[tileX][tileY].state = UNREVEALED;
      this.stats.makeMostRecentRightWasted(tileX, tileY);
      this.stats.addWastedRight(tileX, tileY, time);
    } else {
      //Wasted flag input
      this.stats.addWastedRight(tileX, tileY, time);
    }
  }

  attemptChordOrDig(boardRawX, boardRawY, time) {
    let tileX = Math.floor(boardRawX / this.tileSize);
    let tileY = Math.floor(boardRawY / this.tileSize);

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

  mouseMove(boardRawX, boardRawY, time, isPregame) {
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
    // Basic idea = generate grid of numbers
    // Do flood fill with the zeros - this will label openings and find which squares touch which openings
    // Maybe can reuse openings in zini calc? (Or not needed?)

    const width = this.mines.length;
    const height = this.mines[0].length;

    //Only destructure openingLabels as other properties aren't needed yet
    const { openingLabels } =
      algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(
        this.mines
      );

    //Find total number of openings. Each opening is labeled with a non-zero number, so we count up the number of unique opening labels
    const totalNumberOfOpenings = new Set(
      openingLabels.flat().filter((el) => typeof el === "number" && el !== 0)
    ).size;

    const totalNumberOfProtectedSquares = openingLabels
      .flat()
      .filter((el) => el === 0).length;

    this.bbbv = totalNumberOfOpenings + totalNumberOfProtectedSquares;

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

    this.solved3bv = solvedProtectedSquares + solvedOpenings.size;
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
      Zini (WoM): ${zini}`;
    } else {
      statsText.value = `
      Time: ${time.toFixed(3)}s
      Est. Time: ${estTime.toFixed(3)}
      3bv: ${solved3bv}/${bbbv}
      3bv/s: ${bbbvs.toFixed(3)}
      Eff: ${eff.toFixed(0)}%
      Max Eff: ${maxEff.toFixed(0)}%
      Clicks: ${clicks}
      Zini (WoM): ${zini}`;
    }
  }

  addEndTime(time) {
    this.endTime = time;
  }
}

class Algorithms {
  constructor() {}

  calcBasicZini(mines) {
    //Get various data structures which information about numbers and openings
    const { numbersArray, openingLabels, preprocessedOpenings } =
      algorithms.getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines);

    const width = mines.length;
    const height = mines[0].length;
    const numberOfMines = mines.flat().filter((x) => x).length;

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

    //Do stuff with calculating premiums in order to work out zini

    const clicks = []; //Track clicks that get done by ZiNi
    debugger;
    while (
      revealedStates.flat().filter((x) => x).length !==
      width * height - numberOfMines
    ) {
      this.doBasicZiniStep(
        squareInfo,
        flagStates,
        revealedStates,
        premiums,
        preprocessedOpenings,
        clicks,
        false, //These are for the enumeration order (needed for 8-way zini)
        false, //These are for the enumeration order (needed for 8-way zini)
        false //These are for the enumeration order (needed for 8-way zini)
      );
    }

    console.log(clicks);

    return clicks.length;
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
    xySwap //If true, use y in outer loop instead of x
  ) {
    const width = revealedStates.length;
    const height = revealedStates[0].length;

    //Find move with highest premium
    //Set up enumeration order
    const xStart = xReverse ? width - 1 : 0;
    const xEnd = xReverse ? 0 : width - 1;
    const yStart = xReverse ? height - 1 : 0;
    const yEnd = xReverse ? 0 : height - 1;
    const iStart = xySwap ? yStart : xStart;
    const iEnd = xySwap ? yEnd : xEnd;
    const jStart = xySwap ? xStart : yStart;
    const jEnd = xySwap ? xEnd : yEnd;
    const iReverse = xySwap ? yReverse : xReverse;
    const jReverse = xySwap ? xReverse : yReverse;

    let highestPremiumSoFar = -1; //Default to -1 as if all premiums negative we need to click a square
    let nfClick = null; //This is the first square in the enumeration, which we nf click if no chords are found
    let chordClick = null; //This is our candidate square for chording

    for (let i = iStart; iReverse ? i >= 0 : i <= iEnd; iReverse ? i-- : i++) {
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
        if (nfClick === null) {
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

    //We've found a good move, now do it and update things. The move will either be an nf click or a chord.

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
          revealedStates[zero.x][zero.y] = true;
          squaresThatNeedPremiumUpdated.push({ x: zero.x, y: zero.y });
        }
        for (let edge of opening.edges) {
          revealedStates[edge.x][edge.y] = true;
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
          revealedStates[zero.x][zero.y] = true;
          squaresThatNeedPremiumUpdated.push({ x: zero.x, y: zero.y });
        }
        for (let edge of opening.edges) {
          revealedStates[edge.x][edge.y] = true;
          squaresThatNeedPremiumUpdated.push({ x: edge.x, y: edge.y });
        }
      }

      //Open neighbour cells
      for (let safeNeighbour of thisSquare.safeNeighbours) {
        //Note - it may already be revealed, but easiest to set anyway rather than checking
        revealedStates[safeNeighbour.x][safeNeighbour.y] = true;
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
        preprocessedOpenings
      );
    }
  }

  calcWomZini(mines) {
    //WoM zini is really 8-way zini

    //Rotate/reflect 8 times or something idk

    return this.calcBasicZini(mines);
  }

  updatePremiumForCoord(
    x,
    y,
    squareInfo,
    flagStates,
    revealedStates,
    premiums,
    preprocessedOpenings
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
      b. if premium is negative open top left most cell
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

    premiums[x][y] = clicksSaved;
  }

  //Returns an object wich three structures
  //Numbers array gives the numbers of each cell.
  //OpeningLabels tracks which squares are part of the same openings or on opening edges.
  //Preprocessed openings tracks which squares are the edge and inside of openings
  getNumbersArrayAndOpeningLabelsAndPreprocessedOpenings(mines) {
    const width = mines.length;
    const height = mines[0].length;

    const numbersArray = new Array(width)
      .fill(0)
      .map(() => new Array(height).fill(0));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (mines[x][y]) {
          numbersArray[x][y] = "x";
        }

        let number = 0;
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            if (mines[i]?.[j]) {
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

    //Initialise map with entries for each opening that keeps track of which coords below to that opening
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
}

//Need main loop somewhere

const algorithms = new Algorithms();
const skinManager = new SkinManager();
const game = new Game();
</script>
