import type { RecruitmentBatchEffectiveStatus } from "./recruitment-batch";
import type { PortalContentKind, PortalContentStatus } from "./portal-content";

export const DASHBOARD_CAPABILITIES = [
  "recruitment.batch.manage",
  "recruitment.assessment.edit",
  "recruitment.result.publish",
  "content.create",
  "content.review",
  "content.publish",
  "portal.configure",
  "portal.publish",
  "member.create",
] as const;

export type DashboardCapability = (typeof DASHBOARD_CAPABILITIES)[number];
export type DashboardModule = "recruitment" | "content" | "portal" | "media" | "member";
export const DASHBOARD_ACTIONS = [
  "overview",
  "manage",
  "applications",
  "assess",
  "publish-results",
  "review",
  "publish",
  "view",
  "create",
  "list",
  "automation",
  "configure",
  "health",
] as const;
export type DashboardAction = (typeof DASHBOARD_ACTIONS)[number];
export type DashboardTaskPriority = "urgent" | "warning" | "normal";
export type DashboardWarningLevel = "error" | "warning";

export interface DashboardTarget {
  module: DashboardModule;
  action: DashboardAction;
  resourceType?: string | null;
  resourceId?: string | null;
}

export interface DashboardOperator {
  id: string;
  name: string;
  level: "member" | "admin" | "owner";
  centerRole?: string | null;
  capabilities: DashboardCapability[];
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  detail?: string | null;
  target: DashboardTarget;
}

export interface DashboardTask {
  id: string;
  title: string;
  meta?: string;
  priority: DashboardTaskPriority;
  target: DashboardTarget;
  capability?: DashboardCapability;
}

export interface DashboardWarning {
  code: string;
  level: DashboardWarningLevel;
  title: string;
  detail?: string | null;
  count: number;
  target: DashboardTarget;
}

export interface DashboardRecruitmentBatch {
  id: string;
  name: string;
  status: RecruitmentBatchEffectiveStatus;
  startAt: string;
  endAt: string;
}

export interface RecruitmentDashboardContext {
  batch: DashboardRecruitmentBatch;
  selection: "open" | "paused" | "unfinished-work" | "upcoming";
  applicationCount: number;
  assessment: {
    total: number;
    pending: number;
    adjustmentPending: number;
    canPublish: boolean;
  };
  actions: Array<{ capability: DashboardCapability; target: DashboardTarget }>;
}

export interface ContentDashboardSummary {
  inReview: number;
  pendingPublication: number;
  recent: Array<{
    id: string;
    kind: PortalContentKind;
    title: string;
    status: PortalContentStatus;
    updatedAt: string;
    target: DashboardTarget;
  }>;
}

export interface PortalDashboardSummary {
  draftRevision: number;
  publishedRevision: number;
  isDirty: boolean;
}

export interface MediaDashboardSummary {
  total: number;
  processing: number;
  failed: number;
  reviewPending: number;
}

export interface AdminDashboardSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  timezone: "Asia/Shanghai";
  operator: DashboardOperator;
  metrics: DashboardMetric[];
  tasks: DashboardTask[];
  recruitment: RecruitmentDashboardContext | null;
  content: ContentDashboardSummary;
  portal: PortalDashboardSummary | null;
  media: MediaDashboardSummary;
  warnings: DashboardWarning[];
}
