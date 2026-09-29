<template>
  <q-card square style="float: left; margin-bottom: 10px">
    <q-card-section>
      <span class="text-h6">{{ ziniRunnerTitle }}</span
      ><br />
      Expected Duration: {{ ziniRunnerExpectedDuration }}<br />
      Expected Finish Time: {{ ziniRunnerExpectedFinishTime }}<br />
      <template v-if="ziniRunnerIterationsDisplay">
        {{ ziniRunnerIterationsDisplay }}<br />
      </template>
      <template v-if="ziniRunnerCandidatesDisplay">
        Candidates: {{ ziniRunnerCandidatesDisplay }}<br />
        States: {{ ziniRunnerStatesDisplay }}<br />
      </template>
      <br />
      <q-btn
        @click="game.board.ziniExplore.killDeepChainZiniRunner()"
        color="negative"
        label="Cancel"
      ></q-btn>
    </q-card-section>
  </q-card>
</template>

<script setup>
import {
  ziniRunnerTitle,
  ziniRunnerExpectedDuration,
  ziniRunnerExpectedFinishTime,
  ziniRunnerIterationsDisplay,
  ziniRunnerCandidatesDisplay,
  ziniRunnerStatesDisplay,
} from "src/composables/useSettings";

defineOptions({
  name: "DeepChainRunnerPanel",
});

import { inject } from "vue";
const game = inject("game");
</script>
