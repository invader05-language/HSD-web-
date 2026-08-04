import { defineStore } from "pinia";
import { ADMIN_MEMBERS } from "../data/admin-members";
import {
  ADMIN_CANDIDATES,
  getAdminCandidateAssessmentRecord,
  type AdminCandidate,
} from "../data/recruitment-admin";
import type { RecruitmentCenter } from "../data/recruitment-application";
import type {
  AssessmentFinalDecision,
  AssessmentOutcome,
  AssessmentProcessingStatus,
  AssessmentRoundNumber,
  RecruitmentAssessmentRecord,
} from "../types/recruitment-assessment";
import {
  getAssessmentProcessingStatus,
  getAssessmentRounds,
  getCurrentAssessmentRound,
  isAssessmentRoundEditable,
} from "../utils/recruitment-assessment-rules";
import { getCurrentOpenBatch } from "../utils/recruitment-batch-rules";
import { useMemberAdministrationStore } from "./member-administration";
import { MEMBER_PROFILE_STORAGE_KEY, useMemberProfileStore } from "./member-profile";
import { useRecruitmentBatchStore } from "./recruitment-batch";
import { useSessionStore } from "./session";

export const RECRUITMENT_ASSESSMENT_STORAGE_KEY = "baiyun-hsd-recruitment-assessment";
export const RECRUITMENT_ASSESSMENT_STORAGE_VERSION = 1;

type AssessmentBatchStatus = "assessing" | "ready-to-publish" | "published";

interface AssessmentAuditRecord {
  id: string;
  action: "save-round" | "record-adjustment" | "advance-round" | "publish";
  actorId: string;
  actualAt: string;
  reason?: string;
}

export interface RecruitmentAssessmentBatchState {
  batchId: string;
  batchVersion: number;
  version: number;
  currentRound: AssessmentRoundNumber;
  status: AssessmentBatchStatus;
  records: RecruitmentAssessmentRecord[];
  auditRecords: AssessmentAuditRecord[];
  publishedAt?: string;
}

export interface RecruitmentAssessmentCandidate extends RecruitmentAssessmentRecord {
  currentPhase?: "第一轮考核" | "第二轮考核" | "第三轮考核";
  processingStatus: AssessmentProcessingStatus;
  candidate?: AdminCandidate;
}

export interface PublicationSummary {
  total: number;
  ready: number;
  pending: number;
  adjustmentPending: number;
  admitted: number;
  notAdmitted: number;
  canPublish: boolean;
}

interface PersistedAssessmentState {
  version: typeof RECRUITMENT_ASSESSMENT_STORAGE_VERSION;
  batches: Record<string, RecruitmentAssessmentBatchState>;
}

const ROUND_LABELS: Record<AssessmentRoundNumber, RecruitmentAssessmentCandidate["currentPhase"]> = {
  1: "第一轮考核",
  2: "第二轮考核",
  3: "第三轮考核",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneAssessmentRecord(record: RecruitmentAssessmentRecord): RecruitmentAssessmentRecord {
  return {
    ...record,
    roundOutcomes: { ...record.roundOutcomes },
  };
}

function cloneBatchState(state: RecruitmentAssessmentBatchState): RecruitmentAssessmentBatchState {
  return {
    ...state,
    records: state.records.map(cloneAssessmentRecord),
    auditRecords: state.auditRecords.map((record) => ({ ...record })),
  };
}

function isAssessmentRecord(value: unknown): value is RecruitmentAssessmentRecord {
  if (!isRecord(value)
    || typeof value.batchId !== "string"
    || typeof value.candidateId !== "string"
    || typeof value.memberId !== "string"
    || typeof value.center !== "string"
    || typeof value.acceptsAdjustment !== "boolean"
    || !isRecord(value.roundOutcomes)) {
    return false;
  }
  return true;
}

function isBatchState(value: unknown): value is RecruitmentAssessmentBatchState {
  if (!isRecord(value)
    || typeof value.batchId !== "string"
    || typeof value.batchVersion !== "number"
    || typeof value.version !== "number"
    || ![1, 2, 3].includes(value.currentRound as number)
    || !["assessing", "ready-to-publish", "published"].includes(value.status as string)
    || !Array.isArray(value.records)
    || !value.records.every(isAssessmentRecord)
    || !Array.isArray(value.auditRecords)) {
    return false;
  }
  return true;
}

function getStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function restorePersistedBatches(): Record<string, RecruitmentAssessmentBatchState> {
  const serialized = getStorage()?.getItem(RECRUITMENT_ASSESSMENT_STORAGE_KEY);
  if (!serialized) return {};
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed)
      || parsed.version !== RECRUITMENT_ASSESSMENT_STORAGE_VERSION
      || !isRecord(parsed.batches)
      || !Object.values(parsed.batches).every(isBatchState)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed.batches).map(([batchId, batch]) => [
        batchId,
        cloneBatchState(batch as RecruitmentAssessmentBatchState),
      ]),
    );
  } catch {
    return {};
  }
}

function newRecord(candidate: AdminCandidate, batchId: string): RecruitmentAssessmentRecord {
  const legacy = getAdminCandidateAssessmentRecord(candidate, batchId);
  if (candidate.stage === "已结束") return legacy;
  return {
    ...legacy,
    batchId,
    // The roster predates the assessment domain. It supplies candidate identity,
    // not an already-published assessment decision for the active batch.
    roundOutcomes: {},
    finalDecision: undefined,
    finalCenter: undefined,
    internalNote: undefined,
    updatedAt: undefined,
    publishedAt: undefined,
  };
}

function initialBatchState(batchId: string, batchVersion: number): RecruitmentAssessmentBatchState {
  return {
    batchId,
    batchVersion,
    version: 1,
    currentRound: 1,
    status: "assessing",
    records: ADMIN_CANDIDATES
      .filter((candidate) => (candidate.batchId ?? "batch-current") === batchId)
      .map((candidate) => newRecord(candidate, batchId)),
    auditRecords: [],
  };
}

function candidateFor(record: RecruitmentAssessmentRecord): AdminCandidate | undefined {
  return ADMIN_CANDIDATES.find((candidate) => candidate.id === record.candidateId);
}

function candidateMemberId(record: RecruitmentAssessmentRecord): string | undefined {
  if (ADMIN_MEMBERS.some((member) => member.id === record.memberId)) return record.memberId;
  const candidate = candidateFor(record);
  if (!candidate) return undefined;
  return ADMIN_MEMBERS.find((member) => member.studentId === candidate.studentId)?.id;
}

function getFinalDecision(record: RecruitmentAssessmentRecord): AssessmentFinalDecision | undefined {
  if (record.finalDecision) return record.finalDecision;
  if (getAssessmentProcessingStatus(record) === "ready-to-publish") {
    return getAssessmentRounds(record.center).some((round) => record.roundOutcomes[round] === "failed")
      ? "not-admitted"
      : "admitted";
  }
  return undefined;
}

function applyDerivedDecision(record: RecruitmentAssessmentRecord) {
  const status = getAssessmentProcessingStatus(record);
  if (status === "ready-to-publish" && !record.finalDecision) {
    record.finalDecision = getAssessmentRounds(record.center).some(
      (round) => record.roundOutcomes[round] === "failed",
    ) ? "not-admitted" : "admitted";
    if (record.finalDecision === "admitted") record.finalCenter = record.center;
  }
  if (status === "offline-adjustment-pending") {
    record.finalDecision = undefined;
    record.finalCenter = undefined;
  }
}

export const useRecruitmentAssessmentStore = defineStore("recruitment-assessment", {
  state: () => ({
    batches: restorePersistedBatches(),
  }),
  actions: {
    currentRound(batchId: string): AssessmentRoundNumber {
      return this.getBatchState(batchId).currentRound;
    },
    getBatchState(batchId: string): RecruitmentAssessmentBatchState {
      const batch = useRecruitmentBatchStore().getBatchOrThrow(batchId);
      const existing = this.batches[batchId];
      if (!existing) {
        this.batches[batchId] = initialBatchState(batchId, batch.version);
      } else if (existing.batchVersion !== batch.version) {
        throw new Error("ASSESSMENT_BATCH_VERSION_CONFLICT");
      }
      const state = this.batches[batchId];
      if (!state) throw new Error("ASSESSMENT_BATCH_STATE_UNAVAILABLE");
      return state;
    },
    getCandidates(batchId: string): RecruitmentAssessmentCandidate[] {
      const state = this.getBatchState(batchId);
      return state.records.map((record) => this.toCandidate(state, record));
    },
    getCandidate(batchId: string, candidateId: string): RecruitmentAssessmentCandidate | undefined {
      const state = this.getBatchState(batchId);
      const record = state.records.find((item) => item.candidateId === candidateId);
      return record ? this.toCandidate(state, record) : undefined;
    },
    toCandidate(
      state: RecruitmentAssessmentBatchState,
      record: RecruitmentAssessmentRecord,
    ): RecruitmentAssessmentCandidate {
      const currentRound = getCurrentAssessmentRound(record, state.currentRound);
      return {
        ...cloneAssessmentRecord(record),
        ...(currentRound ? { currentPhase: ROUND_LABELS[currentRound] } : {}),
        processingStatus: getAssessmentProcessingStatus(record),
        candidate: candidateFor(record),
      };
    },
    assertCurrentBatch(batchId: string, now: Date) {
      const batchStore = useRecruitmentBatchStore();
      const active = getCurrentOpenBatch(batchStore.batches, now);
      if (!active || active.id !== batchId) throw new Error("ASSESSMENT_BATCH_NOT_CURRENT");
      this.getBatchState(batchId);
    },
    resolveOwner() {
      const session = useSessionStore();
      if (!session.isAuthenticated || session.adminLevel !== "owner" || !session.currentAccount) {
        throw new Error("OWNER_PERMISSION_REQUIRED");
      }
      return session.currentAccount;
    },
    assertCanEdit(record: RecruitmentAssessmentRecord) {
      const session = useSessionStore();
      const account = session.currentAccount;
      if (!session.isAuthenticated || !session.canAccessAdmin || !account) {
        throw new Error("ASSESSMENT_EDIT_PERMISSION_REQUIRED");
      }
      if (account.adminLevel === "owner") return account;
      if (account.adminCenterRole !== `${record.center}负责人`) {
        throw new Error("ASSESSMENT_EDIT_PERMISSION_REQUIRED");
      }
      return account;
    },
    appendAudit(
      state: RecruitmentAssessmentBatchState,
      action: AssessmentAuditRecord["action"],
      actorId: string,
      now: Date,
      reason?: string,
    ) {
      state.auditRecords.unshift({
        id: `assessment-${state.batchId}-${action}-${state.version}-${now.getTime()}`,
        action,
        actorId,
        actualAt: now.toISOString(),
        ...(reason ? { reason } : {}),
      });
    },
    touch(state: RecruitmentAssessmentBatchState) {
      state.version += 1;
      this.persistState();
    },
    persistState() {
      const storage = getStorage();
      if (!storage) throw new Error("ASSESSMENT_STORAGE_UNAVAILABLE");
      storage.setItem(RECRUITMENT_ASSESSMENT_STORAGE_KEY, JSON.stringify({
        version: RECRUITMENT_ASSESSMENT_STORAGE_VERSION,
        batches: Object.fromEntries(
          Object.entries(this.batches).map(([batchId, state]) => [batchId, cloneBatchState(state)]),
        ),
      } satisfies PersistedAssessmentState));
    },
    saveRoundOutcome(input: {
      batchId: string;
      candidateId: string;
      round: AssessmentRoundNumber;
      outcome: Exclude<AssessmentOutcome, "pending">;
      internalNote?: string;
      now: Date;
    }) {
      this.assertCurrentBatch(input.batchId, input.now);
      const state = this.getBatchState(input.batchId);
      if (state.status !== "assessing") throw new Error("ASSESSMENT_NOT_EDITABLE");
      const record = state.records.find((item) => item.candidateId === input.candidateId);
      if (!record) throw new Error("ASSESSMENT_CANDIDATE_NOT_FOUND");
      const actor = this.assertCanEdit(record);
      if (!isAssessmentRoundEditable(record, input.round, state.currentRound)) {
        throw new Error("ASSESSMENT_ROUND_NOT_CURRENT");
      }
      record.roundOutcomes[input.round] = input.outcome;
      if (input.internalNote !== undefined) record.internalNote = input.internalNote.trim();
      record.updatedAt = input.now.toISOString();
      applyDerivedDecision(record);
      const rounds = getAssessmentRounds(record.center);
      if (input.outcome === "passed"
        && input.round === rounds[rounds.length - 1]
        && !candidateMemberId(record)) {
        // A publication transaction may only promote an account that already
        // exists. The legacy roster has one unmatched fixture, which cannot
        // be admitted even after completing its final assessment round.
        record.finalDecision = "not-admitted";
        record.finalCenter = undefined;
      }
      this.appendAudit(state, "save-round", actor.account, input.now);
      this.touch(state);
      return this.toCandidate(state, record);
    },
    recordAdjustmentDecision(input: {
      batchId: string;
      candidateId: string;
      finalCenter: RecruitmentCenter;
      admitted: boolean;
      now: Date;
    }) {
      this.assertCurrentBatch(input.batchId, input.now);
      const state = this.getBatchState(input.batchId);
      if (state.status === "published") throw new Error("ASSESSMENT_NOT_EDITABLE");
      const record = state.records.find((item) => item.candidateId === input.candidateId);
      if (!record) throw new Error("ASSESSMENT_CANDIDATE_NOT_FOUND");
      const actor = this.assertCanEdit(record);
      if (!record.acceptsAdjustment || input.finalCenter === "白泽开发中心") {
        throw new Error("ASSESSMENT_ADJUSTMENT_NOT_ALLOWED");
      }
      record.finalDecision = input.admitted ? "admitted" : "not-admitted";
      record.finalCenter = input.admitted ? input.finalCenter : undefined;
      record.updatedAt = input.now.toISOString();
      this.appendAudit(state, "record-adjustment", actor.account, input.now);
      this.touch(state);
      return this.toCandidate(state, record);
    },
    advanceAssessmentRound(
      batchId: string,
      confirmed: boolean,
      now: Date,
      reason?: string,
    ) {
      this.assertCurrentBatch(batchId, now);
      const actor = this.resolveOwner();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      const state = this.getBatchState(batchId);
      if (state.status !== "assessing") throw new Error("ASSESSMENT_NOT_EDITABLE");
      const incomplete = state.records.some((record) => (
        isAssessmentRoundEditable(record, state.currentRound, state.currentRound)
      ));
      if (incomplete) throw new Error("ASSESSMENT_ROUND_INCOMPLETE");

      const nextRound = ([2, 3] as AssessmentRoundNumber[]).find((round) => (
        round > state.currentRound
        && state.records.some((record) => isAssessmentRoundEditable(record, round, round))
      ));
      if (nextRound) {
        state.currentRound = nextRound;
      } else {
        state.status = "ready-to-publish";
      }
      this.appendAudit(state, "advance-round", actor.account, now, reason);
      this.touch(state);
      return state;
    },
    getPublicationSummary(batchId: string): PublicationSummary {
      const state = this.getBatchState(batchId);
      const processing = state.records.map((record) => getAssessmentProcessingStatus(record));
      const ready = processing.filter((status) => status === "ready-to-publish").length;
      const adjustmentPending = processing.filter((status) => status === "offline-adjustment-pending").length;
      const pending = processing.filter((status) => status === "assessing" || status === "offline-adjustment-pending").length;
      const admitted = state.records.filter((record) => getFinalDecision(record) === "admitted").length;
      const notAdmitted = state.records.filter((record) => getFinalDecision(record) === "not-admitted").length;
      return {
        total: state.records.length,
        ready,
        pending,
        adjustmentPending,
        admitted,
        notAdmitted,
        canPublish: state.status === "ready-to-publish" && pending === 0,
      };
    },
    publishBatchResults(
      batchId: string,
      confirmed: boolean,
      now: Date,
      reason?: string,
    ) {
      this.assertCurrentBatch(batchId, now);
      const actor = this.resolveOwner();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      const state = this.getBatchState(batchId);
      const summary = this.getPublicationSummary(batchId);
      if (state.status !== "ready-to-publish" || !summary.canPublish) {
        throw new Error("ASSESSMENT_NOT_READY");
      }
      if (state.records.some((record) => !getFinalDecision(record))) {
        throw new Error("ASSESSMENT_NOT_READY");
      }

      const profileStore = useMemberProfileStore();
      const assessmentSnapshot = cloneBatchState(state);
      const profileSnapshot = Object.fromEntries(
        Object.entries(profileStore.profiles).map(([memberId, profile]) => [memberId, { ...profile }]),
      );
      const storage = getStorage();
      const previousAssessmentStorage = storage?.getItem(RECRUITMENT_ASSESSMENT_STORAGE_KEY) ?? null;
      const previousProfileStorage = storage?.getItem(MEMBER_PROFILE_STORAGE_KEY) ?? null;

      try {
        const administration = useMemberAdministrationStore();
        state.records
          .filter((record) => getFinalDecision(record) === "admitted")
          .forEach((record) => {
            const memberId = candidateMemberId(record);
            const candidate = candidateFor(record);
            if (!memberId || !record.finalCenter) throw new Error("ASSESSMENT_ACCOUNT_NOT_FOUND");
            const result = administration.promoteMemberToFormal(memberId, {
              center: record.finalCenter,
              ...(candidate?.baizeDirection ? { baizeDirection: candidate.baizeDirection } : {}),
            });
            if (result.status !== "success" && result.status !== "already_formal") {
              throw new Error("ASSESSMENT_PROMOTION_FAILED");
            }
          });

        const publishedAt = now.toISOString();
        state.records.forEach((record) => {
          record.finalDecision = getFinalDecision(record);
          record.publishedAt = publishedAt;
          record.updatedAt = publishedAt;
        });
        state.status = "published";
        state.publishedAt = publishedAt;
        this.appendAudit(state, "publish", actor.account, now, reason);
        this.touch(state);
        return state;
      } catch (error) {
        this.batches[batchId] = assessmentSnapshot;
        profileStore.replaceProfiles(profileSnapshot);
        try {
          if (storage) {
            if (previousAssessmentStorage === null) storage.removeItem(RECRUITMENT_ASSESSMENT_STORAGE_KEY);
            else storage.setItem(RECRUITMENT_ASSESSMENT_STORAGE_KEY, previousAssessmentStorage);
            if (previousProfileStorage === null) storage.removeItem(MEMBER_PROFILE_STORAGE_KEY);
            else storage.setItem(MEMBER_PROFILE_STORAGE_KEY, previousProfileStorage);
          }
        } catch {
          // In-memory state is restored even when Mock storage cannot be restored.
        }
        throw error;
      }
    },
  },
});
