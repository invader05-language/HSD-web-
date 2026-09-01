<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ContentMediaAttachment } from "../types/content-media";
import { useContentMediaUpload } from "../composables/useContentMediaUpload";
import { resolvePortalAssetSource } from "../data/portal-assets";
import { resolveApiMediaUrl } from "../utils/media-url";

const props = withDefaults(defineProps<{
  item: ContentMediaAttachment;
  preview?: "full" | "thumbnail";
  fit?: "cover" | "contain";
  controls?: boolean;
}>(), {
  preview: "full",
  fit: "cover",
  controls: true,
});

const runtimeConfig = useRuntimeConfig() as { public?: { apiBase?: string } };
const apiBase = runtimeConfig.public?.apiBase;
const source = ref<string | undefined>(resolveApiMediaUrl(props.preview === "thumbnail" && props.item.kind === "image" ? (props.item.thumbnailUrl ?? props.item.url) : props.item.url, apiBase));
const poster = computed(() => props.item.kind === "video" ? resolveApiMediaUrl(props.item.thumbnailUrl, apiBase) : undefined);
const hasError = ref(false);
let ownsSource = false;
const { resolvePreviewUrl } = useContentMediaUpload();

function releaseSource() {
  if (ownsSource && source.value) URL.revokeObjectURL(source.value);
  ownsSource = false;
  source.value = undefined;
}

async function loadSource() {
  releaseSource();
  hasError.value = false;
  const mediaUrl = props.preview === "thumbnail" && props.item.kind === "image" ? (props.item.thumbnailUrl ?? props.item.url) : props.item.url;
  if (mediaUrl) {
    source.value = resolveApiMediaUrl(mediaUrl, apiBase);
    return;
  }
  const legacySource = resolvePortalAssetSource(props.item.legacyAssetId);
  if (legacySource) {
    source.value = legacySource;
    return;
  }
  const resolved = await resolvePreviewUrl(props.item);
  if (resolved.url) {
    source.value = resolved.url;
    ownsSource = resolved.owned;
  }
}

function handleMediaError() {
  hasError.value = true;
  releaseSource();
}

watch(() => [props.item.id, props.item.url, props.item.thumbnailUrl, props.item.localBlobId, props.preview], () => { void loadSource(); });
onMounted(() => { void loadSource(); });
onBeforeUnmount(releaseSource);
</script>

<template>
  <span class="content-media-view" :class="[
    `content-media-view--${item.kind}`,
    `content-media-view--${preview}`,
    `content-media-view--${fit}`,
    `content-media-view--aspect-${item.aspect}`,
  ]" data-testid="content-media-view">
    <img v-if="item.kind === 'image' && source && !hasError" :src="source" :alt="item.alt ?? ''" loading="lazy" @error="handleMediaError">
    <video v-else-if="item.kind === 'video' && source && !hasError" :src="source" :poster="poster" :controls="controls" :muted="preview === 'thumbnail'" preload="metadata" :aria-label="item.alt ?? item.title" @error="handleMediaError"></video>
    <span v-else class="content-media-view__fallback" aria-hidden="true">&lt; HSD &gt;</span>
  </span>
</template>
