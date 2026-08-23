import { describe, expect, it, vi } from "vitest";
import { API_V1_PATHS, createHsdApiClient } from "../../packages/api-client/src";
import { createAdminContentDetailController, replaceFirstContentParagraph } from "../../app/services/content/admin-content-detail";
import { createApiContentGateway } from "../../app/services/content/api-content.gateway";

describe("admin content production mutations", () => {
  it("generates all reviewed content detail, preview, and workflow operations", async () => {
    expect(API_V1_PATHS).toMatchObject({ adminContentDetail: "/api/v1/admin/content/{contentId}", adminContentPreview: "/api/v1/admin/content/{contentId}/preview", adminContentCreate: "/api/v1/admin/content" });
    const response = { id: "content-1", publicId: "public-1", centerId: null, slug: "content-1", kind: "article", status: "draft", version: 1, createdBy: { type: "account", accountId: "owner", username: "owner", displayName: "Owner" }, createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:00:00.000Z", workingRevision: { revisionNumber: 1, title: "API title", summary: "API summary", tag: null, internalTarget: null, expiresAt: null, blocks: [{ type: "paragraph", text: "API body" }], internalNote: null }, publishedRevisionNumber: null, rejectionReason: null, publishedAt: null, offlineAt: null, offlineReason: null };
    const requests: Array<{ path: string; method: string; body?: unknown }> = [];
    const client = createHsdApiClient(async (request) => { requests.push(request); return response; });
    await client.content.preview("content-1");
    await client.content.submitReview("content-1", { expectedVersion: 2 });
    await client.content.returnDraft("content-1", { expectedVersion: 3, reason: "Needs revision" });
    await client.content.approvePublication("content-1", { expectedVersion: 4 });
    await client.content.publish("content-1", { expectedVersion: 5, confirmed: true });
    await client.content.offline("content-1", { expectedVersion: 6, reason: "Expired" });
    expect(requests.map(({ path, method }) => ({ path, method }))).toEqual([
      { path: "/api/v1/admin/content/content-1/preview", method: "GET" },
      { path: "/api/v1/admin/content/content-1/submit-review", method: "POST" },
      { path: "/api/v1/admin/content/content-1/return-draft", method: "POST" },
      { path: "/api/v1/admin/content/content-1/approve-publication", method: "POST" },
      { path: "/api/v1/admin/content/content-1/publish", method: "POST" },
      { path: "/api/v1/admin/content/content-1/offline", method: "POST" },
    ]);
    expect(requests[2]?.body).toEqual({ expectedVersion: 3, reason: "Needs revision" });
    expect(requests[4]?.body).toEqual({ expectedVersion: 5, confirmed: true });
  });

  it("maps canonical working revisions and clears stale detail after a missing response", async () => {
    const response = { id: "content-1", publicId: "public-1", centerId: null, slug: "content-1", kind: "article" as const, status: "review" as const, version: 2, createdBy: { type: "account" as const, accountId: "owner", username: "owner", displayName: "Owner" }, createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:00:00.000Z", workingRevision: { revisionNumber: 3, title: "API title", summary: "API summary", tag: null, internalTarget: null, expiresAt: null, blocks: [{ type: "image" as const, attachmentId: "attachment-1", alt: "API image" }, { type: "paragraph" as const, text: "API body" }], internalNote: null }, publishedRevisionNumber: null, rejectionReason: null, publishedAt: null, offlineAt: null, offlineReason: null };
    const detail = vi.fn().mockResolvedValueOnce(response);
    const controller = createAdminContentDetailController({ detail });
    await controller.load("content-1");
    expect(controller.record.value).toEqual(expect.objectContaining({ status: "待审核", title: "API title", workingRevisionNumber: 3 }));
    expect(controller.record.value?.blocks[0]).toEqual(expect.objectContaining({ type: "image", attachmentId: "attachment-1" }));
    detail.mockRejectedValueOnce(Object.assign(new Error("Not found"), { status: 404 }));
    await controller.load("missing");
    expect(controller.status.value).toBe("notFound");
    expect(controller.record.value).toBeUndefined();
  });

  it("uses credentials, request IDs, and CSRF for content mutations while keeping preview GET clean", async () => {
    const response = { id: "content-1", publicId: "public-1", centerId: null, slug: "content-1", kind: "article", status: "draft", version: 1, createdBy: { type: "account", accountId: "owner", username: "owner", displayName: "Owner" }, createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:00:00.000Z", workingRevision: { revisionNumber: 1, title: "API title", summary: "API summary", tag: null, internalTarget: null, expiresAt: null, blocks: [{ type: "paragraph", text: "API body" }], internalNote: null }, publishedRevisionNumber: null, rejectionReason: null, publishedAt: null, offlineAt: null, offlineReason: null };
    const fetcher = vi.fn().mockImplementation(() => new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiContentGateway({ apiBase: "https://api.example.test", fetcher, readCookie: () => "csrf-token", createRequestId: () => "content-request-id" });
    await gateway.content.preview("content-1");
    await gateway.content.update("content-1", { expectedVersion: 1, title: "Updated" });
    expect(fetcher.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: "GET", credentials: "include", headers: { "X-Request-ID": "content-request-id" } }));
    expect(fetcher.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: "PATCH", credentials: "include", headers: { "X-Request-ID": "content-request-id", "Content-Type": "application/json", "X-CSRF-Token": "csrf-token" } }));
  });

  it("keeps the newest content request when older detail responses resolve late", async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    const response = (id: string, title: string) => ({ id, publicId: `${id}-public`, centerId: null, slug: id, kind: "article", status: "draft", version: 1, createdBy: { type: "account", accountId: "owner", username: "owner", displayName: "Owner" }, createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:00:00.000Z", workingRevision: { revisionNumber: 1, title, summary: "summary", tag: null, internalTarget: null, expiresAt: null, blocks: [], internalNote: null }, publishedRevisionNumber: null, rejectionReason: null, publishedAt: null, offlineAt: null, offlineReason: null });
    const detail = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; })).mockResolvedValueOnce(response("new", "New title"));
    const controller = createAdminContentDetailController({ detail }); const first = controller.load("old"); await controller.load("new"); resolveFirst?.(response("old", "Old title")); await first;
    expect(controller.record.value).toEqual(expect.objectContaining({ id: "new", title: "New title" }));
    detail.mockResolvedValueOnce({ ...response("missing", "ignored"), workingRevision: null }); await controller.load("missing");
    expect(controller.status.value).toBe("missingRevision"); expect(controller.record.value).toBeUndefined();
  });

  it("preserves mixed heading, image, and paragraph order when replacing editable body text", () => {
    const blocks = [{ type: "heading" as const, level: 2 as const, text: "Heading" }, { type: "image" as const, attachmentId: "attachment-1", alt: "Image" }, { type: "paragraph" as const, text: "Old body" }];
    expect(replaceFirstContentParagraph(blocks, "New body")).toEqual([{ type: "heading", level: 2, text: "Heading" }, { type: "image", attachmentId: "attachment-1", alt: "Image" }, { type: "paragraph", text: "New body" }]);
  });
});
