import { describe, expect, it } from "vitest";
import { API_OPERATIONS, API_V1_PATHS } from "../../packages/api-client/src";
import { createApiContentGateway } from "../../app/services/content/api-content.gateway";
import { vi } from "vitest";

describe("homepage statistics API contract", () => {
  it("exposes the public homepage stats operation", () => {
    expect((API_V1_PATHS as Record<string, string>).publicHomepageStats).toBe("/api/v1/public/homepage/stats");
    expect((API_OPERATIONS as Record<string, { method: string; path: string }>)['GET /api/v1/public/homepage/stats']).toEqual({
      method: "GET",
      path: "/api/v1/public/homepage/stats",
    });
  });

  it("dispatches homepage stats through the production gateway", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(
      JSON.stringify({ formalMembers: 122, coreMembers: 27, activeCenters: 4, publishedProjects: 6 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const gateway = createApiContentGateway({ apiBase: "https://api.example.test", fetcher, createRequestId: () => "stats-request-1" });

    await expect(gateway.homepage.stats()).resolves.toEqual({ formalMembers: 122, coreMembers: 27, activeCenters: 4, publishedProjects: 6 });
    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/public/homepage/stats", {
      method: "GET", credentials: "include", headers: { "X-Request-ID": "stats-request-1" },
    });
  });
});
