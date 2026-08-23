import { describe, expect, it, vi } from "vitest";
import { API_V1_PATHS, createHsdApiClient, isApiResponse } from "../../packages/api-client/src";
import { createAdminResourceListController } from "../../app/services/resources/admin-resource-list";
import { createAdminResourceDetailController } from "../../app/services/resources/admin-resource-detail";
import { createApiResourceGateway } from "../../app/services/resources/api-resource.gateway";

const resourceId = "11111111-1111-4111-8111-111111111111";
const centerId = "22222222-2222-4222-8222-222222222222";

const resource = {
  id: resourceId,
  centerId,
  slug: "qa-api-resource",
  status: "published" as const,
  version: 4,
  title: "API-only resource",
  summary: "Authoritative summary",
  kind: "pdf" as const,
  format: "pdf" as const,
  versionLabel: "v2.0",
  access: "member" as const,
  availability: "available" as const,
  attachmentId: null,
  revisionNumber: 2,
  createdBy: { id: "33333333-3333-4333-8333-333333333333", username: "owner", displayName: "API owner" },
  createdAt: "2026-08-23T00:00:00.000Z",
  updatedAt: "2026-08-23T01:00:00.000Z",
  publishedAt: "2026-08-23T01:00:00.000Z",
  offlineAt: null,
};

describe("admin resource production reads", () => {
  it("generates typed list and detail operations from the reviewed resource contract", async () => {
    expect(API_V1_PATHS).toMatchObject({
      adminResources: "/api/v1/admin/resources",
      adminResource: "/api/v1/admin/resources/{id}",
      adminResourceVersions: "/api/v1/admin/resources/{id}/versions",
    });
    expect(isApiResponse("GET /api/v1/admin/resources", { page: 1, pageSize: 20, total: 1, items: [resource] })).toBe(true);
    expect(isApiResponse("GET /api/v1/admin/resources/{id}", { ...resource, content: "Canonical content", offlineReason: null })).toBe(true);

    const requests: Array<{ path: string; method: string }> = [];
    const client = createHsdApiClient(async (request) => {
      requests.push(request);
      return request.path.includes("/versions") ? { items: [] } : request.path === `/api/v1/admin/resources/${resourceId}` ? { ...resource, content: "Canonical content", offlineReason: null } : { page: 1, pageSize: 20, total: 1, items: [resource] };
    });
    await client.resources.list("page=1&pageSize=20&q=API-only");
    await client.resources.detail(resourceId);
    expect(requests).toEqual([
      { path: "/api/v1/admin/resources?page=1&pageSize=20&q=API-only", method: "GET" },
      { path: `/api/v1/admin/resources/${resourceId}`, method: "GET" },
    ]);
  });

  it("sends server-side filters and clears stale API rows on forbidden, missing, and network errors", async () => {
    const list = vi.fn().mockResolvedValueOnce({ page: 2, pageSize: 20, total: 21, items: [resource] });
    const controller = createAdminResourceListController({ list });
    controller.setFilters({ q: "  API-only ", status: "published", kind: "pdf", format: "pdf", access: "member", availability: "available", centerId });
    controller.setPage(2);
    await controller.load();

    expect(list).toHaveBeenCalledWith("page=2&pageSize=20&q=API-only&status=published&kind=pdf&format=pdf&access=member&availability=available&centerId=22222222-2222-4222-8222-222222222222");
    expect(controller.records.value).toEqual([expect.objectContaining({ title: "API-only resource", kind: "PDF", access: "登录成员", availability: "可用", version: 4 })]);

    list.mockRejectedValueOnce(Object.assign(new Error("Foreign center"), { status: 403 }));
    await controller.load();
    expect(controller.status.value).toBe("forbidden");
    expect(controller.records.value).toEqual([]);

    list.mockRejectedValueOnce(Object.assign(new Error("Not found"), { status: 404 }));
    await controller.load();
    expect(controller.status.value).toBe("notFound");
    expect(controller.records.value).toEqual([]);

    list.mockRejectedValueOnce(new Error("Network unavailable"));
    await controller.load();
    expect(controller.status.value).toBe("error");
    expect(controller.records.value).toEqual([]);
  });

  it("loads canonical detail and version history together without mock-only file metadata", async () => {
    const detail = vi.fn().mockResolvedValue({ ...resource, content: "Canonical content", offlineReason: null });
    const versions = vi.fn().mockResolvedValue({ items: [{ versionLabel: "v2.0", access: "member", availability: "available", content: "Canonical content", attachmentId: null, revisionNumber: 2, createdAt: "2026-08-23T00:00:00.000Z" }] });
    const controller = createAdminResourceDetailController({ detail, versions });
    await controller.load(resourceId);
    expect(controller.status.value).toBe("success");
    expect(controller.resource.value).toEqual(expect.objectContaining({ title: "API-only resource", access: "登录成员", availability: "可用", version: 4, content: "Canonical content" }));
    expect(controller.versions.value).toEqual([expect.objectContaining({ versionLabel: "v2.0", access: "登录成员", availability: "可用", revisionNumber: 2 })]);
    expect(JSON.stringify(controller.resource.value)).not.toMatch(/category|downloads|owner|fileName|size|state/);

    detail.mockRejectedValueOnce(Object.assign(new Error("Resource not found"), { status: 404 }));
    await controller.load(resourceId);
    expect(controller.status.value).toBe("notFound");
    expect(controller.resource.value).toBeUndefined();
    expect(controller.versions.value).toEqual([]);
  });

  it("uses cookie credentials and request IDs for resource GETs without CSRF or local fallback", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ page: 1, pageSize: 20, total: 0, items: [] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiResourceGateway({ apiBase: "https://api.example.test/", fetcher, createRequestId: () => "resource-request-id" });
    await gateway.list("page=1&pageSize=20&status=published");
    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/admin/resources?page=1&pageSize=20&status=published", expect.objectContaining({ method: "GET", credentials: "include", headers: { "X-Request-ID": "resource-request-id" } }));
    expect(fetcher.mock.calls[0]?.[1]?.headers).not.toHaveProperty("X-CSRF-Token");
  });
});
