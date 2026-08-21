<script setup lang="ts">
import { computed } from "vue";
import type { GalleryAsset } from "~/data/gallery";
import type { ContentMediaAttachment } from "~/types/content-media";

const props = withDefaults(defineProps<{ item: GalleryAsset; featured?: boolean; interactive?: boolean }>(), { interactive: true });
defineEmits<{ open: [] }>();

const mediaItem = computed<ContentMediaAttachment>(() => ({
  id: props.item.id,
  version: props.item.version,
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
  <div
    class="gallery-media-frame"
    :class="[`gallery-media-frame--${item.aspect}`, { 'is-featured': featured }]"
    data-testid="gallery-media"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :aria-label="`查看照片：${item.title}`"
    @click="interactive && $emit('open')"
    @keydown.enter.prevent="interactive && $emit('open')"
    @keydown.space.prevent="interactive && $emit('open')"
  >
    <ContentMediaView :item="mediaItem" preview="thumbnail" :controls="false" />
    <span class="gallery-media-frame__overlay">
      <strong>{{ item.title }}</strong>
      <small>{{ item.caption }}</small>
    </span>
  </div>
</template>
