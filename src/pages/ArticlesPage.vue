<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 800px">
      <p class="text-h4">Articles</p>
      <p>
        I wanted to have somewhere my website for "content" pages, so that's
        here. I'll probably put a mix of things here. Some guides, some
        ramblings about minesweeper topics I find interesting, maybe some help
        pages. I'm very undecided and only time will tell whether I get around
        to any of that.
      </p>
      <div>
        <q-card bordered class="q-mb-md">
          <q-card-section>
            <div class="text-h6">A blog about examples</div>
            <div class="text-subtitle2">Author: Llama | Date: 2024-06-12</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            In this article, I will talk about examples. Examples are very
            important. Some people say that examples are the best way to learn,
            and I would have to agree with them. If you want to learn something
            new, it's often very helpful to see an example of it. Not only are
            examples good, they can also be a way to learn.
          </q-card-section>

          <q-separator />

          <q-card-actions>
            <q-btn flat color="primary" to="/articles/example-article">
              Read More
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
defineOptions({
  name: "ArticlesPage",
});
</script>
