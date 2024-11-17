<template>
  <div style="width: 500px">
    <q-card bordered>
      <q-card-section horizontal class="variant-card-header">
        <div style="width: 360px; padding: 5px">
          <q-card-section>
            <div class="text-h6">{{ variant.name }}</div>
            <div
              class="text-grey-6"
              style="
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              "
            >
              <a class="text-subtitle2 text-grey-6" :href="variant.url">{{
                variant.url
              }}</a>
            </div>
            <div class="flex justify-between">
              <div style="flex: 1 1 0">
                <q-rating
                  :model-value="variant.rating"
                  max="5"
                  size="1.2em"
                  :color="$q.dark.isActive ? 'yellow' : 'yellow-10'"
                  icon="star_border"
                  icon-selected="star"
                  icon-half="star_half"
                  no-dimming
                  readonly
                />
                <span class="variant-rating-number">
                  ({{
                    variant.rating === 0
                      ? "unrated"
                      : variant.rating.toFixed(1)
                  }})</span
                >
              </div>
              <div style="flex: 1 1 0">
                <q-badge class="awareness-badge" outline
                  >Knownness:
                  {{ getPopularityWording(variant.popularity) }}</q-badge
                >
              </div>
            </div>
            <div class="text-subtitle2">
              <q-badge
                class="q-mr-xs"
                v-for="(tag, index) in variant.tags"
                :key="index"
                rounded
                :color="getTagColour(tag)"
                :label="tag"
              />
            </div>
            <q-btn
              v-if="compactView"
              color="secondary"
              label="Details"
              size="xs"
              style="position: absolute; bottom: 0; right: 0"
              @click="showModal = true"
            />
          </q-card-section>
        </div>

        <q-img width="140px" height="140px" :src="variant.image" />
      </q-card-section>
      <q-card-section v-if="!compactView">
        <p>
          {{ variant.desc }}
        </p>
      </q-card-section>
    </q-card>
  </div>

  <q-dialog v-model="showModal">
    <q-card>
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ variant.name }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section> {{ variant.desc }} </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.variant-card-header {
  background-color: #e7f4ff;
}

body.body--dark .variant-card-header {
  background-color: #161824;
}

.variant-rating-number {
  color: #616161;
}

body.body--dark .variant-rating-number {
  color: #eeeeee;
}

.awareness-badge {
  color: black;
}

body.body--dark .awareness-badge {
  color: white;
}
</style>

<script setup>
defineOptions({
  name: "VariantCard",
});

const props = defineProps({
  compactView: {
    type: Boolean,
    required: true,
  },

  variant: {
    type: Object,
    required: true,
  },
  /*
    Variant has form 
    {
      "name": "",
      "url": "",
      "desc": "",
      "image": "",
      "tags": [],
      "rating": 5,
      "popularity": 5
    }
  */
});

import { ref } from "vue";
import { useQuasar } from "quasar";

let showModal = ref(false);
const $q = useQuasar();

//Needs memoisation?
function getTagColour(tag) {
  const colours = {
    community: "blue",
    informational: "green",
    game: "brown",
    mobile: "black",
    tool: "pink",
  };

  return colours[tag] ?? "red";
}

function getPopularityWording(popularity) {
  const wording = ["Very Low", "Low", "Medium", "High", "Very High"];

  return wording[popularity - 1];
}
</script>
