import { defineStore } from "pinia";
import { cloneRecruitmentBatches, RECRUITMENT_BATCHES } from "../data/recruitment-batches";
import {
  RecruitmentBatchCommandError,
} from "../types/recruitment-batch";
import type {
  RecruitmentBatch,
  RecruitmentBatchAuditRecord,
  RecruitmentBatchDraftInput,
  RecruitmentBatchEffectiveStatus,
  RecruitmentBatchPublishReadiness,
} from "../types/recruitment-batch";
import {
  getCurrentOpenBatch,
  getEffectiveRecruitmentBatchStatus,
  getUpcomingRecruitmentBatch,
} from "../utils/recruitment-batch-rules";
import { useSessionStore } from "./session";
import { useRecruitmentApplicationStore } from "./recruitment-application";
import { PortalAutomationServiceMock } from "../services/portal-automation.mock";
import { usePortalContentStore } from "./portal-content";

type RecruitmentBatchPatch = Partial<Pick<
  RecruitmentBatch,
  | "name"
  | "startAt"
  | "endAt"
  | "openCenterIds"
  | "responsibleAccountIds"
>>;

export const RECRUITMENT_BATCH_STORAGE_KEY = "baiyun-hsd-recruitment-batches";
export const RECRUITMENT_BATCH_STORAGE_VERSION = 1;

type RecruitmentBatchAutomationFailure = {
  batchId: string;
  errorCode: string;
  automationKey: string;
};

interface BatchCommitSnapshot {
  batches: RecruitmentBatch[];
  auditRecords: RecruitmentBatchAuditRecord[];
  automationFailures: RecruitmentBatchAutomationFailure[];
  assessmentPublishedAt: Record<string, string>;
  assessmentStartedAt: Record<string, string>;
}

interface PersistedRecruitmentBatchState {
  version: typeof RECRUITMENT_BATCH_STORAGE_VERSION;
  batches: RecruitmentBatch[];
  auditRecords?: RecruitmentBatchAuditRecord[];
  automationFailures?: RecruitmentBatchAutomationFailure[];
  assessmentPublishedAt?: Record<string, string>;
  assessmentStartedAt?: Record<string, string>;
}

function cloneBatch(batch: RecruitmentBatch): RecruitmentBatch {
  return {
    ...batch,
    openCenterIds: [...batch.openCenterIds],
    responsibleAccountIds: [...batch.responsibleAccountIds],
  };
}

function cloneAuditRecord(record: RecruitmentBatchAuditRecord): RecruitmentBatchAuditRecord {
  return {
    ...record,
    before: record.before ? { ...record.before } : undefined,
    after: record.after ? { ...record.after } : undefined,
  };
}

function cloneCommitSnapshot(snapshot: BatchCommitSnapshot): BatchCommitSnapshot {
  return {
    batches: snapshot.batches.map(cloneBatch),
    auditRecords: snapshot.auditRecords.map(cloneAuditRecord),
    automationFailures: snapshot.automationFailures.map((failure) => ({ ...failure })),
    assessmentPublishedAt: { ...snapshot.assessmentPublishedAt },
    assessmentStartedAt: { ...snapshot.assessmentStartedAt },
  };
}

function getStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function isPersistedBatch(value: unknown): value is RecruitmentBatch {
  if (!value || typeof value !== "object") return false;
  const batch = value as Partial<RecruitmentBatch>;
  return typeof batch.id === "string"
    && typeof batch.name === "string"
    && typeof batch.startAt === "string"
    && typeof batch.endAt === "string"
    && batch.timezone === "Asia/Shanghai"
    && Array.isArray(batch.openCenterIds)
    && batch.openCenterIds.every((id) => typeof id === "string")
    && Array.isArray(batch.responsibleAccountIds)
    && batch.responsibleAccountIds.every((id) => typeof id === "string")
    && ["draft", "published", "closed", "archived"].includes(batch.lifecycleStatus as string)
    && ["none", "force-open", "paused", "force-closed"].includes(batch.manualOverride as string)
    && typeof batch.version === "number"
    && typeof batch.createdAt === "string"
    && typeof batch.updatedAt === "string";
}

function restorePersistedState(): Omit<PersistedRecruitmentBatchState, "version"> | undefined {
  const serialized = getStorage()?.getItem(RECRUITMENT_BATCH_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object") return undefined;
    const value = parsed as Partial<PersistedRecruitmentBatchState>;
    if (value.version !== RECRUITMENT_BATCH_STORAGE_VERSION || !Array.isArray(value.batches)) return undefined;
    if (!value.batches.every(isPersistedBatch)) return undefined;
    const auditRecords = Array.isArray(value.auditRecords)
      ? value.auditRecords.filter((record) => record && typeof record === "object")
        .map((record) => cloneAuditRecord(record as RecruitmentBatchAuditRecord))
      : [];
    const automationFailures = Array.isArray(value.automationFailures)
      ? value.automationFailures.filter((failure) => failure && typeof failure === "object")
        .map((failure) => ({ ...(failure as RecruitmentBatchAutomationFailure) }))
      : [];
    const assessmentPublishedAt = value.assessmentPublishedAt && typeof value.assessmentPublishedAt === "object"
      ? Object.fromEntries(Object.entries(value.assessmentPublishedAt)
        .filter(([, timestamp]) => typeof timestamp === "string"))
      : {};
    const assessmentStartedAt = value.assessmentStartedAt && typeof value.assessmentStartedAt === "object"
      ? Object.fromEntries(Object.entries(value.assessmentStartedAt)
        .filter(([, timestamp]) => typeof timestamp === "string"))
      : {};
    return {
      batches: value.batches.map((batch) => cloneBatch(batch)),
      auditRecords,
      automationFailures,
      assessmentPublishedAt,
      assessmentStartedAt,
    };
  } catch {
    return undefined;
  }
}

function hasOverlappingWindow(left: RecruitmentBatch, right: RecruitmentBatch): boolean {
  const leftStart = Date.parse(left.manualOverride === "force-open" && left.actualOpenedAt ? left.actualOpenedAt : left.startAt);
  const leftEnd = Date.parse(left.endAt);
  const rightStart = Date.parse(right.manualOverride === "force-open" && right.actualOpenedAt ? right.actualOpenedAt : right.startAt);
  const rightEnd = Date.parse(right.endAt);
  return Number.isFinite(leftStart)
    && Number.isFinite(leftEnd)
    && Number.isFinite(rightStart)
    && Number.isFinite(rightEnd)
    && leftEnd > leftStart
    && rightEnd > rightStart
    && leftStart < rightEnd
    && rightStart < leftEnd;
}

export const useRecruitmentBatchStore = defineStore("recruitment-batch", {
  state: () => {
    const persisted = restorePersistedState();
    const initialSnapshot: BatchCommitSnapshot = {
      batches: persisted?.batches ?? cloneRecruitmentBatches(RECRUITMENT_BATCHES),
      auditRecords: persisted?.auditRecords ?? [],
      automationFailures: persisted?.automationFailures ?? [],
      assessmentPublishedAt: persisted?.assessmentPublishedAt ?? {},
      assessmentStartedAt: persisted?.assessmentStartedAt ?? {},
    };
    return {
      ...initialSnapshot,
      lastCommittedSnapshot: cloneCommitSnapshot(initialSnapshot),
    };
  },
  getters: {
    getBatch: (state) => (batchId: string) => state.batches.find((batch) => batch.id === batchId),
    currentOpenBatch(state): RecruitmentBatch | undefined {
      return getCurrentOpenBatch(state.batches);
    },
    currentOpenBatchAt: (state) => (now: Date = new Date()): RecruitmentBatch | undefined => (
      getCurrentOpenBatch(state.batches, now)
    ),
    currentPausedBatchAt: (state) => (now: Date = new Date()): RecruitmentBatch | undefined => (
      state.batches.find((batch) => getEffectiveRecruitmentBatchStatus(batch, now).status === "paused")
    ),
    upcomingBatch(state): RecruitmentBatch | undefined {
      return getUpcomingRecruitmentBatch(state.batches);
    },
    upcomingBatchAt: (state) => (now: Date = new Date()): RecruitmentBatch | undefined => (
      getUpcomingRecruitmentBatch(state.batches, now)
    ),
    effectiveStatus: (state) => (
      batchId: string,
      now: Date = new Date(),
    ): RecruitmentBatchEffectiveStatus | undefined => {
      const batch = state.batches.find((item) => item.id === batchId);
      return batch ? getEffectiveRecruitmentBatchStatus(batch, now).status : undefined;
    },
  },
  actions: {
    syncLifecycle(now: Date = new Date()) {
      const applications = useRecruitmentApplicationStore();
      applications.lockExpiredApplications(now);
      return this.batches.map((batch) => ({
        id: batch.id,
        status: getEffectiveRecruitmentBatchStatus(batch, now).status,
      }));
    },
    replaceBatches(batches: readonly RecruitmentBatch[]) {
      this.batches = batches.map(cloneBatch);
      this.auditRecords = [];
      this.automationFailures = [];
      this.assessmentPublishedAt = {};
      this.assessmentStartedAt = {};
      this.persistBatches();
    },
    persistBatches() {
      const storage = getStorage();
      const restoreCommitted = () => {
        const committed = cloneCommitSnapshot(this.lastCommittedSnapshot);
        this.batches = committed.batches;
        this.auditRecords = committed.auditRecords;
        this.automationFailures = committed.automationFailures;
        this.assessmentPublishedAt = committed.assessmentPublishedAt;
        this.assessmentStartedAt = committed.assessmentStartedAt;
      };
      if (!storage) {
        restoreCommitted();
        throw new Error("BATCH_STORAGE_UNAVAILABLE");
      }
      const nextSnapshot: BatchCommitSnapshot = {
        batches: this.batches.map(cloneBatch),
        auditRecords: this.auditRecords.map(cloneAuditRecord),
        automationFailures: this.automationFailures.map((failure) => ({ ...failure })),
        assessmentPublishedAt: { ...this.assessmentPublishedAt },
        assessmentStartedAt: { ...this.assessmentStartedAt },
      };
      try {
        storage.setItem(RECRUITMENT_BATCH_STORAGE_KEY, JSON.stringify({
          version: RECRUITMENT_BATCH_STORAGE_VERSION,
          ...nextSnapshot,
        } satisfies PersistedRecruitmentBatchState));
        this.lastCommittedSnapshot = cloneCommitSnapshot(nextSnapshot);
      } catch (error) {
        restoreCommitted();
        throw new Error("BATCH_STORAGE_WRITE_FAILED", { cause: error });
      }
    },
    markAssessmentPublished(batchId: string, timestamp: string) {
      const previous = this.assessmentPublishedAt[batchId];
      this.assessmentPublishedAt[batchId] = timestamp;
      try {
        this.persistBatches();
      } catch (error) {
        if (previous) this.assessmentPublishedAt[batchId] = previous;
        else delete this.assessmentPublishedAt[batchId];
        throw error;
      }
    },
    markAssessmentStarted(batchId: string, timestamp: string) {
      const previous = this.assessmentStartedAt[batchId];
      this.assessmentStartedAt[batchId] = previous ?? timestamp;
      try {
        this.persistBatches();
      } catch (error) {
        if (previous) this.assessmentStartedAt[batchId] = previous;
        else delete this.assessmentStartedAt[batchId];
        throw error;
      }
    },
    createBatch(input: RecruitmentBatchDraftInput, now: Date = new Date()) {
      const actor = this.resolveOwnerActor();
      const name = input.name.trim();
      const startAt = new Date(input.startAt);
      const endAt = new Date(input.endAt);
      const openCenterIds = [...new Set(input.openCenterIds)].filter(Boolean);
      if (!name) throw new Error("BATCH_NAME_REQUIRED");
      if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
        throw new Error("BATCH_WINDOW_INVALID");
      }
      if (openCenterIds.length === 0) throw new Error("BATCH_CENTER_REQUIRED");

      const timestamp = now.toISOString();
      const baseId = `batch-${name.toLocaleLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "") || "draft"}`;
      let id = baseId;
      let suffix = 2;
      while (this.batches.some((batch) => batch.id === id)) id = `${baseId}-${suffix++}`;
      const batch: RecruitmentBatch = {
        id,
        name,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        timezone: "Asia/Shanghai",
        openCenterIds,
        responsibleAccountIds: [actor.id],
        lifecycleStatus: "draft",
        manualOverride: "none",
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.batches.push(batch);
      this.appendAudit(batch, "create", actor, "draft", "draft", timestamp, "create recruitment batch");
      this.persistBatches();
      return batch;
    },
    getBatchOrThrow(batchId: string): RecruitmentBatch {
      const batch = this.batches.find((item) => item.id === batchId);
      if (!batch) throw new Error("RECRUITMENT_BATCH_NOT_FOUND");
      return batch;
    },
    resolveOwnerActor() {
      const session = useSessionStore();
      const account = session.currentAccount;
      if (!session.isAuthenticated || session.adminLevel !== "owner" || !account) {
        throw new Error("OWNER_PERMISSION_REQUIRED");
      }
      return { id: account.account, name: account.name };
    },
    appendAudit(
      batch: RecruitmentBatch,
      action: string,
      actor: { id: string; name: string },
      beforeStatus: RecruitmentBatchEffectiveStatus,
      afterStatus: RecruitmentBatchEffectiveStatus,
      actualAt: string,
      reason?: string,
      before?: Partial<RecruitmentBatch>,
    ) {
      this.auditRecords.unshift(cloneAuditRecord({
        id: `batch-audit-${batch.id}-${Date.now()}`,
        batchId: batch.id,
        action,
        actorId: actor.id,
        actorName: actor.name,
        beforeStatus,
        afterStatus,
        originalStartAt: batch.startAt,
        actualAt,
        reason,
        createdAt: actualAt,
        before,
        after: cloneBatch(batch),
      }));
    },
    assertNoOtherOpen(batchId: string, now: Date) {
      const open = getCurrentOpenBatch(this.batches.filter((batch) => batch.id !== batchId), now);
      if (open) throw new RecruitmentBatchCommandError("BATCH_ALREADY_OPEN", {
        conflict: {
          batchId: open.id,
          batchName: open.name,
          startAt: open.startAt,
          endAt: open.endAt,
        },
      });
    },
    assertNoOverlappingPublishedWindow(batchId: string, candidate: RecruitmentBatch) {
      if (candidate.lifecycleStatus !== "published") return;
      const conflict = this.batches.find((batch) => (
        batch.id !== batchId
        && batch.lifecycleStatus === "published"
        && hasOverlappingWindow(batch, candidate)
      ));
      if (conflict) throw new RecruitmentBatchCommandError("BATCH_SCHEDULE_OVERLAP", {
        conflict: {
          batchId: conflict.id,
          batchName: conflict.name,
          startAt: conflict.startAt,
          endAt: conflict.endAt,
        },
      });
    },
    getPublishReadiness(batchId: string, now: Date = new Date()): RecruitmentBatchPublishReadiness {
      const batch = this.batches.find((item) => item.id === batchId);
      if (!batch) return { ok: false, code: "RECRUITMENT_BATCH_NOT_FOUND" };
      if (batch.lifecycleStatus !== "draft") return { ok: false, code: "BATCH_ALREADY_PUBLISHED" };
      if (batch.openCenterIds.length === 0) return { ok: false, code: "BATCH_CENTER_REQUIRED" };

      const startAt = Date.parse(batch.startAt);
      const endAt = Date.parse(batch.endAt);
      if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
        return { ok: false, code: "BATCH_WINDOW_INVALID" };
      }

      const candidate = cloneBatch(batch);
      candidate.lifecycleStatus = "published";
      const effectiveStatus = getEffectiveRecruitmentBatchStatus(candidate, now).status;
      if (effectiveStatus === "open") {
        const open = getCurrentOpenBatch(this.batches.filter((item) => item.id !== batchId), now);
        if (open) {
          return {
            ok: false,
            code: "BATCH_ALREADY_OPEN",
            conflict: {
              batchId: open.id,
              batchName: open.name,
              startAt: open.startAt,
              endAt: open.endAt,
            },
          };
        }
      }

      const conflict = this.batches.find((item) => (
        item.id !== batchId
        && item.lifecycleStatus === "published"
        && hasOverlappingWindow(item, candidate)
      ));
      if (conflict) {
        return {
          ok: false,
          code: "BATCH_SCHEDULE_OVERLAP",
          conflict: {
            batchId: conflict.id,
            batchName: conflict.name,
            startAt: conflict.startAt,
            endAt: conflict.endAt,
          },
        };
      }

      return { ok: true };
    },
    emitOpenedFlash(
      batch: RecruitmentBatch,
      actor: { id: string; name: string },
      timestamp: string,
    ): RecruitmentBatchAutomationFailure | undefined {
      const event = {
        eventId: `recruitment-batch-opened-${batch.id}-${batch.version}`,
        eventType: "recruitment.batch.opened",
        occurredAt: timestamp,
        actorId: actor.id,
        sourceDomain: "recruitment-batch",
        sourceId: batch.id,
        sourceVersion: batch.version,
        payload: {
          batchName: batch.name,
          publicRoute: "/join",
          publicEndAt: batch.endAt,
          isOpen: true,
        },
      } as const;
      const automation = new PortalAutomationServiceMock().createFromEvent(event);
      if (automation.status === "failed") {
        return {
          batchId: batch.id,
          errorCode: automation.errorCode,
          automationKey: automation.automationKey,
        };
      }
      return undefined;
    },
    retryAutomationDraft(automationKey: string) {
      const result = usePortalContentStore().retryAutomationDraft(automationKey);
      if (result.status !== "failed") {
        this.automationFailures = this.automationFailures.filter((failure) => failure.automationKey !== automationKey);
      }
      this.persistBatches();
      return result;
    },
    publishBatch(batchId: string, now: Date = new Date(), reason = "publish batch") {
      const actor = this.resolveOwnerActor();
      const batch = this.getBatchOrThrow(batchId);
      const readiness = this.getPublishReadiness(batchId, now);
      if (!readiness.ok) {
        throw new RecruitmentBatchCommandError(readiness.code ?? "BATCH_WINDOW_INVALID", {
          conflict: readiness.conflict,
        });
      }
      const beforeStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      const timestamp = now.toISOString();
      const next = cloneBatch(batch);
      next.lifecycleStatus = "published";
      next.manualOverride = "none";
      next.publishedAt = timestamp;
      next.updatedAt = timestamp;
      next.version += 1;
      const afterStatus = getEffectiveRecruitmentBatchStatus(next, now).status;
      if (afterStatus === "open") this.assertNoOtherOpen(batchId, now);
      this.assertNoOverlappingPublishedWindow(batchId, next);
      Object.assign(batch, next);
      this.appendAudit(batch, "publish", actor, beforeStatus, afterStatus, timestamp, reason, { lifecycleStatus: "draft" });
      if (afterStatus === "open") {
        const failure = this.emitOpenedFlash(batch, actor, timestamp);
        if (failure) this.automationFailures.unshift(failure);
      }
      this.persistBatches();
      return batch;
    },
    publish(batchId: string, now: Date = new Date(), reason?: string) {
      return this.publishBatch(batchId, now, reason);
    },
    openNow(
      batchId: string,
      confirmed: boolean,
      now: Date = new Date(),
      reason = "owner opened batch before planned start",
    ) {
      const actor = this.resolveOwnerActor();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      const batch = this.getBatchOrThrow(batchId);
      if (batch.lifecycleStatus !== "published") throw new Error("BATCH_NOT_PUBLISHED");
      if (Date.parse(batch.endAt) <= now.getTime()) throw new Error("BATCH_END_PASSED");
      this.assertNoOtherOpen(batchId, now);
      const beforeStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      const timestamp = now.toISOString();
      this.assertNoOverlappingPublishedWindow(batchId, {
        ...batch,
        startAt: timestamp,
        manualOverride: "force-open",
      });
      batch.manualOverride = "force-open";
      batch.actualOpenedAt = timestamp;
      batch.updatedAt = timestamp;
      batch.version += 1;
      this.appendAudit(batch, "open-now", actor, beforeStatus, "open", timestamp, reason, { manualOverride: "none" });
      const failure = this.emitOpenedFlash(batch, actor, timestamp);
      if (failure) this.automationFailures.unshift(failure);
      this.persistBatches();
      return batch;
    },
    pause(batchId: string, now: Date = new Date(), reason = "pause recruitment batch") {
      const actor = this.resolveOwnerActor();
      const batch = this.getBatchOrThrow(batchId);
      if (getEffectiveRecruitmentBatchStatus(batch, now).status !== "open") {
        throw new Error("BATCH_NOT_OPEN");
      }
      const beforeStatus = "open" as const;
      const timestamp = now.toISOString();
      batch.manualOverride = "paused";
      batch.updatedAt = timestamp;
      batch.version += 1;
      this.appendAudit(batch, "pause", actor, beforeStatus, "paused", timestamp, reason);
      this.persistBatches();
      usePortalContentStore().invalidateSource("recruitment-batch", batch.id, now);
      return batch;
    },
    resume(batchId: string, now: Date = new Date(), reason = "resume recruitment batch") {
      const actor = this.resolveOwnerActor();
      const batch = this.getBatchOrThrow(batchId);
      if (batch.manualOverride !== "paused") throw new Error("BATCH_NOT_PAUSED");
      this.assertNoOtherOpen(batchId, now);
      this.assertNoOverlappingPublishedWindow(batchId, batch);
      const beforeStatus = "paused" as const;
      const timestamp = now.toISOString();
      batch.manualOverride = batch.actualOpenedAt && now.getTime() < Date.parse(batch.startAt)
        ? "force-open"
        : "none";
      batch.updatedAt = timestamp;
      batch.version += 1;
      const afterStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      this.appendAudit(batch, "resume", actor, beforeStatus, afterStatus, timestamp, reason);
      if (afterStatus === "open") {
        const failure = this.emitOpenedFlash(batch, actor, timestamp);
        if (failure) this.automationFailures.unshift(failure);
      }
      this.persistBatches();
      return batch;
    },
    close(
      batchId: string,
      confirmed: boolean,
      now: Date = new Date(),
      reason = "close recruitment batch",
    ) {
      const actor = this.resolveOwnerActor();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      const batch = this.getBatchOrThrow(batchId);
      const beforeStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      if (beforeStatus !== "open" && beforeStatus !== "paused") throw new Error("BATCH_NOT_CLOSABLE");
      const applicationStore = useRecruitmentApplicationStore();
      const beforeBatch = cloneBatch(batch);
      const beforeAuditRecords = this.auditRecords.map(cloneAuditRecord);
      applicationStore.lockApplicationsForBatch(batchId, now, "early-close");
      const timestamp = now.toISOString();
      batch.lifecycleStatus = "closed";
      batch.manualOverride = "force-closed";
      batch.closedAt = timestamp;
      batch.updatedAt = timestamp;
      batch.version += 1;
      this.appendAudit(batch, "close", actor, beforeStatus, "closed", timestamp, reason);
      try {
        this.persistBatches();
        usePortalContentStore().invalidateSource("recruitment-batch", batch.id, now);
        return batch;
      } catch (error) {
        Object.assign(batch, beforeBatch);
        this.auditRecords = beforeAuditRecords;
        applicationStore.unlockApplicationsForBatch(batchId, "early-close", now);
        throw error;
      }
    },
    reopen(
      batchId: string,
      confirmed: boolean,
      now: Date = new Date(),
      reason = "reopen recruitment batch",
    ) {
      const actor = this.resolveOwnerActor();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      const batch = this.getBatchOrThrow(batchId);
      if (batch.lifecycleStatus !== "closed") throw new Error("BATCH_NOT_CLOSED");
      if (this.assessmentPublishedAt[batchId]) throw new Error("BATCH_RESULTS_PUBLISHED_READ_ONLY");
      if (this.assessmentStartedAt[batchId]) throw new Error("BATCH_ASSESSMENT_STARTED_READ_ONLY");
      if (Date.parse(batch.endAt) <= now.getTime()) throw new Error("BATCH_END_PASSED");
      this.assertNoOtherOpen(batchId, now);
      this.assertNoOverlappingPublishedWindow(batchId, {
        ...batch,
        lifecycleStatus: "published",
        manualOverride: batch.actualOpenedAt && now.getTime() < Date.parse(batch.startAt)
          ? "force-open"
          : "none",
      });
      const beforeStatus = "closed" as const;
      const timestamp = now.toISOString();
      batch.lifecycleStatus = "published";
      batch.manualOverride = batch.actualOpenedAt && now.getTime() < Date.parse(batch.startAt)
        ? "force-open"
        : "none";
      batch.closedAt = undefined;
      batch.updatedAt = timestamp;
      batch.version += 1;
      const afterStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      this.appendAudit(batch, "reopen", actor, beforeStatus, afterStatus, timestamp, reason);
      if (afterStatus === "open") {
        const failure = this.emitOpenedFlash(batch, actor, timestamp);
        if (failure) this.automationFailures.unshift(failure);
      }
      this.persistBatches();
      useRecruitmentApplicationStore().unlockApplicationsForBatch(batchId, "early-close", now);
      return batch;
    },
    archive(batchId: string, now: Date = new Date(), reason = "archive recruitment batch") {
      const actor = this.resolveOwnerActor();
      const batch = this.getBatchOrThrow(batchId);
      const beforeStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      if (beforeStatus !== "closed") throw new Error("BATCH_NOT_CLOSED");
      const timestamp = now.toISOString();
      batch.lifecycleStatus = "archived";
      batch.manualOverride = "none";
      batch.archivedAt = timestamp;
      batch.updatedAt = timestamp;
      batch.version += 1;
      this.appendAudit(batch, "archive", actor, beforeStatus, "archived", timestamp, reason);
      this.persistBatches();
      return batch;
    },
    updateBatch(
      batchId: string,
      patch: RecruitmentBatchPatch,
      reason = "update recruitment batch configuration",
      now: Date = new Date(),
    ) {
      const actor = this.resolveOwnerActor();
      const batch = this.getBatchOrThrow(batchId);
      const before = cloneBatch(batch);
      const beforeStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      const next = cloneBatch(batch);
      Object.assign(next, patch);
      if (patch.openCenterIds) next.openCenterIds = [...patch.openCenterIds];
      const timestamp = now.toISOString();
      if (next.lifecycleStatus === "published"
        && next.manualOverride === "none"
        && Date.parse(next.endAt) <= now.getTime()) {
        next.lifecycleStatus = "closed";
        next.manualOverride = "force-closed";
        next.closedAt = timestamp;
      }
      next.updatedAt = timestamp;
      next.version += 1;
      const afterStatus = getEffectiveRecruitmentBatchStatus(next, now).status;
      if (afterStatus === "open") this.assertNoOtherOpen(batchId, now);
      this.assertNoOverlappingPublishedWindow(batchId, next);
      Object.assign(batch, next);
      this.appendAudit(batch, "update", actor, beforeStatus, afterStatus, timestamp, reason, before);
      if (beforeStatus !== "open" && afterStatus === "open") {
        const failure = this.emitOpenedFlash(batch, actor, timestamp);
        if (failure) this.automationFailures.unshift(failure);
      }
      this.persistBatches();
      if (patch.openCenterIds) {
        useRecruitmentApplicationStore().markCenterAvailability(batch.id, patch.openCenterIds);
      }
      if (batch.lifecycleStatus === "closed") {
        useRecruitmentApplicationStore().lockExpiredApplications(now);
      }
      return batch;
    },
  },
});
