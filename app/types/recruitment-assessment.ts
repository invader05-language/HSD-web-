import type { RecruitmentCenter } from "../data/recruitment-application";

export type AssessmentRoundNumber = 1 | 2 | 3;

export type AssessmentOutcome = "pending" | "passed" | "failed";

export type AssessmentFinalDecision = "admitted" | "not-admitted";

export type AssessmentProcessingStatus =
  | "assessing"
  | "offline-adjustment-pending"
  | "ready-to-publish"
  | "completed";

export interface RecruitmentAssessmentRecord {
  batchId: string;
  candidateId: string;
  memberId: string;
  center: RecruitmentCenter;
  acceptsAdjustment: boolean;
  roundOutcomes: Partial<Record<AssessmentRoundNumber, AssessmentOutcome>>;
  finalDecision?: AssessmentFinalDecision;
  finalCenter?: RecruitmentCenter;
  internalNote?: string;
  updatedAt?: string;
  publishedAt?: string;
}
