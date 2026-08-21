import { defineStore } from "pinia";
import type {
  AssessmentBatchResponseDto,
  AssessmentAdjustmentTargetCatalogResponseDto,
  AssessmentCandidateDto,
  MyRecruitmentResultDto,
} from "../../packages/api-client/src";
import { ADMIN_MEMBERS } from "../data/admin-members";
import {
  ADMIN_CANDIDATES,
  getAdminCandidateAssessmentRecord,
  type AdminCandidate,
} from "../data/recruitment-admin";
import {
  RECRUITMENT_CENTERS,
  type RecruitmentCenter,
  type SubmittedRecruitmentApplication,
} from "../data/recruitment-application";
import type {
  AssessmentFinalDecision,
  AdjustmentDestination,
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
import { getEffectiveRecruitmentBatchStatus } from "../utils/recruitment-batch-rules";
import { baizeDirectionLabel } from "../utils/baize-direction-label";
import type { RecruitmentGateway } from "../services/recruitment/recruitment-gateway";
import { useAdminAccessStore } from "./admin-access";
import { useMemberAdministrationStore } from "./member-administration";
import { MEMBER_PROFILE_STORAGE_KEY, useMemberProfileStore } from "./member-profile";
import { useRecruitmentApplicationStore } from "./recruitment-application";
import { useRecruitmentBatchStore } from "./recruitment-batch";
import { useSessionStore } from "./session";

export const RECRUITMENT_ASSESSMENT_STORAGE_KEY = "baiyun-hsd-recruitment-assessment";
export const RECRUITMENT_ASSESSMENT_STORAGE_VERSION = 1;

type AssessmentBatchStatus = "assessing" | "ready-to-publish" | "published";

interface AssessmentAuditRecord {
  id: string;
  action: "save-round" | "record-adjustment-suggestion" | "record-adjustment" | "advance-round" | "publish";
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

export type AssessmentAdjustmentDecision = AdjustmentDestination | "not-admitted";

const REGULAR_ADJUSTMENT_CENTERS = [
  "新媒体中心",
  "拓维策划中心",
  "人才发展中心",
] as const;

function isRegularAdjustmentCenter(value: unknown): value is AdjustmentDestination {
  return (REGULAR_ADJUSTMENT_CENTERS as readonly string[]).includes(value as string);
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
    ...(record.finalCenterIdentity ? { finalCenterIdentity: { ...record.finalCenterIdentity } } : {}),
    ...(record.adjustmentSuggestionIdentity
      ? { adjustmentSuggestionIdentity: { ...record.adjustmentSuggestionIdentity } }
      : {}),
  };
}

function cloneBatchState(state: RecruitmentAssessmentBatchState): RecruitmentAssessmentBatchState {
  return {
    ...state,
    records: state.records.map(cloneAssessmentRecord),
    auditRecords: state.auditRecords.map((record) => ({ ...record })),
  };
}

function isAssessmentRecord(
  value: unknown,
  expectedBatchId: string,
): value is RecruitmentAssessmentRecord {
  if (!isRecord(value)
    || value.batchId !== expectedBatchId
    || typeof value.candidateId !== "string"
    || typeof value.memberId !== "string"
    || !RECRUITMENT_CENTERS.includes(value.center as RecruitmentCenter)
    || typeof value.acceptsAdjustment !== "boolean"
    || !isRecord(value.roundOutcomes)) {
    return false;
  }
  if (!Object.entries(value.roundOutcomes).every(([round, outcome]) => (
    ["1", "2", "3"].includes(round)
    && ["pending", "passed", "failed"].includes(outcome as string)
  ))) {
    return false;
  }
  if (value.finalDecision !== undefined
    && value.finalDecision !== "admitted"
    && value.finalDecision !== "not-admitted") {
    return false;
  }
  if (value.finalCenter !== undefined
    && !RECRUITMENT_CENTERS.includes(value.finalCenter as RecruitmentCenter)) {
    return false;
  }
  if (value.adjustmentSuggestion !== undefined && !isRegularAdjustmentCenter(value.adjustmentSuggestion)) {
    return false;
  }
  return ["internalNote", "updatedAt", "publishedAt"].every((key) => (
    value[key] === undefined || typeof value[key] === "string"
  ));
}

function isBatchState(
  value: unknown,
  expectedBatchId: string,
): value is RecruitmentAssessmentBatchState {
  if (!isRecord(value)
    || value.batchId !== expectedBatchId
    || typeof value.batchVersion !== "number"
    || !Number.isFinite(value.batchVersion)
    || typeof value.version !== "number"
    || !Number.isFinite(value.version)
    || ![1, 2, 3].includes(value.currentRound as number)
    || !["assessing", "ready-to-publish", "published"].includes(value.status as string)
    || !Array.isArray(value.records)
    || !value.records.every((record) => isAssessmentRecord(record, expectedBatchId))
    || !Array.isArray(value.auditRecords)) {
    return false;
  }
  return value.publishedAt === undefined || typeof value.publishedAt === "string";
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
      || !Object.entries(parsed.batches).every(([batchId, batch]) => (
        isBatchState(batch, batchId)
      ))) {
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
    adjustmentSuggestion: undefined,
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

function emptyApiBatchState(batchId: string): RecruitmentAssessmentBatchState {
  return {
    batchId,
    batchVersion: 0,
    version: 0,
    currentRound: 1,
    status: "assessing",
    records: [],
    auditRecords: [],
  };
}

function apiBatchStatus(
  status: AssessmentBatchResponseDto["status"],
): AssessmentBatchStatus {
  switch (status) {
    case "READY_TO_PUBLISH": return "ready-to-publish";
    case "PUBLISHED": return "published";
    default: return "assessing";
  }
}

function apiRound(round: number): AssessmentRoundNumber {
  if (round !== 1 && round !== 2 && round !== 3) {
    throw new Error("ASSESSMENT_API_ROUND_UNSUPPORTED");
  }
  return round;
}

function apiCenterName(name: string): RecruitmentCenter {
  if (!name.trim()) throw new Error("ASSESSMENT_API_CENTER_MISSING");
  return name as RecruitmentCenter;
}

function apiCenterIdentity(center: { id: string; slug: string; name: string }) {
  if (!center.id || !center.slug || !center.name.trim()) {
    throw new Error("ASSESSMENT_API_CENTER_MISSING");
  }
  return { id: center.id, slug: center.slug, name: center.name };
}

function latestCandidateTimestamp(candidate: AssessmentCandidateDto): string {
  return [
    ...candidate.roundResults.map((result) => result.createdAt),
    candidate.adjustmentProposal?.createdAt,
    candidate.adjustmentDecision?.createdAt,
    candidate.finalResult?.publishedAt,
  ].filter((value): value is string => Boolean(value)).sort().at(-1)
    ?? "1970-01-01T00:00:00.000Z";
}

function mapApiCandidate(
  batchId: string,
  candidate: AssessmentCandidateDto,
): { record: RecruitmentAssessmentRecord; profile: AdminCandidate } {
  const preferences = candidate.preferences
    .slice()
    .sort((left, right) => ["FIRST", "SECOND", "THIRD"].indexOf(left.rank)
      - ["FIRST", "SECOND", "THIRD"].indexOf(right.rank))
    .map((preference) => apiCenterName(preference.center.name));
  const firstChoice = preferences[0];
  if (!firstChoice) throw new Error("ASSESSMENT_API_FIRST_PREFERENCE_MISSING");
  const latestRound = candidate.roundResults.slice().sort((left, right) => left.round - right.round).at(-1);
  const finalDecision = candidate.finalResult?.decision ?? candidate.adjustmentDecision?.decision;
  const finalCenter = candidate.finalResult?.finalCenter ?? candidate.adjustmentDecision?.targetCenter;
  const finalCenterIdentity = finalCenter ? apiCenterIdentity(finalCenter) : undefined;
  const adjustmentSuggestionIdentity = candidate.adjustmentProposal
    ? apiCenterIdentity(candidate.adjustmentProposal.targetCenter)
    : undefined;
  const updatedAt = latestCandidateTimestamp(candidate);
  const publishedAt = candidate.finalResult?.publishedAt;
  const record: RecruitmentAssessmentRecord = {
    batchId,
    candidateId: candidate.applicationId,
    memberId: candidate.person.id,
    center: firstChoice,
    acceptsAdjustment: candidate.acceptsAdjustment,
    roundOutcomes: Object.fromEntries(candidate.roundResults.map((result) => [
      apiRound(result.round),
      result.outcome === "PASSED" ? "passed" : "failed",
    ])),
    ...(finalDecision ? { finalDecision: finalDecision === "ADMITTED" ? "admitted" : "not-admitted" } : {}),
    ...(finalCenterIdentity
      ? { finalCenter: apiCenterName(finalCenterIdentity.name), finalCenterIdentity }
      : {}),
    ...(adjustmentSuggestionIdentity
      ? {
        adjustmentSuggestion: apiCenterName(adjustmentSuggestionIdentity.name) as AdjustmentDestination,
        adjustmentSuggestionIdentity,
      }
      : {}),
    ...(latestRound?.internalNote ? { internalNote: latestRound.internalNote } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(publishedAt ? { publishedAt } : {}),
  };
  const admitted = finalDecision === "ADMITTED";
  const profile: AdminCandidate = {
    id: candidate.applicationId,
    batchId,
    memberId: candidate.person.id,
    name: candidate.person.name,
    studentId: candidate.person.studentId,
    grade: candidate.person.grade,
    className: candidate.person.className,
    contact: "",
    identity: publishedAt ? admitted ? "正式成员" : "未录取" : "预备成员",
    preferences: preferences.slice(0, 3) as AdminCandidate["preferences"],
    ...(candidate.baizeDirection ? { baizeDirection: baizeDirectionLabel(candidate.baizeDirection) } : {}),
    acceptsAdjustment: candidate.acceptsAdjustment,
    stage: publishedAt ? "已结束" : ROUND_LABELS[apiRound(latestRound?.round ?? 1)] ?? "第一轮考核",
    result: publishedAt ? admitted ? "已录取" : "未通过" : "待公布",
    ...(finalCenterIdentity ? { finalCenter: apiCenterName(finalCenterIdentity.name) } : {}),
    submittedAt: updatedAt,
    updatedAt,
    ...(latestRound?.internalNote ? { internalNote: latestRound.internalNote } : {}),
  };
  return { record, profile };
}

function mapApiBatch(batchId: string, response: AssessmentBatchResponseDto) {
  const candidates = response.items.map((candidate) => mapApiCandidate(batchId, candidate));
  return {
    state: {
      batchId,
      batchVersion: response.version,
      version: response.version,
      currentRound: apiRound(response.currentRound),
      status: apiBatchStatus(response.status),
      records: candidates.map(({ record }) => record),
      auditRecords: [],
      ...(response.publishedAt ? { publishedAt: response.publishedAt } : {}),
    } satisfies RecruitmentAssessmentBatchState,
    profiles: Object.fromEntries(candidates.map(({ profile }) => [profile.id, profile])),
  };
}

function mapApiAdjustmentTargets(response: AssessmentAdjustmentTargetCatalogResponseDto) {
  return response.items.map((center) => ({ ...center }));
}

function isAssessableApplication(application: SubmittedRecruitmentApplication): boolean {
  return application.status !== "draft" && application.status !== "withdrawn";
}

function applicationFor(
  record: RecruitmentAssessmentRecord,
): SubmittedRecruitmentApplication | undefined {
  const application = useRecruitmentApplicationStore().getApplication(
    record.batchId,
    record.memberId,
  );
  return application && isAssessableApplication(application) ? application : undefined;
}

function candidateFromApplication(
  record: RecruitmentAssessmentRecord,
  application: SubmittedRecruitmentApplication,
): AdminCandidate {
  const orderedPreferences = application.preferences
    .slice()
    .sort((left, right) => left.rank - right.rank)
    .map((preference) => preference.center);
  const preferences = (
    orderedPreferences.length > 0 ? orderedPreferences : [application.firstChoice]
  ).slice(0, 3) as AdminCandidate["preferences"];
  const finalDecision = getFinalDecision(record);

  return {
    id: record.candidateId,
    batchId: record.batchId,
    memberId: record.memberId,
    name: application.applicantProfileSnapshot.name,
    studentId: application.applicantProfileSnapshot.studentId,
    grade: application.applicantProfileSnapshot.grade,
    className: application.applicantProfileSnapshot.className,
    contact: application.contact,
    bio: application.applicantProfileSnapshot.bio,
    identity: record.publishedAt
      ? finalDecision === "admitted" ? "正式成员" : "未录取"
      : "预备成员",
    preferences,
    baizeDirection: application.baizeDirection,
    acceptsAdjustment: application.acceptsAdjustment,
    stage: record.publishedAt ? "已结束" : "第一轮考核",
    result: record.publishedAt
      ? finalDecision === "admitted" ? "已录取" : "未通过"
      : "待公布",
    finalCenter: record.finalCenter,
    submittedAt: application.submittedAt ?? application.updatedAt,
    updatedAt: application.updatedAt,
    internalNote: record.internalNote,
  };
}

function candidateFor(record: RecruitmentAssessmentRecord): AdminCandidate | undefined {
  const application = applicationFor(record);
  if (application) return candidateFromApplication(record, application);
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
  if (status === "adjustment-suggestion-pending") {
    record.finalDecision = undefined;
    record.finalCenter = undefined;
  }
}

export const useRecruitmentAssessmentStore = defineStore("recruitment-assessment", {
  state: () => ({
    batches: restorePersistedBatches(),
    apiMode: false,
    apiCandidateProfiles: {} as Record<string, Record<string, AdminCandidate>>,
    apiAdjustmentTargetsByBatch: {} as Record<string, AssessmentAdjustmentTargetCatalogResponseDto["items"]>,
    apiLoadingByBatch: {} as Record<string, boolean>,
    apiMutatingByBatch: {} as Record<string, boolean>,
    apiErrorByBatch: {} as Record<string, string | undefined>,
    myResults: [] as MyRecruitmentResultDto[],
    myResultsLoading: false,
    myResultsError: undefined as string | undefined,
  }),
  actions: {
    enableApiMode() {
      if (this.apiMode) return;
      this.apiMode = true;
      this.batches = {};
      this.apiCandidateProfiles = {};
      this.apiAdjustmentTargetsByBatch = {};
    },
    async refreshAssessmentBatch(batchId: string, gateway: RecruitmentGateway) {
      this.enableApiMode();
      this.apiLoadingByBatch[batchId] = true;
      delete this.apiErrorByBatch[batchId];
      try {
        const [response, adjustmentTargets] = await Promise.all([
          gateway.getAssessmentBatch(batchId),
          gateway.getAdjustmentTargets(batchId),
        ]);
        const mapped = mapApiBatch(batchId, response);
        this.batches[batchId] = mapped.state;
        this.apiCandidateProfiles[batchId] = mapped.profiles;
        this.apiAdjustmentTargetsByBatch[batchId] = mapApiAdjustmentTargets(adjustmentTargets);
        return mapped.state;
      } catch (error) {
        this.apiErrorByBatch[batchId] = error instanceof Error ? error.message : "RECRUITMENT_API_REQUEST_FAILED";
        throw error;
      } finally {
        this.apiLoadingByBatch[batchId] = false;
      }
    },
    async saveRoundOutcomeFromApi(
      gateway: RecruitmentGateway,
      input: {
        batchId: string;
        candidateId: string;
        round: AssessmentRoundNumber;
        outcome: Exclude<AssessmentOutcome, "pending">;
        internalNote?: string;
      },
    ) {
      return this.runApiMutation(gateway, input.batchId, (expectedVersion) => (
        gateway.recordRoundResult(input.batchId, input.candidateId, {
          expectedVersion,
          round: input.round,
          outcome: input.outcome === "passed" ? "PASSED" : "FAILED",
          ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
        })
      ));
    },
    async recordAdjustmentSuggestionFromApi(
      gateway: RecruitmentGateway,
      input: { batchId: string; candidateId: string; targetCenterId: string },
    ) {
      return this.runApiMutation(gateway, input.batchId, (expectedVersion) => (
        gateway.proposeAdjustment(input.batchId, input.candidateId, {
          expectedVersion,
          targetCenterId: input.targetCenterId,
        })
      ));
    },
    async recordAdjustmentDecisionFromApi(
      gateway: RecruitmentGateway,
      input: {
        batchId: string;
        candidateId: string;
        decision: "ADMITTED" | "NOT_ADMITTED";
        targetCenterId?: string;
      },
    ) {
      return this.runApiMutation(gateway, input.batchId, (expectedVersion) => (
        gateway.decideAdjustment(input.batchId, input.candidateId, {
          expectedVersion,
          decision: input.decision,
          ...(input.targetCenterId ? { targetCenterId: input.targetCenterId } : {}),
        })
      ));
    },
    async advanceAssessmentRoundFromApi(
      gateway: RecruitmentGateway,
      batchId: string,
      reason?: string,
    ) {
      return this.runApiMutation(gateway, batchId, (expectedVersion) => (
        gateway.advanceAssessment(batchId, {
          expectedVersion,
          confirmed: true,
          ...(reason ? { reason } : {}),
        })
      ));
    },
    async publishBatchResultsFromApi(
      gateway: RecruitmentGateway,
      batchId: string,
      reason?: string,
    ) {
      return this.runApiMutation(gateway, batchId, (expectedVersion) => (
        gateway.publishAssessment(batchId, {
          expectedVersion,
          confirmed: true,
          ...(reason ? { reason } : {}),
        })
      ));
    },
    async runApiMutation(
      gateway: RecruitmentGateway,
      batchId: string,
      mutation: (expectedVersion: number) => Promise<unknown>,
    ) {
      this.enableApiMode();
      this.apiMutatingByBatch[batchId] = true;
      delete this.apiErrorByBatch[batchId];
      try {
        await mutation(this.getBatchState(batchId).version);
        return await this.refreshAssessmentBatch(batchId, gateway);
      } catch (error) {
        this.apiErrorByBatch[batchId] = error instanceof Error ? error.message : "RECRUITMENT_API_REQUEST_FAILED";
        throw error;
      } finally {
        this.apiMutatingByBatch[batchId] = false;
      }
    },
    async refreshMyResults(gateway: RecruitmentGateway) {
      this.enableApiMode();
      this.myResultsLoading = true;
      this.myResultsError = undefined;
      try {
        const response = await gateway.getMyResults();
        this.myResults = response.items;
        return response.items;
      } catch (error) {
        this.myResultsError = error instanceof Error ? error.message : "RECRUITMENT_API_REQUEST_FAILED";
        throw error;
      } finally {
        this.myResultsLoading = false;
      }
    },
    currentRound(batchId: string): AssessmentRoundNumber {
      return this.getBatchState(batchId).currentRound;
    },
    getApiAdjustmentTargets(batchId: string) {
      return this.apiAdjustmentTargetsByBatch[batchId]?.map((center) => ({ ...center })) ?? [];
    },
    getApiAdjustmentTarget(batchId: string, centerId: string) {
      const center = this.apiAdjustmentTargetsByBatch[batchId]?.find(({ id }) => id === centerId);
      return center ? { ...center } : undefined;
    },
    getBatchState(batchId: string): RecruitmentAssessmentBatchState {
      if (this.apiMode) {
        if (!this.batches[batchId]) this.batches[batchId] = emptyApiBatchState(batchId);
        return this.batches[batchId] as RecruitmentAssessmentBatchState;
      }
      const batch = useRecruitmentBatchStore().getBatchOrThrow(batchId);
      const existing = this.batches[batchId];
      if (!existing) {
        this.batches[batchId] = initialBatchState(batchId, batch.version);
      } else if (existing.batchVersion !== batch.version) {
        // Batch lifecycle and configuration changes do not invalidate assessment
        // results. Assessment mutations use their own state version.
        existing.batchVersion = batch.version;
      }
      const state = this.batches[batchId];
      if (!state) throw new Error("ASSESSMENT_BATCH_STATE_UNAVAILABLE");
      this.reconcileApplications(state);
      return state;
    },
    reconcileApplications(state: RecruitmentAssessmentBatchState) {
      if (this.apiMode) return;
      if (state.status === "published") return;
      const applications = useRecruitmentApplicationStore()
        .getApplicationsForBatch(state.batchId)
        .filter(isAssessableApplication);

      applications.forEach((application) => {
        const existing = state.records.find((record) => (
          record.memberId === application.memberId
          || record.candidateId === application.id
        ));
        if (existing) {
          existing.batchId = state.batchId;
          existing.memberId = application.memberId;
          const hasRecordedOutcome = Object.values(existing.roundOutcomes).some((outcome) => outcome !== "pending");
          if (!hasRecordedOutcome && !existing.finalDecision) {
            existing.center = application.firstChoice;
            existing.acceptsAdjustment = application.acceptsAdjustment;
          }
          return;
        }
        state.records.push({
          batchId: state.batchId,
          candidateId: application.id,
          memberId: application.memberId,
          center: application.firstChoice,
          acceptsAdjustment: application.acceptsAdjustment,
          roundOutcomes: {},
        });
      });
    },
    getCandidates(batchId: string): RecruitmentAssessmentCandidate[] {
      const state = this.getBatchState(batchId);
      return state.records.map((record) => this.toCandidate(state, record));
    },
    getActionableCandidates(batchId: string): RecruitmentAssessmentCandidate[] {
      const state = this.getBatchState(batchId);
      return state.records
        .filter((record) => (
          getAssessmentProcessingStatus(record) === "adjustment-suggestion-pending"
          || isAssessmentRoundEditable(record, state.currentRound, state.currentRound)
        ))
        .map((record) => this.toCandidate(state, record));
    },
    getCandidate(batchId: string, candidateId: string): RecruitmentAssessmentCandidate | undefined {
      const state = this.getBatchState(batchId);
      const record = state.records.find((item) => (
        item.candidateId === candidateId || (!this.apiMode && applicationFor(item)?.id === candidateId)
      ));
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
        candidate: this.apiMode
          ? this.apiCandidateProfiles[state.batchId]?.[record.candidateId]
          : candidateFor(record),
      };
    },
    assertCurrentBatch(batchId: string, _now: Date) {
      const batch = useRecruitmentBatchStore().getBatchOrThrow(batchId);
      if (batch.lifecycleStatus === "draft") {
        throw new Error("ASSESSMENT_BATCH_DRAFT_READ_ONLY");
      }
      if (batch.lifecycleStatus === "archived") {
        throw new Error("ASSESSMENT_BATCH_ARCHIVED_READ_ONLY");
      }
      this.getBatchState(batchId);
    },
    assertAssessmentWritable(batchId: string, now: Date) {
      // Candidate-level commands remain writable while the registration window
      // is open or paused. The first result locks that candidate's application.
      this.assertCurrentBatch(batchId, now);
    },
    assertAssessmentBatchClosed(batchId: string, now: Date) {
      this.assertCurrentBatch(batchId, now);
      const batchStatus = getEffectiveRecruitmentBatchStatus(
        useRecruitmentBatchStore().getBatchOrThrow(batchId),
        now,
      ).status;
      if (batchStatus !== "closed") throw new Error("ASSESSMENT_BATCH_NOT_CLOSED");
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
    assertCanSuggestAdjustment(record: RecruitmentAssessmentRecord) {
      const session = useSessionStore();
      const account = session.currentAccount;
      if (!session.isAuthenticated || !session.canAccessAdmin || !account) {
        throw new Error("ASSESSMENT_ADJUSTMENT_SUGGEST_PERMISSION_REQUIRED");
      }
      if (account.adminLevel === "owner") return account;
      if (account.adminCenterRole !== `${record.center}负责人`) {
        throw new Error("ASSESSMENT_ADJUSTMENT_SUGGEST_PERMISSION_REQUIRED");
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
      this.assertAssessmentWritable(input.batchId, input.now);
      const state = this.getBatchState(input.batchId);
      if (state.status !== "assessing") throw new Error("ASSESSMENT_NOT_EDITABLE");
      const record = state.records.find((item) => item.candidateId === input.candidateId);
      if (!record) throw new Error("ASSESSMENT_CANDIDATE_NOT_FOUND");
      const actor = this.assertCanEdit(record);
      if (!isAssessmentRoundEditable(record, input.round, state.currentRound)) {
        throw new Error("ASSESSMENT_ROUND_NOT_CURRENT");
      }
      const applicationStore = useRecruitmentApplicationStore();
      useRecruitmentBatchStore().markAssessmentStarted(input.batchId, input.now.toISOString());
      applicationStore.lockApplicationForAssessment(input.batchId, record.memberId, input.now);
      record.roundOutcomes[input.round] = input.outcome;
      if (input.internalNote !== undefined) record.internalNote = input.internalNote.trim();
      record.updatedAt = input.now.toISOString();
      applyDerivedDecision(record);
      this.appendAudit(state, "save-round", actor.account, input.now);
      this.touch(state);
      return this.toCandidate(state, record);
    },
    recordAdjustmentSuggestion(input: {
      batchId: string;
      candidateId: string;
      suggestedCenter: AdjustmentDestination;
      now: Date;
    }) {
      this.assertAssessmentWritable(input.batchId, input.now);
      const state = this.getBatchState(input.batchId);
      if (state.status === "published") throw new Error("ASSESSMENT_NOT_EDITABLE");
      const record = state.records.find((item) => item.candidateId === input.candidateId);
      if (!record) throw new Error("ASSESSMENT_CANDIDATE_NOT_FOUND");
      const actor = this.assertCanSuggestAdjustment(record);
      if (getAssessmentProcessingStatus(record) !== "adjustment-suggestion-pending") {
        throw new Error("ASSESSMENT_ADJUSTMENT_NOT_PENDING");
      }
      if (!record.acceptsAdjustment || !isRegularAdjustmentCenter(input.suggestedCenter)) {
        throw new Error("ASSESSMENT_ADJUSTMENT_NOT_ALLOWED");
      }
      useRecruitmentBatchStore().markAssessmentStarted(input.batchId, input.now.toISOString());
      useRecruitmentApplicationStore().lockApplicationForAssessment(input.batchId, record.memberId, input.now);
      record.adjustmentSuggestion = input.suggestedCenter;
      record.updatedAt = input.now.toISOString();
      this.appendAudit(state, "record-adjustment-suggestion", actor.account, input.now);
      this.touch(state);
      return this.toCandidate(state, record);
    },
    recordAdjustmentDecision(input: {
      batchId: string;
      candidateId: string;
      decision?: AssessmentAdjustmentDecision;
      finalCenter?: RecruitmentCenter;
      admitted?: boolean;
      now: Date;
    }) {
      this.assertAssessmentWritable(input.batchId, input.now);
      const state = this.getBatchState(input.batchId);
      if (state.status === "published") throw new Error("ASSESSMENT_NOT_EDITABLE");
      const record = state.records.find((item) => item.candidateId === input.candidateId);
      if (!record) throw new Error("ASSESSMENT_CANDIDATE_NOT_FOUND");
      const actor = this.resolveOwner();
      if (getAssessmentProcessingStatus(record) !== "adjustment-suggestion-pending") {
        throw new Error("ASSESSMENT_ADJUSTMENT_NOT_PENDING");
      }
      if (input.decision === undefined && input.admitted === undefined) {
        throw new Error("ASSESSMENT_ADJUSTMENT_DECISION_REQUIRED");
      }
      if (input.finalCenter !== undefined && !isRegularAdjustmentCenter(input.finalCenter)) {
        throw new Error("ASSESSMENT_ADJUSTMENT_NOT_ALLOWED");
      }
      const decision = input.decision ?? (
        input.admitted ? input.finalCenter : "not-admitted"
      );
      const admitted = decision !== "not-admitted";
      if (!record.acceptsAdjustment
        || (admitted && (!decision
          || !isRegularAdjustmentCenter(decision)))) {
        throw new Error("ASSESSMENT_ADJUSTMENT_NOT_ALLOWED");
      }
      useRecruitmentBatchStore().markAssessmentStarted(input.batchId, input.now.toISOString());
      useRecruitmentApplicationStore().lockApplicationForAssessment(input.batchId, record.memberId, input.now);
      record.finalDecision = admitted ? "admitted" : "not-admitted";
      record.finalCenter = admitted ? decision : undefined;
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
      this.assertAssessmentBatchClosed(batchId, now);
      const actor = this.resolveOwner();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      const state = this.getBatchState(batchId);
      if (state.status !== "assessing") throw new Error("ASSESSMENT_NOT_EDITABLE");
      const incomplete = state.records.some((record) => (
          getAssessmentProcessingStatus(record) === "adjustment-suggestion-pending"
        || isAssessmentRoundEditable(record, state.currentRound, state.currentRound)
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
    getPublicationSummary(
      batchId: string,
      candidateFilter?: (candidate: RecruitmentAssessmentCandidate) => boolean,
    ): PublicationSummary {
      const state = this.getBatchState(batchId);
      const records = candidateFilter
        ? state.records.filter((record) => candidateFilter(this.toCandidate(state, record)))
        : state.records;
      const processing = records.map((record) => getAssessmentProcessingStatus(record));
      const ready = processing.filter((status) => status === "ready-to-publish").length;
      const adjustmentPending = processing.filter((status) => status === "adjustment-suggestion-pending").length;
      const pending = processing.filter((status) => status === "assessing" || status === "adjustment-suggestion-pending").length;
      const admitted = records.filter((record) => getFinalDecision(record) === "admitted").length;
      const notAdmitted = records.filter((record) => getFinalDecision(record) === "not-admitted").length;
      return {
        total: records.length,
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
      this.assertAssessmentBatchClosed(batchId, now);
      const summary = this.getPublicationSummary(batchId);
      if (state.status !== "ready-to-publish" || !summary.canPublish) {
        throw new Error("ASSESSMENT_NOT_READY");
      }
      if (state.records.some((record) => !getFinalDecision(record))) {
        throw new Error("ASSESSMENT_NOT_READY");
      }

      const accessStore = useAdminAccessStore();
      const promotionTargets = state.records
        .filter((record) => getFinalDecision(record) === "admitted")
        .map((record) => {
          const memberId = candidateMemberId(record);
          if (!memberId
            || !record.finalCenter
            || !accessStore.accounts.some((account) => account.memberId === memberId)) {
            throw new Error("ASSESSMENT_ACCOUNT_NOT_FOUND");
          }
          return { record, memberId };
        });

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
        promotionTargets
          .forEach(({ record, memberId }) => {
            const candidate = candidateFor(record);
            if (!record.finalCenter) throw new Error("ASSESSMENT_NOT_READY");
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
        useRecruitmentBatchStore().markAssessmentPublished(batchId, publishedAt);
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
