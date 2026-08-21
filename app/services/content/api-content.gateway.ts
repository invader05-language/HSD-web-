import { createHsdApiClient, type ApiRequest, type ApiTransport, type ErrorResponse } from "../../../packages/api-client/src";

export interface ApiContentGatewayOptions { apiBase: string; fetcher?: typeof globalThis.fetch; readCookie?: (name: string) => string | undefined; createRequestId?: () => string }
export class ContentApiError extends Error { constructor(readonly status: number, readonly code: string, message: string, readonly requestId?: string) { super(message); this.name = "ContentApiError" } }
const browserCookie = (name: string) => typeof document === "undefined" ? undefined : document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${encodeURIComponent(name)}=`))?.slice(name.length + 1);
const isError = (value: unknown): value is ErrorResponse => Boolean(value && typeof value === "object" && typeof (value as ErrorResponse).code === "string" && typeof (value as ErrorResponse).message === "string");

export function createApiContentGateway(options: ApiContentGatewayOptions) {
  const apiBase = options.apiBase.replace(/\/+$/, ""); const fetcher = options.fetcher ?? globalThis.fetch; const readCookie = options.readCookie ?? browserCookie; const requestId = options.createRequestId ?? (() => globalThis.crypto?.randomUUID?.() ?? `content-${Date.now()}`);
  const transport: ApiTransport = async (request: ApiRequest) => {
    const headers: Record<string, string> = { "X-Request-ID": requestId() };
    if (request.method !== "GET") { const csrf = readCookie("hsd_csrf"); if (!csrf) throw new ContentApiError(403, "CONTENT_CSRF_TOKEN_MISSING", "Content request could not be verified"); headers["Content-Type"] = "application/json"; headers["X-CSRF-Token"] = decodeURIComponent(csrf); }
    const response = await fetcher(`${apiBase}${request.path}`, { method: request.method, credentials: "include", headers, ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }) });
    const payload: unknown = await response.json();
    if (!response.ok) throw new ContentApiError(response.status, isError(payload) ? payload.code : "CONTENT_API_REQUEST_FAILED", isError(payload) ? payload.message : "Content API request failed", isError(payload) ? payload.requestId : undefined);
    return payload;
  };
  const client = createHsdApiClient(transport);
  return {
    projects: client.projects, activities: client.activities, registrations: client.registrations, galleries: client.galleries, resources: client.resources, help: client.help, portal: client.portal, media: client.media, homepage: client.homepage,
    project: (slug: string) => client.projects.public(slug), activity: (slug: string) => client.activities.public(slug), gallery: (slug: string) => client.galleries.public(slug), resource: (slug: string) => client.resources.public(slug), resourceVersion: (slug: string, versionLabel: string) => client.resources.publicVersion(slug, versionLabel),
  };
}
