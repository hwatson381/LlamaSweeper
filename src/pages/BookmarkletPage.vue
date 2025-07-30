<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 800px">
      <p class="text-h4">Bookmarklet</p>
      <p>
        This is a bookmarklet which can be used to copy games from
        <a href="https://minesweeper.online">minesweeper.online</a> into the
        <a href="/#/game/zini-explorer">zini explorer</a>. This is adapted from
        the bookmarklet created by Janitor2 for copying games to PTT's ZiNi
        calculator.
      </p>
      <q-card
        flat
        bordered
        style="max-width: 250px; margin-left: auto; margin-right: auto"
        class="q-my-lg"
      >
        <q-card-section>
          Drag this link to bookmarks bar<br />
          <a :href="bookmarkletText">LlamaSweeper zini import</a>
        </q-card-section>
      </q-card>
      <p class="text-h5">Desktop instructions (easy)</p>
      <ol>
        <li>Drag the link above to your bookmarks bar</li>
        <li>
          Complete a game on
          <a href="https://minesweeper.online/start/1">minesweeper.online</a>
        </li>
        <li>Click the bookmarklet to run it</li>
      </ol>
      <p class="text-h5">Mobile/alternate instructions (slightly harder)</p>
      <ol>
        <li>
          Click the button to copy bookmarklet text <br />
          <q-btn
            @click="copyBookmarkletText"
            color="primary"
            label="Copy bookmarklet text"
          />
        </li>
        <li>
          Create a new bookmark, and paste the text into where the URL would
          usually go
        </li>
        <li>
          Complete a game on
          <a href="https://minesweeper.online/start/1">minesweeper.online</a>
        </li>
        <li>Click the bookmarklet to run it</li>
      </ol>
      <p>
        Note: Never run bookmarklets from untrusted sources. It's recommended to
        review the code of bookmarklets before using them.
      </p>
    </div>
  </q-page>
</template>

<script setup>
defineOptions({
  name: "BookmarkletPage",
});

import { useQuasar, copyToClipboard } from "quasar";

const $q = useQuasar();

let bookmarkletText = `javascript: if(window.location.hostname !== 'minesweeper.online') {window.alert('This should only be run on minesweeper.online');throw new Error('not on wom');};var cells = document.querySelectorAll('.cell');var totalCellCount = cells.length;var maxX = -1;var maxY = -1;for (var i = 0; i < totalCellCount; i++) {var x = cells[i].getAttribute("data-x") * 1;var y = cells[i].getAttribute("data-y") * 1;if (x > maxX) {maxX = x;}if (y > maxY) {maxY = y;}}var rows = (maxY * 1) + 1;var columns = (maxX * 1) + 1;var urlstring = "https://llamasweeper.com/#/game/zini-explorer?b=";if (columns < 10) {urlstring = urlstring + "0";}urlstring = urlstring + columns;if (rows < 10) {urlstring = urlstring + "0";}urlstring = urlstring + rows + "&m=";var code = [%270%27,%271%27,%272%27,%273%27,%274%27,%275%27,%276%27,%277%27,%278%27,%279%27,%27a%27,%27b%27,%27c%27,%27d%27,%27e%27,%27f%27,%27g%27,%27h%27,%27i%27,%27j%27,%27k%27,%27l%27,%27m%27,%27n%27,%27o%27,%27p%27,%27q%27,%27r%27,%27s%27,%27t%27,%27u%27,%27v%27,];var blockCount = Math.ceil(totalCellCount / 5);for (var block = 0; block < blockCount; block++) {var bitcode = "";for (var cellCount = 0; cellCount < 5; cellCount++) {var cellNr = block * 5 + cellCount;if (cellNr < totalCellCount) {var row = Math.floor(cellNr / columns);var col = ((cellNr % columns) + columns) % columns;var divId = "cell_" + col + "_" + row;var madeByJanitor2AdaptedByLlama = false;document.getElementById(divId).classList.forEach(name => {if ((name.endsWith("flag") && !name.endsWith("closed_flag")) || name.endsWith("type10") || name.endsWith("type11")) {madeByJanitor2AdaptedByLlama = true;}});if (madeByJanitor2AdaptedByLlama) {bitcode = bitcode + "1";} else {bitcode = bitcode + "0";}} else {bitcode = bitcode + "0";}}urlstring = urlstring + code[parseInt(bitcode, 2)];}urlstring += '&d=1';window.open(urlstring, "_blank").focus();`;

function copyBookmarkletText() {
  copyToClipboard(bookmarkletText);

  $q.notify({
    message: "Copied.",
    color: "purple",
    timeout: 700,
  });
}
</script>
