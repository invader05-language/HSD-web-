export type PortalContentKind = "flash" | "article" | "notice";
export type PortalContentStatus = "draft" | "in-review" | "pending-publication" | "published" | "unpublished";
export type PortalPublishedState = "published" | "unpublished";
export type PortalOriginType = "manual" | "system-event" | "wechat";
export type PortalSourceValidity = "valid" | "invalid" | "expired";
export type PortalCatalogEntityType = PortalContentKind | "project" | "activity" | "gallery" | "resource";
export type PortalSlotId = "flash" | "news" | "projects" | "activities" | "gallery" | "resources";

export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; assetId: string; alt: string; caption?: string };

export interface PortalContentTarget {
  type: "internal-route";
  value: string;
}

export interface PortalContentAuditRecord {
  id: string;
  action: "create" | "update" | "submit" | "return" | "approve" | "publish" | "unpublish" | "automation-failed" | "automation-duplicate" | "automation-retried" | "source-expired" | "source-invalidated";
  actorId: string;
  targetId: string;
  beforeRevision: number;
  afterRevision: number;
  actualAt: string;
  reason?: string;
  sourceEventId?: string;
}

export interface PortalContentSnapshot {
  id: string;
  kind: PortalContentKind;
  slug: string;
  title: string;
  summary: string;
  target: PortalContentTarget;
  revision: number;
  blocks: ContentBlock[];
  originType: PortalOriginType;
  sourceValidity: PortalSourceValidity;
  publishedAt: string;
  expiresAt?: string;
}

export interface PortalContentRecord {
  id: string;
  kind: PortalContentKind;
  slug: string;
  title: string;
  summary: string;
  target: PortalContentTarget;
  status: PortalContentStatus;
  publishedState: PortalPublishedState;
  revision: number;
  blocks: ContentBlock[];
  originType: PortalOriginType;
  sourceValidity: PortalSourceValidity;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedAt?: string;
  expiresAt?: string;
  sourceDomain?: "recruitment-batch" | "activity";
  sourceId?: string;
  sourceVersion?: number;
  sourceEventType?: PortalSourceEventType;
  automationKey?: string;
  generatedReason?: string;
  publishedRevision?: PortalContentSnapshot;
  audit: PortalContentAuditRecord[];
}

export interface PortalAutomationFailure {
  automationKey: string;
  event: PortalSourceEvent;
  errorCode: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  audit: PortalContentAuditRecord[];
}

export interface PortalCatalogItem {
  entityType: PortalCatalogEntityType;
  sourceId: string;
  title: string;
  summary: string;
  to: string;
  publishedAt: string;
  eventAt?: string;
  eligibleSlots: PortalSlotId[];
  available: boolean;
}

export type PortalSourceEventType = "recruitment.batch.opened" | "activity.registration.opened";

export interface PortalSourceEvent<TPayload = unknown> {
  eventId: string;
  eventType: PortalSourceEventType;
  occurredAt: string;
  actorId: string;
  sourceDomain: "recruitment-batch" | "activity";
  sourceId: string;
  sourceVersion: number;
  payload: TPayload;
}

export interface RecruitmentOpenedPayload {
  batchName: string;
  publicRoute: string;
  publicEndAt: string;
  isOpen: boolean;
}

export interface ActivityRegistrationOpenedPayload {
  activityTitle: string;
  slug: string;
  publicRoute: string;
  publicEndAt: string;
  isOpen: boolean;
}

export type PortalAutomationResult =
  | { status: "created"; contentId: string }
  | { status: "duplicate" }
  | { status: "failed"; errorCode: string; automationKey: string };

export interface PortalContentDraftInput {
  kind: PortalContentKind;
  title: string;
  summary: string;
  slug?: string;
  target?: PortalContentTarget;
  blocks?: ContentBlock[];
  expiresAt?: string;
}
