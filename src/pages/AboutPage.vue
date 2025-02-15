<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md" style="max-width: 800px">
      <p class="text-h4">About</p>
      <p>
        Hey, this website was made by me, Llama. I'm not really sure whether
        this page should be about me or about the website, so I've went for
        both.
      </p>
      <div>
        <div>
          <q-card>
            <q-tabs
              v-model="tab"
              dense
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="justify"
              narrow-indicator
            >
              <q-tab name="me" label="About Me" />
              <q-tab name="website" label="About Website" />
            </q-tabs>

            <q-separator />

            <q-tab-panels v-model="tab" animated>
              <q-tab-panel name="me">
                <div class="text-h6">About me</div>
                <p>
                  I'm Llama, a minesweeper player from the UK. I first started
                  playing minesweeper seriously on Saturday 2nd February 2019 at
                  4.15am. Or at least that's when I discovered
                  <a href="https://minesweeper.online">Minesweeper Online</a>
                  (excluding some random
                  <a href="https://minesweeper.online/game/91043113">game</a>
                  that I have absolutely no memory of back in July 2018...).
                  Before then I sometimes casually played on the
                  <a href="https://minesweeperonline.com">other</a> "Minesweeper
                  Online" and going back even further I played on Windows 7. My
                  Minesweeper Online username is
                  <a href="https://minesweeper.online/player/733893">llama</a>.
                </p>
                <p>
                  As well as playing on Minesweeper Online, I've also played a
                  lot on the Minesweeper Go mobile app where I like to play no
                  flag, and I play using two hands at the same time (usually
                  both index fingers, or both thumbs). I've probably played more
                  on mobile than I have on PC. I have sub 40s expert on
                  Minesweeper Go without flags, putting me 2nd behind JZE
                  (although others are better on different apps). I also like to
                  play no flag efficiency - I was the first person in the world
                  to get
                  <a href="https://minesweeper.online/game/801705135">
                    100% on expert</a
                  >, and also the first (currently only) to get
                  <a href="https://minesweeper.online/game/3439056000"
                    >100% on evil</a
                  >. In regular efficiency, I recently got the world record in
                  <a href="https://minesweeper.online/game/4116811644">
                    beginner</a
                  >. This is probably the luckiest thing that has happened to me
                  and will ever happen to me.
                </p>
                <p>
                  Outside of minesweeper, I play Team Fortress 2 too much and I
                  have a youtube channel called
                  <a href="https://www.youtube.com/@TF2Llama">TF2Llama</a> which
                  has nothing to do with TF2. I accidentally went viral on it a
                  few years ago with a
                  <a href="https://www.youtube.com/watch?v=cgb8ylQ6WQY"
                    >video</a
                  >
                  of a TAS I made for Google Snake. So, I now infrequently post
                  videos of Google Snake on there (mods/tases that I make).
                  There are also some old videos about minesweeper and random
                  coding projects. As of writing, the channel has 27k subs and
                  20 million views, which I'm pretty proud of :).
                </p>
              </q-tab-panel>

              <q-tab-panel name="website">
                <div class="text-h6">About website</div>
                <p>
                  I was procrastinating something else one day and decided to
                  make this website. I think the space of minesweeper variants
                  is very underexplored, and I have a big notes file on my phone
                  with like 100+ different ideas for minesweeper variants. I
                  have no idea if I'll be able to get around to making many of
                  these, but I guess we'll see.
                </p>
                <p>
                  When I say minesweeper variants in the previous paragraph,
                  this is quite broad, so I don't just mean things where the
                  rules of minesweeper are changed. I'm also including tools for
                  training minesweeper or skills related to it. I believe in
                  deliberate practise, and so I have this belief that the way to
                  get faster at minesweeper isn't just to play expert loads, but
                  rather to separately train different skills related to
                  minesweeper. In my case, I feel like I benefitted from playing
                  minesweeper on both mobile and PC, as they each train
                  different skills.
                </p>
                <p>
                  From a boring technical side of things, I work in IT and
                  always wanted an excuse to make a website for myself, so this
                  is that. I'm also using this as an excuse to get better with
                  the vue javascript framework. I first came across this as it
                  is used in some projects by qqwref (<a
                    href="https://qqwref.github.io/schulte/"
                    >schulte table</a
                  >
                  and <a href="https://qqwref.github.io/minetgm/">minetgm</a>).
                  I later learnt the basics of vue to help with the
                  <a href="https://github.com/eee555/saolei_website"
                    >metasweeper website</a
                  >
                  which I migrated from webpack to vite and then did nothing
                  else with.
                </p>
                <p>
                  I also run a different website in collaboration with some
                  others for playing
                  <a href="https://googlesnakemods.com/">modded google snake</a
                  >.
                </p>
              </q-tab-panel>
            </q-tab-panels>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from "vue";
defineOptions({
  name: "AboutPage",
});

var tab = ref("me");
</script>
