<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 800px">
      <q-btn
        flat
        color="primary"
        to="/articles"
        class="q-mb-md"
        icon="arrow_back"
      >
        Back to articles list
      </q-btn>
      <p class="text-h4">Example article title</p>
      <p class="text-subtitle2">Author: Llama | Date: 2024-06-12</p>
      <p>
        This is an example article. Make sure to change all the placeholder
        stuff.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque,
        voluptatem voluptates, tenetur quibusdam veniam nesciunt eos
        consequuntur repellat inventore ipsa impedit laboriosam dolorum eum
        repellendus deleniti voluptas iure, sit suscipit.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque,
        voluptatem voluptates, tenetur quibusdam veniam nesciunt eos
        consequuntur repellat inventore ipsa impedit laboriosam dolorum eum
        repellendus deleniti voluptas iure, sit suscipit.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque,
        voluptatem voluptates, tenetur quibusdam veniam nesciunt eos
        consequuntur repellat inventore ipsa impedit laboriosam dolorum eum
        repellendus deleniti voluptas iure, sit suscipit.
      </p>
    </div>
  </q-page>
</template>

<script setup>
defineOptions({
  name: "ExampleArticle",
});
</script>
