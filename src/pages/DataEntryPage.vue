<template>
  <q-page class="flex flex-center">
    <div class="q-pa-md" style="max-width: 800px">
      <p>Data Entry Page</p>
      <p>Used to help create JSON needed for others page...</p>
      <label
        >name<br /><input type="text" v-model="variantName" size="50" /></label
      ><br />
      <label
        >url<br /><input type="text" v-model="variantUrl" size="50" /></label
      ><br />
      <label
        >desc <br />
        <textarea
          rows="5"
          v-model="variantDesc"
          style="width: 600px"
        ></textarea></label
      ><br />
      <label
        >img url <br /><input
          type="text"
          v-model="variantImage"
          size="50" /></label
      ><br />
      <label
        >tags (comma sep) <br /><input
          type="text"
          v-model="variantTags"
          size="30"
      /></label>
      <span> (use buttons to add tags)</span><br />
      <button @click="addTag">community</button>
      <button @click="addTag">informational</button>
      <button @click="addTag">game</button>
      <button @click="addTag">mobile</button>
      <button @click="addTag">tool</button>
      <hr />
      <button @click="addVariant">Add variant</button>
      <hr />
      <pre>{{ allVariantsJson }}</pre>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref } from "vue";

defineOptions({
  name: "DataEntryPage",
});

let allVariants = ref([]);
let variantName = ref("");
let variantUrl = ref("");
let variantDesc = ref("");
let variantImage = ref("");
let variantTags = ref(""); //comma separated

let allVariantsJson = computed(() => {
  return JSON.stringify(allVariants.value, null, 2);
});

function addTag(event) {
  const elementText = event.target.textContent;

  if (variantTags.value === "") {
    variantTags.value = event.target.textContent;
  } else {
    const tagsArray = variantTags.value.split(",");
    tagsArray.push(elementText);
    variantTags.value = tagsArray.join(",");
  }
}

function addVariant() {
  let newVariant = {
    name: variantName.value,
    url: variantUrl.value,
    desc: variantDesc.value,
    image: variantImage.value,
    tags: variantTags.value.split(","),
  };

  allVariants.value.push(newVariant);

  variantName.value = "";
  variantUrl.value = "";
  variantDesc.value = "";
  variantImage.value = "";
  variantTags.value = "";
}
</script>
