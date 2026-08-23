import { describe, expect, it, vi } from "vitest";
import {
  API_OPERATIONS,
  isApiResponse,
} from "../../packages/api-client/src";
import { createContentGatewayForRuntime } from "../../app/composables/useContentGateway";

const adminContentListResponse = {
  page: 2,
  pageSize: 20,
  total: 41,
  items: [{
    id: "content-api-only",
    publicId: "public-api-only",
    centerId: null,
    slug: "api-only-news",
    kind: "article",
    status: "pending_publication",
    version: 3,
    workingRevisionNumber: 2,
    title: "API 专属内容",
    summary: "只应从服务端列表获得。",
    createdBy: { type: "account", accountId: "account-api", username: "api-owner", displayName: "接口创建人" },
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T01:00:00.000Z",
    publishedAt: null,
    offlineAt: null,
  }],
} as const;

describe("Task 3C-A generated admin content client", () => {
  it("declares the reviewed list and detail operations and validates their transport response", () => {
    // This catches removal or an incomplete refresh of the reviewed 3B-1 browser contract.
    expect(API_OPERATIONS).toMatchObject({
      "GET /api/v1/admin/content": { method: "GET", path: "/api/v1/admin/content" },
      "GET /api/v1/admin/content/{contentId}": { method: "GET", path: "/api/v1/admin/content/{contentId}" },
    });
    expect(isApiResponse("GET /api/v1/admin/content" as never, adminContentListResponse)).toBe(true);
  });

  it("uses the generated content list client for a cookie-authenticated server query", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(adminContentListResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const gateway = createContentGatewayForRuntime({ apiBase: "https://api.example.test/", useMockApi: false }, {
      fetcher,
      createRequestId: () => "request-admin-content",
    }) as unknown as {
      content: { list(query: string): Promise<typeof adminContentListResponse> };
    };

    await expect(gateway.content.list("page=2&pageSize=20&q=API%20only&status=pending_publication&kind=article")).resolves.toEqual(adminContentListResponse);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/admin/content?page=2&pageSize=20&q=API%20only&status=pending_publication&kind=article",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "request-admin-content" },
      },
    );
  });
});
