<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(defineProps<{
  label?: string;
  detail?: string;
  dark?: boolean;
  src?: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  objectPosition?: string;
  fallbackSrc?: string;
  alt?: string;
}>(), {
  label: "视觉素材位",
  detail: "等待正式授权素材",
  dark: false,
  src: undefined,
  srcSet: undefined,
  sizes: undefined,
  width: undefined,
  height: undefined,
  loading: "lazy",
  fetchPriority: "auto",
  objectPosition: undefined,
  fallbackSrc: undefined,
  alt: ""
});

const imageFailed = ref(false);
const activeSource = ref(props.src);
const usingFallback = ref(false);
const showImage = computed(() => Boolean(activeSource.value) && !imageFailed.value);
const activeSrcSet = computed(() => usingFallback.value ? undefined : props.srcSet);

function handleImageError() {
  if (props.fallbackSrc && !usingFallback.value && activeSource.value !== props.fallbackSrc) {
    usingFallback.value = true;
    activeSource.value = props.fallbackSrc;
    return;
  }

  imageFailed.value = true;
}

watch(() => [props.src, props.fallbackSrc, props.srcSet], () => {
  imageFailed.value = false;
  usingFallback.value = false;
  activeSource.value = props.src;
});
</script>

<template>
  <div
    class="media-placeholder"
    :class="{ 'media-placeholder--dark': dark, 'media-placeholder--image': showImage }"
    :role="showImage ? undefined : 'img'"
    :aria-label="showImage ? undefined : `${label}，${detail}`"
  >
    <img
      v-if="showImage"
      class="media-placeholder__image"
      :src="activeSource"
      :srcset="activeSrcSet"
      :sizes="sizes"
      :width="width"
      :height="height"
      :loading="loading"
      :fetchpriority="fetchPriority"
      :style="objectPosition ? { objectPosition } : undefined"
      :alt="alt || label"
      @error="handleImageError"
    >
    <template v-else>
      <span class="media-placeholder__mark" aria-hidden="true">HSD</span>
      <strong>{{ label }}</strong>
      <small>{{ detail }}</small>
    </template>
  </div>
</template>
