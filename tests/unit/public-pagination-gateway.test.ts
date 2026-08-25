import { describe, expect, it, vi } from "vitest";
import { createApiContentGateway } from "../../app/services/content/api-content.gateway";

describe("public catalog pagination gateway", () => {
  it("passes page, size and gallery category to the server", async () => {
    const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify({ page: 2, pageSize: 6, total: 13, items: [] }), { status: 200, headers: { "content-type": "application/json" } }));
    const gateway = createApiContentGateway({ apiBase: "https://hsd.example", fetcher });
    await gateway.galleries.listPublic({ page: 2, pageSize: 6, category: "video_work" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://hsd.example/api/v1/public/galleries?page=2&pageSize=6&category=video_work",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("requests the server-paginated public timeline for a selected tab", async () => {
    const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify({ page: 2, pageSize: 5, total: 7, items: [] }), { status: 200, headers: { "content-type": "application/json" } }));
    const gateway = createApiContentGateway({ apiBase: "https://hsd.example", fetcher });

    await gateway.timeline.listPublic({ page: 2, pageSize: 5, kind: "article" });

    expect(fetcher).toHaveBeenCalledWith(
      "https://hsd.example/api/v1/public/timeline?page=2&pageSize=5&kind=article",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });
});
