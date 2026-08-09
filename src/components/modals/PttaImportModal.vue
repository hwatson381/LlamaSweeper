<template>
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
</template>

<script setup>
import { pttaUrl, pttaImportModal } from "src/composables/useSettings";

defineOptions({
  name: "PttaImportModal",
});

import { inject } from "vue";
const game = inject("game");
</script>
