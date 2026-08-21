import { getContentOverview } from "../../data/admin-content";
import { ADMIN_ASSETS } from "../../data/admin-assets";
import { ADMIN_CANDIDATES } from "../../data/recruitment-admin";
import { type RecruitmentCenter } from "../../data/recruitment-application";
import type { RecruitmentBatch } from "../../types/recruitment-batch";
import type {
  AdminDashboardSnapshot,
  DashboardCapability,
  DashboardOperator,
  DashboardTask,
  DashboardWarning,
  RecruitmentDashboardContext,
} from "../../types/admin-dashboard";
import { getEffectiveRecruitmentBatchStatus } from "../../utils/recruitment-batch-rules";
import { getAssessmentProcessingStatus } from "../../utils/recruitment-assessment-rules";
import { useActivitiesStore } from "../../stores/activities";
import { usePortalConfigStore } from "../../stores/portal-config";
import { usePortalContentStore } from "../../stores/portal-content";
import { useRecruitmentApplicationStore } from "../../stores/recruitment-application";
import { useRecruitmentAssessmentStore } from "../../stores/recruitment-assessment";
import { useRecruitmentBatchStore } from "../../stores/recruitment-batch";
import { useSessionStore } from "../../stores/session";
import type { AdminDashboardGateway, DashboardSnapshotOptions } from "./dashboard-gateway";
import {
  canAccessPortalContent,
  getAdminCenterScope,
  getRecruitmentCenterId,
} from "../../utils/admin-center-scope";

export interface OperatingRecruitmentBatch {
  batch: RecruitmentBatch;
  reason: "open" | "paused" | "unfinished-work" | "upcoming";
}

export interface AssessmentWorkSummary {
  total: number;
  pending: number;
  adjustmentPending: number;
  canPublish: boolean;
}

function sortByNewestEnd(left: RecruitmentBatch, right: RecruitmentBatch) {
  return Date.parse(right.endAt) - Date.parse(left.endAt);
}

export function selectOperatingRecruitmentBatch(
  batches: readonly RecruitmentBatch[],
  getAssessmentWork: (batchId: string) => AssessmentWorkSummary,
  now: Date = new Date(),
): OperatingRecruitmentBatch | undefined {
  const effective = batches.map((batch) => ({
    batch,
    status: getEffectiveRecruitmentBatchStatus(batch, now).status,
  }));
  const open = effective.find((item) => item.status === "open");
  if (open) return { batch: open.batch, reason: "open" };

  const paused = effective.find((item) => item.status === "paused");
  if (paused) return { batch: paused.batch, reason: "paused" };

  const unfinished = effective
    .filter((item) => item.status === "closed")
    .filter((item) => {
      const assessment = getAssessmentWork(item.batch.id);
      return assessment.pending > 0 || assessment.canPublish;
    })
    .sort((left, right) => sortByNewestEnd(left.batch, right.batch))[0];
  if (unfinished) return { batch: unfinished.batch, reason: "unfinished-work" };

  const upcoming = effective
    .filter((item) => item.status === "upcoming")
    .sort((left, right) => Date.parse(left.batch.startAt) - Date.parse(right.batch.startAt))[0];
  return upcoming ? { batch: upcoming.batch, reason: "upcoming" } : undefined;
}

function getCapabilities(): DashboardOperator {
  const session = useSessionStore();
  const account = session.currentAccount;
  if (!session.isAuthenticated || !account) {
    return { id: "unauthenticated", name: "未登录", level: "member", capabilities: [] };
  }
  if (session.adminLevel === "owner") {
    return {
      id: account.account,
      name: account.name,
      level: "owner",
      capabilities: [
        "recruitment.batch.manage",
        "recruitment.assessment.edit",
        "recruitment.result.publish",
        "content.create",
        "content.review",
        "content.publish",
        "portal.configure",
        "portal.publish",
        "member.create",
      ],
    };
  }
  if (session.canAccessAdmin) {
    return {
      id: account.account,
      name: account.name,
      level: "admin",
      ...(account.adminCenterRole ? { centerRole: account.adminCenterRole } : {}),
      capabilities: ["recruitment.assessment.edit", "content.create"],
    };
  }
  return { id: account.account, name: account.name, level: "member", capabilities: [] };
}

function hasCapability(operator: DashboardOperator, capability: DashboardCapability): boolean {
  return operator.capabilities.includes(capability);
}

function getCenterScope(operator: DashboardOperator): RecruitmentCenter | undefined {
  return getAdminCenterScope(operator.centerRole);
}

function buildWarnings(operator: DashboardOperator): DashboardWarning[] {
  const batchStore = useRecruitmentBatchStore();
  const activitiesStore = useActivitiesStore();
  const contentStore = usePortalContentStore();
  const configStore = usePortalConfigStore();
  const warnings: DashboardWarning[] = [];
  if (operator.level === "owner" && batchStore.automationFailures.length) {
    warnings.push({
      code: "RECRUITMENT_AUTOMATION_FAILURE",
      level: "warning",
      title: "招新门户自动化待处理",
      count: batchStore.automationFailures.length,
      target: { module: "content", action: "automation" },
    });
  }
  if (operator.level === "owner" && activitiesStore.automationFailures.length) {
    warnings.push({
      code: "ACTIVITY_AUTOMATION_FAILURE",
      level: "warning",
      title: "活动门户自动化待处理",
      count: activitiesStore.automationFailures.length,
      target: { module: "content", action: "automation" },
    });
  }
  const unresolvedContentFailures = contentStore.automationFailures.filter((failure) => !failure.resolvedAt);
  if (operator.level === "owner" && unresolvedContentFailures.length) {
    warnings.push({
      code: "PORTAL_CONTENT_AUTOMATION_FAILURE",
      level: "warning",
      title: "门户内容自动化待处理",
      count: unresolvedContentFailures.length,
      target: { module: "content", action: "automation" },
    });
  }
  if (contentStore.persistenceError) {
    warnings.push({
      code: contentStore.persistenceError,
      level: "error",
      title: "门户内容暂未保存",
      count: 1,
      target: { module: "content", action: "list" },
    });
  }
  if (hasCapability(operator, "portal.configure") && configStore.persistenceError) {
    warnings.push({
      code: configStore.persistenceError,
      level: "error",
      title: "门户配置暂未保存",
      count: 1,
      target: { module: "portal", action: "configure" },
    });
  }
  return warnings;
}

function buildReadOnlyAssessmentSummary(
  batchId: string,
  centerScope: RecruitmentCenter | undefined,
): AssessmentWorkSummary {
  const assessmentStore = useRecruitmentAssessmentStore();
  const existing = assessmentStore.batches[batchId];
  if (existing) {
    const records = existing.records.filter((record) => !centerScope || record.center === centerScope);
    const processing = records.map(getAssessmentProcessingStatus);
    const pending = processing.filter((status) => (
      status === "assessing" || status === "adjustment-suggestion-pending"
    )).length;
    return {
      total: records.length,
      pending,
      adjustmentPending: processing.filter((status) => status === "adjustment-suggestion-pending").length,
      canPublish: existing.status === "ready-to-publish" && pending === 0,
    };
  }

  const applications = useRecruitmentApplicationStore().getApplicationsForBatch(batchId)
    .filter((application) => !centerScope || application.firstChoice === centerScope);
  const candidates = ADMIN_CANDIDATES.filter((candidate) => (
    (candidate.batchId ?? "batch-current") === batchId
    && (!centerScope || candidate.preferences[0] === centerScope)
  ));
  const additionalApplications = applications.filter((application) => !candidates.some((candidate) => (
    candidate.id === application.id || candidate.memberId === application.memberId
  )));
  return {
    total: candidates.length + additionalApplications.length,
    pending: candidates.filter((candidate) => candidate.stage !== "已结束").length + additionalApplications.length,
    adjustmentPending: 0,
    canPublish: false,
  };
}

function buildRecruitmentContext(
  operator: DashboardOperator,
  now: Date,
): RecruitmentDashboardContext | null {
  const batchStore = useRecruitmentBatchStore();
  const applicationsStore = useRecruitmentApplicationStore();
  const centerScope = getCenterScope(operator);
  const visibleBatches = centerScope
    ? batchStore.batches.filter((batch) => batch.openCenterIds.includes(getRecruitmentCenterId(centerScope)))
    : batchStore.batches;
  const selection = selectOperatingRecruitmentBatch(
    visibleBatches,
    (batchId) => buildReadOnlyAssessmentSummary(batchId, centerScope),
    now,
  );
  if (!selection) return null;

  const assessment = buildReadOnlyAssessmentSummary(selection.batch.id, centerScope);
  const actions: RecruitmentDashboardContext["actions"] = [];
  if (hasCapability(operator, "recruitment.batch.manage")) {
    actions.push({
      capability: "recruitment.batch.manage",
      target: { module: "recruitment", action: "manage", resourceType: "batch", resourceId: selection.batch.id },
    });
  }
  if (selection.batch.lifecycleStatus !== "draft"
    && selection.reason !== "upcoming"
    && hasCapability(operator, "recruitment.assessment.edit")) {
    actions.push({
      capability: "recruitment.assessment.edit",
      target: { module: "recruitment", action: "assess", resourceType: "batch", resourceId: selection.batch.id },
    });
  }
  if (assessment.canPublish && hasCapability(operator, "recruitment.result.publish")) {
    actions.push({
      capability: "recruitment.result.publish",
      target: { module: "recruitment", action: "publish-results", resourceType: "batch", resourceId: selection.batch.id },
    });
  }
  return {
    batch: {
      id: selection.batch.id,
      name: selection.batch.name,
      status: getEffectiveRecruitmentBatchStatus(selection.batch, now).status,
      startAt: selection.batch.startAt,
      endAt: selection.batch.endAt,
    },
    selection: selection.reason,
    applicationCount: applicationsStore.getApplicationsForBatch(selection.batch.id)
      .filter((application) => !centerScope || application.firstChoice === centerScope).length,
    assessment: {
      total: assessment.total,
      pending: assessment.pending,
      adjustmentPending: assessment.adjustmentPending,
      canPublish: assessment.canPublish,
    },
    actions,
  };
}

function buildTasks(
  operator: DashboardOperator,
  recruitment: RecruitmentDashboardContext | null,
  inReview: number,
  pendingPublication: number,
): DashboardTask[] {
  const tasks: DashboardTask[] = [];
  if (recruitment?.assessment.pending && hasCapability(operator, "recruitment.assessment.edit")) {
    tasks.push({
      id: `recruitment-assessment-${recruitment.batch.id}`,
      title: "完成当前招新考核",
      meta: `${recruitment.batch.name}仍有 ${recruitment.assessment.pending} 人待处理`,
      priority: "urgent",
      capability: "recruitment.assessment.edit",
      target: { module: "recruitment", action: "assess", resourceType: "batch", resourceId: recruitment.batch.id },
    });
  }
  if (recruitment?.assessment.canPublish && hasCapability(operator, "recruitment.result.publish")) {
    tasks.push({
      id: `recruitment-publish-${recruitment.batch.id}`,
      title: "发布招新结果",
      meta: recruitment.batch.name,
      priority: "urgent",
      capability: "recruitment.result.publish",
      target: { module: "recruitment", action: "publish-results", resourceType: "batch", resourceId: recruitment.batch.id },
    });
  }
  if (inReview && hasCapability(operator, "content.review")) {
    tasks.push({
      id: "content-review",
      title: "审核门户内容",
      meta: `${inReview} 条内容等待审核`,
      priority: "warning",
      capability: "content.review",
      target: { module: "content", action: "review" },
    });
  }
  if (pendingPublication && hasCapability(operator, "content.publish")) {
    tasks.push({
      id: "content-publish",
      title: "发布已审核内容",
      meta: `${pendingPublication} 条内容待发布`,
      priority: "warning",
      capability: "content.publish",
      target: { module: "content", action: "publish" },
    });
  }
  return tasks;
}

export function createMockDashboardGateway(): AdminDashboardGateway {
  return {
    async getSnapshot(options: DashboardSnapshotOptions = {}): Promise<AdminDashboardSnapshot> {
      const now = options.now ?? new Date();
      const operator = getCapabilities();
      const contentStore = usePortalContentStore();
      const configStore = usePortalConfigStore();
      const visibleContentRecords = contentStore.records.filter((record) => canAccessPortalContent(record, {
        operatorId: operator.id,
        centerRole: operator.centerRole,
      }));
      const content = getContentOverview(visibleContentRecords);
      const inReview = hasCapability(operator, "content.review") ? content.inReview : 0;
      const pendingPublication = hasCapability(operator, "content.publish") ? content.pendingPublication : 0;
      const recruitment = buildRecruitmentContext(operator, now);
      const warnings = buildWarnings(operator);
      const tasks = buildTasks(operator, recruitment, inReview, pendingPublication);
      const centerScope = getCenterScope(operator);
      const visibleAssets = operator.level === "owner"
        ? ADMIN_ASSETS
        : ADMIN_ASSETS.filter((asset) => Boolean(
          centerScope && asset.ownerCenterId === getRecruitmentCenterId(centerScope),
        ));
      const processing = visibleAssets.filter((asset) => (
        ["waiting", "uploading", "processing"].includes(asset.processingStatus)
      )).length;
      const failed = visibleAssets.filter((asset) => asset.processingStatus === "failed").length;
      const reviewPending = visibleAssets.filter((asset) => asset.reviewStatus === "pending").length;

      return {
        schemaVersion: 1,
        generatedAt: now.toISOString(),
        timezone: "Asia/Shanghai",
        operator,
        metrics: [
          {
            id: "my-work",
            label: "待处理事项",
            value: tasks.length,
            target: tasks[0]?.target ?? { module: "recruitment", action: "overview" },
          },
          {
            id: "content-review",
            label: hasCapability(operator, "content.review") ? "待审核内容" : "我的内容",
            value: hasCapability(operator, "content.review") ? inReview : visibleContentRecords.length,
            target: { module: "content", action: hasCapability(operator, "content.review") ? "review" : "list" },
          },
          { id: "content-publish", label: "待发布内容", value: pendingPublication, target: { module: "content", action: "publish" } },
          {
            id: "system-warnings",
            label: "异常任务",
            value: warnings.reduce((total, warning) => total + warning.count, 0),
            target: warnings[0]?.target ?? { module: "content", action: "list" },
          },
        ],
        tasks,
        recruitment,
        content: {
          inReview,
          pendingPublication,
          recent: visibleContentRecords
            .slice()
            .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
            .slice(0, 4)
            .map((record) => ({
              id: record.id,
              kind: record.kind,
              title: record.title,
              status: record.status,
              updatedAt: record.updatedAt,
              target: { module: "content", action: "view", resourceType: "content", resourceId: record.id },
            })),
        },
        portal: hasCapability(operator, "portal.configure") || hasCapability(operator, "portal.publish")
          ? {
              draftRevision: configStore.draftConfig.revision,
              publishedRevision: configStore.publishedConfig.revision,
              isDirty: configStore.draftConfig.revision !== configStore.publishedConfig.revision,
            }
          : null,
        media: { total: visibleAssets.length, processing, failed, reviewPending },
        warnings,
      };
    },
  };
}
