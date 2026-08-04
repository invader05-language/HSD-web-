import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  RECRUITMENT_ASSESSMENT_STORAGE_KEY,
  useRecruitmentAssessmentStore,
} from "../../app/stores/recruitment-assessment";
import type { SubmittedRecruitmentApplication } from "../../app/data/recruitment-application";
import { useRecruitmentApplicationStore } from "../../app/stores/recruitment-application";
import { useRecruitmentBatchStore } from "../../app/stores/recruitment-batch";
import { useSessionStore } from "../../app/stores/session";
import { useMemberProfileStore } from "../../app/stores/member-profile";

const BATCH_ID = "batch-current";

function signInOwner() {
  const session = useSessionStore();
  const result = session.signIn("admin-alliance", { requireAdmin: true });
  expect(result.status).toBe("success");
}

function saveFirstRoundForActiveCandidates(
  store: ReturnType<typeof useRecruitmentAssessmentStore>,
  rejectCandidatesWithoutAccounts = false,
) {
  for (const candidate of store.getCandidates(BATCH_ID)) {
    if (candidate.currentPhase !== "第一轮考核" || candidate.processingStatus !== "assessing") continue;
    store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: candidate.candidateId,
      round: 1,
      outcome: rejectCandidatesWithoutAccounts
        && ["candidate-zhou", "candidate-zhang"].includes(candidate.candidateId)
        ? "failed"
        : "passed",
      now: new Date("2026-08-04T10:00:00.000Z"),
    });
  }
}

function saveCurrentRoundForActiveCandidates(store: ReturnType<typeof useRecruitmentAssessmentStore>) {
  const round = store.currentRound(BATCH_ID);
  for (const candidate of store.getCandidates(BATCH_ID)) {
    if (!candidate.currentPhase || candidate.processingStatus !== "assessing") continue;
    store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: candidate.candidateId,
      round,
      outcome: "passed",
      now: new Date("2026-08-04T10:11:00.000Z"),
    });
  }
}

function application(
  overrides: Partial<SubmittedRecruitmentApplication> = {},
): SubmittedRecruitmentApplication {
  return {
    id: "application-late",
    batchId: BATCH_ID,
    memberId: "applicant-late",
    batchVersionAtSubmission: 1,
    batchNameSnapshot: "2026 秋季招新",
    applicantProfileSnapshot: {
      name: "新报名同学",
      studentId: "20269999",
      grade: "2026 级",
      className: "软件工程 9 班",
      bio: "来自报名快照",
    },
    contact: "late@example.com",
    firstChoice: "人才发展中心",
    secondChoice: "新媒体中心",
    preferences: [
      { rank: 1, center: "人才发展中心" },
      { rank: 2, center: "新媒体中心" },
    ],
    centerConfigurationSnapshot: [
      {
        center: "人才发展中心",
        availableAtSubmission: true,
        currentlyAvailable: true,
      },
    ],
    acceptsAdjustment: false,
    status: "submitted",
    submittedAt: "2026-08-04T09:00:00.000Z",
    updatedAt: "2026-08-04T09:00:00.000Z",
    ...overrides,
  };
}

describe("recruitment assessment store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("binds every candidate to the batch global round and keeps save separate from publication", () => {
    signInOwner();
    const store = useRecruitmentAssessmentStore();
    const candidate = store.getCandidate(BATCH_ID, "candidate-wang");

    expect(store.getBatchState(BATCH_ID)).toMatchObject({ currentRound: 1, status: "assessing" });
    expect(candidate).toMatchObject({ currentPhase: "第一轮考核", processingStatus: "assessing" });

    store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: "candidate-wang",
      round: 1,
      outcome: "passed",
      internalNote: "第一轮通过",
      now: new Date("2026-08-04T10:00:00.000Z"),
    });

    expect(store.getCandidate(BATCH_ID, "candidate-wang")).toMatchObject({
      roundOutcomes: { 1: "passed" },
      finalDecision: "admitted",
      finalCenter: "新媒体中心",
      internalNote: "第一轮通过",
      processingStatus: "ready-to-publish",
    });
    expect(store.getCandidate(BATCH_ID, "candidate-wang")?.publishedAt).toBeUndefined();
  });

  it("reconciles late applications by batch and prioritizes their submitted snapshot", () => {
    signInOwner();
    const assessmentStore = useRecruitmentAssessmentStore();
    const applicationStore = useRecruitmentApplicationStore();

    assessmentStore.getCandidates(BATCH_ID);
    applicationStore.replaceApplications([
      application(),
      application({
        id: "application-wang",
        memberId: "applicant-wang",
        applicantProfileSnapshot: {
          name: "王同学（报名快照）",
          studentId: "20260004",
          grade: "2026 级",
          className: "新闻传播学 2 班",
        },
        firstChoice: "人才发展中心",
        preferences: [{ rank: 1, center: "人才发展中心" }],
        acceptsAdjustment: false,
      }),
      application({
        id: "application-next-batch",
        batchId: "batch-next",
        memberId: "applicant-next",
      }),
    ]);

    expect(assessmentStore.getCandidate(BATCH_ID, "application-late")).toMatchObject({
      batchId: BATCH_ID,
      memberId: "applicant-late",
      center: "人才发展中心",
      acceptsAdjustment: false,
      candidate: {
        name: "新报名同学",
        preferences: ["人才发展中心", "新媒体中心"],
      },
    });
    expect(assessmentStore.getCandidate(BATCH_ID, "candidate-wang")).toMatchObject({
      center: "人才发展中心",
      acceptsAdjustment: false,
      candidate: {
        name: "王同学（报名快照）",
        className: "新闻传播学 2 班",
        preferences: ["人才发展中心"],
      },
    });
    expect(assessmentStore.getCandidate(BATCH_ID, "application-next-batch")).toBeUndefined();
  });

  it("allows assessment after registration closes while keeping draft and archived batches read-only", () => {
    signInOwner();
    const store = useRecruitmentAssessmentStore();
    const batch = useRecruitmentBatchStore().getBatchOrThrow(BATCH_ID);
    store.getCandidates(BATCH_ID);

    batch.lifecycleStatus = "closed";
    batch.manualOverride = "force-closed";
    batch.version += 1;
    store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: "candidate-wang",
      round: 1,
      outcome: "passed",
      now: new Date("2026-09-19T10:00:00.000Z"),
    });
    expect(store.getCandidate(BATCH_ID, "candidate-wang")?.roundOutcomes[1]).toBe("passed");

    batch.lifecycleStatus = "draft";
    batch.version += 1;
    expect(() => store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: "candidate-zhang",
      round: 1,
      outcome: "failed",
      now: new Date("2026-09-19T10:01:00.000Z"),
    })).toThrow("ASSESSMENT_BATCH_DRAFT_READ_ONLY");

    batch.lifecycleStatus = "archived";
    batch.version += 1;
    expect(() => store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: "candidate-zhang",
      round: 1,
      outcome: "failed",
      now: new Date("2026-09-19T10:02:00.000Z"),
    })).toThrow("ASSESSMENT_BATCH_ARCHIVED_READ_ONLY");
    expect(store.getCandidate(BATCH_ID, "candidate-zhang")?.roundOutcomes[1]).toBeUndefined();
  });

  it("routes a failed accepted-adjustment candidate to offline input", () => {
    signInOwner();
    const store = useRecruitmentAssessmentStore();

    store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: "candidate-chen",
      round: 1,
      outcome: "failed",
      now: new Date("2026-08-04T10:00:00.000Z"),
    });
    expect(store.getCandidate(BATCH_ID, "candidate-chen")).toMatchObject({
      processingStatus: "offline-adjustment-pending",
    });

    store.recordAdjustmentDecision({
      batchId: BATCH_ID,
      candidateId: "candidate-chen",
      finalCenter: "新媒体中心",
      admitted: true,
      now: new Date("2026-08-04T10:05:00.000Z"),
    });
    expect(store.getCandidate(BATCH_ID, "candidate-chen")).toMatchObject({
      finalDecision: "admitted",
      finalCenter: "新媒体中心",
      processingStatus: "ready-to-publish",
    });
  });

  it("rejects an adjustment decision unless the candidate is awaiting offline adjustment", () => {
    signInOwner();
    const store = useRecruitmentAssessmentStore();

    expect(() => store.recordAdjustmentDecision({
      batchId: BATCH_ID,
      candidateId: "candidate-wang",
      finalCenter: "人才发展中心",
      admitted: true,
      now: new Date("2026-08-04T10:05:00.000Z"),
    })).toThrow("ASSESSMENT_ADJUSTMENT_NOT_PENDING");
    expect(store.getCandidate(BATCH_ID, "candidate-wang")?.finalDecision).toBeUndefined();
  });

  it("keeps a White Ze later-round failure out of admission", () => {
    signInOwner();
    const store = useRecruitmentAssessmentStore();

    saveFirstRoundForActiveCandidates(store);
    store.advanceAssessmentRound(BATCH_ID, true, new Date("2026-08-04T10:00:00.000Z"));
    store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: "candidate-zhou",
      round: 2,
      outcome: "failed",
      now: new Date("2026-08-04T10:01:00.000Z"),
    });

    expect(store.getCandidate(BATCH_ID, "candidate-zhou")).toMatchObject({
      finalDecision: "not-admitted",
      processingStatus: "ready-to-publish",
    });
  });

  it("rejects editing a White Ze later round before the global round advances", () => {
    signInOwner();
    const store = useRecruitmentAssessmentStore();

    expect(() => store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: "candidate-lin",
      round: 2,
      outcome: "passed",
      now: new Date("2026-08-04T10:00:00.000Z"),
    })).toThrow("ASSESSMENT_ROUND_NOT_CURRENT");
  });

  it("advances the global round only after the current round is saved", () => {
    signInOwner();
    const store = useRecruitmentAssessmentStore();
    saveFirstRoundForActiveCandidates(store);

    expect(() => store.advanceAssessmentRound(BATCH_ID, false, new Date("2026-08-04T10:10:00.000Z")))
      .toThrow("CONFIRMATION_REQUIRED");
    store.advanceAssessmentRound(BATCH_ID, true, new Date("2026-08-04T10:10:00.000Z"));

    expect(store.getBatchState(BATCH_ID)).toMatchObject({ currentRound: 2, status: "assessing" });
    expect(store.getCandidate(BATCH_ID, "candidate-lin")).toMatchObject({
      currentPhase: "第二轮考核",
      processingStatus: "assessing",
    });
  });

  it("keeps an admitted outcome intact and blocks whole-batch publication when its account cannot be reused", () => {
    signInOwner();
    const store = useRecruitmentAssessmentStore();
    const profileStore = useMemberProfileStore();

    saveFirstRoundForActiveCandidates(store);
    store.advanceAssessmentRound(BATCH_ID, true, new Date("2026-08-04T10:10:00.000Z"));
    saveCurrentRoundForActiveCandidates(store);
    store.advanceAssessmentRound(BATCH_ID, true, new Date("2026-08-04T10:12:00.000Z"));
    saveCurrentRoundForActiveCandidates(store);
    store.advanceAssessmentRound(BATCH_ID, true, new Date("2026-08-04T10:13:00.000Z"));

    expect(store.getCandidate(BATCH_ID, "candidate-zhou")).toMatchObject({
      finalDecision: "admitted",
      finalCenter: "白泽开发中心",
      processingStatus: "ready-to-publish",
    });
    const profileSnapshot = JSON.parse(JSON.stringify(profileStore.profiles));

    expect(() => store.publishBatchResults(
      BATCH_ID,
      true,
      new Date("2026-08-04T10:20:00.000Z"),
    )).toThrow("ASSESSMENT_ACCOUNT_NOT_FOUND");
    expect(store.getBatchState(BATCH_ID).status).toBe("ready-to-publish");
    expect(store.getCandidate(BATCH_ID, "candidate-zhou")?.publishedAt).toBeUndefined();
    expect(profileStore.profiles).toEqual(profileSnapshot);
  });

  it("does not publish until the whole batch is complete, then promotes the linked account atomically", () => {
    signInOwner();
    const store = useRecruitmentAssessmentStore();

    expect(() => store.publishBatchResults(BATCH_ID, true, new Date("2026-08-04T10:00:00.000Z")))
      .toThrow("ASSESSMENT_NOT_READY");

    store.saveRoundOutcome({
      batchId: BATCH_ID,
      candidateId: "candidate-chen",
      round: 1,
      outcome: "failed",
      now: new Date("2026-08-04T10:00:00.000Z"),
    });
    store.recordAdjustmentDecision({
      batchId: BATCH_ID,
      candidateId: "candidate-chen",
      finalCenter: "新媒体中心",
      admitted: true,
      now: new Date("2026-08-04T10:01:00.000Z"),
    });
    saveFirstRoundForActiveCandidates(store, true);
    store.advanceAssessmentRound(BATCH_ID, true, new Date("2026-08-04T10:10:00.000Z"));
    saveCurrentRoundForActiveCandidates(store);
    store.advanceAssessmentRound(BATCH_ID, true, new Date("2026-08-04T10:12:00.000Z"));
    saveCurrentRoundForActiveCandidates(store);
    store.advanceAssessmentRound(BATCH_ID, true, new Date("2026-08-04T10:13:00.000Z"));

    store.publishBatchResults(BATCH_ID, true, new Date("2026-08-04T10:20:00.000Z"));

    expect(store.getBatchState(BATCH_ID)).toMatchObject({ status: "published" });
    expect(store.getCandidate(BATCH_ID, "candidate-chen")).toMatchObject({
      processingStatus: "completed",
      publishedAt: "2026-08-04T10:20:00.000Z",
    });
    const profileStore = useMemberProfileStore();
    expect(profileStore.profiles["member-chen"]).toMatchObject({
      identity: "正式成员",
      center: "新媒体中心",
    });
  });

  it("discards persisted state with cross-batch identities or malformed round outcomes", () => {
    const validState = {
      batchId: BATCH_ID,
      batchVersion: 1,
      version: 2,
      currentRound: 1,
      status: "assessing",
      records: [{
        batchId: BATCH_ID,
        candidateId: "persisted-candidate",
        memberId: "persisted-member",
        center: "新媒体中心",
        acceptsAdjustment: false,
        roundOutcomes: { 1: "passed" },
      }],
      auditRecords: [],
    };
    const malformedStates = [
      { wrongStorageKey: validState },
      { [BATCH_ID]: { ...validState, batchId: "batch-next" } },
      {
        [BATCH_ID]: {
          ...validState,
          records: [{ ...validState.records[0], batchId: "batch-next" }],
        },
      },
      {
        [BATCH_ID]: {
          ...validState,
          records: [{ ...validState.records[0], roundOutcomes: { 4: "passed" } }],
        },
      },
      {
        [BATCH_ID]: {
          ...validState,
          records: [{ ...validState.records[0], roundOutcomes: { 1: "approved" } }],
        },
      },
    ];

    for (const batches of malformedStates) {
      localStorage.setItem(RECRUITMENT_ASSESSMENT_STORAGE_KEY, JSON.stringify({
        version: 1,
        batches,
      }));
      setActivePinia(createPinia());
      const store = useRecruitmentAssessmentStore();

      expect(Object.keys(store.batches)).toEqual([]);
      expect(store.getCandidates(BATCH_ID).some((candidate) => (
        candidate.candidateId === "persisted-candidate"
      ))).toBe(false);
    }
  });
});
