import {
  isApiResponse,
  normalizeArchiveRecruitmentBatchPayload,
  type AdminRecruitmentApplicationDto,
  type AdminRecruitmentApplicationListDto,
  type AdminRecruitmentBatchDto,
  type AdminRecruitmentBatchListDto,
  type AdvanceAssessmentDto,
  type ArchiveRecruitmentBatchPayload,
  type ApiOperation,
  type ApiResponseFor,
  type CreateAdjustmentProposalDto,
  type CreateRecruitmentBatchDto,
  type DecideAdjustmentDto,
  type ErrorResponse,
  type MemberProfileResponseDto,
  type MyRecruitmentApplicationEnvelopeDto,
  type MyRecruitmentApplicationResponseDto,
  type PublishAssessmentDto,
  type PublicRecruitmentBatchEnvelopeDto,
  type RecordRoundResultDto,
  type RecruitmentBatchCommandDto,
  type SubmitApplicationDto,
  type UpdateApplicationDto,
  type UpdateMyProfileDto,
  type UpdateRecruitmentBatchDto,
  type WithdrawApplicationDto,
} from "../../../packages/api-client/src";
import type { RecruitmentGateway } from "./recruitment-gateway";

export interface ApiRecruitmentGatewayOptions {
  apiBase: string;
  fetcher?: typeof globalThis.fetch;
  readCookie?: (name: string) => string | undefined;
  createRequestId?: () => string;
}

export class RecruitmentApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(input: { status: number; code: string; message: string; requestId?: string }) {
    super(input.message);
    this.name = "RecruitmentApiError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
  }
}

function readBrowserCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const encodedName = `${encodeURIComponent(name)}=`;
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName))
    ?.slice(encodedName.length);
  return value;
}

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === "object"
    && value !== null
    && typeof (value as ErrorResponse).code === "string"
    && typeof (value as ErrorResponse).message === "string"
    && typeof (value as ErrorResponse).requestId === "string";
}

export function createApiRecruitmentGateway(
  options: ApiRecruitmentGatewayOptions,
): RecruitmentGateway {
  const apiBase = options.apiBase.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? globalThis.fetch;
  const readCookie = options.readCookie ?? readBrowserCookie;
  const createRequestId = options.createRequestId ?? requestId;

  async function parseResponse<TOperation extends ApiOperation>(
    operation: TOperation,
    response: Response,
  ): Promise<ApiResponseFor<TOperation>> {
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new RecruitmentApiError({
        status: response.status,
        code: isErrorResponse(payload) ? payload.code : "RECRUITMENT_API_REQUEST_FAILED",
        message: isErrorResponse(payload) ? payload.message : "Recruitment API request failed",
        ...(isErrorResponse(payload) ? { requestId: payload.requestId } : {}),
      });
    }
    if (!isApiResponse(operation, payload)) {
      throw new Error(`API_RESPONSE_CONTRACT_MISMATCH:${operation}`);
    }
    return payload;
  }

  async function read<TOperation extends ApiOperation>(
    operation: TOperation,
    path: string,
  ): Promise<ApiResponseFor<TOperation>> {
    const response = await fetcher(`${apiBase}${path}`, {
      method: "GET",
      credentials: "include",
      headers: { "X-Request-ID": createRequestId() },
    });
    return parseResponse(operation, response);
  }

  async function mutate<TOperation extends ApiOperation>(
    operation: TOperation,
    path: string,
    body: unknown,
    method: "POST" | "PATCH" = "POST",
  ): Promise<ApiResponseFor<TOperation>> {
    const csrfToken = readCookie("hsd_csrf");
    if (!csrfToken) throw new Error("RECRUITMENT_CSRF_TOKEN_MISSING");
    const response = await fetcher(`${apiBase}${path}`, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": decodeURIComponent(csrfToken),
        "X-Request-ID": createRequestId(),
      },
      body: JSON.stringify(body),
    });
    return parseResponse(operation, response);
  }

  return {
    getCurrentBatch: () => read(
      "GET /api/v1/recruitment/current",
      "/api/v1/recruitment/current",
    ),
    getUpcomingBatch: () => read(
      "GET /api/v1/recruitment/upcoming",
      "/api/v1/recruitment/upcoming",
    ),
    getCurrentProfile: () => read(
      "GET /api/v1/members/me",
      "/api/v1/members/me",
    ),
    updateCurrentProfile: (payload: UpdateMyProfileDto) => mutate(
      "PATCH /api/v1/members/me",
      "/api/v1/members/me",
      payload,
      "PATCH",
    ),
    getMyApplication: (batchId) => read(
      "GET /api/v1/recruitment/batches/{batchId}/my-application",
      `/api/v1/recruitment/batches/${encodeURIComponent(batchId)}/my-application`,
    ),
    submitApplication: (batchId, payload: SubmitApplicationDto) => mutate(
      "POST /api/v1/recruitment/batches/{batchId}/applications",
      `/api/v1/recruitment/batches/${encodeURIComponent(batchId)}/applications`,
      payload,
    ),
    updateApplication: (batchId, applicationId, payload: UpdateApplicationDto) => mutate(
      "PATCH /api/v1/recruitment/batches/{batchId}/applications/{applicationId}",
      `/api/v1/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(applicationId)}`,
      payload,
      "PATCH",
    ),
    withdrawApplication: (batchId, applicationId, payload: WithdrawApplicationDto) => mutate(
      "POST /api/v1/recruitment/batches/{batchId}/applications/{applicationId}/withdraw",
      `/api/v1/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(applicationId)}/withdraw`,
      payload,
    ),
    listAdminBatches: () => read(
      "GET /api/v1/admin/recruitment/batches",
      "/api/v1/admin/recruitment/batches",
    ),
    getAdminBatch: (batchId) => read(
      "GET /api/v1/admin/recruitment/batches/{batchId}",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}`,
    ),
    createAdminBatch: (payload: CreateRecruitmentBatchDto) => mutate(
      "POST /api/v1/admin/recruitment/batches",
      "/api/v1/admin/recruitment/batches",
      payload,
    ),
    updateAdminBatch: (batchId, payload: UpdateRecruitmentBatchDto) => mutate(
      "PATCH /api/v1/admin/recruitment/batches/{batchId}",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}`,
      payload,
      "PATCH",
    ),
    listAdminBatchLifecycleEvents: (batchId, page = 1, pageSize = 50) => read(
      "GET /api/v1/admin/recruitment/batches/{batchId}/lifecycle-events",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/lifecycle-events?page=${page}&pageSize=${pageSize}`,
    ),
    runAdminBatchCommand: async (batchId, command, payload: RecruitmentBatchCommandDto) => {
      const operation = `POST /api/v1/admin/recruitment/batches/{batchId}/${command}` as ApiOperation;
      return mutate(
        operation,
        `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/${command}`,
        payload,
      ) as Promise<AdminRecruitmentBatchDto>;
    },
    archiveAdminBatch: async (batchId, payload: ArchiveRecruitmentBatchPayload) => {
      const normalizedPayload = normalizeArchiveRecruitmentBatchPayload(payload);
      return mutate(
        "POST /api/v1/admin/recruitment/batches/{batchId}/archive",
        `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/archive`,
        normalizedPayload,
      );
    },
    listAdminApplications: (batchId, query = "") => read(
      "GET /api/v1/admin/recruitment/batches/{batchId}/applications",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications${query ? `?${query}` : ""}`,
    ),
    getAdminApplication: (batchId, applicationId) => read(
      "GET /api/v1/admin/recruitment/batches/{batchId}/applications/{applicationId}",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(applicationId)}`,
    ),
    getAssessmentBatch: (batchId) => read(
      "GET /api/v1/admin/recruitment/batches/{batchId}/assessments",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/assessments`,
    ),
    getAdjustmentTargets: (batchId) => read(
      "GET /api/v1/admin/recruitment/batches/{batchId}/assessments/adjustment-targets",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/assessments/adjustment-targets`,
    ),
    recordRoundResult: (batchId, applicationId, payload: RecordRoundResultDto) => mutate(
      "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/round-results",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/assessments/${encodeURIComponent(applicationId)}/round-results`,
      payload,
    ),
    proposeAdjustment: (batchId, applicationId, payload: CreateAdjustmentProposalDto) => mutate(
      "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-proposals",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/assessments/${encodeURIComponent(applicationId)}/adjustment-proposals`,
      payload,
    ),
    decideAdjustment: (batchId, applicationId, payload: DecideAdjustmentDto) => mutate(
      "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/adjustment-decisions",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/assessments/${encodeURIComponent(applicationId)}/adjustment-decisions`,
      payload,
    ),
    advanceAssessment: (batchId, payload: AdvanceAssessmentDto) => mutate(
      "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/advance",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/assessments/advance`,
      payload,
    ),
    publishAssessment: (batchId, payload: PublishAssessmentDto) => mutate(
      "POST /api/v1/admin/recruitment/batches/{batchId}/assessments/publish",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/assessments/publish`,
      payload,
    ),
    getMyResults: () => read(
      "GET /api/v1/recruitment/results/me",
      "/api/v1/recruitment/results/me",
    ),
    getMyResponsibleContact: (resultId, personId) => read(
      "GET /api/v1/recruitment/results/me/{resultId}/responsible-contacts/{contactPersonId}",
      `/api/v1/recruitment/results/me/${encodeURIComponent(resultId)}/responsible-contacts/${encodeURIComponent(personId)}`,
    ),
  };
}
