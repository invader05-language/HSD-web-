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
