import { createHsdApiClient, type ApiRequest, type ApiTransport, type ErrorResponse } from "../../../packages/api-client/src";

export interface ApiAuditGatewayOptions {
  apiBase: string;
  fetcher?: typeof globalThis.fetch;
  createRequestId?: () => string;
}

export class AuditApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly requestId?: string) {
    super(message);
    this.name = "AuditApiError";
  }
}

const isError = (value: unknown): value is ErrorResponse => Boolean(
  value && typeof value === "object" && typeof (value as ErrorResponse).code === "string" && typeof (value as ErrorResponse).message === "string",
);

export function createApiAuditGateway(options: ApiAuditGatewayOptions) {
  const apiBase = options.apiBase.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? globalThis.fetch;
  const createRequestId = options.createRequestId ?? (() => globalThis.crypto?.randomUUID?.() ?? `audit-${Date.now()}`);
  const transport: ApiTransport = async (request: ApiRequest) => {
    const response = await fetcher(`${apiBase}${request.path}`, {
      method: request.method,
      credentials: "include",
      headers: { "X-Request-ID": createRequestId() },
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new AuditApiError(response.status, isError(payload) ? payload.code : "AUDIT_API_REQUEST_FAILED", isError(payload) ? payload.message : "Audit API request failed", isError(payload) ? payload.requestId : undefined);
    return payload;
  };
  return { list: createHsdApiClient(transport).auditEvents.list };
}
