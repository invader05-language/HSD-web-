import type { AssessmentProcessingStatus } from "../types/recruitment-assessment";

export type AssessmentStageFilter = "当前待办" | "待调剂" | "已处理/历史结果" | "全部成员";

export interface AssessmentStageCandidate {
  processingStatus: AssessmentProcessingStatus;
  currentPhase?: string;
}

/**
 * Keeps the default work queue focused on actions available at the global
 * round. Candidates who passed the current round but are waiting for a global
 * advance stay hidden until that round becomes editable; pending adjustments
 * remain visible because they are still actionable work.
 */
export function matchesAssessmentStage(
  stage: AssessmentStageFilter,
  candidate: AssessmentStageCandidate,
  currentRoundLabel: string,
): boolean {
  if (stage === "全部成员") return true;
  if (stage === "待调剂") return candidate.processingStatus === "adjustment-suggestion-pending";
  if (stage === "当前待办") {
    return candidate.processingStatus === "adjustment-suggestion-pending"
      || (candidate.processingStatus === "assessing" && candidate.currentPhase === currentRoundLabel);
  }
  return candidate.processingStatus !== "assessing"
    && candidate.processingStatus !== "adjustment-suggestion-pending";
}
