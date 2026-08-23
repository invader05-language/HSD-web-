<script setup lang="ts">
import { usePortalContentStore } from "~/stores/portal-content";
import { useSessionStore } from "~/stores/session";
import { canAccessPortalContent } from "~/utils/admin-center-scope";
import { useContentGateway } from "~/composables/useContentGateway";
import { createAdminContentDetailController } from "~/services/content/admin-content-detail";
import PortalContentEditor from "~/components/admin/PortalContentEditor.vue";
import ApiContentEditor from "~/components/admin/ApiContentEditor.vue";
definePageMeta({ layout: "admin" });
const route = useRoute(); const useMockApi = (useRuntimeConfig() as { public: { useMockApi: boolean } }).public.useMockApi; const session = useSessionStore(); const content = useMockApi ? usePortalContentStore() : undefined; const gateway = useContentGateway(); const detail = !useMockApi && gateway ? createAdminContentDetailController({ detail: gateway.content.detail }) : undefined;
const sourceRecord = computed(() => content?.getById(String(route.params.id))); const record = computed(() => { const candidate = sourceRecord.value; return candidate && canAccessPortalContent(candidate, { operatorId: session.currentAccount?.account, centerRole: session.currentAccount?.adminCenterRole }) ? candidate : undefined; });
function reload() { void detail?.load(String(route.params.id)); } watchEffect(() => { if (!useMockApi) reload(); else if (sourceRecord.value && !record.value) void navigateTo(`/admin/forbidden?from=${encodeURIComponent(route.fullPath)}`, { replace: true }); });
useHead({ title: computed(() => `${useMockApi ? record.value?.title : detail?.record.value?.title ?? '内容不存在'}｜HSD 管理台`) });
</script>
<template><div class="admin-recruitment-page admin-section-page"><template v-if="useMockApi"><AdminPageHeading eyebrow="Official Content" :title="record?.title ?? '内容不存在'" :description="record ? '编辑工作版本不会提前覆盖当前公开版本。' : '该内容不存在，或本地 Mock 存储已被重置。'" /><PortalContentEditor v-if="record" :record="record" /><NuxtLink v-else class="button" to="/admin/content">返回官网内容列表</NuxtLink></template><template v-else><AdminPageHeading eyebrow="Official Content" :title="detail?.record.value?.title ?? '官网内容'" description="服务端工作版本与审核状态。" /><p v-if="detail?.status.value === 'loading'" role="status">正在读取官网内容。</p><p v-else-if="detail?.status.value !== 'success'" role="alert">{{ detail?.error.value || '官网内容读取失败。' }}</p><ApiContentEditor v-else-if="detail?.record.value" :record="detail.record.value" @saved="reload" @reload="reload" /><NuxtLink :to="`/admin/content/${String(route.params.id)}/preview`">打开预览</NuxtLink></template></div></template>
