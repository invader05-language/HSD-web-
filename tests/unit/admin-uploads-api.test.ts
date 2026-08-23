import { describe, expect, it, vi } from "vitest";
import { API_V1_PATHS, createHsdApiClient, isApiResponse } from "../../packages/api-client/src";
import { createAdminUploadListController, formatByteSize } from "../../app/services/uploads/admin-upload-list";
import { createApiUploadGateway } from "../../app/services/uploads/api-upload.gateway";

const upload = { id: "11111111-1111-4111-8111-111111111111", centerId: "22222222-2222-4222-8222-222222222222", createdBy: { id: "33333333-3333-4333-8333-333333333333", username: "owner", displayName: "Owner" }, fileName: "qa-image.png", mimeType: "image/png", byteSize: 1536, kind: "image" as const, status: "ready" as const, version: 2, expiresAt: "2026-09-01T00:00:00.000Z", failureCode: null, completedAt: "2026-08-23T01:00:00.000Z", createdAt: "2026-08-23T00:00:00.000Z", updatedAt: "2026-08-23T01:00:00.000Z" };

describe("admin upload production reads", () => {
  it("generates the reviewed typed upload list operation and dispatches query reads", async () => {
    expect(API_V1_PATHS).toMatchObject({ adminUploads: "/api/v1/admin/uploads" });
    expect(isApiResponse("GET /api/v1/admin/uploads", { page: 1, pageSize: 20, total: 1, items: [upload] })).toBe(true);
    const requests: Array<{ path: string; method: string }> = [];
    const client = createHsdApiClient(async (request) => { requests.push(request); return { page: 1, pageSize: 20, total: 1, items: [upload] }; });
    await client.uploads.list("page=1&pageSize=20&kind=image");
    expect(requests).toEqual([{ path: "/api/v1/admin/uploads?page=1&pageSize=20&kind=image", method: "GET" }]);
  });

  it("sends upload filters to the server, maps only canonical fields, and clears stale results", async () => {
    const list = vi.fn().mockResolvedValueOnce({ page: 2, pageSize: 20, total: 21, items: [upload] });
    const controller = createAdminUploadListController({ list });
    controller.setFilters({ q: "  qa image  ", status: "ready", kind: "image", centerId: upload.centerId });
    controller.setPage(2);
    await controller.load();

    expect(list).toHaveBeenCalledWith(`page=2&pageSize=20&q=qa+image&status=ready&kind=image&centerId=${upload.centerId}`);
    expect(controller.records.value).toEqual([expect.objectContaining({ fileName: "qa-image.png", mimeType: "image/png", byteSize: "1.5 KB", kind: "图片", status: "可用", version: 2, createdBy: "Owner" })]);
    expect(JSON.stringify(controller.records.value)).not.toMatch(/centerId|destination|storage|token|progress|note|retry/i);

    list.mockRejectedValueOnce(Object.assign(new Error("Unauthorized"), { status: 401 }));
    await controller.load();
    expect(controller.status.value).toBe("unauthorized");
    expect(controller.records.value).toEqual([]);

    list.mockRejectedValueOnce(Object.assign(new Error("Forbidden"), { status: 403 }));
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

    list.mockResolvedValueOnce({ page: 1, pageSize: 20, total: 0, items: [] });
    await controller.load();
    expect(controller.status.value).toBe("empty");
    expect(controller.total.value).toBe(0);
    expect(formatByteSize(0)).toBe("0 B");
  });

  it("does not let a stale request overwrite the latest server result", async () => {
    let resolveFirst: ((value: { page: number; pageSize: number; total: number; items: typeof upload[] }) => void) | undefined;
    const list = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; })).mockResolvedValueOnce({ page: 1, pageSize: 20, total: 1, items: [{ ...upload, fileName: "latest.png" }] });
    const controller = createAdminUploadListController({ list });
    const first = controller.load();
    const second = controller.load();
    await second;
    resolveFirst?.({ page: 1, pageSize: 20, total: 1, items: [upload] });
    await first;
    expect(controller.records.value).toEqual([expect.objectContaining({ fileName: "latest.png" })]);
  });

  it("uses credentialed GET requests with a request ID and exposes no upload mutations", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ page: 1, pageSize: 20, total: 0, items: [] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiUploadGateway({ apiBase: "https://api.example.test/", fetcher, createRequestId: () => "upload-request-id" });
    await gateway.list("page=1&pageSize=20&status=ready");
    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/admin/uploads?page=1&pageSize=20&status=ready", expect.objectContaining({ method: "GET", credentials: "include", headers: { "X-Request-ID": "upload-request-id" } }));
    expect(fetcher.mock.calls[0]?.[1]?.headers).not.toHaveProperty("X-CSRF-Token");
    expect(gateway).toEqual({ list: expect.any(Function) });
  });
});
