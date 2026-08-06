<script setup lang="ts">
import { PORTAL_CONTENT_KIND_LABELS, PORTAL_CONTENT_STATUS_LABELS } from "~/data/admin-content";
import { usePortalContentStore } from "~/stores/portal-content";
import { useSessionStore } from "~/stores/session";
import { canAccessPortalContent } from "~/utils/admin-center-scope";

definePageMeta({ layout: "admin" });
const route = useRoute();
const content = usePortalContentStore();
const session = useSessionStore();
const sourceRecord = computed(() => content.getById(String(route.params.id)));
const record = computed(() => {
  const candidate = sourceRecord.value;
  return candidate && canAccessPortalContent(candidate, {
    operatorId: session.currentAccount?.account,
    centerRole: session.currentAccount?.adminCenterRole,
  }) ? candidate : undefined;
});
watchEffect(() => {
  if (sourceRecord.value && !record.value) {
    void navigateTo(`/admin/forbidden?from=${encodeURIComponent(route.fullPath)}`, { replace: true });
  }
});
useHead({ title: computed(() => `${record.value?.title ?? '内容预览'}｜HSD 管理台`) });
</script>

<template><div class="admin-recruitment-page admin-section-page"><AdminPageHeading eyebrow="Preview" :title="record?.title ?? '内容不存在'" description="这是工作版本预览，不代表当前官网公开版本。"><template #actions><NuxtLink v-if="record" class="button button--ghost" :to="`/admin/content/${record.id}`">返回编辑</NuxtLink></template></AdminPageHeading><article v-if="record" class="admin-content-preview"><header><span>{{ PORTAL_CONTENT_KIND_LABELS[record.kind] }}</span><AdminStatusPill :status="PORTAL_CONTENT_STATUS_LABELS[record.status]" /><h2>{{ record.title }}</h2><p>{{ record.summary }}</p></header><div v-for="(block, index) in record.blocks" :key="index"><h3 v-if="block.type === 'heading'">{{ block.text }}</h3><p v-else-if="block.type === 'paragraph'">{{ block.text }}</p><figure v-else><div>媒体素材：{{ block.assetId || '未选择' }}</div><figcaption>{{ block.alt || '未填写替代文本' }}</figcaption></figure></div><NuxtLink :to="record.target.value">查看站内目标</NuxtLink></article><div v-else class="admin-empty"><strong>找不到内容</strong><p>请返回列表重新选择记录。</p></div></div></template>
