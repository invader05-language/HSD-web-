import { defineStore } from "pinia";
import type {
  ContentBlock,
  PortalAutomationResult,
  PortalContentAuditRecord,
  PortalContentDraftInput,
  PortalContentRecord,
  PortalContentSnapshot,
  PortalAutomationFailure,
  PortalSourceEvent,
} from "../types/portal-content";
import type { ContentMediaAttachment } from "../types/content-media";
import { useSessionStore } from "./session";
import { canUseAssetForPortalContent } from "../data/admin-assets";
import { createLegacyContentMediaAttachment, isContentMediaAttachmentComplete } from "../utils/content-media";
import { canAccessPortalContent } from "../utils/admin-center-scope";
import { isSafeInternalPath } from "../utils/internal-route";

export const PORTAL_CONTENT_STORAGE_KEY = "baiyun-hsd.portal-content";
export const PORTAL_CONTENT_STORAGE_VERSION = 4;
const LEGACY_PORTAL_CONTENT_STORAGE_VERSIONS = [3, PORTAL_CONTENT_STORAGE_VERSION] as const;

interface PersistedPortalContentState {
  version: typeof PORTAL_CONTENT_STORAGE_VERSION;
  records: PortalContentRecord[];
  automationFailures: PortalAutomationFailure[];
}

export interface PortalContentStoreSnapshot {
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

function publishedTarget(kind: PortalContentRecord["kind"], slug: string, target: PortalContentRecord["target"]) {
  return kind === "article" || kind === "notice" || kind === "flash"
    ? { type: "internal-route" as const, value: `/updates/${encodeURIComponent(slug)}` }
    : clone(target);
}

function assertUniqueSlug(records: readonly PortalContentRecord[], slug: string, excludedId?: string) {
  const duplicate = records.some((record) => {
    if (record.id === excludedId) return false;
    if (slugify(record.slug) === slug) return true;
    return record.publishedState === "published"
      && Boolean(record.publishedRevision)
      && slugify(record.publishedRevision!.slug) === slug;
  });
  if (duplicate) {
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
    && typeof value.targetId === "string"
    && typeof value.beforeRevision === "number"
    && typeof value.afterRevision === "number"
    && typeof value.actualAt === "string"
    && (value.reason === undefined || typeof value.reason === "string")
    && (value.sourceEventId === undefined || typeof value.sourceEventId === "string");
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

function isMediaAttachment(value: unknown): value is ContentMediaAttachment {
  return isRecord(value)
    && typeof value.id === "string"
    && (value.role === "cover" || value.role === "detail")
    && (value.kind === "image" || value.kind === "video")
    && typeof value.title === "string"
    && typeof value.caption === "string"
    && typeof value.alt === "string"
    && (value.aspect === "landscape" || value.aspect === "portrait" || value.aspect === "wide")
    && typeof value.sortOrder === "number"
    && (value.status === "uploading" || value.status === "processing" || value.status === "ready" || value.status === "failed")
    && (value.mediaId === undefined || typeof value.mediaId === "string")
    && (value.legacyAssetId === undefined || typeof value.legacyAssetId === "string")
    && (value.localBlobId === undefined || typeof value.localBlobId === "string")
    && (value.url === undefined || typeof value.url === "string")
    && (value.thumbnailUrl === undefined || typeof value.thumbnailUrl === "string")
    && (value.errorMessage === undefined || typeof value.errorMessage === "string");
}

function normalizeContentBlocks(value: unknown): ContentBlock[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized: ContentBlock[] = [];
  for (const block of value) {
    if (!isRecord(block) || typeof block.type !== "string") return undefined;
    if (block.type === "heading" || block.type === "paragraph") {
      if (typeof block.text !== "string") return undefined;
      normalized.push({ type: block.type, text: block.text });
      continue;
    }
    if (block.type !== "image") return undefined;
    if (isMediaAttachment(block.media)) {
      normalized.push({
        type: "image",
        media: block.media,
        alt: typeof block.alt === "string" ? block.alt : block.media.alt ?? "",
        ...(typeof block.caption === "string" ? { caption: block.caption } : {}),
      });
      continue;
    }
    if (typeof block.assetId !== "string" || !block.assetId.trim() || !canUseAssetForPortalContent(block.assetId) || typeof block.alt !== "string") return undefined;
    normalized.push({
      type: "image",
      media: createLegacyContentMediaAttachment(block.assetId, block.alt, typeof block.caption === "string" ? block.caption : ""),
      alt: block.alt,
      ...(typeof block.caption === "string" ? { caption: block.caption } : {}),
    });
  }
  return normalized;
}

function isBlocks(value: unknown): boolean {
  const normalized = normalizeContentBlocks(value);
  return Boolean(normalized?.every((block) => {
    if (block.type === "heading" || block.type === "paragraph") return block.text.trim().length > 0;
    return Boolean(block.alt.trim()) && Boolean(block.media && isContentMediaAttachmentComplete(block.media));
  }));
}

function hasMeaningfulStructuredText(kind: unknown, blocks: unknown): boolean {
  if (kind === "flash") return true;
  return Array.isArray(blocks) && blocks.some((block) => (
    isRecord(block)
    && (block.type === "heading" || block.type === "paragraph")
    && typeof block.text === "string"
    && block.text.trim().length > 0
  ));
}

function assertValidContentShape(kind: unknown, title: unknown, summary: unknown, target: unknown, blocks: unknown) {
  if (typeof title !== "string" || !title.trim()) throw new Error("PORTAL_CONTENT_INVALID_TITLE");
  if (typeof summary !== "string" || !summary.trim()) throw new Error("PORTAL_CONTENT_INVALID_SUMMARY");
  if (!isTarget(target)) throw new Error("PORTAL_CONTENT_INVALID_TARGET");
  if (!isBlocks(blocks) || !hasMeaningfulStructuredText(kind, blocks)) throw new Error("PORTAL_CONTENT_INVALID_BLOCK");
}

function migrateRecord(value: PortalContentRecord): PortalContentRecord | undefined {
  const blocks = normalizeContentBlocks(value.blocks);
  if (!blocks) return undefined;
  const publishedRevision = value.publishedRevision
    ? { ...value.publishedRevision, blocks: normalizeContentBlocks(value.publishedRevision.blocks) }
    : undefined;
  if (value.publishedRevision && !publishedRevision?.blocks) return undefined;
  return {
    ...value,
    blocks,
    ...(publishedRevision ? { publishedRevision: { ...publishedRevision, blocks: publishedRevision.blocks! } } : {}),
  };
}

function isValidContentShape(kind: unknown, title: unknown, summary: unknown, target: unknown, blocks: unknown): boolean {
  try {
    assertValidContentShape(kind, title, summary, target, blocks);
    return true;
  } catch {
    return false;
  }
}

function isPublishedSnapshot(value: unknown): value is PortalContentSnapshot {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && ["flash", "article", "notice"].includes(value.kind as string)
    && typeof value.slug === "string"
    && isValidContentShape(value.kind, value.title, value.summary, value.target, value.blocks)
    && typeof value.revision === "number"
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
    && isValidContentShape(value.kind, value.title, value.summary, value.target, value.blocks)
    && ["draft", "in-review", "pending-publication", "published", "unpublished"].includes(value.status as string)
    && ["published", "unpublished"].includes(value.publishedState as string)
    && typeof value.revision === "number"
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
    && (value.resolvedAt === undefined || typeof value.resolvedAt === "string")
    && Array.isArray(value.audit)
    && value.audit.every(isAuditRecord);
}

function readPersistedState(): PersistedPortalContentState | undefined {
  const serialized = getStorage()?.getItem(PORTAL_CONTENT_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed)
      || !LEGACY_PORTAL_CONTENT_STORAGE_VERSIONS.includes(parsed.version as 3 | 4)
      || !Array.isArray(parsed.records)
      || !Array.isArray(parsed.automationFailures)
      || !parsed.automationFailures.every(isAutomationFailure)) {
      return undefined;
    }
    const records = parsed.records.map((record) => migrateRecord(record as PortalContentRecord));
    if (records.some((record) => !record) || records.some((record) => !isPortalContentRecord(record))) return undefined;
    const migrated = {
      version: PORTAL_CONTENT_STORAGE_VERSION,
      records: records as PortalContentRecord[],
      automationFailures: clone(parsed.automationFailures as PortalAutomationFailure[]),
    } satisfies PersistedPortalContentState;
    if (parsed.version !== PORTAL_CONTENT_STORAGE_VERSION) {
      try {
        getStorage()?.setItem(PORTAL_CONTENT_STORAGE_KEY, JSON.stringify(migrated));
      } catch {
        // Migration is still usable in memory when browser storage is unavailable.
      }
    }
    return clone(migrated);
  } catch {
    return undefined;
  }
}

function writePersistedState(records: readonly PortalContentRecord[], automationFailures: readonly PortalAutomationFailure[]) {
  try {
    const storage = getStorage();
    if (!storage) throw new Error("storage unavailable");
    storage.setItem(PORTAL_CONTENT_STORAGE_KEY, JSON.stringify({
      version: PORTAL_CONTENT_STORAGE_VERSION,
      records: [...records],
      automationFailures: [...automationFailures],
    } satisfies PersistedPortalContentState));
  } catch {
    throw new Error("PORTAL_CONTENT_PERSISTENCE_FAILED");
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
      blocks: input.blocks ?? (input.kind === "flash" ? [] : [{ type: "paragraph", text: input.summary }]),
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

function assertCanManagePortalContent(record: PortalContentRecord, actor: string) {
  const session = useSessionStore();
  if (!canAccessPortalContent(record, {
    operatorId: actor,
    centerRole: session.currentAccount?.adminCenterRole,
  })) {
    throw new Error("PORTAL_CONTENT_FORBIDDEN");
  }
}

function addAudit(
  record: PortalContentRecord,
  action: PortalContentAuditRecord["action"],
  actor: string,
  now: Date,
  beforeRevision: number,
  reason?: string,
  sourceEventId?: string,
) {
  record.audit.unshift({
    id: `portal-content-${record.id}-${record.revision}-${action}-${now.getTime()}`,
    action,
    actorId: actor,
    targetId: record.id,
    beforeRevision,
    afterRevision: record.revision,
    actualAt: now.toISOString(),
    ...(reason ? { reason } : {}),
    ...(sourceEventId ? { sourceEventId } : {}),
  });
}

function automationAudit(
  event: PortalSourceEvent,
  automationKey: string,
  action: "automation-failed" | "automation-duplicate" | "automation-retried",
  reason?: string,
  actualAt: Date = new Date(),
): PortalContentAuditRecord {
  return {
    id: `portal-automation-${eventIdPart(automationKey)}-${action}-${actualAt.getTime()}`,
    action,
    actorId: "system",
    targetId: automationKey,
    beforeRevision: 0,
    afterRevision: 0,
    actualAt: actualAt.toISOString(),
    ...(reason ? { reason } : {}),
    sourceEventId: event.eventId,
  };
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
    captureSnapshot(): PortalContentStoreSnapshot {
      return {
        records: clone(this.records),
        automationFailures: clone(this.automationFailures),
      };
    },
    restoreSnapshot(snapshot: PortalContentStoreSnapshot) {
      this.persistProposed(snapshot.records, snapshot.automationFailures);
      this.records = clone(snapshot.records);
      this.automationFailures = clone(snapshot.automationFailures);
    },
    persist() {
      try {
        writePersistedState(this.records, this.automationFailures);
        this.persistenceError = undefined;
      } catch {
        this.persistenceError = "PORTAL_CONTENT_PERSISTENCE_FAILED";
        throw new Error("PORTAL_CONTENT_PERSISTENCE_FAILED");
      }
    },
    persistProposed(records: readonly PortalContentRecord[], automationFailures: readonly PortalAutomationFailure[]) {
      try {
        writePersistedState(records, automationFailures);
        this.persistenceError = undefined;
      } catch {
        this.persistenceError = "PORTAL_CONTENT_PERSISTENCE_FAILED";
        throw new Error("PORTAL_CONTENT_PERSISTENCE_FAILED");
      }
    },
    applyRecord(next: PortalContentRecord) {
      const current = this.getById(next.id);
      if (!current) throw new Error("PORTAL_CONTENT_NOT_FOUND");
      Object.assign(current, clone(next));
      return current;
    },
    applyRecords(nextRecords: readonly PortalContentRecord[]) {
      for (const next of nextRecords) {
        const current = this.getById(next.id);
        if (current) Object.assign(current, clone(next));
      }
    },
    createDraft(input: PortalContentDraftInput, now: Date = new Date()) {
      const actor = actorId();
      const slug = slugify(input.slug ?? input.title);
      const authoredTarget = input.target ?? { type: "internal-route" as const, value: "/activities" };
      const blocks = normalizeContentBlocks(input.blocks ?? []);
      if (!blocks) throw new Error("PORTAL_CONTENT_INVALID_BLOCK");
      assertValidContentShape(input.kind, input.title, input.summary, authoredTarget, blocks);
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
      addAudit(record, "create", actor, now, 0);
      this.persistProposed([record, ...this.records], this.automationFailures);
      this.records.unshift(record);
      return this.getById(record.id)!;
    },
    updateDraft(id: string, patch: Partial<PortalContentDraftInput>, now: Date = new Date()) {
      const actor = actorId();
      const record = this.getById(id);
      if (!record) throw new Error("PORTAL_CONTENT_NOT_FOUND");
      assertCanManagePortalContent(record, actor);
      if (!["draft", "published", "unpublished"].includes(record.status)) {
        throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      }
      const slug = patch.slug === undefined ? record.slug : slugify(patch.slug);
      const authoredTarget = patch.target === undefined ? record.target : patch.target;
      const blocks = patch.blocks === undefined ? record.blocks : normalizeContentBlocks(patch.blocks);
      if (!blocks) throw new Error("PORTAL_CONTENT_INVALID_BLOCK");
      const title = patch.title === undefined ? record.title : patch.title;
      const summary = patch.summary === undefined ? record.summary : patch.summary;
      assertValidContentShape(record.kind, title, summary, authoredTarget, blocks);
      assertUniqueSlug(this.records, slug, record.id);
      const next = clone(record);
      const beforeRevision = next.revision;
      if (next.status !== "draft") {
        next.status = "draft";
        next.revision += 1;
      }
      next.title = title.trim();
      next.summary = summary.trim();
      next.slug = slug;
      next.target = publicTarget(next.kind, slug, authoredTarget);
      next.blocks = clone(blocks);
      if (patch.expiresAt !== undefined) next.expiresAt = patch.expiresAt;
      next.updatedAt = now.toISOString();
      addAudit(next, "update", actor, now, beforeRevision);
      this.persistProposed(this.records.map((item) => item.id === id ? next : item), this.automationFailures);
      return this.applyRecord(next);
    },
    submitForReview(id: string, now: Date = new Date()) {
      const actor = actorId();
      const record = this.getById(id);
      if (!record || record.status !== "draft") throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      assertCanManagePortalContent(record, actor);
      assertValidContentShape(record.kind, record.title, record.summary, record.target, record.blocks);
      const slug = slugify(record.slug);
      assertUniqueSlug(this.records, slug, record.id);
      this.assertSourcePublic(record, now);
      const next = clone(record);
      next.slug = slug;
      next.target = publicTarget(next.kind, slug, next.target);
      next.status = "in-review";
      next.updatedAt = now.toISOString();
      addAudit(next, "submit", actor, now, record.revision);
      this.persistProposed(this.records.map((item) => item.id === id ? next : item), this.automationFailures);
      return this.applyRecord(next);
    },
    returnToDraft(id: string, reason: string, now: Date = new Date()) {
      const actor = ownerActorId();
      const record = this.getById(id);
      if (!record || record.status !== "in-review" || !reason.trim()) throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      const next = clone(record);
      next.status = "draft";
      next.updatedAt = now.toISOString();
      addAudit(next, "return", actor, now, record.revision, reason.trim());
      this.persistProposed(this.records.map((item) => item.id === id ? next : item), this.automationFailures);
      return this.applyRecord(next);
    },
    approve(id: string, now: Date = new Date()) {
      const actor = ownerActorId();
      const record = this.getById(id);
      if (!record || record.status !== "in-review") throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      assertValidContentShape(record.kind, record.title, record.summary, record.target, record.blocks);
      this.assertSourcePublic(record, now);
      const next = clone(record);
      next.target = publicTarget(next.kind, next.slug, next.target);
      next.status = "pending-publication";
      next.updatedAt = now.toISOString();
      addAudit(next, "approve", actor, now, record.revision);
      this.persistProposed(this.records.map((item) => item.id === id ? next : item), this.automationFailures);
      return this.applyRecord(next);
    },
    publish(id: string, confirmed: boolean, now: Date = new Date()) {
      const actor = ownerActorId();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      const record = this.getById(id);
      if (!record || record.status !== "pending-publication" || record.sourceValidity !== "valid") {
        throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      }
      assertValidContentShape(record.kind, record.title, record.summary, record.target, record.blocks);
      const slug = slugify(record.slug);
      assertUniqueSlug(this.records, slug, record.id);
      this.assertSourcePublic(record, now);
      const publishedAt = now.toISOString();
      const next = clone(record);
      next.slug = slug;
      next.target = publishedTarget(next.kind, slug, next.target);
      next.status = "published";
      next.publishedState = "published";
      next.publishedAt = publishedAt;
      next.updatedAt = publishedAt;
      next.publishedRevision = snapshot(next, publishedAt);
      addAudit(next, "publish", actor, now, record.revision);
      this.persistProposed(this.records.map((item) => item.id === id ? next : item), this.automationFailures);
      return this.applyRecord(next);
    },
    unpublish(id: string, reason: string, now: Date = new Date()) {
      const actor = ownerActorId();
      const record = this.getById(id);
      if (!record || !record.publishedRevision || !reason.trim()) throw new Error("PORTAL_CONTENT_INVALID_TRANSITION");
      const next = clone(record);
      next.publishedState = "unpublished";
      if (next.status === "published") next.status = "unpublished";
      next.updatedAt = now.toISOString();
      addAudit(next, "unpublish", actor, now, record.revision, reason.trim());
      this.persistProposed(this.records.map((item) => item.id === id ? next : item), this.automationFailures);
      return this.applyRecord(next);
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
    createSystemDraft(
      event: PortalSourceEvent,
      options: { resolvedFailure?: PortalAutomationFailure; actualAt?: Date } = {},
    ): PortalAutomationResult {
      const automationKey = eventKey(event);
      const existing = this.records.find((record) => record.automationKey === automationKey);
      if (existing) {
        const next = clone(existing);
        addAudit(
          next,
          "automation-duplicate",
          "system",
          options.actualAt ?? new Date(event.occurredAt),
          existing.revision,
          undefined,
          event.eventId,
        );
        try {
          const nextFailures = this.automationFailures.filter((failure) => failure.automationKey !== automationKey);
          if (options.resolvedFailure) nextFailures.unshift(clone(options.resolvedFailure));
          this.persistProposed(this.records.map((record) => record.id === existing.id ? next : record), nextFailures);
          this.applyRecord(next);
          this.automationFailures = nextFailures;
          return { status: "duplicate" };
        } catch {
          return this.recordAutomationFailure(event, automationKey, "PORTAL_CONTENT_PERSISTENCE_FAILED", options.actualAt);
        }
      }
      const payload = event.payload as Record<string, unknown>;
      if (payload.isOpen !== true) return this.recordAutomationFailure(event, automationKey, "PORTAL_SOURCE_NOT_PUBLIC", options.actualAt);
      const isRecruitment = event.eventType === "recruitment.batch.opened";
      const titlePart = isRecruitment ? payload.batchName : payload.activityTitle;
      const target = isRecruitment ? "/join" : payload.publicRoute;
      const expiresAt = payload.publicEndAt;
      if (typeof titlePart !== "string" || !isSafeInternalPath(target) || typeof expiresAt !== "string") {
        return this.recordAutomationFailure(event, automationKey, "PORTAL_AUTOMATION_FAILED", options.actualAt);
      }
      const now = options.actualAt ?? new Date(event.occurredAt);
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
      addAudit(record, "create", "system", now, 0, event.eventType, event.eventId);
      const nextFailures = this.automationFailures.filter((failure) => failure.automationKey !== automationKey);
      if (options.resolvedFailure) nextFailures.unshift(clone(options.resolvedFailure));
      try {
        this.persistProposed([record, ...this.records], nextFailures);
      } catch {
        return this.recordAutomationFailure(event, automationKey, "PORTAL_CONTENT_PERSISTENCE_FAILED", options.actualAt);
      }
      this.records.unshift(record);
      this.automationFailures = nextFailures;
      return { status: "created", contentId: id };
    },
    recordAutomationFailure(
      event: PortalSourceEvent,
      automationKey: string,
      errorCode: string,
      actualAt: Date = new Date(event.occurredAt),
    ): PortalAutomationResult {
      const now = actualAt;
      const nextFailures = clone(this.automationFailures);
      const existing = nextFailures.find((failure) => failure.automationKey === automationKey);
      const audit = automationAudit(event, automationKey, "automation-failed", errorCode, now);
      if (existing) {
        existing.errorCode = errorCode;
        existing.updatedAt = now.toISOString();
        delete existing.resolvedAt;
        existing.audit.unshift(audit);
      } else {
        nextFailures.unshift({
          automationKey,
          event: clone(event),
          errorCode,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          audit: [audit],
        });
      }
      try {
        this.persistProposed(this.records, nextFailures);
        this.automationFailures = nextFailures;
        return { status: "failed", errorCode, automationKey };
      } catch {
        const persistenceError = "PORTAL_CONTENT_PERSISTENCE_FAILED";
        const retained = nextFailures.find((failure) => failure.automationKey === automationKey)!;
        retained.errorCode = persistenceError;
        retained.updatedAt = now.toISOString();
        retained.audit[0] = automationAudit(event, automationKey, "automation-failed", persistenceError, now);
        this.automationFailures = nextFailures;
        return { status: "failed", errorCode: persistenceError, automationKey };
      }
    },
    retryAutomationDraft(automationKey: string, now: Date = new Date()) {
      const failure = this.automationFailures.find((item) => item.automationKey === automationKey);
      if (!failure) return { status: "failed", errorCode: "PORTAL_AUTOMATION_FAILED", automationKey } as PortalAutomationResult;
      const resolvedFailure = clone(failure);
      resolvedFailure.updatedAt = now.toISOString();
      resolvedFailure.resolvedAt = now.toISOString();
      resolvedFailure.audit.unshift(automationAudit(
        failure.event,
        automationKey,
        "automation-retried",
        "automation retry succeeded",
        now,
      ));
      return this.createSystemDraft(clone(failure.event), { resolvedFailure, actualAt: now });
    },
    syncSourceEligibility(now: Date = new Date()) {
      const nextRecords = clone(this.records);
      let changed = false;
      for (const record of nextRecords) {
        if (record.sourceValidity !== "valid" || !record.expiresAt || Date.parse(record.expiresAt) > now.getTime()) continue;
        const beforeRevision = record.revision;
        record.sourceValidity = "expired";
        if (record.publishedRevision) record.publishedRevision.sourceValidity = "expired";
        addAudit(record, "source-expired", "system", now, beforeRevision);
        changed = true;
      }
      if (changed) {
        try {
          this.persistProposed(nextRecords, this.automationFailures);
        } catch {
          this.persistenceError = "PORTAL_CONTENT_PERSISTENCE_FAILED";
        }
        this.applyRecords(nextRecords);
      }
      return changed;
    },
    invalidateSource(sourceDomain: "recruitment-batch" | "activity", sourceId: string, now: Date = new Date()) {
      const nextRecords = clone(this.records);
      let changed = false;
      for (const record of nextRecords) {
        if (record.sourceDomain !== sourceDomain || record.sourceId !== sourceId || record.sourceValidity !== "valid") continue;
        const beforeRevision = record.revision;
        record.sourceValidity = "invalid";
        if (record.publishedRevision) record.publishedRevision.sourceValidity = "invalid";
        addAudit(record, "source-invalidated", "system", now, beforeRevision);
        changed = true;
      }
      if (changed) {
        this.persistProposed(nextRecords, this.automationFailures);
        this.applyRecords(nextRecords);
      }
      return changed;
    },
    assertSourcePublic(record: PortalContentRecord, now: Date = new Date()) {
      this.syncSourceEligibility(now);
      if (record.sourceValidity !== "valid") throw new Error("PORTAL_SOURCE_NOT_PUBLIC");
    },
  },
});
