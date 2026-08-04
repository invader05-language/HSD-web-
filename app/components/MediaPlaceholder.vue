<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(defineProps<{
  label?: string;
  detail?: string;
  dark?: boolean;
  src?: string;
  alt?: string;
}>(), {
  label: "视觉素材位",
  detail: "等待正式授权素材",
  dark: false,
  src: undefined,
  alt: ""
});

const imageFailed = ref(false);
const showImage = computed(() => Boolean(props.src) && !imageFailed.value);

watch(() => props.src, () => {
  imageFailed.value = false;
});
</script>

<template>
  <div
    class="media-placeholder"
    :class="{ 'media-placeholder--dark': dark, 'media-placeholder--image': showImage }"
    :role="showImage ? undefined : 'img'"
    :aria-label="showImage ? undefined : `${label}，${detail}`"
  >
    <img v-if="showImage" class="media-placeholder__image" :src="src" :alt="alt || label" @error="imageFailed = true">
    <template v-else>
      <span class="media-placeholder__mark" aria-hidden="true">HSD</span>
      <strong>{{ label }}</strong>
      <small>{{ detail }}</small>
    </template>
  </div>
</template>
