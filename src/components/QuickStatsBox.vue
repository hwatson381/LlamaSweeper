<template>
  <div class="quick-stats" :style="{ fontSize: quickStatsFontSize }">
    <div>Time: {{ statsObject.time }}s</div>
    <div v-if="!statsObject.isWonGame">
      Est. Time: {{ statsObject.estTime }}s
    </div>
    <div v-if="statsObject.isWonGame">3bv: {{ statsObject.total3bv }}</div>
    <div v-else>
      3bv: {{ statsObject.solved3bv }}/{{ statsObject.total3bv }}
    </div>
    <div>3bv/s: {{ statsObject.bbbvs }}</div>
    <div>Ce/s: {{ statsObject.clicks.effectiveClicksPerSecond }}</div>
    <div>eff: {{ statsObject.eff }}%</div>
    <div v-if="statsShowMaxEff && statsObject.maxEff !== null">
      max eff:
      <span
        :style="{
          'text-decoration':
            statsObject.deepMaxEff !== null &&
            parseInt(statsObject.deepMaxEff) > parseInt(statsObject.maxEff)
              ? 'line-through'
              : 'none',
        }"
        >{{ statsObject.maxEff }}%</span
      >
      <span
        v-if="
          statsObject.deepMaxEff !== null &&
          parseInt(statsObject.deepMaxEff) > parseInt(statsObject.maxEff)
        "
        class="text-info"
        >&nbsp;{{ statsObject.deepMaxEff }}%</span
      >
    </div>
  </div>
</template>

<style scoped>
.quick-stats {
  position: fixed;
  top: 10px;
  left: 10px;
  background-color: #d3d3d3d1;
  color: black;
  padding: 5px 10px;
  border-radius: 10px;
  user-select: none;
  font-size: 10px;
  pointer-events: none;
  font-family: monospace;
  z-index: 10000;
  box-shadow: 3px 4px 10px #000000ad;
}
</style>

<script setup>
import {
  statsObject,
  statsShowMaxEff,
  quickStatsFontSize,
} from "src/composables/useSettings";

defineOptions({
  name: "QuickStatsBox",
});
</script>
