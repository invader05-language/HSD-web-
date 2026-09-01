<script setup lang="ts">
import { useGalleryStore } from "~/stores/gallery";
import { useContentGateway } from "~/composables/useContentGateway";
import type { GalleryAsset } from "~/data/gallery";
import type { PublishedGalleryAlbum } from "~/types/gallery";
import type { ContentMediaAttachment } from "~/types/content-media";
import { galleryCategoryLabel, normalizeGalleryCategory } from "~/types/gallery";
import { PAGE_VISUALS } from "~/data/page-visuals";

useHead({ title: "媒体画廊｜白云 HSD 开发者部落" });

const categories = ["全部", "活动纪实", "视觉创作", "视频作品", "人物风采"] as const;
const galleryStore = useGalleryStore();
const gateway = useContentGateway();
if (gateway) galleryStore.activateApiMode(false);
if (import.meta.client && !gateway) galleryStore.hydrate();
const active = ref("全部");
const pageSize = 6;
const currentPage = ref(1);
const apiItems = ref<PublishedGalleryAlbum[]>([]);
const apiTotal = ref(0);
const filtered = computed(() => !gateway && active.value === "全部"
  ? galleryStore.getPublicAlbums()
  : !gateway ? galleryStore.getPublicAlbums().filter((album) => galleryCategoryLabel(album.category) === active.value) : apiItems.value);
const pageCount = computed(() => Math.max(1, Math.ceil((gateway ? apiTotal.value : filtered.value.length) / pageSize)));
const visible = computed(() => {
  if (gateway) return filtered.value;
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
    aspect: asset.aspect,
    sortOrder: asset.sortOrder ?? 0,
    url: asset.imageUrl,
    thumbnailUrl: asset.thumbnailUrl,
    status: asset.status ?? "ready",
    errorMessage: asset.errorMessage,
  };
}

function serverCategory() {
  return active.value === "全部" ? undefined : normalizeGalleryCategory({ "活动纪实": "event_documentary", "视觉创作": "visual_creation", "视频作品": "video_work", "人物风采": "people_stories" }[active.value] ?? "event_documentary");
}
async function loadPage() {
  if (!gateway) return;
  await galleryStore.refreshPublicFromApi(gateway, { page: currentPage.value, pageSize, ...(serverCategory() ? { category: serverCategory() } : {}) });
  apiItems.value = galleryStore.getPublicAlbums();
  apiTotal.value = galleryStore.apiTotal;
}
if (gateway) {
  const { data } = await useAsyncData("public-gallery-page-1", async () => {
    await loadPage();
    return { items: apiItems.value, total: apiTotal.value };
  });
  apiItems.value = data.value?.items ?? [];
  apiTotal.value = data.value?.total ?? 0;
}
watch(active, () => {
  currentPage.value = 1;
  void loadPage();
});

async function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
  await loadPage();
  await nextTick();
  document.getElementById("gallery-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div>
    <PageBanner
      eyebrow="媒体画廊"
      title="把活动、人物与创作留在画面里"
      description="这里呈现新媒体中心与成员共同完成的摄影、设计、视频和人物内容。正式素材到位后会替换当前素材位。"
      tone="dark"
      media-label="编辑部式作品拼贴素材位"
      :visual="PAGE_VISUALS.gallery"
    />
    <section class="section section--cool">
      <div class="shell">
        <p v-if="galleryStore.apiError" role="alert">{{ galleryStore.apiError.message }}（{{ galleryStore.apiError.code }}）</p>
        <p v-if="galleryStore.apiLoading" role="status">正在加载公开画廊…</p>
        <FilterToolbar v-model="active" :filters="categories" :result-label="`共 ${gateway ? apiTotal : filtered.length} 件作品`" />
        <div v-if="visible.length" id="gallery-results" class="gallery-catalog">
          <NuxtLink
            v-for="(album, index) in visible"
            :key="album.slug"
            :to="album.to"
            class="gallery-album-card"
            :class="{ 'is-featured': index === 0 }"
          >
            <ContentMediaView v-if="album.cover ?? album.assets[0]" :item="toMediaItem((album.cover ?? album.assets[0])!)" preview="thumbnail" :controls="false" />
            <span v-else class="gallery-album-card__fallback" aria-hidden="true">&lt; HSD &gt;</span>
            <span class="gallery-album-card__copy">
              <small>{{ galleryCategoryLabel(album.category) }} · {{ album.year }}</small>
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
