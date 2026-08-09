<template>
  <q-dialog v-model="filtersModal">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Visual Filters</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          Visual filters are effects that can make the board either easier to
          read (e.g. boosting contrast) or harder to read (e.g. adding blur).
          They can also be used to adjust the board display to your comfort
          (e.g. reducing brightness if playing at night). Please note that
          having lots of filters active may affect performance. Preview for blur
          filter may be inaccurate as it doesn't take into account Tile Size.
        </p>
        <div class="row justify-around q-my-md" style="gap: 10px">
          <img
            src="/img/supporting/filter_preview_light.png"
            loading="lazy"
            :style="{ filter: filterStyleProperty }"
            class="q-mx-sm"
          />
          <img
            src="/img/supporting/filter_preview_dark.png"
            loading="lazy"
            :style="{ filter: filterStyleProperty }"
            class="q-mx-sm"
          />
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterBlur"
            label="Enable Blur"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterBlur"
              v-model.number="filterBlurValue"
              label="Blurriness (pixels)"
              type="number"
              dense
              min="0"
              max="1000"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterBrightness"
            label="Enable Brightness"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterBrightness"
              v-model.number="filterBrightnessValue"
              label="Brightness (< 1 is darker | > 1 is lighter)"
              type="number"
              dense
              min="0"
              max="1000"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterContrast"
            label="Enable Contrast"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterContrast"
              v-model.number="filterContrastValue"
              label="Contrast (< 1 is less | > 1 is more)"
              type="number"
              dense
              min="0"
              max="1000"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterGrayscale"
            label="Enable Grayscale"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterGrayscale"
              v-model.number="filterGrayscaleValue"
              label="Grayscale (0 is normal | 1 is full)"
              type="number"
              dense
              min="0"
              max="1"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterHueRotate"
            label="Enable Hue Rotate"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterHueRotate"
              v-model.number="filterHueRotateValue"
              label="Hue Rotate (degrees)"
              type="number"
              dense
              min="0"
              max="360"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterInvert"
            label="Enable Invert"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterInvert"
              v-model.number="filterInvertValue"
              label="Invert (0 is normal | 1 is inverted)"
              type="number"
              dense
              min="0"
              max="1"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
        <div class="row items-center">
          <q-checkbox
            v-model="enableFilterSaturate"
            label="Enable Saturate"
            class="col-5"
            style="min-width: 160px"
          />
          <div class="col-7">
            <q-input
              v-if="enableFilterSaturate"
              v-model.number="filterSaturateValue"
              label="Saturation (< 1 is less | > 1 is more)"
              type="number"
              dense
              min="0"
              max="10"
              step="0.1"
              style="width: 200px"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn
          flat
          label="Close"
          @click="
            filtersModal = false;
            settingsModal = true;
          "
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import {
  settingsModal,
  filtersModal,
  enableFilterBlur,
  enableFilterBrightness,
  enableFilterContrast,
  enableFilterGrayscale,
  enableFilterHueRotate,
  enableFilterInvert,
  enableFilterSaturate,
  filterBlurValue,
  filterBrightnessValue,
  filterContrastValue,
  filterGrayscaleValue,
  filterHueRotateValue,
  filterInvertValue,
  filterSaturateValue,
  filterStyleProperty,
} from "src/composables/useSettings";

defineOptions({
  name: "FiltersModal",
});
</script>
