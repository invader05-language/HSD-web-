<script setup lang="ts">
import { GALLERY_ALBUMS } from "~/data/gallery";

useHead({ title: "媒体画廊｜白云 HSD 开发者部落" });

const categories = ["全部", "活动摄影", "海报设计", "短视频", "人物专访"] as const;
const active = ref("全部");
const visible = computed(() => active.value === "全部"
  ? GALLERY_ALBUMS
  : GALLERY_ALBUMS.filter((album) => album.category === active.value));
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
        <FilterToolbar v-model="active" :filters="categories" :result-label="`共 ${visible.length} 件作品`" />
        <div v-if="visible.length" class="gallery-catalog">
          <NuxtLink
            v-for="(album, index) in visible"
            :key="album.slug"
            :to="album.to"
            class="gallery-album-card"
            :class="{ 'is-featured': index === 0 }"
          >
            <span class="gallery-album-card__fallback" aria-hidden="true">&lt; HSD &gt;</span>
            <span class="gallery-album-card__copy">
              <small>{{ album.category }} · {{ album.year }}</small>
              <strong>{{ album.title }}</strong>
              <span>{{ album.summary }}</span>
            </span>
          </NuxtLink>
        </div>
        <EmptyState v-else />
        <nav class="pagination" aria-label="媒体作品分页">
          <button type="button" disabled>上一页</button><button type="button" class="is-active">1</button><button type="button">2</button><button type="button">下一页</button>
        </nav>
      </div>
    </section>
  </div>
</template>
