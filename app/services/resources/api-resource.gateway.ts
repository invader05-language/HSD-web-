import { createHsdApiClient, type ApiRequest, type ApiTransport, type ErrorResponse } from "../../../packages/api-client/src";

export interface ApiResourceGatewayOptions { apiBase: string; fetcher?: typeof globalThis.fetch; readCookie?: (name: string) => string | undefined; createRequestId?: () => string; }
export class ResourceApiError extends Error { constructor(readonly status: number, readonly code: string, message: string, readonly requestId?: string) { super(message); this.name = "ResourceApiError"; } }
const browserCookie = (name: string) => typeof document === "undefined" ? undefined : document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${encodeURIComponent(name)}=`))?.slice(name.length + 1);
const isError = (value: unknown): value is ErrorResponse => Boolean(value && typeof value === "object" && typeof (value as ErrorResponse).code === "string" && typeof (value as ErrorResponse).message === "string");

export function createApiResourceGateway(options: ApiResourceGatewayOptions) {
  const apiBase = options.apiBase.replace(/\/+$/, ""); const fetcher = options.fetcher ?? globalThis.fetch; const readCookie = options.readCookie ?? browserCookie; const createRequestId = options.createRequestId ?? (() => globalThis.crypto?.randomUUID?.() ?? `resource-${Date.now()}`);
  const transport: ApiTransport = async (request: ApiRequest) => {
    const headers: Record<string, string> = { "X-Request-ID": createRequestId() };
    if (request.method !== "GET") { const csrf = readCookie("hsd_csrf"); if (!csrf) throw new ResourceApiError(403, "RESOURCE_CSRF_TOKEN_MISSING", "Resource request could not be verified"); headers["Content-Type"] = "application/json"; headers["X-CSRF-Token"] = decodeURIComponent(csrf); }
    const response = await fetcher(`${apiBase}${request.path}`, { method: request.method, credentials: "include", headers, ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }) });
    const payload: unknown = await response.json();
    if (!response.ok) throw new ResourceApiError(response.status, isError(payload) ? payload.code : "RESOURCE_API_REQUEST_FAILED", isError(payload) ? payload.message : "Resource API request failed", isError(payload) ? payload.requestId : undefined);
    return payload;
  };
  const client = createHsdApiClient(transport);
  return {
    list: client.resources.list,
    detail: client.resources.detail,
    versions: client.resources.versions,
    create: client.resources.create,
    appendVersion: client.resources.appendVersion,
    publish: client.resources.publish,
    offline: client.resources.offline,
  };
}
