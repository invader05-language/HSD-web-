<script setup lang="ts">
import type { ContentMediaAttachment } from "~/types/content-media";
import { usePortalContentStore } from "~/stores/portal-content";
import { resolvePortalAssetSource } from "~/data/portal-assets";
import { usePublicContentGateway } from "~/composables/usePublicContentGateway";
import { ContentApiError } from "~/services/content/api-public-content.gateway";
import { resolveApiMediaUrl } from "~/utils/media-url";
import ContentMediaView from "~/components/ContentMediaView.vue";

type DisplayBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; alt: string; caption?: string; src?: string; media?: ContentMediaAttachment };

interface DisplayUpdate {
  slug: string;
  kind: "article" | "notice";
  title: string;
  summary: string;
  publishedAt: string;
  blocks: DisplayBlock[];
}

const route = useRoute();
const slug = computed(() => String(route.params.slug));
const runtimeConfig = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
const isMockApi = runtimeConfig.public.useMockApi;
const gateway = usePublicContentGateway();
const update = ref<DisplayUpdate>();
const loading = ref(!isMockApi);
const error = ref("");
const notFound = ref(false);
let productionRequestGeneration = 0;

function normalizeMockBlock(block: Record<string, unknown>): DisplayBlock | undefined {
  if (block.type === "heading" && typeof block.text === "string") return { type: "heading", text: block.text };
  if (block.type === "paragraph" && typeof block.text === "string") return { type: "paragraph", text: block.text };
  if (block.type !== "image" || typeof block.alt !== "string") return undefined;
  const media = block.media as ContentMediaAttachment | undefined;
  const src = typeof block.assetId === "string" ? resolvePortalAssetSource(block.assetId) : undefined;
  return {
    type: "image",
    alt: block.alt,
    ...(typeof block.caption === "string" ? { caption: block.caption } : {}),
    ...(media ? { media } : {}),
    ...(src ? { src } : {}),
  };
}

function loadMockUpdate() {
  const record = usePortalContentStore().getPublicBySlug(slug.value);
  if (!record || (record.kind !== "article" && record.kind !== "notice")) {
    throw createError({ statusCode: 404, statusMessage: "动态不存在" });
  }
  update.value = {
    slug: record.slug,
    kind: record.kind,
    title: record.title,
    summary: record.summary,
    publishedAt: record.publishedAt,
    blocks: record.blocks
      .map((block) => normalizeMockBlock(block as unknown as Record<string, unknown>))
      .filter((block): block is DisplayBlock => Boolean(block)),
  };
}

async function loadProductionUpdate() {
  if (!gateway) return;
  const requestGeneration = ++productionRequestGeneration;
  const requestedSlug = slug.value;
  loading.value = true;
  error.value = "";
  notFound.value = false;
  update.value = undefined;
  try {
    const response = await gateway.getBySlug(requestedSlug);
    if (requestGeneration !== productionRequestGeneration) return;
    if (response.kind !== "article" && response.kind !== "notice") {
      notFound.value = true;
      return;
    }
    update.value = {
      slug: response.slug,
      kind: response.kind,
      title: response.title,
      summary: response.summary ?? "",
      publishedAt: response.publishedAt ?? "",
      blocks: response.blocks.map((block): DisplayBlock => block.type === "image"
        ? {
            type: "image",
            alt: block.alt,
            ...(block.caption ? { caption: block.caption } : {}),
            src: resolveApiMediaUrl(block.url, runtimeConfig.public.apiBase),
          }
        : block),
    };
  } catch (cause) {
    if (requestGeneration !== productionRequestGeneration) return;
    if (cause instanceof ContentApiError && cause.status === 404) notFound.value = true;
    else error.value = cause instanceof Error ? cause.message : "动态读取失败，请稍后重试。";
  } finally {
    if (requestGeneration === productionRequestGeneration) loading.value = false;
  }
}

if (isMockApi) loadMockUpdate();
else onMounted(loadProductionUpdate);
watch(slug, () => {
  if (!isMockApi) void loadProductionUpdate();
});

useHead(() => ({ title: `${update.value?.title ?? "动态详情"}｜动态与活动` }));
</script>

<template>
  <div v-if="update">
    <PageBanner
      :eyebrow="`${update.kind === 'article' ? '新闻' : '公开公告'} · ${update.publishedAt ? update.publishedAt.slice(0, 10) : '发布时间待确认'}`"
      :title="update.title"
      :description="update.summary"
      :tone="update.kind === 'notice' ? 'warm' : 'red'"
      media-label="已发布动态视觉位"
    />
    <section class="section section--cool">
      <div class="shell detail-layout">
        <article class="detail-main public-update-detail">
          <p class="eyebrow">已发布动态</p>
          <h2>{{ update.kind === "article" ? "新闻正文" : "公告正文" }}</h2>
          <template v-if="update.blocks.length">
            <template v-for="(block, index) in update.blocks" :key="index">
              <h3 v-if="block.type === 'heading'">{{ block.text }}</h3>
              <p v-else-if="block.type === 'paragraph'">{{ block.text }}</p>
              <figure v-else>
                <ContentMediaView v-if="block.media" :item="block.media" preview="full" :controls="false" class="public-update-detail__image" />
                <img v-else-if="block.src" class="public-update-detail__image" :src="block.src" :alt="block.alt">
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
            <div><dt>发布时间</dt><dd>{{ update.publishedAt ? update.publishedAt.slice(0, 10) : "待确认" }}</dd></div>
          </dl>
          <NuxtLink class="button" to="/activities">返回动态与活动</NuxtLink>
        </aside>
      </div>
    </section>
  </div>

  <section v-else class="section section--cool">
    <div class="shell">
      <p v-if="loading" role="status">正在加载动态…</p>
      <p v-else-if="error" role="alert">{{ error }} <button type="button" class="text-link" @click="loadProductionUpdate">重新加载</button></p>
      <EmptyState v-else-if="notFound" title="动态不存在" description="该动态可能尚未发布、已下线或地址有误。">
        <template #action><NuxtLink class="button" to="/activities">返回动态与活动</NuxtLink></template>
      </EmptyState>
    </div>
  </section>
</template>
