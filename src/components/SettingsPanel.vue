<template>
  <div class="q-py-md q-px-md" style="max-width: 700px">
    <q-list bordered class="rounded-borders">
      <q-expansion-item
        expand-separator
        icon="tune"
        label="General settings"
        group="settings"
      >
        <q-card>
          <q-card-section>
            <q-select
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="chordingButtons"
              style="width: 175px; flex-shrink: 0"
              :options="[
                { label: 'Left Click', value: 'l' },
                { label: 'Left + Right Click', value: 'l+r' },
              ]"
              emit-value
              map-options
              stack-label
              label="Chording"
            ></q-select>
            <q-checkbox v-model="zeroStart" label="Zero Start" />
            <div class="flex q-mb-sm" style="align-items: center">
              <q-checkbox
                v-model="noGuessing"
                label="No Guessing"
                :disable="!wasmAvailable"
                class="q-mr-md"
              />
              <div
                v-if="!wasmAvailable"
                class="text-negative"
                style="flex: 1 1 200px"
              >
                No Guessing needs WebAssembly, which isn't supported.
              </div>
            </div>
            <template v-if="noGuessing && wasmAvailable">
              <q-input
                debounce="100"
                v-model.number="noGuessingMaxAttempts"
                label="No guessing iterations"
                type="number"
                dense
                min="100"
                max="10000000"
                style="width: 150px"
              />
              <br />
            </template>
            <q-select
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="faceHitbox"
              style="width: 175px; flex-shrink: 0"
              :options="[
                { label: 'Whole bar', value: 'bar' },
                { label: 'Just face', value: 'face' },
                {
                  label: 'Adaptive',
                  value: 'adaptive',
                },
              ]"
              emit-value
              map-options
              stack-label
              label="Face Hitbox"
            ></q-select>
            <div class="flex" style="gap: 15px">
              <q-input
                dense
                rounded
                outlined
                style="width: 120px"
                @keydown.prevent="
                  (event) => (keyboardClickDigKey = event.key.toLowerCase())
                "
                v-model="keyboardClickDigKey"
                label="Keyboard Dig Key"
                input-style="text-align: center"
              />
              <q-input
                dense
                rounded
                outlined
                style="width: 120px"
                @keydown.prevent="
                  (event) => (keyboardClickFlagKey = event.key.toLowerCase())
                "
                v-model="keyboardClickFlagKey"
                label="Keyboard Flag Key"
                input-style="text-align: center"
              />
            </div>
            <q-checkbox
              v-model="keyboardClickOpenOnKeyDown"
              label="Keyboard Click Reveal On Key Down"
            /><br /><br />
            <q-btn
              @click="
                $emit('scroll-to-board');
                settingsModal = true;
              "
              color="secondary"
              label="display settings (scale etc.)"
            />
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <q-expansion-item
        expand-separator
        icon="sym_o_bar_chart_4_bars"
        label="Game stat settings"
        group="settings"
      >
        <q-card>
          <q-card-section>
            <q-checkbox v-model="statsShow8Way" label="Show 8-way ZiNi" />
            <br />
            <q-checkbox v-model="statsShowChain" label="Show 100chain ZiNi" />
            <br />
            <q-checkbox
              v-model="statsShowWomZini"
              label="Show WoM L ZiNi and HZiNi"
            />
            <br />
            <q-checkbox
              :disable="!statsShowWomZini"
              v-model="statsShowWomZiniFix"
              label="Show WoM L ZiNi improved"
            />
            <br />
            <q-checkbox v-model="statsShowMaxEff" label="Show max eff" />
            <br />
            <q-select
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="statsRunDeepChain"
              style="width: 175px; flex-shrink: 0"
              :options="[
                { label: 'Eff Boards win', value: 'eff win' },
                { label: 'Eff Board win/lose', value: 'eff always' },
                {
                  label: 'Any win',
                  value: 'any win',
                },
                {
                  label: 'Any win/lose',
                  value: 'any always',
                },
                {
                  label: 'Never',
                  value: 'never',
                },
              ]"
              emit-value
              map-options
              stack-label
              label="Run deepChain"
            ></q-select>
            <q-checkbox
              v-model="statsShowStnb"
              label="Show STNB for standard sizes"
            />
            <br />
            <q-checkbox v-model="statsShowThrp" label="Show throughput" />
            <br />
            <q-checkbox v-model="statsShowRqp" label="Show RQP" />
            <br />
            <q-checkbox v-model="statsShowCorr" label="Show Correctness" />
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <q-expansion-item
        expand-separator
        icon="smartphone"
        label="Mobile/Touch settings"
        group="settings"
      >
        <q-card>
          <q-card-section>
            <div class="flex q-mb-sm" style="align-items: center">
              <q-checkbox
                v-model="soundEffectsEnabled"
                class="q-mr-md"
                style="flex-shrink: 0"
                label="Sound Effects"
              />
              <div class="text-info" style="flex: 1 1 200px">
                Dig/chord/flag sounds provided by Minesweeper Go
              </div>
            </div>
            <div class="flex q-mb-sm">
              <q-checkbox
                v-model="mobileModeEnabled"
                class="q-mr-md"
                style="flex-shrink: 0"
                label="Use Mobile Mode"
              />
              <div
                v-if="!mobileModeEnabled"
                class="text-info"
                style="flex: 1 1 290px"
              >
                Strongly recommended for touchscreen devices. Enables mobile
                optimised touch handling and shows additional touch settings.
              </div>
            </div>
            <template v-if="mobileModeEnabled">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="mobileScrollSetting"
                style="width: 175px; flex-shrink: 0"
                :options="[
                  { label: 'Enable scroll', value: 'enable' },
                  { label: 'Disable scroll', value: 'disable' },
                  {
                    label: 'Scroll on zeros',
                    value: 'zero',
                  },
                  {
                    label: 'Scroll on interior (flag version)',
                    value: 'enclosed flag',
                  },
                  {
                    label: 'Scroll on interior (nf version)',
                    value: 'enclosed nf',
                  },
                ]"
                emit-value
                map-options
                stack-label
                label="Touch Scroll Behaviour"
              ></q-select>
              <div
                v-if="
                  mobileScrollSetting === 'enclosed nf' ||
                  mobileScrollSetting === 'enclosed flag'
                "
                class="flex q-mb-sm"
              >
                <q-checkbox
                  v-model="mobileEnclosedScrollLetThrough"
                  label="Let interior clicks through"
                  style="flex-shrink: 0"
                  class="q-mr-md"
                />
                <div
                  v-if="!mobileEnclosedScrollLetThrough"
                  class="text-negative"
                  style="flex: 1 1 240px"
                >
                  <span v-if="mobileScrollSetting === 'enclosed nf'"
                    ><b>Danger:</b> having this unticked will cause problems if
                    you play using flags.</span
                  >
                  <span v-if="mobileScrollSetting === 'enclosed flag'"
                    ><b>Warning:</b> having this unticked will stop you from
                    placing deeply interior flags. You will still be able to
                    minecount using QuickPaint.</span
                  >
                </div>
              </div>
              <div
                v-if="
                  mobileScrollSetting === 'enclosed nf' ||
                  mobileScrollSetting === 'enclosed flag' ||
                  mobileScrollSetting === 'zero'
                "
                class="flex q-mb-sm"
              >
                <q-input
                  debounce="100"
                  v-model.number="mobileDelayForEnableScroll"
                  label="Enabling Scroll Delay (0-500ms)"
                  type="number"
                  dense
                  min="0"
                  max="500"
                  style="width: 170px"
                />
              </div>
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="touchRevealLocation"
                style="width: 175px; flex-shrink: 0"
                :options="[
                  {
                    label: 'Touch Start',
                    value: 'start',
                  },
                  { label: 'Touch End', value: 'end' },
                  { label: 'Block If Changed', value: 'block' },
                ]"
                emit-value
                map-options
                stack-label
                label="Touch Reveal Location"
              ></q-select>
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="touchRevealTiming"
                style="width: 175px; flex-shrink: 0"
                :options="[
                  {
                    label: 'Start of touch',
                    value: 'start',
                  },
                  { label: 'End of touch', value: 'end' },
                ]"
                emit-value
                map-options
                stack-label
                label="Touch Reveal Timing"
              ></q-select>
              <q-input
                debounce="100"
                v-model.number="touchLongPressTime"
                label="Long press time (80-400ms)"
                type="number"
                dense
                min="80"
                max="400"
                style="width: 150px"
              /><br />
              <q-checkbox
                v-model="touchLongPressDisabled"
                label="Disable long press"
                style="flex-shrink: 0"
              /><br />
              <q-input
                debounce="100"
                v-model.number="touchMaxTime"
                label="Max touch time (300-1500ms)"
                type="number"
                dense
                min="300"
                max="1500"
                style="width: 150px"
              /><br />
              <q-input
                debounce="100"
                v-model.number="touchScrollDistance"
                label="Max tiles moved for touch (2-5)"
                type="number"
                dense
                min="2"
                max="5"
                style="width: 150px"
              /><br />
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="flagToggleLocationClass"
                style="width: 175px; flex-shrink: 0"
                :options="[
                  {
                    label: 'Bottom Right',
                    value: 'toggle-bot-right',
                  },
                  {
                    label: 'Bottom Left',
                    value: 'toggle-bot-left',
                  },
                  {
                    label: 'Hidden',
                    value: 'toggle-hidden',
                  },
                  {
                    label: 'Show Reset Only',
                    value: 'toggle-hidden-reset',
                  },
                ]"
                emit-value
                map-options
                stack-label
                label="Mode toggle location"
              />
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="flagToggleSizeClass"
                style="width: 175px; flex-shrink: 0"
                :options="[
                  {
                    label: 'Normal',
                    value: 'toggle-normal',
                  },
                  {
                    label: 'Large',
                    value: 'toggle-large',
                  },
                  {
                    label: 'Small',
                    value: 'toggle-small',
                  },
                ]"
                emit-value
                map-options
                stack-label
                label="Mode toggle size"
              />
              <q-checkbox
                v-model="flagToggleSwitchAfterStart"
                label="Switch to flag mode after start"
              /><br />
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="touchActionOverride"
                style="width: 220px; flex-shrink: 0"
                :options="[
                  {
                    label: 'Use other settings (recommended)',
                    value: 'ignore',
                  },
                  {
                    label: 'pan-x',
                    value: 'pan-x',
                  },
                  {
                    label: 'pan-y',
                    value: 'pan-y',
                  },
                  {
                    label: 'pinch-zoom',
                    value: 'pinch-zoom',
                  },
                  {
                    label: 'pan-x pan-y',
                    value: 'pan-x pan-y',
                  },
                  {
                    label: 'pan-x pinch-zoom',
                    value: 'pan-x pinch-zoom',
                  },
                  {
                    label: 'pan-y pinch-zoom',
                    value: 'pan-y pinch-zoom',
                  },
                  {
                    label: 'pan-x pan-y pinch-zoom',
                    value: 'pan-x pan-y pinch-zoom',
                  },
                  {
                    label: 'none',
                    value: 'none',
                  },
                ]"
                emit-value
                map-options
                stack-label
                label="[advanced] Touch action override"
              />
            </template>
            <q-checkbox
              v-model="verticalExpert"
              label="Make expert boards portrait"
            /><br />
            <q-checkbox v-model="showQuickStats" label="Show Quick Stats" />
            <q-select
              v-if="showQuickStats"
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="quickStatsFontSize"
              style="width: 170px; flex-shrink: 0"
              :options="[
                { label: '8px', value: '8px' },
                { label: '10px', value: '10px' },
                { label: '12px', value: '12px' },
                { label: '14px', value: '14px' },
                { label: '16px', value: '16px' },
                { label: '18px', value: '18px' },
                { label: '20px', value: '20px' },
                { label: '22px', value: '22px' },
                { label: '24px', value: '24px' },
              ]"
              emit-value
              map-options
              stack-label
              label="Quick Stats Font Size"
            />
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <q-expansion-item
        expand-separator
        icon="brush"
        label="QuickPaint settings"
        group="settings"
      >
        <q-card>
          <q-card-section>
            <q-checkbox
              v-model="quickPaintInitialOnlyMines"
              label="QuickPaint only solves mines"
            /><br />
            <q-checkbox
              v-model="quickPaintMinimalMode"
              label="QuickPaint minimal mode"
            /><br />
            <q-checkbox
              v-model="quickPaintOnlyTrivialLogic"
              label="QuickPaint only use single number logic (e.g. no 1-2 patterns)"
            />
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <q-expansion-item
        expand-separator
        icon="percent"
        label="Hint settings"
        group="settings"
      >
        <q-card>
          <q-card-section>
            <div v-if="!wasmAvailable" class="text-negative q-mb-md">
              Hints disabled due to WebAssembly being unsupported
            </div>
            <q-select
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="autoHintCriteria"
              style="width: 175px; flex-shrink: 0"
              :options="[
                {
                  label: 'Always',
                  value: 'always',
                },
                { label: 'Never', value: 'never' },
                { label: 'Time Condition', value: 'time' },
              ]"
              emit-value
              map-options
              stack-label
              label="Show hint after loss"
            ></q-select>
            <template v-if="autoHintCriteria === 'time'">
              <q-input
                debounce="100"
                v-model.number="autoHintTime"
                label="Hint min game time (seconds)"
                type="number"
                dense
                min="0"
                max="500"
                style="width: 150px"
              /><br />
            </template>
            <q-select
              v-if="autoHintCriteria !== 'never'"
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="autoHintVariants"
              style="width: 175px; flex-shrink: 0"
              :options="[
                {
                  label: 'All',
                  value: 'all',
                },
                { label: 'All but Eff Boards', value: 'not eff boards' },
              ]"
              emit-value
              map-options
              stack-label
              label="Loss hint gamemodes"
            ></q-select>
            <q-select
              v-if="autoHintCriteria !== 'never'"
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="autoHintDelay"
              style="width: 175px; flex-shrink: 0"
              :options="[
                {
                  label: 'Instant',
                  value: 0,
                },
                { label: '0.5s', value: 500 },
                { label: '0.75s', value: 750 },
                { label: '1s', value: 1000 },
                { label: '1.5s', value: 1500 },
                { label: '2s', value: 2000 },
                { label: '3s', value: 3000 },
              ]"
              emit-value
              map-options
              stack-label
              label="Loss hint delay"
            ></q-select>
            <q-select
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="autoHintBackdrop"
              style="width: 175px; flex-shrink: 0"
              :options="[
                {
                  label: 'Blast numbers',
                  value: 'numbers',
                },
                { label: 'Mines', value: 'mines' },
                { label: 'No mines', value: 'no mines' },
                { label: 'No highlight', value: 'minimal' },
              ]"
              emit-value
              map-options
              stack-label
              label="Loss hint backdrop"
            ></q-select>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <q-expansion-item
        expand-separator
        icon="play_circle_filled"
        label="Replay settings"
        group="settings"
      >
        <q-card>
          <q-card-section>
            <q-checkbox
              v-model="reorderZini"
              label="Reorder ZiNi Replay"
            /><br />
            <q-select
              class="q-mx-md q-mb-md"
              outlined
              options-dense
              dense
              transition-duration="100"
              input-debounce="0"
              v-model="replayShowHidden"
              style="width: 175px; flex-shrink: 0"
              :options="[
                {
                  label: 'None',
                  value: 'none',
                },
                { label: 'Mines', value: 'mines' },
                { label: 'Transparent', value: 'transparent3' },
                { label: 'Very Transparent', value: 'transparent' },
                { label: 'Transparent + mines', value: 'transparent2' },
                /*{ label: 'Closed numbers', value: 'closed numbers' },*/
                { label: 'Dimmed', value: 'dimmed' },
              ]"
              emit-value
              map-options
              stack-label
              label="Show hidden tiles"
              @update:model-value="game?.board?.replay?.refreshAndDraw()"
            />
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-list>
  </div>
</template>

<script setup>
import {
  wasmAvailable,
  statsShow8Way,
  statsShowChain,
  statsShowWomZini,
  statsShowWomZiniFix,
  statsShowMaxEff,
  statsRunDeepChain,
  statsShowStnb,
  statsShowThrp,
  statsShowRqp,
  statsShowCorr,
  settingsModal,
  chordingButtons,
  zeroStart,
  noGuessing,
  noGuessingMaxAttempts,
  autoHintCriteria,
  autoHintTime,
  autoHintDelay,
  autoHintVariants,
  autoHintBackdrop,
  quickPaintInitialOnlyMines,
  quickPaintMinimalMode,
  quickPaintOnlyTrivialLogic,
  flagToggleLocationClass,
  flagToggleSizeClass,
  flagToggleSwitchAfterStart,
  mobileModeEnabled,
  mobileScrollSetting,
  mobileEnclosedScrollLetThrough,
  mobileDelayForEnableScroll,
  touchRevealLocation,
  touchRevealTiming,
  touchLongPressTime,
  touchLongPressDisabled,
  touchMaxTime,
  touchScrollDistance,
  verticalExpert,
  touchActionOverride,
  showQuickStats,
  quickStatsFontSize,
  faceHitbox,
  soundEffectsEnabled,
  reorderZini,
  replayShowHidden,
  keyboardClickOpenOnKeyDown,
  keyboardClickDigKey,
  keyboardClickFlagKey,
} from "src/composables/useSettings";

defineOptions({
  name: "SettingsPanel",
});

let emit = defineEmits(["scroll-to-board"]);

import { inject } from "vue";
const game = inject("game");
</script>
