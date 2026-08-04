import { defineStore } from "pinia";
import type {
  PortalAutomationResult,
  PortalContentAuditRecord,
  PortalContentDraftInput,
  PortalContentRecord,
  PortalContentSnapshot,
  PortalAutomationFailure,
  PortalSourceEvent,
} from "../types/portal-content";
import { useSessionStore } from "./session";
import { canUseAssetForPortalContent } from "../data/admin-assets";
import { isSafeInternalPath } from "../utils/internal-route";

export const PORTAL_CONTENT_STORAGE_KEY = "baiyun-hsd.portal-content";
export const PORTAL_CONTENT_STORAGE_VERSION = 2;

interface PersistedPortalContentState {
  version: typeof PORTAL_CONTENT_STORAGE_VERSION;
  records: PortalContentRecord[];
  automationFailures: PortalAutomationFailure[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || `content-${Date.now()}`;
}

function publicTarget(kind: PortalContentRecord["kind"], slug: string, target: PortalContentRecord["target"]) {
  return kind === "article" || kind === "notice"
    ? { type: "internal-route" as const, value: `/updates/${encodeURIComponent(slug)}` }
    : clone(target);
}

function assertUniqueSlug(records: readonly PortalContentRecord[], slug: string, excludedId?: string) {
  if (records.some((record) => record.id !== excludedId && slugify(record.slug) === slug)) {
    throw new Error("PORTAL_CONTENT_DUPLICATE_SLUG");
  }
}

function getStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuditRecord(value: unknown): value is PortalContentAuditRecord {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.action === "string"
    && typeof value.actorId === "string"
    && typeof value.actualAt === "string"
    && typeof value.revision === "number";
}

function isPortalEvent(value: unknown): value is PortalSourceEvent {
  if (!isRecord(value) || !isRecord(value.payload)) return false;
  return typeof value.eventId === "string"
    && (value.eventType === "recruitment.batch.opened" || value.eventType === "activity.registration.opened")
    && typeof value.occurredAt === "string"
    && typeof value.actorId === "string"
    && (value.sourceDomain === "recruitment-batch" || value.sourceDomain === "activity")
    && typeof value.sourceId === "string"
    && typeof value.sourceVersion === "number";
}

function isTarget(value: unknown): boolean {
  return isRecord(value) && value.type === "internal-route" && isSafeInternalPath(value.value);
}

function isBlocks(value: unknown): boolean {
  return Array.isArray(value) && value.every((block) => {
    if (!isRecord(block) || typeof block.type !== "string") return false;
    if (block.type === "heading" || block.type === "paragraph") return typeof block.text === "string";
    return block.type === "image"
      && typeof block.assetId === "string" && block.assetId.trim().length > 0
      && canUseAssetForPortalContent(block.assetId)
      && typeof block.alt === "string" && block.alt.trim().length > 0
      && (block.caption === undefined || typeof block.caption === "string");
  });
}

function assertValidContentShape(target: unknown, blocks: unknown) {
  if (!isTarget(target)) throw new Error("PORTAL_CONTENT_INVALID_TARGET");
  if (!isBlocks(blocks)) throw new Error("PORTAL_CONTENT_INVALID_BLOCK");
}

function isPublishedSnapshot(value: unknown): value is PortalContentSnapshot {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && ["flash", "article", "notice"].includes(value.kind as string)
    && typeof value.slug === "string"
    && typeof value.title === "string"
    && typeof value.summary === "string"
    && isTarget(value.target)
    && typeof value.revision === "number"
    && isBlocks(value.blocks)
    && ["manual", "system-event", "wechat"].includes(value.originType as string)
    && ["valid", "invalid", "expired"].includes(value.sourceValidity as string)
    && typeof value.publishedAt === "string"
    && (value.expiresAt === undefined || typeof value.expiresAt === "string");
}

function isPortalContentRecord(value: unknown): value is PortalContentRecord {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && ["flash", "article", "notice"].includes(value.kind as string)
    && typeof value.slug === "string"
    && typeof value.title === "string"
    && typeof value.summary === "string"
    && isTarget(value.target)
    && ["draft", "in-review", "pending-publication", "published", "unpublished"].includes(value.status as string)
    && ["published", "unpublished"].includes(value.publishedState as string)
    && typeof value.revision === "number"
    && isBlocks(value.blocks)
    && ["manual", "system-event", "wechat"].includes(value.originType as string)
    && ["valid", "invalid", "expired"].includes(value.sourceValidity as string)
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && typeof value.createdBy === "string"
    && Array.isArray(value.audit)
    && value.audit.every(isAuditRecord)
    && (value.publishedRevision === undefined || isPublishedSnapshot(value.publishedRevision))
    && (value.publishedState !== "published" || isPublishedSnapshot(value.publishedRevision))
    && !(value.status === "published" && value.publishedState !== "published");
}

function isAutomationFailure(value: unknown): value is PortalAutomationFailure {
  return isRecord(value)
    && typeof value.automationKey === "string"
    && isPortalEvent(value.event)
    && typeof value.errorCode === "string"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && Array.isArray(value.audit)
    && value.audit.every(isAuditRecord);
}

function readPersistedState(): PersistedPortalContentState | undefined {
  const serialized = getStorage()?.getItem(PORTAL_CONTENT_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed)
      || parsed.version !== PORTAL_CONTENT_STORAGE_VERSION
      || !Array.isArray(parsed.records)
      || !parsed.records.every(isPortalContentRecord)
      || !Array.isArray(parsed.automationFailures)
      || !parsed.automationFailures.every(isAutomationFailure)) {
      return undefined;
    }
    return clone(parsed as unknown as PersistedPortalContentState);
  } catch {
    return undefined;
  }
}

function seedRecords(): PortalContentRecord[] {
  const createdAt = "2026-07-24T08:00:00.000Z";
  const published = (input: PortalContentDraftInput, id: string, publishedAt: string): PortalContentRecord => {
    const snapshot: PortalContentSnapshot = {
      id,
      kind: input.kind,
      slug: input.slug ?? slugify(input.title),
      title: input.title,
      summary: input.summary,
      target: input.target ?? { type: "internal-route", value: "/activities" },
      revision: 1,
      blocks: input.blocks ?? [],
      originType: "manual",
      sourceValidity: "valid",
      publishedAt,
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    };
    return {
      ...snapshot,
      status: "published",
      publishedState: "published",
      createdAt,
      updatedAt: publishedAt,
      createdBy: "admin-alliance",
      publishedAt,
      publishedRevision: snapshot,
      audit: [],
    };
  };
  return [
    published({ kind: "flash", title: "2026 秋季招新通道开放", summary: "四大中心均可报名。", target: { type: "internal-route", value: "/join" } }, "flash-recruitment-2026", "2026-07-30T09:24:00.000Z"),
    published({ kind: "article", slug: "project-team", title: "从一次分享会，到一支真正协作的项目团队", summary: "记录成员从技术交流到原型落地。", target: { type: "internal-route", value: "/updates/project-team" } }, "article-project-team", "2026-07-24T08:00:00.000Z"),
    published({ kind: "notice", slug: "studio-hours", title: "实训工作室暑期开放安排", summary: "说明暑期值班、设备借用与安全管理安排。", target: { type: "internal-route", value: "/updates/studio-hours" } }, "notice-studio", "2026-07-20T08:00:00.000Z"),
  ];
}

function actorId(): string {
  const session = useSessionStore();
  if (!session.isAuthenticated || !session.canAccessAdmin || !session.currentAccount) {
    throw new Error("PORTAL_CONTENT_PERMISSION_REQUIRED");
  }
  return session.currentAccount.account;
}

function ownerActorId(): string {
  const session = useSessionStore();
  if (!session.isAuthenticated || session.adminLevel !== "owner" || !session.currentAccount) {
    throw new Error("PORTAL_CONTENT_PERMISSION_REQUIRED");
  }
  return session.currentAccount.account;
}

function addAudit(record: PortalContentRecord, action: PortalContentAuditRecord["action"], actor: string, now: Date, reason?: string) {
  record.audit.unshift({
    id: `portal-content-${record.id}-${record.revision}-${action}-${now.getTime()}`,
    action,
    actorId: actor,
    actualAt: now.toISOString(),
    ...(reason ? { reason } : {}),
    revision: record.revision,
  });
}

function snapshot(record: PortalContentRecord, publishedAt: string): PortalContentSnapshot {
  return {
    id: record.id,
    kind: record.kind,
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    target: clone(record.target),
    revision: record.revision,
    blocks: clone(record.blocks),
    originType: record.originType,
    sourceValidity: record.sourceValidity,
    publishedAt,
    ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
  };
}

function eventKey(event: PortalSourceEvent): string {
  return [event.sourceDomain, event.sourceId, event.eventType, event.sourceVersion].join(":");
}

function eventIdPart(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "");
}

function semanticEventId(event: PortalSourceEvent): string {
  return encodeURIComponent(JSON.stringify([
    event.sourceDomain,
    event.sourceId,
    event.eventType,
    event.sourceVersion,
  ]));
}

export const usePortalContentStore = defineStore("portal-content", {
  state: () => {
    const persisted = readPersistedState();
    return {
      records: persisted?.records ?? seedRecords(),
      automationFailures: persisted?.automationFailures ?? [] as PortalAutomationFailure[],
      persistenceError: undefined as string | undefined,
    };
  },
  getters: {
    getById: (state) => (id: string) => state.records.find((record) => record.id === id),
    publicRecords: (state): PortalContentSnapshot[] => state.records
      .map((record) => record.publishedRevision)
      .filter((_record, index): _record is PortalContentSnapshot => Boolean(_record) && state.records[index]?.publishedState === "published")
      .filter((record) => record.sourceValidity === "valid" && (!record.expiresAt || Date.parse(record.expiresAt) > Date.now()))
      .map(clone),
  },
  actions: {
    persist() {
      try {
        const storage = getStorage();
        if (!storage) throw new Error("storage unavailable");
        storage.setItem(PORTAL_CONTENT_STORAGE_KEY, JSON.stringify({
          version: PORTAL_CONTENT_STORAGE_VERSION,
          records: this.records,
          automationFailures: this.automationFailures,
        } satisfies PersistedPortalContentState));
        this.persistenceError = undefined;
      } catch {
        this.persistenceError = "PORTAL_CONTENT_STORAGE_UNAVAILABLE";
      }
    },
    createDraft(input: PortalContentDraftInput, now: Date = new Date()) {
      const actor = actorId();
      const slug = slugify(input.slug ?? input.title);
      const authoredTarget = input.target ?? { type: "internal-route" as const, value: "/activities" };
      const blocks = input.blocks ?? [];
      assertValidContentShape(authoredTarget, blocks);
      assertUniqueSlug(this.records, slug);
      const id = `portal-${input.kind}-${now.getTime()}-${this.records.length + 1}`;
      const record: PortalContentRecord = {
        id,
        kind: input.kind,
        slug,
        title: input.title.trim(),
        summary: input.summary.trim(),
        target: publicTarget(input.kind, slug, authoredTarget),
        status: "draft",
        publishedState: "unpublished",
        revision: 1,
        blocks: clone(blocks),
        originType: "manual",
        sourceValidity: "valid",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        createdBy: actor,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        audit: [],
      };
      addAudit(record, "create", actor, now);
      this.records.unshift(record);
      this.persist();
      return record;
    },
    updateDraft(id: string, patch: Partial<PortalContentDraftInput>, now: Date = new Date()) {
      const actor = actorId();
      const record = this.getById(id);
      if (!record) throw new Error("PORTAL_CONTENT_NOT_FOUND");
      if (!["draft", "published", "unpublished"].includes(record.status)) {
        throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      }
      const slug = patch.slug === undefined ? record.slug : slugify(patch.slug);
      const authoredTarget = patch.target === undefined ? record.target : patch.target;
      const blocks = patch.blocks === undefined ? record.blocks : patch.blocks;
      assertValidContentShape(authoredTarget, blocks);
      assertUniqueSlug(this.records, slug, record.id);
      if (record.status !== "draft") {
        record.status = "draft";
        record.revision += 1;
      }
      if (patch.title !== undefined) record.title = patch.title.trim();
      if (patch.summary !== undefined) record.summary = patch.summary.trim();
      record.slug = slug;
      record.target = publicTarget(record.kind, slug, authoredTarget);
      if (patch.blocks !== undefined) record.blocks = clone(blocks);
      if (patch.expiresAt !== undefined) record.expiresAt = patch.expiresAt;
      record.updatedAt = now.toISOString();
      addAudit(record, "update", actor, now);
      this.persist();
      return record;
    },
    submitForReview(id: string, now: Date = new Date()) {
      const actor = actorId();
      const record = this.getById(id);
      if (!record || record.status !== "draft") throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      assertValidContentShape(record.target, record.blocks);
      record.target = publicTarget(record.kind, record.slug, record.target);
      this.assertSourcePublic(record, now);
      record.status = "in-review";
      record.updatedAt = now.toISOString();
      addAudit(record, "submit", actor, now);
      this.persist();
      return record;
    },
    returnToDraft(id: string, reason: string, now: Date = new Date()) {
      const actor = ownerActorId();
      const record = this.getById(id);
      if (!record || record.status !== "in-review" || !reason.trim()) throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      record.status = "draft";
      record.updatedAt = now.toISOString();
      addAudit(record, "return", actor, now, reason);
      this.persist();
      return record;
    },
    approve(id: string, now: Date = new Date()) {
      const actor = ownerActorId();
      const record = this.getById(id);
      if (!record || record.status !== "in-review") throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      assertValidContentShape(record.target, record.blocks);
      record.target = publicTarget(record.kind, record.slug, record.target);
      this.assertSourcePublic(record, now);
      record.status = "pending-publication";
      record.updatedAt = now.toISOString();
      addAudit(record, "approve", actor, now);
      this.persist();
      return record;
    },
    publish(id: string, confirmed: boolean, now: Date = new Date()) {
      const actor = ownerActorId();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      const record = this.getById(id);
      if (!record || record.status !== "pending-publication" || record.sourceValidity !== "valid") {
        throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      }
      assertValidContentShape(record.target, record.blocks);
      record.target = publicTarget(record.kind, record.slug, record.target);
      this.assertSourcePublic(record, now);
      const publishedAt = now.toISOString();
      record.status = "published";
      record.publishedState = "published";
      record.publishedAt = publishedAt;
      record.updatedAt = publishedAt;
      record.publishedRevision = snapshot(record, publishedAt);
      addAudit(record, "publish", actor, now);
      this.persist();
      return record;
    },
    unpublish(id: string, reason: string, now: Date = new Date()) {
      const actor = ownerActorId();
      const record = this.getById(id);
      if (!record || !record.publishedRevision || !reason.trim()) throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      record.publishedState = "unpublished";
      if (record.status === "published") record.status = "unpublished";
      record.updatedAt = now.toISOString();
      addAudit(record, "unpublish", actor, now, reason);
      this.persist();
      return record;
    },
    getPublicRecords(now: Date = new Date()) {
      this.syncSourceEligibility(now);
      return this.records
        .filter((record) => record.publishedState === "published" && record.publishedRevision)
        .map((record) => record.publishedRevision!)
        .filter((record) => record.sourceValidity === "valid" && (!record.expiresAt || Date.parse(record.expiresAt) > now.getTime()))
        .map(clone);
    },
    getPublicById(id: string, now: Date = new Date()) {
      this.syncSourceEligibility(now);
      const record = this.getById(id);
      const published = record?.publishedRevision;
      return record?.publishedState === "published" && published && published.sourceValidity === "valid"
        && (!published.expiresAt || Date.parse(published.expiresAt) > now.getTime())
        ? clone({ ...published, status: "published" as const })
        : undefined;
    },
    getPublicBySlug(slug: string, now: Date = new Date()) {
      const normalized = slugify(slug);
      const matches = this.getPublicRecords(now).filter((record) => slugify(record.slug) === normalized);
      return matches.length === 1 ? matches[0] : undefined;
    },
    createSystemDraft(event: PortalSourceEvent): PortalAutomationResult {
      const automationKey = eventKey(event);
      const existing = this.records.find((record) => record.automationKey === automationKey);
      if (existing) {
        addAudit(existing, "automation-duplicate", "system", new Date(event.occurredAt));
        this.persist();
        return { status: "duplicate" };
      }
      const payload = event.payload as Record<string, unknown>;
      if (payload.isOpen !== true) return this.recordAutomationFailure(event, automationKey, "PORTAL_SOURCE_NOT_PUBLIC");
      const isRecruitment = event.eventType === "recruitment.batch.opened";
      const titlePart = isRecruitment ? payload.batchName : payload.activityTitle;
      const target = isRecruitment ? "/join" : payload.publicRoute;
      const expiresAt = payload.publicEndAt;
      if (typeof titlePart !== "string" || !isSafeInternalPath(target) || typeof expiresAt !== "string") {
        return this.recordAutomationFailure(event, automationKey, "PORTAL_AUTOMATION_FAILED");
      }
      const now = new Date(event.occurredAt);
      const id = `portal-flash-${semanticEventId(event)}`;
      const record: PortalContentRecord = {
        id,
        kind: "flash",
        slug: slugify(`${event.sourceId}-${event.sourceVersion}`),
        title: `${titlePart}${isRecruitment ? "报名已开放" : "开始报名"}`,
        summary: isRecruitment ? "系统根据招新批次开放事件生成。" : "系统根据活动报名开放事件生成。",
        target: { type: "internal-route", value: target },
        status: "draft",
        publishedState: "unpublished",
        revision: 1,
        blocks: [],
        originType: "system-event",
        sourceValidity: "valid",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        createdBy: "system",
        expiresAt,
        sourceDomain: event.sourceDomain,
        sourceId: event.sourceId,
        sourceVersion: event.sourceVersion,
        sourceEventType: event.eventType,
        automationKey,
        generatedReason: event.eventType,
        audit: [],
      };
      addAudit(record, "create", "system", now);
      this.records.unshift(record);
      this.automationFailures = this.automationFailures.filter((failure) => failure.automationKey !== automationKey);
      this.persist();
      return { status: "created", contentId: id };
    },
    recordAutomationFailure(event: PortalSourceEvent, automationKey: string, errorCode: string): PortalAutomationResult {
      const now = new Date(event.occurredAt);
      const existing = this.automationFailures.find((failure) => failure.automationKey === automationKey);
      const audit: PortalContentAuditRecord = {
        id: `portal-automation-${eventIdPart(automationKey)}-${now.getTime()}`,
        action: "automation-failed",
        actorId: "system",
        actualAt: now.toISOString(),
        revision: 0,
      };
      if (existing) {
        existing.errorCode = errorCode;
        existing.updatedAt = now.toISOString();
        existing.audit.unshift(audit);
      } else {
        this.automationFailures.unshift({
          automationKey,
          event: clone(event),
          errorCode,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          audit: [audit],
        });
      }
      this.persist();
      return { status: "failed", errorCode };
    },
    retryAutomationDraft(automationKey: string) {
      const failure = this.automationFailures.find((item) => item.automationKey === automationKey);
      if (!failure) return { status: "failed", errorCode: "PORTAL_AUTOMATION_FAILED" } as PortalAutomationResult;
      return this.createSystemDraft(clone(failure.event));
    },
    syncSourceEligibility(now: Date = new Date()) {
      let changed = false;
      for (const record of this.records) {
        if (record.sourceValidity !== "valid" || !record.expiresAt || Date.parse(record.expiresAt) > now.getTime()) continue;
        record.sourceValidity = "expired";
        if (record.publishedRevision) record.publishedRevision.sourceValidity = "expired";
        addAudit(record, "source-expired", "system", now);
        changed = true;
      }
      if (changed) this.persist();
      return changed;
    },
    invalidateSource(sourceDomain: "recruitment-batch" | "activity", sourceId: string, now: Date = new Date()) {
      let changed = false;
      for (const record of this.records) {
        if (record.sourceDomain !== sourceDomain || record.sourceId !== sourceId || record.sourceValidity !== "valid") continue;
        record.sourceValidity = "invalid";
        if (record.publishedRevision) record.publishedRevision.sourceValidity = "invalid";
        addAudit(record, "source-invalidated", "system", now);
        changed = true;
      }
      if (changed) this.persist();
      return changed;
    },
    assertSourcePublic(record: PortalContentRecord, now: Date = new Date()) {
      this.syncSourceEligibility(now);
      if (record.sourceValidity !== "valid") throw new Error("PORTAL_SOURCE_NOT_PUBLIC");
    },
  },
});
