import type { AdminDashboardGateway, DashboardSnapshotOptions } from "./dashboard-gateway";
import {
  DASHBOARD_ACTIONS,
  type AdminDashboardSnapshot,
  type DashboardCapability,
  type DashboardModule,
} from "../../types/admin-dashboard";

export type DashboardApiFetcher = (
  path: string,
  options: { method: "GET" },
) => Promise<unknown>;

const dashboardModules: DashboardModule[] = ["recruitment", "content", "portal", "media", "member"];
const dashboardCapabilities: DashboardCapability[] = [
  "recruitment.batch.manage",
  "recruitment.assessment.edit",
  "recruitment.result.publish",
  "content.create",
  "content.review",
  "content.publish",
  "portal.configure",
  "portal.publish",
  "member.create",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasTarget(value: unknown): boolean {
  return isRecord(value)
    && dashboardModules.includes(value.module as DashboardModule)
    && DASHBOARD_ACTIONS.includes(value.action as (typeof DASHBOARD_ACTIONS)[number])
    && (value.resourceType === undefined || value.resourceType === null || typeof value.resourceType === "string")
    && (value.resourceId === undefined || value.resourceId === null || typeof value.resourceId === "string");
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function hasCapabilityList(value: unknown): boolean {
  return Array.isArray(value)
    && value.every((item) => dashboardCapabilities.includes(item as DashboardCapability));
}

function isRecruitmentContext(value: unknown, capabilities: readonly DashboardCapability[]): boolean {
  if (!isRecord(value)
    || !["open", "paused", "unfinished-work", "upcoming"].includes(value.selection as string)
    || !isRecord(value.batch)
    || !isRecord(value.assessment)
    || !Array.isArray(value.actions)) return false;
  const { batch, assessment } = value;
  return typeof batch.id === "string"
    && typeof batch.name === "string"
    && ["draft", "upcoming", "open", "paused", "closed", "archived"].includes(batch.status as string)
    && isDateTime(batch.startAt)
    && isDateTime(batch.endAt)
    && isNonNegativeInteger(value.applicationCount)
    && isNonNegativeInteger(assessment.total)
    && isNonNegativeInteger(assessment.pending)
    && isNonNegativeInteger(assessment.adjustmentPending)
    && typeof assessment.canPublish === "boolean"
    && value.actions.every((action) => isRecord(action)
      && dashboardCapabilities.includes(action.capability as DashboardCapability)
      && capabilities.includes(action.capability as DashboardCapability)
      && hasTarget(action.target));
}

function isContentSummary(value: unknown): boolean {
  return isRecord(value)
    && isNonNegativeInteger(value.inReview)
    && isNonNegativeInteger(value.pendingPublication)
    && Array.isArray(value.recent)
    && value.recent.every((record) => isRecord(record)
      && typeof record.id === "string"
      && ["flash", "article", "notice"].includes(record.kind as string)
      && typeof record.title === "string"
      && ["draft", "in-review", "pending-publication", "published", "unpublished"].includes(record.status as string)
      && isDateTime(record.updatedAt)
      && hasTarget(record.target));
}

export function isAdminDashboardSnapshot(value: unknown): value is AdminDashboardSnapshot {
  if (!isRecord(value)
    || value.schemaVersion !== 1
    || typeof value.generatedAt !== "string"
    || !isDateTime(value.generatedAt)
    || value.timezone !== "Asia/Shanghai"
    || !isRecord(value.operator)
    || typeof value.operator.id !== "string"
    || typeof value.operator.name !== "string"
    || !["member", "admin", "owner"].includes(value.operator.level as string)
    || (value.operator.centerRole !== undefined
      && value.operator.centerRole !== null
      && typeof value.operator.centerRole !== "string")
    || !hasCapabilityList(value.operator.capabilities)
    || !Array.isArray(value.metrics)
    || !value.metrics.every((metric) => isRecord(metric)
      && typeof metric.id === "string"
      && typeof metric.label === "string"
      && isNonNegativeInteger(metric.value)
      && (metric.detail === undefined || metric.detail === null || typeof metric.detail === "string")
      && hasTarget(metric.target))
    || !Array.isArray(value.tasks)
    || !value.tasks.every((task) => isRecord(task)
      && typeof task.id === "string"
      && typeof task.title === "string"
      && ["urgent", "warning", "normal"].includes(task.priority as string)
      && (task.meta === undefined || typeof task.meta === "string")
      && (task.capability === undefined || dashboardCapabilities.includes(task.capability as DashboardCapability))
      && (task.capability === undefined
        || ((value.operator as Record<string, unknown>).capabilities as DashboardCapability[]).includes(task.capability as DashboardCapability))
      && hasTarget(task.target))
    || !(value.recruitment === null || isRecruitmentContext(
      value.recruitment,
      ((value.operator as Record<string, unknown>).capabilities as DashboardCapability[]),
    ))
    || !isContentSummary(value.content)
    || !isRecord(value.portal)
    || !isPositiveInteger(value.portal.draftRevision)
    || !isPositiveInteger(value.portal.publishedRevision)
    || typeof value.portal.isDirty !== "boolean"
    || !isRecord(value.media)
    || !isNonNegativeInteger(value.media.total)
    || !isNonNegativeInteger(value.media.processing)
    || !isNonNegativeInteger(value.media.failed)
    || !isNonNegativeInteger(value.media.reviewPending)
    || !Array.isArray(value.warnings)) {
    return false;
  }
  return value.warnings.every((warning) => isRecord(warning)
    && typeof warning.code === "string"
    && ["error", "warning"].includes(warning.level as string)
    && typeof warning.title === "string"
    && (warning.detail === undefined || warning.detail === null || typeof warning.detail === "string")
    && isNonNegativeInteger(warning.count)
    && hasTarget(warning.target));
}

export class ApiDashboardGateway implements AdminDashboardGateway {
  constructor(
    private readonly fetcher: DashboardApiFetcher,
    private readonly endpoint = "/api/admin/dashboard",
  ) {}

  async getSnapshot(_options?: DashboardSnapshotOptions): Promise<AdminDashboardSnapshot> {
    const response = await this.fetcher(this.endpoint, { method: "GET" });
    if (!isAdminDashboardSnapshot(response)) {
      throw new Error("ADMIN_DASHBOARD_API_INVALID_RESPONSE");
    }
    return response;
  }
}
