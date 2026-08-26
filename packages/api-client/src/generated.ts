// @ts-nocheck
/**
 * AUTO-GENERATED from packages/api-client/openapi.snapshot.json.
 * Refresh with: pnpm --filter @hsd/api export:browser-openapi && pnpm --filter @hsd/api-client generate
 * Do not edit manually.
 */

export type ActivityCommandDto = {
  "expectedVersion": number;
};

export type ActivityOfflineDto = {
  "expectedVersion": number;
  "reason": string;
};

export type AdminAccountListResponseDto = {
  "page": number;
  "pageSize": number;
  "total": number;
  "items": Array<AdminAccountResponseDto>;
};

export type AdminAccountResponseDto = {
  "id": string;
  "username": string;
  "status": "ENABLED" | "DISABLED";
  "adminLevel": "MEMBER" | "ADMIN" | "OWNER";
  "adminCenterId": (string) | null;
  "mustChangePassword": boolean;
  "version": number;
  "lastLoginAt": (string) | null;
  "createdAt": string;
  "updatedAt": string;
  "person": AdminPersonSummaryResponseDto;
  "adminCenter": (AdminCenterResponseDto) | null;
};

export type AdminActivityListResponseDto = {
  "items": Array<AdminActivityResponseDto>;
};

export type AdminActivityResponseDto = {
  "id": string;
  "centerId": string;
  "slug": string;
  "status": "draft" | "published" | "offline";
  "version": number;
  "registrationOpen": boolean;
  "publishedAt": (string) | null;
  "title": string;
  "type": string;
  "date": string;
  "time": string;
  "location": string;
  "summary": string;
  "content": string;
  "agenda": Array<string>;
  "registrationEndAt": string;
  "coverAttachmentId": (string) | null;
  "detailAttachmentIds": Array<string>;
  "revisionNumber": number;
};

export type AdminCenterListResponseDto = {
  "currentPermission": CurrentOrganizationPermissionResponseDto;
  "items": Array<AdminCenterResponseDto>;
};

export type AdminCenterResponseDto = {
  "id": string;
  "slug": string;
  "name": string;
  "active": boolean;
  "positions": Array<OrganizationPositionResponseDto>;
};

export type AdminContentActorResponseDto = {
  "type": "account" | "system";
  "accountId": (string) | null;
  "username": (string) | null;
  "displayName": string;
};

export type AdminContentListResponseDto = {
  "page": number;
  "pageSize": number;
  "total": number;
  "items": Array<AdminContentSummaryResponseDto>;
};

export type AdminContentResponseDto = {
  "id": string;
  "publicId": string;
  "centerId": (string) | null;
  "slug": string;
  "kind": "flash" | "article" | "notice";
  "status": "draft" | "review" | "pending_publication" | "published" | "offline";
  "version": number;
  "createdBy": AdminContentActorResponseDto;
  "createdAt": string;
  "updatedAt": string;
  "workingRevision": (ContentWorkingRevisionResponseDto) | null;
  "publishedRevisionNumber": (number) | null;
  "rejectionReason": (string) | null;
  "publishedAt": (string) | null;
  "offlineAt": (string) | null;
  "offlineReason": (string) | null;
};

export type AdminContentSummaryResponseDto = {
  "id": string;
  "publicId": string;
  "centerId": (string) | null;
  "slug": string;
  "kind": "flash" | "article" | "notice";
  "status": "draft" | "review" | "pending_publication" | "published" | "offline";
  "version": number;
  "workingRevisionNumber": number;
  "title": string;
  "summary": (string) | null;
  "createdBy": AdminContentActorResponseDto;
  "createdAt": string;
  "updatedAt": string;
  "publishedAt": (string) | null;
  "offlineAt": (string) | null;
};

export type AdminGalleryListResponseDto = {
  "items": Array<AdminGalleryResponseDto>;
};

export type AdminGalleryResponseDto = {
  "id": string;
  "centerId": string;
  "slug": string;
  "status": "draft" | "published" | "offline";
  "version": number;
  "publishedAt": (string) | null;
  "title": string;
  "category": string;
  "year": string;
  "description": string;
  "team": (string) | null;
  "coverAttachmentId": (string) | null;
  "detailAttachmentIds": Array<string>;
  "cover": (MediaAttachmentResponseDto) | null;
  "details": Array<MediaAttachmentResponseDto>;
  "revisionNumber": number;
};

export type AdminHelpListResponseDto = {
  "items": Array<AdminHelpResponseDto>;
};

export type AdminHelpResponseDto = {
  "id": string;
  "slug": string;
  "status": "draft" | "published";
  "version": number;
  "publishedAt": (string) | null;
  "workingRevision": HelpRevisionResponseDto;
};

export type AdminHonorListResponseDto = {
  "items": Array<AdminHonorResponseDto>;
};

export type AdminHonorResponseDto = {
  "id": string;
  "publicId": string;
  "personId": string;
  "centerId": string;
  "memberName": string;
  "title": string;
  "type": string;
  "description": string;
  "awardedAt": string;
  "awardedDatePrecision": "day" | "month" | "year" | "unknown";
  "awardedDateLabel": string;
  "proofReference": string;
  "publicConsent": boolean;
  "status": "pending" | "approved" | "rejected";
  "version": number;
  "submittedAt": string;
};

export type AdminPersonSummaryResponseDto = {
  "id": string;
  "name": string;
  "studentId": string;
  "grade": string;
  "className": string;
};

export type AdminPortalConfigurationResponseDto = {
  "version": number;
  "entries": Array<PortalResolvedEntryResponseDto>;
  "visuals": Record<string, unknown>;
};

export type AdminProjectLeadSummaryDto = {
  "personId": string;
  "name": string;
  "positionVersion": number;
};

export type AdminProjectListResponseDto = {
  "items": Array<AdminProjectResponseDto>;
};

export type AdminProjectResponseDto = {
  "id": string;
  "centerId": string;
  "slug": string;
  "displayOrder": (number) | null;
  "status": "draft" | "published" | "offline";
  "version": number;
  "publishedAt": (string) | null;
  "title": string;
  "category": string;
  "year": string;
  "description": string;
  "achievement": string;
  "projectStage": string;
  "challenge": string;
  "solution": string;
  "memberPersonIds": Array<string>;
  "coverAttachmentId": (string) | null;
  "detailAttachmentIds": Array<string>;
  "revisionNumber": number;
  "lead": (AdminProjectLeadSummaryDto) | null;
};

export type AdminRecruitmentApplicationDto = {
  "id": string;
  "batchId": string;
  "contact": string;
  "baizeDirection": ("HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT") | null;
  "acceptsAdjustment": boolean;
  "status": "SUBMITTED" | "WITHDRAWN" | "PROCESSING" | "COMPLETED";
  "version": number;
  "batchNameSnapshot": string;
  "batchVersionAtSubmission": number;
  "applicantProfileSnapshot": RecruitmentApplicantSnapshotDto;
  "submittedAt": string;
  "withdrawnAt": (string) | null;
  "preferences": Array<AdminRecruitmentApplicationPreferenceDto>;
};

export type AdminRecruitmentApplicationListDto = {
  "page": number;
  "pageSize": number;
  "total": number;
  "items": Array<AdminRecruitmentApplicationDto>;
};

export type AdminRecruitmentApplicationPreferenceDto = {
  "rank": 1 | 2 | 3;
  "center": RecruitmentApplicationCenterDto;
};

export type AdminRecruitmentBatchDto = {
  "effectiveStatus": "draft" | "upcoming" | "open" | "paused" | "closed" | "archived";
  "effectiveStatusReason": "draft" | "before-start" | "within-window" | "after-end" | "force-open" | "paused" | "force-closed" | "archived";
  "id": string;
  "name": string;
  "startAt": string;
  "endAt": string;
  "timezone": "Asia/Shanghai";
  "lifecycleStatus": "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  "manualOverride": "NONE" | "FORCE_OPEN" | "PAUSED" | "FORCE_CLOSED";
  "version": number;
  "publishedAt": (string) | null;
  "actualOpenedAt": (string) | null;
  "closedAt": (string) | null;
  "archivedAt": (string) | null;
  "createdAt": string;
  "updatedAt": string;
  "applicationCount": number;
  "openCenters": Array<AdminRecruitmentCenterDto>;
  "responsibleAccounts": Array<AdminRecruitmentResponsibleAccountDto>;
};

export type AdminRecruitmentBatchListDto = {
  "page": number;
  "pageSize": number;
  "total": number;
  "items": Array<AdminRecruitmentBatchDto>;
};

export type AdminRecruitmentBatchStatusDto = {
  "effectiveStatus": "draft" | "upcoming" | "open" | "paused" | "closed" | "archived";
  "effectiveStatusReason": "draft" | "before-start" | "within-window" | "after-end" | "force-open" | "paused" | "force-closed" | "archived";
};

export type AdminRecruitmentCenterDto = {
  "id": string;
  "slug": string;
  "name": string;
  "active": boolean;
};

export type AdminRecruitmentResponsibleAccountDto = {
  "id": string;
  "username": string;
  "status": "ENABLED" | "DISABLED";
  "adminLevel": "MEMBER" | "ADMIN" | "OWNER";
  "person": AdminRecruitmentResponsiblePersonDto;
};

export type AdminRecruitmentResponsiblePersonDto = {
  "id": string;
  "name": string;
};

export type AdminResourceActorResponseDto = {
  "id": string;
  "username": string;
  "displayName": string;
};

export type AdminResourceListResponseDto = {
  "page": number;
  "pageSize": number;
  "total": number;
  "items": Array<AdminResourceSummaryResponseDto>;
};

export type AdminResourceResponseDto = {
  "id": string;
  "centerId": string;
  "slug": string;
  "status": "draft" | "published" | "offline";
  "version": number;
  "publishedAt": (string) | null;
  "title": string;
  "summary": string;
  "kind": "article" | "pdf" | "docx" | "archive" | "external";
  "format": "web" | "pdf" | "docx" | "zip" | "external";
  "versionLabel": string;
  "access": "public" | "member";
  "availability": "available" | "unavailable";
  "content": string;
  "attachmentId": (string) | null;
  "revisionNumber": number;
  "createdBy": AdminResourceActorResponseDto;
  "createdAt": string;
  "updatedAt": string;
  "offlineAt": (string) | null;
  "offlineReason": (string) | null;
};

export type AdminResourceSummaryResponseDto = {
  "id": string;
  "centerId": string;
  "slug": string;
  "title": string;
  "summary": string;
  "kind": "article" | "pdf" | "docx" | "archive" | "external";
  "format": "web" | "pdf" | "docx" | "zip" | "external";
  "status": "draft" | "published" | "offline";
  "version": number;
  "versionLabel": string;
  "access": "public" | "member";
  "availability": "available" | "unavailable";
  "attachmentId": (string) | null;
  "revisionNumber": number;
  "createdBy": AdminResourceActorResponseDto;
  "createdAt": string;
  "updatedAt": string;
  "publishedAt": (string) | null;
  "offlineAt": (string) | null;
};

export type AdminResourceVersionListResponseDto = {
  "items": Array<AdminResourceVersionResponseDto>;
};

export type AdminResourceVersionResponseDto = {
  "versionLabel": string;
  "access": "public" | "member";
  "availability": "available" | "unavailable";
  "content": string;
  "attachmentId": (string) | null;
  "revisionNumber": number;
  "createdAt": string;
};

export type AdvanceAssessmentDto = {
  "expectedVersion": number;
  "confirmed": boolean;
  "reason"?: string;
};

export type AppointOrganizationPositionDto = {
  "expectedAccountVersion": number;
  "expectedMembershipVersion": number;
};

export type AssessmentAdjustmentDecisionDto = {
  "decision": "ADMITTED" | "NOT_ADMITTED";
  "targetCenter": (AssessmentCenterDto) | null;
  "createdAt": string;
};

export type AssessmentAdjustmentProposalDto = {
  "targetCenter": AssessmentCenterDto;
  "createdAt": string;
};

export type AssessmentAdjustmentTargetCatalogResponseDto = {
  "items": Array<AssessmentCenterDto>;
};

export type AssessmentAdvanceBlockerDto = {
  "code": "ASSESSMENT_BATCH_NOT_CLOSED" | "ASSESSMENT_NOT_EDITABLE" | "ASSESSMENT_ROUND_INCOMPLETE" | "ASSESSMENT_ADJUSTMENT_PENDING";
  "count": number;
};

export type AssessmentBatchDetailDto = {
  "id": string;
  "name": string;
  "lifecycleStatus": "draft" | "upcoming" | "open" | "paused" | "closed" | "archived";
};

export type AssessmentBatchResponseDto = {
  "currentRound": number;
  "status": "ASSESSING" | "READY_TO_PUBLISH" | "PUBLISHED";
  "version": number;
  "publishedAt": (string) | null;
  "batch": AssessmentBatchDetailDto;
  "pending": number;
  "adjustmentPending": number;
  "canAdvance": boolean;
  "advanceBlocker": (AssessmentAdvanceBlockerDto) | null;
  "nextAction": "PUBLISH_BATCH" | "OPEN_BATCH" | "CLOSE_BATCH" | "RECORD_CURRENT_ROUND_RESULTS" | "SUBMIT_ADJUSTMENT_PROPOSALS" | "DECIDE_ADJUSTMENTS" | "ADVANCE_ROUND" | "PUBLISH_RESULTS" | "NONE";
  "items": Array<AssessmentCandidateDto>;
};

export type AssessmentBatchStateResponseDto = {
  "currentRound": number;
  "status": "ASSESSING" | "READY_TO_PUBLISH" | "PUBLISHED";
  "version": number;
  "publishedAt": (string) | null;
};

export type AssessmentCandidateDto = {
  "applicationId": string;
  "person": AssessmentPersonDto;
  "acceptsAdjustment": boolean;
  "baizeDirection": ("HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT") | null;
  "preferences": Array<AssessmentPreferenceDto>;
  "roundResults": Array<AssessmentRoundResultDto>;
  "adjustmentProposal": (AssessmentAdjustmentProposalDto) | null;
  "adjustmentDecision": (AssessmentAdjustmentDecisionDto) | null;
  "finalResult": (AssessmentFinalResultDto) | null;
};

export type AssessmentCenterDto = {
  "id": string;
  "slug": string;
  "name": string;
};

export type AssessmentDecisionMutationResponseDto = {
  "version": number;
  "decision": AssessmentAdjustmentDecisionDto;
};

export type AssessmentFinalResultDto = {
  "decision": "ADMITTED" | "NOT_ADMITTED";
  "finalCenter": (AssessmentCenterDto) | null;
  "publishedAt": string;
};

export type AssessmentPersonDto = {
  "id": string;
  "name": string;
  "studentId": string;
  "grade": string;
  "className": string;
};

export type AssessmentPreferenceDto = {
  "rank": "FIRST" | "SECOND" | "THIRD";
  "center": AssessmentCenterDto;
};

export type AssessmentProposalMutationResponseDto = {
  "version": number;
  "proposal": AssessmentAdjustmentProposalDto;
};

export type AssessmentPublicationResponseDto = {
  "currentRound": number;
  "status": "ASSESSING" | "READY_TO_PUBLISH" | "PUBLISHED";
  "version": number;
  "publishedAt": (string) | null;
  "summary": AssessmentPublicationSummaryDto;
};

export type AssessmentPublicationSummaryDto = {
  "admitted": number;
  "notAdmitted": number;
  "total": number;
};

export type AssessmentRoundMutationResponseDto = {
  "version": number;
  "result": AssessmentRoundResultDto;
};

export type AssessmentRoundResultDto = {
  "round": number;
  "outcome": "PASSED" | "FAILED";
  "internalNote": (string) | null;
  "createdAt": string;
};

export type AuthorityAccountResponseDto = {
  "id": string;
  "adminLevel": "MEMBER" | "ADMIN" | "OWNER";
  "adminCenterId": (string) | null;
  "version": number;
  "capabilities": Array<string>;
  "leadership": (CenterLeadershipResponseDto) | null;
};

export type AuthSessionResponseDto = {
  "mustChangePassword": boolean;
  "csrfToken": string;
  "expiresAt": string;
};

export type AvatarResponseDto = {
  "kind": "default" | "asset";
  "publicToken"?: string;
  "variant"?: "white-hsd";
};

export type CenterLeadershipResponseDto = {
  "centerId": string;
  "personId": string;
};

export type CenterSummaryResponseDto = {
  "id": string;
  "slug": string;
  "name": string;
};

export type ChangeAdminQualificationDto = {
  "confirmed"?: boolean;
  "expectedVersion": number;
};

export type ChangeCenterLeadershipDto = {
  "confirmed"?: boolean;
  "expectedAccountVersion": number;
};

export type ChangePasswordDto = {
  "newPassword": string;
};

export type CompleteUploadDto = {
  "expectedVersion": number;
  "parts": Array<UploadPartDto>;
};

export type ContentAttachmentImageBlockResponseDto = {
  "type": "image";
  "attachmentId": string;
  "alt": string;
  "caption"?: string;
};

export type ContentCommandDto = {
  "expectedVersion": number;
};

export type ContentHeadingBlockResponseDto = {
  "type": "heading";
  "level": 2 | 3;
  "text": string;
};

export type ContentImageBlockResponseDto = {
  "type": "image";
  "url": string;
  "alt": string;
  "caption"?: string;
};

export type ContentParagraphBlockResponseDto = {
  "type": "paragraph";
  "text": string;
};

export type ContentWorkingRevisionResponseDto = {
  "revisionNumber": number;
  "title": string;
  "summary": (string) | null;
  "tag": (string) | null;
  "internalTarget": (string) | null;
  "expiresAt": (string) | null;
  "blocks": Array<ContentHeadingBlockResponseDto | ContentParagraphBlockResponseDto | ContentAttachmentImageBlockResponseDto>;
  "internalNote": (string) | null;
};

export type CoreMemberListItemResponseDto = {
  "id": string;
  "personId": string;
  "roleTitle": string;
  "sortOrder": number;
  "version": number;
  "retiredAt": (string) | null;
  "createdAt": string;
  "updatedAt": string;
  "name": string;
  "center": (CenterSummaryResponseDto) | null;
};

export type CoreMemberListResponseDto = {
  "items": Array<CoreMemberListItemResponseDto>;
};

export type CoreMemberRecordResponseDto = {
  "id": string;
  "personId": string;
  "roleTitle": string;
  "sortOrder": number;
  "version": number;
  "retiredAt": (string) | null;
  "createdAt": string;
  "updatedAt": string;
};

export type CreateActivityDto = {
  "expectedVersion": number;
  "centerId": string;
  "slug": string;
  "title": string;
  "type": string;
  "date": string;
  "time": string;
  "location": string;
  "summary": string;
  "content": string;
  "agenda": Array<string>;
  "registrationEndAt": string;
  "coverAttachmentId"?: string;
  "detailAttachmentIds"?: Array<string>;
};

export type CreateAdjustmentProposalDto = {
  "expectedVersion": number;
  "targetCenterId": string;
};

export type CreateContentDto = {
  "centerId": string;
  "kind": "flash" | "article" | "notice";
  "slug": string;
  "title": string;
  "summary"?: string;
  "tag"?: string;
  "internalTarget"?: string;
  "expiresAt"?: string;
  "blocks"?: Array<Record<string, unknown>>;
  "internalNote"?: string;
};

export type CreateCoreMemberDto = {
  "personId": string;
  "expectedMembershipVersion": number;
  "expectedCoreVersion"?: number;
  "roleTitle": string;
  "sortOrder": number;
};

export type CreateGalleryDto = {
  "expectedVersion": number;
  "centerId": string;
  "slug": string;
  "title": string;
  "category"?: "event_documentary" | "visual_creation" | "video_work" | "people_stories";
  "year"?: string;
  "description": string;
  "team"?: string;
  "coverAttachmentId"?: string;
  "detailAttachmentIds"?: Array<string>;
};

export type CreateGrowthRecordDto = {
  "expectedVersion": number;
  "title": string;
  "category": string;
  "reflection": string;
  "occurredOn": string;
};

export type CreateHelpDto = {
  "slug": string;
  "title": string;
  "summary": string;
  "body": string;
  "expectedVersion": number;
};

export type CreateHonorDto = {
  "expectedVersion": number;
  "title": string;
  "type": string;
  "description": string;
  "awardedAt": string;
  "proofReference": string;
  "publicConsent": boolean;
};

export type CreateManagedMemberDto = {
  "name": string;
  "studentId": string;
  "grade": string;
  "className": string;
  "identity": "preparatory" | "formal-member";
  "centerId"?: string;
  "duty"?: "REGULAR" | "CORE";
  "baizeDirection"?: "HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT";
};

export type CreateMediaAttachmentDto = {
  "uploadId": string;
  "expectedUploadVersion": number;
  "ownerType": "content" | "portal_home" | "portal_join" | "project" | "activity" | "gallery" | "resource";
  "ownerId": string;
  "centerId": string;
  "role": "cover" | "detail" | "visual";
  "kind": "image" | "video";
  "title": string;
  "caption": string;
  "alt": string;
  "aspect": "landscape" | "portrait" | "wide";
  "sortOrder": number;
};

export type CreateMemberAvatarUploadIntentDto = {
  "expectedVersion": number;
  "centerId"?: string;
  "fileName": string;
  "mimeType": "image/jpeg" | "image/png" | "image/webp";
  "byteSize": number;
  "checksumSha256": string;
  "kind": "image";
};

export type CreateMembershipDto = {
  "personId": string;
  "centerId": string;
  "duty": "REGULAR" | "CORE";
  "expectedPersonVersion": number;
};

export type CreateProjectDto = {
  "expectedVersion": number;
  "centerId": string;
  "slug": string;
  "title": string;
  "year": string;
  "description": string;
  "achievement": string;
  "projectStage": string;
  "challenge": string;
  "solution": string;
  "category": "CAMPUS_SERVICE" | "AI_APPLICATION" | "SMART_HARDWARE" | "INDUSTRY_DIGITALIZATION";
  "displayOrder"?: (number) | null;
  "memberPersonIds": Array<string>;
  "coverAttachmentId"?: string;
  "detailAttachmentIds"?: Array<string>;
};

export type CreateRecruitmentBatchDto = {
  "name": string;
  "startAt": string;
  "endAt": string;
  "timezone": "Asia/Shanghai";
  "openCenterIds": Array<string>;
  "responsibleAccountIds": Array<string>;
};

export type CreateRegistrationDto = {
  "expectedVersion": number;
};

export type CreateResourceDto = {
  "expectedVersion": number;
  "centerId": string;
  "slug": string;
  "title": string;
  "summary": string;
  "kind": "ARTICLE" | "PDF" | "DOCX" | "ARCHIVE" | "EXTERNAL";
  "format": "WEB" | "PDF" | "DOCX" | "ZIP" | "EXTERNAL";
  "access": "PUBLIC" | "MEMBER";
  "availability": "AVAILABLE" | "UNAVAILABLE";
  "versionLabel": string;
  "content": string;
};

export type CreateResourceVersionDto = {
  "expectedVersion": number;
  "versionLabel": string;
  "content": string;
  "access": "PUBLIC" | "MEMBER";
  "availability": "AVAILABLE" | "UNAVAILABLE";
  "attachmentId"?: string;
};

export type CreateUploadIntentDto = {
  "expectedVersion": number;
  "centerId": string;
  "fileName": string;
  "mimeType": "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm";
  "byteSize": number;
  "checksumSha256": string;
  "kind": "image" | "video";
};

export type CurrentOrganizationPermissionResponseDto = {
  "accountId": string;
  "personId": string;
  "adminLevel": "MEMBER" | "ADMIN" | "OWNER";
  "adminCenterId": (string) | null;
  "version": number;
};

export type CurrentSessionResponseDto = {
  "account": SessionAccountResponseDto;
  "person": SessionPersonResponseDto;
  "mustChangePassword": boolean;
};

export type DashboardAssessmentSummaryDto = {
  "total": number;
  "pending": number;
  "adjustmentPending": number;
  "canPublish": boolean;
};

export type DashboardContentSummaryDto = {
  "inReview": number;
  "pendingPublication": number;
  "recent": Array<DashboardRecentContentDto>;
};

export type DashboardMetricDto = {
  "id": string;
  "label": string;
  "value": number;
  "detail"?: (Record<string, unknown>) | null;
  "target": DashboardTargetDto;
};

export type DashboardOperatorDto = {
  "id": string;
  "name": string;
  "level": "member" | "admin" | "owner";
  "centerRole": (string) | null;
  "capabilities": Array<"recruitment.batch.manage" | "recruitment.assessment.edit" | "recruitment.result.publish" | "content.create" | "content.review" | "content.publish" | "portal.configure" | "portal.publish" | "member.create">;
};

export type DashboardRecentContentDto = {
  "id": string;
  "kind": "flash" | "article" | "notice";
  "title": string;
  "status": "draft" | "in-review" | "pending-publication" | "published" | "unpublished";
  "updatedAt": string;
  "target": DashboardTargetDto;
};

export type DashboardRecruitmentActionDto = {
  "capability": "recruitment.batch.manage" | "recruitment.assessment.edit" | "recruitment.result.publish" | "content.create" | "content.review" | "content.publish" | "portal.configure" | "portal.publish" | "member.create";
  "target": DashboardTargetDto;
};

export type DashboardRecruitmentBatchDto = {
  "id": string;
  "name": string;
  "status": "draft" | "upcoming" | "open" | "paused" | "closed" | "archived";
  "startAt": string;
  "endAt": string;
};

export type DashboardRecruitmentContextDto = {
  "batch": DashboardRecruitmentBatchDto;
  "selection": "open" | "paused" | "unfinished-work" | "upcoming";
  "applicationCount": number;
  "assessment": DashboardAssessmentSummaryDto;
  "actions": Array<DashboardRecruitmentActionDto>;
};

export type DashboardResponseDto = {
  "schemaVersion": 1;
  "generatedAt": string;
  "timezone": "Asia/Shanghai";
  "operator": DashboardOperatorDto;
  "metrics": Array<DashboardMetricDto>;
  "tasks": Array<DashboardTaskDto>;
  "recruitment": (DashboardRecruitmentContextDto) | null;
  "content": DashboardContentSummaryDto;
  "portal": (PortalDashboardSummaryDto) | null;
  "media": MediaDashboardSummaryDto;
  "warnings": Array<DashboardWarningDto>;
};

export type DashboardTargetDto = {
  "module": "recruitment" | "content" | "portal" | "media" | "member";
  "action": "overview" | "manage" | "applications" | "assess" | "publish-results" | "review" | "publish" | "view" | "create" | "list" | "automation" | "configure" | "health";
  "resourceType"?: (Record<string, unknown>) | null;
  "resourceId"?: (Record<string, unknown>) | null;
};

export type DashboardTaskDto = {
  "id": string;
  "title": string;
  "meta"?: string;
  "priority": "urgent" | "warning" | "normal";
  "target": DashboardTargetDto;
  "capability"?: "recruitment.batch.manage" | "recruitment.assessment.edit" | "recruitment.result.publish" | "content.create" | "content.review" | "content.publish" | "portal.configure" | "portal.publish" | "member.create";
};

export type DashboardWarningDto = {
  "code": string;
  "level": "error" | "warning";
  "title": string;
  "detail"?: (Record<string, unknown>) | null;
  "count": number;
  "target": DashboardTargetDto;
};

export type DecideAdjustmentDto = {
  "expectedVersion": number;
  "decision": "ADMITTED" | "NOT_ADMITTED";
  "targetCenterId"?: string;
};

export type DecideRegistrationDto = {
  "expectedVersion": number;
  "status": "accepted" | "rejected";
  "reason": string;
};

export type DeletedGrowthRecordResponseDto = {
  "id": string;
  "deleted": boolean;
  "version": number;
};

export type DeleteGrowthRecordDto = {
  "expectedVersion": number;
};

export type DemoteOwnerDto = {
  "confirmed"?: boolean;
  "expectedVersion": number;
  "adminCenterId": string;
};

export type ErrorResponse = {
  "code": string;
  "message": string;
  "requestId": string;
  "fieldErrors"?: Record<string, string>;
};

export type GalleryCommandDto = {
  "expectedVersion": number;
};

export type GalleryOfflineDto = {
  "expectedVersion": number;
  "reason": string;
};

export type GrantAdminQualificationDto = {
  "confirmed"?: boolean;
  "expectedVersion": number;
  "adminCenterId": string;
};

export type GrowthRecordListResponseDto = {
  "items": Array<GrowthRecordResponseDto>;
};

export type GrowthRecordResponseDto = {
  "id": string;
  "title": string;
  "category": string;
  "reflection": string;
  "occurredOn": string;
  "version": number;
  "createdAt": string;
  "updatedAt": string;
};

export type HandoverCenterMinisterDto = {
  "expectedOutgoingPositionVersion": number;
  "expectedIncomingAccountVersion": number;
  "expectedIncomingMembershipVersion": number;
  "reason"?: string;
};

export type HealthLiveResponseDto = {
  "status": "ok";
  "service": "hsd-api";
};

export type HealthReadyResponseDto = {
  "status": "ready";
  "database": "up";
};

export type HelpRevisionResponseDto = {
  "revisionNumber": number;
  "title": string;
  "summary": string;
  "body": string;
};

export type HonorCommandDto = {
  "expectedVersion": number;
};

export type LoginDto = {
  "account": string;
  "password": string;
  "rememberMe"?: boolean;
};

export type ManagedAccountSummaryResponseDto = {
  "id": string;
  "username": string;
  "status": "ENABLED" | "DISABLED";
  "adminLevel": "MEMBER" | "ADMIN" | "OWNER";
  "adminCenterId": (string) | null;
  "mustChangePassword": boolean;
  "version": number;
};

export type ManagedMemberCreatedResponseDto = {
  "personId": string;
  "accountId": string;
  "username": string;
  "mustChangePassword": boolean;
};

export type ManagedMemberListResponseDto = {
  "items": Array<ManagedMemberResponseDto>;
};

export type ManagedMemberResponseDto = {
  "id": string;
  "name": string;
  "studentId": string;
  "grade": string;
  "className": string;
  "contact": (string) | null;
  "bio": (string) | null;
  "biography": (string) | null;
  "status": "PREPARATORY" | "FORMAL_MEMBER" | "NOT_ADMITTED";
  "baizeDirection": ("HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT") | null;
  "avatar": AvatarResponseDto;
  "publicProfileEnabled": boolean;
  "version": number;
  "membership": (MembershipResponseDto) | null;
  "account": (ManagedAccountSummaryResponseDto) | null;
  "coreMember": (CoreMemberRecordResponseDto) | null;
  "positions": Array<OrganizationPositionResponseDto>;
};

export type MediaAttachmentResponseDto = {
  "id": string;
  "ownerType": "content" | "portal_home" | "portal_join" | "project" | "activity" | "gallery" | "resource";
  "ownerId": string;
  "centerId": string;
  "role": "cover" | "detail" | "visual";
  "kind": "image" | "video";
  "title": string;
  "caption": string;
  "alt": string;
  "aspect": "landscape" | "portrait" | "wide";
  "sortOrder": number;
  "status": "ready" | "failed";
  "version": number;
  "uploadVersion": number;
  "url": string;
  "thumbnailUrl"?: string;
};

export type MediaDashboardSummaryDto = {
  "total": number;
  "processing": number;
  "failed": number;
  "reviewPending": number;
};

export type MemberActivityRegistrationListResponseDto = {
  "page": number;
  "pageSize": number;
  "total": number;
  "totalPages": number;
  "items": Array<MemberActivityRegistrationResponseDto>;
};

export type MemberActivityRegistrationResponseDto = {
  "id": string;
  "activityId": string;
  "status": "registered" | "accepted" | "rejected" | "cancelled";
  "version": number;
  "createdAt": string;
  "updatedAt": string;
  "decidedAt": (string) | null;
  "cancelledAt": (string) | null;
  "activity": MemberActivitySummaryResponseDto;
};

export type MemberActivitySummaryResponseDto = {
  "slug": string;
  "title": string;
  "type": string;
  "date": string;
  "time": string;
  "location": string;
  "summary": string;
  "registrationEndAt": (string) | null;
  "publishedAt": (string) | null;
  "cover": (Record<string, unknown>) | null;
  "available": boolean;
};

export type MemberAvatarUploadResponseDto = {
  "id": string;
  "centerId": string;
  "createdBy": UploadActorResponseDto;
  "fileName": string;
  "mimeType": string;
  "byteSize": number;
  "kind": "image" | "video";
  "status": "uploading" | "processing" | "ready" | "failed" | "expired";
  "version": number;
  "expiresAt": string;
  "failureCode": (string) | null;
  "completedAt": (string) | null;
  "createdAt": string;
  "updatedAt": string;
  "assetId": string;
};

export type MemberProfileResponseDto = {
  "id": string;
  "name": string;
  "studentId": string;
  "grade": string;
  "className": string;
  "contact": (string) | null;
  "bio": (string) | null;
  "biography": (string) | null;
  "status": "PREPARATORY" | "FORMAL_MEMBER" | "NOT_ADMITTED";
  "baizeDirection": ("HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT") | null;
  "avatar": AvatarResponseDto;
  "publicProfileEnabled": boolean;
  "version": number;
  "membership": (MembershipResponseDto) | null;
};

export type MembershipResponseDto = {
  "duty": "REGULAR" | "CORE";
  "version": number;
  "center": CenterSummaryResponseDto;
};

export type MyRecruitmentApplicationEnvelopeDto = {
  "application": (MyRecruitmentApplicationResponseDto) | null;
};

export type MyRecruitmentApplicationResponseDto = {
  "id": string;
  "batchId": string;
  "contact": string;
  "baizeDirection": ("HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT") | null;
  "acceptsAdjustment": boolean;
  "status": "SUBMITTED" | "WITHDRAWN" | "PROCESSING" | "COMPLETED";
  "version": number;
  "submittedAt": string;
  "withdrawnAt": (string) | null;
  "locked": boolean;
  "preferences": Array<RecruitmentApplicationPreferenceDto>;
};

export type MyRecruitmentResultDto = {
  "id": string;
  "batch": RecruitmentResultBatchDto;
  "decision": "ADMITTED" | "NOT_ADMITTED";
  "finalCenter": (AssessmentCenterDto) | null;
  "admissionSource": ("FIRST_CHOICE" | "ADJUSTMENT") | null;
  "baizeDirection": ("HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT") | null;
  "preferences": Array<AssessmentPreferenceDto>;
  "responsibleContacts": Array<RecruitmentResponsibleContactDto>;
  "publishedAt": string;
};

export type MyRecruitmentResultListDto = {
  "items": Array<MyRecruitmentResultDto>;
};

export type Object = Record<string, unknown>;

export type OrganizationMembershipResponseDto = {
  "id": string;
  "personId": string;
  "centerId": string;
  "duty": "REGULAR" | "CORE";
  "source": "DIRECT_ENTRY" | "RECRUITMENT" | "ADJUSTMENT";
  "version": number;
  "joinedAt": string;
  "endedAt": (string) | null;
  "center": CenterSummaryResponseDto;
};

export type OrganizationPositionResponseDto = {
  "id": string;
  "personId": string;
  "type": "ALLIANCE_OWNER" | "CENTER_MINISTER" | "PROJECT_LEAD";
  "centerId": (string) | null;
  "projectId": (string) | null;
  "version": number;
  "appointedAt": string;
};

export type OwnerRoleQualificationDto = {
  "confirmed"?: boolean;
  "expectedVersion": number;
};

export type PortalCatalogSnapshotResponseDto = {
  "slug": string;
  "title": string;
  "summary"?: (string) | null;
  "category"?: string;
  "year"?: string;
  "description"?: string;
  "achievement"?: string;
  "projectStage"?: string;
  "challenge"?: string;
  "solution"?: string;
  "members"?: Array<Record<string, unknown>>;
  "displayOrder"?: (number) | null;
  "memberCount"?: number;
  "cover"?: (Record<string, unknown>) | null;
  "details"?: Array<Record<string, unknown>>;
  "available"?: boolean;
  "type"?: string;
  "date"?: string;
  "time"?: string;
  "location"?: string;
  "content"?: string;
  "agenda"?: Array<string>;
  "registrationEndAt"?: string;
  "registrationOpen"?: boolean;
  "versionLabel"?: string;
  "access"?: "public" | "member";
  "kind"?: "article" | "pdf" | "docx" | "archive" | "external";
  "format"?: "web" | "pdf" | "docx" | "zip" | "external";
  "variant"?: Record<string, unknown>;
};

export type PortalConfigurationEntryDto = {
  "slot": "flash" | "news" | "projects" | "activities" | "gallery" | "resources";
  "position": number;
  "entityType"?: "flash" | "article" | "notice" | "project" | "activity" | "gallery" | "resource";
  "sourceId"?: string;
  "contentSlug"?: string;
};

export type PortalDashboardSummaryDto = {
  "draftRevision": number;
  "publishedRevision": number;
  "isDirty": boolean;
};

export type PortalResolvedEntryResponseDto = {
  "slot": "flash" | "news" | "projects" | "activities" | "gallery" | "resources";
  "position": number;
  "content": (PublicContentResponseDto | PortalCatalogSnapshotResponseDto) | null;
};

export type PortalVisualDto = {
  "attachmentId"?: string;
  "alt"?: string;
};

export type PortalVisualsDto = {
  "home"?: PortalVisualDto;
  "join"?: PortalVisualDto;
};

export type PreparatoryMemberImportDto = {
  "csv": string;
};

export type PreparatoryMemberImportReportResponseDto = {
  "mode": "dry-run" | "commit";
  "totalRows": number;
  "readyRows": number;
  "createdRows": number;
  "duplicateRows": number;
  "invalidRows": number;
  "failedRows": number;
  "rows": Array<PreparatoryMemberImportRowResponseDto>;
};

export type PreparatoryMemberImportRowResponseDto = {
  "rowNumber": number;
  "studentId": string;
  "status": "ready" | "created" | "duplicate" | "invalid" | "failed";
  "code"?: string;
  "message"?: string;
};

export type ProjectCommandDto = {
  "expectedVersion": number;
};

export type ProjectOfflineDto = {
  "expectedVersion": number;
  "reason": string;
};

export type PromoteManagedMemberDto = {
  "confirmed": boolean;
  "expectedVersion": number;
  "centerId": string;
  "duty": "REGULAR" | "CORE";
  "baizeDirection"?: "HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT";
};

export type PublicActivityListResponseDto = {
  "items": Array<PublicActivityResponseDto>;
  "page"?: number;
  "pageSize"?: number;
  "total"?: number;
};

export type PublicActivityResponseDto = {
  "slug": string;
  "title": string;
  "type": string;
  "date": string;
  "time": string;
  "location": string;
  "summary": string;
  "content": string;
  "agenda": Array<string>;
  "registrationEndAt": string;
  "cover": Record<string, unknown>;
  "details": Array<Record<string, unknown>>;
  "available": boolean;
  "registrationOpen": boolean;
};

export type PublicCenterDetailResponseDto = {
  "publicSlug": string;
  "name": string;
  "publicMemberCount": number;
  "publicCoreMemberCount": number;
  "ministers": Array<PublicMemberResponseDto>;
  "members": Array<PublicMemberResponseDto>;
  "coreMembers": Array<PublicMemberResponseDto>;
};

export type PublicCenterIdentityResponseDto = {
  "publicSlug": string;
  "name": string;
};

export type PublicCenterListResponseDto = {
  "allianceOwners": Array<PublicMemberResponseDto>;
  "items": Array<PublicCenterSummaryResponseDto>;
};

export type PublicCenterSummaryResponseDto = {
  "publicSlug": string;
  "name": string;
  "publicMemberCount": number;
  "publicCoreMemberCount": number;
};

export type PublicContentListResponseDto = {
  "items": Array<PublicContentResponseDto>;
};

export type PublicContentResponseDto = {
  "slug": string;
  "kind": "flash" | "article" | "notice";
  "title": string;
  "summary": (string) | null;
  "tag": (string) | null;
  "expiresAt": (string) | null;
  "blocks": Array<ContentHeadingBlockResponseDto | ContentParagraphBlockResponseDto | ContentImageBlockResponseDto>;
  "publishedAt": (string) | null;
};

export type PublicCoreRoleResponseDto = {
  "title": string;
  "order": number;
};

export type PublicGalleryListResponseDto = {
  "items": Array<PublicGalleryResponseDto>;
  "page"?: number;
  "pageSize"?: number;
  "total"?: number;
};

export type PublicGalleryMediaResponseDto = {
  "kind": "image" | "video";
  "role": "cover" | "detail";
  "title": string;
  "caption": string;
  "alt": string;
  "aspect": "wide" | "landscape" | "portrait";
  "sortOrder": number;
  "url": string;
  "thumbnailUrl"?: string;
};

export type PublicGalleryResponseDto = {
  "slug": string;
  "title": string;
  "category": string;
  "year": string;
  "description": string;
  "cover": PublicGalleryMediaResponseDto;
  "details": Array<PublicGalleryMediaResponseDto>;
  "available": boolean;
};

export type PublicHelpListResponseDto = {
  "items": Array<PublicHelpResponseDto>;
};

export type PublicHelpResponseDto = {
  "slug": string;
  "title": string;
  "summary": string;
  "body": string;
  "publishedAt": string;
};

export type PublicHomepageStatsResponseDto = {
  "formalMembers": number;
  "coreMembers": number;
  "activeCenters": number;
  "publishedProjects": number;
};

export type PublicHonorResponseDto = {
  "id": string;
  "title": string;
  "type": string;
  "description": string;
  "awardedAt": string;
  "awardedDatePrecision": "day" | "month" | "year" | "unknown";
  "awardedDateLabel": string;
  "featured": boolean;
};

export type PublicMemberListResponseDto = {
  "items": Array<PublicMemberResponseDto>;
};

export type PublicMemberResponseDto = {
  "publicId": string;
  "name": string;
  "grade": string;
  "className": string;
  "avatar": AvatarResponseDto;
  "center": PublicCenterIdentityResponseDto;
  "duty": "REGULAR" | "CORE";
  "honors": Array<PublicHonorResponseDto>;
  "positions": Array<PublicOrganizationPositionResponseDto>;
  "bio"?: string;
  "biography"?: string;
  "baizeDirection"?: "HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT";
  "coreRole"?: PublicCoreRoleResponseDto;
};

export type PublicOrganizationPositionResponseDto = {
  "type": "ALLIANCE_OWNER" | "CENTER_MINISTER" | "PROJECT_LEAD";
  "centerPublicSlug"?: string;
};

export type PublicPortalResponseDto = {
  "publishedAt": (string) | null;
  "entries": Array<PortalResolvedEntryResponseDto>;
  "visuals"?: Record<string, unknown>;
};

export type PublicProjectListResponseDto = {
  "items": Array<PublicProjectResponseDto>;
};

export type PublicProjectResponseDto = {
  "slug": string;
  "displayOrder": (number) | null;
  "title": string;
  "category": string;
  "year": string;
  "description": string;
  "achievement": string;
  "projectStage": string;
  "challenge": string;
  "solution": string;
  "members": Array<Record<string, unknown>>;
  "memberCount": number;
  "cover": (Record<string, unknown>) | null;
  "details": Array<Record<string, unknown>>;
  "available": boolean;
};

export type PublicRecruitmentBatchDto = {
  "effectiveStatus": "draft" | "upcoming" | "open" | "paused" | "closed" | "archived";
  "effectiveStatusReason": "draft" | "before-start" | "within-window" | "after-end" | "force-open" | "paused" | "force-closed" | "archived";
  "id": string;
  "name": string;
  "startAt": string;
  "endAt": string;
  "timezone": "Asia/Shanghai";
  "openCenters": Array<PublicRecruitmentCenterDto>;
};

export type PublicRecruitmentBatchEnvelopeDto = {
  "batch": (PublicRecruitmentBatchDto) | null;
};

export type PublicRecruitmentCenterDto = {
  "slug": string;
  "name": string;
};

export type PublicResourceListResponseDto = {
  "items": Array<PublicResourceSummaryDto>;
};

export type PublicResourceResponseDto = {
  "slug": string;
  "title": string;
  "summary": string;
  "kind": "article" | "pdf" | "docx" | "archive" | "external";
  "format": "web" | "pdf" | "docx" | "zip" | "external";
  "versionLabel": string;
  "access": "public" | "member";
  "content": string;
  "variant"?: Record<string, unknown>;
};

export type PublicResourceSummaryDto = {
  "slug": string;
  "title": string;
  "summary": string;
  "kind": "article" | "pdf" | "docx" | "archive" | "external";
  "format": "web" | "pdf" | "docx" | "zip" | "external";
  "versionLabel": string;
  "access": "public" | "member";
};

export type PublicTimelineItemDto = {
  "entityType": "activity" | "article" | "notice";
  "slug": string;
  "title": string;
  "summary": (string) | null;
  "publishedAt": (string) | null;
  "eventAt": (string) | null;
  "available": boolean;
  "media"?: (Record<string, unknown>) | null;
  "to": string;
};

export type PublicTimelineListResponseDto = {
  "items": Array<PublicTimelineItemDto>;
  "page": number;
  "pageSize": number;
  "total": number;
};

export type PublishAssessmentDto = {
  "expectedVersion": number;
  "confirmed": boolean;
  "reason"?: string;
};

export type PublishContentDto = {
  "expectedVersion": number;
  "confirmed": boolean;
};

export type PublishedPortalConfigurationResponseDto = {
  "version": number;
  "entries": Array<PortalResolvedEntryResponseDto>;
  "visuals": Record<string, unknown>;
  "publishedAt": string;
};

export type PublishHelpDto = {
  "expectedVersion": number;
  "confirmed": boolean;
};

export type PublishPortalConfigurationDto = {
  "expectedVersion": number;
  "confirmed": boolean;
};

export type ReasonedContentCommandDto = {
  "expectedVersion": number;
  "reason": string;
};

export type RecordRoundResultDto = {
  "expectedVersion": number;
  "round": number;
  "outcome": "PASSED" | "FAILED";
  "internalNote"?: string;
};

export type RecruitmentApplicantSnapshotDto = {
  "name": string;
  "studentId": string;
  "grade": string;
  "className": string;
  "contact": string;
};

export type RecruitmentApplicationCenterDto = {
  "id": string;
  "slug": string;
  "name": string;
};

export type RecruitmentApplicationPreferenceDto = {
  "rank": 1 | 2 | 3;
  "center": RecruitmentApplicationCenterDto;
};

export type RecruitmentBatchCommandDto = {
  "expectedVersion": number;
  "confirmed"?: boolean;
  "reason"?: string;
};

export type RecruitmentBatchLifecycleEventDto = {
  "id": string;
  "actor": SafeAuditActorDto;
  "action": "recruitment.batch.created" | "recruitment.batch.updated" | "recruitment.batch.published" | "recruitment.batch.opened" | "recruitment.batch.paused" | "recruitment.batch.resumed" | "recruitment.batch.closed" | "recruitment.batch.reopened" | "recruitment.batch.archived";
  "target": RecruitmentBatchLifecycleTargetDto;
  "before": (RecruitmentBatchLifecycleSnapshotDto) | null;
  "after": (RecruitmentBatchLifecycleSnapshotDto) | null;
  "reason": (string) | null;
  "createdAt": string;
};

export type RecruitmentBatchLifecycleEventListDto = {
  "page": number;
  "pageSize": number;
  "total": number;
  "items": Array<RecruitmentBatchLifecycleEventDto>;
};

export type RecruitmentBatchLifecycleSnapshotDto = {
  "name"?: string | number | boolean | null | Array<string | number | boolean | null>;
  "startAt"?: string | number | boolean | null | Array<string | number | boolean | null>;
  "endAt"?: string | number | boolean | null | Array<string | number | boolean | null>;
  "timezone"?: string | number | boolean | null | Array<string | number | boolean | null>;
  "lifecycleStatus"?: string | number | boolean | null | Array<string | number | boolean | null>;
  "manualOverride"?: string | number | boolean | null | Array<string | number | boolean | null>;
  "version"?: string | number | boolean | null | Array<string | number | boolean | null>;
  "openCenterIds"?: string | number | boolean | null | Array<string | number | boolean | null>;
  "responsibleAccountIds"?: string | number | boolean | null | Array<string | number | boolean | null>;
};

export type RecruitmentBatchLifecycleTargetDto = {
  "type": "RecruitmentBatch";
  "id": string;
};

export type RecruitmentBatchStatusDto = {
  "effectiveStatus": "draft" | "upcoming" | "open" | "paused" | "closed" | "archived";
  "effectiveStatusReason": "draft" | "before-start" | "within-window" | "after-end" | "force-open" | "paused" | "force-closed" | "archived";
};

export type RecruitmentCenterResponseDto = {
  "id": string;
  "slug": string;
  "name": string;
  "active": boolean;
};

export type RecruitmentPreferenceInputDto = {
  "centerId": string;
  "rank": number;
};

export type RecruitmentResponsibleContactDto = {
  "personId": string;
  "name": string;
  "position": "CENTER_MINISTER";
  "displayContact": string;
};

export type RecruitmentResponsibleContactValueDto = {
  "personId": string;
  "contact": string;
};

export type RecruitmentResultBatchDto = {
  "id": string;
  "name": string;
};

export type RegistrationCommandDto = {
  "expectedVersion": number;
};

export type RegistrationListResponseDto = {
  "items": Array<RegistrationResponseDto>;
};

export type RegistrationResponseDto = {
  "id": string;
  "activityId": string;
  "status": "registered" | "accepted" | "rejected" | "cancelled";
  "version": number;
  "createdAt": string;
  "updatedAt": string;
  "decidedAt": (string) | null;
  "cancelledAt": (string) | null;
  "decisionReason": (string) | null;
  "memberName"?: string;
};

export type ResourceCommandDto = {
  "expectedVersion": number;
};

export type ResourceOfflineDto = {
  "expectedVersion": number;
  "reason": string;
};

export type RetireCoreMemberDto = {
  "expectedVersion": number;
  "confirmed": boolean;
};

export type RetiredCoreMemberResponseDto = {
  "personId": string;
  "retired": boolean;
  "coreMember": CoreMemberRecordResponseDto;
};

export type RetiredOrganizationMembershipResponseDto = {
  "personId": string;
  "retired": boolean;
  "membership": OrganizationMembershipResponseDto;
};

export type RetireMembershipDto = {
  "expectedVersion": number;
  "confirmed": boolean;
};

export type RevokeOrganizationPositionDto = {
  "expectedPositionVersion": number;
  "reason"?: string;
};

export type SafeAuditActorDto = {
  "type": "account" | "system";
  "accountId": (string) | null;
  "username": (string) | null;
  "displayName": string;
};

export type SafeAuditEventDto = {
  "id": string;
  "actor": SafeAuditActorDto;
  "action": string;
  "target": SafeAuditTargetDto;
  "before": (Record<string, string | number | boolean | null | Array<string | number | boolean | null>>) | null;
  "after": (Record<string, string | number | boolean | null | Array<string | number | boolean | null>>) | null;
  "reason": (string) | null;
  "createdAt": string;
};

export type SafeAuditEventListDto = {
  "page": number;
  "pageSize": number;
  "total": number;
  "items": Array<SafeAuditEventDto>;
};

export type SafeAuditTargetDto = {
  "type": string;
  "id": string;
};

export type SavePortalConfigurationDto = {
  "expectedVersion": number;
  "entries": Array<PortalConfigurationEntryDto>;
  "visuals"?: PortalVisualsDto;
};

export type SessionAccountResponseDto = {
  "id": string;
  "adminLevel": "MEMBER" | "ADMIN" | "OWNER";
  "adminCenterId": (string) | null;
  "capabilities": Array<string>;
};

export type SessionPersonResponseDto = {
  "id": string;
  "name": string;
  "status": "PREPARATORY" | "FORMAL_MEMBER" | "NOT_ADMITTED";
};

export type SetCoreMembershipDto = {
  "core": boolean;
  "expectedMembershipVersion": number;
};

export type SubmitApplicationDto = {
  "contact": string;
  "preferences": Array<RecruitmentPreferenceInputDto>;
  "baizeDirection"?: "HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT";
  "acceptsAdjustment": boolean;
};

export type UpdateActivityDto = {
  "centerId"?: string;
  "slug"?: string;
  "title"?: string;
  "type"?: string;
  "date"?: string;
  "time"?: string;
  "location"?: string;
  "summary"?: string;
  "content"?: string;
  "agenda"?: Array<string>;
  "registrationEndAt"?: string;
  "coverAttachmentId"?: string;
  "detailAttachmentIds"?: Array<string>;
  "expectedVersion": number;
};

export type UpdateApplicationDto = {
  "contact": string;
  "preferences": Array<RecruitmentPreferenceInputDto>;
  "baizeDirection"?: "HARMONYOS_DEVELOPMENT" | "BACKEND_ARCHITECTURE" | "AIGC_LARGE_MODEL" | "UI_UX_DESIGN" | "EMBEDDED_DEVELOPMENT";
  "acceptsAdjustment": boolean;
  "expectedVersion": number;
};

export type UpdateContentDto = {
  "expectedVersion": number;
  "title"?: string;
  "summary"?: string;
  "tag"?: string;
  "internalTarget"?: string;
  "expiresAt"?: string;
  "blocks"?: Array<Record<string, unknown>>;
  "internalNote"?: string;
};

export type UpdateCoreMemberDto = {
  "expectedVersion": number;
  "roleTitle"?: string;
  "sortOrder"?: number;
};

export type UpdateGalleryDto = {
  "centerId"?: string;
  "slug"?: string;
  "title"?: string;
  "category"?: "event_documentary" | "visual_creation" | "video_work" | "people_stories";
  "year"?: string;
  "description"?: string;
  "team"?: string;
  "coverAttachmentId"?: string;
  "detailAttachmentIds"?: Array<string>;
  "expectedVersion": number;
};

export type UpdateGrowthRecordDto = {
  "expectedVersion": number;
  "title": string;
  "category": string;
  "reflection": string;
  "occurredOn": string;
};

export type UpdateHelpDraftDto = {
  "title"?: string;
  "summary"?: string;
  "body"?: string;
  "expectedVersion": number;
};

export type UpdateHonorConsentDto = {
  "expectedVersion": number;
  "publicConsent": boolean;
};

export type UpdateManagedProfileDto = {
  "expectedVersion": number;
  "name"?: string;
  "grade"?: string;
  "className"?: string;
  "contact"?: string;
  "bio"?: string;
  "biography"?: string;
};

export type UpdateMediaAttachmentDto = {
  "expectedVersion": number;
  "title"?: string;
  "caption"?: string;
  "alt"?: string;
  "aspect"?: "landscape" | "portrait" | "wide";
  "sortOrder"?: number;
};

export type UpdateMembershipDto = {
  "expectedVersion": number;
  "duty"?: "REGULAR" | "CORE";
};

export type UpdateMyProfileDto = {
  "expectedVersion": number;
  "name"?: string;
  "grade"?: string;
  "className"?: string;
  "contact"?: string;
  "bio"?: string;
  "biography"?: string;
  "publicProfileEnabled"?: boolean;
  "avatarAssetId"?: (string) | null;
};

export type UpdateProjectDto = {
  "centerId"?: string;
  "slug"?: string;
  "title"?: string;
  "year"?: string;
  "description"?: string;
  "achievement"?: string;
  "projectStage"?: string;
  "challenge"?: string;
  "solution"?: string;
  "category"?: "CAMPUS_SERVICE" | "AI_APPLICATION" | "SMART_HARDWARE" | "INDUSTRY_DIGITALIZATION";
  "displayOrder"?: (number) | null;
  "memberPersonIds"?: Array<string>;
  "coverAttachmentId"?: string;
  "detailAttachmentIds"?: Array<string>;
  "expectedVersion": number;
};

export type UpdateRecruitmentBatchDto = {
  "name"?: string;
  "startAt"?: string;
  "endAt"?: string;
  "timezone"?: "Asia/Shanghai";
  "openCenterIds"?: Array<string>;
  "responsibleAccountIds"?: Array<string>;
  "expectedVersion": number;
  "reason"?: string;
};

export type UploadActorResponseDto = {
  "id": string;
  "username": string;
  "displayName": string;
};

export type UploadDestinationDto = {
  "url": string;
  "headers": Record<string, string>;
};

export type UploadIntentResponseDto = {
  "id": string;
  "centerId": string;
  "createdBy": UploadActorResponseDto;
  "fileName": string;
  "mimeType": string;
  "byteSize": number;
  "kind": "image" | "video";
  "status": "uploading" | "processing" | "ready" | "failed" | "expired";
  "version": number;
  "expiresAt": string;
  "failureCode": (string) | null;
  "completedAt": (string) | null;
  "createdAt": string;
  "updatedAt": string;
  "upload": UploadDestinationDto;
};

export type UploadListResponseDto = {
  "page": number;
  "pageSize": number;
  "total": number;
  "items": Array<UploadResponseDto>;
};

export type UploadPartDto = {
  "partNumber": number;
  "etag": string;
};

export type UploadResponseDto = {
  "id": string;
  "centerId": string;
  "createdBy": UploadActorResponseDto;
  "fileName": string;
  "mimeType": string;
  "byteSize": number;
  "kind": "image" | "video";
  "status": "uploading" | "processing" | "ready" | "failed" | "expired";
  "version": number;
  "expiresAt": string;
  "failureCode": (string) | null;
  "completedAt": (string) | null;
  "createdAt": string;
  "updatedAt": string;
};

export type WithdrawApplicationDto = {
  "expectedVersion": number;
};

export const API_V1_PATHS = {
  authLogin: "/api/v1/auth/login",
  authSession: "/api/v1/auth/session",
  authChangePassword: "/api/v1/auth/change-password",
  memberProfile: "/api/v1/members/me",
  memberProfileUpdate: "/api/v1/members/me",
  memberHonorCreate: "/api/v1/members/me/honors",
  memberHonors: "/api/v1/members/me/honors",
  memberHonorConsent: "/api/v1/members/me/honors/{id}/consent",
  memberGrowthRecords: "/api/v1/members/me/growth-records",
  memberGrowthRecord: "/api/v1/members/me/growth-records/{id}",
  memberGrowthRecordCreate: "/api/v1/members/me/growth-records",
  memberGrowthRecordUpdate: "/api/v1/members/me/growth-records/{id}",
  memberGrowthRecordDelete: "/api/v1/members/me/growth-records/{id}",
  adminHonors: "/api/v1/admin/honors",
  adminHonorApprove: "/api/v1/admin/honors/{id}/approve",
  publicMembers: "/api/v1/public/members",
  publicMember: "/api/v1/public/members/{publicId}",
  adminMemberCreate: "/api/v1/admin/members",
  adminMembers: "/api/v1/admin/members",
  adminMemberPromote: "/api/v1/admin/members/{personId}/promote",
  adminAccounts: "/api/v1/admin/accounts",
  adminAuditEvents: "/api/v1/admin/audit-events",
  publicCenters: "/api/v1/public/centers",
  publicCenterDetail: "/api/v1/public/centers/{publicSlug}",
  publicHomepageStats: "/api/v1/public/homepage/stats",
  organizationCenters: "/api/v1/admin/organization/centers",
  organizationMembershipCreate: "/api/v1/admin/organization/memberships",
  organizationMembershipUpdate: "/api/v1/admin/organization/memberships/{personId}",
  organizationMembershipRetire: "/api/v1/admin/organization/memberships/{personId}/retire",
  organizationPositionAppointAllianceOwner: "/api/v1/admin/organization/positions/alliance-owners/{personId}",
  organizationPositionRevokeAllianceOwner: "/api/v1/admin/organization/positions/alliance-owners/{personId}/revoke",
  organizationPositionAppointCenterMinister: "/api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}",
  organizationPositionRevokeCenterMinister: "/api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}/revoke",
  organizationPositionHandoverCenterMinister: "/api/v1/admin/organization/positions/centers/{centerId}/ministers/{outgoingPersonId}/handover/{incomingPersonId}",
  organizationPositionSetCoreMembership: "/api/v1/admin/organization/positions/core-members/{personId}",
  organizationPositionGrantProjectLead: "/api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}",
  organizationPositionRevokeProjectLead: "/api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}/revoke",
  preparatoryImportDryRun: "/api/v1/admin/imports/preparatory-members/dry-run",
  preparatoryImportCommit: "/api/v1/admin/imports/preparatory-members/commit",
  adminPortalDraft: "/api/v1/admin/portal/configuration/draft",
  adminPortalSaveDraft: "/api/v1/admin/portal/configuration/draft",
  adminPortalPreview: "/api/v1/admin/portal/configuration/preview",
  adminPortalPublish: "/api/v1/admin/portal/configuration/publish",
  publicPortal: "/api/v1/public/portal",
  adminContentList: "/api/v1/admin/content",
  adminContentDetail: "/api/v1/admin/content/{contentId}",
  adminContentCreate: "/api/v1/admin/content",
  adminContentUpdate: "/api/v1/admin/content/{contentId}",
  adminContentPreview: "/api/v1/admin/content/{contentId}/preview",
  adminContentSubmitReview: "/api/v1/admin/content/{contentId}/submit-review",
  adminContentReturnDraft: "/api/v1/admin/content/{contentId}/return-draft",
  adminContentApprovePublication: "/api/v1/admin/content/{contentId}/approve-publication",
  adminContentPublish: "/api/v1/admin/content/{contentId}/publish",
  adminContentOffline: "/api/v1/admin/content/{contentId}/offline",
  adminUploads: "/api/v1/admin/uploads",
  adminUploadIntent: "/api/v1/admin/uploads/intents",
  adminUploadComplete: "/api/v1/admin/uploads/{uploadId}/complete",
  adminUploadStatus: "/api/v1/admin/uploads/{uploadId}",
  adminMediaAttachmentCreate: "/api/v1/admin/media/attachments",
  adminMediaAttachmentUpdate: "/api/v1/admin/media/attachments/{id}",
  recruitmentCurrent: "/api/v1/recruitment/current",
  recruitmentUpcoming: "/api/v1/recruitment/upcoming",
  recruitmentMyApplication: "/api/v1/recruitment/batches/{batchId}/my-application",
  recruitmentApplicationCreate: "/api/v1/recruitment/batches/{batchId}/applications",
  recruitmentApplicationUpdate: "/api/v1/recruitment/batches/{batchId}/applications/{applicationId}",
  recruitmentApplicationWithdraw: "/api/v1/recruitment/batches/{batchId}/applications/{applicationId}/withdraw",
  adminRecruitmentBatches: "/api/v1/admin/recruitment/batches",
  adminRecruitmentBatchCreate: "/api/v1/admin/recruitment/batches",
  adminRecruitmentBatch: "/api/v1/admin/recruitment/batches/{batchId}",
  adminRecruitmentBatchUpdate: "/api/v1/admin/recruitment/batches/{batchId}",
  adminRecruitmentBatchLifecycleEvents: "/api/v1/admin/recruitment/batches/{batchId}/lifecycle-events",
  adminRecruitmentApplications: "/api/v1/admin/recruitment/batches/{batchId}/applications",
  adminRecruitmentApplication: "/api/v1/admin/recruitment/batches/{batchId}/applications/{applicationId}",
  adminRecruitmentBatchPublish: "/api/v1/admin/recruitment/batches/{batchId}/publish",
  adminRecruitmentBatchOpenNow: "/api/v1/admin/recruitment/batches/{batchId}/open-now",
  adminRecruitmentBatchPause: "/api/v1/admin/recruitment/batches/{batchId}/pause",
  adminRecruitmentBatchResume: "/api/v1/admin/recruitment/batches/{batchId}/resume",
  adminRecruitmentBatchClose: "/api/v1/admin/recruitment/batches/{batchId}/close",
  adminRecruitmentBatchReopen: "/api/v1/admin/recruitment/batches/{batchId}/reopen",
  adminRecruitmentBatchArchive: "/api/v1/admin/recruitment/batches/{batchId}/archive",
  assessmentBatch: "/api/v1/admin/recruitment/batches/{batchId}/assessments",
  assessmentAdjustmentTargets: "/api/v1/admin/recruitment/batches/{batchId}/assessments/adjustment-targets",
  assessmentRoundResult: "/api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/round-results",
  assessmentAdjustmentProposal: "/api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-proposals",
  assessmentAdjustmentDecision: "/api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-decisions",
  assessmentAdvance: "/api/v1/admin/recruitment/batches/{batchId}/assessments/advance",
  assessmentPublish: "/api/v1/admin/recruitment/batches/{batchId}/assessments/publish",
  recruitmentResults: "/api/v1/recruitment/results/me",
  recruitmentResponsibleContact: "/api/v1/recruitment/results/me/{resultId}/responsible-contacts/{contactPersonId}",
  adminProjects: "/api/v1/admin/projects",
  adminProject: "/api/v1/admin/projects/{id}",
  adminProjectCreate: "/api/v1/admin/projects",
  adminProjectUpdate: "/api/v1/admin/projects/{id}",
  adminProjectPublish: "/api/v1/admin/projects/{id}/publish",
  adminProjectOffline: "/api/v1/admin/projects/{id}/offline",
  publicProjects: "/api/v1/public/projects",
  publicProject: "/api/v1/public/projects/{slug}",
  adminActivities: "/api/v1/admin/activities",
  adminActivity: "/api/v1/admin/activities/{id}",
  adminActivityCreate: "/api/v1/admin/activities",
  adminActivityUpdate: "/api/v1/admin/activities/{id}",
  adminActivityPublish: "/api/v1/admin/activities/{id}/publish",
  adminActivityRegistrationOpen: "/api/v1/admin/activities/{id}/registration/open",
  adminActivityRegistrationClose: "/api/v1/admin/activities/{id}/registration/close",
  adminActivityOffline: "/api/v1/admin/activities/{id}/offline",
  publicActivities: "/api/v1/public/activities",
  publicActivity: "/api/v1/public/activities/{slug}",
  publicTimeline: "/api/v1/public/timeline",
  activityRegistrationCreate: "/api/v1/activities/{slug}/registrations",
  activityRegistrationMine: "/api/v1/activities/{slug}/registration",
  activityRegistrationCancel: "/api/v1/registrations/{id}/cancel",
  adminActivityRegistrations: "/api/v1/admin/activities/{activityId}/registrations",
  adminActivityRegistrationDecision: "/api/v1/admin/registrations/{id}/decision",
  adminGalleries: "/api/v1/admin/galleries",
  adminGalleryCreate: "/api/v1/admin/galleries",
  adminGalleryUpdate: "/api/v1/admin/galleries/{id}",
  adminGalleryPublish: "/api/v1/admin/galleries/{id}/publish",
  adminGalleryOffline: "/api/v1/admin/galleries/{id}/offline",
  publicGalleries: "/api/v1/public/galleries",
  publicGallery: "/api/v1/public/galleries/{slug}",
  adminResources: "/api/v1/admin/resources",
  adminResource: "/api/v1/admin/resources/{id}",
  adminResourceCreate: "/api/v1/admin/resources",
  adminResourceVersionCreate: "/api/v1/admin/resources/{id}/versions",
  adminResourceVersions: "/api/v1/admin/resources/{id}/versions",
  adminResourcePublish: "/api/v1/admin/resources/{id}/publish",
  adminResourceOffline: "/api/v1/admin/resources/{id}/offline",
  publicResources: "/api/v1/public/resources",
  publicResource: "/api/v1/public/resources/{slug}",
  publicResourceVersion: "/api/v1/public/resources/{slug}/versions/{versionLabel}",
  adminHelp: "/api/v1/admin/help",
  adminHelpCreate: "/api/v1/admin/help",
  adminHelpUpdate: "/api/v1/admin/help/{id}/draft",
  adminHelpPublish: "/api/v1/admin/help/{id}/publish",
  publicHelp: "/api/v1/public/help",
  publicHelpDetail: "/api/v1/public/help/{slug}",
} as const;

export const API_OPERATIONS = {
  "POST /api/v1/auth/login": { method: "POST", path: "/api/v1/auth/login" },
  "GET /api/v1/auth/session": { method: "GET", path: "/api/v1/auth/session" },
  "POST /api/v1/auth/change-password": { method: "POST", path: "/api/v1/auth/change-password" },
  "GET /api/v1/members/me": { method: "GET", path: "/api/v1/members/me" },
  "PATCH /api/v1/members/me": { method: "PATCH", path: "/api/v1/members/me" },
  "POST /api/v1/members/me/honors": { method: "POST", path: "/api/v1/members/me/honors" },
  "GET /api/v1/members/me/honors": { method: "GET", path: "/api/v1/members/me/honors" },
  "PATCH /api/v1/members/me/honors/{id}/consent": { method: "PATCH", path: "/api/v1/members/me/honors/{id}/consent" },
  "GET /api/v1/members/me/growth-records": { method: "GET", path: "/api/v1/members/me/growth-records" },
  "GET /api/v1/members/me/growth-records/{id}": { method: "GET", path: "/api/v1/members/me/growth-records/{id}" },
  "POST /api/v1/members/me/growth-records": { method: "POST", path: "/api/v1/members/me/growth-records" },
  "PATCH /api/v1/members/me/growth-records/{id}": { method: "PATCH", path: "/api/v1/members/me/growth-records/{id}" },
  "DELETE /api/v1/members/me/growth-records/{id}": { method: "DELETE", path: "/api/v1/members/me/growth-records/{id}" },
  "GET /api/v1/admin/honors": { method: "GET", path: "/api/v1/admin/honors" },
  "POST /api/v1/admin/honors/{id}/approve": { method: "POST", path: "/api/v1/admin/honors/{id}/approve" },
  "GET /api/v1/public/members": { method: "GET", path: "/api/v1/public/members" },
  "GET /api/v1/public/members/{publicId}": { method: "GET", path: "/api/v1/public/members/{publicId}" },
  "POST /api/v1/admin/members": { method: "POST", path: "/api/v1/admin/members" },
  "GET /api/v1/admin/members": { method: "GET", path: "/api/v1/admin/members" },
  "POST /api/v1/admin/members/{personId}/promote": { method: "POST", path: "/api/v1/admin/members/{personId}/promote" },
  "GET /api/v1/admin/accounts": { method: "GET", path: "/api/v1/admin/accounts" },
  "GET /api/v1/admin/audit-events": { method: "GET", path: "/api/v1/admin/audit-events" },
  "GET /api/v1/public/centers": { method: "GET", path: "/api/v1/public/centers" },
  "GET /api/v1/public/centers/{publicSlug}": { method: "GET", path: "/api/v1/public/centers/{publicSlug}" },
  "GET /api/v1/public/homepage/stats": { method: "GET", path: "/api/v1/public/homepage/stats" },
  "GET /api/v1/admin/organization/centers": { method: "GET", path: "/api/v1/admin/organization/centers" },
  "POST /api/v1/admin/organization/memberships": { method: "POST", path: "/api/v1/admin/organization/memberships" },
  "PATCH /api/v1/admin/organization/memberships/{personId}": { method: "PATCH", path: "/api/v1/admin/organization/memberships/{personId}" },
  "POST /api/v1/admin/organization/memberships/{personId}/retire": { method: "POST", path: "/api/v1/admin/organization/memberships/{personId}/retire" },
  "POST /api/v1/admin/organization/positions/alliance-owners/{personId}": { method: "POST", path: "/api/v1/admin/organization/positions/alliance-owners/{personId}" },
  "POST /api/v1/admin/organization/positions/alliance-owners/{personId}/revoke": { method: "POST", path: "/api/v1/admin/organization/positions/alliance-owners/{personId}/revoke" },
  "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}": { method: "POST", path: "/api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}" },
  "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}/revoke": { method: "POST", path: "/api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}/revoke" },
  "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{outgoingPersonId}/handover/{incomingPersonId}": { method: "POST", path: "/api/v1/admin/organization/positions/centers/{centerId}/ministers/{outgoingPersonId}/handover/{incomingPersonId}" },
  "POST /api/v1/admin/organization/positions/core-members/{personId}": { method: "POST", path: "/api/v1/admin/organization/positions/core-members/{personId}" },
  "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}": { method: "POST", path: "/api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}" },
  "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}/revoke": { method: "POST", path: "/api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}/revoke" },
  "POST /api/v1/admin/imports/preparatory-members/dry-run": { method: "POST", path: "/api/v1/admin/imports/preparatory-members/dry-run" },
  "POST /api/v1/admin/imports/preparatory-members/commit": { method: "POST", path: "/api/v1/admin/imports/preparatory-members/commit" },
  "GET /api/v1/admin/portal/configuration/draft": { method: "GET", path: "/api/v1/admin/portal/configuration/draft" },
  "PUT /api/v1/admin/portal/configuration/draft": { method: "PUT", path: "/api/v1/admin/portal/configuration/draft" },
  "GET /api/v1/admin/portal/configuration/preview": { method: "GET", path: "/api/v1/admin/portal/configuration/preview" },
  "POST /api/v1/admin/portal/configuration/publish": { method: "POST", path: "/api/v1/admin/portal/configuration/publish" },
  "GET /api/v1/public/portal": { method: "GET", path: "/api/v1/public/portal" },
  "GET /api/v1/admin/content": { method: "GET", path: "/api/v1/admin/content" },
  "GET /api/v1/admin/content/{contentId}": { method: "GET", path: "/api/v1/admin/content/{contentId}" },
  "POST /api/v1/admin/content": { method: "POST", path: "/api/v1/admin/content" },
  "PATCH /api/v1/admin/content/{contentId}": { method: "PATCH", path: "/api/v1/admin/content/{contentId}" },
  "GET /api/v1/admin/content/{contentId}/preview": { method: "GET", path: "/api/v1/admin/content/{contentId}/preview" },
  "POST /api/v1/admin/content/{contentId}/submit-review": { method: "POST", path: "/api/v1/admin/content/{contentId}/submit-review" },
  "POST /api/v1/admin/content/{contentId}/return-draft": { method: "POST", path: "/api/v1/admin/content/{contentId}/return-draft" },
  "POST /api/v1/admin/content/{contentId}/approve-publication": { method: "POST", path: "/api/v1/admin/content/{contentId}/approve-publication" },
  "POST /api/v1/admin/content/{contentId}/publish": { method: "POST", path: "/api/v1/admin/content/{contentId}/publish" },
  "POST /api/v1/admin/content/{contentId}/offline": { method: "POST", path: "/api/v1/admin/content/{contentId}/offline" },
  "GET /api/v1/admin/uploads": { method: "GET", path: "/api/v1/admin/uploads" },
  "POST /api/v1/admin/uploads/intents": { method: "POST", path: "/api/v1/admin/uploads/intents" },
  "POST /api/v1/admin/uploads/{uploadId}/complete": { method: "POST", path: "/api/v1/admin/uploads/{uploadId}/complete" },
  "GET /api/v1/admin/uploads/{uploadId}": { method: "GET", path: "/api/v1/admin/uploads/{uploadId}" },
  "POST /api/v1/admin/media/attachments": { method: "POST", path: "/api/v1/admin/media/attachments" },
  "PATCH /api/v1/admin/media/attachments/{id}": { method: "PATCH", path: "/api/v1/admin/media/attachments/{id}" },
  "GET /api/v1/recruitment/current": { method: "GET", path: "/api/v1/recruitment/current" },
  "GET /api/v1/recruitment/upcoming": { method: "GET", path: "/api/v1/recruitment/upcoming" },
  "GET /api/v1/recruitment/batches/{batchId}/my-application": { method: "GET", path: "/api/v1/recruitment/batches/{batchId}/my-application" },
  "POST /api/v1/recruitment/batches/{batchId}/applications": { method: "POST", path: "/api/v1/recruitment/batches/{batchId}/applications" },
  "PATCH /api/v1/recruitment/batches/{batchId}/applications/{applicationId}": { method: "PATCH", path: "/api/v1/recruitment/batches/{batchId}/applications/{applicationId}" },
  "POST /api/v1/recruitment/batches/{batchId}/applications/{applicationId}/withdraw": { method: "POST", path: "/api/v1/recruitment/batches/{batchId}/applications/{applicationId}/withdraw" },
  "GET /api/v1/admin/recruitment/batches": { method: "GET", path: "/api/v1/admin/recruitment/batches" },
  "POST /api/v1/admin/recruitment/batches": { method: "POST", path: "/api/v1/admin/recruitment/batches" },
  "GET /api/v1/admin/recruitment/batches/{batchId}": { method: "GET", path: "/api/v1/admin/recruitment/batches/{batchId}" },
  "PATCH /api/v1/admin/recruitment/batches/{batchId}": { method: "PATCH", path: "/api/v1/admin/recruitment/batches/{batchId}" },
  "GET /api/v1/admin/recruitment/batches/{batchId}/lifecycle-events": { method: "GET", path: "/api/v1/admin/recruitment/batches/{batchId}/lifecycle-events" },
  "GET /api/v1/admin/recruitment/batches/{batchId}/applications": { method: "GET", path: "/api/v1/admin/recruitment/batches/{batchId}/applications" },
  "GET /api/v1/admin/recruitment/batches/{batchId}/applications/{applicationId}": { method: "GET", path: "/api/v1/admin/recruitment/batches/{batchId}/applications/{applicationId}" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/publish": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/publish" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/open-now": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/open-now" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/pause": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/pause" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/resume": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/resume" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/close": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/close" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/reopen": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/reopen" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/archive": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/archive" },
  "GET /api/v1/admin/recruitment/batches/{batchId}/assessments": { method: "GET", path: "/api/v1/admin/recruitment/batches/{batchId}/assessments" },
  "GET /api/v1/admin/recruitment/batches/{batchId}/assessments/adjustment-targets": { method: "GET", path: "/api/v1/admin/recruitment/batches/{batchId}/assessments/adjustment-targets" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/round-results": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/round-results" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-proposals": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-proposals" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-decisions": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-decisions" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/advance": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/assessments/advance" },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/publish": { method: "POST", path: "/api/v1/admin/recruitment/batches/{batchId}/assessments/publish" },
  "GET /api/v1/recruitment/results/me": { method: "GET", path: "/api/v1/recruitment/results/me" },
  "GET /api/v1/recruitment/results/me/{resultId}/responsible-contacts/{contactPersonId}": { method: "GET", path: "/api/v1/recruitment/results/me/{resultId}/responsible-contacts/{contactPersonId}" },
  "GET /api/v1/admin/projects": { method: "GET", path: "/api/v1/admin/projects" },
  "GET /api/v1/admin/projects/{id}": { method: "GET", path: "/api/v1/admin/projects/{id}" },
  "POST /api/v1/admin/projects": { method: "POST", path: "/api/v1/admin/projects" },
  "PATCH /api/v1/admin/projects/{id}": { method: "PATCH", path: "/api/v1/admin/projects/{id}" },
  "POST /api/v1/admin/projects/{id}/publish": { method: "POST", path: "/api/v1/admin/projects/{id}/publish" },
  "POST /api/v1/admin/projects/{id}/offline": { method: "POST", path: "/api/v1/admin/projects/{id}/offline" },
  "GET /api/v1/public/projects": { method: "GET", path: "/api/v1/public/projects" },
  "GET /api/v1/public/projects/{slug}": { method: "GET", path: "/api/v1/public/projects/{slug}" },
  "GET /api/v1/admin/activities": { method: "GET", path: "/api/v1/admin/activities" },
  "GET /api/v1/admin/activities/{id}": { method: "GET", path: "/api/v1/admin/activities/{id}" },
  "POST /api/v1/admin/activities": { method: "POST", path: "/api/v1/admin/activities" },
  "PATCH /api/v1/admin/activities/{id}": { method: "PATCH", path: "/api/v1/admin/activities/{id}" },
  "POST /api/v1/admin/activities/{id}/publish": { method: "POST", path: "/api/v1/admin/activities/{id}/publish" },
  "POST /api/v1/admin/activities/{id}/registration/open": { method: "POST", path: "/api/v1/admin/activities/{id}/registration/open" },
  "POST /api/v1/admin/activities/{id}/registration/close": { method: "POST", path: "/api/v1/admin/activities/{id}/registration/close" },
  "POST /api/v1/admin/activities/{id}/offline": { method: "POST", path: "/api/v1/admin/activities/{id}/offline" },
  "GET /api/v1/public/activities": { method: "GET", path: "/api/v1/public/activities" },
  "GET /api/v1/public/activities/{slug}": { method: "GET", path: "/api/v1/public/activities/{slug}" },
  "GET /api/v1/public/timeline": { method: "GET", path: "/api/v1/public/timeline" },
  "POST /api/v1/activities/{slug}/registrations": { method: "POST", path: "/api/v1/activities/{slug}/registrations" },
  "GET /api/v1/activities/{slug}/registration": { method: "GET", path: "/api/v1/activities/{slug}/registration" },
  "POST /api/v1/registrations/{id}/cancel": { method: "POST", path: "/api/v1/registrations/{id}/cancel" },
  "GET /api/v1/admin/activities/{activityId}/registrations": { method: "GET", path: "/api/v1/admin/activities/{activityId}/registrations" },
  "POST /api/v1/admin/registrations/{id}/decision": { method: "POST", path: "/api/v1/admin/registrations/{id}/decision" },
  "GET /api/v1/admin/galleries": { method: "GET", path: "/api/v1/admin/galleries" },
  "POST /api/v1/admin/galleries": { method: "POST", path: "/api/v1/admin/galleries" },
  "PATCH /api/v1/admin/galleries/{id}": { method: "PATCH", path: "/api/v1/admin/galleries/{id}" },
  "POST /api/v1/admin/galleries/{id}/publish": { method: "POST", path: "/api/v1/admin/galleries/{id}/publish" },
  "POST /api/v1/admin/galleries/{id}/offline": { method: "POST", path: "/api/v1/admin/galleries/{id}/offline" },
  "GET /api/v1/public/galleries": { method: "GET", path: "/api/v1/public/galleries" },
  "GET /api/v1/public/galleries/{slug}": { method: "GET", path: "/api/v1/public/galleries/{slug}" },
  "GET /api/v1/admin/resources": { method: "GET", path: "/api/v1/admin/resources" },
  "GET /api/v1/admin/resources/{id}": { method: "GET", path: "/api/v1/admin/resources/{id}" },
  "POST /api/v1/admin/resources": { method: "POST", path: "/api/v1/admin/resources" },
  "POST /api/v1/admin/resources/{id}/versions": { method: "POST", path: "/api/v1/admin/resources/{id}/versions" },
  "GET /api/v1/admin/resources/{id}/versions": { method: "GET", path: "/api/v1/admin/resources/{id}/versions" },
  "POST /api/v1/admin/resources/{id}/publish": { method: "POST", path: "/api/v1/admin/resources/{id}/publish" },
  "POST /api/v1/admin/resources/{id}/offline": { method: "POST", path: "/api/v1/admin/resources/{id}/offline" },
  "GET /api/v1/public/resources": { method: "GET", path: "/api/v1/public/resources" },
  "GET /api/v1/public/resources/{slug}": { method: "GET", path: "/api/v1/public/resources/{slug}" },
  "GET /api/v1/public/resources/{slug}/versions/{versionLabel}": { method: "GET", path: "/api/v1/public/resources/{slug}/versions/{versionLabel}" },
  "GET /api/v1/admin/help": { method: "GET", path: "/api/v1/admin/help" },
  "POST /api/v1/admin/help": { method: "POST", path: "/api/v1/admin/help" },
  "PATCH /api/v1/admin/help/{id}/draft": { method: "PATCH", path: "/api/v1/admin/help/{id}/draft" },
  "POST /api/v1/admin/help/{id}/publish": { method: "POST", path: "/api/v1/admin/help/{id}/publish" },
  "GET /api/v1/public/help": { method: "GET", path: "/api/v1/public/help" },
  "GET /api/v1/public/help/{slug}": { method: "GET", path: "/api/v1/public/help/{slug}" },
} as const;

export type ApiOperation = keyof typeof API_OPERATIONS;
export type ApiV1Path = (typeof API_V1_PATHS)[keyof typeof API_V1_PATHS];

export interface ApiResponseByOperation {
  "POST /api/v1/auth/login": AuthSessionResponseDto;
  "GET /api/v1/auth/session": CurrentSessionResponseDto;
  "POST /api/v1/auth/change-password": AuthSessionResponseDto;
  "GET /api/v1/members/me": MemberProfileResponseDto;
  "PATCH /api/v1/members/me": MemberProfileResponseDto;
  "POST /api/v1/members/me/honors": AdminHonorResponseDto;
  "GET /api/v1/members/me/honors": AdminHonorListResponseDto;
  "PATCH /api/v1/members/me/honors/{id}/consent": AdminHonorResponseDto;
  "GET /api/v1/members/me/growth-records": GrowthRecordListResponseDto;
  "GET /api/v1/members/me/growth-records/{id}": GrowthRecordResponseDto;
  "POST /api/v1/members/me/growth-records": GrowthRecordResponseDto;
  "PATCH /api/v1/members/me/growth-records/{id}": GrowthRecordResponseDto;
  "DELETE /api/v1/members/me/growth-records/{id}": DeletedGrowthRecordResponseDto;
  "GET /api/v1/admin/honors": AdminHonorListResponseDto;
  "POST /api/v1/admin/honors/{id}/approve": AdminHonorResponseDto;
  "GET /api/v1/public/members": PublicMemberListResponseDto;
  "GET /api/v1/public/members/{publicId}": PublicMemberResponseDto;
  "POST /api/v1/admin/members": ManagedMemberCreatedResponseDto;
  "GET /api/v1/admin/members": ManagedMemberListResponseDto;
  "POST /api/v1/admin/members/{personId}/promote": ManagedMemberResponseDto;
  "GET /api/v1/admin/accounts": AdminAccountListResponseDto;
  "GET /api/v1/admin/audit-events": SafeAuditEventListDto;
  "GET /api/v1/public/centers": PublicCenterListResponseDto;
  "GET /api/v1/public/centers/{publicSlug}": PublicCenterDetailResponseDto;
  "GET /api/v1/public/homepage/stats": PublicHomepageStatsResponseDto;
  "GET /api/v1/admin/organization/centers": AdminCenterListResponseDto;
  "POST /api/v1/admin/organization/memberships": OrganizationMembershipResponseDto;
  "PATCH /api/v1/admin/organization/memberships/{personId}": OrganizationMembershipResponseDto;
  "POST /api/v1/admin/organization/memberships/{personId}/retire": RetiredOrganizationMembershipResponseDto;
  "POST /api/v1/admin/organization/positions/alliance-owners/{personId}": OrganizationPositionResponseDto;
  "POST /api/v1/admin/organization/positions/alliance-owners/{personId}/revoke": OrganizationPositionResponseDto;
  "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}": OrganizationPositionResponseDto;
  "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}/revoke": OrganizationPositionResponseDto;
  "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{outgoingPersonId}/handover/{incomingPersonId}": {
  "outgoing": OrganizationPositionResponseDto;
  "incoming": OrganizationPositionResponseDto;
};
  "POST /api/v1/admin/organization/positions/core-members/{personId}": MembershipResponseDto;
  "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}": OrganizationPositionResponseDto;
  "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}/revoke": OrganizationPositionResponseDto;
  "POST /api/v1/admin/imports/preparatory-members/dry-run": PreparatoryMemberImportReportResponseDto;
  "POST /api/v1/admin/imports/preparatory-members/commit": PreparatoryMemberImportReportResponseDto;
  "GET /api/v1/admin/portal/configuration/draft": AdminPortalConfigurationResponseDto;
  "PUT /api/v1/admin/portal/configuration/draft": AdminPortalConfigurationResponseDto;
  "GET /api/v1/admin/portal/configuration/preview": AdminPortalConfigurationResponseDto;
  "POST /api/v1/admin/portal/configuration/publish": PublishedPortalConfigurationResponseDto;
  "GET /api/v1/public/portal": PublicPortalResponseDto;
  "GET /api/v1/admin/content": AdminContentListResponseDto;
  "GET /api/v1/admin/content/{contentId}": AdminContentResponseDto;
  "POST /api/v1/admin/content": AdminContentResponseDto;
  "PATCH /api/v1/admin/content/{contentId}": AdminContentResponseDto;
  "GET /api/v1/admin/content/{contentId}/preview": AdminContentResponseDto;
  "POST /api/v1/admin/content/{contentId}/submit-review": AdminContentResponseDto;
  "POST /api/v1/admin/content/{contentId}/return-draft": AdminContentResponseDto;
  "POST /api/v1/admin/content/{contentId}/approve-publication": AdminContentResponseDto;
  "POST /api/v1/admin/content/{contentId}/publish": AdminContentResponseDto;
  "POST /api/v1/admin/content/{contentId}/offline": AdminContentResponseDto;
  "GET /api/v1/admin/uploads": UploadListResponseDto;
  "POST /api/v1/admin/uploads/intents": UploadIntentResponseDto;
  "POST /api/v1/admin/uploads/{uploadId}/complete": UploadResponseDto;
  "GET /api/v1/admin/uploads/{uploadId}": UploadResponseDto;
  "POST /api/v1/admin/media/attachments": MediaAttachmentResponseDto;
  "PATCH /api/v1/admin/media/attachments/{id}": MediaAttachmentResponseDto;
  "GET /api/v1/recruitment/current": PublicRecruitmentBatchEnvelopeDto;
  "GET /api/v1/recruitment/upcoming": PublicRecruitmentBatchEnvelopeDto;
  "GET /api/v1/recruitment/batches/{batchId}/my-application": MyRecruitmentApplicationEnvelopeDto;
  "POST /api/v1/recruitment/batches/{batchId}/applications": MyRecruitmentApplicationResponseDto;
  "PATCH /api/v1/recruitment/batches/{batchId}/applications/{applicationId}": MyRecruitmentApplicationResponseDto;
  "POST /api/v1/recruitment/batches/{batchId}/applications/{applicationId}/withdraw": MyRecruitmentApplicationResponseDto;
  "GET /api/v1/admin/recruitment/batches": AdminRecruitmentBatchListDto;
  "POST /api/v1/admin/recruitment/batches": AdminRecruitmentBatchDto;
  "GET /api/v1/admin/recruitment/batches/{batchId}": AdminRecruitmentBatchDto;
  "PATCH /api/v1/admin/recruitment/batches/{batchId}": AdminRecruitmentBatchDto;
  "GET /api/v1/admin/recruitment/batches/{batchId}/lifecycle-events": RecruitmentBatchLifecycleEventListDto;
  "GET /api/v1/admin/recruitment/batches/{batchId}/applications": AdminRecruitmentApplicationListDto;
  "GET /api/v1/admin/recruitment/batches/{batchId}/applications/{applicationId}": AdminRecruitmentApplicationDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/publish": AdminRecruitmentBatchDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/open-now": AdminRecruitmentBatchDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/pause": AdminRecruitmentBatchDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/resume": AdminRecruitmentBatchDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/close": AdminRecruitmentBatchDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/reopen": AdminRecruitmentBatchDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/archive": AdminRecruitmentBatchDto;
  "GET /api/v1/admin/recruitment/batches/{batchId}/assessments": AssessmentBatchResponseDto;
  "GET /api/v1/admin/recruitment/batches/{batchId}/assessments/adjustment-targets": AssessmentAdjustmentTargetCatalogResponseDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/round-results": AssessmentRoundMutationResponseDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-proposals": AssessmentProposalMutationResponseDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-decisions": AssessmentDecisionMutationResponseDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/advance": AssessmentBatchStateResponseDto;
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/publish": AssessmentPublicationResponseDto;
  "GET /api/v1/recruitment/results/me": MyRecruitmentResultListDto;
  "GET /api/v1/recruitment/results/me/{resultId}/responsible-contacts/{contactPersonId}": RecruitmentResponsibleContactValueDto;
  "GET /api/v1/admin/projects": AdminProjectListResponseDto;
  "GET /api/v1/admin/projects/{id}": AdminProjectResponseDto;
  "POST /api/v1/admin/projects": AdminProjectResponseDto;
  "PATCH /api/v1/admin/projects/{id}": AdminProjectResponseDto;
  "POST /api/v1/admin/projects/{id}/publish": AdminProjectResponseDto;
  "POST /api/v1/admin/projects/{id}/offline": AdminProjectResponseDto;
  "GET /api/v1/public/projects": PublicProjectListResponseDto;
  "GET /api/v1/public/projects/{slug}": PublicProjectResponseDto;
  "GET /api/v1/admin/activities": AdminActivityListResponseDto;
  "GET /api/v1/admin/activities/{id}": AdminActivityResponseDto;
  "POST /api/v1/admin/activities": AdminActivityResponseDto;
  "PATCH /api/v1/admin/activities/{id}": AdminActivityResponseDto;
  "POST /api/v1/admin/activities/{id}/publish": AdminActivityResponseDto;
  "POST /api/v1/admin/activities/{id}/registration/open": AdminActivityResponseDto;
  "POST /api/v1/admin/activities/{id}/registration/close": AdminActivityResponseDto;
  "POST /api/v1/admin/activities/{id}/offline": AdminActivityResponseDto;
  "GET /api/v1/public/activities": PublicActivityListResponseDto;
  "GET /api/v1/public/activities/{slug}": PublicActivityResponseDto;
  "GET /api/v1/public/timeline": PublicTimelineListResponseDto;
  "POST /api/v1/activities/{slug}/registrations": RegistrationResponseDto;
  "GET /api/v1/activities/{slug}/registration": RegistrationResponseDto;
  "POST /api/v1/registrations/{id}/cancel": RegistrationResponseDto;
  "GET /api/v1/admin/activities/{activityId}/registrations": RegistrationListResponseDto;
  "POST /api/v1/admin/registrations/{id}/decision": RegistrationResponseDto;
  "GET /api/v1/admin/galleries": AdminGalleryListResponseDto;
  "POST /api/v1/admin/galleries": AdminGalleryResponseDto;
  "PATCH /api/v1/admin/galleries/{id}": AdminGalleryResponseDto;
  "POST /api/v1/admin/galleries/{id}/publish": AdminGalleryResponseDto;
  "POST /api/v1/admin/galleries/{id}/offline": AdminGalleryResponseDto;
  "GET /api/v1/public/galleries": PublicGalleryListResponseDto;
  "GET /api/v1/public/galleries/{slug}": PublicGalleryResponseDto;
  "GET /api/v1/admin/resources": AdminResourceListResponseDto;
  "GET /api/v1/admin/resources/{id}": AdminResourceResponseDto;
  "POST /api/v1/admin/resources": AdminResourceResponseDto;
  "POST /api/v1/admin/resources/{id}/versions": AdminResourceVersionResponseDto;
  "GET /api/v1/admin/resources/{id}/versions": AdminResourceVersionListResponseDto;
  "POST /api/v1/admin/resources/{id}/publish": AdminResourceResponseDto;
  "POST /api/v1/admin/resources/{id}/offline": AdminResourceResponseDto;
  "GET /api/v1/public/resources": PublicResourceListResponseDto;
  "GET /api/v1/public/resources/{slug}": PublicResourceResponseDto;
  "GET /api/v1/public/resources/{slug}/versions/{versionLabel}": PublicResourceResponseDto;
  "GET /api/v1/admin/help": AdminHelpListResponseDto;
  "POST /api/v1/admin/help": AdminHelpResponseDto;
  "PATCH /api/v1/admin/help/{id}/draft": AdminHelpResponseDto;
  "POST /api/v1/admin/help/{id}/publish": AdminHelpResponseDto;
  "GET /api/v1/public/help": PublicHelpListResponseDto;
  "GET /api/v1/public/help/{slug}": PublicHelpResponseDto;
}

export type ApiResponseFor<TOperation extends ApiOperation> = ApiResponseByOperation[TOperation];

const API_RESPONSE_SCHEMAS = {
  "POST /api/v1/auth/login": {
    "$ref": "#/components/schemas/AuthSessionResponseDto"
  },
  "GET /api/v1/auth/session": {
    "$ref": "#/components/schemas/CurrentSessionResponseDto"
  },
  "POST /api/v1/auth/change-password": {
    "$ref": "#/components/schemas/AuthSessionResponseDto"
  },
  "GET /api/v1/members/me": {
    "$ref": "#/components/schemas/MemberProfileResponseDto"
  },
  "PATCH /api/v1/members/me": {
    "$ref": "#/components/schemas/MemberProfileResponseDto"
  },
  "POST /api/v1/members/me/honors": {
    "$ref": "#/components/schemas/AdminHonorResponseDto"
  },
  "GET /api/v1/members/me/honors": {
    "$ref": "#/components/schemas/AdminHonorListResponseDto"
  },
  "PATCH /api/v1/members/me/honors/{id}/consent": {
    "$ref": "#/components/schemas/AdminHonorResponseDto"
  },
  "GET /api/v1/members/me/growth-records": {
    "$ref": "#/components/schemas/GrowthRecordListResponseDto"
  },
  "GET /api/v1/members/me/growth-records/{id}": {
    "$ref": "#/components/schemas/GrowthRecordResponseDto"
  },
  "POST /api/v1/members/me/growth-records": {
    "$ref": "#/components/schemas/GrowthRecordResponseDto"
  },
  "PATCH /api/v1/members/me/growth-records/{id}": {
    "$ref": "#/components/schemas/GrowthRecordResponseDto"
  },
  "DELETE /api/v1/members/me/growth-records/{id}": {
    "$ref": "#/components/schemas/DeletedGrowthRecordResponseDto"
  },
  "GET /api/v1/admin/honors": {
    "$ref": "#/components/schemas/AdminHonorListResponseDto"
  },
  "POST /api/v1/admin/honors/{id}/approve": {
    "$ref": "#/components/schemas/AdminHonorResponseDto"
  },
  "GET /api/v1/public/members": {
    "$ref": "#/components/schemas/PublicMemberListResponseDto"
  },
  "GET /api/v1/public/members/{publicId}": {
    "$ref": "#/components/schemas/PublicMemberResponseDto"
  },
  "POST /api/v1/admin/members": {
    "$ref": "#/components/schemas/ManagedMemberCreatedResponseDto"
  },
  "GET /api/v1/admin/members": {
    "$ref": "#/components/schemas/ManagedMemberListResponseDto"
  },
  "POST /api/v1/admin/members/{personId}/promote": {
    "$ref": "#/components/schemas/ManagedMemberResponseDto"
  },
  "GET /api/v1/admin/accounts": {
    "$ref": "#/components/schemas/AdminAccountListResponseDto"
  },
  "GET /api/v1/admin/audit-events": {
    "$ref": "#/components/schemas/SafeAuditEventListDto"
  },
  "GET /api/v1/public/centers": {
    "$ref": "#/components/schemas/PublicCenterListResponseDto"
  },
  "GET /api/v1/public/centers/{publicSlug}": {
    "$ref": "#/components/schemas/PublicCenterDetailResponseDto"
  },
  "GET /api/v1/public/homepage/stats": {
    "$ref": "#/components/schemas/PublicHomepageStatsResponseDto"
  },
  "GET /api/v1/admin/organization/centers": {
    "$ref": "#/components/schemas/AdminCenterListResponseDto"
  },
  "POST /api/v1/admin/organization/memberships": {
    "$ref": "#/components/schemas/OrganizationMembershipResponseDto"
  },
  "PATCH /api/v1/admin/organization/memberships/{personId}": {
    "$ref": "#/components/schemas/OrganizationMembershipResponseDto"
  },
  "POST /api/v1/admin/organization/memberships/{personId}/retire": {
    "$ref": "#/components/schemas/RetiredOrganizationMembershipResponseDto"
  },
  "POST /api/v1/admin/organization/positions/alliance-owners/{personId}": {
    "$ref": "#/components/schemas/OrganizationPositionResponseDto"
  },
  "POST /api/v1/admin/organization/positions/alliance-owners/{personId}/revoke": {
    "$ref": "#/components/schemas/OrganizationPositionResponseDto"
  },
  "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}": {
    "$ref": "#/components/schemas/OrganizationPositionResponseDto"
  },
  "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}/revoke": {
    "$ref": "#/components/schemas/OrganizationPositionResponseDto"
  },
  "POST /api/v1/admin/organization/positions/centers/{centerId}/ministers/{outgoingPersonId}/handover/{incomingPersonId}": {
    "type": "object",
    "required": [
      "outgoing",
      "incoming"
    ],
    "properties": {
      "outgoing": {
        "$ref": "#/components/schemas/OrganizationPositionResponseDto"
      },
      "incoming": {
        "$ref": "#/components/schemas/OrganizationPositionResponseDto"
      }
    }
  },
  "POST /api/v1/admin/organization/positions/core-members/{personId}": {
    "$ref": "#/components/schemas/MembershipResponseDto"
  },
  "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}": {
    "$ref": "#/components/schemas/OrganizationPositionResponseDto"
  },
  "POST /api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}/revoke": {
    "$ref": "#/components/schemas/OrganizationPositionResponseDto"
  },
  "POST /api/v1/admin/imports/preparatory-members/dry-run": {
    "$ref": "#/components/schemas/PreparatoryMemberImportReportResponseDto"
  },
  "POST /api/v1/admin/imports/preparatory-members/commit": {
    "$ref": "#/components/schemas/PreparatoryMemberImportReportResponseDto"
  },
  "GET /api/v1/admin/portal/configuration/draft": {
    "$ref": "#/components/schemas/AdminPortalConfigurationResponseDto"
  },
  "PUT /api/v1/admin/portal/configuration/draft": {
    "$ref": "#/components/schemas/AdminPortalConfigurationResponseDto"
  },
  "GET /api/v1/admin/portal/configuration/preview": {
    "$ref": "#/components/schemas/AdminPortalConfigurationResponseDto"
  },
  "POST /api/v1/admin/portal/configuration/publish": {
    "$ref": "#/components/schemas/PublishedPortalConfigurationResponseDto"
  },
  "GET /api/v1/public/portal": {
    "$ref": "#/components/schemas/PublicPortalResponseDto"
  },
  "GET /api/v1/admin/content": {
    "$ref": "#/components/schemas/AdminContentListResponseDto"
  },
  "GET /api/v1/admin/content/{contentId}": {
    "$ref": "#/components/schemas/AdminContentResponseDto"
  },
  "POST /api/v1/admin/content": {
    "$ref": "#/components/schemas/AdminContentResponseDto"
  },
  "PATCH /api/v1/admin/content/{contentId}": {
    "$ref": "#/components/schemas/AdminContentResponseDto"
  },
  "GET /api/v1/admin/content/{contentId}/preview": {
    "$ref": "#/components/schemas/AdminContentResponseDto"
  },
  "POST /api/v1/admin/content/{contentId}/submit-review": {
    "$ref": "#/components/schemas/AdminContentResponseDto"
  },
  "POST /api/v1/admin/content/{contentId}/return-draft": {
    "$ref": "#/components/schemas/AdminContentResponseDto"
  },
  "POST /api/v1/admin/content/{contentId}/approve-publication": {
    "$ref": "#/components/schemas/AdminContentResponseDto"
  },
  "POST /api/v1/admin/content/{contentId}/publish": {
    "$ref": "#/components/schemas/AdminContentResponseDto"
  },
  "POST /api/v1/admin/content/{contentId}/offline": {
    "$ref": "#/components/schemas/AdminContentResponseDto"
  },
  "GET /api/v1/admin/uploads": {
    "$ref": "#/components/schemas/UploadListResponseDto"
  },
  "POST /api/v1/admin/uploads/intents": {
    "$ref": "#/components/schemas/UploadIntentResponseDto"
  },
  "POST /api/v1/admin/uploads/{uploadId}/complete": {
    "$ref": "#/components/schemas/UploadResponseDto"
  },
  "GET /api/v1/admin/uploads/{uploadId}": {
    "$ref": "#/components/schemas/UploadResponseDto"
  },
  "POST /api/v1/admin/media/attachments": {
    "$ref": "#/components/schemas/MediaAttachmentResponseDto"
  },
  "PATCH /api/v1/admin/media/attachments/{id}": {
    "$ref": "#/components/schemas/MediaAttachmentResponseDto"
  },
  "GET /api/v1/recruitment/current": {
    "$ref": "#/components/schemas/PublicRecruitmentBatchEnvelopeDto"
  },
  "GET /api/v1/recruitment/upcoming": {
    "$ref": "#/components/schemas/PublicRecruitmentBatchEnvelopeDto"
  },
  "GET /api/v1/recruitment/batches/{batchId}/my-application": {
    "$ref": "#/components/schemas/MyRecruitmentApplicationEnvelopeDto"
  },
  "POST /api/v1/recruitment/batches/{batchId}/applications": {
    "$ref": "#/components/schemas/MyRecruitmentApplicationResponseDto"
  },
  "PATCH /api/v1/recruitment/batches/{batchId}/applications/{applicationId}": {
    "$ref": "#/components/schemas/MyRecruitmentApplicationResponseDto"
  },
  "POST /api/v1/recruitment/batches/{batchId}/applications/{applicationId}/withdraw": {
    "$ref": "#/components/schemas/MyRecruitmentApplicationResponseDto"
  },
  "GET /api/v1/admin/recruitment/batches": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchListDto"
  },
  "POST /api/v1/admin/recruitment/batches": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "GET /api/v1/admin/recruitment/batches/{batchId}": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "PATCH /api/v1/admin/recruitment/batches/{batchId}": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "GET /api/v1/admin/recruitment/batches/{batchId}/lifecycle-events": {
    "$ref": "#/components/schemas/RecruitmentBatchLifecycleEventListDto"
  },
  "GET /api/v1/admin/recruitment/batches/{batchId}/applications": {
    "$ref": "#/components/schemas/AdminRecruitmentApplicationListDto"
  },
  "GET /api/v1/admin/recruitment/batches/{batchId}/applications/{applicationId}": {
    "$ref": "#/components/schemas/AdminRecruitmentApplicationDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/publish": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/open-now": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/pause": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/resume": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/close": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/reopen": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/archive": {
    "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
  },
  "GET /api/v1/admin/recruitment/batches/{batchId}/assessments": {
    "$ref": "#/components/schemas/AssessmentBatchResponseDto"
  },
  "GET /api/v1/admin/recruitment/batches/{batchId}/assessments/adjustment-targets": {
    "$ref": "#/components/schemas/AssessmentAdjustmentTargetCatalogResponseDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/round-results": {
    "$ref": "#/components/schemas/AssessmentRoundMutationResponseDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-proposals": {
    "$ref": "#/components/schemas/AssessmentProposalMutationResponseDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-decisions": {
    "$ref": "#/components/schemas/AssessmentDecisionMutationResponseDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/advance": {
    "$ref": "#/components/schemas/AssessmentBatchStateResponseDto"
  },
  "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/publish": {
    "$ref": "#/components/schemas/AssessmentPublicationResponseDto"
  },
  "GET /api/v1/recruitment/results/me": {
    "$ref": "#/components/schemas/MyRecruitmentResultListDto"
  },
  "GET /api/v1/recruitment/results/me/{resultId}/responsible-contacts/{contactPersonId}": {
    "$ref": "#/components/schemas/RecruitmentResponsibleContactValueDto"
  },
  "GET /api/v1/admin/projects": {
    "$ref": "#/components/schemas/AdminProjectListResponseDto"
  },
  "GET /api/v1/admin/projects/{id}": {
    "$ref": "#/components/schemas/AdminProjectResponseDto"
  },
  "POST /api/v1/admin/projects": {
    "$ref": "#/components/schemas/AdminProjectResponseDto"
  },
  "PATCH /api/v1/admin/projects/{id}": {
    "$ref": "#/components/schemas/AdminProjectResponseDto"
  },
  "POST /api/v1/admin/projects/{id}/publish": {
    "$ref": "#/components/schemas/AdminProjectResponseDto"
  },
  "POST /api/v1/admin/projects/{id}/offline": {
    "$ref": "#/components/schemas/AdminProjectResponseDto"
  },
  "GET /api/v1/public/projects": {
    "$ref": "#/components/schemas/PublicProjectListResponseDto"
  },
  "GET /api/v1/public/projects/{slug}": {
    "$ref": "#/components/schemas/PublicProjectResponseDto"
  },
  "GET /api/v1/admin/activities": {
    "$ref": "#/components/schemas/AdminActivityListResponseDto"
  },
  "GET /api/v1/admin/activities/{id}": {
    "$ref": "#/components/schemas/AdminActivityResponseDto"
  },
  "POST /api/v1/admin/activities": {
    "$ref": "#/components/schemas/AdminActivityResponseDto"
  },
  "PATCH /api/v1/admin/activities/{id}": {
    "$ref": "#/components/schemas/AdminActivityResponseDto"
  },
  "POST /api/v1/admin/activities/{id}/publish": {
    "$ref": "#/components/schemas/AdminActivityResponseDto"
  },
  "POST /api/v1/admin/activities/{id}/registration/open": {
    "$ref": "#/components/schemas/AdminActivityResponseDto"
  },
  "POST /api/v1/admin/activities/{id}/registration/close": {
    "$ref": "#/components/schemas/AdminActivityResponseDto"
  },
  "POST /api/v1/admin/activities/{id}/offline": {
    "$ref": "#/components/schemas/AdminActivityResponseDto"
  },
  "GET /api/v1/public/activities": {
    "$ref": "#/components/schemas/PublicActivityListResponseDto"
  },
  "GET /api/v1/public/activities/{slug}": {
    "$ref": "#/components/schemas/PublicActivityResponseDto"
  },
  "GET /api/v1/public/timeline": {
    "$ref": "#/components/schemas/PublicTimelineListResponseDto"
  },
  "POST /api/v1/activities/{slug}/registrations": {
    "$ref": "#/components/schemas/RegistrationResponseDto"
  },
  "GET /api/v1/activities/{slug}/registration": {
    "$ref": "#/components/schemas/RegistrationResponseDto"
  },
  "POST /api/v1/registrations/{id}/cancel": {
    "$ref": "#/components/schemas/RegistrationResponseDto"
  },
  "GET /api/v1/admin/activities/{activityId}/registrations": {
    "$ref": "#/components/schemas/RegistrationListResponseDto"
  },
  "POST /api/v1/admin/registrations/{id}/decision": {
    "$ref": "#/components/schemas/RegistrationResponseDto"
  },
  "GET /api/v1/admin/galleries": {
    "$ref": "#/components/schemas/AdminGalleryListResponseDto"
  },
  "POST /api/v1/admin/galleries": {
    "$ref": "#/components/schemas/AdminGalleryResponseDto"
  },
  "PATCH /api/v1/admin/galleries/{id}": {
    "$ref": "#/components/schemas/AdminGalleryResponseDto"
  },
  "POST /api/v1/admin/galleries/{id}/publish": {
    "$ref": "#/components/schemas/AdminGalleryResponseDto"
  },
  "POST /api/v1/admin/galleries/{id}/offline": {
    "$ref": "#/components/schemas/AdminGalleryResponseDto"
  },
  "GET /api/v1/public/galleries": {
    "$ref": "#/components/schemas/PublicGalleryListResponseDto"
  },
  "GET /api/v1/public/galleries/{slug}": {
    "$ref": "#/components/schemas/PublicGalleryResponseDto"
  },
  "GET /api/v1/admin/resources": {
    "$ref": "#/components/schemas/AdminResourceListResponseDto"
  },
  "GET /api/v1/admin/resources/{id}": {
    "$ref": "#/components/schemas/AdminResourceResponseDto"
  },
  "POST /api/v1/admin/resources": {
    "$ref": "#/components/schemas/AdminResourceResponseDto"
  },
  "POST /api/v1/admin/resources/{id}/versions": {
    "$ref": "#/components/schemas/AdminResourceVersionResponseDto"
  },
  "GET /api/v1/admin/resources/{id}/versions": {
    "$ref": "#/components/schemas/AdminResourceVersionListResponseDto"
  },
  "POST /api/v1/admin/resources/{id}/publish": {
    "$ref": "#/components/schemas/AdminResourceResponseDto"
  },
  "POST /api/v1/admin/resources/{id}/offline": {
    "$ref": "#/components/schemas/AdminResourceResponseDto"
  },
  "GET /api/v1/public/resources": {
    "$ref": "#/components/schemas/PublicResourceListResponseDto"
  },
  "GET /api/v1/public/resources/{slug}": {
    "$ref": "#/components/schemas/PublicResourceResponseDto"
  },
  "GET /api/v1/public/resources/{slug}/versions/{versionLabel}": {
    "$ref": "#/components/schemas/PublicResourceResponseDto"
  },
  "GET /api/v1/admin/help": {
    "$ref": "#/components/schemas/AdminHelpListResponseDto"
  },
  "POST /api/v1/admin/help": {
    "$ref": "#/components/schemas/AdminHelpResponseDto"
  },
  "PATCH /api/v1/admin/help/{id}/draft": {
    "$ref": "#/components/schemas/AdminHelpResponseDto"
  },
  "POST /api/v1/admin/help/{id}/publish": {
    "$ref": "#/components/schemas/AdminHelpResponseDto"
  },
  "GET /api/v1/public/help": {
    "$ref": "#/components/schemas/PublicHelpListResponseDto"
  },
  "GET /api/v1/public/help/{slug}": {
    "$ref": "#/components/schemas/PublicHelpResponseDto"
  }
} as const;

type JsonSchema = {
  $ref?: string; type?: string; nullable?: boolean; enum?: unknown[]; properties?: Record<string, JsonSchema>; required?: string[]; items?: JsonSchema; oneOf?: JsonSchema[]; anyOf?: JsonSchema[]; allOf?: JsonSchema[]; additionalProperties?: boolean | JsonSchema;
};

const API_COMPONENT_SCHEMAS = {
  "LoginDto": {
    "type": "object",
    "properties": {
      "account": {
        "type": "string",
        "example": "2026001001"
      },
      "password": {
        "type": "string",
        "example": "your-password"
      },
      "rememberMe": {
        "type": "boolean",
        "default": false
      }
    },
    "required": [
      "account",
      "password"
    ]
  },
  "ChangePasswordDto": {
    "type": "object",
    "properties": {
      "newPassword": {
        "type": "string",
        "example": "a-new-password"
      }
    },
    "required": [
      "newPassword"
    ]
  },
  "SafeAuditActorDto": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "account",
          "system"
        ]
      },
      "accountId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "username": {
        "type": "string",
        "nullable": true
      },
      "displayName": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "accountId",
      "username",
      "displayName"
    ]
  },
  "SafeAuditTargetDto": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string"
      },
      "id": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "id"
    ]
  },
  "SafeAuditEventDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "actor": {
        "$ref": "#/components/schemas/SafeAuditActorDto"
      },
      "action": {
        "type": "string"
      },
      "target": {
        "$ref": "#/components/schemas/SafeAuditTargetDto"
      },
      "before": {
        "type": "object",
        "nullable": true,
        "additionalProperties": {
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "boolean"
            },
            {
              "nullable": true,
              "enum": [
                null
              ]
            },
            {
              "type": "array",
              "items": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "number"
                  },
                  {
                    "type": "boolean"
                  },
                  {
                    "nullable": true,
                    "enum": [
                      null
                    ]
                  }
                ]
              }
            }
          ]
        }
      },
      "after": {
        "type": "object",
        "nullable": true,
        "additionalProperties": {
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "boolean"
            },
            {
              "nullable": true,
              "enum": [
                null
              ]
            },
            {
              "type": "array",
              "items": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "number"
                  },
                  {
                    "type": "boolean"
                  },
                  {
                    "nullable": true,
                    "enum": [
                      null
                    ]
                  }
                ]
              }
            }
          ]
        }
      },
      "reason": {
        "type": "string",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "id",
      "actor",
      "action",
      "target",
      "before",
      "after",
      "reason",
      "createdAt"
    ]
  },
  "SafeAuditEventListDto": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number",
        "minimum": 1
      },
      "pageSize": {
        "type": "number",
        "minimum": 1,
        "maximum": 100
      },
      "total": {
        "type": "number",
        "minimum": 0
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/SafeAuditEventDto"
        }
      }
    },
    "required": [
      "page",
      "pageSize",
      "total",
      "items"
    ]
  },
  "UpdateMyProfileDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Required optimistic-lock person version"
      },
      "name": {
        "type": "string",
        "example": "陈同学"
      },
      "grade": {
        "type": "string",
        "example": "2027"
      },
      "className": {
        "type": "string",
        "example": "软件工程 2 班"
      },
      "contact": {
        "type": "string",
        "example": "example@school.edu.cn"
      },
      "bio": {
        "type": "string",
        "example": "HSD member profile"
      },
      "biography": {
        "type": "string",
        "example": "HSD member biography"
      },
      "publicProfileEnabled": {
        "type": "boolean",
        "description": "Opt this safe profile into the public member projection"
      },
      "avatarAssetId": {
        "type": "string",
        "format": "uuid",
        "nullable": true,
        "description": "Internal uploaded media asset identifier. Public responses expose only its public token."
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "CreateMemberAvatarUploadIntentDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 0,
        "maximum": 0
      },
      "centerId": {
        "type": "string",
        "format": "uuid",
        "description": "Optional for members; formal members must match their current center. Preparatory members use a server-selected active center."
      },
      "fileName": {
        "type": "string",
        "maxLength": 180
      },
      "mimeType": {
        "type": "string",
        "enum": [
          "image/jpeg",
          "image/png",
          "image/webp"
        ]
      },
      "byteSize": {
        "type": "number",
        "minimum": 1
      },
      "checksumSha256": {
        "type": "string",
        "minLength": 64,
        "maxLength": 64
      },
      "kind": {
        "type": "string",
        "enum": [
          "image"
        ]
      }
    },
    "required": [
      "expectedVersion",
      "fileName",
      "mimeType",
      "byteSize",
      "checksumSha256",
      "kind"
    ]
  },
  "UploadActorResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "username": {
        "type": "string"
      },
      "displayName": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "username",
      "displayName"
    ]
  },
  "UploadDestinationDto": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string"
      },
      "headers": {
        "type": "object",
        "additionalProperties": {
          "type": "string"
        }
      }
    },
    "required": [
      "url",
      "headers"
    ]
  },
  "UploadIntentResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "createdBy": {
        "$ref": "#/components/schemas/UploadActorResponseDto"
      },
      "fileName": {
        "type": "string"
      },
      "mimeType": {
        "type": "string"
      },
      "byteSize": {
        "type": "number",
        "minimum": 1
      },
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video"
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "uploading",
          "processing",
          "ready",
          "failed",
          "expired"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "expiresAt": {
        "type": "string",
        "format": "date-time"
      },
      "failureCode": {
        "type": "string",
        "nullable": true
      },
      "completedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "upload": {
        "$ref": "#/components/schemas/UploadDestinationDto"
      }
    },
    "required": [
      "id",
      "centerId",
      "createdBy",
      "fileName",
      "mimeType",
      "byteSize",
      "kind",
      "status",
      "version",
      "expiresAt",
      "failureCode",
      "completedAt",
      "createdAt",
      "updatedAt",
      "upload"
    ]
  },
  "UploadPartDto": {
    "type": "object",
    "properties": {
      "partNumber": {
        "type": "number",
        "minimum": 1
      },
      "etag": {
        "type": "string"
      }
    },
    "required": [
      "partNumber",
      "etag"
    ]
  },
  "CompleteUploadDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "parts": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/UploadPartDto"
        }
      }
    },
    "required": [
      "expectedVersion",
      "parts"
    ]
  },
  "MemberAvatarUploadResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "createdBy": {
        "$ref": "#/components/schemas/UploadActorResponseDto"
      },
      "fileName": {
        "type": "string"
      },
      "mimeType": {
        "type": "string"
      },
      "byteSize": {
        "type": "number",
        "minimum": 1
      },
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video"
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "uploading",
          "processing",
          "ready",
          "failed",
          "expired"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "expiresAt": {
        "type": "string",
        "format": "date-time"
      },
      "failureCode": {
        "type": "string",
        "nullable": true
      },
      "completedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "assetId": {
        "type": "string",
        "format": "uuid",
        "description": "Ready media asset identifier accepted by PATCH /members/me"
      }
    },
    "required": [
      "id",
      "centerId",
      "createdBy",
      "fileName",
      "mimeType",
      "byteSize",
      "kind",
      "status",
      "version",
      "expiresAt",
      "failureCode",
      "completedAt",
      "createdAt",
      "updatedAt",
      "assetId"
    ]
  },
  "CreateManagedMemberDto": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "example": "陈同学"
      },
      "studentId": {
        "type": "string",
        "example": "2026001001"
      },
      "grade": {
        "type": "string",
        "example": "2026"
      },
      "className": {
        "type": "string",
        "example": "软件工程 1 班"
      },
      "identity": {
        "type": "string",
        "enum": [
          "preparatory",
          "formal-member"
        ]
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "duty": {
        "type": "string",
        "enum": [
          "REGULAR",
          "CORE"
        ]
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ],
        "description": "Required only for a formal Baize member"
      }
    },
    "required": [
      "name",
      "studentId",
      "grade",
      "className",
      "identity"
    ]
  },
  "UpdateManagedProfileDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Required optimistic-lock person version"
      },
      "name": {
        "type": "string",
        "example": "陈同学"
      },
      "grade": {
        "type": "string",
        "example": "2027"
      },
      "className": {
        "type": "string",
        "example": "软件工程 2 班"
      },
      "contact": {
        "type": "string",
        "example": "example@school.edu.cn"
      },
      "bio": {
        "type": "string",
        "example": "HSD member profile"
      },
      "biography": {
        "type": "string",
        "example": "HSD member biography"
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "PromoteManagedMemberDto": {
    "type": "object",
    "properties": {
      "confirmed": {
        "type": "boolean",
        "description": "Explicit confirmation of the identity transition"
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Required optimistic-lock person version"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "duty": {
        "type": "string",
        "enum": [
          "REGULAR",
          "CORE"
        ]
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ],
        "description": "Required only for a Baize member"
      }
    },
    "required": [
      "confirmed",
      "expectedVersion",
      "centerId",
      "duty"
    ]
  },
  "UploadResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "createdBy": {
        "$ref": "#/components/schemas/UploadActorResponseDto"
      },
      "fileName": {
        "type": "string"
      },
      "mimeType": {
        "type": "string"
      },
      "byteSize": {
        "type": "number",
        "minimum": 1
      },
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video"
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "uploading",
          "processing",
          "ready",
          "failed",
          "expired"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "expiresAt": {
        "type": "string",
        "format": "date-time"
      },
      "failureCode": {
        "type": "string",
        "nullable": true
      },
      "completedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "id",
      "centerId",
      "createdBy",
      "fileName",
      "mimeType",
      "byteSize",
      "kind",
      "status",
      "version",
      "expiresAt",
      "failureCode",
      "completedAt",
      "createdAt",
      "updatedAt"
    ]
  },
  "UploadListResponseDto": {
    "type": "object",
    "properties": {
      "page": {
        "type": "integer",
        "minimum": 1
      },
      "pageSize": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "total": {
        "type": "integer",
        "minimum": 0
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/UploadResponseDto"
        }
      }
    },
    "required": [
      "page",
      "pageSize",
      "total",
      "items"
    ]
  },
  "CreateUploadIntentDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 0,
        "maximum": 0
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "fileName": {
        "type": "string",
        "maxLength": 180
      },
      "mimeType": {
        "type": "string",
        "enum": [
          "image/jpeg",
          "image/png",
          "image/webp",
          "video/mp4",
          "video/webm"
        ]
      },
      "byteSize": {
        "type": "number",
        "minimum": 1
      },
      "checksumSha256": {
        "type": "string",
        "minLength": 64,
        "maxLength": 64
      },
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video"
        ]
      }
    },
    "required": [
      "expectedVersion",
      "centerId",
      "fileName",
      "mimeType",
      "byteSize",
      "checksumSha256",
      "kind"
    ]
  },
  "CreateMediaAttachmentDto": {
    "type": "object",
    "properties": {
      "uploadId": {
        "type": "string",
        "format": "uuid"
      },
      "expectedUploadVersion": {
        "type": "number",
        "minimum": 1
      },
      "ownerType": {
        "type": "string",
        "enum": [
          "content",
          "portal_home",
          "portal_join",
          "project",
          "activity",
          "gallery",
          "resource"
        ]
      },
      "ownerId": {
        "type": "string"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "role": {
        "type": "string",
        "enum": [
          "cover",
          "detail",
          "visual"
        ]
      },
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video"
        ]
      },
      "title": {
        "type": "string",
        "maxLength": 200
      },
      "caption": {
        "type": "string",
        "maxLength": 500
      },
      "alt": {
        "type": "string",
        "maxLength": 300
      },
      "aspect": {
        "type": "string",
        "enum": [
          "landscape",
          "portrait",
          "wide"
        ]
      },
      "sortOrder": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "uploadId",
      "expectedUploadVersion",
      "ownerType",
      "ownerId",
      "centerId",
      "role",
      "kind",
      "title",
      "caption",
      "alt",
      "aspect",
      "sortOrder"
    ]
  },
  "MediaAttachmentResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "ownerType": {
        "type": "string",
        "enum": [
          "content",
          "portal_home",
          "portal_join",
          "project",
          "activity",
          "gallery",
          "resource"
        ]
      },
      "ownerId": {
        "type": "string"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "role": {
        "type": "string",
        "enum": [
          "cover",
          "detail",
          "visual"
        ]
      },
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video"
        ]
      },
      "title": {
        "type": "string"
      },
      "caption": {
        "type": "string"
      },
      "alt": {
        "type": "string"
      },
      "aspect": {
        "type": "string",
        "enum": [
          "landscape",
          "portrait",
          "wide"
        ]
      },
      "sortOrder": {
        "type": "number",
        "minimum": 0
      },
      "status": {
        "type": "string",
        "enum": [
          "ready",
          "failed"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "uploadVersion": {
        "type": "number",
        "minimum": 1
      },
      "url": {
        "type": "string"
      },
      "thumbnailUrl": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "ownerType",
      "ownerId",
      "centerId",
      "role",
      "kind",
      "title",
      "caption",
      "alt",
      "aspect",
      "sortOrder",
      "status",
      "version",
      "uploadVersion",
      "url"
    ]
  },
  "UpdateMediaAttachmentDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "title": {
        "type": "string",
        "maxLength": 200
      },
      "caption": {
        "type": "string",
        "maxLength": 500
      },
      "alt": {
        "type": "string",
        "maxLength": 300
      },
      "aspect": {
        "type": "string",
        "enum": [
          "landscape",
          "portrait",
          "wide"
        ]
      },
      "sortOrder": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "Object": {
    "type": "object",
    "properties": {}
  },
  "GrantAdminQualificationDto": {
    "type": "object",
    "properties": {
      "confirmed": {
        "type": "boolean",
        "description": "Explicit confirmation for consequential actions"
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Required optimistic-lock account version"
      },
      "adminCenterId": {
        "type": "string",
        "format": "uuid",
        "description": "Center this administrator can manage"
      }
    },
    "required": [
      "expectedVersion",
      "adminCenterId"
    ]
  },
  "ErrorResponse": {
    "type": "object",
    "required": [
      "code",
      "message",
      "requestId"
    ],
    "properties": {
      "code": {
        "type": "string",
        "example": "VALIDATION_FAILED"
      },
      "message": {
        "type": "string",
        "example": "Request could not be processed"
      },
      "requestId": {
        "type": "string",
        "example": "req_01"
      },
      "fieldErrors": {
        "type": "object",
        "additionalProperties": {
          "type": "string"
        }
      }
    }
  },
  "ChangeAdminQualificationDto": {
    "type": "object",
    "properties": {
      "confirmed": {
        "type": "boolean",
        "description": "Explicit confirmation for consequential actions"
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Required optimistic-lock account version"
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "OwnerRoleQualificationDto": {
    "type": "object",
    "properties": {
      "confirmed": {
        "type": "boolean",
        "description": "Explicit confirmation for consequential actions"
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Required optimistic-lock account version"
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "DemoteOwnerDto": {
    "type": "object",
    "properties": {
      "confirmed": {
        "type": "boolean",
        "description": "Explicit confirmation for consequential actions"
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Required optimistic-lock account version"
      },
      "adminCenterId": {
        "type": "string",
        "format": "uuid",
        "description": "Center scope assigned to the demoted owner"
      }
    },
    "required": [
      "expectedVersion",
      "adminCenterId"
    ]
  },
  "ChangeCenterLeadershipDto": {
    "type": "object",
    "properties": {
      "confirmed": {
        "type": "boolean",
        "description": "Explicit confirmation for consequential actions"
      },
      "expectedAccountVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Optimistic-lock target account version"
      }
    },
    "required": [
      "expectedAccountVersion"
    ]
  },
  "AppointOrganizationPositionDto": {
    "type": "object",
    "properties": {
      "expectedAccountVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Optimistic-lock target account version"
      },
      "expectedMembershipVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Optimistic-lock target membership version"
      }
    },
    "required": [
      "expectedAccountVersion",
      "expectedMembershipVersion"
    ]
  },
  "OrganizationPositionResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "type": {
        "type": "string",
        "enum": [
          "ALLIANCE_OWNER",
          "CENTER_MINISTER",
          "PROJECT_LEAD"
        ]
      },
      "centerId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "projectId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "appointedAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "id",
      "personId",
      "type",
      "centerId",
      "projectId",
      "version",
      "appointedAt"
    ]
  },
  "RevokeOrganizationPositionDto": {
    "type": "object",
    "properties": {
      "expectedPositionVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Optimistic-lock active position version"
      },
      "reason": {
        "type": "string",
        "maxLength": 500
      }
    },
    "required": [
      "expectedPositionVersion"
    ]
  },
  "HandoverCenterMinisterDto": {
    "type": "object",
    "properties": {
      "expectedOutgoingPositionVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Optimistic-lock outgoing minister position version"
      },
      "expectedIncomingAccountVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Optimistic-lock incoming account version"
      },
      "expectedIncomingMembershipVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Optimistic-lock incoming membership version"
      },
      "reason": {
        "type": "string",
        "maxLength": 500
      }
    },
    "required": [
      "expectedOutgoingPositionVersion",
      "expectedIncomingAccountVersion",
      "expectedIncomingMembershipVersion"
    ]
  },
  "SetCoreMembershipDto": {
    "type": "object",
    "properties": {
      "core": {
        "type": "boolean"
      },
      "expectedMembershipVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Optimistic-lock target membership version"
      }
    },
    "required": [
      "core",
      "expectedMembershipVersion"
    ]
  },
  "CenterSummaryResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "slug",
      "name"
    ]
  },
  "MembershipResponseDto": {
    "type": "object",
    "properties": {
      "duty": {
        "type": "string",
        "enum": [
          "REGULAR",
          "CORE"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1,
        "description": "Optimistic-lock membership version"
      },
      "center": {
        "$ref": "#/components/schemas/CenterSummaryResponseDto"
      }
    },
    "required": [
      "duty",
      "version",
      "center"
    ]
  },
  "PublicHomepageStatsResponseDto": {
    "type": "object",
    "properties": {
      "formalMembers": {
        "type": "number",
        "minimum": 0
      },
      "coreMembers": {
        "type": "number",
        "minimum": 0
      },
      "activeCenters": {
        "type": "number",
        "minimum": 0
      },
      "publishedProjects": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "formalMembers",
      "coreMembers",
      "activeCenters",
      "publishedProjects"
    ]
  },
  "PublicRecruitmentCenterDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "slug",
      "name"
    ]
  },
  "PublicRecruitmentBatchDto": {
    "type": "object",
    "properties": {
      "effectiveStatus": {
        "type": "string",
        "enum": [
          "draft",
          "upcoming",
          "open",
          "paused",
          "closed",
          "archived"
        ]
      },
      "effectiveStatusReason": {
        "type": "string",
        "enum": [
          "draft",
          "before-start",
          "within-window",
          "after-end",
          "force-open",
          "paused",
          "force-closed",
          "archived"
        ]
      },
      "id": {
        "type": "string",
        "description": "High-entropy opaque public batch token",
        "example": "c4c9eab9a7f14655a4c3b32dd12ba66f"
      },
      "name": {
        "type": "string"
      },
      "startAt": {
        "type": "string",
        "format": "date-time"
      },
      "endAt": {
        "type": "string",
        "format": "date-time"
      },
      "timezone": {
        "type": "string",
        "enum": [
          "Asia/Shanghai"
        ]
      },
      "openCenters": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicRecruitmentCenterDto"
        }
      }
    },
    "required": [
      "effectiveStatus",
      "effectiveStatusReason",
      "id",
      "name",
      "startAt",
      "endAt",
      "timezone",
      "openCenters"
    ]
  },
  "PublicRecruitmentBatchEnvelopeDto": {
    "type": "object",
    "properties": {
      "batch": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/PublicRecruitmentBatchDto"
          }
        ]
      }
    },
    "required": [
      "batch"
    ]
  },
  "RecruitmentApplicationCenterDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "slug",
      "name"
    ]
  },
  "RecruitmentApplicationPreferenceDto": {
    "type": "object",
    "properties": {
      "rank": {
        "type": "number",
        "enum": [
          1,
          2,
          3
        ]
      },
      "center": {
        "$ref": "#/components/schemas/RecruitmentApplicationCenterDto"
      }
    },
    "required": [
      "rank",
      "center"
    ]
  },
  "MyRecruitmentApplicationResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "batchId": {
        "type": "string",
        "format": "uuid"
      },
      "contact": {
        "type": "string"
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ],
        "nullable": true
      },
      "acceptsAdjustment": {
        "type": "boolean"
      },
      "status": {
        "type": "string",
        "enum": [
          "SUBMITTED",
          "WITHDRAWN",
          "PROCESSING",
          "COMPLETED"
        ]
      },
      "version": {
        "type": "number"
      },
      "submittedAt": {
        "type": "string",
        "format": "date-time"
      },
      "withdrawnAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "locked": {
        "type": "boolean"
      },
      "preferences": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/RecruitmentApplicationPreferenceDto"
        }
      }
    },
    "required": [
      "id",
      "batchId",
      "contact",
      "baizeDirection",
      "acceptsAdjustment",
      "status",
      "version",
      "submittedAt",
      "withdrawnAt",
      "locked",
      "preferences"
    ]
  },
  "MyRecruitmentApplicationEnvelopeDto": {
    "type": "object",
    "properties": {
      "application": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/MyRecruitmentApplicationResponseDto"
          }
        ]
      }
    },
    "required": [
      "application"
    ]
  },
  "RecruitmentPreferenceInputDto": {
    "type": "object",
    "properties": {
      "centerId": {
        "type": "string",
        "description": "Public center slug from recruitment discovery; legacy authenticated clients may send a center UUID"
      },
      "rank": {
        "type": "number",
        "minimum": 1,
        "maximum": 3
      }
    },
    "required": [
      "centerId",
      "rank"
    ]
  },
  "SubmitApplicationDto": {
    "type": "object",
    "properties": {
      "contact": {
        "type": "string",
        "minLength": 4,
        "maxLength": 50
      },
      "preferences": {
        "minItems": 1,
        "maxItems": 3,
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/RecruitmentPreferenceInputDto"
        }
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ]
      },
      "acceptsAdjustment": {
        "type": "boolean"
      }
    },
    "required": [
      "contact",
      "preferences",
      "acceptsAdjustment"
    ]
  },
  "UpdateApplicationDto": {
    "type": "object",
    "properties": {
      "contact": {
        "type": "string",
        "minLength": 4,
        "maxLength": 50
      },
      "preferences": {
        "minItems": 1,
        "maxItems": 3,
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/RecruitmentPreferenceInputDto"
        }
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ]
      },
      "acceptsAdjustment": {
        "type": "boolean"
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "contact",
      "preferences",
      "acceptsAdjustment",
      "expectedVersion"
    ]
  },
  "WithdrawApplicationDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "CreateRecruitmentBatchDto": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "minLength": 2,
        "maxLength": 80
      },
      "startAt": {
        "type": "string",
        "format": "date-time"
      },
      "endAt": {
        "type": "string",
        "format": "date-time"
      },
      "timezone": {
        "type": "string",
        "enum": [
          "Asia/Shanghai"
        ]
      },
      "openCenterIds": {
        "minItems": 1,
        "maxItems": 4,
        "uniqueItems": true,
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        }
      },
      "responsibleAccountIds": {
        "maxItems": 20,
        "uniqueItems": true,
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        }
      }
    },
    "required": [
      "name",
      "startAt",
      "endAt",
      "timezone",
      "openCenterIds",
      "responsibleAccountIds"
    ]
  },
  "AdminRecruitmentCenterDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "active": {
        "type": "boolean"
      }
    },
    "required": [
      "id",
      "slug",
      "name",
      "active"
    ]
  },
  "AdminRecruitmentResponsiblePersonDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "name"
    ]
  },
  "AdminRecruitmentResponsibleAccountDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "username": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "ENABLED",
          "DISABLED"
        ]
      },
      "adminLevel": {
        "type": "string",
        "enum": [
          "MEMBER",
          "ADMIN",
          "OWNER"
        ]
      },
      "person": {
        "$ref": "#/components/schemas/AdminRecruitmentResponsiblePersonDto"
      }
    },
    "required": [
      "id",
      "username",
      "status",
      "adminLevel",
      "person"
    ]
  },
  "AdminRecruitmentBatchDto": {
    "type": "object",
    "properties": {
      "effectiveStatus": {
        "type": "string",
        "enum": [
          "draft",
          "upcoming",
          "open",
          "paused",
          "closed",
          "archived"
        ]
      },
      "effectiveStatusReason": {
        "type": "string",
        "enum": [
          "draft",
          "before-start",
          "within-window",
          "after-end",
          "force-open",
          "paused",
          "force-closed",
          "archived"
        ]
      },
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      },
      "startAt": {
        "type": "string",
        "format": "date-time"
      },
      "endAt": {
        "type": "string",
        "format": "date-time"
      },
      "timezone": {
        "type": "string",
        "enum": [
          "Asia/Shanghai"
        ]
      },
      "lifecycleStatus": {
        "type": "string",
        "enum": [
          "DRAFT",
          "PUBLISHED",
          "CLOSED",
          "ARCHIVED"
        ]
      },
      "manualOverride": {
        "type": "string",
        "enum": [
          "NONE",
          "FORCE_OPEN",
          "PAUSED",
          "FORCE_CLOSED"
        ]
      },
      "version": {
        "type": "number"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "actualOpenedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "closedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "archivedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "applicationCount": {
        "type": "number"
      },
      "openCenters": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminRecruitmentCenterDto"
        }
      },
      "responsibleAccounts": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminRecruitmentResponsibleAccountDto"
        }
      }
    },
    "required": [
      "effectiveStatus",
      "effectiveStatusReason",
      "id",
      "name",
      "startAt",
      "endAt",
      "timezone",
      "lifecycleStatus",
      "manualOverride",
      "version",
      "publishedAt",
      "actualOpenedAt",
      "closedAt",
      "archivedAt",
      "createdAt",
      "updatedAt",
      "applicationCount",
      "openCenters",
      "responsibleAccounts"
    ]
  },
  "AdminRecruitmentBatchListDto": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number"
      },
      "pageSize": {
        "type": "number"
      },
      "total": {
        "type": "number"
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminRecruitmentBatchDto"
        }
      }
    },
    "required": [
      "page",
      "pageSize",
      "total",
      "items"
    ]
  },
  "RecruitmentBatchLifecycleTargetDto": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "RecruitmentBatch"
        ]
      },
      "id": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "id"
    ]
  },
  "RecruitmentBatchLifecycleSnapshotDto": {
    "type": "object",
    "properties": {
      "name": {
        "oneOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "boolean"
          },
          {
            "nullable": true,
            "enum": [
              null
            ]
          },
          {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "nullable": true,
                  "enum": [
                    null
                  ]
                }
              ]
            }
          }
        ]
      },
      "startAt": {
        "oneOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "boolean"
          },
          {
            "nullable": true,
            "enum": [
              null
            ]
          },
          {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "nullable": true,
                  "enum": [
                    null
                  ]
                }
              ]
            }
          }
        ]
      },
      "endAt": {
        "oneOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "boolean"
          },
          {
            "nullable": true,
            "enum": [
              null
            ]
          },
          {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "nullable": true,
                  "enum": [
                    null
                  ]
                }
              ]
            }
          }
        ]
      },
      "timezone": {
        "oneOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "boolean"
          },
          {
            "nullable": true,
            "enum": [
              null
            ]
          },
          {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "nullable": true,
                  "enum": [
                    null
                  ]
                }
              ]
            }
          }
        ]
      },
      "lifecycleStatus": {
        "oneOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "boolean"
          },
          {
            "nullable": true,
            "enum": [
              null
            ]
          },
          {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "nullable": true,
                  "enum": [
                    null
                  ]
                }
              ]
            }
          }
        ]
      },
      "manualOverride": {
        "oneOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "boolean"
          },
          {
            "nullable": true,
            "enum": [
              null
            ]
          },
          {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "nullable": true,
                  "enum": [
                    null
                  ]
                }
              ]
            }
          }
        ]
      },
      "version": {
        "oneOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "boolean"
          },
          {
            "nullable": true,
            "enum": [
              null
            ]
          },
          {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "nullable": true,
                  "enum": [
                    null
                  ]
                }
              ]
            }
          }
        ]
      },
      "openCenterIds": {
        "oneOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "boolean"
          },
          {
            "nullable": true,
            "enum": [
              null
            ]
          },
          {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "nullable": true,
                  "enum": [
                    null
                  ]
                }
              ]
            }
          }
        ]
      },
      "responsibleAccountIds": {
        "oneOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "boolean"
          },
          {
            "nullable": true,
            "enum": [
              null
            ]
          },
          {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "number"
                },
                {
                  "type": "boolean"
                },
                {
                  "nullable": true,
                  "enum": [
                    null
                  ]
                }
              ]
            }
          }
        ]
      }
    },
    "additionalProperties": false
  },
  "RecruitmentBatchLifecycleEventDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "actor": {
        "$ref": "#/components/schemas/SafeAuditActorDto"
      },
      "action": {
        "type": "string",
        "enum": [
          "recruitment.batch.created",
          "recruitment.batch.updated",
          "recruitment.batch.published",
          "recruitment.batch.opened",
          "recruitment.batch.paused",
          "recruitment.batch.resumed",
          "recruitment.batch.closed",
          "recruitment.batch.reopened",
          "recruitment.batch.archived"
        ]
      },
      "target": {
        "$ref": "#/components/schemas/RecruitmentBatchLifecycleTargetDto"
      },
      "before": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/RecruitmentBatchLifecycleSnapshotDto"
          }
        ]
      },
      "after": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/RecruitmentBatchLifecycleSnapshotDto"
          }
        ]
      },
      "reason": {
        "type": "string",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "id",
      "actor",
      "action",
      "target",
      "before",
      "after",
      "reason",
      "createdAt"
    ]
  },
  "RecruitmentBatchLifecycleEventListDto": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number",
        "minimum": 1
      },
      "pageSize": {
        "type": "number",
        "minimum": 1,
        "maximum": 100
      },
      "total": {
        "type": "number",
        "minimum": 0
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/RecruitmentBatchLifecycleEventDto"
        }
      }
    },
    "required": [
      "page",
      "pageSize",
      "total",
      "items"
    ]
  },
  "RecruitmentApplicantSnapshotDto": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string"
      },
      "studentId": {
        "type": "string"
      },
      "grade": {
        "type": "string"
      },
      "className": {
        "type": "string"
      },
      "contact": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "studentId",
      "grade",
      "className",
      "contact"
    ]
  },
  "AdminRecruitmentApplicationPreferenceDto": {
    "type": "object",
    "properties": {
      "rank": {
        "type": "number",
        "enum": [
          1,
          2,
          3
        ]
      },
      "center": {
        "$ref": "#/components/schemas/RecruitmentApplicationCenterDto"
      }
    },
    "required": [
      "rank",
      "center"
    ]
  },
  "AdminRecruitmentApplicationDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "batchId": {
        "type": "string",
        "format": "uuid"
      },
      "contact": {
        "type": "string"
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ],
        "nullable": true
      },
      "acceptsAdjustment": {
        "type": "boolean"
      },
      "status": {
        "type": "string",
        "enum": [
          "SUBMITTED",
          "WITHDRAWN",
          "PROCESSING",
          "COMPLETED"
        ]
      },
      "version": {
        "type": "number"
      },
      "batchNameSnapshot": {
        "type": "string"
      },
      "batchVersionAtSubmission": {
        "type": "number"
      },
      "applicantProfileSnapshot": {
        "$ref": "#/components/schemas/RecruitmentApplicantSnapshotDto"
      },
      "submittedAt": {
        "type": "string",
        "format": "date-time"
      },
      "withdrawnAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "preferences": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminRecruitmentApplicationPreferenceDto"
        }
      }
    },
    "required": [
      "id",
      "batchId",
      "contact",
      "baizeDirection",
      "acceptsAdjustment",
      "status",
      "version",
      "batchNameSnapshot",
      "batchVersionAtSubmission",
      "applicantProfileSnapshot",
      "submittedAt",
      "withdrawnAt",
      "preferences"
    ]
  },
  "AdminRecruitmentApplicationListDto": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number"
      },
      "pageSize": {
        "type": "number"
      },
      "total": {
        "type": "number"
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminRecruitmentApplicationDto"
        }
      }
    },
    "required": [
      "page",
      "pageSize",
      "total",
      "items"
    ]
  },
  "UpdateRecruitmentBatchDto": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "minLength": 2,
        "maxLength": 80
      },
      "startAt": {
        "type": "string",
        "format": "date-time"
      },
      "endAt": {
        "type": "string",
        "format": "date-time"
      },
      "timezone": {
        "type": "string",
        "enum": [
          "Asia/Shanghai"
        ]
      },
      "openCenterIds": {
        "minItems": 1,
        "maxItems": 4,
        "uniqueItems": true,
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        }
      },
      "responsibleAccountIds": {
        "maxItems": 20,
        "uniqueItems": true,
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        }
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "reason": {
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "RecruitmentBatchCommandDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "confirmed": {
        "type": "boolean"
      },
      "reason": {
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "AdminContentActorResponseDto": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "account",
          "system"
        ]
      },
      "accountId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "username": {
        "type": "string",
        "nullable": true
      },
      "displayName": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "accountId",
      "username",
      "displayName"
    ]
  },
  "AdminContentSummaryResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "publicId": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "slug": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "enum": [
          "flash",
          "article",
          "notice"
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "review",
          "pending_publication",
          "published",
          "offline"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "workingRevisionNumber": {
        "type": "number",
        "minimum": 1
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string",
        "nullable": true
      },
      "createdBy": {
        "$ref": "#/components/schemas/AdminContentActorResponseDto"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "offlineAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      }
    },
    "required": [
      "id",
      "publicId",
      "centerId",
      "slug",
      "kind",
      "status",
      "version",
      "workingRevisionNumber",
      "title",
      "summary",
      "createdBy",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "offlineAt"
    ]
  },
  "AdminContentListResponseDto": {
    "type": "object",
    "properties": {
      "page": {
        "type": "integer",
        "minimum": 1
      },
      "pageSize": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "total": {
        "type": "integer",
        "minimum": 0
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminContentSummaryResponseDto"
        }
      }
    },
    "required": [
      "page",
      "pageSize",
      "total",
      "items"
    ]
  },
  "ContentWorkingRevisionResponseDto": {
    "type": "object",
    "properties": {
      "revisionNumber": {
        "type": "number",
        "minimum": 1
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string",
        "nullable": true
      },
      "tag": {
        "type": "string",
        "nullable": true
      },
      "internalTarget": {
        "type": "string",
        "nullable": true
      },
      "expiresAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "blocks": {
        "type": "array",
        "items": {
          "oneOf": [
            {
              "$ref": "#/components/schemas/ContentHeadingBlockResponseDto"
            },
            {
              "$ref": "#/components/schemas/ContentParagraphBlockResponseDto"
            },
            {
              "$ref": "#/components/schemas/ContentAttachmentImageBlockResponseDto"
            }
          ]
        }
      },
      "internalNote": {
        "type": "string",
        "nullable": true
      }
    },
    "required": [
      "revisionNumber",
      "title",
      "summary",
      "tag",
      "internalTarget",
      "expiresAt",
      "blocks",
      "internalNote"
    ]
  },
  "AdminContentResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "publicId": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "slug": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "enum": [
          "flash",
          "article",
          "notice"
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "review",
          "pending_publication",
          "published",
          "offline"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "createdBy": {
        "$ref": "#/components/schemas/AdminContentActorResponseDto"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "workingRevision": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/ContentWorkingRevisionResponseDto"
          }
        ]
      },
      "publishedRevisionNumber": {
        "type": "number",
        "nullable": true
      },
      "rejectionReason": {
        "type": "string",
        "nullable": true
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "offlineAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "offlineReason": {
        "type": "string",
        "nullable": true
      }
    },
    "required": [
      "id",
      "publicId",
      "centerId",
      "slug",
      "kind",
      "status",
      "version",
      "createdBy",
      "createdAt",
      "updatedAt",
      "workingRevision",
      "publishedRevisionNumber",
      "rejectionReason",
      "publishedAt",
      "offlineAt",
      "offlineReason"
    ]
  },
  "CreateContentDto": {
    "type": "object",
    "properties": {
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "kind": {
        "type": "string",
        "enum": [
          "flash",
          "article",
          "notice"
        ]
      },
      "slug": {
        "type": "string",
        "example": "community-update"
      },
      "title": {
        "type": "string",
        "maxLength": 120
      },
      "summary": {
        "type": "string",
        "maxLength": 500
      },
      "tag": {
        "type": "string",
        "maxLength": 40
      },
      "internalTarget": {
        "type": "string",
        "maxLength": 500
      },
      "expiresAt": {
        "type": "string",
        "format": "date-time"
      },
      "blocks": {
        "type": "array",
        "items": {
          "type": "object"
        },
        "default": []
      },
      "internalNote": {
        "type": "string",
        "maxLength": 2000
      }
    },
    "required": [
      "centerId",
      "kind",
      "slug",
      "title"
    ]
  },
  "UpdateContentDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "title": {
        "type": "string",
        "maxLength": 120
      },
      "summary": {
        "type": "string",
        "maxLength": 500
      },
      "tag": {
        "type": "string",
        "maxLength": 40
      },
      "internalTarget": {
        "type": "string",
        "maxLength": 500
      },
      "expiresAt": {
        "type": "string",
        "format": "date-time"
      },
      "blocks": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "internalNote": {
        "type": "string",
        "maxLength": 2000
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "ContentCommandDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "ReasonedContentCommandDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "reason": {
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      }
    },
    "required": [
      "expectedVersion",
      "reason"
    ]
  },
  "PublishContentDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "confirmed": {
        "type": "boolean",
        "description": "Must be true to publish the selected working revision"
      }
    },
    "required": [
      "expectedVersion",
      "confirmed"
    ]
  },
  "PublicContentResponseDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "enum": [
          "flash",
          "article",
          "notice"
        ]
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string",
        "nullable": true
      },
      "tag": {
        "type": "string",
        "nullable": true
      },
      "expiresAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "blocks": {
        "type": "array",
        "items": {
          "oneOf": [
            {
              "$ref": "#/components/schemas/ContentHeadingBlockResponseDto"
            },
            {
              "$ref": "#/components/schemas/ContentParagraphBlockResponseDto"
            },
            {
              "$ref": "#/components/schemas/ContentImageBlockResponseDto"
            }
          ]
        }
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      }
    },
    "required": [
      "slug",
      "kind",
      "title",
      "summary",
      "tag",
      "expiresAt",
      "blocks",
      "publishedAt"
    ]
  },
  "PublicContentListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicContentResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "AssessmentCenterDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "slug",
      "name"
    ]
  },
  "AssessmentAdjustmentTargetCatalogResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AssessmentCenterDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "AssessmentBatchDetailDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      },
      "lifecycleStatus": {
        "type": "string",
        "enum": [
          "draft",
          "upcoming",
          "open",
          "paused",
          "closed",
          "archived"
        ]
      }
    },
    "required": [
      "id",
      "name",
      "lifecycleStatus"
    ]
  },
  "AssessmentAdvanceBlockerDto": {
    "type": "object",
    "properties": {
      "code": {
        "type": "string",
        "enum": [
          "ASSESSMENT_BATCH_NOT_CLOSED",
          "ASSESSMENT_NOT_EDITABLE",
          "ASSESSMENT_ROUND_INCOMPLETE",
          "ASSESSMENT_ADJUSTMENT_PENDING"
        ]
      },
      "count": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "code",
      "count"
    ]
  },
  "AssessmentPersonDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      },
      "studentId": {
        "type": "string"
      },
      "grade": {
        "type": "string"
      },
      "className": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "name",
      "studentId",
      "grade",
      "className"
    ]
  },
  "AssessmentPreferenceDto": {
    "type": "object",
    "properties": {
      "rank": {
        "type": "string",
        "enum": [
          "FIRST",
          "SECOND",
          "THIRD"
        ]
      },
      "center": {
        "$ref": "#/components/schemas/AssessmentCenterDto"
      }
    },
    "required": [
      "rank",
      "center"
    ]
  },
  "AssessmentRoundResultDto": {
    "type": "object",
    "properties": {
      "round": {
        "type": "number",
        "minimum": 1,
        "maximum": 3
      },
      "outcome": {
        "type": "string",
        "enum": [
          "PASSED",
          "FAILED"
        ]
      },
      "internalNote": {
        "type": "string",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "round",
      "outcome",
      "internalNote",
      "createdAt"
    ]
  },
  "AssessmentAdjustmentProposalDto": {
    "type": "object",
    "properties": {
      "targetCenter": {
        "$ref": "#/components/schemas/AssessmentCenterDto"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "targetCenter",
      "createdAt"
    ]
  },
  "AssessmentAdjustmentDecisionDto": {
    "type": "object",
    "properties": {
      "decision": {
        "type": "string",
        "enum": [
          "ADMITTED",
          "NOT_ADMITTED"
        ]
      },
      "targetCenter": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/AssessmentCenterDto"
          }
        ]
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "decision",
      "targetCenter",
      "createdAt"
    ]
  },
  "AssessmentFinalResultDto": {
    "type": "object",
    "properties": {
      "decision": {
        "type": "string",
        "enum": [
          "ADMITTED",
          "NOT_ADMITTED"
        ]
      },
      "finalCenter": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/AssessmentCenterDto"
          }
        ]
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "decision",
      "finalCenter",
      "publishedAt"
    ]
  },
  "AssessmentCandidateDto": {
    "type": "object",
    "properties": {
      "applicationId": {
        "type": "string",
        "format": "uuid"
      },
      "person": {
        "$ref": "#/components/schemas/AssessmentPersonDto"
      },
      "acceptsAdjustment": {
        "type": "boolean"
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ],
        "nullable": true
      },
      "preferences": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AssessmentPreferenceDto"
        }
      },
      "roundResults": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AssessmentRoundResultDto"
        }
      },
      "adjustmentProposal": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/AssessmentAdjustmentProposalDto"
          }
        ]
      },
      "adjustmentDecision": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/AssessmentAdjustmentDecisionDto"
          }
        ]
      },
      "finalResult": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/AssessmentFinalResultDto"
          }
        ]
      }
    },
    "required": [
      "applicationId",
      "person",
      "acceptsAdjustment",
      "baizeDirection",
      "preferences",
      "roundResults",
      "adjustmentProposal",
      "adjustmentDecision",
      "finalResult"
    ]
  },
  "AssessmentBatchResponseDto": {
    "type": "object",
    "properties": {
      "currentRound": {
        "type": "number",
        "minimum": 1,
        "maximum": 3
      },
      "status": {
        "type": "string",
        "enum": [
          "ASSESSING",
          "READY_TO_PUBLISH",
          "PUBLISHED"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "batch": {
        "$ref": "#/components/schemas/AssessmentBatchDetailDto"
      },
      "pending": {
        "type": "number",
        "minimum": 0
      },
      "adjustmentPending": {
        "type": "number",
        "minimum": 0
      },
      "canAdvance": {
        "type": "boolean"
      },
      "advanceBlocker": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/AssessmentAdvanceBlockerDto"
          }
        ]
      },
      "nextAction": {
        "type": "string",
        "enum": [
          "PUBLISH_BATCH",
          "OPEN_BATCH",
          "CLOSE_BATCH",
          "RECORD_CURRENT_ROUND_RESULTS",
          "SUBMIT_ADJUSTMENT_PROPOSALS",
          "DECIDE_ADJUSTMENTS",
          "ADVANCE_ROUND",
          "PUBLISH_RESULTS",
          "NONE"
        ]
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AssessmentCandidateDto"
        }
      }
    },
    "required": [
      "currentRound",
      "status",
      "version",
      "publishedAt",
      "batch",
      "pending",
      "adjustmentPending",
      "canAdvance",
      "advanceBlocker",
      "nextAction",
      "items"
    ]
  },
  "AdvanceAssessmentDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "confirmed": {
        "type": "boolean"
      },
      "reason": {
        "type": "string",
        "maxLength": 500
      }
    },
    "required": [
      "expectedVersion",
      "confirmed"
    ]
  },
  "AssessmentBatchStateResponseDto": {
    "type": "object",
    "properties": {
      "currentRound": {
        "type": "number",
        "minimum": 1,
        "maximum": 3
      },
      "status": {
        "type": "string",
        "enum": [
          "ASSESSING",
          "READY_TO_PUBLISH",
          "PUBLISHED"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      }
    },
    "required": [
      "currentRound",
      "status",
      "version",
      "publishedAt"
    ]
  },
  "PublishAssessmentDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "confirmed": {
        "type": "boolean"
      },
      "reason": {
        "type": "string",
        "maxLength": 500
      }
    },
    "required": [
      "expectedVersion",
      "confirmed"
    ]
  },
  "AssessmentPublicationSummaryDto": {
    "type": "object",
    "properties": {
      "admitted": {
        "type": "number",
        "minimum": 0
      },
      "notAdmitted": {
        "type": "number",
        "minimum": 0
      },
      "total": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "admitted",
      "notAdmitted",
      "total"
    ]
  },
  "AssessmentPublicationResponseDto": {
    "type": "object",
    "properties": {
      "currentRound": {
        "type": "number",
        "minimum": 1,
        "maximum": 3
      },
      "status": {
        "type": "string",
        "enum": [
          "ASSESSING",
          "READY_TO_PUBLISH",
          "PUBLISHED"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "summary": {
        "$ref": "#/components/schemas/AssessmentPublicationSummaryDto"
      }
    },
    "required": [
      "currentRound",
      "status",
      "version",
      "publishedAt",
      "summary"
    ]
  },
  "RecordRoundResultDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "round": {
        "type": "number",
        "minimum": 1,
        "maximum": 3
      },
      "outcome": {
        "type": "string",
        "enum": [
          "PASSED",
          "FAILED"
        ]
      },
      "internalNote": {
        "type": "string",
        "maxLength": 4000
      }
    },
    "required": [
      "expectedVersion",
      "round",
      "outcome"
    ]
  },
  "AssessmentRoundMutationResponseDto": {
    "type": "object",
    "properties": {
      "version": {
        "type": "number",
        "minimum": 1
      },
      "result": {
        "$ref": "#/components/schemas/AssessmentRoundResultDto"
      }
    },
    "required": [
      "version",
      "result"
    ]
  },
  "CreateAdjustmentProposalDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "targetCenterId": {
        "type": "string",
        "format": "uuid"
      }
    },
    "required": [
      "expectedVersion",
      "targetCenterId"
    ]
  },
  "AssessmentProposalMutationResponseDto": {
    "type": "object",
    "properties": {
      "version": {
        "type": "number",
        "minimum": 1
      },
      "proposal": {
        "$ref": "#/components/schemas/AssessmentAdjustmentProposalDto"
      }
    },
    "required": [
      "version",
      "proposal"
    ]
  },
  "DecideAdjustmentDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "decision": {
        "type": "string",
        "enum": [
          "ADMITTED",
          "NOT_ADMITTED"
        ]
      },
      "targetCenterId": {
        "type": "string",
        "format": "uuid"
      }
    },
    "required": [
      "expectedVersion",
      "decision"
    ]
  },
  "AssessmentDecisionMutationResponseDto": {
    "type": "object",
    "properties": {
      "version": {
        "type": "number",
        "minimum": 1
      },
      "decision": {
        "$ref": "#/components/schemas/AssessmentAdjustmentDecisionDto"
      }
    },
    "required": [
      "version",
      "decision"
    ]
  },
  "RecruitmentResultBatchDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "name"
    ]
  },
  "RecruitmentResponsibleContactDto": {
    "type": "object",
    "properties": {
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      },
      "position": {
        "type": "string",
        "enum": [
          "CENTER_MINISTER"
        ]
      },
      "displayContact": {
        "type": "string",
        "description": "Redacted contact value. The complete value requires the authorized contact endpoint."
      }
    },
    "required": [
      "personId",
      "name",
      "position",
      "displayContact"
    ]
  },
  "MyRecruitmentResultDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "batch": {
        "$ref": "#/components/schemas/RecruitmentResultBatchDto"
      },
      "decision": {
        "type": "string",
        "enum": [
          "ADMITTED",
          "NOT_ADMITTED"
        ]
      },
      "finalCenter": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/AssessmentCenterDto"
          }
        ]
      },
      "admissionSource": {
        "type": "string",
        "enum": [
          "FIRST_CHOICE",
          "ADJUSTMENT"
        ],
        "nullable": true
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ],
        "nullable": true
      },
      "preferences": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AssessmentPreferenceDto"
        }
      },
      "responsibleContacts": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/RecruitmentResponsibleContactDto"
        }
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "id",
      "batch",
      "decision",
      "finalCenter",
      "admissionSource",
      "baizeDirection",
      "preferences",
      "responsibleContacts",
      "publishedAt"
    ]
  },
  "MyRecruitmentResultListDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/MyRecruitmentResultDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "RecruitmentResponsibleContactValueDto": {
    "type": "object",
    "properties": {
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "contact": {
        "type": "string"
      }
    },
    "required": [
      "personId",
      "contact"
    ]
  },
  "CurrentOrganizationPermissionResponseDto": {
    "type": "object",
    "properties": {
      "accountId": {
        "type": "string",
        "format": "uuid"
      },
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "adminLevel": {
        "type": "string",
        "enum": [
          "MEMBER",
          "ADMIN",
          "OWNER"
        ]
      },
      "adminCenterId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "version": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "accountId",
      "personId",
      "adminLevel",
      "adminCenterId",
      "version"
    ]
  },
  "AdminCenterResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "active": {
        "type": "boolean"
      },
      "positions": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OrganizationPositionResponseDto"
        }
      }
    },
    "required": [
      "id",
      "slug",
      "name",
      "active",
      "positions"
    ]
  },
  "AdminCenterListResponseDto": {
    "type": "object",
    "properties": {
      "currentPermission": {
        "$ref": "#/components/schemas/CurrentOrganizationPermissionResponseDto"
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminCenterResponseDto"
        }
      }
    },
    "required": [
      "currentPermission",
      "items"
    ]
  },
  "CreateMembershipDto": {
    "type": "object",
    "properties": {
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "duty": {
        "type": "string",
        "enum": [
          "REGULAR",
          "CORE"
        ]
      },
      "expectedPersonVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Current person version read before assigning a center"
      }
    },
    "required": [
      "personId",
      "centerId",
      "duty",
      "expectedPersonVersion"
    ]
  },
  "UpdateMembershipDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Current membership version"
      },
      "duty": {
        "type": "string",
        "enum": [
          "REGULAR",
          "CORE"
        ]
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "RetireMembershipDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Current membership version"
      },
      "confirmed": {
        "type": "boolean",
        "example": true
      }
    },
    "required": [
      "expectedVersion",
      "confirmed"
    ]
  },
  "CreateCoreMemberDto": {
    "type": "object",
    "properties": {
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "expectedMembershipVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Current active membership version"
      },
      "expectedCoreVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Required current core-record version when reactivating a retired relation"
      },
      "roleTitle": {
        "type": "string",
        "example": "项目负责人"
      },
      "sortOrder": {
        "type": "number",
        "minimum": 0,
        "maximum": 100000
      }
    },
    "required": [
      "personId",
      "expectedMembershipVersion",
      "roleTitle",
      "sortOrder"
    ]
  },
  "UpdateCoreMemberDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Current core record version"
      },
      "roleTitle": {
        "type": "string",
        "example": "项目负责人"
      },
      "sortOrder": {
        "type": "number",
        "minimum": 0,
        "maximum": 100000
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "RetireCoreMemberDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1,
        "description": "Current core record version"
      },
      "confirmed": {
        "type": "boolean",
        "example": true
      }
    },
    "required": [
      "expectedVersion",
      "confirmed"
    ]
  },
  "PreparatoryMemberImportDto": {
    "type": "object",
    "properties": {
      "csv": {
        "type": "string",
        "description": "UTF-8 CSV with headers: studentId,name,grade,className",
        "example": "studentId,name,grade,className\\n2026000001,张同学,2026,软件工程 1 班"
      }
    },
    "required": [
      "csv"
    ]
  },
  "PortalResolvedEntryResponseDto": {
    "type": "object",
    "properties": {
      "slot": {
        "type": "string",
        "enum": [
          "flash",
          "news",
          "projects",
          "activities",
          "gallery",
          "resources"
        ]
      },
      "position": {
        "type": "number",
        "minimum": 1,
        "maximum": 4
      },
      "content": {
        "nullable": true,
        "oneOf": [
          {
            "$ref": "#/components/schemas/PublicContentResponseDto"
          },
          {
            "$ref": "#/components/schemas/PortalCatalogSnapshotResponseDto"
          }
        ]
      }
    },
    "required": [
      "slot",
      "position",
      "content"
    ]
  },
  "AdminPortalConfigurationResponseDto": {
    "type": "object",
    "properties": {
      "version": {
        "type": "number",
        "minimum": 0
      },
      "entries": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PortalResolvedEntryResponseDto"
        }
      },
      "visuals": {
        "type": "object",
        "description": "Global home/join visual attachment references"
      }
    },
    "required": [
      "version",
      "entries",
      "visuals"
    ]
  },
  "PortalConfigurationEntryDto": {
    "type": "object",
    "properties": {
      "slot": {
        "type": "string",
        "enum": [
          "flash",
          "news",
          "projects",
          "activities",
          "gallery",
          "resources"
        ],
        "example": "news"
      },
      "position": {
        "type": "number",
        "minimum": 1
      },
      "entityType": {
        "type": "string",
        "enum": [
          "flash",
          "article",
          "notice",
          "project",
          "activity",
          "gallery",
          "resource"
        ],
        "example": "project"
      },
      "sourceId": {
        "type": "string",
        "example": "public-project-source-id"
      },
      "contentSlug": {
        "type": "string",
        "example": "community-update",
        "deprecated": true
      }
    },
    "required": [
      "slot",
      "position"
    ]
  },
  "PortalVisualDto": {
    "type": "object",
    "properties": {
      "attachmentId": {
        "type": "string",
        "format": "uuid"
      },
      "alt": {
        "type": "string",
        "maxLength": 300
      }
    }
  },
  "PortalVisualsDto": {
    "type": "object",
    "properties": {
      "home": {
        "$ref": "#/components/schemas/PortalVisualDto"
      },
      "join": {
        "$ref": "#/components/schemas/PortalVisualDto"
      }
    }
  },
  "SavePortalConfigurationDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 0
      },
      "entries": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PortalConfigurationEntryDto"
        }
      },
      "visuals": {
        "$ref": "#/components/schemas/PortalVisualsDto"
      }
    },
    "required": [
      "expectedVersion",
      "entries"
    ]
  },
  "PublishPortalConfigurationDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "confirmed": {
        "type": "boolean",
        "description": "Must be true to publish the global portal draft"
      }
    },
    "required": [
      "expectedVersion",
      "confirmed"
    ]
  },
  "PublishedPortalConfigurationResponseDto": {
    "type": "object",
    "properties": {
      "version": {
        "type": "number",
        "minimum": 0
      },
      "entries": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PortalResolvedEntryResponseDto"
        }
      },
      "visuals": {
        "type": "object",
        "description": "Global home/join visual attachment references"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "version",
      "entries",
      "visuals",
      "publishedAt"
    ]
  },
  "PublicPortalResponseDto": {
    "type": "object",
    "properties": {
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "entries": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PortalResolvedEntryResponseDto"
        }
      },
      "visuals": {
        "type": "object"
      }
    },
    "required": [
      "publishedAt",
      "entries"
    ]
  },
  "DashboardOperatorDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "level": {
        "type": "string",
        "enum": [
          "member",
          "admin",
          "owner"
        ]
      },
      "centerRole": {
        "type": "string",
        "nullable": true
      },
      "capabilities": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "recruitment.batch.manage",
            "recruitment.assessment.edit",
            "recruitment.result.publish",
            "content.create",
            "content.review",
            "content.publish",
            "portal.configure",
            "portal.publish",
            "member.create"
          ]
        }
      }
    },
    "required": [
      "id",
      "name",
      "level",
      "centerRole",
      "capabilities"
    ]
  },
  "DashboardTargetDto": {
    "type": "object",
    "properties": {
      "module": {
        "type": "string",
        "enum": [
          "recruitment",
          "content",
          "portal",
          "media",
          "member"
        ]
      },
      "action": {
        "type": "string",
        "enum": [
          "overview",
          "manage",
          "applications",
          "assess",
          "publish-results",
          "review",
          "publish",
          "view",
          "create",
          "list",
          "automation",
          "configure",
          "health"
        ]
      },
      "resourceType": {
        "type": "object",
        "nullable": true
      },
      "resourceId": {
        "type": "object",
        "nullable": true
      }
    },
    "required": [
      "module",
      "action"
    ]
  },
  "DashboardMetricDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "value": {
        "type": "number",
        "minimum": 0
      },
      "detail": {
        "type": "object",
        "nullable": true
      },
      "target": {
        "$ref": "#/components/schemas/DashboardTargetDto"
      }
    },
    "required": [
      "id",
      "label",
      "value",
      "target"
    ]
  },
  "DashboardTaskDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "meta": {
        "type": "string"
      },
      "priority": {
        "type": "string",
        "enum": [
          "urgent",
          "warning",
          "normal"
        ]
      },
      "target": {
        "$ref": "#/components/schemas/DashboardTargetDto"
      },
      "capability": {
        "type": "string",
        "enum": [
          "recruitment.batch.manage",
          "recruitment.assessment.edit",
          "recruitment.result.publish",
          "content.create",
          "content.review",
          "content.publish",
          "portal.configure",
          "portal.publish",
          "member.create"
        ]
      }
    },
    "required": [
      "id",
      "title",
      "priority",
      "target"
    ]
  },
  "DashboardRecruitmentBatchDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "upcoming",
          "open",
          "paused",
          "closed",
          "archived"
        ]
      },
      "startAt": {
        "type": "string",
        "format": "date-time"
      },
      "endAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "id",
      "name",
      "status",
      "startAt",
      "endAt"
    ]
  },
  "DashboardAssessmentSummaryDto": {
    "type": "object",
    "properties": {
      "total": {
        "type": "number",
        "minimum": 0
      },
      "pending": {
        "type": "number",
        "minimum": 0
      },
      "adjustmentPending": {
        "type": "number",
        "minimum": 0
      },
      "canPublish": {
        "type": "boolean"
      }
    },
    "required": [
      "total",
      "pending",
      "adjustmentPending",
      "canPublish"
    ]
  },
  "DashboardRecruitmentActionDto": {
    "type": "object",
    "properties": {
      "capability": {
        "type": "string",
        "enum": [
          "recruitment.batch.manage",
          "recruitment.assessment.edit",
          "recruitment.result.publish",
          "content.create",
          "content.review",
          "content.publish",
          "portal.configure",
          "portal.publish",
          "member.create"
        ]
      },
      "target": {
        "$ref": "#/components/schemas/DashboardTargetDto"
      }
    },
    "required": [
      "capability",
      "target"
    ]
  },
  "DashboardRecruitmentContextDto": {
    "type": "object",
    "properties": {
      "batch": {
        "$ref": "#/components/schemas/DashboardRecruitmentBatchDto"
      },
      "selection": {
        "type": "string",
        "enum": [
          "open",
          "paused",
          "unfinished-work",
          "upcoming"
        ]
      },
      "applicationCount": {
        "type": "number",
        "minimum": 0
      },
      "assessment": {
        "$ref": "#/components/schemas/DashboardAssessmentSummaryDto"
      },
      "actions": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DashboardRecruitmentActionDto"
        }
      }
    },
    "required": [
      "batch",
      "selection",
      "applicationCount",
      "assessment",
      "actions"
    ]
  },
  "DashboardRecentContentDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "enum": [
          "flash",
          "article",
          "notice"
        ]
      },
      "title": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "in-review",
          "pending-publication",
          "published",
          "unpublished"
        ]
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "target": {
        "$ref": "#/components/schemas/DashboardTargetDto"
      }
    },
    "required": [
      "id",
      "kind",
      "title",
      "status",
      "updatedAt",
      "target"
    ]
  },
  "DashboardContentSummaryDto": {
    "type": "object",
    "properties": {
      "inReview": {
        "type": "number",
        "minimum": 0
      },
      "pendingPublication": {
        "type": "number",
        "minimum": 0
      },
      "recent": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DashboardRecentContentDto"
        }
      }
    },
    "required": [
      "inReview",
      "pendingPublication",
      "recent"
    ]
  },
  "PortalDashboardSummaryDto": {
    "type": "object",
    "properties": {
      "draftRevision": {
        "type": "number",
        "minimum": 0
      },
      "publishedRevision": {
        "type": "number",
        "minimum": 0
      },
      "isDirty": {
        "type": "boolean"
      }
    },
    "required": [
      "draftRevision",
      "publishedRevision",
      "isDirty"
    ]
  },
  "MediaDashboardSummaryDto": {
    "type": "object",
    "properties": {
      "total": {
        "type": "number",
        "minimum": 0
      },
      "processing": {
        "type": "number",
        "minimum": 0
      },
      "failed": {
        "type": "number",
        "minimum": 0
      },
      "reviewPending": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "total",
      "processing",
      "failed",
      "reviewPending"
    ]
  },
  "DashboardWarningDto": {
    "type": "object",
    "properties": {
      "code": {
        "type": "string"
      },
      "level": {
        "type": "string",
        "enum": [
          "error",
          "warning"
        ]
      },
      "title": {
        "type": "string"
      },
      "detail": {
        "type": "object",
        "nullable": true
      },
      "count": {
        "type": "number",
        "minimum": 0
      },
      "target": {
        "$ref": "#/components/schemas/DashboardTargetDto"
      }
    },
    "required": [
      "code",
      "level",
      "title",
      "count",
      "target"
    ]
  },
  "DashboardResponseDto": {
    "type": "object",
    "properties": {
      "schemaVersion": {
        "type": "number",
        "enum": [
          1
        ]
      },
      "generatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "timezone": {
        "type": "string",
        "enum": [
          "Asia/Shanghai"
        ]
      },
      "operator": {
        "$ref": "#/components/schemas/DashboardOperatorDto"
      },
      "metrics": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DashboardMetricDto"
        }
      },
      "tasks": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DashboardTaskDto"
        }
      },
      "recruitment": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/DashboardRecruitmentContextDto"
          }
        ]
      },
      "content": {
        "$ref": "#/components/schemas/DashboardContentSummaryDto"
      },
      "portal": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/PortalDashboardSummaryDto"
          }
        ]
      },
      "media": {
        "$ref": "#/components/schemas/MediaDashboardSummaryDto"
      },
      "warnings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DashboardWarningDto"
        }
      }
    },
    "required": [
      "schemaVersion",
      "generatedAt",
      "timezone",
      "operator",
      "metrics",
      "tasks",
      "recruitment",
      "content",
      "portal",
      "media",
      "warnings"
    ]
  },
  "AdminProjectLeadSummaryDto": {
    "type": "object",
    "properties": {
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      },
      "positionVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "personId",
      "name",
      "positionVersion"
    ]
  },
  "AdminProjectResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "displayOrder": {
        "type": "number",
        "nullable": true
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "published",
          "offline"
        ]
      },
      "version": {
        "type": "number"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "year": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "achievement": {
        "type": "string"
      },
      "projectStage": {
        "type": "string"
      },
      "challenge": {
        "type": "string"
      },
      "solution": {
        "type": "string"
      },
      "memberPersonIds": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        }
      },
      "coverAttachmentId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "detailAttachmentIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "revisionNumber": {
        "type": "number"
      },
      "lead": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/AdminProjectLeadSummaryDto"
          }
        ]
      }
    },
    "required": [
      "id",
      "centerId",
      "slug",
      "displayOrder",
      "status",
      "version",
      "publishedAt",
      "title",
      "category",
      "year",
      "description",
      "achievement",
      "projectStage",
      "challenge",
      "solution",
      "memberPersonIds",
      "coverAttachmentId",
      "detailAttachmentIds",
      "revisionNumber",
      "lead"
    ]
  },
  "AdminProjectListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminProjectResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "CreateProjectDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 0,
        "maximum": 0
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "year": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "achievement": {
        "type": "string"
      },
      "projectStage": {
        "type": "string"
      },
      "challenge": {
        "type": "string"
      },
      "solution": {
        "type": "string"
      },
      "category": {
        "type": "string",
        "enum": [
          "CAMPUS_SERVICE",
          "AI_APPLICATION",
          "SMART_HARDWARE",
          "INDUSTRY_DIGITALIZATION"
        ]
      },
      "displayOrder": {
        "type": "number",
        "minimum": 1,
        "nullable": true
      },
      "memberPersonIds": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        }
      },
      "coverAttachmentId": {
        "type": "string",
        "format": "uuid"
      },
      "detailAttachmentIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "required": [
      "expectedVersion",
      "centerId",
      "slug",
      "title",
      "year",
      "description",
      "achievement",
      "projectStage",
      "challenge",
      "solution",
      "category",
      "memberPersonIds"
    ]
  },
  "UpdateProjectDto": {
    "type": "object",
    "properties": {
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "year": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "achievement": {
        "type": "string"
      },
      "projectStage": {
        "type": "string"
      },
      "challenge": {
        "type": "string"
      },
      "solution": {
        "type": "string"
      },
      "category": {
        "type": "string",
        "enum": [
          "CAMPUS_SERVICE",
          "AI_APPLICATION",
          "SMART_HARDWARE",
          "INDUSTRY_DIGITALIZATION"
        ]
      },
      "displayOrder": {
        "type": "number",
        "minimum": 1,
        "nullable": true
      },
      "memberPersonIds": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        }
      },
      "coverAttachmentId": {
        "type": "string",
        "format": "uuid"
      },
      "detailAttachmentIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "ProjectCommandDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "ProjectOfflineDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "reason": {
        "type": "string"
      }
    },
    "required": [
      "expectedVersion",
      "reason"
    ]
  },
  "PublicProjectResponseDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "displayOrder": {
        "type": "number",
        "nullable": true
      },
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "year": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "achievement": {
        "type": "string"
      },
      "projectStage": {
        "type": "string"
      },
      "challenge": {
        "type": "string"
      },
      "solution": {
        "type": "string"
      },
      "members": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "memberCount": {
        "type": "number"
      },
      "cover": {
        "type": "object",
        "nullable": true
      },
      "details": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "available": {
        "type": "boolean"
      }
    },
    "required": [
      "slug",
      "displayOrder",
      "title",
      "category",
      "year",
      "description",
      "achievement",
      "projectStage",
      "challenge",
      "solution",
      "members",
      "memberCount",
      "cover",
      "details",
      "available"
    ]
  },
  "PublicProjectListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicProjectResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "AdminActivityResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "published",
          "offline"
        ]
      },
      "version": {
        "type": "number"
      },
      "registrationOpen": {
        "type": "boolean"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "title": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "date": {
        "type": "string"
      },
      "time": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "content": {
        "type": "string"
      },
      "agenda": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "registrationEndAt": {
        "type": "string",
        "format": "date-time"
      },
      "coverAttachmentId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "detailAttachmentIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "revisionNumber": {
        "type": "number"
      }
    },
    "required": [
      "id",
      "centerId",
      "slug",
      "status",
      "version",
      "registrationOpen",
      "publishedAt",
      "title",
      "type",
      "date",
      "time",
      "location",
      "summary",
      "content",
      "agenda",
      "registrationEndAt",
      "coverAttachmentId",
      "detailAttachmentIds",
      "revisionNumber"
    ]
  },
  "AdminActivityListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminActivityResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "CreateActivityDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 0,
        "maximum": 0
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "date": {
        "type": "string"
      },
      "time": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "content": {
        "type": "string"
      },
      "agenda": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "registrationEndAt": {
        "type": "string",
        "format": "date-time"
      },
      "coverAttachmentId": {
        "type": "string",
        "format": "uuid"
      },
      "detailAttachmentIds": {
        "maxItems": 6,
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "required": [
      "expectedVersion",
      "centerId",
      "slug",
      "title",
      "type",
      "date",
      "time",
      "location",
      "summary",
      "content",
      "agenda",
      "registrationEndAt"
    ]
  },
  "UpdateActivityDto": {
    "type": "object",
    "properties": {
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "date": {
        "type": "string"
      },
      "time": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "content": {
        "type": "string"
      },
      "agenda": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "registrationEndAt": {
        "type": "string",
        "format": "date-time"
      },
      "coverAttachmentId": {
        "type": "string",
        "format": "uuid"
      },
      "detailAttachmentIds": {
        "maxItems": 6,
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "ActivityCommandDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "ActivityOfflineDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "reason": {
        "type": "string"
      }
    },
    "required": [
      "expectedVersion",
      "reason"
    ]
  },
  "PublicActivityResponseDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "date": {
        "type": "string"
      },
      "time": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "content": {
        "type": "string"
      },
      "agenda": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "registrationEndAt": {
        "type": "string",
        "format": "date-time"
      },
      "cover": {
        "type": "object"
      },
      "details": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "available": {
        "type": "boolean"
      },
      "registrationOpen": {
        "type": "boolean"
      }
    },
    "required": [
      "slug",
      "title",
      "type",
      "date",
      "time",
      "location",
      "summary",
      "content",
      "agenda",
      "registrationEndAt",
      "cover",
      "details",
      "available",
      "registrationOpen"
    ]
  },
  "PublicActivityListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicActivityResponseDto"
        }
      },
      "page": {
        "type": "number"
      },
      "pageSize": {
        "type": "number"
      },
      "total": {
        "type": "number"
      }
    },
    "required": [
      "items"
    ]
  },
  "MemberActivitySummaryResponseDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "date": {
        "type": "string"
      },
      "time": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "registrationEndAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "cover": {
        "type": "object",
        "nullable": true
      },
      "available": {
        "type": "boolean"
      }
    },
    "required": [
      "slug",
      "title",
      "type",
      "date",
      "time",
      "location",
      "summary",
      "registrationEndAt",
      "publishedAt",
      "cover",
      "available"
    ]
  },
  "MemberActivityRegistrationResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "activityId": {
        "type": "string",
        "format": "uuid"
      },
      "status": {
        "type": "string",
        "enum": [
          "registered",
          "accepted",
          "rejected",
          "cancelled"
        ]
      },
      "version": {
        "type": "number"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "decidedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "cancelledAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "activity": {
        "$ref": "#/components/schemas/MemberActivitySummaryResponseDto"
      }
    },
    "required": [
      "id",
      "activityId",
      "status",
      "version",
      "createdAt",
      "updatedAt",
      "decidedAt",
      "cancelledAt",
      "activity"
    ]
  },
  "MemberActivityRegistrationListResponseDto": {
    "type": "object",
    "properties": {
      "page": {
        "type": "integer",
        "minimum": 1
      },
      "pageSize": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "total": {
        "type": "integer",
        "minimum": 0
      },
      "totalPages": {
        "type": "integer",
        "minimum": 0
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/MemberActivityRegistrationResponseDto"
        }
      }
    },
    "required": [
      "page",
      "pageSize",
      "total",
      "totalPages",
      "items"
    ]
  },
  "CreateRegistrationDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 0,
        "maximum": 0
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "RegistrationResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "activityId": {
        "type": "string",
        "format": "uuid"
      },
      "status": {
        "type": "string",
        "enum": [
          "registered",
          "accepted",
          "rejected",
          "cancelled"
        ]
      },
      "version": {
        "type": "number"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "decidedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "cancelledAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "decisionReason": {
        "type": "string",
        "nullable": true
      },
      "memberName": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "activityId",
      "status",
      "version",
      "createdAt",
      "updatedAt",
      "decidedAt",
      "cancelledAt",
      "decisionReason"
    ]
  },
  "RegistrationCommandDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "RegistrationListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/RegistrationResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "DecideRegistrationDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "status": {
        "type": "string",
        "enum": [
          "accepted",
          "rejected"
        ]
      },
      "reason": {
        "type": "string"
      }
    },
    "required": [
      "expectedVersion",
      "status",
      "reason"
    ]
  },
  "AdminGalleryResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "published",
          "offline"
        ]
      },
      "version": {
        "type": "number"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "year": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "team": {
        "type": "string",
        "nullable": true
      },
      "coverAttachmentId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "detailAttachmentIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "cover": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/MediaAttachmentResponseDto"
          }
        ]
      },
      "details": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/MediaAttachmentResponseDto"
        }
      },
      "revisionNumber": {
        "type": "number"
      }
    },
    "required": [
      "id",
      "centerId",
      "slug",
      "status",
      "version",
      "publishedAt",
      "title",
      "category",
      "year",
      "description",
      "team",
      "coverAttachmentId",
      "detailAttachmentIds",
      "cover",
      "details",
      "revisionNumber"
    ]
  },
  "AdminGalleryListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminGalleryResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "CreateGalleryDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number"
      },
      "centerId": {
        "type": "string"
      },
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string",
        "enum": [
          "event_documentary",
          "visual_creation",
          "video_work",
          "people_stories"
        ],
        "default": "event_documentary"
      },
      "year": {
        "type": "string",
        "default": "2025"
      },
      "description": {
        "type": "string"
      },
      "team": {
        "type": "string"
      },
      "coverAttachmentId": {
        "type": "string",
        "format": "uuid"
      },
      "detailAttachmentIds": {
        "maxItems": 20,
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "required": [
      "expectedVersion",
      "centerId",
      "slug",
      "title",
      "description"
    ]
  },
  "UpdateGalleryDto": {
    "type": "object",
    "properties": {
      "centerId": {
        "type": "string"
      },
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string",
        "enum": [
          "event_documentary",
          "visual_creation",
          "video_work",
          "people_stories"
        ],
        "default": "event_documentary"
      },
      "year": {
        "type": "string",
        "default": "2025"
      },
      "description": {
        "type": "string"
      },
      "team": {
        "type": "string"
      },
      "coverAttachmentId": {
        "type": "string",
        "format": "uuid"
      },
      "detailAttachmentIds": {
        "maxItems": 20,
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "expectedVersion": {
        "type": "number"
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "GalleryCommandDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number"
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "GalleryOfflineDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number"
      },
      "reason": {
        "type": "string"
      }
    },
    "required": [
      "expectedVersion",
      "reason"
    ]
  },
  "PublicGalleryMediaResponseDto": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "image",
          "video"
        ]
      },
      "role": {
        "type": "string",
        "enum": [
          "cover",
          "detail"
        ]
      },
      "title": {
        "type": "string"
      },
      "caption": {
        "type": "string"
      },
      "alt": {
        "type": "string"
      },
      "aspect": {
        "type": "string",
        "enum": [
          "wide",
          "landscape",
          "portrait"
        ]
      },
      "sortOrder": {
        "type": "number",
        "minimum": 0
      },
      "url": {
        "type": "string"
      },
      "thumbnailUrl": {
        "type": "string"
      }
    },
    "required": [
      "kind",
      "role",
      "title",
      "caption",
      "alt",
      "aspect",
      "sortOrder",
      "url"
    ]
  },
  "PublicGalleryResponseDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "year": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "cover": {
        "$ref": "#/components/schemas/PublicGalleryMediaResponseDto"
      },
      "details": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicGalleryMediaResponseDto"
        }
      },
      "available": {
        "type": "boolean"
      }
    },
    "required": [
      "slug",
      "title",
      "category",
      "year",
      "description",
      "cover",
      "details",
      "available"
    ]
  },
  "PublicGalleryListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicGalleryResponseDto"
        }
      },
      "page": {
        "type": "number"
      },
      "pageSize": {
        "type": "number"
      },
      "total": {
        "type": "number"
      }
    },
    "required": [
      "items"
    ]
  },
  "AdminResourceActorResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "username": {
        "type": "string"
      },
      "displayName": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "username",
      "displayName"
    ]
  },
  "AdminResourceSummaryResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "enum": [
          "article",
          "pdf",
          "docx",
          "archive",
          "external"
        ]
      },
      "format": {
        "type": "string",
        "enum": [
          "web",
          "pdf",
          "docx",
          "zip",
          "external"
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "published",
          "offline"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "versionLabel": {
        "type": "string"
      },
      "access": {
        "type": "string",
        "enum": [
          "public",
          "member"
        ]
      },
      "availability": {
        "type": "string",
        "enum": [
          "available",
          "unavailable"
        ]
      },
      "attachmentId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "revisionNumber": {
        "type": "number",
        "minimum": 1
      },
      "createdBy": {
        "$ref": "#/components/schemas/AdminResourceActorResponseDto"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "offlineAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      }
    },
    "required": [
      "id",
      "centerId",
      "slug",
      "title",
      "summary",
      "kind",
      "format",
      "status",
      "version",
      "versionLabel",
      "access",
      "availability",
      "attachmentId",
      "revisionNumber",
      "createdBy",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "offlineAt"
    ]
  },
  "AdminResourceListResponseDto": {
    "type": "object",
    "properties": {
      "page": {
        "type": "integer",
        "minimum": 1
      },
      "pageSize": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "total": {
        "type": "integer",
        "minimum": 0
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminResourceSummaryResponseDto"
        }
      }
    },
    "required": [
      "page",
      "pageSize",
      "total",
      "items"
    ]
  },
  "AdminResourceResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "published",
          "offline"
        ]
      },
      "version": {
        "type": "number"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "enum": [
          "article",
          "pdf",
          "docx",
          "archive",
          "external"
        ]
      },
      "format": {
        "type": "string",
        "enum": [
          "web",
          "pdf",
          "docx",
          "zip",
          "external"
        ]
      },
      "versionLabel": {
        "type": "string"
      },
      "access": {
        "type": "string",
        "enum": [
          "public",
          "member"
        ]
      },
      "availability": {
        "type": "string",
        "enum": [
          "available",
          "unavailable"
        ]
      },
      "content": {
        "type": "string"
      },
      "attachmentId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "revisionNumber": {
        "type": "number"
      },
      "createdBy": {
        "$ref": "#/components/schemas/AdminResourceActorResponseDto"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "offlineAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "offlineReason": {
        "type": "string",
        "nullable": true
      }
    },
    "required": [
      "id",
      "centerId",
      "slug",
      "status",
      "version",
      "publishedAt",
      "title",
      "summary",
      "kind",
      "format",
      "versionLabel",
      "access",
      "availability",
      "content",
      "attachmentId",
      "revisionNumber",
      "createdBy",
      "createdAt",
      "updatedAt",
      "offlineAt",
      "offlineReason"
    ]
  },
  "CreateResourceDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 0,
        "maximum": 0
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "enum": [
          "ARTICLE",
          "PDF",
          "DOCX",
          "ARCHIVE",
          "EXTERNAL"
        ]
      },
      "format": {
        "type": "string",
        "enum": [
          "WEB",
          "PDF",
          "DOCX",
          "ZIP",
          "EXTERNAL"
        ]
      },
      "access": {
        "type": "string",
        "enum": [
          "PUBLIC",
          "MEMBER"
        ]
      },
      "availability": {
        "type": "string",
        "enum": [
          "AVAILABLE",
          "UNAVAILABLE"
        ]
      },
      "versionLabel": {
        "type": "string"
      },
      "content": {
        "type": "string"
      }
    },
    "required": [
      "expectedVersion",
      "centerId",
      "slug",
      "title",
      "summary",
      "kind",
      "format",
      "access",
      "availability",
      "versionLabel",
      "content"
    ]
  },
  "CreateResourceVersionDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "versionLabel": {
        "type": "string"
      },
      "content": {
        "type": "string"
      },
      "access": {
        "type": "string",
        "enum": [
          "PUBLIC",
          "MEMBER"
        ]
      },
      "availability": {
        "type": "string",
        "enum": [
          "AVAILABLE",
          "UNAVAILABLE"
        ]
      },
      "attachmentId": {
        "type": "string",
        "format": "uuid",
        "description": "Required before publishing a non-article resource; must be an owned ready media attachment."
      }
    },
    "required": [
      "expectedVersion",
      "versionLabel",
      "content",
      "access",
      "availability"
    ]
  },
  "AdminResourceVersionResponseDto": {
    "type": "object",
    "properties": {
      "versionLabel": {
        "type": "string"
      },
      "access": {
        "type": "string",
        "enum": [
          "public",
          "member"
        ]
      },
      "availability": {
        "type": "string",
        "enum": [
          "available",
          "unavailable"
        ]
      },
      "content": {
        "type": "string"
      },
      "attachmentId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "revisionNumber": {
        "type": "number"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "versionLabel",
      "access",
      "availability",
      "content",
      "attachmentId",
      "revisionNumber",
      "createdAt"
    ]
  },
  "AdminResourceVersionListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminResourceVersionResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "ResourceCommandDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "ResourceOfflineDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "reason": {
        "type": "string"
      }
    },
    "required": [
      "expectedVersion",
      "reason"
    ]
  },
  "PublicResourceSummaryDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "enum": [
          "article",
          "pdf",
          "docx",
          "archive",
          "external"
        ]
      },
      "format": {
        "type": "string",
        "enum": [
          "web",
          "pdf",
          "docx",
          "zip",
          "external"
        ]
      },
      "versionLabel": {
        "type": "string"
      },
      "access": {
        "type": "string",
        "enum": [
          "public",
          "member"
        ]
      }
    },
    "required": [
      "slug",
      "title",
      "summary",
      "kind",
      "format",
      "versionLabel",
      "access"
    ]
  },
  "PublicResourceListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicResourceSummaryDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "PublicResourceResponseDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "enum": [
          "article",
          "pdf",
          "docx",
          "archive",
          "external"
        ]
      },
      "format": {
        "type": "string",
        "enum": [
          "web",
          "pdf",
          "docx",
          "zip",
          "external"
        ]
      },
      "versionLabel": {
        "type": "string"
      },
      "access": {
        "type": "string",
        "enum": [
          "public",
          "member"
        ]
      },
      "content": {
        "type": "string"
      },
      "variant": {
        "type": "object"
      }
    },
    "required": [
      "slug",
      "title",
      "summary",
      "kind",
      "format",
      "versionLabel",
      "access",
      "content"
    ]
  },
  "AdminHonorResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "publicId": {
        "type": "string",
        "description": "Stable external honor identifier."
      },
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "memberName": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "awardedAt": {
        "type": "string",
        "format": "date"
      },
      "awardedDatePrecision": {
        "type": "string",
        "enum": [
          "day",
          "month",
          "year",
          "unknown"
        ]
      },
      "awardedDateLabel": {
        "type": "string",
        "description": "Human-readable date label that respects source precision."
      },
      "proofReference": {
        "type": "string"
      },
      "publicConsent": {
        "type": "boolean"
      },
      "status": {
        "type": "string",
        "enum": [
          "pending",
          "approved",
          "rejected"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "submittedAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "id",
      "publicId",
      "personId",
      "centerId",
      "memberName",
      "title",
      "type",
      "description",
      "awardedAt",
      "awardedDatePrecision",
      "awardedDateLabel",
      "proofReference",
      "publicConsent",
      "status",
      "version",
      "submittedAt"
    ]
  },
  "AdminHonorListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminHonorResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "CreateHonorDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 0,
        "maximum": 0
      },
      "title": {
        "type": "string",
        "maxLength": 80
      },
      "type": {
        "type": "string",
        "maxLength": 40
      },
      "description": {
        "type": "string",
        "maxLength": 1000
      },
      "awardedAt": {
        "type": "string",
        "format": "date",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      },
      "proofReference": {
        "type": "string",
        "description": "Private evidence reference; never published.",
        "maxLength": 1000
      },
      "publicConsent": {
        "type": "boolean"
      }
    },
    "required": [
      "expectedVersion",
      "title",
      "type",
      "description",
      "awardedAt",
      "proofReference",
      "publicConsent"
    ]
  },
  "UpdateHonorConsentDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "publicConsent": {
        "type": "boolean"
      }
    },
    "required": [
      "expectedVersion",
      "publicConsent"
    ]
  },
  "HonorCommandDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "GrowthRecordResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "reflection": {
        "type": "string"
      },
      "occurredOn": {
        "type": "string",
        "format": "date"
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "id",
      "title",
      "category",
      "reflection",
      "occurredOn",
      "version",
      "createdAt",
      "updatedAt"
    ]
  },
  "GrowthRecordListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/GrowthRecordResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "CreateGrowthRecordDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 0,
        "maximum": 0
      },
      "title": {
        "type": "string",
        "maxLength": 60
      },
      "category": {
        "type": "string",
        "maxLength": 30
      },
      "reflection": {
        "type": "string",
        "description": "Private member reflection; never publicly projected.",
        "maxLength": 1000
      },
      "occurredOn": {
        "type": "string",
        "format": "date",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      }
    },
    "required": [
      "expectedVersion",
      "title",
      "category",
      "reflection",
      "occurredOn"
    ]
  },
  "UpdateGrowthRecordDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "title": {
        "type": "string",
        "maxLength": 60
      },
      "category": {
        "type": "string",
        "maxLength": 30
      },
      "reflection": {
        "type": "string",
        "description": "Private member reflection; never publicly projected.",
        "maxLength": 1000
      },
      "occurredOn": {
        "type": "string",
        "format": "date",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      }
    },
    "required": [
      "expectedVersion",
      "title",
      "category",
      "reflection",
      "occurredOn"
    ]
  },
  "DeleteGrowthRecordDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "DeletedGrowthRecordResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "deleted": {
        "type": "boolean"
      },
      "version": {
        "type": "number",
        "minimum": 2
      }
    },
    "required": [
      "id",
      "deleted",
      "version"
    ]
  },
  "HelpRevisionResponseDto": {
    "type": "object",
    "properties": {
      "revisionNumber": {
        "type": "number"
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "body": {
        "type": "string"
      }
    },
    "required": [
      "revisionNumber",
      "title",
      "summary",
      "body"
    ]
  },
  "AdminHelpResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "draft",
          "published"
        ]
      },
      "version": {
        "type": "number"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "workingRevision": {
        "$ref": "#/components/schemas/HelpRevisionResponseDto"
      }
    },
    "required": [
      "id",
      "slug",
      "status",
      "version",
      "publishedAt",
      "workingRevision"
    ]
  },
  "AdminHelpListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminHelpResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "CreateHelpDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string",
        "example": "account-login"
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "body": {
        "type": "string"
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "slug",
      "title",
      "summary",
      "body",
      "expectedVersion"
    ]
  },
  "UpdateHelpDraftDto": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "body": {
        "type": "string"
      },
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "expectedVersion"
    ]
  },
  "PublishHelpDto": {
    "type": "object",
    "properties": {
      "expectedVersion": {
        "type": "number",
        "minimum": 1
      },
      "confirmed": {
        "type": "boolean"
      }
    },
    "required": [
      "expectedVersion",
      "confirmed"
    ]
  },
  "PublicHelpResponseDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string"
      },
      "body": {
        "type": "string"
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "slug",
      "title",
      "summary",
      "body",
      "publishedAt"
    ]
  },
  "PublicHelpListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicHelpResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "PublicTimelineItemDto": {
    "type": "object",
    "properties": {
      "entityType": {
        "type": "string",
        "enum": [
          "activity",
          "article",
          "notice"
        ]
      },
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string",
        "nullable": true
      },
      "publishedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "eventAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "available": {
        "type": "boolean"
      },
      "media": {
        "type": "object",
        "nullable": true
      },
      "to": {
        "type": "string"
      }
    },
    "required": [
      "entityType",
      "slug",
      "title",
      "summary",
      "publishedAt",
      "eventAt",
      "available",
      "to"
    ]
  },
  "PublicTimelineListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicTimelineItemDto"
        }
      },
      "page": {
        "type": "number"
      },
      "pageSize": {
        "type": "number"
      },
      "total": {
        "type": "number"
      }
    },
    "required": [
      "items",
      "page",
      "pageSize",
      "total"
    ]
  },
  "HealthLiveResponseDto": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": [
          "ok"
        ]
      },
      "service": {
        "type": "string",
        "enum": [
          "hsd-api"
        ]
      }
    },
    "required": [
      "status",
      "service"
    ]
  },
  "HealthReadyResponseDto": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": [
          "ready"
        ]
      },
      "database": {
        "type": "string",
        "enum": [
          "up"
        ]
      }
    },
    "required": [
      "status",
      "database"
    ]
  },
  "AuthSessionResponseDto": {
    "type": "object",
    "properties": {
      "mustChangePassword": {
        "type": "boolean"
      },
      "csrfToken": {
        "type": "string",
        "description": "Send as X-CSRF-Token on authenticated state-changing requests"
      },
      "expiresAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "mustChangePassword",
      "csrfToken",
      "expiresAt"
    ]
  },
  "SessionAccountResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "adminLevel": {
        "type": "string",
        "enum": [
          "MEMBER",
          "ADMIN",
          "OWNER"
        ]
      },
      "adminCenterId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "capabilities": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "required": [
      "id",
      "adminLevel",
      "adminCenterId",
      "capabilities"
    ]
  },
  "SessionPersonResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "PREPARATORY",
          "FORMAL_MEMBER",
          "NOT_ADMITTED"
        ]
      }
    },
    "required": [
      "id",
      "name",
      "status"
    ]
  },
  "CurrentSessionResponseDto": {
    "type": "object",
    "properties": {
      "account": {
        "$ref": "#/components/schemas/SessionAccountResponseDto"
      },
      "person": {
        "$ref": "#/components/schemas/SessionPersonResponseDto"
      },
      "mustChangePassword": {
        "type": "boolean"
      }
    },
    "required": [
      "account",
      "person",
      "mustChangePassword"
    ]
  },
  "AvatarResponseDto": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "default",
          "asset"
        ]
      },
      "publicToken": {
        "type": "string",
        "description": "Opaque public media capability token; never a database asset ID"
      },
      "variant": {
        "type": "string",
        "enum": [
          "white-hsd"
        ]
      }
    },
    "required": [
      "kind"
    ]
  },
  "MemberProfileResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      },
      "studentId": {
        "type": "string"
      },
      "grade": {
        "type": "string"
      },
      "className": {
        "type": "string"
      },
      "contact": {
        "type": "string",
        "nullable": true
      },
      "bio": {
        "type": "string",
        "nullable": true
      },
      "biography": {
        "type": "string",
        "nullable": true
      },
      "status": {
        "type": "string",
        "enum": [
          "PREPARATORY",
          "FORMAL_MEMBER",
          "NOT_ADMITTED"
        ]
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ],
        "nullable": true
      },
      "avatar": {
        "$ref": "#/components/schemas/AvatarResponseDto"
      },
      "publicProfileEnabled": {
        "type": "boolean"
      },
      "version": {
        "type": "number"
      },
      "membership": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/MembershipResponseDto"
          }
        ]
      }
    },
    "required": [
      "id",
      "name",
      "studentId",
      "grade",
      "className",
      "contact",
      "bio",
      "biography",
      "status",
      "baizeDirection",
      "avatar",
      "publicProfileEnabled",
      "version",
      "membership"
    ]
  },
  "PublicCenterIdentityResponseDto": {
    "type": "object",
    "properties": {
      "publicSlug": {
        "type": "string",
        "description": "Stable public center slug"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "publicSlug",
      "name"
    ]
  },
  "PublicHonorResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "description": "Opaque non-UUID public honor identifier"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "awardedAt": {
        "type": "string",
        "format": "date"
      },
      "awardedDatePrecision": {
        "type": "string",
        "enum": [
          "day",
          "month",
          "year",
          "unknown"
        ]
      },
      "awardedDateLabel": {
        "type": "string"
      },
      "featured": {
        "type": "boolean",
        "default": false
      }
    },
    "required": [
      "id",
      "title",
      "type",
      "description",
      "awardedAt",
      "awardedDatePrecision",
      "awardedDateLabel",
      "featured"
    ]
  },
  "PublicOrganizationPositionResponseDto": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "ALLIANCE_OWNER",
          "CENTER_MINISTER",
          "PROJECT_LEAD"
        ]
      },
      "centerPublicSlug": {
        "type": "string"
      }
    },
    "required": [
      "type"
    ]
  },
  "PublicCoreRoleResponseDto": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string"
      },
      "order": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "title",
      "order"
    ]
  },
  "PublicMemberResponseDto": {
    "type": "object",
    "properties": {
      "publicId": {
        "type": "string",
        "description": "Stable high-entropy opaque public token for browser routes",
        "example": "9f4a8c63d1e24b77a05f18c4e9127b3d"
      },
      "name": {
        "type": "string"
      },
      "grade": {
        "type": "string"
      },
      "className": {
        "type": "string"
      },
      "avatar": {
        "$ref": "#/components/schemas/AvatarResponseDto"
      },
      "center": {
        "$ref": "#/components/schemas/PublicCenterIdentityResponseDto"
      },
      "duty": {
        "type": "string",
        "enum": [
          "REGULAR",
          "CORE"
        ]
      },
      "honors": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicHonorResponseDto"
        }
      },
      "positions": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicOrganizationPositionResponseDto"
        }
      },
      "bio": {
        "type": "string"
      },
      "biography": {
        "type": "string"
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ]
      },
      "coreRole": {
        "$ref": "#/components/schemas/PublicCoreRoleResponseDto"
      }
    },
    "required": [
      "publicId",
      "name",
      "grade",
      "className",
      "avatar",
      "center",
      "duty",
      "honors",
      "positions"
    ]
  },
  "PublicMemberListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicMemberResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "PublicCenterSummaryResponseDto": {
    "type": "object",
    "properties": {
      "publicSlug": {
        "type": "string",
        "description": "Stable public center slug"
      },
      "name": {
        "type": "string"
      },
      "publicMemberCount": {
        "type": "number",
        "minimum": 0
      },
      "publicCoreMemberCount": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "publicSlug",
      "name",
      "publicMemberCount",
      "publicCoreMemberCount"
    ]
  },
  "PublicCenterDetailResponseDto": {
    "type": "object",
    "properties": {
      "publicSlug": {
        "type": "string",
        "description": "Stable public center slug"
      },
      "name": {
        "type": "string"
      },
      "publicMemberCount": {
        "type": "number",
        "minimum": 0
      },
      "publicCoreMemberCount": {
        "type": "number",
        "minimum": 0
      },
      "ministers": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicMemberResponseDto"
        }
      },
      "members": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicMemberResponseDto"
        }
      },
      "coreMembers": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicMemberResponseDto"
        }
      }
    },
    "required": [
      "publicSlug",
      "name",
      "publicMemberCount",
      "publicCoreMemberCount",
      "ministers",
      "members",
      "coreMembers"
    ]
  },
  "PublicCenterListResponseDto": {
    "type": "object",
    "properties": {
      "allianceOwners": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicMemberResponseDto"
        }
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PublicCenterSummaryResponseDto"
        }
      }
    },
    "required": [
      "allianceOwners",
      "items"
    ]
  },
  "OrganizationMembershipResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "duty": {
        "type": "string",
        "enum": [
          "REGULAR",
          "CORE"
        ]
      },
      "source": {
        "type": "string",
        "enum": [
          "DIRECT_ENTRY",
          "RECRUITMENT",
          "ADJUSTMENT"
        ]
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "joinedAt": {
        "type": "string",
        "format": "date-time"
      },
      "endedAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "center": {
        "$ref": "#/components/schemas/CenterSummaryResponseDto"
      }
    },
    "required": [
      "id",
      "personId",
      "centerId",
      "duty",
      "source",
      "version",
      "joinedAt",
      "endedAt",
      "center"
    ]
  },
  "RetiredOrganizationMembershipResponseDto": {
    "type": "object",
    "properties": {
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "retired": {
        "type": "boolean",
        "example": true
      },
      "membership": {
        "$ref": "#/components/schemas/OrganizationMembershipResponseDto"
      }
    },
    "required": [
      "personId",
      "retired",
      "membership"
    ]
  },
  "CoreMemberRecordResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "roleTitle": {
        "type": "string"
      },
      "sortOrder": {
        "type": "number",
        "minimum": 0
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "retiredAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": [
      "id",
      "personId",
      "roleTitle",
      "sortOrder",
      "version",
      "retiredAt",
      "createdAt",
      "updatedAt"
    ]
  },
  "CoreMemberListItemResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "roleTitle": {
        "type": "string"
      },
      "sortOrder": {
        "type": "number",
        "minimum": 0
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "retiredAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "name": {
        "type": "string"
      },
      "center": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/CenterSummaryResponseDto"
          }
        ]
      }
    },
    "required": [
      "id",
      "personId",
      "roleTitle",
      "sortOrder",
      "version",
      "retiredAt",
      "createdAt",
      "updatedAt",
      "name",
      "center"
    ]
  },
  "CoreMemberListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CoreMemberListItemResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "RetiredCoreMemberResponseDto": {
    "type": "object",
    "properties": {
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "retired": {
        "type": "boolean",
        "example": true
      },
      "coreMember": {
        "$ref": "#/components/schemas/CoreMemberRecordResponseDto"
      }
    },
    "required": [
      "personId",
      "retired",
      "coreMember"
    ]
  },
  "PreparatoryMemberImportRowResponseDto": {
    "type": "object",
    "properties": {
      "rowNumber": {
        "type": "number",
        "minimum": 2
      },
      "studentId": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "ready",
          "created",
          "duplicate",
          "invalid",
          "failed"
        ]
      },
      "code": {
        "type": "string"
      },
      "message": {
        "type": "string"
      }
    },
    "required": [
      "rowNumber",
      "studentId",
      "status"
    ]
  },
  "PreparatoryMemberImportReportResponseDto": {
    "type": "object",
    "properties": {
      "mode": {
        "type": "string",
        "enum": [
          "dry-run",
          "commit"
        ]
      },
      "totalRows": {
        "type": "number",
        "minimum": 0
      },
      "readyRows": {
        "type": "number",
        "minimum": 0
      },
      "createdRows": {
        "type": "number",
        "minimum": 0
      },
      "duplicateRows": {
        "type": "number",
        "minimum": 0
      },
      "invalidRows": {
        "type": "number",
        "minimum": 0
      },
      "failedRows": {
        "type": "number",
        "minimum": 0
      },
      "rows": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PreparatoryMemberImportRowResponseDto"
        }
      }
    },
    "required": [
      "mode",
      "totalRows",
      "readyRows",
      "createdRows",
      "duplicateRows",
      "invalidRows",
      "failedRows",
      "rows"
    ]
  },
  "ManagedMemberCreatedResponseDto": {
    "type": "object",
    "properties": {
      "personId": {
        "type": "string",
        "format": "uuid"
      },
      "accountId": {
        "type": "string",
        "format": "uuid"
      },
      "username": {
        "type": "string"
      },
      "mustChangePassword": {
        "type": "boolean"
      }
    },
    "required": [
      "personId",
      "accountId",
      "username",
      "mustChangePassword"
    ]
  },
  "ManagedAccountSummaryResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "username": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "ENABLED",
          "DISABLED"
        ]
      },
      "adminLevel": {
        "type": "string",
        "enum": [
          "MEMBER",
          "ADMIN",
          "OWNER"
        ]
      },
      "adminCenterId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "mustChangePassword": {
        "type": "boolean"
      },
      "version": {
        "type": "number",
        "minimum": 1
      }
    },
    "required": [
      "id",
      "username",
      "status",
      "adminLevel",
      "adminCenterId",
      "mustChangePassword",
      "version"
    ]
  },
  "ManagedMemberResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      },
      "studentId": {
        "type": "string"
      },
      "grade": {
        "type": "string"
      },
      "className": {
        "type": "string"
      },
      "contact": {
        "type": "string",
        "nullable": true
      },
      "bio": {
        "type": "string",
        "nullable": true
      },
      "biography": {
        "type": "string",
        "nullable": true
      },
      "status": {
        "type": "string",
        "enum": [
          "PREPARATORY",
          "FORMAL_MEMBER",
          "NOT_ADMITTED"
        ]
      },
      "baizeDirection": {
        "type": "string",
        "enum": [
          "HARMONYOS_DEVELOPMENT",
          "BACKEND_ARCHITECTURE",
          "AIGC_LARGE_MODEL",
          "UI_UX_DESIGN",
          "EMBEDDED_DEVELOPMENT"
        ],
        "nullable": true
      },
      "avatar": {
        "$ref": "#/components/schemas/AvatarResponseDto"
      },
      "publicProfileEnabled": {
        "type": "boolean"
      },
      "version": {
        "type": "number"
      },
      "membership": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/MembershipResponseDto"
          }
        ]
      },
      "account": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/ManagedAccountSummaryResponseDto"
          }
        ]
      },
      "coreMember": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/CoreMemberRecordResponseDto"
          }
        ]
      },
      "positions": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OrganizationPositionResponseDto"
        }
      }
    },
    "required": [
      "id",
      "name",
      "studentId",
      "grade",
      "className",
      "contact",
      "bio",
      "biography",
      "status",
      "baizeDirection",
      "avatar",
      "publicProfileEnabled",
      "version",
      "membership",
      "account",
      "coreMember",
      "positions"
    ]
  },
  "ManagedMemberListResponseDto": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ManagedMemberResponseDto"
        }
      }
    },
    "required": [
      "items"
    ]
  },
  "AdminPersonSummaryResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "name": {
        "type": "string"
      },
      "studentId": {
        "type": "string"
      },
      "grade": {
        "type": "string"
      },
      "className": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "name",
      "studentId",
      "grade",
      "className"
    ]
  },
  "AdminAccountResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "username": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": [
          "ENABLED",
          "DISABLED"
        ]
      },
      "adminLevel": {
        "type": "string",
        "enum": [
          "MEMBER",
          "ADMIN",
          "OWNER"
        ]
      },
      "adminCenterId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "mustChangePassword": {
        "type": "boolean"
      },
      "version": {
        "type": "number",
        "minimum": 1
      },
      "lastLoginAt": {
        "type": "string",
        "format": "date-time",
        "nullable": true
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      },
      "person": {
        "$ref": "#/components/schemas/AdminPersonSummaryResponseDto"
      },
      "adminCenter": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/AdminCenterResponseDto"
          }
        ]
      }
    },
    "required": [
      "id",
      "username",
      "status",
      "adminLevel",
      "adminCenterId",
      "mustChangePassword",
      "version",
      "lastLoginAt",
      "createdAt",
      "updatedAt",
      "person",
      "adminCenter"
    ]
  },
  "AdminAccountListResponseDto": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number"
      },
      "pageSize": {
        "type": "number"
      },
      "total": {
        "type": "number"
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AdminAccountResponseDto"
        }
      }
    },
    "required": [
      "page",
      "pageSize",
      "total",
      "items"
    ]
  },
  "CenterLeadershipResponseDto": {
    "type": "object",
    "properties": {
      "centerId": {
        "type": "string",
        "format": "uuid"
      },
      "personId": {
        "type": "string",
        "format": "uuid"
      }
    },
    "required": [
      "centerId",
      "personId"
    ]
  },
  "AuthorityAccountResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "adminLevel": {
        "type": "string",
        "enum": [
          "MEMBER",
          "ADMIN",
          "OWNER"
        ]
      },
      "adminCenterId": {
        "type": "string",
        "format": "uuid",
        "nullable": true
      },
      "version": {
        "type": "number"
      },
      "capabilities": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "leadership": {
        "nullable": true,
        "allOf": [
          {
            "$ref": "#/components/schemas/CenterLeadershipResponseDto"
          }
        ]
      }
    },
    "required": [
      "id",
      "adminLevel",
      "adminCenterId",
      "version",
      "capabilities",
      "leadership"
    ]
  },
  "RecruitmentCenterResponseDto": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "slug": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "active": {
        "type": "boolean"
      }
    },
    "required": [
      "id",
      "slug",
      "name",
      "active"
    ]
  },
  "RecruitmentBatchStatusDto": {
    "type": "object",
    "properties": {
      "effectiveStatus": {
        "type": "string",
        "enum": [
          "draft",
          "upcoming",
          "open",
          "paused",
          "closed",
          "archived"
        ]
      },
      "effectiveStatusReason": {
        "type": "string",
        "enum": [
          "draft",
          "before-start",
          "within-window",
          "after-end",
          "force-open",
          "paused",
          "force-closed",
          "archived"
        ]
      }
    },
    "required": [
      "effectiveStatus",
      "effectiveStatusReason"
    ]
  },
  "AdminRecruitmentBatchStatusDto": {
    "type": "object",
    "properties": {
      "effectiveStatus": {
        "type": "string",
        "enum": [
          "draft",
          "upcoming",
          "open",
          "paused",
          "closed",
          "archived"
        ]
      },
      "effectiveStatusReason": {
        "type": "string",
        "enum": [
          "draft",
          "before-start",
          "within-window",
          "after-end",
          "force-open",
          "paused",
          "force-closed",
          "archived"
        ]
      }
    },
    "required": [
      "effectiveStatus",
      "effectiveStatusReason"
    ]
  },
  "ContentHeadingBlockResponseDto": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "heading"
        ]
      },
      "level": {
        "type": "number",
        "enum": [
          2,
          3
        ]
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "level",
      "text"
    ]
  },
  "ContentParagraphBlockResponseDto": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "paragraph"
        ]
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "text"
    ]
  },
  "ContentImageBlockResponseDto": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "image"
        ]
      },
      "url": {
        "type": "string"
      },
      "alt": {
        "type": "string"
      },
      "caption": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "url",
      "alt"
    ]
  },
  "ContentAttachmentImageBlockResponseDto": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "image"
        ]
      },
      "attachmentId": {
        "type": "string",
        "format": "uuid"
      },
      "alt": {
        "type": "string"
      },
      "caption": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "attachmentId",
      "alt"
    ]
  },
  "PortalCatalogSnapshotResponseDto": {
    "type": "object",
    "properties": {
      "slug": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "summary": {
        "type": "string",
        "nullable": true
      },
      "category": {
        "type": "string"
      },
      "year": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "achievement": {
        "type": "string"
      },
      "projectStage": {
        "type": "string"
      },
      "challenge": {
        "type": "string"
      },
      "solution": {
        "type": "string"
      },
      "members": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "displayOrder": {
        "type": "number",
        "nullable": true
      },
      "memberCount": {
        "type": "number",
        "minimum": 0
      },
      "cover": {
        "type": "object",
        "nullable": true
      },
      "details": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "available": {
        "type": "boolean"
      },
      "type": {
        "type": "string"
      },
      "date": {
        "type": "string"
      },
      "time": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "content": {
        "type": "string"
      },
      "agenda": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "registrationEndAt": {
        "type": "string",
        "format": "date-time"
      },
      "registrationOpen": {
        "type": "boolean"
      },
      "versionLabel": {
        "type": "string"
      },
      "access": {
        "type": "string",
        "enum": [
          "public",
          "member"
        ]
      },
      "kind": {
        "type": "string",
        "enum": [
          "article",
          "pdf",
          "docx",
          "archive",
          "external"
        ]
      },
      "format": {
        "type": "string",
        "enum": [
          "web",
          "pdf",
          "docx",
          "zip",
          "external"
        ]
      },
      "variant": {
        "type": "object"
      }
    },
    "required": [
      "slug",
      "title"
    ]
  }
} as const;

function resolveSchema(schema: JsonSchema): JsonSchema {
  if (!schema.$ref) return schema;
  const name = schema.$ref.split("/").at(-1);
  const referenced = (API_COMPONENT_SCHEMAS as Record<string, JsonSchema>)[name];
  if (!referenced) return schema;
  const { $ref: _reference, ...overrides } = schema;
  return { ...referenced, ...overrides };
}

function conforms(schema: JsonSchema, value: unknown, strictObject = true): boolean {
  const resolved = resolveSchema(schema);
  if (value === null) return resolved.nullable === true || resolved.type === "null" || (resolved.oneOf ?? resolved.anyOf ?? []).some((item) => conforms(item, value, strictObject));
  if (resolved.oneOf || resolved.anyOf) return (resolved.oneOf ?? resolved.anyOf ?? []).some((item) => conforms(item, value, strictObject));
  if (resolved.allOf && !resolved.allOf.every((item) => conforms(item, value, false))) return false;
  if (resolved.enum && !resolved.enum.includes(value)) return false;
  if (resolved.type === "array") return Array.isArray(value) && value.every((item) => conforms(resolved.items ?? {}, item, strictObject));
  if (resolved.type === "object" || resolved.properties) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    const properties = resolved.properties ?? {};
    if (!(resolved.required ?? []).every((key) => key in record)) return false;
    if (!Object.entries(properties).every(([key, property]) => !(key in record) || conforms(property, record[key], strictObject))) return false;
    if (!strictObject || Object.keys(properties).length === 0) return true;
    return Object.keys(record).every((key) => {
      if (key in properties) return true;
      if (resolved.additionalProperties === true) return true;
      if (resolved.additionalProperties && typeof resolved.additionalProperties === "object") return conforms(resolved.additionalProperties, record[key], strictObject);
      return false;
    });
  }
  if (resolved.type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (resolved.type === "number") return typeof value === "number";
  if (resolved.type === "boolean") return typeof value === "boolean";
  if (resolved.type === "string") return typeof value === "string";
  return true;
}

export function isApiResponse<TOperation extends ApiOperation>(operation: TOperation, value: unknown): value is ApiResponseFor<TOperation> {
  return conforms(API_RESPONSE_SCHEMAS[operation], value);
}
