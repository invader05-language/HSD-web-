import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AssessmentAdjustmentTargetCatalogResponseDto,
  AssessmentBatchResponseDto,
} from "../../packages/api-client/src";
import type { RecruitmentGateway } from "../../app/services/recruitment/recruitment-gateway";
import { useRecruitmentAssessmentStore } from "../../app/stores/recruitment-assessment";

const EMPTY_BATCH: AssessmentBatchResponseDto = {
  batch: { id: "batch-1", name: "Assessment batch", lifecycleStatus: "closed" },
  currentRound: 1,
  status: "ASSESSING",
  version: 3,
  publishedAt: null,
  pending: 0,
  adjustmentPending: 0,
  canAdvance: true,
  advanceBlocker: null,
  nextAction: "ADVANCE_ROUND",
  items: [],
};

const EMPTY_ADJUSTMENT_TARGETS: AssessmentAdjustmentTargetCatalogResponseDto = { items: [] };

function gateway(overrides: Partial<RecruitmentGateway> = {}): RecruitmentGateway {
  return {
    getAssessmentBatch: vi.fn().mockResolvedValue(EMPTY_BATCH),
    getAdjustmentTargets: vi.fn().mockResolvedValue(EMPTY_ADJUSTMENT_TARGETS),
    recordRoundResult: vi.fn().mockResolvedValue({
      version: 4,
      result: {
        round: 1,
        outcome: "PASSED",
        internalNote: null,
        createdAt: "2026-08-07T09:00:00.000Z",
      },
    }),
    proposeAdjustment: vi.fn(),
    decideAdjustment: vi.fn(),
    advanceAssessment: vi.fn(),
    publishAssessment: vi.fn(),
    getMyResults: vi.fn().mockResolvedValue({ items: [] }),
    ...overrides,
  };
}

describe("recruitment assessment API store mode", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("starts production mode empty and maps the authoritative first-choice roster", async () => {
    const store = useRecruitmentAssessmentStore();
    store.enableApiMode();
    expect(store.getCandidates("batch-1")).toEqual([]);

    await store.refreshAssessmentBatch("batch-1", gateway({
      getAssessmentBatch: vi.fn().mockResolvedValue({
        currentRound: 2,
        status: "ASSESSING",
        version: 7,
        publishedAt: null,
        items: [{
          applicationId: "application-1",
          person: {
            id: "person-1",
            name: "林同学",
            studentId: "20260001",
            grade: "2026",
            className: "软件一班",
          },
          acceptsAdjustment: true,
          baizeDirection: "HARMONYOS_DEVELOPMENT",
          preferences: [
            { rank: "FIRST", center: { id: "baize", slug: "baize-development", name: "白泽开发中心" } },
            { rank: "SECOND", center: { id: "media", slug: "media", name: "新媒体中心" } },
          ],
          roundResults: [{
            round: 1,
            outcome: "PASSED",
            internalNote: "内部备注",
            createdAt: "2026-08-07T08:00:00.000Z",
          }],
          adjustmentProposal: null,
          adjustmentDecision: null,
          finalResult: null,
        }],
      }),
    }));

    expect(store.apiLoadingByBatch["batch-1"]).toBe(false);
    expect(store.apiErrorByBatch["batch-1"]).toBeUndefined();
    expect(store.getBatchState("batch-1")).toMatchObject({
      currentRound: 2,
      status: "assessing",
      version: 7,
    });
    expect(store.getApiAdjustmentTargets("batch-1")).toEqual([]);
    expect(store.getCandidates("batch-1")).toEqual([
      expect.objectContaining({
        candidateId: "application-1",
        memberId: "person-1",
        center: "白泽开发中心",
        roundOutcomes: { 1: "passed" },
        internalNote: "内部备注",
        candidate: expect.objectContaining({
          name: "林同学",
          preferences: ["白泽开发中心", "新媒体中心"],
          baizeDirection: "鸿蒙开发",
        }),
      }),
    ]);
  });

  it("uses only the authoritative adjustment-target catalog for a production target absent from the roster", async () => {
    const store = useRecruitmentAssessmentStore();
    const api = gateway({
      getAssessmentBatch: vi.fn().mockResolvedValue({
        ...EMPTY_BATCH,
        items: [{
          applicationId: "application-1",
          person: { id: "person-1", name: "候选人", studentId: "20260003", grade: "2026", className: "软件三班" },
          acceptsAdjustment: true,
          baizeDirection: null,
          preferences: [{ rank: "FIRST", center: { id: "media", slug: "media", name: "新媒体中心" } }],
          roundResults: [],
          adjustmentProposal: null,
          adjustmentDecision: null,
          finalResult: null,
        }],
      }),
      getAdjustmentTargets: vi.fn().mockResolvedValue({
        items: [{ id: "innovation", slug: "innovation-lab", name: "创新实验室" }],
      }),
    });

    await store.refreshAssessmentBatch("batch-1", api);

    expect(store.getApiAdjustmentTargets("batch-1")).toEqual([
      { id: "innovation", slug: "innovation-lab", name: "创新实验室" },
    ]);
    expect(store.getApiAdjustmentTarget("batch-1", "innovation")).toEqual({
      id: "innovation",
      slug: "innovation-lab",
      name: "创新实验室",
    });
  });

  it("preserves proposal and decision target identities when production centers share the same display name", async () => {
    const store = useRecruitmentAssessmentStore();
    const api = gateway({
      getAssessmentBatch: vi.fn().mockResolvedValue({
        ...EMPTY_BATCH,
        items: [{
          applicationId: "application-identity",
          person: { id: "person-identity", name: "Identity Candidate", studentId: "20260004", grade: "2026", className: "Class Four" },
          acceptsAdjustment: true,
          baizeDirection: null,
          preferences: [{ rank: "FIRST", center: { id: "media", slug: "media", name: "New Media" } }],
          roundResults: [{ round: 1, outcome: "FAILED", internalNote: null, createdAt: "2026-08-07T09:00:00.000Z" }],
          adjustmentProposal: {
            targetCenter: { id: "target-proposal", slug: "proposal-center", name: "Shared Target" },
            createdAt: "2026-08-07T09:01:00.000Z",
          },
          adjustmentDecision: {
            decision: "ADMITTED",
            targetCenter: { id: "target-decision", slug: "decision-center", name: "Shared Target" },
            createdAt: "2026-08-07T09:02:00.000Z",
          },
          finalResult: null,
        }],
      }),
      getAdjustmentTargets: vi.fn().mockResolvedValue({
        items: [
          { id: "target-proposal", slug: "proposal-center", name: "Shared Target" },
          { id: "target-decision", slug: "decision-center", name: "Shared Target" },
        ],
      }),
    });

    await store.refreshAssessmentBatch("batch-identity", api);

    expect(store.getCandidate("batch-identity", "application-identity")).toMatchObject({
      adjustmentSuggestion: "Shared Target",
      adjustmentSuggestionIdentity: { id: "target-proposal", slug: "proposal-center", name: "Shared Target" },
      finalDecision: "admitted",
      finalCenter: "Shared Target",
      finalCenterIdentity: { id: "target-decision", slug: "decision-center", name: "Shared Target" },
    });
  });

  it("uses the authoritative version for a write and refreshes instead of mutating local fixtures", async () => {
    const batches = [
      EMPTY_BATCH,
      {
        ...EMPTY_BATCH,
        version: 4,
        items: [{
          applicationId: "application-1",
          person: { id: "person-1", name: "王同学", studentId: "20260002", grade: "2026", className: "软件二班" },
          acceptsAdjustment: false,
          baizeDirection: null,
          preferences: [{ rank: "FIRST" as const, center: { id: "media", slug: "media", name: "新媒体中心" } }],
          roundResults: [{ round: 1, outcome: "PASSED" as const, internalNote: null, createdAt: "2026-08-07T09:00:00.000Z" }],
          adjustmentProposal: null,
          adjustmentDecision: null,
          finalResult: null,
        }],
      },
    ];
    const recordRoundResult = vi.fn<RecruitmentGateway["recordRoundResult"]>().mockResolvedValue({
      version: 4,
      result: { round: 1, outcome: "PASSED", internalNote: null, createdAt: "2026-08-07T09:00:00.000Z" },
    });
    const api = gateway({
      getAssessmentBatch: vi.fn().mockImplementation(async () => batches.shift() ?? EMPTY_BATCH),
      recordRoundResult,
    });
    const store = useRecruitmentAssessmentStore();
    await store.refreshAssessmentBatch("batch-1", api);

    await store.saveRoundOutcomeFromApi(api, {
      batchId: "batch-1",
      candidateId: "application-1",
      round: 1,
      outcome: "passed",
      internalNote: "",
    });

    expect(recordRoundResult).toHaveBeenCalledWith("batch-1", "application-1", {
      expectedVersion: 3,
      round: 1,
      outcome: "PASSED",
      internalNote: "",
    });
    expect(store.getCandidate("batch-1", "application-1")).toMatchObject({
      roundOutcomes: { 1: "passed" },
      processingStatus: "ready-to-publish",
    });
  });

  it("keeps API failures visible and never restores Mock candidates", async () => {
    const store = useRecruitmentAssessmentStore();
    store.enableApiMode();
    const api = gateway({
      getAssessmentBatch: vi.fn().mockRejectedValue(new Error("NETWORK_DOWN")),
    });

    await expect(store.refreshAssessmentBatch("batch-current", api)).rejects.toThrow("NETWORK_DOWN");

    expect(store.apiErrorByBatch["batch-current"]).toBe("NETWORK_DOWN");
    expect(store.getCandidates("batch-current")).toEqual([]);
  });

  it("loads only the current account's published result projection", async () => {
    const store = useRecruitmentAssessmentStore();
    const api = gateway({
      getMyResults: vi.fn().mockResolvedValue({
        items: [{
          id: "result-1",
          batch: { id: "batch-1", name: "2026 秋季招新" },
          decision: "NOT_ADMITTED",
          finalCenter: null,
          admissionSource: null,
          baizeDirection: null,
          preferences: [{ rank: "FIRST", center: { id: "media", slug: "media", name: "新媒体中心" } }],
          publishedAt: "2026-08-07T09:00:00.000Z",
        }],
      }),
    });

    await store.refreshMyResults(api);

    expect(store.myResultsLoading).toBe(false);
    expect(store.myResultsError).toBeUndefined();
    expect(store.myResults).toEqual([
      expect.objectContaining({ id: "result-1", decision: "NOT_ADMITTED" }),
    ]);
  });

  it("routes adjustment, advance, and publication commands through authoritative versions", async () => {
    const proposeAdjustment = vi.fn<RecruitmentGateway["proposeAdjustment"]>().mockResolvedValue({
      version: 4,
      proposal: {
        targetCenter: { id: "media", slug: "media", name: "新媒体中心" },
        createdAt: "2026-08-07T09:00:00.000Z",
      },
    });
    const decideAdjustment = vi.fn<RecruitmentGateway["decideAdjustment"]>().mockResolvedValue({
      version: 5,
      decision: {
        decision: "ADMITTED",
        targetCenter: { id: "talent", slug: "talent", name: "人才发展中心" },
        createdAt: "2026-08-07T09:01:00.000Z",
      },
    });
    const advanceAssessment = vi.fn<RecruitmentGateway["advanceAssessment"]>().mockResolvedValue({
      currentRound: 2,
      status: "ASSESSING",
      version: 6,
      publishedAt: null,
    });
    const publishAssessment = vi.fn<RecruitmentGateway["publishAssessment"]>().mockResolvedValue({
      currentRound: 2,
      status: "PUBLISHED",
      version: 7,
      publishedAt: "2026-08-07T09:02:00.000Z",
      summary: { admitted: 1, notAdmitted: 0, total: 1 },
    });
    let version = 3;
    const api = gateway({
      getAssessmentBatch: vi.fn().mockImplementation(async () => ({ ...EMPTY_BATCH, version: version++ })),
      proposeAdjustment,
      decideAdjustment,
      advanceAssessment,
      publishAssessment,
    });
    const store = useRecruitmentAssessmentStore();
    await store.refreshAssessmentBatch("batch-1", api);

    await store.recordAdjustmentSuggestionFromApi(api, {
      batchId: "batch-1",
      candidateId: "application-1",
      targetCenterId: "media",
    });
    await store.recordAdjustmentDecisionFromApi(api, {
      batchId: "batch-1",
      candidateId: "application-1",
      decision: "ADMITTED",
      targetCenterId: "talent",
    });
    await store.advanceAssessmentRoundFromApi(api, "batch-1", "进入下一轮");
    await store.publishBatchResultsFromApi(api, "batch-1", "发布结果");

    expect(proposeAdjustment).toHaveBeenCalledWith("batch-1", "application-1", {
      expectedVersion: 3,
      targetCenterId: "media",
    });
    expect(decideAdjustment).toHaveBeenCalledWith("batch-1", "application-1", {
      expectedVersion: 4,
      decision: "ADMITTED",
      targetCenterId: "talent",
    });
    expect(advanceAssessment).toHaveBeenCalledWith("batch-1", {
      expectedVersion: 5,
      confirmed: true,
      reason: "进入下一轮",
    });
    expect(publishAssessment).toHaveBeenCalledWith("batch-1", {
      expectedVersion: 6,
      confirmed: true,
      reason: "发布结果",
    });
    expect(store.getBatchState("batch-1").version).toBe(7);
  });

  it("refreshes the authoritative round after advancing and keeps it on a later reload", async () => {
    let currentRound = 1;
    let version = 3;
    const advanceAssessment = vi.fn<RecruitmentGateway["advanceAssessment"]>().mockImplementation(async () => {
      currentRound = 2;
      version = 4;
      return { currentRound: 2, status: "ASSESSING", version, publishedAt: null };
    });
    const api = gateway({
      getAssessmentBatch: vi.fn().mockImplementation(async () => ({
        ...EMPTY_BATCH,
        currentRound,
        version,
        nextAction: "ADVANCE_ROUND" as const,
      })),
      advanceAssessment,
    });
    const store = useRecruitmentAssessmentStore();

    await store.refreshAssessmentBatch("batch-1", api);
    await store.advanceAssessmentRoundFromApi(api, "batch-1", "推进到第二轮");

    expect(advanceAssessment).toHaveBeenCalledWith("batch-1", {
      expectedVersion: 3,
      confirmed: true,
      reason: "推进到第二轮",
    });
    expect(store.getBatchState("batch-1")).toMatchObject({ currentRound: 2, version: 4 });

    await store.refreshAssessmentBatch("batch-1", api);
    expect(store.getBatchState("batch-1")).toMatchObject({ currentRound: 2, version: 4 });
  });

  it("exposes a pending mutation state until publication and its refresh complete", async () => {
    let releasePublication!: () => void;
    const publication = new Promise<void>((resolve) => { releasePublication = resolve; });
    const api = gateway({
      publishAssessment: vi.fn().mockImplementation(async () => {
        await publication;
        return {
          currentRound: 1,
          status: "PUBLISHED",
          version: 4,
          publishedAt: "2026-08-07T09:02:00.000Z",
          summary: { admitted: 0, notAdmitted: 0, total: 0 },
        };
      }),
    });
    const store = useRecruitmentAssessmentStore();
    await store.refreshAssessmentBatch("batch-1", api);

    const pending = store.publishBatchResultsFromApi(api, "batch-1", "发布结果");
    await Promise.resolve();
    expect(store.apiMutatingByBatch["batch-1"]).toBe(true);

    releasePublication();
    await pending;
    expect(store.apiMutatingByBatch["batch-1"]).toBe(false);
  });
});
