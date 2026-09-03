<script setup lang="ts">
import { usePortalContentStore } from "~/stores/portal-content";
import { useSessionStore } from "~/stores/session";
import { canAccessPortalContent } from "~/utils/admin-center-scope";
import ContentMediaView from "~/components/ContentMediaView.vue";
import { useContentGateway } from "~/composables/useContentGateway";
import { createAdminContentDetailController } from "~/services/content/admin-content-detail";
import { resolveApiMediaUrl } from "~/utils/media-url";

definePageMeta({ layout: "admin" });
const route = useRoute();
const useMockApi = (useRuntimeConfig() as { public: { useMockApi: boolean } }).public.useMockApi;
const content = useMockApi ? usePortalContentStore() : undefined;
const session = useSessionStore();
const gateway = useContentGateway();
const apiBase = (useRuntimeConfig() as { public: { apiBase: string } }).public.apiBase;
const realPreview = !useMockApi && gateway ? createAdminContentDetailController({ detail: gateway.content.preview }) : undefined;
const sourceRecord = computed(() => content?.getById(String(route.params.id)));
const record = computed(() => {
  const candidate = sourceRecord.value;
  return candidate && canAccessPortalContent(candidate, {
    operatorId: session.currentAccount?.account,
    centerRole: session.currentAccount?.adminCenterRole,
  }) ? candidate : undefined;
});
watchEffect(() => {
  if (useMockApi && sourceRecord.value && !record.value) {
    void navigateTo(`/admin/forbidden?from=${encodeURIComponent(route.fullPath)}`, { replace: true });
  }
});
watchEffect(() => { if (!useMockApi) void realPreview?.load(String(route.params.id)); });
useHead({ title: computed(() => `${useMockApi ? record.value?.title : realPreview?.record.value?.title ?? '内容预览'}｜HSD 管理台`) });

function kindLabel(kind: string | undefined) {
  return kind === "flash" ? "HSD 快讯" : kind === "notice" ? "通知公告" : "新闻动态";
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <template v-if="useMockApi">
      <AdminPageHeading eyebrow="Preview" :title="record?.title ?? '内容不存在'" description="这是工作版本预览，不代表当前官网公开版本。" />
      <article v-if="record" class="admin-content-preview">
        <header><span>{{ kindLabel(record.kind) }} · 工作版本</span><h2>{{ record.title }}</h2><p>{{ record.summary }}</p></header>
        <div class="admin-content-preview__body">
          <template v-for="(block, index) in record.blocks" :key="index">
            <h3 v-if="block.type === 'heading'">{{ block.text }}</h3>
            <p v-else-if="block.type === 'paragraph'">{{ block.text }}</p>
            <figure v-else-if="block.type === 'image'">
              <ContentMediaView v-if="block.media" :item="block.media" preview="full" :controls="false" />
              <MediaPlaceholder v-else :label="block.alt" detail="工作版本图片附件" />
              <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
            </figure>
          </template>
        </div>
        <NuxtLink class="button button--ghost" :to="`/admin/content/${record.id}`">返回编辑</NuxtLink>
      </article>
    </template>
    <template v-else>
      <AdminPageHeading eyebrow="Preview" :title="realPreview?.record.value?.title ?? '内容预览'" description="仅渲染服务端当前工作版本。" />
      <p v-if="realPreview?.status.value === 'loading'" role="status">正在读取内容预览。</p>
      <p v-else-if="realPreview?.status.value !== 'success'" role="alert">{{ realPreview?.error.value || '内容预览读取失败。' }}</p>
      <article v-else-if="realPreview?.record.value" class="admin-content-preview">
        <header><span>{{ kindLabel(realPreview.record.value.kind) }} · 工作版本</span><h2>{{ realPreview.record.value.title }}</h2><p>{{ realPreview.record.value.summary || '暂无摘要' }}</p></header>
        <div class="admin-content-preview__body">
          <template v-for="(block, index) in realPreview.record.value.blocks" :key="index">
            <h3 v-if="block.type === 'heading'">{{ block.text }}</h3>
            <p v-else-if="block.type === 'paragraph'">{{ block.text }}</p>
            <figure v-else>
              <img v-if="block.url" :src="resolveApiMediaUrl(block.url, apiBase)" :alt="block.alt" class="admin-content-preview__image">
              <MediaPlaceholder v-else :label="block.alt" detail="工作版本图片附件尚未绑定预览地址" />
              <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
            </figure>
          </template>
          <p v-if="!realPreview.record.value.blocks.length" class="admin-content-preview__empty">当前内容暂无正文块。</p>
        </div>
        <NuxtLink class="button button--ghost" :to="`/admin/content/${realPreview.record.value.id}`">返回编辑</NuxtLink>
      </article>
    </template>
  </div>
</template>
