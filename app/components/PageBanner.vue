<script setup lang="ts">
import { computed } from "vue";
import { resolvePortalAssetSource } from "~/data/admin-assets";
import type { PortalVisualConfig } from "~/types/portal-config";

const props = withDefaults(defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  tone?: "dark" | "warm" | "red";
  mediaLabel?: string;
  visual?: PortalVisualConfig;
}>(), {
  tone: "dark",
  mediaLabel: "页面主题视觉素材位"
});

const visualLabel = computed(() => props.visual?.alt || props.mediaLabel);
const visualDetail = computed(() => props.visual?.supportingText || (props.visual?.assetId ? "已发布门户主视觉" : "等待正式授权素材"));
const visualSource = computed(() => resolvePortalAssetSource(props.visual?.assetId));
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
      <MediaPlaceholder :label="visualLabel" :detail="visualDetail" :src="visualSource" :alt="visual?.alt" :data-asset-id="visual?.assetId" :dark="tone === 'dark' || tone === 'red'" />
    </div>
  </section>
</template>
