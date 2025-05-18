<template>
  <q-layout view="hhh lpR fFf">
    <q-header elevated class="bg-primary text-white" height-hint="98">
      <q-toolbar>
        <q-toolbar-title>
          <q-avatar>
            <img src="/icons/logo.png" />
          </q-avatar>
          LlamaSweeper (beta)
        </q-toolbar-title>
        <q-toggle
          v-model="isDark"
          @update:model-value="toggleDarkMode"
          color="white"
          label="Dark Mode"
        ></q-toggle>
      </q-toolbar>

      <q-tabs align="left">
        <q-route-tab to="/" label="Home" />
        <q-route-tab :to="{ name: 'play' }" label="Variants" :exact="false" />
        <q-route-tab to="/others" label="External Resources" />
        <q-route-tab to="/about" label="About" />
      </q-tabs>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { useQuasar } from "quasar";
import { useLocalStorage } from "@vueuse/core";
import { ref } from "vue";

const $q = useQuasar();

var isDark = useLocalStorage("ls_darkMode", true);
$q.dark.set(isDark.value);

function toggleDarkMode(value) {
  $q.dark.set(value);
}
</script>
