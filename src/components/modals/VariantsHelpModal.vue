<template>
  <q-dialog v-model="variantsHelpModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Variants info</div>
      </q-card-section>

      <q-markup-table
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
</template>

<script setup>
import { variantsHelpModal } from "src/composables/useSettings";

defineOptions({
  name: "VariantsHelpModal",
});
</script>
