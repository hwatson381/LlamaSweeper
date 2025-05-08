<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 1100px">
      <p class="text-h4">External Minesweeper Variants/Resources</p>
      <p>
        Below is a collection of various minesweeper variants and resources that
        I've come across. I've tried to keep this list diverse, so I've excluded
        relatively basic clones that don't add much to the game. Ratings are
        based on my personal preference, don't take too seriously.
      </p>

      <p v-if="devMode" style="font-weight: bold; color: red">
        SECRET DEV PAGE: ADD variants with
        <a href="/#/data-entry">data-entry page</a>
      </p>

      <div class="q-my-md flex flex-center">
        <q-input
          class="q-mx-md q-mb-md"
          debounce="100"
          v-model="searchTerm"
          label="Filter"
          dense
        />
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="tagTerm"
          style="min-width: 175px"
          :options="[
            'all',
            'community',
            'informational',
            'game',
            'mobile',
            'tool',
          ]"
          stack-label
          label="Tags"
        ></q-select>
        <q-select
          class="q-mx-md q-mb-md"
          outlined
          options-dense
          dense
          transition-duration="100"
          input-debounce="0"
          v-model="sortBy"
          style="min-width: 175px"
          :options="['highest rated', 'most well known', 'least well known']"
          stack-label
          label="Sort by"
        ></q-select>
        <q-checkbox
          class="q-mx-md q-mb-md"
          left-label
          dense
          v-model="compactView"
          label="Compact View"
        />
      </div>
      <div
        v-if="filteredVariants.length === 0"
        class="text-center text-h5 text-grey-7"
      >
        Nothing matched search criteria
      </div>
      <div class="variants-grid">
        <VariantCard
          v-for="variant in filteredVariants"
          :key="variant.id"
          :compact-view="compactView"
          :variant="variant"
        />
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.variants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  grid-gap: 1rem;
  justify-items: center;
}

@media only screen and (max-width: 520px) {
  .variants-grid {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  }
}

@media only screen and (max-width: 420px) {
  .variants-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }
}
</style>

<script setup>
import { computed, ref } from "vue";
import variantList from "src/assets/variant-list.js";
import VariantCard from "src/components/VariantCard.vue";

defineOptions({
  name: "OthersPage",
});

let searchTerm = ref("");
let tagTerm = ref("all");
let sortBy = ref("highest rated");
let compactView = ref(false);

let variantsCopy = ref(
  structuredClone(
    variantList.map((value, index) => {
      return { ...value, id: index };
    })
  )
);

//Sort and filter based on criteria
let filteredVariants = computed(() => {
  return variantsCopy.value
    .filter((variant) => {
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
    })
    .sort((a, b) => {
      switch (sortBy.value) {
        //'Highest rated', 'Most well known', 'Least well known'
        case "highest rated":
          return b.rating - a.rating;
        case "most well known":
          return b.popularity - a.popularity;
        case "least well known":
          return a.popularity - b.popularity;
        default:
          return 0;
      }
    });
});

let devMode = localStorage.getItem("devMode") === "1" ? true : false;
</script>
