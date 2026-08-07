<script setup lang="ts">
import { usePortalContentStore } from "~/stores/portal-content";
import { resolvePortalAssetSource } from "~/data/portal-assets";
import ContentMediaView from "~/components/ContentMediaView.vue";

const route = useRoute();
const contentStore = usePortalContentStore();
const update = computed(() => {
  const record = contentStore.getPublicBySlug(String(route.params.slug));
  return record && (record.kind === "article" || record.kind === "notice") ? record : undefined;
});

if (!update.value) {
  throw createError({ statusCode: 404, statusMessage: "动态不存在" });
}

useHead(() => ({ title: `${update.value?.title}｜动态与活动` }));

function resolveContentImage(assetId?: string) {
  return resolvePortalAssetSource(assetId);
}
</script>

<template>
  <div v-if="update">
    <PageBanner
      :eyebrow="`${update.kind === 'article' ? '新闻' : '公开公告'} · ${update.publishedAt.slice(0, 10)}`"
      :title="update.title"
      :description="update.summary"
      :tone="update.kind === 'notice' ? 'warm' : 'red'"
      media-label="已发布动态视觉位"
    />
    <section class="section section--cool">
      <div class="shell detail-layout">
        <article class="detail-main public-update-detail">
          <p class="eyebrow">Published Update</p>
          <h2>{{ update.kind === "article" ? "新闻正文" : "公告正文" }}</h2>
          <template v-if="update.blocks.length">
            <template v-for="(block, index) in update.blocks" :key="index">
              <h3 v-if="block.type === 'heading'">{{ block.text }}</h3>
              <p v-else-if="block.type === 'paragraph'">{{ block.text }}</p>
              <figure v-else>
                <ContentMediaView v-if="block.media" :item="block.media" preview="full" :controls="false" class="public-update-detail__image" />
                <img v-else-if="resolveContentImage(block.assetId)" class="public-update-detail__image" :src="resolvePortalAssetSource(block.assetId)" :alt="block.alt">
                <MediaPlaceholder v-else :label="block.alt" detail="已发布内容配图暂不可用" />
                <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
              </figure>
            </template>
          </template>
          <EmptyState v-else title="正文内容暂未提供" description="当前公开摘要已完整展示，后续正文发布后会在此更新。" />
        </article>
        <aside class="detail-aside detail-aside--sticky">
          <h2>发布信息</h2>
          <dl>
            <div><dt>类型</dt><dd>{{ update.kind === "article" ? "新闻" : "公开公告" }}</dd></div>
            <div><dt>发布时间</dt><dd>{{ update.publishedAt.slice(0, 10) }}</dd></div>
          </dl>
          <NuxtLink class="button" to="/activities">返回动态与活动</NuxtLink>
        </aside>
      </div>
    </section>
  </div>
</template>
