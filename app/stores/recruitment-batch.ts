import { defineStore } from "pinia";
import { cloneRecruitmentBatches, RECRUITMENT_BATCHES } from "../data/recruitment-batches";
import type {
  RecruitmentBatch,
  RecruitmentBatchAuditRecord,
  RecruitmentBatchEffectiveStatus,
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

export const useRecruitmentBatchStore = defineStore("recruitment-batch", {
  state: () => ({
    batches: cloneRecruitmentBatches(RECRUITMENT_BATCHES),
    auditRecords: [] as RecruitmentBatchAuditRecord[],
    automationFailures: [] as Array<{ batchId: string; errorCode: string }>,
  }),
  getters: {
    getBatch: (state) => (batchId: string) => state.batches.find((batch) => batch.id === batchId),
    currentOpenBatch(state): RecruitmentBatch | undefined {
      return getCurrentOpenBatch(state.batches);
    },
    upcomingBatch(state): RecruitmentBatch | undefined {
      return getUpcomingRecruitmentBatch(state.batches);
    },
    effectiveStatus: (state) => (
      batchId: string,
      now: Date = new Date(),
    ): RecruitmentBatchEffectiveStatus | undefined => {
      const batch = state.batches.find((item) => item.id === batchId);
      return batch ? getEffectiveRecruitmentBatchStatus(batch, now).status : undefined;
    },
  },
  actions: {
    replaceBatches(batches: readonly RecruitmentBatch[]) {
      this.batches = batches.map(cloneBatch);
      this.auditRecords = [];
      this.automationFailures = [];
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
      if (open) throw new Error("BATCH_ALREADY_OPEN");
    },
    emitOpenedFlash(batch: RecruitmentBatch, actor: { id: string; name: string }, timestamp: string) {
      const automation = new PortalAutomationServiceMock().createFromEvent({
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
      });
      if (automation.status === "failed") {
        this.automationFailures.unshift({ batchId: batch.id, errorCode: automation.errorCode });
      }
    },
    publishBatch(batchId: string, now: Date = new Date(), reason = "publish batch") {
      const actor = this.resolveOwnerActor();
      const batch = this.getBatchOrThrow(batchId);
      if (batch.lifecycleStatus !== "draft") throw new Error("BATCH_ALREADY_PUBLISHED");
      const beforeStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      const timestamp = now.toISOString();
      batch.lifecycleStatus = "published";
      batch.manualOverride = "none";
      batch.publishedAt = timestamp;
      batch.updatedAt = timestamp;
      batch.version += 1;
      this.appendAudit(batch, "publish", actor, beforeStatus, getEffectiveRecruitmentBatchStatus(batch, now).status, timestamp, reason, { lifecycleStatus: "draft" });
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
      batch.manualOverride = "force-open";
      batch.actualOpenedAt = timestamp;
      batch.updatedAt = timestamp;
      batch.version += 1;
      this.appendAudit(batch, "open-now", actor, beforeStatus, "open", timestamp, reason, { manualOverride: "none" });
      this.emitOpenedFlash(batch, actor, timestamp);
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
      usePortalContentStore().invalidateSource("recruitment-batch", batch.id, now);
      return batch;
    },
    resume(batchId: string, now: Date = new Date(), reason = "resume recruitment batch") {
      const actor = this.resolveOwnerActor();
      const batch = this.getBatchOrThrow(batchId);
      if (batch.manualOverride !== "paused") throw new Error("BATCH_NOT_PAUSED");
      this.assertNoOtherOpen(batchId, now);
      const beforeStatus = "paused" as const;
      const timestamp = now.toISOString();
      batch.manualOverride = "none";
      batch.updatedAt = timestamp;
      batch.version += 1;
      const afterStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      this.appendAudit(batch, "resume", actor, beforeStatus, afterStatus, timestamp, reason);
      if (afterStatus === "open") this.emitOpenedFlash(batch, actor, timestamp);
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
      const timestamp = now.toISOString();
      batch.lifecycleStatus = "closed";
      batch.manualOverride = "force-closed";
      batch.closedAt = timestamp;
      batch.updatedAt = timestamp;
      batch.version += 1;
      this.appendAudit(batch, "close", actor, beforeStatus, "closed", timestamp, reason);
      usePortalContentStore().invalidateSource("recruitment-batch", batch.id, now);
      return batch;
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
      if (Date.parse(batch.endAt) <= now.getTime()) throw new Error("BATCH_END_PASSED");
      this.assertNoOtherOpen(batchId, now);
      const beforeStatus = "closed" as const;
      const timestamp = now.toISOString();
      batch.lifecycleStatus = "published";
      batch.manualOverride = "none";
      batch.closedAt = undefined;
      batch.updatedAt = timestamp;
      batch.version += 1;
      const afterStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      this.appendAudit(batch, "reopen", actor, beforeStatus, afterStatus, timestamp, reason);
      if (afterStatus === "open") this.emitOpenedFlash(batch, actor, timestamp);
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
      Object.assign(batch, patch);
      if (patch.openCenterIds) batch.openCenterIds = [...patch.openCenterIds];
      const timestamp = now.toISOString();
      if (batch.lifecycleStatus === "published"
        && batch.manualOverride === "none"
        && Date.parse(batch.endAt) <= now.getTime()) {
        batch.lifecycleStatus = "closed";
        batch.manualOverride = "force-closed";
        batch.closedAt = timestamp;
      }
      batch.updatedAt = timestamp;
      batch.version += 1;
      const afterStatus = getEffectiveRecruitmentBatchStatus(batch, now).status;
      this.appendAudit(batch, "update", actor, beforeStatus, afterStatus, timestamp, reason, before);
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
