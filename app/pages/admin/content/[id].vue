<script setup lang="ts">
import { usePortalContentStore } from "~/stores/portal-content";
import { useSessionStore } from "~/stores/session";
import { canAccessPortalContent } from "~/utils/admin-center-scope";
import PortalContentEditor from "~/components/admin/PortalContentEditor.vue";

definePageMeta({ layout: "admin" });
const route = useRoute();
const useMockApi = (useRuntimeConfig() as { public: { useMockApi: boolean } }).public.useMockApi;
const content = useMockApi ? usePortalContentStore() : undefined;
const session = useSessionStore();
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
useHead({ title: computed(() => `${record.value?.title ?? '内容不存在'}｜HSD 管理台`) });
function onSaved() {}
</script>

<template><div class="admin-recruitment-page admin-section-page"><AdminContentRealModeUnavailable v-if="!useMockApi" page="官网内容详情与编辑" /><template v-else><AdminPageHeading eyebrow="Official Content" :title="record?.title ?? '内容不存在'" :description="record ? '编辑工作版本不会提前覆盖当前公开版本。' : '该内容不存在，或本地 Mock 存储已被重置。'" /><PortalContentEditor v-if="record" :record="record" @saved="onSaved" /><NuxtLink v-else class="button" to="/admin/content">返回官网内容列表</NuxtLink></template></div></template>
