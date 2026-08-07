<script setup lang="ts">
import { useGalleryStore } from "~/stores/gallery";
import type { GalleryAsset } from "~/data/gallery";
import type { ContentMediaAttachment } from "~/types/content-media";

useHead({ title: "媒体画廊｜白云 HSD 开发者部落" });

const categories = ["全部", "活动摄影", "海报设计", "短视频", "人物专访"] as const;
const galleryStore = useGalleryStore();
if (import.meta.client) galleryStore.hydrate();
const active = ref("全部");
const pageSize = 6;
const currentPage = ref(1);
const filtered = computed(() => active.value === "全部"
  ? galleryStore.getPublicAlbums()
  : galleryStore.getPublicAlbums().filter((album) => album.category === active.value));
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});

function toMediaItem(asset: GalleryAsset): ContentMediaAttachment {
  return {
    id: asset.id,
    localBlobId: asset.localBlobId,
    role: "detail",
    kind: asset.kind ?? "image",
    title: asset.title,
    caption: asset.caption,
    alt: asset.alt,
    aspect: asset.aspect,
    sortOrder: asset.sortOrder ?? 0,
    url: asset.imageUrl,
    thumbnailUrl: asset.thumbnailUrl,
    status: asset.status ?? "ready",
    errorMessage: asset.errorMessage,
  };
}

watch(active, () => {
  currentPage.value = 1;
});

async function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
  await nextTick();
  document.getElementById("gallery-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div>
    <PageBanner
      eyebrow="Media Gallery"
      title="把活动、人物与创作留在画面里"
      description="这里呈现新媒体中心与成员共同完成的摄影、设计、视频和人物内容。正式素材到位后会替换当前素材位。"
      tone="dark"
      media-label="编辑部式作品拼贴素材位"
    />
    <section class="section section--cool">
      <div class="shell">
        <FilterToolbar v-model="active" :filters="categories" :result-label="`共 ${filtered.length} 件作品`" />
        <div v-if="visible.length" id="gallery-results" class="gallery-catalog">
          <NuxtLink
            v-for="(album, index) in visible"
            :key="album.slug"
            :to="album.to"
            class="gallery-album-card"
            :class="{ 'is-featured': index === 0 }"
          >
            <ContentMediaView v-if="album.assets[0]" :item="toMediaItem(album.assets[0])" preview="thumbnail" :controls="false" />
            <span v-else class="gallery-album-card__fallback" aria-hidden="true">&lt; HSD &gt;</span>
            <span class="gallery-album-card__copy">
              <small>{{ album.category }} · {{ album.year }}</small>
              <strong>{{ album.title }}</strong>
              <span>{{ album.summary }}</span>
            </span>
          </NuxtLink>
        </div>
        <EmptyState v-else />
        <PaginationControls
          :model-value="currentPage"
          :page-count="pageCount"
          label="媒体作品分页"
          @update:model-value="goToPage"
        />
      </div>
    </section>
  </div>
</template>
