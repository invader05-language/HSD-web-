import { describe, expect, it, vi } from "vitest";
import { createHsdApiClient } from "../../packages/api-client/src";
import { createApiAuditGateway } from "../../app/services/audit/api-audit.gateway";
import { createAdminAuditListController, projectSafeAuditValues } from "../../app/services/audit/admin-audit-list";

const event = {
  id: "11111111-1111-4111-8111-111111111111",
  actor: { type: "account" as const, accountId: "22222222-2222-4222-8222-222222222222", username: "owner", displayName: "接口负责人" },
  action: "content.publish",
  target: { type: "content", id: "33333333-3333-4333-8333-333333333333" },
  before: { status: "review" }, after: { status: "published" }, reason: null,
  createdAt: "2026-08-23T00:00:00.000Z",
};

describe("admin audit production reads", () => {
  it("uses the generated audit-events operation for the server query", async () => {
    const requests: Array<{ path: string; method: string }> = [];
    const client = createHsdApiClient(async (request) => {
      requests.push(request);
      return { page: 1, pageSize: 20, total: 1, items: [event] };
    }) as unknown as { auditEvents?: { list(query?: string): Promise<unknown> } };

    await expect(client.auditEvents?.list("page=1&pageSize=20&action=content.publish")).resolves.toEqual({ page: 1, pageSize: 20, total: 1, items: [event] });
    expect(requests).toEqual([{ path: "/api/v1/admin/audit-events?page=1&pageSize=20&action=content.publish", method: "GET" }]);
  });

  it("maps only safe API fields and clears rows/detail for a changed server filter", async () => {
    const list = vi.fn().mockResolvedValue({ page: 2, pageSize: 20, total: 21, items: [{ ...event, before: { status: "review", token: "must-not-render", allowed: ["a", 2, true, null] }, after: { status: "published", requestId: "must-not-render", objectStorageUrl: "must-not-render" } }] });
    const controller = createAdminAuditListController({ list });
    controller.setFilters({ action: " content.publish ", actionPrefix: "content.", targetType: "content", targetId: event.target.id, actorAccountId: event.actor.accountId!, from: "2026-08-22T00:00:00.000Z", to: "2026-08-24T00:00:00.000Z" });
    controller.setPage(2);
    await controller.load();

    expect(list).toHaveBeenCalledWith("page=2&pageSize=20&action=content.publish&actionPrefix=content.&targetType=content&targetId=33333333-3333-4333-8333-333333333333&actorAccountId=22222222-2222-4222-8222-222222222222&from=2026-08-22T00%3A00%3A00.000Z&to=2026-08-24T00%3A00%3A00.000Z");
    expect(controller.records.value[0]).toMatchObject({ actor: "接口负责人", actorAccount: "owner", action: "content.publish", targetType: "content", targetId: event.target.id, before: { status: "review", allowed: ["a", 2, true, null] }, after: { status: "published" } });
    controller.select(controller.records.value[0]!);
    controller.setFilters({ action: "", actionPrefix: "", targetType: "", targetId: "", actorAccountId: "", from: "", to: "" });
    expect(controller.selected.value).toBeUndefined();

    list.mockResolvedValueOnce({ page: 1, pageSize: 20, total: 0, items: [] });
    await controller.load();
    expect(controller.status.value).toBe("empty");
    expect(controller.records.value).toEqual([]);
  });

  it("does not preserve stale rows when an older request finishes last or when a read is denied", async () => {
    let resolveOld!: (value: { page: number; pageSize: number; total: number; items: typeof event[] }) => void;
    let resolveNew!: (value: { page: number; pageSize: number; total: number; items: typeof event[] }) => void;
    const oldRequest = new Promise<{ page: number; pageSize: number; total: number; items: typeof event[] }>((resolve) => { resolveOld = resolve; });
    const newRequest = new Promise<{ page: number; pageSize: number; total: number; items: typeof event[] }>((resolve) => { resolveNew = resolve; });
    const list = vi.fn().mockReturnValueOnce(oldRequest).mockReturnValueOnce(newRequest);
    const controller = createAdminAuditListController({ list });
    const oldLoad = controller.load();
    controller.setFilters({ action: "content.publish", actionPrefix: "", targetType: "", targetId: "", actorAccountId: "", from: "", to: "" });
    const newLoad = controller.load();
    resolveNew({ page: 1, pageSize: 20, total: 1, items: [{ ...event, id: "44444444-4444-4444-8444-444444444444", action: "content.offline" }] });
    await newLoad;
    resolveOld({ page: 1, pageSize: 20, total: 1, items: [event] });
    await oldLoad;
    expect(controller.records.value).toEqual([expect.objectContaining({ action: "content.offline" })]);

    list.mockRejectedValueOnce(Object.assign(new Error("Owner only"), { status: 403 }));
    await controller.load();
    expect(controller.status.value).toBe("forbidden");
    expect(controller.records.value).toEqual([]);
    expect(controller.selected.value).toBeUndefined();
  });

  it("adopts a server-corrected page and page size for the next audit request", async () => {
    const list = vi.fn()
      .mockResolvedValueOnce({ page: 3, pageSize: 7, total: 21, items: [event] })
      .mockResolvedValueOnce({ page: 4, pageSize: 7, total: 21, items: [event] });
    const controller = createAdminAuditListController({ list }, { page: 99, pageSize: 20 });

    await controller.load();
    expect(controller.query.value).toMatchObject({ page: 3, pageSize: 7 });

    controller.setPage(4);
    await controller.load();
    expect(list).toHaveBeenLastCalledWith("page=4&pageSize=7");
  });

  it("recursively excludes sensitive audit names while retaining typed scalar fields", () => {
    const projection = projectSafeAuditValues({ status: "published", count: 2, flags: [true, false], contact: "x", password: "x", secret: "x", token: "x", session: "x", cookie: "x", requestId: "x", ip: "127.0.0.1", userAgent: "x", objectStorageKey: "x", nested: { token: "x" } });
    expect(projection).toEqual({ status: "published", count: 2, flags: [true, false] });
    expect(JSON.stringify(projection)).not.toMatch(/contact|password|secret|token|session|cookie|requestId|127\.0\.0\.1|userAgent|objectStorage/i);
  });

  it("does not expose camel, snake, or kebab case IP audit fields", () => {
    const projection = projectSafeAuditValues({ status: "published", clientIp: "10.0.0.1", remoteIp: "10.0.0.2", sourceIp: "10.0.0.3", clientIPAddress: "10.0.0.4", client_ip: "10.0.0.5", "remote-ip": "10.0.0.6" });
    expect(projection).toEqual({ status: "published" });
    expect(JSON.stringify(projection)).not.toMatch(/10\.0\.0\.[1-6]|clientIp|remoteIp|sourceIp|clientIPAddress|client_ip|remote-ip/i);
  });

  it("clears selected API rows for 401 and network failures without a fallback result", async () => {
    const list = vi.fn().mockResolvedValueOnce({ page: 1, pageSize: 20, total: 1, items: [event] });
    const controller = createAdminAuditListController({ list });
    await controller.load();
    controller.select(controller.records.value[0]!);

    list.mockRejectedValueOnce(Object.assign(new Error("Authentication required"), { status: 401 }));
    await controller.load();
    expect(controller.status.value).toBe("unauthorized");
    expect(controller.records.value).toEqual([]);
    expect(controller.selected.value).toBeUndefined();

    list.mockRejectedValueOnce(new TypeError("Network unavailable"));
    await controller.load();
    expect(controller.status.value).toBe("error");
    expect(controller.error.value).toBe("Network unavailable");
    expect(controller.records.value).toEqual([]);
    expect(controller.selected.value).toBeUndefined();
  });

  it("uses cookie credentials and a request ID for the audit GET without a local fallback header", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ page: 1, pageSize: 20, total: 0, items: [] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiAuditGateway({ apiBase: "https://api.example.test/", fetcher, createRequestId: () => "audit-request-id" });
    await gateway.list("page=1&pageSize=20");
    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/admin/audit-events?page=1&pageSize=20", expect.objectContaining({ method: "GET", credentials: "include", headers: { "X-Request-ID": "audit-request-id" } }));
  });
});
