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
      <p class="text-h3">{{ meta.title }}</p>
      <q-item dense>
        <q-item-section avatar>
          <q-avatar>
            <img :src="`/img/articles/authors/${meta.author}.png`" />
          </q-avatar>
        </q-item-section>
        <q-item-section>{{ meta.author }}</q-item-section>
        <q-item-section side
          ><span class="text-info">{{ meta.date }}</span></q-item-section
        >
      </q-item>
      <q-separator class="q-my-md" />
      <RouterView />
    </div>
  </q-page>
</template>

<script setup>
import { useRoute } from "vue-router";
import articleList from "src/assets/article-list.js";

const route = useRoute();
const meta = articleList.find((a) => a.slug === route.path.split("/").pop());

defineOptions({
  name: "ArticleLayout",
});
</script>
