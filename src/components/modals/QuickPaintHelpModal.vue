<template>
  <q-dialog v-model="quickPaintHelpModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">QuickPaint Help</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          QuickPaint is inspired by the paint feature on minesweeper.online. It
          lets you mark squares to plan out possibly moves. I've intended this
          to be used during minecount situations in efficiency.
        </p>
        <p>
          QuickPaint automatically marks mines (and safes if enabled) that can
          deduced through basic logic. It does not do logic more complex than
          subtraction formula.
        </p>
        <p>
          QuickPaint has different kinds of markings. These can be used how you
          like, however I intended them to be used as follows:
          <br />
          Known Squares: Red = known mine, Green = known safe<br />
          Guess Squares: orange = possible mine, white = possible safe<br />
          Dots: these represent clicks. 1 dot = a click, 2 dots = two clicks
          (e.g. revealing a square then chording).
        </p>
        <p>
          The top bar will update to show counters which from left to right are:
          <br />
          Undiscovered mines | total mines - (flags + reds)<br />
          Undiscovered mines including guessed | total mines - (flags + reds +
          oranges)<br />
          Dot count | How many dots there are. This can be used to work out
          which clicking order uses fewest clicks.
        </p>
        <p>
          There are two modes. Minimal mode (default) lets you place dots with
          left click and guess mines (orange) with right click. Non-minimal mode
          lets you cycle between placing knowns, guesses, dots. Left click will
          place known safe, guess safe, or add a dot. Right click will place
          known mines, guess mine or remove a dot.
        </p>
        <p>
          Markings can be reset by clicking the middle mouse button (scroll
          wheel). It first removes dots and then guesses and then excess known
          squares (if any).
        </p>
        <p>
          Settings for QuickPaint can be adjusted below or from the settings
          beneath the board
        </p>
        <div>
          <q-checkbox
            v-model="quickPaintInitialOnlyMines"
            label="QuickPaint only solves mines"
          /><br />
          <q-checkbox
            v-model="quickPaintMinimalMode"
            label="QuickPaint minimal mode"
          />
          <q-checkbox
            v-model="quickPaintOnlyTrivialLogic"
            label="QuickPaint only use single number logic (e.g. no 1-2 patterns)"
          />
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import {
  quickPaintInitialOnlyMines,
  quickPaintMinimalMode,
  quickPaintOnlyTrivialLogic,
  quickPaintHelpModal,
} from "src/composables/useSettings";

defineOptions({
  name: "QuickPaintHelpModal",
});
</script>
