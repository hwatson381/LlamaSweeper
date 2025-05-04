<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 800px">
      <p class="text-h4">Home</p>
      <p>
        This is an early release of my minesweeper website. It has a lot of
        features that don't exist anywhere else. There is a fully featured
        minesweeper clone, as well as variants/tools targetted at helping people
        improve in areas such as pattern recognition and efficiency. I've tried
        to make it perform well on mobile as well as desktop. More features will
        be added in the future.
      </p>
      <p>
        There site also has a cutting-edge ZiNi calculator which outperforms all
        other tools at finding the minimum number of clicks needed to solve a
        board.
      </p>
      <p>
        The variants/tools I've made can be accessed on the
        <a href="/#/play">my variants</a> page. I also have a page where I have
        collected and rated a variety of
        <a href="/#/others">minesweeper variants and resources</a> made by
        others.
      </p>
      <p>Some planned features for my variants are listed below:</p>
      <ul>
        <li>Locally storing game history</li>
        <li>Improve mobile support</li>
        <li>Various bug fixes (better performance on large boards)</li>
        <li>
          More variants (lots of ideas here, not sure how many I will get around
          to doing)
        </li>
      </ul>
    </div>
  </q-page>
</template>

<script setup>
defineOptions({
  name: "HomePage",
});
</script>
