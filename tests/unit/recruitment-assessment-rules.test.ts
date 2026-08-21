import { describe, expect, it } from "vitest";
import type { RecruitmentAssessmentRecord } from "../../app/types/recruitment-assessment";
import {
  ADMIN_CANDIDATES,
  getAdminCandidateAssessmentRecord,
} from "../../app/data/recruitment-admin";
import {
  getAssessmentProcessingStatus,
  getAssessmentRounds,
  getCurrentAssessmentRound,
  isAssessmentRoundEditable,
} from "../../app/utils/recruitment-assessment-rules";

function record(
  overrides: Partial<RecruitmentAssessmentRecord> = {},
): RecruitmentAssessmentRecord {
  return {
    batchId: "batch-current",
    candidateId: "candidate-lin",
    memberId: "applicant-chen",
    center: "白泽开发中心",
    acceptsAdjustment: true,
    roundOutcomes: {},
    ...overrides,
  };
}

describe("recruitment assessment round rules", () => {
  it("uses one round for regular centers and three rounds for Bai Ze", () => {
    expect(getAssessmentRounds("新媒体中心")).toEqual([1]);
    expect(getAssessmentRounds("拓维策划中心")).toEqual([1]);
    expect(getAssessmentRounds("人才发展中心")).toEqual([1]);
    expect(getAssessmentRounds("白泽开发中心")).toEqual([1, 2, 3]);
  });

  it("only exposes the global round after Bai Ze passes every preceding round", () => {
    const candidate = record({
      roundOutcomes: { 1: "passed" },
    });

    expect(getCurrentAssessmentRound(candidate, 1)).toBeUndefined();
    expect(getCurrentAssessmentRound(candidate, 2)).toBe(2);
    expect(isAssessmentRoundEditable(candidate, 1, 2)).toBe(false);
    expect(isAssessmentRoundEditable(candidate, 2, 2)).toBe(true);
    expect(isAssessmentRoundEditable(candidate, 3, 2)).toBe(false);
  });

  it("does not expose a regular-center candidate after the batch advances past round one", () => {
    const candidate = record({
      center: "新媒体中心",
    });

    expect(getCurrentAssessmentRound(candidate, 1)).toBe(1);
    expect(getCurrentAssessmentRound(candidate, 2)).toBeUndefined();
    expect(isAssessmentRoundEditable(candidate, 1, 2)).toBe(false);
  });

  it("routes failed candidates to offline adjustment only when they accept it", () => {
    expect(getAssessmentProcessingStatus(record({
      roundOutcomes: { 1: "failed" },
      acceptsAdjustment: true,
    }))).toBe("adjustment-suggestion-pending");

    expect(getAssessmentProcessingStatus(record({
      roundOutcomes: { 1: "failed" },
      acceptsAdjustment: false,
    }))).toBe("ready-to-publish");
  });

  it("locks completed records and marks them as completed", () => {
    const candidate = record({
      roundOutcomes: { 1: "passed", 2: "passed", 3: "passed" },
      finalDecision: "admitted",
      publishedAt: "2026-08-04T10:00:00.000Z",
    });

    expect(getCurrentAssessmentRound(candidate, 3)).toBeUndefined();
    expect(isAssessmentRoundEditable(candidate, 3, 3)).toBe(false);
    expect(getAssessmentProcessingStatus(candidate)).toBe("completed");
  });

  it("adapts legacy admin candidates into batch and member scoped assessment records", () => {
    const candidate = ADMIN_CANDIDATES.find((item) => item.id === "candidate-lin");
    expect(candidate).toBeDefined();

    expect(getAdminCandidateAssessmentRecord(candidate!)).toMatchObject({
      batchId: "batch-current",
      candidateId: "candidate-lin",
      memberId: "member-lin",
      center: "白泽开发中心",
      roundOutcomes: { 1: "passed", 2: "pending", 3: "pending" },
    });
  });
});
