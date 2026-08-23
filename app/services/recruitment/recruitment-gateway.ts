import type {
  AdvanceAssessmentDto,
  ArchiveRecruitmentBatchPayload,
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
  AdminRecruitmentApplicationDto,
  AdminRecruitmentApplicationListDto,
  AdminRecruitmentBatchDto,
  AdminRecruitmentBatchListDto,
  CreateRecruitmentBatchDto,
  MemberProfileResponseDto,
  MyRecruitmentApplicationEnvelopeDto,
  MyRecruitmentApplicationResponseDto,
  PublicRecruitmentBatchEnvelopeDto,
  RecruitmentBatchCommandDto,
  RecruitmentBatchLifecycleEventListDto,
  SubmitApplicationDto,
  UpdateApplicationDto,
  UpdateMyProfileDto,
  UpdateRecruitmentBatchDto,
  WithdrawApplicationDto,
} from "../../../packages/api-client/src";

export interface RecruitmentGateway {
  getCurrentBatch(): Promise<PublicRecruitmentBatchEnvelopeDto>;
  getUpcomingBatch(): Promise<PublicRecruitmentBatchEnvelopeDto>;
  getCurrentProfile(): Promise<MemberProfileResponseDto>;
  updateCurrentProfile(payload: UpdateMyProfileDto): Promise<MemberProfileResponseDto>;
  getMyApplication(batchId: string): Promise<MyRecruitmentApplicationEnvelopeDto>;
  submitApplication(batchId: string, payload: SubmitApplicationDto): Promise<MyRecruitmentApplicationResponseDto>;
  updateApplication(batchId: string, applicationId: string, payload: UpdateApplicationDto): Promise<MyRecruitmentApplicationResponseDto>;
  withdrawApplication(batchId: string, applicationId: string, payload: WithdrawApplicationDto): Promise<MyRecruitmentApplicationResponseDto>;
  listAdminBatches(page?: number, pageSize?: number): Promise<AdminRecruitmentBatchListDto>;
  getAdminBatch(batchId: string): Promise<AdminRecruitmentBatchDto>;
  createAdminBatch(payload: CreateRecruitmentBatchDto): Promise<AdminRecruitmentBatchDto>;
  updateAdminBatch(batchId: string, payload: UpdateRecruitmentBatchDto): Promise<AdminRecruitmentBatchDto>;
  listAdminBatchLifecycleEvents(batchId: string, page?: number, pageSize?: number): Promise<RecruitmentBatchLifecycleEventListDto>;
  runAdminBatchCommand(batchId: string, command: "publish" | "open-now" | "pause" | "resume" | "close" | "reopen", payload: RecruitmentBatchCommandDto): Promise<AdminRecruitmentBatchDto>;
  archiveAdminBatch(batchId: string, payload: ArchiveRecruitmentBatchPayload): Promise<AdminRecruitmentBatchDto>;
  listAdminApplications(batchId: string, query?: string): Promise<AdminRecruitmentApplicationListDto>;
  getAdminApplication(batchId: string, applicationId: string): Promise<AdminRecruitmentApplicationDto>;
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
