<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 1100px">
      <p class="text-h4">Other Minesweeper Variants/Resources</p>
      <p>
        Below is a collection of various minesweeper variants and resources that
        I've come across. I've tried to keep this list diverse, so I've excluded
        relatively basic clones that don't add much to the game.
      </p>

      <p style="font-weight: bold; color: red">
        SECRET DEV PAGE: ADD variants with
        <a href="/#/data-entry">data-entry page</a>
      </p>

      <div class="q-my-md flex flex-center">
        <label class="q-px-md"
          >Filter <input v-model="searchTerm" type="text"
        /></label>
        <label class="q-px-md"
          >Tags
          <select v-model="tagTerm">
            <option value="all">all</option>
            <option value="community">community</option>
            <option value="informational">informational</option>
            <option value="game">game</option>
            <option value="mobile">mobile</option>
            <option value="tool">tool</option>
          </select></label
        >
        <label class="q-px-md"
          >Compact View <input v-model="compactView" type="checkbox"
        /></label>
      </div>
      <!--
    <q-card class="my-card" bordered>
      <q-card-section horizontal>
        <q-card-section
          :class="{ 'col-7': !compactView, 'col-10': compactView }"
        >
          <q-card-section>
            <div class="text-h6">Davidnhill Minesweeper Solver</div>
            <div
              style="
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              "
            >
              <a
                class="text-subtitle2 text-grey-6"
                href="https://davidnhill.github.io/JSMinesweeper/index.html"
                >https://davidnhill.github.io/JSMinesweeper/index.html</a
              >
            </div>
            <div class="text-subtitle2">
              <q-badge
                class="q-mr-xs"
                v-for="(tag, index) in ['community', 'tool']"
                :key="index"
                rounded
                :color="getTagColour(tag)"
                :label="tag"
              />
            </div>
            <template v-if="!compactView">
              <br />
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat.
              </p>
            </template>
          </q-card-section>
        </q-card-section>

        <q-img
          :class="{ 'col-5': !compactView, 'col-2': compactView }"
          src="https://cdn.quasar.dev/img/parallax2.jpg"
        />
      </q-card-section>
    </q-card>
    -->
      <div
        v-if="filteredVariants.length === 0"
        class="text-center text-h5 text-grey-7"
      >
        Nothing matched search criteria
      </div>
      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          grid-gap: 1rem;
          justify-items: center;
        "
      >
        <div
          v-for="variant in filteredVariants"
          :key="variant.id"
          style="width: 500px"
        >
          <q-card class="my-card" bordered>
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
                    @click="showVariantDescModal(variant)"
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

          <!--
        <q-card bordered class="my-card">
          <q-card-section>
            <div class="text-h6">
              <a :href="variant.url">{{ variant.name }}</a>
            </div>
            <div class="text-subtitle2">
              <q-badge
                v-for="(tag, index) in variant.tags"
                :key="index"
                rounded
                :color="getTagColour(tag)"
                :label="tag"
              />
            </div>
          </q-card-section>

          <q-separator dark inset />

          <q-card-section class="clearfix">
            <img
              :src="variant.image"
              width="200px"
              style="float: left; aspect-ratio: 1 / 1"
            />
            {{ variant.desc }}
          </q-card-section>
        </q-card>
      -->
        </div>
      </div>
    </div>
  </q-page>

  <q-dialog v-model="variantDescModal">
    <q-card>
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ selectedVariantName }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section> {{ selectedVariantDescription }} </q-card-section>
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
import { computed, ref } from "vue";
import variantList from "src/assets/variant-list.js";

defineOptions({
  name: "OthersPage",
});

let searchTerm = ref("");
let tagTerm = ref("all");
let compactView = ref(false);
let variantDescModal = ref(false);
let selectedVariantName = ref("");
let selectedVariantDescription = ref("");

let variantsCopy = ref(
  structuredClone(
    variantList.map((value, index) => {
      return { ...value, id: index };
    })
  )
);

let filteredVariants = computed(() => {
  return variantsCopy.value.filter((variant) => {
    const lowercaseSearchTerm = searchTerm.value.toLowerCase();

    let searchTermMatches =
      variant.name.toLowerCase().includes(lowercaseSearchTerm) ||
      variant.desc.toLowerCase().includes(lowercaseSearchTerm) ||
      variant.url.toLowerCase().includes(lowercaseSearchTerm);

    let tagTermMatches = false;

    if (tagTerm.value === "all") {
      tagTermMatches = true;
    } else {
      tagTermMatches = variant.tags.some((tag) => tag === tagTerm.value);
    }

    return searchTermMatches && tagTermMatches;
  });
});

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

function showVariantDescModal(variant) {
  variantDescModal.value = true;
  selectedVariantName.value = variant.name;
  selectedVariantDescription.value = variant.desc;
}
</script>
