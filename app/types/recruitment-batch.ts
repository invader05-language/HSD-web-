export const RECRUITMENT_BATCH_LIFECYCLE_STATUSES = [
  "draft",
  "published",
  "closed",
  "archived",
] as const;

export type RecruitmentBatchLifecycleStatus =
  (typeof RECRUITMENT_BATCH_LIFECYCLE_STATUSES)[number];

export const RECRUITMENT_BATCH_MANUAL_OVERRIDES = [
  "none",
  "force-open",
  "paused",
  "force-closed",
] as const;

export type RecruitmentBatchManualOverride =
  (typeof RECRUITMENT_BATCH_MANUAL_OVERRIDES)[number];

export const RECRUITMENT_BATCH_EFFECTIVE_STATUSES = [
  "draft",
  "upcoming",
  "open",
  "paused",
  "closed",
  "archived",
] as const;

export type RecruitmentBatchEffectiveStatus =
  (typeof RECRUITMENT_BATCH_EFFECTIVE_STATUSES)[number];

export type RecruitmentBatchStatusReason =
  | "draft"
  | "before-start"
  | "within-window"
  | "after-end"
  | "force-open"
  | "paused"
  | "force-closed"
  | "archived";

export type RecruitmentBatchCommandErrorCode =
  | "RECRUITMENT_BATCH_NOT_FOUND"
  | "BATCH_ALREADY_PUBLISHED"
  | "BATCH_ALREADY_OPEN"
  | "BATCH_SCHEDULE_OVERLAP"
  | "BATCH_CENTER_REQUIRED"
  | "BATCH_WINDOW_INVALID"
  | "OWNER_PERMISSION_REQUIRED"
  | "BATCH_STORAGE_WRITE_FAILED"
  | "BATCH_STORAGE_UNAVAILABLE";

export interface RecruitmentBatchConflictSummary {
  batchId: string;
  batchName: string;
  startAt: string;
  endAt: string;
}

export interface RecruitmentBatchPublishReadiness {
  ok: boolean;
  code?: RecruitmentBatchCommandErrorCode;
  message?: string;
  conflict?: RecruitmentBatchConflictSummary;
}

export class RecruitmentBatchCommandError extends Error {
  readonly code: RecruitmentBatchCommandErrorCode;
  readonly conflict?: RecruitmentBatchConflictSummary;

  constructor(
    code: RecruitmentBatchCommandErrorCode,
    options: { conflict?: RecruitmentBatchConflictSummary } = {},
  ) {
    super(code);
    this.name = "RecruitmentBatchCommandError";
    this.code = code;
    this.conflict = options.conflict;
  }
}

export interface RecruitmentBatch {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  timezone: "Asia/Shanghai";
  openCenterIds: string[];
  responsibleAccountIds: string[];
  lifecycleStatus: RecruitmentBatchLifecycleStatus;
  manualOverride: RecruitmentBatchManualOverride;
  version: number;
  publishedAt?: string;
  actualOpenedAt?: string;
  closedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentBatchDraftInput {
  name: string;
  startAt: string;
  endAt: string;
  openCenterIds: readonly string[];
}

export interface RecruitmentBatchStatusResult {
  status: RecruitmentBatchEffectiveStatus;
  reason: RecruitmentBatchStatusReason;
}

export interface RecruitmentBatchAuditRecord {
  id: string;
  batchId: string;
  action: string;
  actorId: string;
  actorName: string;
  beforeStatus: RecruitmentBatchEffectiveStatus;
  afterStatus: RecruitmentBatchEffectiveStatus;
  originalStartAt?: string;
  actualAt: string;
  reason?: string;
  createdAt: string;
  before?: Partial<RecruitmentBatch>;
  after?: Partial<RecruitmentBatch>;
}
