<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { GalleryAsset } from "~/data/gallery";

const props = defineProps<{ item: GalleryAsset; featured?: boolean }>();
defineEmits<{ open: [] }>();

const imageFailed = ref(false);
const showImage = computed(() => Boolean(props.item.imageUrl) && !imageFailed.value);

watch(
  () => [props.item.id, props.item.imageUrl],
  () => {
    imageFailed.value = false;
  }
);
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
    <img
      v-if="showImage"
      :src="item.imageUrl"
      :alt="item.alt"
      loading="lazy"
      @error="imageFailed = true"
    >
    <span v-else class="gallery-media-frame__fallback" aria-hidden="true">&lt; HSD &gt;</span>
    <span class="gallery-media-frame__overlay">
      <strong>{{ item.title }}</strong>
      <small>{{ item.caption }}</small>
    </span>
  </button>
</template>
