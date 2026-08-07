<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ContentMediaAttachment } from "../types/content-media";
import { useContentMediaUpload } from "../composables/useContentMediaUpload";
import { resolvePortalAssetSource } from "../data/portal-assets";

const props = withDefaults(defineProps<{
  item: ContentMediaAttachment;
  preview?: "full" | "thumbnail";
  controls?: boolean;
}>(), {
  preview: "full",
  controls: true,
});

const source = ref<string | undefined>(props.item.url);
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
  if (props.item.url) {
    source.value = props.item.url;
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

watch(() => [props.item.id, props.item.url, props.item.localBlobId], () => { void loadSource(); });
onMounted(() => { void loadSource(); });
onBeforeUnmount(releaseSource);
</script>

<template>
  <span class="content-media-view" :class="[`content-media-view--${item.kind}`, `content-media-view--${preview}`]" data-testid="content-media-view">
    <img v-if="item.kind === 'image' && source && !hasError" :src="source" :alt="item.alt" loading="lazy" @error="handleMediaError">
    <video v-else-if="item.kind === 'video' && source && !hasError" :src="source" :controls="controls" :muted="preview === 'thumbnail'" preload="metadata" :aria-label="item.alt" @error="handleMediaError"></video>
    <span v-else class="content-media-view__fallback" aria-hidden="true">&lt; HSD &gt;</span>
  </span>
</template>
