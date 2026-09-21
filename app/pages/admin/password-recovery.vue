<script setup lang="ts">
import { PasswordRecoveryApiError, type PasswordRecoveryRequest } from "~/services/password-recovery/password-recovery.gateway";
import { useAdminPasswordRecovery } from "~/composables/useAdminPasswordRecovery";

definePageMeta({ layout: "admin" });
useHead({ title: "密码恢复申请｜管理台" });

const status = ref("PENDING");
const search = ref("");
const identityMatched = ref(false);
const organizationMatched = ref(false);
const contactedInPerson = ref(false);
const reason = ref("");
const rejectReason = ref("");
const confirmReset = ref(false);
const actionError = ref("");
const busyAction = ref<"reset" | "reject" | null>(null);
const { items, selected, pendingCount, total, page, loading, error, lastAction, refresh, open, reset, reject } = useAdminPasswordRecovery();
const pageSize = 20;
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const reasonLength = computed(() => reason.value.trim().length);
const rejectReasonLength = computed(() => rejectReason.value.trim().length);

const todayCount = computed(() => items.value.filter((item) => new Date(item.lastRequestedAt).toDateString() === new Date().toDateString()).length);
const overdueCount = computed(() => items.value.filter((item) => Date.now() - new Date(item.lastRequestedAt).getTime() > 24 * 60 * 60 * 1000).length);
const canReset = computed(() => Boolean(selected.value && !busyAction.value && identityMatched.value && organizationMatched.value && contactedInPerson.value && reasonLength.value >= 10));

function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function resetChecks(request: PasswordRecoveryRequest | null) { identityMatched.value = false; organizationMatched.value = false; contactedInPerson.value = false; reason.value = ""; rejectReason.value = ""; confirmReset.value = false; actionError.value = ""; busyAction.value = null; if (!request) return; }
async function selectRequest(request: PasswordRecoveryRequest) { resetChecks(request); await open(request); }
async function applyReset() {
  if (!selected.value || !canReset.value) return;
  actionError.value = "";
  busyAction.value = "reset";
  try {
    await reset(selected.value, { requestVersion: selected.value.version, accountVersion: selected.value.target.accountVersion, contactedInPerson: true, identityMatched: true, organizationMatched: true, resolutionReason: reason.value.trim() });
    await refresh({ status: status.value, search: search.value });
  } catch (cause) {
    if (cause instanceof PasswordRecoveryApiError && cause.status === 409) { actionError.value = "申请已发生变化，请刷新后重新确认"; await refresh({ status: status.value, search: search.value }); }
    else actionError.value = cause instanceof Error ? cause.message : "重置失败，请稍后重试";
  } finally {
    busyAction.value = null;
  }
}
async function applyReject() {
  if (!selected.value || busyAction.value || rejectReasonLength.value < 10) return;
  actionError.value = "";
  busyAction.value = "reject";
  try { await reject(selected.value, rejectReason.value.trim()); await refresh({ status: status.value, search: search.value }); }
  catch (cause) { actionError.value = cause instanceof Error ? cause.message : "驳回失败，请稍后重试"; }
  finally { busyAction.value = null; }
}
onMounted(() => void refresh({ status: status.value }));
watch([status, search], () => {
  if (page.value !== 1) {
    page.value = 1;
    return;
  }
  void refresh({ status: status.value, search: search.value });
});
watch(page, (nextPage, previousPage) => {
  if (nextPage !== previousPage) void refresh({ status: status.value, search: search.value });
});
</script>

<template>
  <div class="admin-recovery-page">
    <AdminPageHeading eyebrow="Account Recovery" title="密码恢复申请" description="仅联盟总负责人可查看并处理成员的密码恢复申请。重置前必须完成线下身份核验。" />
    <p v-if="lastAction" class="admin-recovery-notice" role="status">{{ lastAction }}</p>
    <section class="admin-recovery-metrics" aria-label="密码恢复统计"><article><span>待处理</span><strong>{{ pendingCount }}</strong><small>当前待核验申请</small></article><article><span>今日新增</span><strong>{{ todayCount }}</strong><small>当前列表内申请</small></article><article><span>超过 24 小时</span><strong>{{ overdueCount }}</strong><small>需要优先跟进</small></article></section>
    <section class="admin-recovery-toolbar"><label>状态<select v-model="status"><option value="PENDING">待处理</option><option value="COMPLETED">已完成</option><option value="REJECTED">已驳回</option></select></label><label>搜索申请人<input v-model="search" placeholder="姓名或账号" /></label><button type="button" class="button button--ghost" @click="refresh({ status, search })">刷新</button></section>
    <section class="admin-recovery-list" aria-label="密码恢复申请列表">
      <div class="admin-recovery-list__header"><strong>申请列表</strong><span>共 {{ total }} 条</span></div>
      <p v-if="loading" class="admin-recovery-state">正在加载申请…</p><p v-else-if="error" class="admin-recovery-state is-error" role="alert">{{ error }} <button type="button" class="button button--ghost" @click="refresh({ status, search })">重试</button></p><p v-else-if="!items.length" class="admin-recovery-state">当前没有符合条件的申请。</p>
      <button v-for="item in items" v-else :key="item.id" type="button" class="admin-recovery-row" @click="selectRequest(item)"><span><strong>{{ item.target.name }}</strong><small>{{ item.target.centerName ?? "未配置中心" }} · {{ item.target.maskedAccount }}</small></span><span><b>{{ item.status === "PENDING" ? "待处理" : item.status === "COMPLETED" ? "已完成" : "已驳回" }}</b><small>申请于 {{ formatDate(item.lastRequestedAt) }}</small></span><span aria-hidden="true">→</span></button>
      <PaginationControls v-if="!loading && !error && pageCount > 1" v-model="page" :page-count="pageCount" label="密码恢复申请分页" />
    </section>
    <aside v-if="selected" class="admin-recovery-drawer" aria-label="密码恢复申请详情"><div class="admin-recovery-drawer__head"><div><span>申请详情</span><h2>{{ selected.target.name }}</h2><small>{{ selected.target.centerName ?? "未配置中心" }} · {{ selected.target.maskedAccount }}</small></div><button type="button" aria-label="关闭" @click="selected = null">×</button></div><div class="admin-recovery-drawer__body"><dl><div><dt>申请时间</dt><dd>{{ formatDate(selected.requestedAt) }}</dd></div><div><dt>最近申请</dt><dd>{{ formatDate(selected.lastRequestedAt) }}</dd></div><div><dt>账号状态</dt><dd>{{ selected.target.status }}</dd></div></dl><fieldset v-if="selected.status === 'PENDING'" class="admin-recovery-checks"><legend>身份核验</legend><label><input v-model="contactedInPerson" type="checkbox" /> 已通过线下可信渠道联系本人</label><label><input v-model="identityMatched" type="checkbox" /> 已核对本人身份信息</label><label><input v-model="organizationMatched" type="checkbox" /> 已核对组织关系</label><label>重置处理原因<textarea v-model="reason" rows="3" placeholder="至少填写 10 个字符" /><small class="admin-recovery-field-hint">{{ reasonLength }}/10，说明核验依据和处理结论</small></label></fieldset><p v-if="actionError" class="form-error" role="alert">{{ actionError }}</p></div><div v-if="selected.status === 'PENDING'" class="admin-recovery-drawer__actions"><section class="admin-recovery-action"><label for="admin-recovery-reject-reason">驳回原因</label><textarea id="admin-recovery-reject-reason" v-model="rejectReason" rows="3" placeholder="至少填写 10 个字符" /><small class="admin-recovery-field-hint">{{ rejectReasonLength }}/10，说明驳回原因</small><button type="button" class="button button--ghost" :disabled="rejectReasonLength < 10 || busyAction !== null" @click="applyReject">{{ busyAction === "reject" ? "驳回中…" : "驳回申请" }}</button></section><section class="admin-recovery-action"><p>完成三项身份核验并填写重置处理原因后，才可以重置密码。</p><button type="button" class="button" :disabled="!canReset" @click="confirmReset = true">{{ busyAction === "reset" ? "重置中…" : "重置为系统初始密码" }}</button></section></div></aside><div v-if="confirmReset" class="admin-recovery-confirm" role="dialog" aria-modal="true"><div><h2>确认重置账号？</h2><p>此操作会将账号重置为系统初始密码，并强制本人首次登录时修改密码。旧会话会立即失效。</p><button type="button" class="button button--ghost" :disabled="busyAction !== null" @click="confirmReset = false">取消</button><button type="button" class="button" :disabled="busyAction !== null" @click="confirmReset = false; applyReset()">确认重置</button></div></div>
  </div>
</template>
