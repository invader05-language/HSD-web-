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
  type ChangeInterviewSlotDto,
  type ReconcileInterviewSlotsDto,
  type MemberNotificationListDto,
  type NotificationActionResponseDto,
  type NotificationUnreadCountDto,
} from "../../../packages/api-client/src";
import type { RecruitmentExportFile, RecruitmentGateway } from "./recruitment-gateway";

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
  readonly fieldErrors?: Record<string, string>;

  constructor(input: { status: number; code: string; message: string; requestId?: string; fieldErrors?: Record<string, string> }) {
    super(input.message);
    this.name = "RecruitmentApiError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.fieldErrors = input.fieldErrors;
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

function safeRosterFilename(disposition: string | null, batchId: string): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const ascii = disposition?.match(/filename="([^"]+)"/i)?.[1];
  const decoded = encoded
    ? safeDecodeURIComponent(encoded)
    : ascii;
  const cleaned = (decoded || `HSD-${batchId}-报名名单.csv`)
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.endsWith(".csv") ? cleaned : `${cleaned || "HSD-报名名单"}.csv`;
}

function safeDecodeURIComponent(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
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
        ...(isErrorResponse(payload) && payload.fieldErrors ? { fieldErrors: payload.fieldErrors } : {}),
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

  async function readRosterExport(batchId: string, query = ""): Promise<RecruitmentExportFile> {
    const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
    params.delete("page");
    params.delete("pageSize");
    const search = params.toString();
    const response = await fetcher(
      `${apiBase}/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications/export.csv${search ? `?${search}` : ""}`,
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": createRequestId() },
      },
    );
    if (!response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = undefined;
      }
      throw new RecruitmentApiError({
        status: response.status,
        code: isErrorResponse(payload) ? payload.code : "RECRUITMENT_EXPORT_FAILED",
        message: isErrorResponse(payload) ? payload.message : "Recruitment roster export failed",
        ...(isErrorResponse(payload) ? { requestId: payload.requestId } : {}),
      });
    }
    return {
      blob: await response.blob(),
      filename: safeRosterFilename(response.headers.get("Content-Disposition"), batchId),
    };
  }

  async function mutate<TOperation extends ApiOperation>(
    operation: TOperation,
    path: string,
    body: unknown,
    method: "POST" | "PATCH" | "PUT" = "POST",
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

  async function rawMutate<T>(path: string, body: unknown, method: "POST" | "PUT" | "PATCH" = "POST"): Promise<T> {
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
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new RecruitmentApiError({
        status: response.status,
        code: isErrorResponse(payload) ? payload.code : "RECRUITMENT_API_REQUEST_FAILED",
        message: isErrorResponse(payload) ? payload.message : "Recruitment API request failed",
        ...(isErrorResponse(payload) ? { requestId: payload.requestId } : {}),
        ...(isErrorResponse(payload) && payload.fieldErrors ? { fieldErrors: payload.fieldErrors } : {}),
      });
    }
    return payload as T;
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
    listAdminBatches: (page = 1, pageSize = 20) => read(
      "GET /api/v1/admin/recruitment/batches",
      `/api/v1/admin/recruitment/batches?page=${page}&pageSize=${pageSize}`,
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
    exportAdminApplications: (batchId, query = "") => readRosterExport(batchId, query),
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
    changeInterviewSlot: (batchId: string, applicationId: string, payload: ChangeInterviewSlotDto) => rawMutate<MyRecruitmentApplicationResponseDto>(
      `/api/v1/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(applicationId)}/interview-slot`,
      payload,
      "PATCH",
    ),
    reconcileAdminInterviewSlots: (batchId, payload: ReconcileInterviewSlotsDto) => mutate(
      "PUT /api/v1/admin/recruitment/batches/{batchId}/interview-slots",
      `/api/v1/admin/recruitment/batches/${encodeURIComponent(batchId)}/interview-slots`,
      payload,
      "PUT",
    ) as Promise<AdminRecruitmentBatchDto>,
    listNotifications: (page = 1, pageSize = 20) => read(
      "GET /api/v1/notifications",
      `/api/v1/notifications?page=${page}&pageSize=${pageSize}`,
    ) as Promise<MemberNotificationListDto>,
    unreadNotificationCount: () => read(
      "GET /api/v1/notifications/unread-count",
      "/api/v1/notifications/unread-count",
    ) as Promise<NotificationUnreadCountDto>,
    markNotificationRead: (notificationId: string) => mutate(
      "POST /api/v1/notifications/{notificationId}/read",
      `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
      {},
    ) as Promise<NotificationActionResponseDto>,
    markAllNotificationsRead: () => mutate(
      "POST /api/v1/notifications/read-all",
      "/api/v1/notifications/read-all",
      {},
    ) as Promise<NotificationActionResponseDto>,
  };
}
