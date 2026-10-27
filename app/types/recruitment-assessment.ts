import type { RecruitmentCenter } from "../data/recruitment-application";
import type { AssessmentTransferDto, AssessmentTransferEligibilityDto, RecruitmentOriginalRoundResultDto } from '../../packages/api-client/src';
import type { BaizeDirectionCode } from '../utils/baize-direction-label';

export type AssessmentRoundNumber = 1 | 2 | 3;

export type AssessmentOutcome = "pending" | "passed" | "failed";

export type AssessmentFinalDecision = "admitted" | "not-admitted";

export interface AssessmentCenterIdentity {
  id: string;
  slug: string;
  name: string;
}

export type AssessmentProcessingStatus =
  | "assessing"
  | "adjustment-suggestion-pending"
  | "ready-to-publish"
  | "completed";

export type AdjustmentDestination = Exclude<RecruitmentCenter, "白泽开发中心">;

export interface RecruitmentAssessmentRecord {
  batchId: string;
  candidateId: string;
  memberId: string;
  center: RecruitmentCenter;
  assessmentCenter?: AssessmentCenterIdentity;
  entryRound?: AssessmentRoundNumber;
  transfer?: AssessmentTransferDto;
  transferEligibility?: AssessmentTransferEligibilityDto;
  baizeDirectionCode?: BaizeDirectionCode;
  finalBaizeDirection?: BaizeDirectionCode | null;
  originalRoundResult?: RecruitmentOriginalRoundResultDto;
  acceptsAdjustment: boolean;
  roundOutcomes: Partial<Record<AssessmentRoundNumber, AssessmentOutcome>>;
  finalDecision?: AssessmentFinalDecision;
  finalCenter?: RecruitmentCenter;
  finalCenterIdentity?: AssessmentCenterIdentity;
  adjustmentSuggestion?: AdjustmentDestination;
  adjustmentSuggestionIdentity?: AssessmentCenterIdentity;
  internalNote?: string;
  updatedAt?: string;
  publishedAt?: string;
}
