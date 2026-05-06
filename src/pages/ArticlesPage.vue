<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 800px">
      <p class="text-h4">Articles</p>
      <p>
        I wanted to have somewhere on my website for "content" pages, so that's
        here. I'll probably put a mix of things here. Some guides, some
        ramblings about minesweeper topics I find interesting, maybe some help
        pages. I'm very undecided and only time will tell whether I get around
        to any of that.
      </p>
      <div>
        <q-card
          bordered
          class="q-mb-md article-card"
          v-for="meta in articleList"
          :key="meta.articleId"
        >
          <q-card-section>
            <div class="text-h6">
              <RouterLink
                :to="`/articles/${meta.slug}`"
                class="article-title-link"
                >{{ meta.title }}</RouterLink
              >
            </div>
            <div class="row justify-between text-subtitle2 text-info">
              <div>Author: {{ meta.author }}</div>
              <div>{{ meta.date }}</div>
            </div>
            <div>
              <q-badge
                rounded
                :color="getReadLengthColour(meta.readLength)"
                :label="getReadLengthText(meta.readLength)"
              />
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div v-html="meta.excerptHtml"></div>
          </q-card-section>

          <q-separator />

          <q-card-actions align="right">
            <q-btn flat color="primary" :to="`/articles/${meta.slug}`">
              Read More
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.article-card {
  transition: transform 0.2s ease;
}

.article-card:hover {
  transform: translateY(-2px);
}

.article-title-link {
  color: inherit !important;
  text-decoration: none;
}

.article-title-link:hover {
  text-decoration: underline;
}
</style>

<script setup>
import articleList from "src/assets/article-list";

defineOptions({
  name: "ArticlesPage",
});

function getReadLengthColour(readLength) {
  let colours = ["green", "cyan", "indigo", "deep-orange", "pink"];

  if (readLength < 1 || readLength > 5) {
    throw new Error("Invalid read length: " + readLength);
  }

  return colours[readLength - 1];
}

function getReadLengthText(readLength) {
  let texts = ["Very Short", "Short", "Medium", "Long", "Very Long"];

  if (readLength < 1 || readLength > 5) {
    throw new Error("Invalid read length: " + readLength);
  }

  return texts[readLength - 1];
}
</script>
