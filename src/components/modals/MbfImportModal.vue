<template>
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
          @keyup.enter="importMbfBoard"
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
        <q-btn @click="importMbfBoard" color="primary">Load</q-btn>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, inject } from "vue";
import { mbfImportModal } from "src/composables/useSettings";

defineOptions({
  name: "MbfImportModal",
});

const game = inject("game");
const mbfStringToImport = ref("");
const mbfFileToImport = ref(null);

async function importMbfBoard() {
  if (
    await game.board.boardImportExport.importMbfBoard(
      mbfStringToImport.value,
      mbfFileToImport.value
    )
  ) {
    mbfImportModal.value = false;
    mbfStringToImport.value = "";
    mbfFileToImport.value = null;
  }
}
</script>
