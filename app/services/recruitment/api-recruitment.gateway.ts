import {
  isApiResponse,
  type AdvanceAssessmentDto,
  type ApiOperation,
  type ApiResponseFor,
  type CreateAdjustmentProposalDto,
  type DecideAdjustmentDto,
  type ErrorResponse,
  type PublishAssessmentDto,
  type RecordRoundResultDto,
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
  ): Promise<ApiResponseFor<TOperation>> {
    const csrfToken = readCookie("hsd_csrf");
    if (!csrfToken) throw new Error("RECRUITMENT_CSRF_TOKEN_MISSING");
    const response = await fetcher(`${apiBase}${path}`, {
      method: "POST",
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
