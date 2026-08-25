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
  async function readPublicCollection(path: string): Promise<{ items: Array<Record<string, unknown>>; page?: number; pageSize?: number; total?: number }> {
    const response = await fetcher(`${apiBase}${path}`, { method: "GET", credentials: "include", headers: { "X-Request-ID": requestId() } });
    const payload: unknown = await response.json();
    if (!response.ok) throw new ContentApiError(response.status, isError(payload) ? payload.code : "PUBLIC_CONTENT_REQUEST_FAILED", isError(payload) ? payload.message : "Public content request failed", isError(payload) ? payload.requestId : undefined);
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { items?: unknown }).items)) throw new ContentApiError(502, "PUBLIC_COLLECTION_RESPONSE_CONTRACT_MISMATCH", "公开列表响应格式不正确");
    return payload as { items: Array<Record<string, unknown>>; page?: number; pageSize?: number; total?: number };
  }
  const activities = {
    ...client.activities,
    listPublic: (query?: { page?: number; pageSize?: number }) => query
      ? readPublicCollection(`/api/v1/public/activities?page=${query.page ?? 1}&pageSize=${query.pageSize ?? 12}`)
      : client.activities.listPublic(),
  };
  const galleries = {
    ...client.galleries,
    listPublic: (query?: { page?: number; pageSize?: number; category?: string }) => query
      ? readPublicCollection(`/api/v1/public/galleries?page=${query.page ?? 1}&pageSize=${query.pageSize ?? 12}${query.category ? `&category=${encodeURIComponent(query.category)}` : ""}`)
      : client.galleries.listPublic(),
  };
  const timeline = {
    listPublic: (query?: { page?: number; pageSize?: number; kind?: "activity" | "article" | "notice" }) => client.timeline.listPublic(query),
  };
  return {
    projects: client.projects, activities, timeline, registrations: client.registrations, galleries, resources: client.resources, help: client.help, portal: client.portal, content: client.content, media: client.media, homepage: client.homepage,
    project: (slug: string) => client.projects.public(slug), activity: (slug: string) => client.activities.public(slug), gallery: (slug: string) => client.galleries.public(slug), resource: (slug: string) => client.resources.public(slug), resourceVersion: (slug: string, versionLabel: string) => client.resources.publicVersion(slug, versionLabel),
  };
}
