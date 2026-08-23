<script setup lang="ts">
import { getContentOverview, PORTAL_CONTENT_KIND_LABELS, PORTAL_CONTENT_STATUS_LABELS, toAdminContentRecord } from "~/data/admin-content";
import { useContentGateway } from "~/composables/useContentGateway";
import { createAdminContentListController, type AdminContentCanonicalStatus, type AdminContentKind } from "~/services/content/admin-content-list";
import { usePortalContentStore } from "~/stores/portal-content";
import { useSessionStore } from "~/stores/session";
import { canAccessPortalContent, getAdminCenterScope } from "~/utils/admin-center-scope";

definePageMeta({ layout: "admin" });
useHead({ title: "官网内容｜HSD 管理台" });

const route = useRoute();
const runtime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const useMockApi = runtime.public.useMockApi;
const gateway = useContentGateway();
const mockContent = useMockApi ? usePortalContentStore() : undefined;
const realContent = !useMockApi && gateway ? createAdminContentListController({ list: gateway.content.list }) : undefined;
const session = useSessionStore();
const canCreateContent = computed(() => useMockApi || session.hasCapability("content.create"));
const centerScope = computed(() => getAdminCenterScope(session.currentAccount?.adminCenterRole));
const isOwner = computed(() => useMockApi ? !centerScope.value : session.adminLevel === "owner");
const canonicalStatuses: Array<{ value: AdminContentCanonicalStatus; label: string }> = [
  { value: "draft", label: "草稿" }, { value: "review", label: "待审核" }, { value: "pending_publication", label: "待发布" }, { value: "published", label: "已发布" }, { value: "offline", label: "已下架" },
];
const canonicalKinds: Array<{ value: AdminContentKind; label: string }> = [
  { value: "flash", label: "HSD 快讯" }, { value: "article", label: "新闻动态" }, { value: "notice", label: "通知公告" },
];
const visibleContentRecords = computed(() => mockContent?.records.filter((record) => canAccessPortalContent(record, {
  operatorId: session.currentAccount?.account, centerRole: session.currentAccount?.adminCenterRole,
})) ?? []);
const query = ref(typeof route.query.query === "string" ? route.query.query : "");
const status = ref(useMockApi ? (typeof route.query.status === "string" ? route.query.status : "") : normalizeCanonicalStatus(route.query.status));
const kind = ref(useMockApi ? (typeof route.query.kind === "string" ? route.query.kind : "") : normalizeKind(route.query.kind));
const centerId = ref(typeof route.query.centerId === "string" ? route.query.centerId : "");
const page = ref(1);
const automationNotice = ref("");
const unresolvedAutomationFailures = computed(() => useMockApi && !centerScope.value ? mockContent?.automationFailures.filter((failure) => !failure.resolvedAt) ?? [] : []);
const mockOverview = computed(() => getContentOverview(visibleContentRecords.value));
const mockRows = computed(() => visibleContentRecords.value.map(toAdminContentRecord).filter((record) => (
  (!query.value.trim() || [record.title, record.summary, record.owner].join(" ").toLowerCase().includes(query.value.trim().toLowerCase()))
  && (!status.value || record.status === status.value) && (!kind.value || record.category === kind.value)
)));
const rows = computed(() => useMockApi ? mockRows.value : realContent?.records.value ?? []);
const total = computed(() => useMockApi ? mockOverview.value.total : realContent?.total.value ?? 0);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / 20)));
const realStatus = computed(() => realContent?.status.value ?? "error");
const realError = computed(() => realContent?.error.value || "官网内容读取服务不可用。");

watchEffect(() => {
  const create = route.query.create;
  if (useMockApi && (create === "flash" || create === "article" || create === "notice")) {
    navigateTo({ path: "/admin/content/new", query: { kind: create } }, { replace: true });
  }
});

watch([query, status, kind, centerId], () => {
  if (!realContent) return;
  page.value = 1;
  realContent.setFilters({ q: query.value, ...(status.value ? { status: status.value as AdminContentCanonicalStatus } : {}), ...(kind.value ? { kind: kind.value as AdminContentKind } : {}), ...(centerId.value ? { centerId: centerId.value } : {}) });
  void realContent.load();
}, { immediate: true });
watch(page, () => { if (realContent) { realContent.setPage(page.value); void realContent.load(); } });

function normalizeCanonicalStatus(value: unknown): string { return typeof value === "string" && canonicalStatuses.some((option) => option.value === value) ? value : ""; }
function normalizeKind(value: unknown): string { return typeof value === "string" && canonicalKinds.some((option) => option.value === value) ? value : ""; }
function retryAutomationDraft(automationKey: string) {
  if (!mockContent) return;
  const result = mockContent.retryAutomationDraft(automationKey);
  automationNotice.value = result.status === "created" ? "快讯草稿已重新生成。" : result.status === "duplicate" ? "该事件已有快讯草稿，无需重复生成。" : `重试失败：${result.errorCode}`;
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Content & Portal" title="官网内容" description="维护 HSD 快讯、新闻和公开公告。草稿、审核、待发布与官网公开版本分开保存。">
      <template #actions>
        <NuxtLink v-if="useMockApi && !centerScope" class="button button--ghost" to="/admin/content/home">门户配置</NuxtLink>
        <span v-else-if="!useMockApi" class="admin-page-heading__hint">门户配置尚未接入真实 API</span>
        <NuxtLink v-if="canCreateContent" class="button" to="/admin/content/new">新建内容</NuxtLink>
      </template>
    </AdminPageHeading>
    <section class="admin-summary-strip" aria-label="官网内容概览">
      <div><span>全部内容</span><strong>{{ total }}</strong><small>{{ useMockApi ? "官网内容记录" : "服务端匹配记录" }}</small></div>
      <template v-if="useMockApi"><div><span>待审核</span><strong>{{ mockOverview.inReview }}</strong><small>等待负责人审核</small></div><div><span>待发布</span><strong>{{ mockOverview.pendingPublication }}</strong><small>审核通过，未公开</small></div><div><span>已发布</span><strong>{{ mockOverview.published }}</strong><small>当前官网可见</small></div></template>
      <template v-else><div><span>当前页</span><strong>{{ rows.length }}</strong><small>本页服务端项目</small></div><div><span>页码</span><strong>{{ page }}</strong><small>共 {{ pageCount }} 页</small></div><div><span>读取模式</span><strong>API</strong><small>不使用本地内容缓存</small></div></template>
    </section>
    <section v-if="unresolvedAutomationFailures.length" class="admin-list-card" aria-labelledby="portal-automation-failures-title">
      <header><div><span>Automation Retry</span><h2 id="portal-automation-failures-title">快讯草稿生成失败</h2></div><p>业务操作已成功，按原事件语义键重试即可，不会重复创建草稿。</p></header>
      <p v-if="automationNotice" role="status">{{ automationNotice }}</p>
      <div class="admin-table-scroll"><table aria-label="快讯自动化失败列表"><thead><tr><th>语义键</th><th>错误码</th><th>时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="failure in unresolvedAutomationFailures" :key="failure.automationKey"><td><code>{{ failure.automationKey }}</code></td><td>{{ failure.errorCode }}</td><td>{{ failure.updatedAt.slice(0, 16).replace('T', ' ') }}</td><td><button type="button" @click="retryAutomationDraft(failure.automationKey)">按语义键重试</button></td></tr></tbody></table></div>
    </section>
    <section class="admin-list-card admin-content-list">
      <header><div><span>Official Content</span><h2>官网内容列表</h2></div><p>{{ useMockApi ? "刷新后继续读取版本化本地 Mock 存储" : "数据仅来自服务端分页查询" }}</p></header>
      <div class="admin-filters">
        <label>搜索内容<input v-model="query" type="search" placeholder="标题、摘要或创建人"></label>
        <label>发布状态<select v-model="status"><option value="">全部状态</option><template v-if="useMockApi"><option v-for="label in Object.values(PORTAL_CONTENT_STATUS_LABELS)" :key="label" :value="label">{{ label }}</option></template><template v-else><option v-for="option in canonicalStatuses" :key="option.value" :value="option.value">{{ option.label }}</option></template></select></label>
        <label>内容分类<select v-model="kind"><option value="">全部分类</option><template v-if="useMockApi"><option v-for="label in Object.values(PORTAL_CONTENT_KIND_LABELS)" :key="label" :value="label">{{ label }}</option></template><template v-else><option v-for="option in canonicalKinds" :key="option.value" :value="option.value">{{ option.label }}</option></template></select></label>
        <label v-if="!useMockApi && isOwner">中心 ID<input v-model="centerId" type="search" placeholder="可选中心 ID"></label>
      </div>
      <div v-if="!useMockApi && realStatus === 'loading'" class="admin-empty" role="status"><strong>正在读取官网内容</strong><p>正在请求服务端分页数据。</p></div>
      <div v-else-if="!useMockApi && realStatus === 'unauthorized'" class="admin-empty" role="alert"><strong>登录状态已失效</strong><p>{{ realError }}</p></div>
      <div v-else-if="!useMockApi && realStatus === 'forbidden'" class="admin-empty" role="alert"><strong>无权读取官网内容</strong><p>{{ realError }}</p></div>
      <div v-else-if="!useMockApi && realStatus === 'error'" class="admin-empty" role="alert"><strong>官网内容读取失败</strong><p>{{ realError }}</p></div>
      <div v-else-if="rows.length" class="admin-table-scroll"><table aria-label="官网内容列表"><thead><tr><th>标题 / 摘要</th><th>分类</th><th>状态</th><th>创建人</th><th>更新时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="record in rows" :key="record.id"><td><strong>{{ record.title }}</strong><small>{{ record.summary }}</small></td><td>{{ record.category }}</td><td><AdminStatusPill :status="record.status" /></td><td>{{ record.owner }}</td><td>{{ record.updatedAt }}</td><td><NuxtLink :to="`/admin/content/${record.id}`">编辑</NuxtLink><template v-if="!useMockApi"> · <NuxtLink :to="`/admin/content/${record.id}/preview`">预览</NuxtLink></template></td></tr></tbody></table></div>
      <div v-else class="admin-empty"><strong>没有匹配的官网内容</strong><p>{{ useMockApi ? "调整关键词或筛选条件后再试。" : "服务端未返回符合当前筛选条件的内容。" }}</p></div>
      <PaginationControls v-if="!useMockApi && realStatus !== 'loading'" v-model="page" :page-count="pageCount" label="官网内容分页" />
    </section>
  </div>
</template>
