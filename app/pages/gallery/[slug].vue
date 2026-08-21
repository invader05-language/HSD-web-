<script setup lang="ts">
import { useGalleryStore } from "~/stores/gallery";
import { galleryCategoryLabel } from "~/types/gallery";
import type { ManagedGalleryAlbum } from "~/types/gallery";
import { GALLERY_PUBLISHED_SLUGS_COOKIE } from "~/stores/gallery";
import { GALLERY_ALBUMS } from "~/data/gallery";
import { useContentGateway } from "~/composables/useContentGateway";

const route = useRoute();
const galleryStore = useGalleryStore();
const gateway = useContentGateway();
const slug = String(route.params.slug);
const publishedSlugsCookie = useCookie<string[]>(GALLERY_PUBLISHED_SLUGS_COOKIE, { default: () => [] });
if (gateway) {
  galleryStore.activateApiMode(false);
  const { data: detailData } = await useAsyncData<ManagedGalleryAlbum | undefined>(`public-gallery-${slug}`, () => galleryStore.refreshPublicDetailFromApi(gateway, slug));
  // Pinia is reset during client hydration; restore the cached SSR async-data result.
  if (detailData.value) galleryStore.albums = [detailData.value];
} else if (import.meta.client) galleryStore.hydrate();
const album = computed(() => galleryStore.getPublicBySlug(slug));
if (gateway && import.meta.server && galleryStore.apiError?.status === 404) {
  throw createError({ statusCode: 404, statusMessage: galleryStore.apiError.message });
}
if (!gateway && import.meta.server && !album.value && !GALLERY_ALBUMS.some((item) => item.slug === slug) && !publishedSlugsCookie.value.includes(slug)) {
  throw createError({ statusCode: 404, statusMessage: "媒体专题不存在" });
}
const requestedVisibleCount = computed(() => Number(route.query.visible));
const visibleCount = ref(12);
const activeIndex = ref(0);
const isLightboxOpen = ref(false);
const visibleAssets = computed(() => album.value?.assets.slice(0, Math.max(0, visibleCount.value)) ?? []);
const coverAsset = computed(() => album.value?.cover ?? null);
const remainingCount = computed(() => Math.max(0, (album.value?.assets.length ?? 0) - visibleCount.value));
const nextBatchCount = computed(() => Math.min(12, remainingCount.value));

watch([album, requestedVisibleCount], ([nextAlbum, requestedCount]) => {
  if (!nextAlbum) return;
  visibleCount.value = Number.isFinite(requestedCount) && requestedCount > 12
    ? Math.min(nextAlbum.assets.length, requestedCount)
    : 12;
}, { immediate: true });

function loadMore() {
  visibleCount.value = Math.min(album.value?.assets.length ?? 0, visibleCount.value + 12);
}

function openLightbox(index: number) {
  activeIndex.value = index;
  isLightboxOpen.value = true;
}

useHead(() => ({ title: `${album.value?.title}｜媒体画廊` }));
</script>

<template>
  <main v-if="album" class="gallery-detail">
    <header class="gallery-detail__hero">
      <div class="shell">
        <nav aria-label="面包屑" class="breadcrumb">
          <NuxtLink to="/gallery">媒体画廊</NuxtLink><span>/</span><span>{{ galleryCategoryLabel(album.category) }}</span>
        </nav>
        <p class="eyebrow">{{ galleryCategoryLabel(album.category) }} · {{ album.year }}</p>
        <h1>{{ album.title }}</h1>
        <p>{{ album.summary }}</p>
      </div>
    </header>

    <section class="section section--cool">
      <div class="shell">
        <template v-if="visibleAssets.length">
          <div v-if="coverAsset" class="gallery-detail__cover">
            <GalleryMediaFrame :item="coverAsset" featured :interactive="false" />
          </div>
          <div class="gallery-detail__featured">
            <GalleryMediaFrame
              v-if="visibleAssets[0]"
              :item="visibleAssets[0]"
              featured
              @open="openLightbox(0)"
            />
            <div class="gallery-detail__featured-side">
              <GalleryMediaFrame
                v-for="(item, index) in visibleAssets.slice(1, 3)"
                :key="item.id"
                :item="item"
                @open="openLightbox(index + 1)"
              />
            </div>
          </div>

          <div v-if="visibleAssets.length > 3" class="gallery-detail__grid">
            <GalleryMediaFrame
              v-for="(item, index) in visibleAssets.slice(3)"
              :key="item.id"
              :item="item"
              :featured="index % 7 === 3"
              @open="openLightbox(index + 3)"
            />
          </div>

          <form
            v-if="remainingCount > 0"
            class="gallery-detail__load-more"
            method="get"
            @submit.prevent="loadMore"
          >
            <button
              type="submit"
              name="visible"
              :value="Math.min(album.assets.length, visibleCount + 12)"
              class="button button--dark"
            >
              继续加载 {{ nextBatchCount }} 张
            </button>
          </form>
        </template>

        <EmptyState
          v-else
          title="该专题暂无公开作品"
          description="公开素材整理完成后会在这里更新。"
        >
          <template #action>
            <NuxtLink class="button" to="/gallery">返回媒体画廊</NuxtLink>
          </template>
        </EmptyState>
      </div>
    </section>

    <GalleryLightbox
      v-if="isLightboxOpen"
      v-model:active-index="activeIndex"
      :items="visibleAssets"
      @close="isLightboxOpen = false"
    />
  </main>

  <section v-else class="section section--cool">
    <div class="shell">
      <p v-if="galleryStore.apiLoading" role="status">正在加载画廊…</p>
      <p v-else-if="galleryStore.apiError && galleryStore.apiError.status !== 404" role="alert">{{ galleryStore.apiError.message }}（{{ galleryStore.apiError.code }}）</p>
      <EmptyState
        title="媒体专题不存在"
        description="该专题可能尚未发布，或已被下线。"
      >
        <template #action>
          <NuxtLink class="button" to="/gallery">返回媒体画廊</NuxtLink>
        </template>
      </EmptyState>
    </div>
  </section>
</template>
