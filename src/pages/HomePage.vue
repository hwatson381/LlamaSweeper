<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 800px">
      <p class="text-h4">Home</p>
      <p>
        This is a very early release of my website. I have lots planned for it,
        in particular adding new features for the minesweeper variants I am
        making.
      </p>
      <p>
        The variants I'm working on can be played on the
        <a href="/#/play">my minesweeper variants</a> page. I also have a page
        where I have collected and rated a variety of
        <a href="/#/others">minesweeper variants and resources</a> made by
        others.
      </p>
      <p>Some planned features for my variants are listed below</p>
      <ul>
        <li>Locally storing game history</li>
        <li>
          Better replay system (option between steppy replays and showing exact
          mouse path)
        </li>
        <li>Improved zini algorithm (comparable to ptt zini?)</li>
        <li>
          More features in zini explorer (e.g. allowing zini to be ran from a
          starting point and solutions to be edited, maybe some analytics stuff
          such as annotating premiums on the board)
        </li>
        <li>Improved mobile support</li>
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
