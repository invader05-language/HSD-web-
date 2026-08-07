<script setup lang="ts">
import { computed } from "vue";
import type { GalleryAsset } from "~/data/gallery";
import type { ContentMediaAttachment } from "~/types/content-media";

const props = defineProps<{ item: GalleryAsset; featured?: boolean }>();
defineEmits<{ open: [] }>();

const mediaItem = computed<ContentMediaAttachment>(() => ({
  id: props.item.id,
  localBlobId: props.item.localBlobId,
  role: "detail",
  kind: props.item.kind ?? "image",
  title: props.item.title,
  caption: props.item.caption,
  alt: props.item.alt,
  aspect: props.item.aspect,
  sortOrder: props.item.sortOrder ?? 0,
  url: props.item.imageUrl,
  thumbnailUrl: props.item.thumbnailUrl,
  status: props.item.status ?? "ready",
  errorMessage: props.item.errorMessage,
}));

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
    <ContentMediaView :item="mediaItem" preview="thumbnail" :controls="false" />
    <span class="gallery-media-frame__overlay">
      <strong>{{ item.title }}</strong>
      <small>{{ item.caption }}</small>
    </span>
  </button>
</template>
