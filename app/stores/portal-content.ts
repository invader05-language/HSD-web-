import { defineStore } from "pinia";
import type {
  PortalAutomationResult,
  PortalContentAuditRecord,
  PortalContentDraftInput,
  PortalContentRecord,
  PortalContentSnapshot,
  PortalContentStatus,
  PortalSourceEvent,
} from "../types/portal-content";
import { useSessionStore } from "./session";

export const PORTAL_CONTENT_STORAGE_KEY = "baiyun-hsd.portal-content";
export const PORTAL_CONTENT_STORAGE_VERSION = 1;

interface PersistedPortalContentState {
  version: typeof PORTAL_CONTENT_STORAGE_VERSION;
  records: PortalContentRecord[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || `content-${Date.now()}`;
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

function readPersistedRecords(): PortalContentRecord[] | undefined {
  const serialized = getStorage()?.getItem(PORTAL_CONTENT_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed) || parsed.version !== PORTAL_CONTENT_STORAGE_VERSION || !Array.isArray(parsed.records)) {
      return undefined;
    }
    return clone(parsed.records as PortalContentRecord[]);
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
    published({ kind: "article", title: "从一次分享会，到一支真正协作的项目团队", summary: "记录成员从技术交流到原型落地。", target: { type: "internal-route", value: "/updates/project-team" } }, "article-project-team", "2026-07-24T08:00:00.000Z"),
    published({ kind: "notice", title: "实训工作室暑期开放安排", summary: "说明暑期值班、设备借用与安全管理安排。", target: { type: "internal-route", value: "/updates/studio-hours" } }, "notice-studio", "2026-07-20T08:00:00.000Z"),
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

export const usePortalContentStore = defineStore("portal-content", {
  state: () => ({
    records: readPersistedRecords() ?? seedRecords(),
    persistenceError: undefined as string | undefined,
  }),
  getters: {
    getById: (state) => (id: string) => state.records.find((record) => record.id === id),
    publicRecords: (state): PortalContentSnapshot[] => state.records
      .map((record) => record.publishedRevision)
      .filter((record): record is PortalContentSnapshot => Boolean(record))
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
        } satisfies PersistedPortalContentState));
        this.persistenceError = undefined;
      } catch {
        this.persistenceError = "PORTAL_CONTENT_STORAGE_UNAVAILABLE";
      }
    },
    createDraft(input: PortalContentDraftInput, now: Date = new Date()) {
      const actor = actorId();
      const id = `portal-${input.kind}-${now.getTime()}-${this.records.length + 1}`;
      const record: PortalContentRecord = {
        id,
        kind: input.kind,
        slug: input.slug ?? slugify(input.title),
        title: input.title.trim(),
        summary: input.summary.trim(),
        target: input.target ?? { type: "internal-route", value: "/activities" },
        status: "draft",
        revision: 1,
        blocks: clone(input.blocks ?? []),
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
      if (record.status !== "draft") {
        record.status = "draft";
        record.revision += 1;
      }
      if (patch.title !== undefined) record.title = patch.title.trim();
      if (patch.summary !== undefined) record.summary = patch.summary.trim();
      if (patch.slug !== undefined) record.slug = patch.slug;
      if (patch.target !== undefined) record.target = clone(patch.target);
      if (patch.blocks !== undefined) record.blocks = clone(patch.blocks);
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
      const publishedAt = now.toISOString();
      record.status = "published";
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
      record.status = "unpublished";
      record.publishedRevision = undefined;
      record.updatedAt = now.toISOString();
      addAudit(record, "unpublish", actor, now, reason);
      this.persist();
      return record;
    },
    getPublicById(id: string) {
      const record = this.getById(id)?.publishedRevision;
      return record && record.sourceValidity === "valid" ? clone({ ...record, status: "published" as const }) : undefined;
    },
    createSystemDraft(event: PortalSourceEvent): PortalAutomationResult {
      const automationKey = [event.sourceDomain, event.sourceId, event.eventType, event.sourceVersion].join(":");
      if (this.records.some((record) => record.automationKey === automationKey)) return { status: "duplicate" };
      const payload = event.payload as Record<string, unknown>;
      if (payload.isOpen !== true) return { status: "failed", errorCode: "PORTAL_SOURCE_NOT_PUBLIC" };
      const isRecruitment = event.eventType === "recruitment.batch.opened";
      const titlePart = isRecruitment ? payload.batchName : payload.activityTitle;
      const target = isRecruitment ? "/join" : payload.publicRoute;
      const expiresAt = payload.publicEndAt;
      if (typeof titlePart !== "string" || typeof target !== "string" || typeof expiresAt !== "string") {
        return { status: "failed", errorCode: "PORTAL_AUTOMATION_FAILED" };
      }
      const now = new Date(event.occurredAt);
      const id = `portal-flash-${event.sourceId}-${event.sourceVersion}`;
      const record: PortalContentRecord = {
        id,
        kind: "flash",
        slug: slugify(`${event.sourceId}-${event.sourceVersion}`),
        title: `${titlePart}${isRecruitment ? "报名已开放" : "开始报名"}`,
        summary: isRecruitment ? "系统根据招新批次开放事件生成。" : "系统根据活动报名开放事件生成。",
        target: { type: "internal-route", value: target },
        status: "draft",
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
      this.persist();
      return { status: "created", contentId: id };
    },
    retryAutomationDraft(event: PortalSourceEvent) {
      return this.createSystemDraft(event);
    },
  },
});
