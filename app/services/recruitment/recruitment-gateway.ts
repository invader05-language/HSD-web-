import type {
  AdvanceAssessmentDto,
  AssessmentBatchResponseDto,
  AssessmentAdjustmentTargetCatalogResponseDto,
  AssessmentBatchStateResponseDto,
  AssessmentDecisionMutationResponseDto,
  AssessmentProposalMutationResponseDto,
  AssessmentPublicationResponseDto,
  AssessmentRoundMutationResponseDto,
  CreateAdjustmentProposalDto,
  DecideAdjustmentDto,
  MyRecruitmentResultListDto,
  PublishAssessmentDto,
  RecordRoundResultDto,
} from "../../../packages/api-client/src";

export interface RecruitmentGateway {
  getAssessmentBatch(batchId: string): Promise<AssessmentBatchResponseDto>;
  getAdjustmentTargets(batchId: string): Promise<AssessmentAdjustmentTargetCatalogResponseDto>;
  recordRoundResult(
    batchId: string,
    applicationId: string,
    payload: RecordRoundResultDto,
  ): Promise<AssessmentRoundMutationResponseDto>;
  proposeAdjustment(
    batchId: string,
    applicationId: string,
    payload: CreateAdjustmentProposalDto,
  ): Promise<AssessmentProposalMutationResponseDto>;
  decideAdjustment(
    batchId: string,
    applicationId: string,
    payload: DecideAdjustmentDto,
  ): Promise<AssessmentDecisionMutationResponseDto>;
  advanceAssessment(
    batchId: string,
    payload: AdvanceAssessmentDto,
  ): Promise<AssessmentBatchStateResponseDto>;
  publishAssessment(
    batchId: string,
    payload: PublishAssessmentDto,
  ): Promise<AssessmentPublicationResponseDto>;
  getMyResults(): Promise<MyRecruitmentResultListDto>;
  getMyResponsibleContact(resultId: string, personId: string): Promise<{ personId: string; contact: string }>;
}
