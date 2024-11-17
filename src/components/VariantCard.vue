<template>
  <div style="width: 500px">
    <q-card bordered>
      <q-card-section horizontal class="variant-card-header">
        <q-card-section style="width: 360px">
          <q-card-section>
            <div class="text-h6">{{ variant.name }}</div>
            <div
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
              style="position: absolute; bottom: -10px; right: -10px"
              @click="showModal = true"
            />
          </q-card-section>
        </q-card-section>

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
      "tags": []
    }
  */
});

import { ref } from "vue";

let showModal = ref(false);

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
</script>
