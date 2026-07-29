<script setup lang="ts">
import { findGalleryAlbum, getGalleryBatch } from "~/data/gallery";

const route = useRoute();
const album = computed(() => findGalleryAlbum(String(route.params.slug)));

if (!album.value) {
  throw createError({ statusCode: 404, statusMessage: "媒体专题不存在" });
}

const requestedVisibleCount = Number(route.query.visible);
const initialVisibleCount = Number.isFinite(requestedVisibleCount) && requestedVisibleCount > 12
  ? Math.min(album.value.assets.length, requestedVisibleCount)
  : 12;
const visibleCount = ref(initialVisibleCount);
const activeIndex = ref(0);
const isLightboxOpen = ref(false);
const visibleAssets = computed(() => getGalleryBatch(album.value!, visibleCount.value));
const remainingCount = computed(() => album.value!.assets.length - visibleCount.value);
const nextBatchCount = computed(() => Math.min(12, remainingCount.value));

function loadMore() {
  visibleCount.value = Math.min(album.value!.assets.length, visibleCount.value + 12);
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
          <NuxtLink to="/gallery">媒体画廊</NuxtLink><span>/</span><span>{{ album.category }}</span>
        </nav>
        <p class="eyebrow">{{ album.category }} · {{ album.year }}</p>
        <h1>{{ album.title }}</h1>
        <p>{{ album.summary }}</p>
        <p class="gallery-detail__team">{{ album.team }}</p>
      </div>
    </header>

    <section class="section section--cool">
      <div class="shell">
        <template v-if="visibleAssets.length">
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
</template>
