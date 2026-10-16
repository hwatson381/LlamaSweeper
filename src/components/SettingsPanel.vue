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
            <div class="setting-row">
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
              />
              <SettingHelp
                title="Chording"
                description="Chooses which mouse buttons are required to chord (reveal neighbours of a sufficiently flagged number)."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="zeroStart" label="Zero Start" />
              <SettingHelp
                title="Zero Start"
                description="Guarantees your first click gives an opening. Eff Boards ignores this setting."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox
                v-model="noGuessing"
                label="No Guessing"
                :disable="!wasmAvailable"
              />
              <div
                v-if="!wasmAvailable"
                class="text-negative setting-help-status"
              >
                No Guessing needs WebAssembly, which isn't supported.
              </div>
              <SettingHelp
                title="No Guessing"
                description="Generates boards that can be fully solved with logic. Eff Boards ignores this setting."
              />
            </div>
            <template v-if="noGuessing && wasmAvailable">
              <div class="setting-row q-mb-md">
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
                <SettingHelp
                  title="No guessing iterations"
                  description="Maximum attempts at generating a no guess board before giving up."
                />
              </div>
            </template>
            <div class="setting-row">
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
              />
              <SettingHelp
                mode="dialog"
                title="Face Hitbox"
                description="Choose which part of the top bar resets the game when clicked."
                :options="faceHitboxOptions"
                @open-dialog="openHelpDialog"
              />
            </div>
            <div class="setting-row q-mb-md">
              <div class="setting-key-inputs">
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
              <SettingHelp
                title="Keyboard Dig and Flag Keys"
                description="Keyboard keys to use as alternative to the mouse buttons. Click the boxes and press a key to change"
              />
            </div>
            <div class="setting-row q-mb-md">
              <q-checkbox
                v-model="keyboardClickOpenOnKeyDown"
                label="Keyboard Click Reveal On Key Down"
              />
              <SettingHelp
                title="Keyboard Click Reveal On Key Down"
                description="Makes the dig key reveal squares when pressed down instead of when it is released."
              />
            </div>
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
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="statsShow8Way" label="Show 8-way ZiNi" />
              <SettingHelp
                title="Show 8-way ZiNi"
                description="Runs the classic ZiNi algorithm 8 times for rotations/reflections of the board and picks the best result."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="statsShowGZini" label="Show G.ZiNi" />
              <SettingHelp
                title="Show G.ZiNi"
                description="The classic greedy ZiNi implemention which chooses the top-left-most chord with highest premium."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="statsShowHZini" label="Show H.ZiNi" />
              <SettingHelp
                title="Show H.ZiNi"
                description="The classic human ZiNi implementation which opens all openings at the start and restricts chords to squares which have already been opened."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="statsShowChain" label="Show 100chain ZiNi" />
              <SettingHelp
                title="Show 100chain ZiNi"
                description="A strong and fast ZiNi algorithm which runs Chain ZiNi 100 times and picks the best result."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox
                v-model="statsShowWomZini"
                label="Show WoM L ZiNi and HZiNi"
              />
              <SettingHelp
                title="Show WoM L ZiNi and HZiNi"
                description="L ZiNi and HZiNi are the legacy ZiNi implementations used on minesweeper.online."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox
                :disable="!statsShowWomZini"
                v-model="statsShowWomZiniFix"
                label="Show WoM L ZiNi improved"
              />
              <SettingHelp
                title="Show WoM L ZiNi improved"
                description="An improved version of WoM L ZiNi which corrects for how squares on opening edges are handled."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="statsShowMaxEff" label="Show max eff" />
              <SettingHelp
                title="Show max eff"
                description="Max eff = 3BV / best ZiNi. It is the highest efficiency the ZiNi algorithms found for this board."
              />
            </div>
            <div class="setting-row">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="statsRunDeepChain"
                style="width: 175px; flex-shrink: 0"
                :options="deepChainOptions"
                emit-value
                map-options
                stack-label
                label="Run deepChain"
              />
              <SettingHelp
                mode="dialog"
                title="Run deepChain"
                description="When to automatically run DeepChain ZiNi, a very strong but slow algorithm."
                :options="deepChainHelpOptions"
                @open-dialog="openHelpDialog"
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox
                v-model="statsShowStnb"
                label="Show STNB for standard sizes"
              />
              <SettingHelp
                title="Show STNB for standard sizes"
                description="A measure of speed that takes into account both time and 3BV. It is balanced across Beginner, Intermediate and Expert."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="statsShowThrp" label="Show throughput" />
              <SettingHelp
                title="Show throughput"
                description="Throughput = solved 3BV / effective clicks. This can be thought of as efficiency excluding wasted clicks."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="statsShowRqp" label="Show RQP" />
              <SettingHelp
                title="Show RQP"
                description="RQP = (time + 1) / 3BV/s. A speed stat where lower is better."
              />
            </div>
            <div class="setting-row">
              <q-checkbox v-model="statsShowCorr" label="Show Correctness" />
              <SettingHelp
                title="Show Correctness"
                description="Correctness = effective clicks / total clicks. The proportion of your clicks that changed the board."
              />
            </div>
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
            <div class="setting-row q-mb-sm">
              <div class="setting-content-grouped">
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
              <SettingHelp
                title="Sound Effects"
                description="Plays sounds for board interactions. Works on desktop too."
              />
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
              <div class="setting-row">
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
                />
                <SettingHelp
                  mode="dialog"
                  title="Touch Scroll Behaviour"
                  description="Controls whether dragging on the board scrolls the page during a game."
                  :options="touchScrollHelpOptions"
                  @open-dialog="openHelpDialog"
                />
              </div>
              <div
                v-if="
                  mobileScrollSetting === 'enclosed nf' ||
                  mobileScrollSetting === 'enclosed flag'
                "
                class="setting-row q-mb-sm"
              >
                <div class="setting-content-grouped">
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
                      ><b>Danger:</b> having this unticked will cause problems
                      if you play using flags.</span
                    >
                    <span v-if="mobileScrollSetting === 'enclosed flag'"
                      ><b>Warning:</b> having this unticked will stop you from
                      placing deeply interior flags. You will still be able to
                      minecount using QuickPaint.</span
                    >
                  </div>
                </div>
                <SettingHelp
                  title="Let interior clicks through"
                  description="When ticked, touches on interior squares can still act on the board (e.g. flagging/digging). When unticked, they only scroll."
                />
              </div>
              <div
                v-if="
                  mobileScrollSetting === 'enclosed nf' ||
                  mobileScrollSetting === 'enclosed flag' ||
                  mobileScrollSetting === 'zero'
                "
                class="setting-row q-mb-sm"
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
                <SettingHelp
                  title="Enabling Scroll Delay"
                  description="How long to wait before newly revealed squares affect the scrolling criteria. This helps prevent surprise openings from turning taps into scrolls."
                />
              </div>
              <div class="setting-row">
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="touchRevealLocation"
                  style="width: 175px; flex-shrink: 0"
                  :options="touchRevealLocationOptions"
                  emit-value
                  map-options
                  stack-label
                  label="Touch Reveal Location"
                />
                <SettingHelp
                  mode="dialog"
                  title="Touch Reveal Location"
                  description="Which square a tap acts on if your finger moves during the touch."
                  :options="touchRevealLocationHelpOptions"
                  @open-dialog="openHelpDialog"
                />
              </div>
              <div class="setting-row">
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="touchRevealTiming"
                  style="width: 175px; flex-shrink: 0"
                  :options="touchRevealTimingOptions"
                  emit-value
                  map-options
                  stack-label
                  label="Touch Reveal Timing"
                />
                <SettingHelp
                  mode="dialog"
                  title="Touch Reveal Timing"
                  description="When a tap takes effect."
                  :options="touchRevealTimingHelpOptions"
                  @open-dialog="openHelpDialog"
                />
              </div>
              <div
                v-if="touchRevealTiming === 'start'"
                class="setting-row q-mb-sm"
              >
                <q-checkbox
                  v-model="touchStartTimingOnlyActiveGames"
                  label='Restrict "Start of touch" timing to active games'
                />
                <SettingHelp
                  title='Restrict "Start of touch" timing to active games'
                  description="Only uses Start of touch timing while a game is in progress. Other times, including the first tap, use End of touch so scrolling the page isn't disrupted outside gameplay."
                />
              </div>
              <div class="setting-row q-mb-sm">
                <q-input
                  debounce="100"
                  v-model.number="touchLongPressTime"
                  label="Long press time (80-400ms)"
                  type="number"
                  dense
                  min="80"
                  max="400"
                  style="width: 150px"
                />
                <SettingHelp
                  title="Long press time"
                  description="How long you need to hold a touch for it to count as a long press. A long press does the opposite of the current mode (flags in dig mode, digs in flag mode)."
                />
              </div>
              <div class="setting-row q-mb-sm">
                <q-checkbox
                  v-model="touchLongPressDisabled"
                  label="Disable long press"
                  style="flex-shrink: 0"
                />
                <SettingHelp
                  title="Disable long press"
                  description="When ticked, long presses act the same as normal taps. Use the mode toggle button to switch between digging and flagging."
                />
              </div>
              <div class="setting-row q-mb-sm">
                <q-input
                  debounce="100"
                  v-model.number="touchMaxTime"
                  label="Max touch time (300-1500ms)"
                  type="number"
                  dense
                  min="300"
                  max="1500"
                  style="width: 150px"
                />
                <SettingHelp
                  title="Max touch time"
                  description="Touches held longer than this are cancelled and do nothing."
                />
              </div>
              <div class="setting-row q-mb-sm">
                <q-input
                  debounce="100"
                  v-model.number="touchScrollDistance"
                  label="Max tiles moved for touch (2-5)"
                  type="number"
                  dense
                  min="2"
                  max="5"
                  style="width: 150px"
                />
                <SettingHelp
                  title="Max tiles moved for touch"
                  description="Touches that move further than this many tiles are cancelled and do nothing, for example when scrolling."
                />
              </div>
              <div class="setting-row">
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="flagToggleLocationClass"
                  style="width: 175px; flex-shrink: 0"
                  :options="flagToggleLocationOptions"
                  emit-value
                  map-options
                  stack-label
                  label="Mode toggle location"
                />
                <SettingHelp
                  mode="dialog"
                  title="Mode toggle location"
                  description="Where the dig/flag mode toggle button is positioned. After a game ends it becomes a reset button."
                  :options="flagToggleLocationHelpOptions"
                  @open-dialog="openHelpDialog"
                />
              </div>
              <template
                v-if="flagToggleLocationClass === 'toggle-hidden-reset'"
              >
                <div class="setting-row q-mb-sm">
                  <q-checkbox
                    v-model="mobileResetGuard"
                    label="Prevent accidental mobile reset"
                  />
                  <SettingHelp
                    title="Prevent accidental mobile reset"
                    description="After a game ends, the reset button ignores taps for a moment so a tap meant for the board doesn't immediately start a new game."
                  />
                </div>
              </template>
              <div class="setting-row">
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="flagToggleSizeClass"
                  style="width: 175px; flex-shrink: 0"
                  :options="flagToggleSizeOptions"
                  emit-value
                  map-options
                  stack-label
                  label="Mode toggle size"
                />
                <SettingHelp
                  mode="dialog"
                  title="Mode toggle size"
                  description="Size of the mode toggle button."
                  :options="flagToggleSizeHelpOptions"
                  @open-dialog="openHelpDialog"
                />
              </div>
              <div class="setting-row">
                <q-checkbox
                  v-model="flagToggleSwitchAfterStart"
                  label="Switch to flag mode after start"
                />
                <SettingHelp
                  title="Switch to flag mode after start"
                  description="Switches to flag mode automatically after your first tap starts a game."
                />
              </div>
              <div class="setting-row">
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="touchActionOverride"
                  style="width: 220px; flex-shrink: 0"
                  :options="touchActionOverrideOptions"
                  emit-value
                  map-options
                  stack-label
                  label="[advanced] Touch action override"
                />
                <SettingHelp
                  mode="dialog"
                  title="Touch action override"
                  description="Sets the CSS touch-action on the board, controlling which panning and pinch-zoom gestures the browser allows. For example, pan-y can lock scrolling to the vertical direction."
                  :options="touchActionOverrideHelpOptions"
                  @open-dialog="openHelpDialog"
                />
              </div>
              <div class="setting-row">
                <q-select
                  class="q-mx-md q-mb-md"
                  outlined
                  options-dense
                  dense
                  transition-duration="100"
                  input-debounce="0"
                  v-model="flagToggleEvent"
                  style="width: 220px; flex-shrink: 0"
                  :options="flagToggleEventOptions"
                  emit-value
                  map-options
                  stack-label
                  label="[advanced] Mode toggle event"
                />
                <SettingHelp
                  mode="dialog"
                  title="Mode toggle event"
                  description="Which touch event activates the mode toggle button."
                  :options="flagToggleEventHelpOptions"
                  @open-dialog="openHelpDialog"
                />
              </div>
            </template>
            <div class="setting-row q-mb-sm">
              <q-checkbox
                v-model="verticalExpert"
                label="Make expert boards portrait"
              />
              <SettingHelp
                title="Make expert boards portrait"
                description="The Expert preset becomes 16 wide by 30 tall instead of 30 by 16. This can fit better on some mobile device screens."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="showQuickStats" label="Show Quick Stats" />
              <SettingHelp
                title="Show Quick Stats"
                description="Shows a small overlay in the top left after each game with a few stats for quick reference."
              />
            </div>
            <div v-if="showQuickStats" class="setting-row">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="quickStatsFontSize"
                style="width: 170px; flex-shrink: 0"
                :options="quickStatsFontSizeOptions"
                emit-value
                map-options
                stack-label
                label="Quick Stats Font Size"
              />
              <SettingHelp
                title="Quick Stats Font Size"
                description="Text size of the Quick Stats overlay."
              />
            </div>
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
            <div class="setting-row q-mb-sm">
              <q-checkbox
                v-model="quickPaintInitialOnlyMines"
                label="QuickPaint only solves mines"
              />
              <SettingHelp
                title="QuickPaint only solves mines"
                description="When QuickPaint opens, it automatically marks squares you can work out with basic logic. When ticked, it only marks known mines (red). When unticked, it also marks known safe squares (green)."
              />
            </div>
            <div class="setting-row q-mb-sm">
              <q-checkbox
                v-model="quickPaintMinimalMode"
                label="QuickPaint minimal mode"
              />
              <SettingHelp
                title="QuickPaint minimal mode"
                description="In minimal mode, the controls only let you left click to place dots (intended to represent planned clicks) and right click to mark squares orange (intended to represent guessed mines). Untick this setting to allow cycling between known, guess and dot markings."
              />
            </div>
            <div class="setting-row">
              <q-checkbox
                v-model="quickPaintOnlyTrivialLogic"
                label="QuickPaint only use single number logic (e.g. no 1-2 patterns)"
              />
              <SettingHelp
                title="QuickPaint only use single number logic"
                description="Limits QuickPaint's automatic marking to what a single number tells you. When off, it also allows comparing neighbouring numbers (subtraction formula, e.g. 1-2 patterns)."
              />
            </div>
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
            <div class="setting-row">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="autoHintCriteria"
                style="width: 175px; flex-shrink: 0"
                :options="autoHintCriteriaOptions"
                emit-value
                map-options
                stack-label
                label="Show hint after loss"
              />
              <SettingHelp
                mode="dialog"
                title="Show hint after loss"
                description="Whether a hint is shown automatically after you lose."
                :options="autoHintCriteriaHelpOptions"
                @open-dialog="openHelpDialog"
              />
            </div>
            <template v-if="autoHintCriteria === 'time'">
              <div class="setting-row q-mb-sm">
                <q-input
                  debounce="100"
                  v-model.number="autoHintTime"
                  label="Hint min game time (seconds)"
                  type="number"
                  dense
                  min="0"
                  max="500"
                  style="width: 150px"
                />
                <SettingHelp
                  title="Hint min game time"
                  description="Loss hints only appear automatically if the game lasted longer than this."
                />
              </div>
            </template>
            <div v-if="autoHintCriteria !== 'never'" class="setting-row">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="autoHintVariants"
                style="width: 175px; flex-shrink: 0"
                :options="autoHintVariantsOptions"
                emit-value
                map-options
                stack-label
                label="Loss hint gamemodes"
              />
              <SettingHelp
                mode="dialog"
                title="Loss hint gamemodes"
                description="Which modes show automatic loss hints."
                :options="autoHintVariantsHelpOptions"
                @open-dialog="openHelpDialog"
              />
            </div>
            <div v-if="autoHintCriteria !== 'never'" class="setting-row">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="autoHintDelay"
                style="width: 175px; flex-shrink: 0"
                :options="autoHintDelayOptions"
                emit-value
                map-options
                stack-label
                label="Loss hint delay"
              />
              <SettingHelp
                title="Loss hint delay"
                description="How long the mines are shown after a loss before the hint appears."
              />
            </div>
            <div class="setting-row">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="autoHintBackdrop"
                style="width: 175px; flex-shrink: 0"
                :options="autoHintBackdropOptions"
                emit-value
                map-options
                stack-label
                label="Loss hint backdrop"
              />
              <SettingHelp
                mode="dialog"
                title="Loss hint backdrop"
                description="What is shown underneath the probabilities on a loss hint."
                :options="autoHintBackdropHelpOptions"
                @open-dialog="openHelpDialog"
              />
            </div>
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
            <div class="setting-row q-mb-sm">
              <q-checkbox v-model="reorderZini" label="Reorder ZiNi Replay" />
              <SettingHelp
                title="Reorder ZiNi Replay"
                description="Rearranges ZiNi replays into an easier order to follow: openings first, then digs on squares that get chorded, then all flags, then all chords, then any remaining digs. The number of clicks doesn't change."
              />
            </div>
            <div class="setting-row">
              <q-select
                class="q-mx-md q-mb-md"
                outlined
                options-dense
                dense
                transition-duration="100"
                input-debounce="0"
                v-model="replayShowHidden"
                style="width: 175px; flex-shrink: 0"
                :options="replayShowHiddenOptions"
                emit-value
                map-options
                stack-label
                label="Show hidden tiles"
                @update:model-value="game?.board?.replay?.refreshAndDraw()"
              />
              <SettingHelp
                mode="dialog"
                title="Show hidden tiles"
                description="What unrevealed squares show during replays, so you can see the rest of the board."
                :options="replayShowHiddenHelpOptions"
                @open-dialog="openHelpDialog"
              />
            </div>
            <div class="setting-row">
              <q-checkbox
                v-model="recordButtonEvents"
                label="Record mouse button events for RawVF"
              />
              <SettingHelp
                title="Record mouse button events for RawVF"
                description="Records every individual mouse button press and release for inclusion in the RawVF export or when the replay is sent to StrangeDust's replay analyser."
              />
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-list>

    <q-dialog v-model="helpDialogOpen">
      <q-card class="setting-help-dialog">
        <q-card-section class="bg-info text-white">
          <div class="text-h6">{{ selectedHelp.title }}</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <p class="q-mb-sm">{{ selectedHelp.description }}</p>
          <div
            v-for="option in selectedHelp.options"
            :key="option.label"
            class="q-mt-sm"
          >
            <strong>{{ option.label }}:</strong> {{ option.description }}
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup color="info" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref } from "vue";
import SettingHelp from "src/components/SettingHelp.vue";
import {
  wasmAvailable,
  statsShow8Way,
  statsShowGZini,
  statsShowHZini,
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
  mobileResetGuard,
  flagToggleEvent,
  mobileModeEnabled,
  mobileScrollSetting,
  mobileEnclosedScrollLetThrough,
  mobileDelayForEnableScroll,
  touchRevealLocation,
  touchRevealTiming,
  touchStartTimingOnlyActiveGames,
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
  recordButtonEvents,
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

const helpDialogOpen = ref(false);
const selectedHelp = ref({ title: "", description: "", options: [] });
const faceHitboxOptions = [
  {
    label: "Whole bar",
    description: "Clicking anywhere on the top bar resets.",
  },
  { label: "Just face", description: "Only clicking the face resets." },
  {
    label: "Adaptive",
    description:
      "Just the face during a game (to avoid accidental resets), and the whole bar otherwise.",
  },
];
const deepChainOptions = [
  { label: "Eff Boards win", value: "eff win" },
  { label: "Eff Board win/lose", value: "eff always" },
  { label: "Any win", value: "any win" },
  { label: "Any win/lose", value: "any always" },
  { label: "Never", value: "never" },
];
const deepChainHelpOptions = [
  {
    label: "Eff Boards win",
    description: "Only after winning an Eff Boards game.",
  },
  {
    label: "Eff Board win/lose",
    description: "After any finished Eff Boards game.",
  },
  { label: "Any win", description: "After winning in any mode." },
  { label: "Any win/lose", description: "After every finished game." },
  {
    label: "Never",
    description: 'Only when you click "run" in the stats panel.',
  },
];
const touchScrollOptions = [
  { label: "Enable scroll", value: "enable" },
  { label: "Disable scroll", value: "disable" },
  { label: "Scroll on zeros", value: "zero" },
  { label: "Scroll on interior (flag version)", value: "enclosed flag" },
  { label: "Scroll on interior (nf version)", value: "enclosed nf" },
];
const touchScrollHelpOptions = [
  {
    label: "Enable scroll",
    description: "Touches on the board can always scroll the page.",
  },
  {
    label: "Disable scroll",
    description: "Touches on the board never scroll the page.",
  },
  {
    label: "Scroll on zeros",
    description:
      "During a game, only touches that start on revealed zeros can scroll.",
  },
  {
    label: "Scroll on interior (flag version)",
    description:
      "During a game, touches can scroll from interior squares, where every neighbour is revealed or an obvious mine. Mines next to numbers that could still be chorded aren't interior, so you can still flag them.",
  },
  {
    label: "Scroll on interior (nf version)",
    description:
      "Like the flag version but without the chording exception, which gives more room to scroll for NF players.",
  },
];
const touchRevealLocationOptions = [
  { label: "Touch Start", value: "start" },
  { label: "Touch End", value: "end" },
  { label: "Block If Changed", value: "block" },
];
const touchRevealLocationHelpOptions = [
  {
    label: "Touch Start",
    description: "The square where your finger first touched.",
  },
  { label: "Touch End", description: "The square where your finger lifted." },
  {
    label: "Block If Changed",
    description: "Cancels the tap if your finger ends on a different square.",
  },
];
const touchRevealTimingOptions = [
  { label: "Start of touch", value: "start" },
  { label: "End of touch", value: "end" },
];
const touchRevealTimingHelpOptions = [
  {
    label: "Start of touch",
    description:
      'As soon as your finger touches the screen. Fastest, but with some trade-offs. Long press won\'t work, also you need to be more careful where the first touch is when scrolling as it still acts on the board. For no flag players, I\'d suggest setting "Touch Scroll behaviour" to the "interior (nf)" option and having "Let interior clicks through" unticked to guard against unintended actions during scrolls.',
  },
  { label: "End of touch", description: "When your finger lifts." },
];
const flagToggleLocationOptions = [
  { label: "Bottom Right", value: "toggle-bot-right" },
  { label: "Bottom Left", value: "toggle-bot-left" },
  { label: "Hidden", value: "toggle-hidden" },
  { label: "Show Reset Only", value: "toggle-hidden-reset" },
];
const flagToggleLocationHelpOptions = [
  { label: "Bottom Right", description: "Bottom right corner." },
  { label: "Bottom Left", description: "Bottom left corner." },
  { label: "Hidden", description: "Never shown." },
  {
    label: "Show Reset Only",
    description:
      "Hidden during games and only appears as a reset button after a game ends (bottom right).",
  },
];
const flagToggleSizeOptions = [
  { label: "Small", value: "toggle-small" },
  { label: "Normal", value: "toggle-normal" },
  { label: "Large", value: "toggle-large" },
  { label: "Extra Large", value: "toggle-xl" },
];
const flagToggleSizeHelpOptions = [
  { label: "Small", description: "50px." },
  { label: "Normal", description: "80px." },
  { label: "Large", description: "120px." },
  { label: "Extra Large", description: "160px." },
];
const touchActionOverrideOptions = [
  { label: "Use other settings (recommended)", value: "ignore" },
  { label: "pan-x", value: "pan-x" },
  { label: "pan-y", value: "pan-y" },
  { label: "pinch-zoom", value: "pinch-zoom" },
  { label: "pan-x pan-y", value: "pan-x pan-y" },
  { label: "pan-x pinch-zoom", value: "pan-x pinch-zoom" },
  { label: "pan-y pinch-zoom", value: "pan-y pinch-zoom" },
  { label: "pan-x pan-y pinch-zoom", value: "pan-x pan-y pinch-zoom" },
  { label: "none", value: "none" },
];
const touchActionOverrideHelpOptions = [
  {
    label: "Use other settings (recommended)",
    description:
      'Uses "none" when scroll is disabled, otherwise "manipulation" (pan and pinch zoom allowed, no double-tap zoom).',
  },
  {
    label: "pan-x / pan-y / pinch-zoom and combinations",
    description: "Allow only the listed gestures.",
  },
  {
    label: "none",
    description: "The browser won't pan or zoom from touches on the board.",
  },
];
const flagToggleEventOptions = [
  { label: "Click (recommended)", value: "click" },
  { label: "Touch Start", value: "touch start" },
  { label: "Touch End", value: "touch end" },
];
const flagToggleEventHelpOptions = [
  { label: "Click (recommended)", description: "Standard button click." },
  {
    label: "Touch Start",
    description:
      "Activates as soon as your finger touches the button. Fastest.",
  },
  {
    label: "Touch End",
    description:
      "Activates when your finger lifts, but only if it started and ended on the button.",
  },
];
const quickStatsFontSizeOptions = [
  "8px",
  "10px",
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "22px",
  "24px",
].map((label) => ({ label, value: label }));
const autoHintCriteriaOptions = [
  { label: "Always", value: "always" },
  { label: "Never", value: "never" },
  { label: "Time Condition", value: "time" },
];
const autoHintCriteriaHelpOptions = [
  { label: "Always", description: "After every loss." },
  { label: "Never", description: "Only when you ask for a hint." },
  {
    label: "Time Condition",
    description:
      "Only if the game lasted longer than a minimum time, which avoids hints on instant losses.",
  },
];
const autoHintVariantsOptions = [
  { label: "All", value: "all" },
  { label: "All but Eff Boards", value: "not eff boards" },
];
const autoHintVariantsHelpOptions = [
  { label: "All", description: "Every mode." },
  { label: "All but Eff Boards", description: "Every mode except Eff Boards." },
];
const autoHintDelayOptions = [
  { label: "Instant", value: 0 },
  { label: "0.5s", value: 500 },
  { label: "0.75s", value: 750 },
  { label: "1s", value: 1000 },
  { label: "1.5s", value: 1500 },
  { label: "2s", value: 2000 },
  { label: "3s", value: 3000 },
];
const autoHintBackdropOptions = [
  { label: "Blast numbers", value: "numbers" },
  { label: "Mines", value: "mines" },
  { label: "No mines", value: "no mines" },
  { label: "No highlight", value: "minimal" },
];
const autoHintBackdropHelpOptions = [
  {
    label: "Blast numbers",
    description:
      "Shows where the mines were, plus faded versions of any numbers your losing click revealed (e.g. from a bad chord).",
  },
  {
    label: "Mines",
    description:
      "Shows where the mines were, without the numbers from your losing click.",
  },
  {
    label: "No mines",
    description:
      "Hides the mines, so the board looks like it did just before you lost.",
  },
  {
    label: "No highlight",
    description:
      "Like No mines, and also removes the green highlight on the safest squares.",
  },
];
const replayShowHiddenOptions = [
  { label: "None", value: "none" },
  { label: "Mines", value: "mines" },
  { label: "Transparent", value: "transparent3" },
  { label: "Very Transparent", value: "transparent" },
  { label: "Transparent + mines", value: "transparent2" },
  { label: "Dimmed", value: "dimmed" },
];
const replayShowHiddenHelpOptions = [
  { label: "None", description: "Unrevealed squares look normal." },
  { label: "Mines", description: "Shows mines, but numbers stay hidden." },
  {
    label: "Transparent",
    description: "Faint numbers and mines on unrevealed squares.",
  },
  { label: "Very Transparent", description: "Even fainter numbers and mines." },
  {
    label: "Transparent + mines",
    description: "Very faint numbers with clearly visible mines.",
  },
  {
    label: "Dimmed",
    description: "Dimmed numbers and mines on unrevealed squares.",
  },
];

function openHelpDialog(help) {
  selectedHelp.value = help;
  helpDialogOpen.value = true;
}
</script>

<style scoped>
.setting-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
}

.setting-content-grouped {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
}

.setting-key-inputs {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 15px;
  min-width: 0;
}

.setting-help-status {
  flex: 1 1 200px;
}

.setting-help-dialog {
  width: 440px;
  max-width: calc(100vw - 32px);
}
</style>
