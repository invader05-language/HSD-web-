import { describe, expect, it } from "vitest";
import { matchesAssessmentStage } from "../../app/utils/recruitment-assessment-filters";

describe("recruitment assessment stage filters", () => {
  it("treats the current todo as the current editable round plus pending adjustments", () => {
    expect(matchesAssessmentStage("当前待办", {
      processingStatus: "assessing",
      currentPhase: "第一轮考核",
    }, "第一轮考核")).toBe(true);
    expect(matchesAssessmentStage("当前待办", {
      processingStatus: "adjustment-suggestion-pending",
      currentPhase: undefined,
    }, "第一轮考核")).toBe(true);
    expect(matchesAssessmentStage("当前待办", {
      processingStatus: "assessing",
      currentPhase: undefined,
    }, "第一轮考核")).toBe(false);
    expect(matchesAssessmentStage("待调剂", {
      processingStatus: "adjustment-suggestion-pending",
      currentPhase: undefined,
    }, "第一轮考核")).toBe(true);
  });
});
