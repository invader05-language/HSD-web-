<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  tone?: "dark" | "warm" | "red";
  mediaLabel?: string;
}>(), {
  tone: "dark",
  mediaLabel: "页面主题视觉素材位"
});
</script>

<template>
  <section class="page-banner" :class="`page-banner--${tone}`">
    <div class="page-banner__inner shell">
      <div class="page-banner__copy">
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
        <div v-if="$slots.actions" class="page-banner__actions">
          <slot name="actions" />
        </div>
      </div>
      <MediaPlaceholder :label="mediaLabel" :dark="tone === 'dark' || tone === 'red'" />
    </div>
  </section>
</template>

