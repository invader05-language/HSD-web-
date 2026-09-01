<script setup lang="ts">
import { computed } from "vue";
import { resolvePortalAssetMetadata, resolvePortalAssetSource } from "~/data/portal-assets";
import type { PortalVisualConfig } from "~/types/portal-config";
import type { ContentMediaAttachment } from "~/types/content-media";

const props = withDefaults(defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  tone?: "dark" | "warm" | "red";
  mediaLabel?: string;
  visual?: PortalVisualConfig;
  media?: ContentMediaAttachment;
  mediaFit?: "cover" | "contain";
  mediaPreview?: "full" | "thumbnail";
}>(), {
  tone: "dark",
  mediaFit: "cover",
  mediaPreview: "thumbnail",
  mediaLabel: "页面主题视觉素材位"
});

const visualLabel = computed(() => props.visual?.alt || props.mediaLabel);
const visualDetail = computed(() => props.visual?.supportingText || (props.visual?.assetId ? "已发布门户主视觉" : "等待正式授权素材"));
const visualMetadata = computed(() => resolvePortalAssetMetadata(props.visual?.assetId));
const visualSource = computed(() => visualMetadata.value?.src || resolvePortalAssetSource(props.visual?.assetId));

useHead(() => {
  const metadata = visualMetadata.value;
  if (!metadata || props.media || props.visual?.media) return {};
  return {
    link: [{
      rel: "preload",
      as: "image",
      href: metadata.src,
      imagesrcset: metadata.srcSet,
      imagesizes: metadata.sizes,
      fetchpriority: "high",
    }],
  };
});
</script>

<template>
  <section class="page-banner" :class="`page-banner--${tone}`">
    <div class="page-banner__inner shell">
      <div class="page-banner__copy">
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
        <div v-if="$slots.actions" class="page-banner__actions">
          <slot name="actions" />
        </div>
      </div>
      <ContentMediaView v-if="media" :item="media" :preview="mediaPreview" :fit="mediaFit" :controls="false" role="hero" class="page-banner__media" />
      <ContentMediaView v-else-if="visual?.media" :item="visual.media" :preview="mediaPreview" :fit="mediaFit" :controls="false" role="hero" class="page-banner__media" />
      <MediaPlaceholder
        v-else
        :label="visualLabel"
        :detail="visualDetail"
        :src="visualSource"
        :src-set="visualMetadata?.srcSet"
        :sizes="visualMetadata?.sizes"
        :width="visualMetadata?.width"
        :height="visualMetadata?.height"
        :loading="visualMetadata ? 'eager' : 'lazy'"
        :fetch-priority="visualMetadata ? 'high' : 'auto'"
        :object-position="visual?.objectPosition"
        :fallback-src="visualMetadata?.fallbackSrc"
        :alt="visual?.alt"
        :data-asset-id="visual?.assetId"
        :dark="tone === 'dark' || tone === 'red'"
      />
    </div>
  </section>
</template>
