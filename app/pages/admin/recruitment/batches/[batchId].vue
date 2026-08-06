<script setup lang="ts">
import { RECRUITMENT_CENTERS } from "~/data/recruitment-application";
import {
  buildRecruitmentBatchRoute,
  buildRecruitmentBatchSectionRoute,
  formatRecruitmentBatchPeriod,
  getAdminBatchStatus,
  getRecruitmentBatchStatusLabel,
  canManageRecruitmentBatch,
  type AdminRecruitmentBatchLike,
  type RecruitmentBatchAdminSection,
} from "~/data/recruitment-admin-context";
import type { AdminCandidate } from "~/data/recruitment-admin";
import { getRecruitmentBatchCommandMessage } from "~/utils/recruitment-batch-messages";
import { useRecruitmentApplicationStore } from "~/stores/recruitment-application";
import { useRecruitmentAssessmentStore } from "~/stores/recruitment-assessment";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useSessionStore } from "~/stores/session";
import { getRecruitmentBatchProgress } from "~/utils/recruitment-batch-rules";
import { useRecruitmentNow } from "~/composables/useRecruitmentNow";
import { canAccessRecruitmentCandidate, getAdminCenterScope } from "~/utils/admin-center-scope";
import type { RecruitmentBatch } from "~/types/recruitment-batch";

definePageMeta({ layout: "admin" });

interface AdminBatchDetail extends AdminRecruitmentBatchLike {
  id: string;
  name: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  openCenterIds?: readonly string[];
  responsibleAccountIds?: readonly string[];
  version?: number;
  actualOpenedAt?: string;
  owner?: string;
}

type LifecycleAction = "publish" | "openNow" | "pause" | "resume" | "close" | "reopen" | "archive";

const route = useRoute();
const now = useRecruitmentNow();
const session = useSessionStore();
const batchStore = useRecruitmentBatchStore();
const applicationStore = useRecruitmentApplicationStore();
const assessmentStore = useRecruitmentAssessmentStore();
const batchId = computed(() => String(route.params.batchId));
watch(now, (value) => batchStore.syncLifecycle(value), { immediate: true });
const centerScope = computed(() => getAdminCenterScope(session.currentAccount?.adminCenterRole));
const batch = computed(() => batchStore.getBatch(batchId.value) as AdminBatchDetail | undefined);
function canViewCandidate(candidate: { candidate?: AdminCandidate }) {
  return !centerScope.value || Boolean(candidate.candidate && canAccessRecruitmentCandidate(candidate.candidate, centerScope.value));
}
const overviewRoute = computed(() => buildRecruitmentBatchRoute(batchId.value));
const statusKey = computed(() => {
  const effective = batchStore.effectiveStatus(batchId.value, now.value);
  return effective ?? (batch.value ? getAdminBatchStatus(batch.value) : "closed");
});
const statusLabel = computed(() => getRecruitmentBatchStatusLabel(statusKey.value));
const progress = computed(() => batch.value
  ? getRecruitmentBatchProgress(batch.value as RecruitmentBatch, now.value)
  : { status: "closed" as const, percentage: 100 });
const canManage = computed(() => canManageRecruitmentBatch(
  session.currentAccount
    ? { account: session.currentAccount.account, name: session.currentAccount.name, level: session.adminLevel as "admin" | "owner" }
    : undefined,
));
const isArchived = computed(() => statusKey.value === "archived");
const isDraft = computed(() => statusKey.value === "draft");
const assessmentPublished = computed(() => Boolean(
  (batchStore as unknown as { assessmentPublishedAt?: Record<string, string> }).assessmentPublishedAt?.[batchId.value],
));
const assessmentStarted = computed(() => Boolean(
  (batchStore as unknown as { assessmentStartedAt?: Record<string, string> }).assessmentStartedAt?.[batchId.value],
));
const canReopen = computed(() => statusKey.value === "closed" && !assessmentPublished.value && !assessmentStarted.value);
const pendingAction = ref<LifecycleAction | null>(null);
const reason = ref("");
const actionMessage = ref("");
const actionError = ref("");
const editOpen = ref(false);
const editError = ref("");
const editForm = reactive({
  name: "",
  startAt: "",
  endAt: "",
  openCenterIds: [] as string[],
});

const centerOptions = RECRUITMENT_CENTERS.map((label, index) => [
  ["baize-development", "new-media", "tuowei-planning", "talent-development"][index] ?? label,
  label,
] as const);

const applications = computed(() => batch.value
  ? applicationStore.getApplicationsForBatch(batchId.value)
    .filter((application) => !centerScope.value || application.firstChoice === centerScope.value)
  : []);
const candidates = computed(() => batch.value
  ? assessmentStore.getCandidates(batchId.value)
    .filter(canViewCandidate)
  : []);
const actionableCandidates = computed(() => batch.value
  ? assessmentStore.getActionableCandidates(batchId.value)
    .filter(canViewCandidate)
  : []);
const publicationSummary = computed(() => batch.value
  ? assessmentStore.getPublicationSummary(batchId.value, canViewCandidate)
  : { total: 0, ready: 0, pending: 0, admitted: 0, notAdmitted: 0, canPublish: false });
const applicantCount = computed(() => Math.max(applications.value.length, candidates.value.length));
const publishReadiness = computed(() => batch.value && isDraft.value
  ? batchStore.getPublishReadiness(batchId.value, now.value)
  : { ok: false });
const openCenterNames = computed(() => (batch.value?.openCenterIds ?? [])
  .map((id) => centerOptions.find(([centerId]) => centerId === id)?.[1] ?? id));

const workflowItems = computed(() => [
  {
    step: "01",
    title: "报名名单",
    description: "查看报名资料、筛选与导出",
    state: isArchived.value ? "已封存" : statusKey.value === "open" ? "报名收集中" : statusKey.value === "paused" ? "报名已暂停" : statusKey.value === "closed" ? "报名已结束" : "等待报名",
    detail: `${applicantCount.value} 人${statusKey.value === "open" ? " · 报名入口已开放" : statusKey.value === "paused" ? " · 可恢复报名" : ""}`,
    count: `${applicantCount.value} 人`,
    section: "applications" as const,
    action: isArchived.value ? "查看名单" : "进入名单",
  },
  {
    step: "02",
    title: "预备成员考核",
    description: "分阶段审批、调剂与推进",
    state: isArchived.value ? "已完成" : actionableCandidates.value.length > 0 ? "有待处理人员" : statusKey.value === "draft" ? "批次发布后开启" : "尚未开始",
    detail: `${actionableCandidates.value.length} 人待处理 · ${candidates.value.length} 人进入本批次`,
    count: `${candidates.value.length} 人`,
    section: "assessment" as const,
    action: isArchived.value ? "查看记录" : "进入考核台",
  },
  {
    step: "03",
    title: "结果发布",
    description: "核对名单并发布用户端结果",
    state: isArchived.value ? "已发布" : publicationSummary.value.canPublish ? "满足发布条件" : "等待考核完成",
    detail: `${publicationSummary.value.ready} 人已形成结果 · ${publicationSummary.value.pending} 人待处理`,
    count: publicationSummary.value.total ? `${publicationSummary.value.ready}/${publicationSummary.value.total}` : "—",
    section: "publish" as const,
    action: isArchived.value ? "查看结果" : "进入结果发布",
  },
]);

const auditRecords = computed(() => {
  const records = (batchStore as unknown as { auditRecords?: unknown }).auditRecords;
  if (!Array.isArray(records)) return [];
  return records.filter((record) => (record as { batchId?: string }).batchId === batchId.value);
});

function sectionRoute(section: RecruitmentBatchAdminSection) {
  return buildRecruitmentBatchSectionRoute(batchId.value, section);
}

function actionLabel(action: LifecycleAction) {
  return {
    publish: "发布批次",
    openNow: "立即开放",
    pause: "暂停报名",
    resume: "恢复报名",
    close: "提前关闭",
    reopen: "重新开放",
    archive: "归档批次",
  }[action];
}

function requestAction(action: LifecycleAction) {
  actionError.value = "";
  actionMessage.value = "";
  if (!canManage.value) {
    actionError.value = "只有联盟总负责人可以修改批次状态。";
    return;
  }
  if (action === "publish" && !publishReadiness.value.ok) {
    actionError.value = getRecruitmentBatchCommandMessage(publishReadiness.value);
    return;
  }
  pendingAction.value = action;
}

function invokeAction(action: LifecycleAction) {
  const methodName = action === "publish" ? "publishBatch" : action;
  const method = (batchStore as unknown as Record<string, unknown>)[methodName];
  if (typeof method !== "function") {
    actionError.value = "当前 Mock 会话尚未提供该批次命令。";
    return;
  }
  try {
    const rationale = reason.value.trim() || undefined;
    const currentTime = new Date();
    const result = action === "openNow" || action === "close" || action === "reopen"
      ? (method as (id: string, confirmed: boolean, now: Date, reason?: string) => unknown).call(batchStore, batchId.value, true, currentTime, rationale)
      : (method as (id: string, now?: Date, reason?: string) => unknown).call(batchStore, batchId.value, currentTime, rationale);
    if (result === false || (result && typeof result === "object" && "ok" in result && !(result as { ok: boolean }).ok)) {
      throw new Error("BATCH_COMMAND_FAILED");
    }
    actionMessage.value = `${actionLabel(action)}已完成，状态和生命周期记录已刷新。`;
    pendingAction.value = null;
    reason.value = "";
  } catch (error) {
    const isBusinessFailure = action === "publish" || Boolean((error as { code?: string })?.code);
    actionError.value = getRecruitmentBatchCommandMessage(error);
    if (isBusinessFailure) pendingAction.value = null;
  }
}

function confirmAction() {
  if (pendingAction.value) invokeAction(pendingAction.value);
}

function dateInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toDateTime(value: string, endOfDay = false) {
  return value ? new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}+08:00`).toISOString() : "";
}

function openEditor() {
  if (!batch.value || !canManage.value || !isDraft.value) return;
  editError.value = "";
  editForm.name = batch.value.name;
  editForm.startAt = dateInput(batch.value.startAt);
  editForm.endAt = dateInput(batch.value.endAt);
  editForm.openCenterIds = [...(batch.value.openCenterIds ?? [])];
  editOpen.value = true;
}

function saveEditor() {
  if (!batch.value) return;
  try {
    batchStore.updateBatch(batchId.value, {
      name: editForm.name,
      startAt: toDateTime(editForm.startAt),
      endAt: toDateTime(editForm.endAt, true),
      openCenterIds: editForm.openCenterIds,
    }, "更新招新批次草稿");
    editOpen.value = false;
    editError.value = "";
    actionMessage.value = "批次草稿已更新，请重新完成发布检查。";
  } catch (error) {
    editError.value = getRecruitmentBatchCommandMessage(error);
  }
}

function auditText(record: unknown, ...keys: string[]): string {
  if (!record || typeof record !== "object") return "-";
  const value = record as Record<string, unknown>;
  const found = keys.map((key) => value[key]).find((item) => typeof item === "string" && item.length > 0);
  return typeof found === "string" ? found : "-";
}

function auditActionLabel(action: string) {
  return ({ create: "创建批次", publish: "发布批次", "open-now": "立即开放", pause: "暂停报名", resume: "恢复报名", close: "提前关闭", reopen: "重新开放", archive: "归档批次", update: "更新批次" } as Record<string, string>)[action] ?? action;
}

function auditStatusLabel(status: string) {
  return getRecruitmentBatchStatusLabel(status as Parameters<typeof getRecruitmentBatchStatusLabel>[0]) ?? status;
}

function auditTimestamp(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replaceAll("/", "-");
}

useHead(() => ({ title: `${batch.value?.name ?? "招新批次"}｜HSD 管理台` }));
</script>

<template>
  <NuxtPage v-if="route.path !== overviewRoute" />
  <div v-else-if="batch" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Recruitment Batch Context"
      :title="batch.name"
      :description="isArchived ? '归档批次仅供追溯与导出，数据和流程状态不可修改。' : `所有报名、考核、结果发布和导出均限定在 ${batch.name} 内。`"
    >
      <template #actions>
        <div class="admin-batch-actions">
          <NuxtLink class="button button--ghost" to="/admin/recruitment/batches">返回批次列表</NuxtLink>
          <NuxtLink class="button button--ghost" to="/join">查看用户端页面</NuxtLink>
          <button v-if="isDraft && canManage" type="button" class="button button--ghost" @click="openEditor">编辑批次</button>
          <button v-if="statusKey === 'draft'" type="button" class="button" :disabled="!canManage || !publishReadiness.ok" @click="requestAction('publish')">发布批次</button>
          <button v-if="statusKey === 'upcoming'" type="button" class="button" :disabled="!canManage" @click="requestAction('openNow')">立即开放</button>
          <button v-if="statusKey === 'open'" type="button" class="button button--ghost" :disabled="!canManage" @click="requestAction('pause')">暂停报名</button>
          <button v-if="statusKey === 'paused'" type="button" class="button" :disabled="!canManage" @click="requestAction('resume')">恢复报名</button>
          <button v-if="statusKey === 'open' || statusKey === 'paused'" type="button" class="button button--ghost" :disabled="!canManage" @click="requestAction('close')">提前关闭</button>
          <button v-if="canReopen" type="button" class="button button--ghost" :disabled="!canManage" @click="requestAction('reopen')">重新开放</button>
          <button v-if="statusKey === 'closed'" type="button" class="button" :disabled="!canManage" @click="requestAction('archive')">归档批次</button>
        </div>
      </template>
    </AdminPageHeading>

    <p v-if="actionMessage" class="admin-save-message" role="status">{{ actionMessage }}</p>
    <p v-if="actionError" class="admin-save-message admin-save-message--error" role="alert">{{ actionError }}</p>

    <section class="admin-batch-context-summary" aria-label="批次概览">
      <div class="admin-batch-context-summary__primary">
        <span class="admin-batch-context-summary__label">有效状态</span>
        <strong><AdminStatusPill :status="statusLabel" /></strong>
        <div class="admin-batch-progress" role="progressbar" :aria-label="`批次时间进度 ${progress.percentage}%`" :aria-valuenow="progress.percentage" aria-valuemin="0" aria-valuemax="100" :data-status="progress.status">
          <span :style="{ width: `${progress.percentage}%` }"></span>
        </div>
        <small>{{ isArchived ? "本批次流程已封存" : `按计划时间已完成 ${progress.percentage}%` }}</small>
      </div>
      <div><span class="admin-batch-context-summary__label">计划时间</span><strong>{{ formatRecruitmentBatchPeriod(batch) }}</strong></div>
      <div><span class="admin-batch-context-summary__label">报名人数</span><strong>{{ applicantCount }} 人</strong></div>
      <div><span class="admin-batch-context-summary__label">开放中心</span><strong>{{ openCenterNames.length }} 个</strong><small>{{ openCenterNames.join("、") || "尚未配置" }}</small></div>
      <div><span class="admin-batch-context-summary__label">负责人 / 版本</span><strong>{{ batch.owner || "联盟总负责人" }} · v{{ batch.version ?? 1 }}</strong></div>
    </section>

    <section v-if="isDraft" class="admin-batch-readiness" aria-label="发布准备检查">
      <header><div><span>Publish Readiness</span><h2>发布准备检查</h2></div><p>发布前先解决所有阻塞项，避免提交后才发现批次冲突。</p></header>
      <div class="admin-batch-readiness__body">
        <div :class="['admin-batch-readiness__status', publishReadiness.ok ? 'is-ready' : 'is-blocked']">
          <strong>{{ publishReadiness.ok ? "可以发布" : "暂不可发布" }}</strong>
          <span v-if="publishReadiness.ok">当前批次的报名时间和开放中心配置均可生效。</span>
          <span v-else>{{ getRecruitmentBatchCommandMessage(publishReadiness) }}</span>
        </div>
        <div v-if="!publishReadiness.ok && publishReadiness.code === 'BATCH_SCHEDULE_OVERLAP'" class="admin-batch-readiness__actions">
          <button type="button" class="button button--ghost" @click="openEditor">修改批次时间</button>
          <NuxtLink class="button button--ghost" :to="buildRecruitmentBatchRoute(publishReadiness.conflict?.batchId ?? '')">查看冲突批次</NuxtLink>
        </div>
      </div>
    </section>

    <section class="admin-list-card admin-batch-workspace">
      <header><div><span>Batch Workflow</span><h2>批次工作区</h2></div><p>{{ isArchived ? "归档批次只允许查看和导出" : canManage ? "当前账号具备批次管理权限" : "当前账号仅可查看与处理授权数据" }}</p></header>
      <nav class="admin-batch-context-nav" aria-label="当前批次工作区">
        <NuxtLink v-for="item in workflowItems" :key="item.section" :to="sectionRoute(item.section)" class="admin-batch-workflow-row">
          <span class="admin-batch-workflow-row__step">{{ item.step }}</span>
          <span class="admin-batch-workflow-row__name"><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
          <span class="admin-batch-workflow-row__state"><strong>{{ item.state }}</strong><small>{{ item.detail }}</small></span>
          <span class="admin-batch-workflow-row__count">{{ item.count }}</span>
          <span class="admin-batch-workflow-row__action">{{ item.action }} <span aria-hidden="true">→</span></span>
        </NuxtLink>
      </nav>
    </section>

    <section class="admin-list-card admin-batch-audit">
      <header><div><span>Lifecycle Audit</span><h2>生命周期记录</h2></div><p>原计划时间、操作人和实际执行时间随命令保存</p></header>
      <p v-if="auditRecords.length === 0" class="admin-empty-copy">当前批次尚无生命周期审计记录</p>
      <div v-else class="admin-table-scroll"><table aria-label="批次生命周期审计"><thead><tr><th>操作</th><th>操作人</th><th>状态变化</th><th>原计划开始</th><th>实际时间</th><th>原因</th></tr></thead><tbody><tr v-for="record in auditRecords" :key="auditText(record, 'id')"><td>{{ auditActionLabel(auditText(record, 'action')) }}</td><td>{{ auditText(record, 'actorName', 'actor') }}</td><td>{{ auditStatusLabel(auditText(record, 'beforeStatus', 'before')) }} → {{ auditStatusLabel(auditText(record, 'afterStatus', 'after')) }}</td><td>{{ auditTimestamp(auditText(record, 'originalStartAt')) }}</td><td>{{ auditTimestamp(auditText(record, 'actualAt', 'createdAt')) }}</td><td>{{ auditText(record, 'reason') === 'create recruitment batch' ? '创建招新批次' : auditText(record, 'reason') }}</td></tr></tbody></table></div>
    </section>

    <div v-if="pendingAction" class="admin-modal-backdrop">
      <section role="alertdialog" aria-modal="true" aria-labelledby="batch-action-confirm-title">
        <span>Recruitment Lifecycle</span><h2 id="batch-action-confirm-title">确认{{ actionLabel(pendingAction) }}？</h2>
        <p>该操作会改变当前批次的用户报名入口。操作人、原计划时间、实际执行时间和前后状态会写入生命周期记录。</p>
        <label>操作原因（可选）<textarea v-model="reason" rows="3" placeholder="填写本次批次状态变更原因"></textarea></label>
        <p v-if="actionError" class="admin-save-message admin-save-message--error" role="alert">{{ actionError }}</p>
        <div><button type="button" class="button button--ghost" @click="pendingAction = null">返回检查</button><button type="button" class="button" @click="confirmAction">确认{{ actionLabel(pendingAction) }}</button></div>
      </section>
    </div>

    <div v-if="editOpen" class="admin-drawer-backdrop" @click.self="editOpen = false">
      <aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="编辑招新批次">
        <header class="admin-drawer__header"><div><span>Edit Recruitment Cycle</span><h2>编辑招新批次</h2><p>仅草稿可以编辑，保存后需要重新完成发布准备检查。</p></div><button type="button" aria-label="关闭编辑批次" @click="editOpen = false">×</button></header>
        <div class="admin-drawer__body">
          <div class="admin-form-grid"><label>批次名称<input v-model="editForm.name" required></label><label>负责人<input value="联盟总负责人" readonly></label><label>报名开始时间<input v-model="editForm.startAt" type="date" required></label><label>报名截止时间<input v-model="editForm.endAt" type="date" required></label></div>
          <section class="admin-batch-editor-centers"><header><span>开放中心</span><small>至少选择一个中心</small></header><div class="admin-check-grid"><label v-for="[id, label] in centerOptions" :key="id"><span>{{ label }}</span><input v-model="editForm.openCenterIds" type="checkbox" :value="id"></label></div></section>
          <p v-if="editError" class="admin-save-message admin-save-message--error" role="alert">{{ editError }}</p>
        </div>
        <footer class="admin-drawer__footer"><span>联盟总负责人编辑 · 保存为草稿</span><button type="button" class="button button--ghost" @click="editOpen = false">取消</button><button type="button" class="button" @click="saveEditor">保存修改</button></footer>
      </aside>
    </div>
  </div>
  <div v-else class="admin-recruitment-page admin-section-page"><AdminPageHeading eyebrow="Recruitment Batch Context" title="批次不存在" description="请从招新批次列表重新进入。"><template #actions><NuxtLink class="button" to="/admin/recruitment/batches">返回批次列表</NuxtLink></template></AdminPageHeading></div>
</template>
