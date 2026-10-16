<template>
  <q-btn
    round
    dense
    flat
    color="info"
    icon="help_outline"
    class="setting-help-trigger"
    :aria-label="`Help for ${title}`"
    @click="mode === 'dialog' && $emit('open-dialog', helpContent)"
  >
    <q-menu
      v-if="mode === 'menu'"
      anchor="bottom right"
      self="top right"
      :offset="[0, 8]"
    >
      <q-card bordered class="setting-help-menu">
        <q-card-section class="bg-info text-white q-py-sm">
          <div class="text-subtitle2">{{ title }}</div>
        </q-card-section>
        <q-card-section class="text-body2">
          {{ description }}
          <div v-for="option in options" :key="option.label" class="q-mt-sm">
            <strong>{{ option.label }}:</strong> {{ option.description }}
          </div>
        </q-card-section>
      </q-card>
    </q-menu>
  </q-btn>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  mode: {
    type: String,
    default: "menu",
    validator: (value) => ["menu", "dialog"].includes(value),
  },
  options: {
    type: Array,
    default: () => [],
  },
});

defineEmits(["open-dialog"]);

const helpContent = computed(() => ({
  title: props.title,
  description: props.description,
  options: props.options,
}));
</script>

<style scoped>
.setting-help-trigger {
  flex: 0 0 auto;
  margin-left: auto;
}

.setting-help-menu {
  width: 320px;
  max-width: calc(100vw - 32px);
}
</style>
