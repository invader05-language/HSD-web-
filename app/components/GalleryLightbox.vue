<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref
} from "vue";
import type { GalleryAsset } from "~/data/gallery";
import type { ContentMediaAttachment } from "~/types/content-media";

const props = defineProps<{
  items: readonly GalleryAsset[];
  activeIndex: number;
}>();

const emit = defineEmits<{
  close: [];
  "update:activeIndex": [index: number];
}>();

const dialog = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
let triggerElement: HTMLElement | null = null;

const activeItem = computed(() => props.items[props.activeIndex]);
const canGoPrevious = computed(() => props.activeIndex > 0);
const canGoNext = computed(() => props.activeIndex < props.items.length - 1);
const activeMediaItem = computed<ContentMediaAttachment | undefined>(() => {
  if (!activeItem.value) return undefined;
  return {
    id: activeItem.value.id,
    localBlobId: activeItem.value.localBlobId,
    role: "detail",
    kind: activeItem.value.kind ?? "image",
    title: activeItem.value.title,
    caption: activeItem.value.caption,
    alt: activeItem.value.alt,
    aspect: activeItem.value.aspect,
    sortOrder: activeItem.value.sortOrder ?? props.activeIndex,
    url: activeItem.value.imageUrl,
    thumbnailUrl: activeItem.value.thumbnailUrl,
    status: activeItem.value.status ?? "ready",
    errorMessage: activeItem.value.errorMessage,
  };
});

function showPrevious() {
  if (canGoPrevious.value) emit("update:activeIndex", props.activeIndex - 1);
}

function showNext() {
  if (canGoNext.value) emit("update:activeIndex", props.activeIndex + 1);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPrevious();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    showNext();
  } else if (event.key === "Tab") {
    const focusable = Array.from(
      dialog.value?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? []
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
}

function restorePageState() {
  document.body.classList.remove("is-scroll-locked");
  triggerElement?.focus();
}

onMounted(() => {
  triggerElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.body.classList.add("is-scroll-locked");
  document.addEventListener("keydown", handleKeydown);
  nextTick(() => closeButton.value?.focus());
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
  restorePageState();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="activeItem"
      ref="dialog"
      class="gallery-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="照片浏览"
    >
      <button
        ref="closeButton"
        type="button"
        class="gallery-lightbox__close"
        aria-label="关闭照片浏览"
        @click="$emit('close')"
      >
        关闭 ×
      </button>

      <div class="gallery-lightbox__stage">
        <ContentMediaView v-if="activeMediaItem" :key="activeMediaItem.id" :item="activeMediaItem" controls />
        <div class="gallery-lightbox__caption">
          <p>{{ activeIndex + 1 }} / {{ items.length }}</p>
          <h2>{{ activeItem.title }}</h2>
          <p>{{ activeItem.caption }}</p>
        </div>
      </div>

      <button
        type="button"
        class="gallery-lightbox__previous"
        aria-label="上一张照片"
        :disabled="!canGoPrevious"
        @click="showPrevious"
      >
        ←
      </button>
      <button
        type="button"
        class="gallery-lightbox__next"
        aria-label="下一张照片"
        :disabled="!canGoNext"
        @click="showNext"
      >
        →
      </button>
    </div>
  </Teleport>
</template>
