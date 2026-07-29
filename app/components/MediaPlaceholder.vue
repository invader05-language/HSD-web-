<script setup lang="ts">
withDefaults(defineProps<{
  label?: string;
  detail?: string;
  dark?: boolean;
}>(), {
  label: "视觉素材位",
  detail: "等待正式授权素材",
  dark: false
});
</script>

<template>
  <div class="media-placeholder" :class="{ 'media-placeholder--dark': dark }" role="img" :aria-label="`${label}，${detail}`">
    <span class="media-placeholder__mark" aria-hidden="true">HSD</span>
    <strong>{{ label }}</strong>
    <small>{{ detail }}</small>
  </div>
</template>

