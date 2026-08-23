import {
  API_OPERATIONS,
  API_V1_PATHS,
  isApiResponse,
  type ApiOperation,
  type ApiResponseFor,
  type ApiV1Path,
  type CreateManagedMemberDto,
  type CreateMembershipDto,
  type CreateContentDto,
  type UpdateContentDto,
  type ContentCommandDto,
  type ReasonedContentCommandDto,
  type PublishContentDto,
  type CreateUploadIntentDto,
  type CompleteUploadDto,
  type CreateMediaAttachmentDto,
  type UpdateMediaAttachmentDto,
  type CreateProjectDto,
  type UpdateProjectDto,
  type ProjectCommandDto,
  type ProjectOfflineDto,
  type CreateActivityDto,
  type UpdateActivityDto,
  type ActivityCommandDto,
  type ActivityOfflineDto,
  type AppointOrganizationPositionDto,
  type CreateGalleryDto,
  type UpdateGalleryDto,
  type GalleryCommandDto,
  type GalleryOfflineDto,
  type CreateResourceDto,
  type CreateResourceVersionDto,
  type ResourceCommandDto,
  type ResourceOfflineDto,
  type CreateRegistrationDto,
  type RegistrationCommandDto,
  type DecideRegistrationDto,
  type LoginDto,
  type PreparatoryMemberImportDto,
  type PublishPortalConfigurationDto,
  type PromoteManagedMemberDto,
  type RetireMembershipDto,
  type SavePortalConfigurationDto,
  type UpdateMembershipDto,
  type CreateHonorDto,
  type UpdateHonorConsentDto,
  type HonorCommandDto,
  type CreateGrowthRecordDto,
  type UpdateGrowthRecordDto,
  type DeleteGrowthRecordDto,
  type CreateHelpDto,
  type UpdateHelpDraftDto,
  type PublishHelpDto,
  type RecycleCommandDto,
  type HardDeleteRecycleDto,
  type HandoverCenterMinisterDto,
  type RevokeOrganizationPositionDto,
  type SetCoreMembershipDto,
  type CreateRecruitmentBatchDto,
  type RecruitmentBatchCommandDto,
  type SubmitApplicationDto,
  type UpdateApplicationDto,
  type UpdateMyProfileDto,
  type UpdateRecruitmentBatchDto,
  type WithdrawApplicationDto,
} from "./generated";

/** The dashboard endpoint is intentionally ungenerated until the M5 server contract exists in Swagger. */
export const ADMIN_DASHBOARD_PATH = "/api/v1/admin/dashboard" as const;

export interface ApiRequest {
  path: ApiV1Path | typeof ADMIN_DASHBOARD_PATH | `/api/v1/${string}`;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

export type ApiTransport = (request: ApiRequest) => Promise<unknown>;

async function requestGenerated<TOperation extends ApiOperation>(
  transport: ApiTransport,
  operation: TOperation,
  body?: unknown,
  path: ApiRequest["path"] = API_OPERATIONS[operation].path,
): Promise<ApiResponseFor<TOperation>> {
  const request = API_OPERATIONS[operation];
  const response = await transport({
    path,
    method: request.method,
    ...(body === undefined ? {} : { body }),
  });
  if (!isApiResponse(operation, response)) {
    throw new Error(`API_RESPONSE_CONTRACT_MISMATCH:${operation}`);
  }
  return response;
}

export interface HsdApiClient {
  auth: {
    login(payload: LoginDto): Promise<ApiResponseFor<"POST /api/v1/auth/login">>;
    currentSession(): Promise<ApiResponseFor<"GET /api/v1/auth/session">>;
  };
  members: {
    currentProfile(): Promise<ApiResponseFor<"GET /api/v1/members/me">>;
    updateCurrentProfile(payload: UpdateMyProfileDto): Promise<ApiResponseFor<"PATCH /api/v1/members/me">>;
    managed(): Promise<ApiResponseFor<"GET /api/v1/admin/members">>;
    createManaged(payload: CreateManagedMemberDto): Promise<ApiResponseFor<"POST /api/v1/admin/members">>;
    promoteManaged(personId: string, payload: PromoteManagedMemberDto): Promise<ApiResponseFor<"POST /api/v1/admin/members/{personId}/promote">>;
    submitHonor(payload: CreateHonorDto): Promise<ApiResponseFor<"POST /api/v1/members/me/honors">>;
    honors(): Promise<ApiResponseFor<"GET /api/v1/members/me/honors">>;
    updateHonorConsent(id: string, payload: UpdateHonorConsentDto): Promise<ApiResponseFor<"PATCH /api/v1/members/me/honors/{id}/consent">>;
    growthRecords(): Promise<ApiResponseFor<"GET /api/v1/members/me/growth-records">>;
    growthRecord(id: string): Promise<ApiResponseFor<"GET /api/v1/members/me/growth-records/{id}">>;
    createGrowthRecord(payload: CreateGrowthRecordDto): Promise<ApiResponseFor<"POST /api/v1/members/me/growth-records">>;
    updateGrowthRecord(id: string, payload: UpdateGrowthRecordDto): Promise<ApiResponseFor<"PATCH /api/v1/members/me/growth-records/{id}">>;
    deleteGrowthRecord(id: string, payload: DeleteGrowthRecordDto): Promise<ApiResponseFor<"DELETE /api/v1/members/me/growth-records/{id}">>;
  };
  publicMembers: {
    list(): Promise<ApiResponseFor<"GET /api/v1/public/members">>;
    detail(publicId: string): Promise<ApiResponseFor<"GET /api/v1/public/members/{publicId}">>;
  };
  honors: {
    listAdmin(): Promise<ApiResponseFor<"GET /api/v1/admin/honors">>;
    approve(id: string, payload: HonorCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/honors/{id}/approve">>;
  };
  organization: {
    publicCenters(): Promise<ApiResponseFor<"GET /api/v1/public/centers">>;
    publicCenter(publicSlug: string): Promise<ApiResponseFor<"GET /api/v1/public/centers/{publicSlug}">>;
    centers(): Promise<ApiResponseFor<"GET /api/v1/admin/organization/centers">>;
    createMembership(payload: CreateMembershipDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/memberships">>;
    updateMembership(personId: string, payload: UpdateMembershipDto): Promise<ApiResponseFor<"PATCH /api/v1/admin/organization/memberships/{personId}">>;
    retireMembership(personId: string, payload: RetireMembershipDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/memberships/{personId}/retire">>;
    appointAllianceOwner(personId: string, payload: AppointOrganizationPositionDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/positions/alliance-owners/{personId}">>;
    revokeAllianceOwner(personId: string, payload: RevokeOrganizationPositionDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/positions/alliance-owners/{personId}/revoke">>;
    appointCenterMinister(centerId: string, personId: string, payload: AppointOrganizationPositionDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}">>;
    revokeCenterMinister(centerId: string, personId: string, payload: RevokeOrganizationPositionDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}/revoke">>;
    handoverCenterMinister(centerId: string, outgoingPersonId: string, incomingPersonId: string, payload: HandoverCenterMinisterDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{outgoingPersonId}/handover/{incomingPersonId}">>;
    setCoreMembership(personId: string, payload: SetCoreMembershipDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/positions/core-members/{personId}">>;
    grantProjectLead(projectId: string, personId: string, payload: AppointOrganizationPositionDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}">>;
    revokeProjectLead(projectId: string, personId: string, payload: RevokeOrganizationPositionDto): Promise<ApiResponseFor<"POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}/revoke">>;
  };
  homepage: {
    stats(): Promise<ApiResponseFor<"GET /api/v1/public/homepage/stats">>;
  };
  adminAccess: {
    accounts(): Promise<ApiResponseFor<"GET /api/v1/admin/accounts">>;
  };
  imports: {
    dryRun(payload: PreparatoryMemberImportDto): Promise<ApiResponseFor<"POST /api/v1/admin/imports/preparatory-members/dry-run">>;
    commit(payload: PreparatoryMemberImportDto): Promise<ApiResponseFor<"POST /api/v1/admin/imports/preparatory-members/commit">>;
  };
  recruitment: {
    currentBatch(): Promise<ApiResponseFor<"GET /api/v1/recruitment/current">>;
    upcomingBatch(): Promise<ApiResponseFor<"GET /api/v1/recruitment/upcoming">>;
    myApplication(batchId: string): Promise<ApiResponseFor<"GET /api/v1/recruitment/batches/{batchId}/my-application">>;
    submitApplication(batchId: string, payload: SubmitApplicationDto): Promise<ApiResponseFor<"POST /api/v1/recruitment/batches/{batchId}/applications">>;
    updateApplication(batchId: string, applicationId: string, payload: UpdateApplicationDto): Promise<ApiResponseFor<"PATCH /api/v1/recruitment/batches/{batchId}/applications/{applicationId}">>;
    withdrawApplication(batchId: string, applicationId: string, payload: WithdrawApplicationDto): Promise<ApiResponseFor<"POST /api/v1/recruitment/batches/{batchId}/applications/{applicationId}/withdraw">>;
    listAdminBatches(): Promise<ApiResponseFor<"GET /api/v1/admin/recruitment/batches">>;
    getAdminBatch(batchId: string): Promise<ApiResponseFor<"GET /api/v1/admin/recruitment/batches/{batchId}">>;
    createAdminBatch(payload: CreateRecruitmentBatchDto): Promise<ApiResponseFor<"POST /api/v1/admin/recruitment/batches">>;
    updateAdminBatch(batchId: string, payload: UpdateRecruitmentBatchDto): Promise<ApiResponseFor<"PATCH /api/v1/admin/recruitment/batches/{batchId}">>;
    runAdminBatchCommand(batchId: string, command: "publish" | "open-now" | "pause" | "resume" | "close" | "reopen", payload: RecruitmentBatchCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/recruitment/batches/{batchId}/publish">>;
    listAdminApplications(batchId: string, query?: string): Promise<ApiResponseFor<"GET /api/v1/admin/recruitment/batches/{batchId}/applications">>;
    getAdminApplication(batchId: string, applicationId: string): Promise<ApiResponseFor<"GET /api/v1/admin/recruitment/batches/{batchId}/applications/{applicationId}">>;
    results(): Promise<ApiResponseFor<"GET /api/v1/recruitment/results/me">>;
  };
  portal: {
    draft(): Promise<ApiResponseFor<"GET /api/v1/admin/portal/configuration/draft">>;
    saveDraft(payload: SavePortalConfigurationDto): Promise<ApiResponseFor<"PUT /api/v1/admin/portal/configuration/draft">>;
    preview(): Promise<ApiResponseFor<"GET /api/v1/admin/portal/configuration/preview">>;
    publish(payload: PublishPortalConfigurationDto): Promise<ApiResponseFor<"POST /api/v1/admin/portal/configuration/publish">>;
    publicConfiguration(): Promise<ApiResponseFor<"GET /api/v1/public/portal">>;
  };
  content: {
    list(query?: string): Promise<ApiResponseFor<"GET /api/v1/admin/content">>;
    detail(contentId: string): Promise<ApiResponseFor<"GET /api/v1/admin/content/{contentId}">>;
    create(payload: CreateContentDto): Promise<ApiResponseFor<"POST /api/v1/admin/content">>;
    update(contentId: string, payload: UpdateContentDto): Promise<ApiResponseFor<"PATCH /api/v1/admin/content/{contentId}">>;
    preview(contentId: string): Promise<ApiResponseFor<"GET /api/v1/admin/content/{contentId}/preview">>;
    submitReview(contentId: string, payload: ContentCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/content/{contentId}/submit-review">>;
    returnDraft(contentId: string, payload: ReasonedContentCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/content/{contentId}/return-draft">>;
    approvePublication(contentId: string, payload: ContentCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/content/{contentId}/approve-publication">>;
    publish(contentId: string, payload: PublishContentDto): Promise<ApiResponseFor<"POST /api/v1/admin/content/{contentId}/publish">>;
    offline(contentId: string, payload: ReasonedContentCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/content/{contentId}/offline">>;
  };
  uploads: {
    list(query?: string): Promise<ApiResponseFor<"GET /api/v1/admin/uploads">>;
    createIntent(payload: CreateUploadIntentDto): Promise<ApiResponseFor<"POST /api/v1/admin/uploads/intents">>;
    complete(uploadId: string, payload: CompleteUploadDto): Promise<ApiResponseFor<"POST /api/v1/admin/uploads/{uploadId}/complete">>;
    status(uploadId: string): Promise<ApiResponseFor<"GET /api/v1/admin/uploads/{uploadId}">>;
  };
  media: {
    bind(payload: CreateMediaAttachmentDto): Promise<ApiResponseFor<"POST /api/v1/admin/media/attachments">>;
    update(id: string, payload: UpdateMediaAttachmentDto): Promise<ApiResponseFor<"PATCH /api/v1/admin/media/attachments/{id}">>;
  };
  projects: {
    listAdmin(): Promise<ApiResponseFor<"GET /api/v1/admin/projects">>; admin(id: string): Promise<ApiResponseFor<"GET /api/v1/admin/projects/{id}">>;
    create(payload: CreateProjectDto): Promise<ApiResponseFor<"POST /api/v1/admin/projects">>; update(id: string, payload: UpdateProjectDto): Promise<ApiResponseFor<"PATCH /api/v1/admin/projects/{id}">>;
    publish(id: string, payload: ProjectCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/projects/{id}/publish">>; offline(id: string, payload: ProjectOfflineDto): Promise<ApiResponseFor<"POST /api/v1/admin/projects/{id}/offline">>;
    listPublic(): Promise<ApiResponseFor<"GET /api/v1/public/projects">>; public(slug: string): Promise<ApiResponseFor<"GET /api/v1/public/projects/{slug}">>;
  };
  activities: {
    listAdmin(): Promise<ApiResponseFor<"GET /api/v1/admin/activities">>; admin(id: string): Promise<ApiResponseFor<"GET /api/v1/admin/activities/{id}">>;
    create(payload: CreateActivityDto): Promise<ApiResponseFor<"POST /api/v1/admin/activities">>; update(id: string, payload: UpdateActivityDto): Promise<ApiResponseFor<"PATCH /api/v1/admin/activities/{id}">>;
    publish(id: string, payload: ActivityCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/activities/{id}/publish">>; openRegistration(id: string, payload: ActivityCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/activities/{id}/registration/open">>; closeRegistration(id: string, payload: ActivityCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/activities/{id}/registration/close">>; offline(id: string, payload: ActivityOfflineDto): Promise<ApiResponseFor<"POST /api/v1/admin/activities/{id}/offline">>;
    listPublic(): Promise<ApiResponseFor<"GET /api/v1/public/activities">>; public(slug: string): Promise<ApiResponseFor<"GET /api/v1/public/activities/{slug}">>;
  };
  registrations: {
    create(slug: string, payload: CreateRegistrationDto): Promise<ApiResponseFor<"POST /api/v1/activities/{slug}/registrations">>; mine(slug: string): Promise<ApiResponseFor<"GET /api/v1/activities/{slug}/registration">>; cancel(id: string, payload: RegistrationCommandDto): Promise<ApiResponseFor<"POST /api/v1/registrations/{id}/cancel">>; listAdmin(activityId: string): Promise<ApiResponseFor<"GET /api/v1/admin/activities/{activityId}/registrations">>; decide(id: string, payload: DecideRegistrationDto): Promise<ApiResponseFor<"POST /api/v1/admin/registrations/{id}/decision">>;
  };
  galleries: {
    listAdmin(): Promise<ApiResponseFor<"GET /api/v1/admin/galleries">>;
    create(payload: CreateGalleryDto): Promise<ApiResponseFor<"POST /api/v1/admin/galleries">>;
    update(id: string, payload: UpdateGalleryDto): Promise<ApiResponseFor<"PATCH /api/v1/admin/galleries/{id}">>;
    publish(id: string, payload: GalleryCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/galleries/{id}/publish">>;
    offline(id: string, payload: GalleryOfflineDto): Promise<ApiResponseFor<"POST /api/v1/admin/galleries/{id}/offline">>;
    listPublic(): Promise<ApiResponseFor<"GET /api/v1/public/galleries">>;
    public(slug: string): Promise<ApiResponseFor<"GET /api/v1/public/galleries/{slug}">>;
  };
  resources: {
    listPublic(): Promise<ApiResponseFor<"GET /api/v1/public/resources">>;
    list(query?: string): Promise<ApiResponseFor<"GET /api/v1/admin/resources">>;
    detail(id: string): Promise<ApiResponseFor<"GET /api/v1/admin/resources/{id}">>;
    create(payload: CreateResourceDto): Promise<ApiResponseFor<"POST /api/v1/admin/resources">>;
    appendVersion(id: string, payload: CreateResourceVersionDto): Promise<ApiResponseFor<"POST /api/v1/admin/resources/{id}/versions">>;
    versions(id: string): Promise<ApiResponseFor<"GET /api/v1/admin/resources/{id}/versions">>;
    publish(id: string, payload: ResourceCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/resources/{id}/publish">>;
    offline(id: string, payload: ResourceOfflineDto): Promise<ApiResponseFor<"POST /api/v1/admin/resources/{id}/offline">>;
    public(slug: string): Promise<ApiResponseFor<"GET /api/v1/public/resources/{slug}">>;
    publicVersion(slug: string, versionLabel: string): Promise<ApiResponseFor<"GET /api/v1/public/resources/{slug}/versions/{versionLabel}">>;
    memberVariantUrl(slug: string, versionLabel: string): string;
  };
  help: {
    listAdmin(): Promise<ApiResponseFor<"GET /api/v1/admin/help">>;
    create(payload: CreateHelpDto): Promise<ApiResponseFor<"POST /api/v1/admin/help">>;
    updateDraft(id: string, payload: UpdateHelpDraftDto): Promise<ApiResponseFor<"PATCH /api/v1/admin/help/{id}/draft">>;
    publish(id: string, payload: PublishHelpDto): Promise<ApiResponseFor<"POST /api/v1/admin/help/{id}/publish">>;
    listPublic(): Promise<ApiResponseFor<"GET /api/v1/public/help">>;
    public(slug: string): Promise<ApiResponseFor<"GET /api/v1/public/help/{slug}">>;
  };
  recycle: {
    list(): Promise<ApiResponseFor<"GET /api/v1/admin/recycle-bin">>;
    softDelete(publicId: string, payload: RecycleCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/recycle-bin/honors/{publicId}">>;
    restore(publicId: string, payload: RecycleCommandDto): Promise<ApiResponseFor<"POST /api/v1/admin/recycle-bin/honors/{publicId}/restore">>;
    hardDelete(publicId: string, payload: HardDeleteRecycleDto): Promise<ApiResponseFor<"DELETE /api/v1/admin/recycle-bin/honors/{publicId}">>;
  };
  admin: { dashboard(): Promise<unknown> };
}

export function createHsdApiClient(transport: ApiTransport): HsdApiClient {
  return {
    auth: {
      login: (payload) => requestGenerated(transport, "POST /api/v1/auth/login", payload),
      currentSession: () => requestGenerated(transport, "GET /api/v1/auth/session"),
    },
    members: {
      currentProfile: () => requestGenerated(transport, "GET /api/v1/members/me"),
      updateCurrentProfile: (payload) => requestGenerated(transport, "PATCH /api/v1/members/me", payload),
      managed: () => requestGenerated(transport, "GET /api/v1/admin/members"),
      createManaged: (payload) => requestGenerated(transport, "POST /api/v1/admin/members", payload),
      promoteManaged: (personId, payload) => requestGenerated(transport, "POST /api/v1/admin/members/{personId}/promote", payload, `/api/v1/admin/members/${encodeURIComponent(personId)}/promote`),
      submitHonor: (payload) => requestGenerated(transport, "POST /api/v1/members/me/honors", payload),
      honors: () => requestGenerated(transport, "GET /api/v1/members/me/honors"),
      updateHonorConsent: (id, payload) => requestGenerated(transport, "PATCH /api/v1/members/me/honors/{id}/consent", payload, `/api/v1/members/me/honors/${encodeURIComponent(id)}/consent`),
      growthRecords: () => requestGenerated(transport, "GET /api/v1/members/me/growth-records"),
      growthRecord: (id) => requestGenerated(transport, "GET /api/v1/members/me/growth-records/{id}", undefined, `/api/v1/members/me/growth-records/${encodeURIComponent(id)}`),
      createGrowthRecord: (payload) => requestGenerated(transport, "POST /api/v1/members/me/growth-records", payload),
      updateGrowthRecord: (id, payload) => requestGenerated(transport, "PATCH /api/v1/members/me/growth-records/{id}", payload, `/api/v1/members/me/growth-records/${encodeURIComponent(id)}`),
      deleteGrowthRecord: (id, payload) => requestGenerated(transport, "DELETE /api/v1/members/me/growth-records/{id}", payload, `/api/v1/members/me/growth-records/${encodeURIComponent(id)}`),
    },
    publicMembers: {
      list: () => requestGenerated(transport, "GET /api/v1/public/members"),
      detail: (publicId) => requestGenerated(transport, "GET /api/v1/public/members/{publicId}", undefined, `/api/v1/public/members/${encodeURIComponent(publicId)}`),
    },
    honors: {
      listAdmin: () => requestGenerated(transport, "GET /api/v1/admin/honors"),
      approve: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/honors/{id}/approve", payload, `/api/v1/admin/honors/${encodeURIComponent(id)}/approve`),
    },
    organization: {
      publicCenters: () => requestGenerated(transport, "GET /api/v1/public/centers"),
      publicCenter: (publicSlug) => requestGenerated(transport, "GET /api/v1/public/centers/{publicSlug}", undefined, `/api/v1/public/centers/${encodeURIComponent(publicSlug)}`),
      centers: () => requestGenerated(transport, "GET /api/v1/admin/organization/centers"),
      createMembership: (payload) => requestGenerated(transport, "POST /api/v1/admin/organization/memberships", payload),
      updateMembership: (personId, payload) => requestGenerated(transport, "PATCH /api/v1/admin/organization/memberships/{personId}", payload, `/api/v1/admin/organization/memberships/${encodeURIComponent(personId)}`),
      retireMembership: (personId, payload) => requestGenerated(transport, "POST /api/v1/admin/organization/memberships/{personId}/retire", payload, `/api/v1/admin/organization/memberships/${encodeURIComponent(personId)}/retire`),
      appointAllianceOwner: (personId, payload) => requestGenerated(transport, "POST /api/v1/admin/organization/positions/alliance-owners/{personId}", payload, `/api/v1/admin/organization/positions/alliance-owners/${encodeURIComponent(personId)}`),
      revokeAllianceOwner: (personId, payload) => requestGenerated(transport, "POST /api/v1/admin/organization/positions/alliance-owners/{personId}/revoke", payload, `/api/v1/admin/organization/positions/alliance-owners/${encodeURIComponent(personId)}/revoke`),
      appointCenterMinister: (centerId, personId, payload) => requestGenerated(transport, "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}", payload, `/api/v1/admin/organization/positions/centers/${encodeURIComponent(centerId)}/ministers/${encodeURIComponent(personId)}`),
      revokeCenterMinister: (centerId, personId, payload) => requestGenerated(transport, "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}/revoke", payload, `/api/v1/admin/organization/positions/centers/${encodeURIComponent(centerId)}/ministers/${encodeURIComponent(personId)}/revoke`),
      handoverCenterMinister: (centerId, outgoingPersonId, incomingPersonId, payload) => requestGenerated(transport, "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{outgoingPersonId}/handover/{incomingPersonId}", payload, `/api/v1/admin/organization/positions/centers/${encodeURIComponent(centerId)}/ministers/${encodeURIComponent(outgoingPersonId)}/handover/${encodeURIComponent(incomingPersonId)}`),
      setCoreMembership: (personId, payload) => requestGenerated(transport, "POST /api/v1/admin/organization/positions/core-members/{personId}", payload, `/api/v1/admin/organization/positions/core-members/${encodeURIComponent(personId)}`),
      grantProjectLead: (projectId, personId, payload) => requestGenerated(transport, "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}", payload, `/api/v1/admin/organization/positions/projects/${encodeURIComponent(projectId)}/leads/${encodeURIComponent(personId)}`),
      revokeProjectLead: (projectId, personId, payload) => requestGenerated(transport, "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}/revoke", payload, `/api/v1/admin/organization/positions/projects/${encodeURIComponent(projectId)}/leads/${encodeURIComponent(personId)}/revoke`),
    },
    homepage: {
      stats: () => requestGenerated(transport, "GET /api/v1/public/homepage/stats"),
    },
    adminAccess: {
      accounts: () => requestGenerated(transport, "GET /api/v1/admin/accounts"),
    },
    imports: {
      dryRun: (payload) => requestGenerated(transport, "POST /api/v1/admin/imports/preparatory-members/dry-run", payload),
      commit: (payload) => requestGenerated(transport, "POST /api/v1/admin/imports/preparatory-members/commit", payload),
    },
    recruitment: {
      currentBatch: () => requestGenerated(transport, "GET /api/v1/recruitment/current"),
      upcomingBatch: () => requestGenerated(transport, "GET /api/v1/recruitment/upcoming"),
      myApplication: (batchId) => requestGenerated(transport, "GET /api/v1/recruitment/batches/{batchId}/my-application", undefined, `/api/v1/recruitment/batches/${encodeURIComponent(batchId)}/my-application`),
      submitApplication: (batchId, payload) => requestGenerated(transport, "POST /api/v1/recruitment/batches/{batchId}/applications", payload, `/api/v1/recruitment/batches/${encodeURIComponent(batchId)}/applications`),
      updateApplication: (batchId, applicationId, payload) => requestGenerated(transport, "PATCH /api/v1/recruitment/batches/{batchId}/applications/{applicationId}", payload, `/api/v1/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(applicationId)}`),
      withdrawApplication: (batchId, applicationId, payload) => requestGenerated(transport, "POST /api/v1/recruitment/batches/{batchId}/applications/{applicationId}/withdraw", payload, `/api/v1/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(applicationId)}/withdraw`),
      listAdminBatches: () => requestGenerated(transport, "GET /api/v1/admin/recruitment/batches"),
      getAdminBatch: (batchId) => requestGenerated(transport, "GET /api/v1/admin/recruitment/batches/{batchId}", undefined, `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}`),
      createAdminBatch: (payload) => requestGenerated(transport, "POST /api/v1/admin/recruitment/batches", payload),
      updateAdminBatch: (batchId, payload) => requestGenerated(transport, "PATCH /api/v1/admin/recruitment/batches/{batchId}", payload, `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}`),
      runAdminBatchCommand: (batchId, command, payload) => {
        const operation = `POST /api/v1/admin/recruitment/batches/{batchId}/${command}` as ApiOperation;
        return requestGenerated(transport, operation, payload, `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/${command}`) as Promise<ApiResponseFor<"POST /api/v1/admin/recruitment/batches/{batchId}/publish">>;
      },
      listAdminApplications: (batchId, query = "") => requestGenerated(transport, "GET /api/v1/admin/recruitment/batches/{batchId}/applications", undefined, `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications${query ? `?${query}` : ""}`),
      getAdminApplication: (batchId, applicationId) => requestGenerated(transport, "GET /api/v1/admin/recruitment/batches/{batchId}/applications/{applicationId}", undefined, `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(applicationId)}`),
      results: () => requestGenerated(transport, "GET /api/v1/recruitment/results/me"),
    },
    portal: {
      draft: () => requestGenerated(transport, "GET /api/v1/admin/portal/configuration/draft"),
      saveDraft: (payload) => requestGenerated(transport, "PUT /api/v1/admin/portal/configuration/draft", payload),
      preview: () => requestGenerated(transport, "GET /api/v1/admin/portal/configuration/preview"),
      publish: (payload) => requestGenerated(transport, "POST /api/v1/admin/portal/configuration/publish", payload),
      publicConfiguration: () => requestGenerated(transport, "GET /api/v1/public/portal"),
    },
    content: {
      list: (query = "") => requestGenerated(
        transport,
        "GET /api/v1/admin/content",
        undefined,
        `/api/v1/admin/content${query ? `?${query}` : ""}`,
      ),
      detail: (contentId) => requestGenerated(
        transport,
        "GET /api/v1/admin/content/{contentId}",
        undefined,
        `/api/v1/admin/content/${encodeURIComponent(contentId)}`,
      ),
      create: (payload) => requestGenerated(transport, "POST /api/v1/admin/content", payload),
      update: (contentId, payload) => requestGenerated(transport, "PATCH /api/v1/admin/content/{contentId}", payload, `/api/v1/admin/content/${encodeURIComponent(contentId)}`),
      preview: (contentId) => requestGenerated(transport, "GET /api/v1/admin/content/{contentId}/preview", undefined, `/api/v1/admin/content/${encodeURIComponent(contentId)}/preview`),
      submitReview: (contentId, payload) => requestGenerated(transport, "POST /api/v1/admin/content/{contentId}/submit-review", payload, `/api/v1/admin/content/${encodeURIComponent(contentId)}/submit-review`),
      returnDraft: (contentId, payload) => requestGenerated(transport, "POST /api/v1/admin/content/{contentId}/return-draft", payload, `/api/v1/admin/content/${encodeURIComponent(contentId)}/return-draft`),
      approvePublication: (contentId, payload) => requestGenerated(transport, "POST /api/v1/admin/content/{contentId}/approve-publication", payload, `/api/v1/admin/content/${encodeURIComponent(contentId)}/approve-publication`),
      publish: (contentId, payload) => requestGenerated(transport, "POST /api/v1/admin/content/{contentId}/publish", payload, `/api/v1/admin/content/${encodeURIComponent(contentId)}/publish`),
      offline: (contentId, payload) => requestGenerated(transport, "POST /api/v1/admin/content/{contentId}/offline", payload, `/api/v1/admin/content/${encodeURIComponent(contentId)}/offline`),
    },
    uploads: {
      list: (query = "") => requestGenerated(
        transport,
        "GET /api/v1/admin/uploads",
        undefined,
        `/api/v1/admin/uploads${query ? `?${query}` : ""}`,
      ),
      createIntent: (payload) => requestGenerated(transport, "POST /api/v1/admin/uploads/intents", payload),
      complete: (uploadId, payload) => requestGenerated(transport, "POST /api/v1/admin/uploads/{uploadId}/complete", payload, `/api/v1/admin/uploads/${encodeURIComponent(uploadId)}/complete`),
      status: (uploadId) => requestGenerated(transport, "GET /api/v1/admin/uploads/{uploadId}", undefined, `/api/v1/admin/uploads/${encodeURIComponent(uploadId)}`),
    },
    media: {
      bind: (payload) => requestGenerated(transport, "POST /api/v1/admin/media/attachments", payload),
      update: (id, payload) => requestGenerated(transport, "PATCH /api/v1/admin/media/attachments/{id}", payload, `/api/v1/admin/media/attachments/${encodeURIComponent(id)}`),
    },
    projects: {
      listAdmin: () => requestGenerated(transport, "GET /api/v1/admin/projects"), admin: (id) => requestGenerated(transport, "GET /api/v1/admin/projects/{id}", undefined, `/api/v1/admin/projects/${encodeURIComponent(id)}`),
      create: (payload) => requestGenerated(transport, "POST /api/v1/admin/projects", payload), update: (id, payload) => requestGenerated(transport, "PATCH /api/v1/admin/projects/{id}", payload, `/api/v1/admin/projects/${encodeURIComponent(id)}`),
      publish: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/projects/{id}/publish", payload, `/api/v1/admin/projects/${encodeURIComponent(id)}/publish`), offline: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/projects/{id}/offline", payload, `/api/v1/admin/projects/${encodeURIComponent(id)}/offline`),
      listPublic: () => requestGenerated(transport, "GET /api/v1/public/projects"), public: (slug) => requestGenerated(transport, "GET /api/v1/public/projects/{slug}", undefined, `/api/v1/public/projects/${encodeURIComponent(slug)}`),
    },
    activities: {
      listAdmin: () => requestGenerated(transport, "GET /api/v1/admin/activities"), admin: (id) => requestGenerated(transport, "GET /api/v1/admin/activities/{id}", undefined, `/api/v1/admin/activities/${encodeURIComponent(id)}`),
      create: (payload) => requestGenerated(transport, "POST /api/v1/admin/activities", payload), update: (id, payload) => requestGenerated(transport, "PATCH /api/v1/admin/activities/{id}", payload, `/api/v1/admin/activities/${encodeURIComponent(id)}`),
      publish: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/activities/{id}/publish", payload, `/api/v1/admin/activities/${encodeURIComponent(id)}/publish`), openRegistration: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/activities/{id}/registration/open", payload, `/api/v1/admin/activities/${encodeURIComponent(id)}/registration/open`), closeRegistration: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/activities/{id}/registration/close", payload, `/api/v1/admin/activities/${encodeURIComponent(id)}/registration/close`), offline: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/activities/{id}/offline", payload, `/api/v1/admin/activities/${encodeURIComponent(id)}/offline`),
      listPublic: () => requestGenerated(transport, "GET /api/v1/public/activities"), public: (slug) => requestGenerated(transport, "GET /api/v1/public/activities/{slug}", undefined, `/api/v1/public/activities/${encodeURIComponent(slug)}`),
    },
    registrations: {
      create: (slug, payload) => requestGenerated(transport, "POST /api/v1/activities/{slug}/registrations", payload, `/api/v1/activities/${encodeURIComponent(slug)}/registrations`), mine: (slug) => requestGenerated(transport, "GET /api/v1/activities/{slug}/registration", undefined, `/api/v1/activities/${encodeURIComponent(slug)}/registration`), cancel: (id, payload) => requestGenerated(transport, "POST /api/v1/registrations/{id}/cancel", payload, `/api/v1/registrations/${encodeURIComponent(id)}/cancel`), listAdmin: (activityId) => requestGenerated(transport, "GET /api/v1/admin/activities/{activityId}/registrations", undefined, `/api/v1/admin/activities/${encodeURIComponent(activityId)}/registrations`), decide: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/registrations/{id}/decision", payload, `/api/v1/admin/registrations/${encodeURIComponent(id)}/decision`),
    },
    galleries: {
      listAdmin: () => requestGenerated(transport, "GET /api/v1/admin/galleries"),
      create: (payload) => requestGenerated(transport, "POST /api/v1/admin/galleries", payload),
      update: (id, payload) => requestGenerated(transport, "PATCH /api/v1/admin/galleries/{id}", payload, `/api/v1/admin/galleries/${encodeURIComponent(id)}`),
      publish: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/galleries/{id}/publish", payload, `/api/v1/admin/galleries/${encodeURIComponent(id)}/publish`),
      offline: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/galleries/{id}/offline", payload, `/api/v1/admin/galleries/${encodeURIComponent(id)}/offline`),
      listPublic: () => requestGenerated(transport, "GET /api/v1/public/galleries"),
      public: (slug) => requestGenerated(transport, "GET /api/v1/public/galleries/{slug}", undefined, `/api/v1/public/galleries/${encodeURIComponent(slug)}`),
    },
    resources: {
      listPublic: () => requestGenerated(transport, "GET /api/v1/public/resources"),
      list: (query = "") => requestGenerated(transport, "GET /api/v1/admin/resources", undefined, `/api/v1/admin/resources${query ? `?${query}` : ""}`),
      detail: (id) => requestGenerated(transport, "GET /api/v1/admin/resources/{id}", undefined, `/api/v1/admin/resources/${encodeURIComponent(id)}`),
      create: (payload) => requestGenerated(transport, "POST /api/v1/admin/resources", payload),
      appendVersion: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/resources/{id}/versions", payload, `/api/v1/admin/resources/${encodeURIComponent(id)}/versions`),
      versions: (id) => requestGenerated(transport, "GET /api/v1/admin/resources/{id}/versions", undefined, `/api/v1/admin/resources/${encodeURIComponent(id)}/versions`),
      publish: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/resources/{id}/publish", payload, `/api/v1/admin/resources/${encodeURIComponent(id)}/publish`),
      offline: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/resources/{id}/offline", payload, `/api/v1/admin/resources/${encodeURIComponent(id)}/offline`),
      public: (slug) => requestGenerated(transport, "GET /api/v1/public/resources/{slug}", undefined, `/api/v1/public/resources/${encodeURIComponent(slug)}`),
      publicVersion: (slug, versionLabel) => requestGenerated(transport, "GET /api/v1/public/resources/{slug}/versions/{versionLabel}", undefined, `/api/v1/public/resources/${encodeURIComponent(slug)}/versions/${encodeURIComponent(versionLabel)}`),
      memberVariantUrl: (slug, versionLabel) => `/api/v1/public/resources/${encodeURIComponent(slug)}/versions/${encodeURIComponent(versionLabel)}/variant`,
    },
    help: {
      listAdmin: () => requestGenerated(transport, "GET /api/v1/admin/help"),
      create: (payload) => requestGenerated(transport, "POST /api/v1/admin/help", payload),
      updateDraft: (id, payload) => requestGenerated(transport, "PATCH /api/v1/admin/help/{id}/draft", payload, `/api/v1/admin/help/${encodeURIComponent(id)}/draft`),
      publish: (id, payload) => requestGenerated(transport, "POST /api/v1/admin/help/{id}/publish", payload, `/api/v1/admin/help/${encodeURIComponent(id)}/publish`),
      listPublic: () => requestGenerated(transport, "GET /api/v1/public/help"),
      public: (slug) => requestGenerated(transport, "GET /api/v1/public/help/{slug}", undefined, `/api/v1/public/help/${encodeURIComponent(slug)}`),
    },
    recycle: {
      list: () => requestGenerated(transport, "GET /api/v1/admin/recycle-bin"),
      softDelete: (publicId, payload) => requestGenerated(transport, "POST /api/v1/admin/recycle-bin/honors/{publicId}", payload, `/api/v1/admin/recycle-bin/honors/${encodeURIComponent(publicId)}`),
      restore: (publicId, payload) => requestGenerated(transport, "POST /api/v1/admin/recycle-bin/honors/{publicId}/restore", payload, `/api/v1/admin/recycle-bin/honors/${encodeURIComponent(publicId)}/restore`),
      hardDelete: (publicId, payload) => requestGenerated(transport, "DELETE /api/v1/admin/recycle-bin/honors/{publicId}", payload, `/api/v1/admin/recycle-bin/honors/${encodeURIComponent(publicId)}`),
    },
    admin: { dashboard: () => transport({ path: ADMIN_DASHBOARD_PATH, method: "GET" }) },
  };
}
