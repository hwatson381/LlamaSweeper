<template>
  <q-card square style="float: left; margin-bottom: 10px">
    <q-card-section>
      <span class="text-h6">Running DeepChain ZiNi</span><br />
      Expected Duration: {{ ziniRunnerExpectedDuration }}<br />
      Expected Finish Time: {{ ziniRunnerExpectedFinishTime }}<br />
      {{ ziniRunnerIterationsDisplay }}<br />
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
  ziniRunnerExpectedDuration,
  ziniRunnerExpectedFinishTime,
  ziniRunnerIterationsDisplay,
} from "src/composables/useSettings";

defineOptions({
  name: "DeepChainRunnerPanel",
});

import { inject } from "vue";
const game = inject("game");
</script>
