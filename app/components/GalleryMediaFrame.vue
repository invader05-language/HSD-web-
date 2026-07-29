<script setup lang="ts">
import type { GalleryAsset } from "~/data/gallery";

defineProps<{ item: GalleryAsset; featured?: boolean }>();
defineEmits<{ open: [] }>();
</script>

<template>
  <button
    type="button"
    class="gallery-media-frame"
    :class="[`gallery-media-frame--${item.aspect}`, { 'is-featured': featured }]"
    data-testid="gallery-media"
    :aria-label="`查看照片：${item.title}`"
    @click="$emit('open')"
  >
    <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.alt" loading="lazy">
    <span v-else class="gallery-media-frame__fallback" aria-hidden="true">&lt; HSD &gt;</span>
    <span class="gallery-media-frame__overlay">
      <strong>{{ item.title }}</strong>
      <small>{{ item.caption }}</small>
    </span>
  </button>
</template>
