<script setup lang="ts">
import { getContentOverview, PORTAL_CONTENT_KIND_LABELS, PORTAL_CONTENT_STATUS_LABELS, toAdminContentRecord } from "~/data/admin-content";
import { usePortalContentStore } from "~/stores/portal-content";

definePageMeta({ layout: "admin" });
useHead({ title: "官网内容｜HSD 管理台" });

const route = useRoute();
const content = usePortalContentStore();
const query = ref(typeof route.query.query === "string" ? route.query.query : "");
const status = ref(typeof route.query.status === "string" ? route.query.status : "全部状态");
const kind = ref(typeof route.query.kind === "string" ? route.query.kind : "全部分类");
const automationNotice = ref("");
const unresolvedAutomationFailures = computed(() => content.automationFailures.filter((failure) => !failure.resolvedAt));
const overview = computed(() => getContentOverview(content.records));
const rows = computed(() => content.records
  .map(toAdminContentRecord)
  .filter((record) => (!query.value.trim() || [record.title, record.summary, record.owner].join(" ").toLowerCase().includes(query.value.trim().toLowerCase()))
    && (status.value === "全部状态" || record.status === status.value)
    && (kind.value === "全部分类" || record.category === kind.value)));

watchEffect(() => {
  const create = route.query.create;
  if (create === "flash" || create === "article" || create === "notice") {
    navigateTo({ path: "/admin/content/new", query: { kind: create } }, { replace: true });
  }
});

function retryAutomationDraft(automationKey: string) {
  const result = content.retryAutomationDraft(automationKey);
  automationNotice.value = result.status === "created"
    ? "快讯草稿已重新生成。"
    : result.status === "duplicate"
      ? "该事件已有快讯草稿，无需重复生成。"
      : `重试失败：${result.errorCode}`;
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Content & Portal" title="官网内容" description="维护 HSD 快讯、新闻和公开公告。草稿、审核、待发布与官网公开版本分开保存。">
      <template #actions>
        <NuxtLink class="button button--ghost" to="/admin/content/home">门户配置</NuxtLink>
        <NuxtLink class="button" to="/admin/content/new">新建内容</NuxtLink>
      </template>
    </AdminPageHeading>
    <section class="admin-summary-strip" aria-label="官网内容概览">
      <div><span>全部内容</span><strong>{{ overview.total }}</strong><small>官网内容记录</small></div>
      <div><span>待审核</span><strong>{{ overview.inReview }}</strong><small>等待负责人审核</small></div>
      <div><span>待发布</span><strong>{{ overview.pendingPublication }}</strong><small>审核通过，未公开</small></div>
      <div><span>已发布</span><strong>{{ overview.published }}</strong><small>当前官网可见</small></div>
    </section>
    <section v-if="unresolvedAutomationFailures.length" class="admin-list-card" aria-labelledby="portal-automation-failures-title">
      <header><div><span>Automation Retry</span><h2 id="portal-automation-failures-title">快讯草稿生成失败</h2></div><p>业务操作已成功，按原事件语义键重试即可，不会重复创建草稿。</p></header>
      <p v-if="automationNotice" role="status">{{ automationNotice }}</p>
      <div class="admin-table-scroll"><table aria-label="快讯自动化失败列表"><thead><tr><th>语义键</th><th>错误码</th><th>时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="failure in unresolvedAutomationFailures" :key="failure.automationKey"><td><code>{{ failure.automationKey }}</code></td><td>{{ failure.errorCode }}</td><td>{{ failure.updatedAt.slice(0, 16).replace('T', ' ') }}</td><td><button type="button" @click="retryAutomationDraft(failure.automationKey)">按语义键重试</button></td></tr></tbody></table></div>
    </section>
    <section class="admin-list-card admin-content-list">
      <header><div><span>Official Content</span><h2>官网内容列表</h2></div><p>刷新后继续读取版本化本地 Mock 存储</p></header>
      <div class="admin-filters">
        <label>搜索内容<input v-model="query" type="search" placeholder="标题、摘要或创建人"></label>
        <label>发布状态<select v-model="status"><option>全部状态</option><option v-for="label in Object.values(PORTAL_CONTENT_STATUS_LABELS)" :key="label">{{ label }}</option></select></label>
        <label>内容分类<select v-model="kind"><option>全部分类</option><option v-for="label in Object.values(PORTAL_CONTENT_KIND_LABELS)" :key="label">{{ label }}</option></select></label>
      </div>
      <div v-if="rows.length" class="admin-table-scroll"><table aria-label="官网内容列表"><thead><tr><th>标题 / 摘要</th><th>分类</th><th>状态</th><th>创建人</th><th>更新时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="record in rows" :key="record.id"><td><strong>{{ record.title }}</strong><small>{{ record.summary }}</small></td><td>{{ record.category }}</td><td><AdminStatusPill :status="record.status" /></td><td>{{ record.owner }}</td><td>{{ record.updatedAt }}</td><td><NuxtLink :to="`/admin/content/${record.id}`">编辑</NuxtLink></td></tr></tbody></table></div>
      <div v-else class="admin-empty"><strong>没有匹配的官网内容</strong><p>调整关键词或筛选条件后再试。</p></div>
    </section>
  </div>
</template>
