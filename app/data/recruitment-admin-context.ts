import type { AdminCandidate } from "./recruitment-admin";

export type RecruitmentBatchAdminLevel = "admin" | "owner";

export interface RecruitmentBatchAdminActor {
  account: string;
  name: string;
  level: RecruitmentBatchAdminLevel;
}

export type RecruitmentBatchAdminSection =
  | "applications"
  | "assessment"
  | "publish";

export interface RecruitmentLifecycleAuditInput {
  action: string;
  actor: RecruitmentBatchAdminActor;
  originalStartAt?: string;
  actualAt: string;
  before: string;
  after: string;
  reason?: string;
  batchId?: string;
}

export interface RecruitmentLifecycleAudit {
  id: string;
  batchId?: string;
  action: string;
  actor: string;
  actorId: string;
  originalStartAt?: string;
  actualAt: string;
  before: string;
  after: string;
  reason?: string;
}

const BATCH_ROUTE_PREFIX = "/admin/recruitment/batches";

export function buildRecruitmentBatchRoute(batchId: string): string {
  return `${BATCH_ROUTE_PREFIX}/${encodeURIComponent(batchId)}`;
}

export function buildRecruitmentBatchSectionRoute(
  batchId: string,
  section: RecruitmentBatchAdminSection
): string {
  return `${buildRecruitmentBatchRoute(batchId)}/${section}`;
}

type BatchScopedCandidate = AdminCandidate & { batchId?: string };

/**
 * Legacy admin fixtures predate batch linkage. They are treated as belonging
 * to the current fixture batch until the repository provides an explicit id.
 */
export function filterAdminCandidatesByBatch(
  candidates: readonly BatchScopedCandidate[],
  batchId: string,
  legacyBatchId = "batch-current"
): BatchScopedCandidate[] {
  return candidates.filter((candidate) => (candidate.batchId ?? legacyBatchId) === batchId);
}

export function canManageRecruitmentBatch(
  actor: RecruitmentBatchAdminActor | undefined
): boolean {
  return actor?.level === "owner";
}

export function createRecruitmentLifecycleAudit(
  input: RecruitmentLifecycleAuditInput,
  id = `recruitment-${input.action}-${input.actualAt}`
): RecruitmentLifecycleAudit {
  return {
    id,
    ...(input.batchId ? { batchId: input.batchId } : {}),
    action: input.action,
    actor: input.actor.name,
    actorId: input.actor.account,
    ...(input.originalStartAt ? { originalStartAt: input.originalStartAt } : {}),
    actualAt: input.actualAt,
    before: input.before,
    after: input.after,
    ...(input.reason ? { reason: input.reason } : {})
  };
}

export const RECRUITMENT_BATCH_STATUS_LABELS = {
  draft: "草稿",
  upcoming: "待开始",
  open: "报名中",
  paused: "已暂停",
  closed: "已关闭",
  archived: "已归档",
  published: "已发布"
} as const;

export type RecruitmentBatchEffectiveStatus = keyof typeof RECRUITMENT_BATCH_STATUS_LABELS;

export function getRecruitmentBatchStatusLabel(
  status: RecruitmentBatchEffectiveStatus
): string {
  return RECRUITMENT_BATCH_STATUS_LABELS[status];
}

export interface AdminRecruitmentBatchLike {
  lifecycleStatus?: string;
  manualOverride?: string;
  effectiveStatus?: string;
  status?: string;
  startAt?: string;
  endAt?: string;
}

export function getAdminBatchStatus(batch: AdminRecruitmentBatchLike): RecruitmentBatchEffectiveStatus {
  if (batch.effectiveStatus && batch.effectiveStatus in RECRUITMENT_BATCH_STATUS_LABELS) {
    return batch.effectiveStatus as RecruitmentBatchEffectiveStatus;
  }
  if (batch.manualOverride === "paused") return "paused";
  if (batch.manualOverride === "force-open") return "open";
  if (batch.manualOverride === "force-closed") return "closed";
  if (batch.lifecycleStatus === "draft") return "draft";
  if (batch.lifecycleStatus === "archived") return "archived";
  if (batch.lifecycleStatus === "closed") return "closed";
  if (batch.status === "进行中") return "open";
  if (batch.status === "已结束") return "closed";
  if (batch.status === "草稿") return "draft";
  return "upcoming";
}

export function formatRecruitmentBatchPeriod(batch: AdminRecruitmentBatchLike): string {
  if (!batch.startAt || !batch.endAt) return "时间尚未发布";
  return `${batch.startAt.slice(0, 16).replace("T", " ")} — ${batch.endAt.slice(0, 16).replace("T", " ")}`;
}
