<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 800px">
      <p class="text-h4">Enable minesweeper.online setting</p>
      <p>
        This page explains how to import finished games from
        <a href="https://minesweeper.online" target="_blank"
          >minesweeper.online</a
        >
        into the <a href="/#/game/zini-explorer">zini explorer</a>.
      </p>

      <p class="text-h5">Instructions (easy)</p>
      <ol>
        <li>
          Visit
          <a href="https://minesweeper.online/settings" target="_blank"
            >minesweeper.online/settings</a
          >
        </li>
        <li>Scroll down to the advanced game stats section</li>
        <li>
          Click the "All stats" button if it is visible <br />
          <q-img
            src="/img/supporting/wom_setting_1.png"
            style="max-width: 400px"
            class="q-ma-sm"
          />
        </li>
        <li>
          Tick the "ZiNi" checkbox <br />
          <q-img
            src="/img/supporting/wom_setting_2.png"
            style="max-width: 400px"
            class="q-ma-sm"
          />
        </li>
        <li>Click the cog icon next to the ZiNi checkbox</li>
        <li>
          Tick the "LL_ZiNi" checkbox <br />
          <q-img
            src="/img/supporting/wom_setting_3.png"
            style="max-width: 400px"
            class="q-ma-sm"
          />
        </li>
        <li>Play a game on any size</li>
        <li>
          After completing any game on minesweeper.online, click the "LL" symbol
          next to the zini stat to send the game to Llamasweeper <br />
          <q-img
            src="/img/supporting/wom_setting_4.png"
            style="max-width: 400px"
            class="q-ma-sm"
          />
        </li>
      </ol>

      <br />

      <p>
        The old method of this was to install a
        <a href="/#/bookmark">bookmarklet</a>. This is no longer recommended as
        the above method is much easier.
      </p>
    </div>
  </q-page>
</template>

<script setup>
defineOptions({
  name: "WomSetting",
});
</script>
