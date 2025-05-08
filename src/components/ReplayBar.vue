<template>
  <div class="replay-bar row q-pa-sm">
    <q-btn dense color="white" text-color="black">
      <q-icon
        :name="replayIsPlaying ? 'pause' : 'play_arrow'"
        @click="$emit('toggle-play-pause')"
      ></q-icon>
    </q-btn>
    <q-btn
      dense
      color="white"
      text-color="black"
      @click="$emit('jump-to-previous-click')"
    >
      <q-icon name="skip_previous"></q-icon>
    </q-btn>
    <q-btn
      dense
      color="white"
      text-color="black"
      @click="$emit('jump-to-next-click')"
    >
      <q-icon name="skip_next"></q-icon>
    </q-btn>
    <q-btn
      v-if="!replayTypeForceSteppy"
      dense
      color="white"
      text-color="black"
      @click="cycleReplayTypeSelector()"
    >
      <q-icon v-if="replayTypeSelector === 'accurate'" name="route"></q-icon>
      <q-icon v-if="replayTypeSelector === 'rounded'" name="timeline"></q-icon>
      <q-icon
        v-if="replayTypeSelector === 'steppy'"
        name="sym_o_steppers"
      ></q-icon>
    </q-btn>
    <q-slider
      v-model="replaySpeedMultiplierUnderlying"
      :min="0"
      :max="40"
      snap
      color="green"
      :dark="false"
      class="q-px-sm no-transition-slider"
      style="width: 90px"
    />
    <q-chip square color="white" text-color="black">
      {{
        replaySpeedMultiplier >= 10
          ? replaySpeedMultiplier.toFixed(1)
          : replaySpeedMultiplier.toFixed(2)
      }}x
    </q-chip>
    <div
      style="
        width: 290px;
        flex-grow: 1;
        display: flex;
        align-items: center;
        gap: 6px;
      "
    >
      <q-slider
        :model-value="replayProgress"
        :min="replayBarStartValue"
        :max="replayBarLastValue"
        :step="replayType === 'steppy' ? 1 : 0"
        :snap="replayType === 'steppy'"
        color="blue"
        :dark="false"
        class="q-px-sm no-transition-slider"
        style="width: 170px; flex-grow: 1"
        @update:model-value="(val) => $emit('handle-slider-change', val)"
        @pan="(phase) => $emit('is-panning-change', phase === 'start')"
      />
      <q-input
        :model-value="replayProgressRounded"
        filled
        dense
        style="max-width: 80px"
        bg-color="white"
        color="black"
        :dark="false"
        @update:model-value="(val) => $emit('handle-input-change', val)"
        @blur="$emit('is-inputting-change', false)"
        @focus="$emit('is-inputting-change', true)"
        @keydown.stop="
          () => {
            /* no-op to stop arrow keys doing stuff */
          }
        "
      />
      <q-btn
        dense
        color="white"
        text-color="black"
        style="max-width: 80px"
        @click="$emit('close-replay')"
      >
        <q-icon name="sym_o_close"></q-icon>
      </q-btn>
    </div>
    <!-- below is needed for to preload icon for steppy and close icon -->
    <q-icon
      name="sym_o_steppers"
      style="visibility: hidden; position: absolute"
    ></q-icon>
    <q-icon
      name="sym_o_close"
      style="visibility: hidden; position: absolute"
    ></q-icon>
    <!--end of preload-->
  </div>
</template>

<style scoped>
.replay-bar {
  position: fixed;
  background-color: lightgray;
  bottom: 15px;
  left: 0;
  right: 0;
  margin: auto;
  width: calc(100vw - 40px);
  max-width: 1000px;
  border-radius: 10px;
  box-shadow: 3px 4px 10px #000000cc;
  gap: 6px;
  align-items: center;
  touch-action: none;
}

body.body--dark .replay-bar {
  box-shadow: 3px 4px 10px black;
}
</style>

<script setup>
import { ref, computed, watchEffect } from "vue";

defineOptions({
  name: "ReplayBar",
});

let props = defineProps({
  replayIsPlaying: Boolean,
  replayProgress: Number,
  replayProgressRounded: String,
  replayBarStartValue: Number,
  replayBarLastValue: Number,
  replayTypeForceSteppy: Boolean,
});

let emit = defineEmits([
  "toggle-play-pause",
  "jump-to-previous-click",
  "jump-to-next-click",
  "speed-multiplier-change",
  "is-inputting-change",
  "is-panning-change",
  "handle-slider-change",
  "handle-input-change",
  "replay-type-change",
]);

let replaySpeedMultiplierUnderlying = ref(20);
let replaySpeedMultiplier = computed(() => {
  const multiplyOptions = [
    0.01, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6,
    0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7,
    1.8, 1.9, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20,
  ];

  let result = multiplyOptions[replaySpeedMultiplierUnderlying.value];

  return result;
});
watchEffect(() => {
  emit("speed-multiplier-change", replaySpeedMultiplier.value);
});

let replayTypeSelector = ref("accurate"); //accurate, rounded, steppy
let replayType = computed(() =>
  props.replayTypeForceSteppy ? "steppy" : replayTypeSelector.value
);
watchEffect(() => {
  emit("replay-type-change", replayType.value);
});

function cycleReplayTypeSelector() {
  switch (replayTypeSelector.value) {
    case "accurate":
      replayTypeSelector.value = "rounded";
      break;
    case "rounded":
      replayTypeSelector.value = "steppy";
      break;
    case "steppy":
      replayTypeSelector.value = "accurate";
      break;
    default:
      throw new Error("illegal value");
  }
}
</script>
