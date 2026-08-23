<script setup lang="ts">
import { filterAuditRecords, type AdminAuditRecord } from "~/data/admin-system";
import { useAuditGateway } from "~/composables/useAuditGateway";
import { createAdminAuditListController, formatSafeAuditProjection } from "~/services/audit/admin-audit-list";
import { useAdminAccessStore } from "~/stores/admin-access";

definePageMeta({ layout: "admin" });
useHead({ title: "操作日志｜HSD 管理台" });
const runtime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const useMockApi = runtime.public.useMockApi;
const mockAccess = useMockApi ? useAdminAccessStore() : undefined;
const mockFilters = reactive({ query: "", module: "全部模块", result: "全部结果" });
const mockSelected = ref<AdminAuditRecord | null>(null);
const mockVisible = computed(() => mockAccess ? filterAuditRecords(mockAccess.auditRecords, mockFilters) : []);
const gateway = useAuditGateway();
const realList = !useMockApi && gateway ? createAdminAuditListController(gateway) : undefined;
const action = ref(""); const actionPrefix = ref(""); const targetType = ref(""); const targetId = ref(""); const actorAccountId = ref(""); const from = ref(""); const to = ref(""); const page = ref(1);
const rows = computed(() => realList?.records.value ?? []); const total = computed(() => realList?.total.value ?? 0); const pageCount = computed(() => Math.max(1, Math.ceil(total.value / 20))); const listStatus = computed(() => realList?.status.value ?? "error"); const listError = computed(() => realList?.error.value || "审计日志读取服务不可用。"); const selected = computed(() => realList?.selected.value);
function asIso(value: string) { return value ? new Date(value).toISOString() : ""; }
watch([action, actionPrefix, targetType, targetId, actorAccountId, from, to], () => {
  if (!realList) return;
  const pageChanged = page.value !== 1; page.value = 1;
  realList.setFilters({ action: action.value, actionPrefix: actionPrefix.value, targetType: targetType.value, targetId: targetId.value, actorAccountId: actorAccountId.value, from: asIso(from.value), to: asIso(to.value) });
  if (!pageChanged) void realList.load();
}, { immediate: true });
watch(page, () => { if (realList) { realList.setPage(page.value); void realList.load(); } });
</script>

<template>
  <div v-if="useMockApi" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Audit Log" title="操作日志" description="本地 Mock 审计记录演示。" />
    <section class="admin-list-card">
      <header><div><span>Audit Records</span><h2>管理员操作日志</h2></div><p>当前为 Mock 数据</p></header>
      <div class="admin-filters"><label>搜索日志<input v-model="mockFilters.query" type="search" placeholder="操作人、动作或对象"></label><label>业务模块<select v-model="mockFilters.module"><option>全部模块</option><option>招新与考核</option><option>组织与成员</option><option>媒体与资源</option><option>系统管理</option></select></label><label>执行结果<select v-model="mockFilters.result"><option>全部结果</option><option>成功</option><option>失败</option></select></label></div>
      <div class="admin-table-scroll"><table aria-label="管理员操作日志"><thead><tr><th>操作人</th><th>模块 / 动作</th><th>对象</th><th>结果</th><th>时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="record in mockVisible" :key="record.id"><td><strong>{{ record.actor }}</strong><small>{{ record.role }}</small></td><td><strong>{{ record.action }}</strong><small>{{ record.module }}</small></td><td>{{ record.target }}</td><td><AdminStatusPill :status="record.result" /></td><td>{{ record.time }}</td><td><button type="button" @click="mockSelected = record">变更前 / 变更后</button></td></tr></tbody></table></div>
    </section>
    <Teleport to="body"><div v-if="mockSelected" class="admin-drawer-backdrop" @click.self="mockSelected = null"><aside class="admin-candidate-drawer" aria-label="日志详情"><header class="admin-drawer__header"><div><span>AUDIT DETAIL</span><h2>{{ mockSelected.action }}</h2><p>{{ mockSelected.time }} · {{ mockSelected.actor }}</p></div><button type="button" aria-label="关闭日志详情" @click="mockSelected = null">×</button></header><div class="admin-drawer__body"><section><header><span>01</span><h3>变更前 / 变更后</h3></header><div class="admin-audit-diff"><article><span>BEFORE</span><p>{{ mockSelected.before }}</p></article><article><span>AFTER</span><p>{{ mockSelected.after }}</p></article></div></section><section><header><span>02</span><h3>执行信息</h3></header><dl class="admin-detail-grid"><div><dt>执行角色</dt><dd>{{ mockSelected.role }}</dd></div><div><dt>执行结果</dt><dd>{{ mockSelected.result }}</dd></div></dl></section></div><footer class="admin-drawer__footer"><button type="button" class="button" @click="mockSelected = null">关闭</button></footer></aside></div></Teleport>
  </div>

  <div v-else class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Audit Log" title="操作日志" description="仅显示服务端返回的安全审计投影；读取权限由后端验证。" />
    <section class="admin-list-card">
      <header><div><span>Audit Records</span><h2>管理员操作日志</h2></div><p>按服务端分页和筛选条件读取</p></header>
      <div class="admin-filters"><label>动作<input v-model="action" type="search" placeholder="精确动作"></label><label>动作前缀<input v-model="actionPrefix" type="search" placeholder="如 content."></label><label>目标类型<input v-model="targetType" type="search"></label><label>目标 ID<input v-model="targetId" type="search"></label><label>执行账户 ID<input v-model="actorAccountId" type="search"></label><label>开始时间<input v-model="from" type="datetime-local"></label><label>结束时间<input v-model="to" type="datetime-local"></label></div>
      <p v-if="listStatus === 'loading'" role="status" class="admin-empty-copy">正在读取审计日志…</p>
      <div v-else-if="listStatus === 'unauthorized' || listStatus === 'forbidden' || listStatus === 'error'" role="alert" class="admin-error-panel"><strong>{{ listStatus === 'unauthorized' ? '请先登录后读取审计日志' : listStatus === 'forbidden' ? '无权读取审计日志' : '审计日志读取失败' }}</strong><p>{{ listError }}</p></div>
      <p v-else-if="listStatus === 'empty'" class="admin-empty-copy">服务端未返回符合当前筛选条件的审计日志。</p>
      <div v-else-if="listStatus === 'success'" class="admin-table-scroll"><table aria-label="管理员操作日志"><thead><tr><th>操作人</th><th>动作</th><th>目标</th><th>时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="record in rows" :key="record.id"><td><strong>{{ record.actor }}</strong><small>{{ record.actorAccount || record.actorType }}</small></td><td>{{ record.action }}</td><td>{{ record.targetType }} / {{ record.targetId }}</td><td>{{ record.occurredAt }}</td><td><button type="button" @click="realList?.select(record)">变更前 / 变更后</button></td></tr></tbody></table></div>
      <nav v-if="listStatus === 'success' && pageCount > 1" class="pagination" aria-label="审计日志分页"><button v-for="value in pageCount" :key="value" type="button" :aria-current="value === page ? 'page' : undefined" @click="page = value">{{ value }}</button></nav>
    </section>
    <Teleport to="body"><div v-if="selected" class="admin-drawer-backdrop" @click.self="realList?.clearSelection()"><aside class="admin-candidate-drawer" aria-label="日志详情"><header class="admin-drawer__header"><div><span>AUDIT DETAIL</span><h2>{{ selected.action }}</h2><p>{{ selected.occurredAt }} · {{ selected.actor }}</p></div><button type="button" aria-label="关闭日志详情" @click="realList?.clearSelection()">×</button></header><div class="admin-drawer__body"><section><header><span>01</span><h3>变更前 / 变更后</h3></header><div class="admin-audit-diff"><article><span>BEFORE</span><p>{{ formatSafeAuditProjection(selected.before) }}</p></article><article><span>AFTER</span><p>{{ formatSafeAuditProjection(selected.after) }}</p></article></div></section><section><header><span>02</span><h3>服务端安全字段</h3></header><dl class="admin-detail-grid"><div><dt>目标</dt><dd>{{ selected.targetType }} / {{ selected.targetId }}</dd></div><div v-if="selected.reason"><dt>原因</dt><dd>{{ selected.reason }}</dd></div></dl></section></div><footer class="admin-drawer__footer"><button type="button" class="button" @click="realList?.clearSelection()">关闭</button></footer></aside></div></Teleport>
  </div>
</template>
