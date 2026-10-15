import { defineStore } from "pinia";
import type {
  AssessmentAdvanceBlockerDto,
  AssessmentBatchResponseDto,
  AssessmentAdjustmentTargetCatalogResponseDto,
  AssessmentCandidateDto,
  CreateAssessmentTransferDto,
  MemberStageResultsDto,
  GroupCodeReferenceDto,
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
  getAssessmentCenter,
  getCurrentAssessmentRound,
  isAssessmentRoundEditable,
} from "../utils/recruitment-assessment-rules";
import { getEffectiveRecruitmentBatchStatus } from "../utils/recruitment-batch-rules";
import { baizeDirectionLabel, BAIZE_DIRECTION_LABELS } from "../utils/baize-direction-label";
import type { RecruitmentGateway } from "../services/recruitment/recruitment-gateway";
import { RecruitmentApiError } from "../services/recruitment/api-recruitment.gateway";
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
  action: "save-round" | "transfer" | "record-adjustment-suggestion" | "record-adjustment" | "advance-round" | "publish";
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
  roundPublishedAt?: Partial<Record<AssessmentRoundNumber, string>>;
}

export interface RecruitmentAssessmentBatchContext {
  id: string;
  name: string;
  lifecycleStatus: "draft" | "upcoming" | "open" | "paused" | "closed" | "archived";
}

export interface RecruitmentAssessmentWorkflowSummary {
  pending: number;
  adjustmentPending: number;
  canAdvance: boolean;
  advanceBlocker?: AssessmentAdvanceBlockerDto;
  nextAction?: AssessmentBatchResponseDto["nextAction"];
}

export type AssessmentCandidateProfile = Omit<AdminCandidate, "submittedAt" | "updatedAt"> & {
  submittedAt?: string;
  updatedAt?: string;
};

export interface AssessmentApiError {
  code?: string;
  status?: number;
  message: string;
  requestId?: string;
}

export type AssessmentPersonalSaveState = "editing" | "saving" | "saved" | "saved-refresh-failed" | "conflict" | "unknown";
export interface AssessmentPersonalSaveScope {
  batchId?: string;
  candidateId: string;
  operation: "round" | "adjustment" | "proposal" | "transfer";
  round: AssessmentRoundNumber;
}
export function assessmentPersonalSaveKey(scope: AssessmentPersonalSaveScope): string {
  if (scope.operation === 'transfer') return JSON.stringify([scope.batchId, scope.candidateId, scope.operation]);
  // Round results recur; each member has one final adjustment/proposal operation.
  return JSON.stringify(scope.operation === "round"
    ? [scope.candidateId, scope.operation, scope.round]
    : [scope.candidateId, scope.operation]);
}
export interface AssessmentPersonalSaveResult {
  scope: AssessmentPersonalSaveScope;
  status: Exclude<AssessmentPersonalSaveState, "editing" | "saving">;
  refreshed: boolean;
  error?: AssessmentApiError;
}

export interface RecruitmentAssessmentCandidate extends RecruitmentAssessmentRecord {
  currentPhase?: "第一轮考核" | "第二轮考核" | "第三轮考核";
  processingStatus: AssessmentProcessingStatus;
  candidate?: AssessmentCandidateProfile;
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

function summarizeApiError(error: unknown): AssessmentApiError {
  if (typeof error === "string") return { code: error, message: error };
  if (!isRecord(error)) return { message: "RECRUITMENT_API_REQUEST_FAILED" };
  return {
    ...(typeof error.code === "string" ? { code: error.code } : {}),
    ...(typeof error.status === "number" ? { status: error.status } : {}),
    message: typeof error.message === "string" ? error.message : "RECRUITMENT_API_REQUEST_FAILED",
    ...(typeof error.requestId === "string" ? { requestId: error.requestId } : {}),
  };
}

function cloneAssessmentRecord(record: RecruitmentAssessmentRecord): RecruitmentAssessmentRecord {
  return {
    ...record,
    roundOutcomes: { ...record.roundOutcomes },
    ...(record.assessmentCenter ? { assessmentCenter: { ...record.assessmentCenter } } : {}),
    ...(record.transfer ? { transfer: { ...record.transfer, fromCenter: { ...record.transfer.fromCenter }, toCenter: { ...record.transfer.toCenter } } } : {}),
    ...(record.transferEligibility ? { transferEligibility: { ...record.transferEligibility } } : {}),
    ...(record.originalRoundResult ? { originalRoundResult: { ...record.originalRoundResult } } : {}),
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
    ...(state.roundPublishedAt ? { roundPublishedAt: { ...state.roundPublishedAt } } : {}),
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
  if (value.baizeDirectionCode !== undefined && (typeof value.baizeDirectionCode !== 'string' || !Object.hasOwn(BAIZE_DIRECTION_LABELS, value.baizeDirectionCode))) return false;
  if (value.finalBaizeDirection !== undefined && value.finalBaizeDirection !== null && (typeof value.finalBaizeDirection !== 'string' || !Object.hasOwn(BAIZE_DIRECTION_LABELS, value.finalBaizeDirection))) return false;
  if (value.originalRoundResult !== undefined) {
    const result = value.originalRoundResult;
    if (!isRecord(result) || result.round !== 1 || !['PASSED', 'FAILED'].includes(result.outcome as string)
      || !(result.internalNote === null || typeof result.internalNote === 'string')
      || typeof result.createdAt !== 'string' || !Number.isFinite(Date.parse(result.createdAt)) || new Date(result.createdAt).getUTCFullYear() === 1970
      || Object.keys(result).some(key => !['round', 'outcome', 'internalNote', 'createdAt'].includes(key))) return false;
  }
  if (value.transfer !== undefined) {
    const transfer = value.transfer;
    if (!isRecord(transfer) || typeof transfer.id !== 'string' || !transfer.id
      || Object.keys(transfer).some(key => !['id', 'fromCenter', 'toCenter', 'entryRound', 'baizeDirection', 'createdAt'].includes(key))
      || transfer.entryRound !== 2 || value.entryRound !== 2
      || typeof transfer.baizeDirection !== 'string' || !Object.hasOwn(BAIZE_DIRECTION_LABELS, transfer.baizeDirection)
      || typeof transfer.createdAt !== 'string' || !Number.isFinite(Date.parse(transfer.createdAt)) || new Date(transfer.createdAt).getUTCFullYear() === 1970
      || !isRecord(transfer.fromCenter) || !isRecord(transfer.toCenter)
      || transfer.fromCenter.name !== value.center || transfer.toCenter.name !== '白泽开发中心'
      || ![transfer.fromCenter, transfer.toCenter].every(center => ['id', 'slug', 'name'].every(key => typeof center[key] === 'string' && center[key]))
      || [transfer.fromCenter, transfer.toCenter].some(center => Object.keys(center).some(key => !['id', 'slug', 'name'].includes(key)))
      || !isRecord(value.assessmentCenter) || value.assessmentCenter.id !== transfer.toCenter.id) return false;
  } else if (value.entryRound === 2 || value.assessmentCenter !== undefined) return false;
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
  if (value.roundPublishedAt !== undefined && (!isRecord(value.roundPublishedAt) || !Object.entries(value.roundPublishedAt).every(([round, time]) => ['1', '2', '3'].includes(round) && typeof time === 'string' && Number.isFinite(Date.parse(time)) && new Date(time).getUTCFullYear() !== 1970))) return false;
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

function latestCandidateTimestamp(candidate: AssessmentCandidateDto): string | undefined {
  const values = [
    ...candidate.roundResults.map((result) => result.createdAt),
    candidate.adjustmentProposal?.createdAt,
    candidate.adjustmentDecision?.createdAt,
    candidate.finalResult?.publishedAt,
    candidate.transfer?.createdAt,
  ].filter((value): value is string => typeof value === "string"
    && Number.isFinite(Date.parse(value)) && new Date(value).getUTCFullYear() !== 1970);
  let latest = values[0];
  for (const value of values.slice(1)) {
    if (latest && Date.parse(value) > Date.parse(latest)) latest = value;
  }
  return latest;
}

function mapApiCandidate(
  batchId: string,
  candidate: AssessmentCandidateDto,
): { record: RecruitmentAssessmentRecord; profile: AssessmentCandidateProfile } {
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
    ...(candidate.assessmentCenter ? { assessmentCenter: apiCenterIdentity(candidate.assessmentCenter) } : {}),
    ...(candidate.entryRound ? { entryRound: apiRound(candidate.entryRound) } : {}),
    ...(candidate.transfer ? { transfer: { ...candidate.transfer }, assessmentCenter: apiCenterIdentity(candidate.transfer.toCenter), entryRound: 2 as const } : {}),
    ...(candidate.transferEligibility ? { transferEligibility: { ...candidate.transferEligibility } } : {}),
    ...(candidate.baizeDirection ? { baizeDirectionCode: candidate.baizeDirection } : {}),
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
  const profile: AssessmentCandidateProfile = {
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
    ...(updatedAt ? { updatedAt } : {}),
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

function apiBatchContext(response: AssessmentBatchResponseDto): RecruitmentAssessmentBatchContext | undefined {
  const batch = response.batch;
  if (!batch || typeof batch.id !== "string" || typeof batch.name !== "string") return undefined;
  const lifecycleStatus = batch.lifecycleStatus;
  if (![
    "draft",
    "upcoming",
    "open",
    "paused",
    "closed",
    "archived",
  ].includes(lifecycleStatus as string)) return undefined;
  return {
    id: batch.id,
    name: batch.name,
    lifecycleStatus: lifecycleStatus as RecruitmentAssessmentBatchContext["lifecycleStatus"],
  };
}

function apiWorkflowSummary(response: AssessmentBatchResponseDto): RecruitmentAssessmentWorkflowSummary | undefined {
  const blocker = response.advanceBlocker ?? undefined;
  return {
    pending: response.pending,
    adjustmentPending: response.adjustmentPending,
    canAdvance: response.canAdvance,
    ...(blocker ? { advanceBlocker: { ...blocker } } : {}),
    nextAction: response.nextAction,
  };
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
    return getAssessmentRounds(record).some((round) => record.roundOutcomes[round] === "failed")
      ? "not-admitted"
      : "admitted";
  }
  return undefined;
}

function applyDerivedDecision(record: RecruitmentAssessmentRecord) {
  const status = getAssessmentProcessingStatus(record);
  if (status === "ready-to-publish" && !record.finalDecision) {
    record.finalDecision = getAssessmentRounds(record).some(
      (round) => record.roundOutcomes[round] === "failed",
    ) ? "not-admitted" : "admitted";
    if (record.finalDecision === "admitted") {
      record.finalCenter = getAssessmentCenter(record);
      record.finalBaizeDirection = record.transfer?.baizeDirection ?? record.baizeDirectionCode ?? null;
    }
  }
  if (status === "adjustment-suggestion-pending") {
    record.finalDecision = undefined;
    record.finalCenter = undefined;
    record.finalBaizeDirection = null;
  }
}

export const useRecruitmentAssessmentStore = defineStore("recruitment-assessment", {
  state: () => ({
    batches: restorePersistedBatches(),
    apiMode: false,
    apiCandidateProfiles: {} as Record<string, Record<string, AssessmentCandidateProfile>>,
    apiAdjustmentTargetsByBatch: {} as Record<string, AssessmentAdjustmentTargetCatalogResponseDto["items"]>,
    apiTransferCapabilitiesByBatch: {} as Record<string, boolean>,
    apiBatchContextByBatch: {} as Record<string, RecruitmentAssessmentBatchContext | undefined>,
    apiWorkflowByBatch: {} as Record<string, RecruitmentAssessmentWorkflowSummary | undefined>,
    apiLoadingByBatch: {} as Record<string, boolean>,
    apiRefreshGenerationByBatch: {} as Record<string, number>,
    apiMutatingByBatch: {} as Record<string, boolean>,
    apiPersonalSaveByBatch: {} as Record<string, Record<string, AssessmentPersonalSaveResult>>,
    apiErrorByBatch: {} as Record<string, AssessmentApiError | undefined>,
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
      this.apiTransferCapabilitiesByBatch = {};
      this.apiBatchContextByBatch = {};
      this.apiWorkflowByBatch = {};
      this.apiPersonalSaveByBatch = {};
    },
    async refreshAssessmentBatch(batchId: string, gateway: RecruitmentGateway) {
      this.enableApiMode();
      const generation = (this.apiRefreshGenerationByBatch[batchId] ?? 0) + 1;
      this.apiRefreshGenerationByBatch[batchId] = generation;
      this.apiLoadingByBatch[batchId] = true;
      delete this.apiErrorByBatch[batchId];
      try {
        const [response, adjustmentTargets] = await Promise.all([
          gateway.getAssessmentBatch(batchId),
          gateway.getAdjustmentTargets(batchId, true),
        ]);
        if (generation !== this.apiRefreshGenerationByBatch[batchId]) return this.getBatchState(batchId);
        const mapped = mapApiBatch(batchId, response);
        this.batches[batchId] = mapped.state;
        this.apiCandidateProfiles[batchId] = mapped.profiles;
        this.apiAdjustmentTargetsByBatch[batchId] = mapApiAdjustmentTargets(adjustmentTargets);
        this.apiTransferCapabilitiesByBatch[batchId] = response.capabilities?.assessmentTransfers === true && adjustmentTargets.capabilities?.assessmentTransfers === true;
        this.apiBatchContextByBatch[batchId] = apiBatchContext(response);
        this.apiWorkflowByBatch[batchId] = apiWorkflowSummary(response);
        return mapped.state;
      } catch (error) {
        if (generation === this.apiRefreshGenerationByBatch[batchId]) this.apiErrorByBatch[batchId] = summarizeApiError(error);
        throw error;
      } finally {
        if (generation === this.apiRefreshGenerationByBatch[batchId]) this.apiLoadingByBatch[batchId] = false;
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
    ): Promise<AssessmentPersonalSaveResult> {
      return this.runPersonalApiMutation(gateway, { ...input, operation: "round" }, expectedVersion => (
        gateway.recordRoundResult(input.batchId, input.candidateId, {
          expectedVersion,
          round: input.round,
          outcome: input.outcome === "passed" ? "PASSED" : "FAILED",
          ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
        })
      ), response => {
        const record = this.getBatchState(input.batchId).records.find(item => item.candidateId === input.candidateId);
        if (!record) return;
        record.roundOutcomes[apiRound(response.result.round)] = response.result.outcome === "PASSED" ? "passed" : "failed";
        record.internalNote = response.result.internalNote ?? undefined;
        this.applyPersonalTimestamp(input.batchId, input.candidateId, response.result.createdAt);
      });
    },
    async recordAdjustmentSuggestionFromApi(
      gateway: RecruitmentGateway,
      input: { batchId: string; candidateId: string; targetCenterId: string },
    ) {
      return this.runPersonalApiMutation(gateway, { ...input, operation: "proposal", round: this.currentRound(input.batchId) }, expectedVersion => (
        gateway.proposeAdjustment(input.batchId, input.candidateId, { expectedVersion, targetCenterId: input.targetCenterId })
      ), response => {
        const record = this.getBatchState(input.batchId).records.find(item => item.candidateId === input.candidateId);
        if (!record) return;
        record.adjustmentSuggestionIdentity = apiCenterIdentity(response.proposal.targetCenter);
        record.adjustmentSuggestion = apiCenterName(response.proposal.targetCenter.name) as AdjustmentDestination;
        this.applyPersonalTimestamp(input.batchId, input.candidateId, response.proposal.createdAt);
      });
    },
    async recordAdjustmentDecisionFromApi(
      gateway: RecruitmentGateway,
      input: { batchId: string; candidateId: string; decision: "ADMITTED" | "NOT_ADMITTED"; targetCenterId?: string },
    ) {
      return this.runPersonalApiMutation(gateway, { ...input, operation: "adjustment", round: this.currentRound(input.batchId) }, expectedVersion => (
        gateway.decideAdjustment(input.batchId, input.candidateId, {
          expectedVersion, decision: input.decision,
          ...(input.targetCenterId ? { targetCenterId: input.targetCenterId } : {}),
        })
      ), response => {
        const record = this.getBatchState(input.batchId).records.find(item => item.candidateId === input.candidateId);
        if (!record) return;
        record.finalDecision = response.decision.decision === "ADMITTED" ? "admitted" : "not-admitted";
        record.finalCenterIdentity = response.decision.targetCenter ? apiCenterIdentity(response.decision.targetCenter) : undefined;
        record.finalCenter = record.finalCenterIdentity ? apiCenterName(record.finalCenterIdentity.name) : undefined;
        this.applyPersonalTimestamp(input.batchId, input.candidateId, response.decision.createdAt);
      });
    },
    async transferAssessmentFromApi(
      gateway: RecruitmentGateway,
      input: { batchId: string; candidateId: string; targetCenterId: string; baizeDirection: CreateAssessmentTransferDto['baizeDirection'] },
    ): Promise<AssessmentPersonalSaveResult> {
      const record = this.getCandidate(input.batchId, input.candidateId);
      const scope: AssessmentPersonalSaveScope = { batchId: input.batchId, candidateId: input.candidateId, operation: 'transfer', round: 1 };
      if (record?.transfer) throw new Error('ASSESSMENT_TRANSFER_ALREADY_EXISTS');
      const previous = this.apiPersonalSaveByBatch[input.batchId]?.[assessmentPersonalSaveKey(scope)];
      if (previous?.status === 'unknown') throw new Error('ASSESSMENT_TRANSFER_SAVE_UNKNOWN');
      if (previous?.status === 'saved' || previous?.status === 'saved-refresh-failed') throw new Error('ASSESSMENT_TRANSFER_ALREADY_EXISTS');
      if (!gateway.transferAssessment || !this.apiTransferCapabilitiesByBatch[input.batchId]) throw new Error('ASSESSMENT_TRANSFER_UNSUPPORTED');
      const target = this.getApiTransferTarget(input.batchId);
      if (this.currentRound(input.batchId) !== 1 || this.getBatchState(input.batchId).status !== 'assessing') throw new Error('ASSESSMENT_TRANSFER_WINDOW_CLOSED');
      if (!record?.transferEligibility?.available) throw new Error(record?.transferEligibility?.blockReason ?? 'ASSESSMENT_TRANSFER_NOT_ALLOWED');
      if (!target?.available || target.id !== input.targetCenterId) throw new Error(target?.blockReason ?? 'ASSESSMENT_TRANSFER_TARGET_INVALID');
      if (!Object.hasOwn(BAIZE_DIRECTION_LABELS, input.baizeDirection)) throw new Error('BAIZE_DIRECTION_INVALID');
      const result = await this.runPersonalApiMutation(gateway, scope as AssessmentPersonalSaveScope & { batchId: string }, () => gateway.transferAssessment!(input.batchId, input.candidateId, {
        targetCenterId: input.targetCenterId, baizeDirection: input.baizeDirection, expectedCurrentRound: 1,
      }), response => {
        const current = this.getBatchState(input.batchId).records.find(item => item.candidateId === input.candidateId);
        if (!current) return;
        current.transfer = { ...response.transfer };
        current.assessmentCenter = apiCenterIdentity(response.transfer.toCenter);
        current.entryRound = 2;
        current.transferEligibility = { available: false, blockReason: 'ASSESSMENT_TRANSFER_ALREADY_EXISTS' };
        this.applyPersonalTimestamp(input.batchId, input.candidateId, response.transfer.createdAt);
      });
      if (result.status === 'unknown' && result.refreshed && this.getCandidate(input.batchId, input.candidateId)?.transfer) {
        return this.rememberPersonalSaveResult(input.batchId, scope, { status: 'saved', refreshed: true });
      }
      return result;
    },
    async refreshTransferSave(gateway: RecruitmentGateway, batchId: string, previous: AssessmentPersonalSaveResult): Promise<AssessmentPersonalSaveResult> {
      try {
        await this.refreshAssessmentBatch(batchId, gateway);
        const confirmed = this.getCandidate(batchId, previous.scope.candidateId)?.transfer;
        return this.rememberPersonalSaveResult(batchId, previous.scope, { ...previous, refreshed: true,
          status: confirmed || previous.status === 'saved-refresh-failed' ? 'saved' : previous.status });
      } catch {
        return this.rememberPersonalSaveResult(batchId, previous.scope, { ...previous, refreshed: false });
      }
    },
    applyPersonalTimestamp(batchId: string, candidateId: string, createdAt: string) {
      const record = this.getBatchState(batchId).records.find(item => item.candidateId === candidateId);
      if (!record) return;
      const timestamp = Date.parse(createdAt);
      if (Number.isFinite(timestamp) && new Date(timestamp).getUTCFullYear() !== 1970
        && (!record.updatedAt || !Number.isFinite(Date.parse(record.updatedAt)) || timestamp >= Date.parse(record.updatedAt))) {
        record.updatedAt = createdAt;
      }
      const profile = this.apiCandidateProfiles[batchId]?.[candidateId];
      if (profile) {
        profile.updatedAt = record.updatedAt;
        profile.internalNote = record.internalNote;
      }
    },
    rememberPersonalSaveResult(batchId: string, scope: AssessmentPersonalSaveScope, result: Omit<AssessmentPersonalSaveResult, "scope">): AssessmentPersonalSaveResult {
      this.apiPersonalSaveByBatch[batchId] ??= {};
      const scopedResult = { ...result, scope: { ...scope } };
      this.apiPersonalSaveByBatch[batchId][assessmentPersonalSaveKey(scope)] = scopedResult;
      return scopedResult;
    },
    async runPersonalApiMutation<T extends { version: number }>(
      gateway: RecruitmentGateway,
      input: AssessmentPersonalSaveScope & { batchId: string },
      mutation: (expectedVersion: number) => Promise<T>,
      applyResponse: (response: T) => void,
    ): Promise<AssessmentPersonalSaveResult> {
      this.enableApiMode();
      const { batchId, candidateId, operation, round } = input;
      const scope: AssessmentPersonalSaveScope = { ...(operation === 'transfer' ? { batchId } : {}), candidateId, operation, round };
      if (this.apiMutatingByBatch[batchId]) throw new Error("ASSESSMENT_SAVE_IN_PROGRESS");
      this.apiMutatingByBatch[batchId] = true;
      delete this.apiErrorByBatch[batchId];
      try {
        let response: T;
        try {
          response = await mutation(this.getBatchState(batchId).version);
        } catch (cause) {
          const error = summarizeApiError(cause);
          const unknown = error.status === undefined || error.status === 0 || error.status >= 500;
          let refreshed = false;
          // A read cannot prove whether an interrupted POST committed or is still in flight.
          try {
            await this.refreshAssessmentBatch(batchId, gateway);
            refreshed = true;
          } catch { /* Preserve the POST error for diagnostics. */ }
          this.apiErrorByBatch[batchId] = error;
          return this.rememberPersonalSaveResult(batchId, scope, { status: unknown ? "unknown" : "conflict", refreshed, error });
        }
        // The successful POST remains authoritative when its followup read fails.
        this.apiRefreshGenerationByBatch[batchId] = (this.apiRefreshGenerationByBatch[batchId] ?? 0) + 1;
        const state = this.getBatchState(batchId);
        state.version = response.version;
        state.batchVersion = response.version;
        applyResponse(response);
        try {
          await this.refreshAssessmentBatch(batchId, gateway);
          return this.rememberPersonalSaveResult(batchId, scope, { status: "saved", refreshed: true });
        } catch (cause) {
          const error = { ...summarizeApiError(cause), code: "POST_SAVED_REFRESH_FAILED", message: "结果已保存，名单刷新失败，请重试刷新。" };
          this.apiErrorByBatch[batchId] = error;
          return this.rememberPersonalSaveResult(batchId, scope, { status: "saved-refresh-failed", refreshed: false, error });
        }
      } finally {
        this.apiMutatingByBatch[batchId] = false;
      }
    },
    async advanceAssessmentRoundFromApi(
      gateway: RecruitmentGateway,
      batchId: string,
      reason?: string,
      preview?: { assessmentVersion: number; previewFingerprint: string },
    ) {
      return this.runApiMutation(gateway, batchId, (expectedVersion) => (
        gateway.advanceAssessment(batchId, {
          expectedVersion: preview?.assessmentVersion ?? expectedVersion,
          ...(preview ? { previewFingerprint: preview.previewFingerprint } : {}),
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
      if (this.apiMutatingByBatch[batchId]) throw new Error("ASSESSMENT_SAVE_IN_PROGRESS");
      this.apiMutatingByBatch[batchId] = true;
      delete this.apiErrorByBatch[batchId];
      try {
        try {
          await mutation(this.getBatchState(batchId).version);
        } catch (error) {
          this.apiErrorByBatch[batchId] = summarizeApiError(error);
          throw error;
        }
        try {
          return await this.refreshAssessmentBatch(batchId, gateway);
        } catch (cause) {
          const error = new RecruitmentApiError({
            status: summarizeApiError(cause).status ?? 0,
            code: "POST_SAVED_REFRESH_FAILED",
            message: "操作已提交，最新状态读取失败，请刷新核对。",
            requestId: summarizeApiError(cause).requestId,
          });
          this.apiErrorByBatch[batchId] = summarizeApiError(error);
          throw error;
        }
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
      return this.apiAdjustmentTargetsByBatch[batchId]?.filter(center => center.action !== 'TRANSFER_TO_ASSESSMENT' && center.slug !== 'baize-development' && center.name !== '白泽开发中心').map((center) => ({ ...center })) ?? [];
    },
    getApiTransferTarget(batchId: string) {
      if (!this.apiTransferCapabilitiesByBatch[batchId]) return undefined;
      const target = this.apiAdjustmentTargetsByBatch[batchId]?.find(center => center.action === 'TRANSFER_TO_ASSESSMENT');
      return target ? { ...target } : undefined;
    },
    getApiAdjustmentTarget(batchId: string, centerId: string) {
      const center = this.getApiAdjustmentTargets(batchId).find(({ id }) => id === centerId);
      return center ? { ...center } : undefined;
    },
    getApiBatchContext(batchId: string) {
      const context = this.apiBatchContextByBatch[batchId];
      return context ? { ...context } : undefined;
    },
    getApiWorkflowSummary(batchId: string) {
      const summary = this.apiWorkflowByBatch[batchId];
      return summary ? { ...summary, advanceBlocker: summary.advanceBlocker ? { ...summary.advanceBlocker } : undefined } : undefined;
    },
    getMockStageResults(batchId: string, memberId: string): MemberStageResultsDto {
      const state = this.getBatchState(batchId);
      const record = state.records.find(item => item.memberId === memberId);
      const empty: MemberStageResultsDto = { batchId: null, batchName: null, center: null, stages: [], transfer: null, entryGroupCode: null, finalGroupCode: null };
      if (this.apiMode || !record) return empty;
      const missingCode = (round: number): GroupCodeReferenceDto => ({ round, id: null, version: 0, status: 'MISSING', imageUrl: null });
      const publishedAt = (round: AssessmentRoundNumber) => state.roundPublishedAt?.[round] ?? record.publishedAt;
      const stages: MemberStageResultsDto['stages'] = ([1, 2, 3] as AssessmentRoundNumber[]).flatMap(round => {
        const outcome = record.roundOutcomes[round], time = publishedAt(round);
        if (!time || !outcome || outcome === 'pending') return [];
        const original = round === 1;
        const center = original ? record.transfer?.fromCenter ?? { id: record.center, slug: record.center, name: record.center } : record.assessmentCenter ?? { id: record.center, slug: record.center, name: record.center };
        return [{ round, outcome: outcome === 'passed' ? 'PASSED' as const : 'FAILED' as const, publishedAt: time, center,
          ...(record.transfer && !original ? { baizeDirection: record.transfer.baizeDirection } : {}),
          groupCode: outcome === 'passed' ? missingCode(round) : null }];
      });
      const transferTime = publishedAt(1);
      const transfer = record.transfer && transferTime ? { id: record.transfer.id, fromCenter: { ...record.transfer.fromCenter }, toCenter: { ...record.transfer.toCenter }, entryRound: 2 as const, baizeDirection: record.transfer.baizeDirection, publishedAt: transferTime } : null;
      return { batchId, batchName: useRecruitmentBatchStore().getBatch(batchId)?.name ?? batchId,
        center: transfer ? transfer.toCenter : { id: record.center, name: record.center }, stages, transfer,
        entryGroupCode: transfer ? missingCode(1) : null,
        finalGroupCode: record.publishedAt && record.finalDecision === 'admitted' ? missingCode(getAssessmentCenter(record) === '白泽开发中心' ? 3 : 1) : null };
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
      if (account.adminCenterRole !== `${getAssessmentCenter(record)}负责人`) {
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
      if (account.adminCenterRole !== `${getAssessmentCenter(record)}负责人`) {
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
      if (input.round === 1) record.originalRoundResult = { round: 1, outcome: input.outcome === 'passed' ? 'PASSED' : 'FAILED', internalNote: input.internalNote?.trim() || null, createdAt: input.now.toISOString() };
      if (input.internalNote !== undefined) record.internalNote = input.internalNote.trim();
      record.updatedAt = input.now.toISOString();
      applyDerivedDecision(record);
      this.appendAudit(state, "save-round", actor.account, input.now);
      this.touch(state);
      return this.toCandidate(state, record);
    },
    getTransferEligibility(batchId: string, candidateId: string) {
      const record = this.getCandidate(batchId, candidateId);
      if (this.apiMode) return record?.transferEligibility;
      const state = this.getBatchState(batchId);
      const batch = useRecruitmentBatchStore().getBatch(batchId);
      const blockReason = record?.transfer ? 'ASSESSMENT_TRANSFER_ALREADY_EXISTS'
        : state.currentRound !== 1 || state.status !== 'assessing' || !batch || ['draft', 'upcoming', 'archived'].includes(batch.lifecycleStatus) ? 'ASSESSMENT_TRANSFER_WINDOW_CLOSED'
        : record?.finalDecision ? 'ASSESSMENT_TRANSFER_FINAL_DECISION_EXISTS'
        : !record || record.center === '白泽开发中心' || !record.acceptsAdjustment || record.roundOutcomes[1] !== 'failed' ? 'ASSESSMENT_TRANSFER_NOT_ALLOWED'
        : null;
      return { available: !blockReason, blockReason };
    },
    transferAssessment(input: { batchId: string; candidateId: string; baizeDirection: CreateAssessmentTransferDto['baizeDirection']; now: Date }) {
      const actor = this.resolveOwner();
      this.assertAssessmentWritable(input.batchId, input.now);
      const eligibility = this.getTransferEligibility(input.batchId, input.candidateId);
      if (!eligibility?.available) throw new Error(eligibility?.blockReason ?? 'ASSESSMENT_TRANSFER_NOT_ALLOWED');
      if (!Object.hasOwn(BAIZE_DIRECTION_LABELS, input.baizeDirection)) throw new Error('BAIZE_DIRECTION_INVALID');
      const state = this.getBatchState(input.batchId);
      const record = state.records.find(item => item.candidateId === input.candidateId)!;
      record.transfer = { id: `transfer-${state.batchId}-${record.candidateId}`, fromCenter: { id: record.center, slug: record.center, name: record.center }, toCenter: { id: '白泽开发中心', slug: 'baize-development', name: '白泽开发中心' }, entryRound: 2, baizeDirection: input.baizeDirection, createdAt: input.now.toISOString() };
      record.assessmentCenter = { ...record.transfer.toCenter };
      record.entryRound = 2;
      record.updatedAt = input.now.toISOString();
      useRecruitmentBatchStore().markAssessmentStarted(input.batchId, input.now.toISOString());
      useRecruitmentApplicationStore().lockApplicationForAssessment(input.batchId, record.memberId, input.now);
      this.appendAudit(state, 'transfer', actor.account, input.now);
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
      record.finalBaizeDirection = null;
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

      state.roundPublishedAt ??= {};
      state.roundPublishedAt[state.currentRound] = now.toISOString();

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
              ...(record.transfer ? { baizeDirection: baizeDirectionLabel(record.transfer.baizeDirection) } : candidate?.baizeDirection ? { baizeDirection: candidate.baizeDirection } : {}),
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
