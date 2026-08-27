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
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { createProductionRecruitmentBatchController } from "~/composables/useProductionRecruitmentBatch";
import type { UpdateRecruitmentBatchDto } from "../../../../../packages/api-client/src";
import { copyTextToClipboard } from "~/utils/clipboard";
import type { RecruitmentBatchLifecycleEventView } from "~/services/recruitment/recruitment-view-models";
import { useAdminToast } from "~/composables/useAdminToast";

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
interface PendingLifecycleAction {
  action: LifecycleAction;
  batchId: string;
  expectedVersion: number;
}

const route = useRoute();
const runtimeConfig = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
const isMockApi = runtimeConfig.public.useMockApi;
const now = useRecruitmentNow();
const session = useSessionStore();
const batchStore = isMockApi ? useRecruitmentBatchStore() : undefined;
const applicationStore = isMockApi ? useRecruitmentApplicationStore() : undefined;
const assessmentStore = isMockApi ? useRecruitmentAssessmentStore() : undefined;
const recruitmentGateway = useRecruitmentGateway();
const organizationGateway = useOrganizationGateway();
const adminToast = useAdminToast();
const productionBatch = recruitmentGateway
  ? createProductionRecruitmentBatchController(recruitmentGateway)
  : undefined;
const batchId = computed(() => String(route.params.batchId));
if (isMockApi) watch(now, (value) => batchStore?.syncLifecycle(value), { immediate: true });
const centerScope = computed(() => getAdminCenterScope(session.currentAccount?.adminCenterRole));
const batch = computed(() => isMockApi
  ? batchStore?.getBatch(batchId.value) as AdminBatchDetail | undefined
  : productionBatch?.batch.value);
const lifecyclePageCount = computed(() => Math.max(1, Math.ceil(
  (productionBatch?.lifecycleTotal.value ?? 0) / (productionBatch?.lifecyclePageSize.value ?? 50),
)));
function selectLifecyclePage(page: number) {
  if (!isMockApi) void productionBatch?.loadLifecyclePage(page);
}
function canViewCandidate(candidate: { candidate?: AdminCandidate }) {
  return !centerScope.value || Boolean(candidate.candidate && canAccessRecruitmentCandidate(candidate.candidate, centerScope.value));
}
const overviewRoute = computed(() => buildRecruitmentBatchRoute(batchId.value));
const isNestedRoute = computed(() => route.path.replace(/\/+$/, "") !== overviewRoute.value);
const statusKey = computed(() => {
  if (!isMockApi) return productionBatch?.batch.value?.effectiveStatus ?? "closed";
  const effective = batchStore?.effectiveStatus(batchId.value, now.value);
  return effective ?? (batch.value ? getAdminBatchStatus(batch.value) : "closed");
});
const statusLabel = computed(() => getRecruitmentBatchStatusLabel(statusKey.value));
const progress = computed(() => {
  if (!batch.value) return { status: "closed" as const, percentage: 100 };
  if (isMockApi) return getRecruitmentBatchProgress(batch.value as RecruitmentBatch, now.value);
  const start = new Date(batch.value.startAt ?? "").getTime();
  const end = new Date(batch.value.endAt ?? "").getTime();
  const current = now.value.getTime();
  const percentage = Number.isFinite(start) && Number.isFinite(end) && end > start
    ? Math.max(0, Math.min(100, Math.round(((current - start) / (end - start)) * 100)))
    : 0;
  return { status: statusKey.value, percentage };
});
const canManage = computed(() => canManageRecruitmentBatch(
  session.currentAccount
    ? { account: session.currentAccount.account, name: session.currentAccount.name, level: session.adminLevel as "admin" | "owner" }
    : undefined,
));
const isArchived = computed(() => statusKey.value === "archived");
const isDraft = computed(() => statusKey.value === "draft");
const assessmentPublished = computed(() => Boolean(
  (batchStore as unknown as { assessmentPublishedAt?: Record<string, string> } | undefined)?.assessmentPublishedAt?.[batchId.value],
));
const assessmentStarted = computed(() => Boolean(
  (batchStore as unknown as { assessmentStartedAt?: Record<string, string> } | undefined)?.assessmentStartedAt?.[batchId.value],
));
const canReopen = computed(() => isMockApi && statusKey.value === "closed" && !assessmentPublished.value && !assessmentStarted.value);
const pendingAction = ref<PendingLifecycleAction | null>(null);
const reason = ref("");
const actionMessage = ref("");
const actionError = ref("");
const selectedLifecycleEvent = ref<RecruitmentBatchLifecycleEventView>();
const lifecycleCopyMessage = ref("");
const canConfirmPendingAction = computed(() => {
  if (!pendingAction.value) return false;
  if (isMockApi) return true;
  return lifecycleActionIssue(pendingAction.value.action) === undefined
    && (pendingAction.value.action !== "archive" || archiveConfirmationIssue(pendingAction.value) === undefined);
});
const editOpen = ref(false);
const editError = ref("");
const productionCenterOptions = ref<ReadonlyArray<readonly [string, string]>>([]);
// Keep the transient toast scoped to the current page.  Some lightweight
// route fixtures (and older Nuxt test harnesses) expose only `path`, while
// the real router provides `fullPath`; accepting both keeps navigation
// cleanup consistent without changing runtime behaviour.
watch(() => route.fullPath ?? route.path, () => adminToast.dismiss());
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
const availableCenterOptions = computed<ReadonlyArray<readonly [string, string]>>(() => isMockApi ? centerOptions : productionCenterOptions.value);

const applications = computed(() => batch.value
  ? applicationStore?.getApplicationsForBatch(batchId.value)
    .filter((application) => !centerScope.value || application.firstChoice === centerScope.value)
    ?? []
  : []);
const candidates = computed(() => batch.value
  ? assessmentStore?.getCandidates(batchId.value)
    .filter(canViewCandidate)
    ?? []
  : []);
const actionableCandidates = computed(() => batch.value
  ? assessmentStore?.getActionableCandidates(batchId.value)
    .filter(canViewCandidate)
    ?? []
  : []);
const publicationSummary = computed(() => batch.value
  ? assessmentStore?.getPublicationSummary(batchId.value, canViewCandidate)
    ?? { total: 0, ready: 0, pending: 0, admitted: 0, notAdmitted: 0, canPublish: false }
  : { total: 0, ready: 0, pending: 0, admitted: 0, notAdmitted: 0, canPublish: false });
const applicantCount = computed(() => !isMockApi
  ? productionBatch?.batch.value?.applicationCount ?? 0
  : Math.max(applications.value.length, candidates.value.length));
const publishReadiness = computed(() => batch.value && isDraft.value && isMockApi
  ? batchStore?.getPublishReadiness(batchId.value, now.value) ?? { ok: false }
  : { ok: false });
const openCenterNames = computed(() => !isMockApi
  ? productionBatch?.batch.value?.openCenters.map((center) => `${center.name}${center.active ? "" : "（已停用）"}`) ?? []
  : (batch.value?.openCenterIds ?? []).map((id) => centerOptions.find(([centerId]) => centerId === id)?.[1] ?? id));

const workflowItems = computed(() => [
  {
    step: "01",
    title: "报名名单",
    description: "查看报名资料、筛选与导出",
    state: !isMockApi ? "服务端名单已接入" : isArchived.value ? "已封存" : statusKey.value === "open" ? "报名收集中" : statusKey.value === "paused" ? "报名已暂停" : statusKey.value === "closed" ? "报名已结束" : "等待报名",
    detail: !isMockApi ? `批次 API 已报告 ${applicantCount.value} 人；名单支持服务端筛选、分页与详情` : `${applicantCount.value} 人${statusKey.value === "open" ? " · 报名入口已开放" : statusKey.value === "paused" ? " · 可恢复报名" : ""}`,
    count: `${applicantCount.value} 人`,
    section: "applications" as const,
    action: isArchived.value ? "查看名单" : "进入名单",
  },
  {
    step: "02",
    title: "预备成员考核",
    description: "分阶段审批、调剂与推进",
    state: !isMockApi ? "服务端考核已接入" : isArchived.value ? "已完成" : actionableCandidates.value.length > 0 ? "有待处理人员" : statusKey.value === "draft" ? "批次发布后开启" : "尚未开始",
    detail: !isMockApi ? "考核台读取服务端候选人、轮次和版本，并提交真实结果" : `${actionableCandidates.value.length} 人待处理 · ${candidates.value.length} 人进入本批次`,
    count: !isMockApi ? "服务端" : `${candidates.value.length} 人`,
    section: "assessment" as const,
    action: isArchived.value ? "查看记录" : "进入考核台",
  },
  {
    step: "03",
    title: "结果发布",
    description: "核对名单并发布用户端结果",
    state: !isMockApi ? "服务端发布已接入" : isArchived.value ? "已发布" : publicationSummary.value.canPublish ? "满足发布条件" : "等待考核完成",
    detail: !isMockApi ? "发布台读取服务端考核状态，并由服务器执行最终事务校验" : `${publicationSummary.value.ready} 人已形成结果 · ${publicationSummary.value.pending} 人待处理`,
    count: !isMockApi ? "服务端" : publicationSummary.value.total ? `${publicationSummary.value.ready}/${publicationSummary.value.total}` : "—",
    section: "publish" as const,
    action: isArchived.value ? "查看结果" : "进入结果发布",
  },
]);

const auditRecords = computed(() => {
  if (!isMockApi) return [];
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

function archiveConfirmationIssue(context: PendingLifecycleAction): string | undefined {
  if (context.action !== "archive" || !productionBatch) {
    return "当前详情页尚未接入真实批次状态命令。";
  }
  if (context.batchId !== batchId.value) {
    return "归档确认不属于当前批次，请重新确认。";
  }
  if (session.adminLevel !== "owner" || !canManage.value) {
    return "只有联盟总负责人可以归档批次。";
  }
  const currentBatch = productionBatch.batch.value;
  if (!currentBatch || statusKey.value !== "closed" || currentBatch.archivedAt) {
    return "只有服务端判定为已关闭的批次才能提交归档确认。";
  }
  if (context.expectedVersion !== currentBatch.version) {
    return "归档确认版本已失效，请根据当前版本重新确认。";
  }
  return undefined;
}

function lifecycleActionIssue(action: LifecycleAction): string | undefined {
  if (isMockApi || !productionBatch?.batch.value) return undefined;
  const current = productionBatch.batch.value;
  const allowed: Record<LifecycleAction, readonly string[]> = {
    publish: ["draft"],
    openNow: ["upcoming"],
    pause: ["open"],
    resume: ["paused"],
    close: ["open", "paused"],
    reopen: ["closed"],
    archive: ["closed"],
  };
  if (allowed[action].includes(current.effectiveStatus)) return undefined;
  const statusLabels: Record<string, string> = {
    draft: "草稿",
    upcoming: "待开始",
    open: "报名开放中",
    paused: "报名已暂停",
    closed: "报名已关闭",
    archived: "批次已归档",
  };
  const actionLabels: Record<LifecycleAction, string> = {
    publish: "发布批次",
    openNow: "立即开放",
    pause: "暂停报名",
    resume: "恢复报名",
    close: "提前关闭",
    reopen: "重新开放",
    archive: "归档批次",
  };
  return `当前状态为“${statusLabels[current.effectiveStatus] ?? current.effectiveStatus}”，不能${actionLabels[action]}。请刷新后重试。`;
}

function clearActionState() {
  pendingAction.value = null;
  reason.value = "";
  actionMessage.value = "";
  actionError.value = "";
}

function requestAction(action: LifecycleAction) {
  actionError.value = "";
  actionMessage.value = "";
  if (!isMockApi) {
    if (!canManage.value) {
      actionError.value = "只有联盟总负责人可以修改批次状态。";
      return;
    }
    const statusIssue = lifecycleActionIssue(action);
    if (statusIssue) {
      actionError.value = statusIssue;
      return;
    }
    const expectedVersion = productionBatch?.batch.value?.version;
    if (!Number.isInteger(expectedVersion) || (expectedVersion ?? 0) < 1) {
      actionError.value = "当前批次版本无效，无法提交状态确认。";
      return;
    }
    pendingAction.value = { action, batchId: batchId.value, expectedVersion: expectedVersion as number };
    return;
  }
  if (!canManage.value) {
    actionError.value = "只有联盟总负责人可以修改批次状态。";
    return;
  }
  if (action === "publish" && !publishReadiness.value.ok) {
    actionError.value = getRecruitmentBatchCommandMessage(publishReadiness.value);
    return;
  }
  pendingAction.value = {
    action,
    batchId: batchId.value,
    expectedVersion: batch.value?.version ?? 1,
  };
}

async function invokeAction(context: PendingLifecycleAction) {
  const action = context.action;
  if (!isMockApi) {
    if (!productionBatch) return;
    if (action === "archive") {
      const issue = archiveConfirmationIssue(context);
      if (issue) { actionError.value = issue; return; }
      const result = await productionBatch.archive({ batchId: context.batchId, expectedVersion: context.expectedVersion, reason: reason.value });
      if (context.batchId !== batchId.value || pendingAction.value !== context) return;
      actionError.value = getRecruitmentBatchCommandMessage({ message: productionBatch.archiveError.value });
      if (!result.archived) {
        if (productionBatch.archiveStatus.value === "conflict") {
          const refreshedVersion = productionBatch.batch.value?.version;
          if (Number.isInteger(refreshedVersion) && (refreshedVersion ?? 0) > 0) pendingAction.value = { ...context, expectedVersion: refreshedVersion as number };
          if (statusKey.value !== "closed" || productionBatch.batch.value?.archivedAt) actionError.value = "批次版本已变化，最新状态不再允许归档，不能再次提交。";
        }
        return;
      }
      actionMessage.value = result.lifecycleRefreshed ? "归档批次已完成，状态和生命周期记录已刷新。" : "归档批次已完成。";
      adminToast.success(actionMessage.value);
    } else {
      const command = action === "openNow" ? "open-now" : action;
      const ok = await productionBatch.runCommand(command, action === "pause" || action === "close" ? undefined : reason.value, context.expectedVersion);
      if (context.batchId !== batchId.value || pendingAction.value !== context) return;
      if (!ok) {
        actionError.value = getRecruitmentBatchCommandMessage({ message: productionBatch.commandError.value });
        const refreshedVersion = productionBatch.batch.value?.version;
        if (refreshedVersion && refreshedVersion !== context.expectedVersion) {
          pendingAction.value = { ...context, expectedVersion: refreshedVersion };
        }
        return;
      }
      actionMessage.value = productionBatch.commandLifecycleRefreshed.value
        ? `${actionLabel(action)}已完成，状态和生命周期记录已刷新。`
        : `${actionLabel(action)}已完成，批次状态已更新，但生命周期记录刷新失败，请稍后重试。`;
      adminToast.success(actionMessage.value);
    }
    pendingAction.value = null;
    reason.value = "";
    return;
  }
  if (!batchStore) return;
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
      ? (method as (id: string, confirmed: boolean, now: Date, reason?: string) => unknown).call(batchStore, context.batchId, true, currentTime, rationale)
      : (method as (id: string, now?: Date, reason?: string) => unknown).call(batchStore, context.batchId, currentTime, rationale);
    if (result === false || (result && typeof result === "object" && "ok" in result && !(result as { ok: boolean }).ok)) {
      throw new Error("BATCH_COMMAND_FAILED");
    }
    actionMessage.value = `${actionLabel(action)}已完成，状态和生命周期记录已刷新。`;
    adminToast.success(actionMessage.value);
    pendingAction.value = null;
    reason.value = "";
  } catch (error) {
    const isBusinessFailure = action === "publish" || Boolean((error as { code?: string })?.code);
    actionError.value = getRecruitmentBatchCommandMessage(error);
    if (isBusinessFailure) pendingAction.value = null;
  }
}

function confirmAction() {
  if (!pendingAction.value) return;
  if (!isMockApi && pendingAction.value.action === "archive") {
    const issue = archiveConfirmationIssue(pendingAction.value);
    if (issue) {
      actionError.value = issue;
      return;
    }
  }
  if (!isMockApi) {
    const issue = lifecycleActionIssue(pendingAction.value.action);
    if (issue) {
      actionError.value = issue;
      return;
    }
  }
  void invokeAction(pendingAction.value);
}

function lifecycleSnapshotSummary(snapshot: Record<string, unknown> | null) {
  if (!snapshot) return "—";
  const status = lifecycleSnapshotValue(snapshot.lifecycleStatus);
  const override = lifecycleSnapshotValue(snapshot.manualOverride);
  const version = lifecycleSnapshotValue(snapshot.version);
  return [status !== "空" ? `状态：${status}` : "", override !== "空" ? `覆盖：${override}` : "", version !== "空" ? `v${version}` : ""]
    .filter(Boolean)
    .join(" · ") || "已记录变更";
}

function showLifecycleDetails(record: RecruitmentBatchLifecycleEventView) {
  selectedLifecycleEvent.value = record;
  lifecycleCopyMessage.value = "";
}

function closeLifecycleDetails() {
  selectedLifecycleEvent.value = undefined;
  lifecycleCopyMessage.value = "";
}

async function copyLifecycleTarget(id: string) {
  lifecycleCopyMessage.value = await copyTextToClipboard(id) ? "批次标识已复制" : "复制失败，请重试";
  if (lifecycleCopyMessage.value === "批次标识已复制") adminToast.success(lifecycleCopyMessage.value);
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

async function saveEditor() {
  if (!batch.value) return;
  try {
    const payload = {
      name: editForm.name,
      startAt: toDateTime(editForm.startAt),
      endAt: toDateTime(editForm.endAt, true),
      openCenterIds: editForm.openCenterIds,
    };
    if (!isMockApi) {
      if (!productionBatch) return;
      const saved = await productionBatch.updateDraft({ ...payload, expectedVersion: batch.value.version ?? 1, reason: "更新招新批次草稿" } satisfies UpdateRecruitmentBatchDto);
      if (!saved) throw new Error(productionBatch.commandError.value || "批次草稿保存失败");
    } else {
      if (!batchStore) return;
      batchStore.updateBatch(batchId.value, payload, "更新招新批次草稿");
    }
    editOpen.value = false;
    editError.value = "";
    actionMessage.value = "批次草稿已更新，请重新完成发布检查。";
    adminToast.success(actionMessage.value);
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

function lifecycleActionLabel(action: string) {
  return ({
    "recruitment.batch.created": "创建批次",
    "recruitment.batch.updated": "更新批次",
    "recruitment.batch.published": "发布批次",
    "recruitment.batch.opened": "立即开放",
    "recruitment.batch.paused": "暂停报名",
    "recruitment.batch.resumed": "恢复报名",
    "recruitment.batch.closed": "提前关闭",
    "recruitment.batch.reopened": "重新开放",
    "recruitment.batch.archived": "归档批次",
  } as Record<string, string>)[action] ?? action;
}

function lifecycleTargetLabel(type: string) {
  return type === "RecruitmentBatch" ? "招新批次" : type === "RecruitmentApplication" ? "报名记录" : type;
}

const lifecycleSnapshotLabels = {
  name: "名称",
  startAt: "开始时间",
  endAt: "结束时间",
  timezone: "时区",
  lifecycleStatus: "生命周期状态",
  manualOverride: "人工覆盖",
  version: "版本",
  openCenterIds: "开放中心",
  responsibleAccountIds: "负责人账号",
} as const;

function lifecycleSnapshotEntries(snapshot: Record<string, unknown> | null) {
  if (!snapshot) return [];
  return Object.entries(lifecycleSnapshotLabels)
    .filter(([key]) => Object.hasOwn(snapshot, key))
    .map(([key, label]) => ({ key, label, value: lifecycleSnapshotValue(snapshot[key]) }));
}

function lifecycleSnapshotValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => lifecycleSnapshotValue(item)).join("、") || "空列表";
  if (value === null || value === undefined || value === "") return "空";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function lifecycleStateMessage(status: string | undefined) {
  if (status === "unauthorized") return "登录状态已失效，无法读取生命周期记录。";
  if (status === "forbidden") return "当前账号无权读取该批次的生命周期记录。";
  if (status === "notFound") return "生命周期记录所属批次不存在。";
  if (status === "unavailable") return "真实生命周期记录接口暂不可用。";
  return "生命周期记录读取失败，请稍后重试。";
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

function lifecycleSnapshotEntriesForEvent(snapshot: RecruitmentBatchLifecycleEventView["before"]) {
  return lifecycleSnapshotEntries(snapshot as Record<string, unknown> | null);
}

async function loadProductionBatch() {
  if (!isMockApi) await productionBatch?.load(batchId.value);
}

onMounted(loadProductionBatch);
onMounted(async () => {
  if (!isMockApi && organizationGateway) {
    try {
      const response = await organizationGateway.listCenters();
      productionCenterOptions.value = response.items.filter((center) => center.active).map((center) => [center.id, center.name] as const);
    } catch {
      productionCenterOptions.value = [];
    }
  }
});
watch(batchId, () => {
  clearActionState();
  void loadProductionBatch();
});

useHead(() => ({ title: `${batch.value?.name ?? "招新批次"}｜HSD 管理台` }));
</script>

<template>
  <NuxtPage v-if="isNestedRoute" />
  <div v-else-if="batch" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="招新批次"
      :title="batch.name"
      :description="!isMockApi ? `当前展示 ${batch.name} 的真实批次概要、生命周期与工作区。` : isArchived ? '归档批次仅供追溯与导出，数据和流程状态不可修改。' : `所有报名、考核、结果发布和导出均限定在 ${batch.name} 内。`"
    >
      <template #actions>
        <div class="admin-batch-actions">
          <NuxtLink class="button button--ghost" to="/admin/recruitment/batches">返回批次列表</NuxtLink>
          <NuxtLink class="button button--ghost" to="/join">查看用户端页面</NuxtLink>
          <button v-if="isDraft && canManage" type="button" class="button button--ghost" @click="openEditor">编辑批次</button>
          <button v-if="isMockApi && statusKey === 'draft'" type="button" class="button" :disabled="!canManage || !publishReadiness.ok" @click="requestAction('publish')">发布批次</button>
          <button v-if="isMockApi && statusKey === 'upcoming'" type="button" class="button" :disabled="!canManage" @click="requestAction('openNow')">立即开放</button>
          <button v-if="isMockApi && statusKey === 'open'" type="button" class="button button--ghost" :disabled="!canManage" @click="requestAction('pause')">暂停报名</button>
          <button v-if="isMockApi && statusKey === 'paused'" type="button" class="button" :disabled="!canManage" @click="requestAction('resume')">恢复报名</button>
          <button v-if="isMockApi && (statusKey === 'open' || statusKey === 'paused')" type="button" class="button button--ghost" :disabled="!canManage" @click="requestAction('close')">提前关闭</button>
          <button v-if="canReopen" type="button" class="button button--ghost" :disabled="!canManage" @click="requestAction('reopen')">重新开放</button>
          <button v-if="isMockApi && statusKey === 'closed'" type="button" class="button" :disabled="!canManage" @click="requestAction('archive')">归档批次</button>
          <button v-if="!isMockApi && statusKey === 'draft' && canManage" type="button" class="button" @click="requestAction('publish')">发布批次</button>
          <button v-if="!isMockApi && statusKey === 'upcoming' && canManage" type="button" class="button" @click="requestAction('openNow')">立即开放</button>
          <button v-if="!isMockApi && statusKey === 'open' && canManage" type="button" class="button button--ghost" @click="requestAction('pause')">暂停报名</button>
          <button v-if="!isMockApi && statusKey === 'paused' && canManage" type="button" class="button" @click="requestAction('resume')">恢复报名</button>
          <button v-if="!isMockApi && (statusKey === 'open' || statusKey === 'paused') && canManage" type="button" class="button button--ghost" @click="requestAction('close')">提前关闭</button>
          <button v-if="!isMockApi && statusKey === 'closed' && canManage" type="button" class="button button--ghost" @click="requestAction('reopen')">重新开放</button>
          <button v-if="!isMockApi && statusKey === 'closed' && canManage" type="button" class="button" :disabled="productionBatch?.archiving.value" @click="requestAction('archive')">归档批次</button>
        </div>
      </template>
    </AdminPageHeading>

    <p v-if="actionError" class="admin-save-message admin-save-message--error" role="alert">{{ actionError }}</p>
    <p v-if="!isMockApi && productionBatch?.commandError.value" class="admin-save-message admin-save-message--error" role="alert">{{ productionBatch.commandError.value }}</p>

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
      <div><span class="admin-batch-context-summary__label">负责人 / 版本</span><strong>{{ batch.owner || "未分配" }} · v{{ batch.version ?? 1 }}</strong></div>
    </section>

    <section v-if="isMockApi && isDraft" class="admin-batch-readiness" aria-label="发布准备检查">
      <header><div><span>发布准备</span><h2>发布准备检查</h2></div><p>发布前先解决所有阻塞项，避免提交后才发现批次冲突。</p></header>
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
      <header><div><span>批次流程</span><h2>批次工作区</h2></div><p>{{ isArchived ? "归档批次只允许查看和导出" : canManage ? "当前账号具备批次管理权限" : "当前账号仅可查看与处理授权数据" }}</p></header>
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

    <section class="admin-list-card admin-batch-audit" aria-label="生命周期记录">
      <header><div><span>生命周期记录</span><h2>生命周期记录</h2></div><p v-if="!isMockApi">共 {{ productionBatch?.lifecycleTotal.value ?? 0 }} 条 · 第 {{ productionBatch?.lifecyclePage.value ?? 1 }} / {{ lifecyclePageCount }} 页</p><p v-else>原计划时间、操作人和实际执行时间随命令保存</p></header>
      <p v-if="!isMockApi && productionBatch?.lifecycleStatus.value === 'loading'" class="admin-empty-copy">正在读取生命周期记录…</p>
      <p v-else-if="!isMockApi && productionBatch?.lifecycleStatus.value === 'empty'" class="admin-empty-copy">当前批次暂无生命周期记录。</p>
      <p v-else-if="!isMockApi && productionBatch?.lifecycleStatus.value !== 'success'" class="admin-save-message admin-save-message--error" role="alert">{{ lifecycleStateMessage(productionBatch?.lifecycleStatus.value) }}</p>
      <div v-else-if="!isMockApi" class="admin-table-scroll">
        <table aria-label="真实批次生命周期记录">
          <thead><tr><th>操作</th><th>操作人</th><th>目标</th><th>变更前摘要</th><th>变更后摘要</th><th>实际时间</th><th>原因</th><th><span class="sr-only">详情</span></th></tr></thead>
          <tbody>
            <tr v-for="record in productionBatch?.lifecycleEvents.value ?? []" :key="record.id">
              <td><strong>{{ lifecycleActionLabel(record.action) }}</strong></td>
              <td>{{ record.actorDisplayName }}</td>
              <td><span class="admin-lifecycle-target">{{ lifecycleTargetLabel(record.target.type) }}</span></td>
              <td>{{ lifecycleSnapshotSummary(record.before) }}</td>
              <td>{{ lifecycleSnapshotSummary(record.after) }}</td>
              <td>{{ auditTimestamp(record.createdAt) }}</td>
              <td>{{ record.reason || "—" }}</td>
              <td><button type="button" class="admin-inline-copy" @click="showLifecycleDetails(record)">查看详情</button></td>
            </tr>
          </tbody>
        </table>
        <p v-if="lifecycleCopyMessage && lifecycleCopyMessage !== '批次标识已复制'" class="admin-inline-note" role="status">{{ lifecycleCopyMessage }}</p>
      </div>
      <p v-else-if="auditRecords.length === 0" class="admin-empty-copy">当前批次尚无生命周期审计记录</p>
      <div v-else class="admin-table-scroll"><table aria-label="批次生命周期审计"><thead><tr><th>操作</th><th>操作人</th><th>状态变化</th><th>原计划开始</th><th>实际时间</th><th>原因</th></tr></thead><tbody><tr v-for="record in auditRecords" :key="auditText(record, 'id')"><td>{{ auditActionLabel(auditText(record, 'action')) }}</td><td>{{ auditText(record, 'actorName', 'actor') }}</td><td>{{ auditStatusLabel(auditText(record, 'beforeStatus', 'before')) }} → {{ auditStatusLabel(auditText(record, 'afterStatus', 'after')) }}</td><td>{{ auditTimestamp(auditText(record, 'originalStartAt')) }}</td><td>{{ auditTimestamp(auditText(record, 'actualAt', 'createdAt')) }}</td><td>{{ auditText(record, 'reason') === 'create recruitment batch' ? '创建招新批次' : auditText(record, 'reason') }}</td></tr></tbody></table></div>
      <PaginationControls
        v-if="!isMockApi"
        :model-value="productionBatch?.lifecyclePage.value ?? 1"
        :page-count="lifecyclePageCount"
        label="生命周期记录分页"
        @update:model-value="selectLifecyclePage"
      />
    </section>

    <div v-if="pendingAction" class="admin-modal-backdrop">
      <section role="alertdialog" aria-modal="true" aria-labelledby="batch-action-confirm-title">
        <span>批次生命周期</span><h2 id="batch-action-confirm-title">确认{{ actionLabel(pendingAction.action) }}？</h2>
        <p>该操作会改变当前批次的用户报名入口。操作人、原计划时间、实际执行时间和前后状态会写入生命周期记录。</p>
        <label v-if="pendingAction.action !== 'pause' && pendingAction.action !== 'close'">操作原因（可选）<textarea v-model="reason" rows="3" maxlength="500" placeholder="填写本次批次状态变更原因"></textarea></label>
        <p v-if="actionError" class="admin-save-message admin-save-message--error" role="alert">{{ actionError }}</p>
        <div><button type="button" class="button button--ghost" :disabled="productionBatch?.archiving.value && pendingAction.action === 'archive'" @click="clearActionState">返回检查</button><button type="button" class="button" :disabled="(productionBatch?.archiving.value && pendingAction.action === 'archive') || !canConfirmPendingAction" @click="confirmAction">确认{{ actionLabel(pendingAction.action) }}</button></div>
      </section>
    </div>

    <div v-if="selectedLifecycleEvent" class="admin-drawer-backdrop" @click.self="closeLifecycleDetails">
      <aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="生命周期详情">
        <header class="admin-drawer__header"><div><span>生命周期详情</span><h2>{{ lifecycleActionLabel(selectedLifecycleEvent.action) }}</h2><p>{{ auditTimestamp(selectedLifecycleEvent.createdAt) }} · {{ selectedLifecycleEvent.actorDisplayName }}</p></div><button type="button" aria-label="关闭生命周期详情" @click="closeLifecycleDetails">×</button></header>
        <div class="admin-drawer__body">
          <section><header><span>01</span><h3>目标</h3></header><dl class="admin-detail-grid"><div><dt>类型</dt><dd>{{ lifecycleTargetLabel(selectedLifecycleEvent.target.type) }}</dd></div><div v-if="selectedLifecycleEvent.reason"><dt>原因</dt><dd>{{ selectedLifecycleEvent.reason }}</dd></div></dl></section>
          <section><header><span>02</span><h3>变更前</h3></header><dl class="admin-detail-grid"><div v-for="entry in lifecycleSnapshotEntriesForEvent(selectedLifecycleEvent.before)" :key="entry.key"><dt>{{ entry.label }}</dt><dd class="admin-breakable-id">{{ entry.value }}</dd></div><div v-if="!selectedLifecycleEvent.before"><dd>—</dd></div></dl></section>
          <section><header><span>03</span><h3>变更后</h3></header><dl class="admin-detail-grid"><div v-for="entry in lifecycleSnapshotEntriesForEvent(selectedLifecycleEvent.after)" :key="entry.key"><dt>{{ entry.label }}</dt><dd class="admin-breakable-id">{{ entry.value }}</dd></div><div v-if="!selectedLifecycleEvent.after"><dd>—</dd></div></dl></section>
          <p v-if="lifecycleCopyMessage && lifecycleCopyMessage !== '批次标识已复制'" class="admin-inline-note" role="status">{{ lifecycleCopyMessage }}</p>
        </div>
        <footer class="admin-drawer__footer"><button type="button" class="button" @click="closeLifecycleDetails">关闭</button></footer>
      </aside>
    </div>

    <div v-if="editOpen" class="admin-drawer-backdrop" @click.self="editOpen = false">
      <aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="编辑招新批次">
        <header class="admin-drawer__header"><div><span>编辑批次</span><h2>编辑招新批次</h2><p>仅草稿可以编辑，保存后需要重新完成发布准备检查。</p></div><button type="button" aria-label="关闭编辑批次" @click="editOpen = false">×</button></header>
        <div class="admin-drawer__body">
          <div class="admin-form-grid"><label>批次名称<input v-model="editForm.name" required></label><label>负责人<input value="联盟总负责人" readonly></label><label>报名开始时间<input v-model="editForm.startAt" type="date" required></label><label>报名截止时间<input v-model="editForm.endAt" type="date" required></label></div>
          <section class="admin-batch-editor-centers"><header><span>开放中心</span><small>至少选择一个中心</small></header><div class="admin-check-grid"><label v-for="[id, label] in availableCenterOptions" :key="id"><span>{{ label }}</span><input v-model="editForm.openCenterIds" type="checkbox" :value="id"></label></div></section>
          <p v-if="editError" class="admin-save-message admin-save-message--error" role="alert">{{ editError }}</p>
        </div>
        <footer class="admin-drawer__footer"><span>联盟总负责人编辑 · 保存为草稿</span><button type="button" class="button button--ghost" @click="editOpen = false">取消</button><button type="button" class="button" @click="saveEditor">保存修改</button></footer>
      </aside>
    </div>
  </div>
  <div v-else class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="招新批次"
      :title="!isMockApi && productionBatch?.loading.value ? '正在读取批次…' : !isMockApi && productionBatch?.error.value ? '批次读取失败' : '批次不存在'"
      :description="!isMockApi && productionBatch?.error.value ? productionBatch.error.value : '请从招新批次列表重新进入。'"
    >
      <template #actions><button v-if="!isMockApi && productionBatch?.error.value" type="button" class="button button--ghost" @click="loadProductionBatch">重新读取</button><NuxtLink class="button" to="/admin/recruitment/batches">返回批次列表</NuxtLink></template>
    </AdminPageHeading>
  </div>
</template>
