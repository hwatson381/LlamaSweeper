<template>
  <div
    ref="flagToggle"
    :class="[
      {
        'flag-toggle': true,
        'flag-active': flagToggleActive && !flagToggleShowReset,
        'flag-show-reset': flagToggleShowReset,
      },
      flagToggleLocationClass,
      flagToggleSizeClass,
    ]"
    @click="toggleFlagButtonFromClick($event)"
    @touchstart="toggleFlagButtonFromTouchStart($event)"
    @touchend="toggleFlagButtonFromTouchEnd($event)"
  >
    <q-icon
      name="flag"
      :class="[flagToggleSizeClass, 'flag-toggle-icon']"
      v-show="!flagToggleShowReset"
    />
    <q-icon
      name="sym_o_sentiment_satisfied"
      style="position: absolute"
      :class="[flagToggleSizeClass, 'flag-toggle-icon']"
      v-show="flagToggleShowReset"
    ></q-icon>
  </div>
</template>

<style scoped>
.flag-toggle {
  background-color: rgba(124, 128, 131, 0.9);
  border-color: #4d4d4d !important;
  border: unset;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  touch-action: none;
}

body.body--dark .flag-toggle {
  background-color: rgba(29, 33, 37, 0.9);
  border-color: white !important;
}

.flag-active {
  background-color: rgba(176, 74, 74, 0.9);
}

body.body--dark .flag-active {
  background-color: rgba(102, 23, 23, 0.9);
}

.flag-toggle.toggle-bot-right {
  border-radius: 10% 0 0 0;
  border-left: 1px solid;
  border-top: 1px solid;
  right: -1px;
  bottom: -1px;
}

.flag-toggle.toggle-bot-left {
  border-radius: 0 10% 0 0;
  border-right: 1px solid;
  border-top: 1px solid;
  left: -1px;
  bottom: -1px;
}

.flag-toggle.toggle-hidden {
  display: none !important;
}

.flag-toggle.toggle-hidden-reset:not(.flag-show-reset) {
  display: none !important;
}

.flag-toggle.toggle-hidden-reset.flag-show-reset {
  border-radius: 10% 0 0 0;
  border-left: 1px solid;
  border-top: 1px solid;
  right: -1px;
  bottom: -1px;
}

.flag-toggle.toggle-small {
  width: 50px;
  height: 50px;
}
.flag-toggle-icon.toggle-small {
  font-size: 2em;
}

.flag-toggle.toggle-normal {
  width: 80px;
  height: 80px;
}
.flag-toggle-icon.toggle-normal {
  font-size: 3em;
}

.flag-toggle.toggle-large {
  width: 120px;
  height: 120px;
}
.flag-toggle-icon.toggle-large {
  font-size: 4.5em;
}

.flag-toggle.toggle-xl {
  width: 160px;
  height: 160px;
}
.flag-toggle-icon.toggle-xl {
  font-size: 6em;
}

.flag-toggle-icon {
  color: black;
}

body.body--dark .flag-active .flag-toggle-icon {
  color: white;
}
</style>

<script setup>
import {
  flagToggleActive,
  flagToggleShowReset,
  flagToggleLocationClass,
  flagToggleSizeClass,
  flagToggleEvent,
} from "src/composables/useSettings";

defineOptions({
  name: "MobileFlagButton",
});

import { inject, ref } from "vue";
const game = inject("game");
const flagToggle = ref(null);

function toggleFlagButtonFromClick(e) {
  if (flagToggleEvent.value === "click") {
    game.board.toggleFlagButton();
  }
}

function toggleFlagButtonFromTouchStart(e) {
  if (flagToggleEvent.value === "touch start") {
    game.board.toggleFlagButton();
  }
}

function toggleFlagButtonFromTouchEnd(e) {
  if (flagToggleEvent.value !== "touch end") {
    return;
  }

  const touch = e.changedTouches[0];
  const bounds = flagToggle.value.getBoundingClientRect();

  const endedOnButton =
    touch.clientX >= bounds.left &&
    touch.clientX <= bounds.right &&
    touch.clientY >= bounds.top &&
    touch.clientY <= bounds.bottom;

  if (endedOnButton) {
    game.board.toggleFlagButton();
  }
}
</script>
