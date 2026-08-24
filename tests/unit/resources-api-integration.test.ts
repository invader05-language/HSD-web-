import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { readFileSync } from "node:fs";
import { useResourcesStore } from "../../app/stores/resources";
import { createApiContentGateway } from "../../app/services/content/api-content.gateway";

describe("Resources production API integration", () => {
  beforeEach(() => { setActivePinia(createPinia()); localStorage.clear(); });
  it("uses generated Resources public reads and preserves only the safe public variant", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      slug: "safe-pdf",
      title: "Safe PDF",
      summary: "A safe server-published resource.",
      kind: "pdf",
      format: "pdf",
      versionLabel: "v1.1",
      access: "public",
      content: "",
      variant: { url: "/api/v1/public/media/safe-pdf" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiContentGateway({ apiBase: "https://api.example.test/", fetcher, createRequestId: () => "resource-read-1" });

    const resource = await gateway.resources.public("safe/pdf");

    expect(resource).toMatchObject({ slug: "safe-pdf", variant: { url: "/api/v1/public/media/safe-pdf" } });
    expect(JSON.stringify(resource)).not.toMatch(/attachmentId|objectKey/);
    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/public/resources/safe%2Fpdf", {
      method: "GET", credentials: "include", headers: { "X-Request-ID": "resource-read-1" },
    });
  });

  it("keeps production Resources API-only across list, member version access, errors, and empty state", async () => {
    localStorage.setItem("baiyun-hsd.resources", JSON.stringify({ items: [{ slug: "stale" }] }));
    const store = useResourcesStore();
    const member = { slug: "member-pdf", title: "Member PDF", summary: "Member only", kind: "pdf", format: "pdf", versionLabel: "v2", access: "member" as const };
    const gateway = { resources: { listPublic: vi.fn().mockResolvedValue({ items: [member] }) }, resource: vi.fn(), resourceVersion: vi.fn().mockResolvedValue({ ...member, content: "", variant: { url: "/api/v1/public/media/member-pdf" } }) };
    await store.refreshPublicDetailFromApi(gateway, member.slug);
    expect(store.items).toEqual([member]);
    expect(store.detail).toMatchObject({ slug: member.slug, variant: { url: "/api/v1/public/media/member-pdf" } });
    expect(gateway.resource).not.toHaveBeenCalled();
    expect(gateway.resourceVersion).toHaveBeenCalledWith(member.slug, "v2");
    await store.refreshPublicFromApi({ resources: { listPublic: vi.fn().mockRejectedValue(new Error("RESOURCE_API_DOWN")) }, resource: vi.fn(), resourceVersion: vi.fn() });
    expect(store.items).toEqual([]);
    expect(store.apiError).toMatchObject({ message: "RESOURCE_API_DOWN" });
  });

  it("keeps an SSR-hydrated detail visible while the client refreshes the same slug", async () => {
    const store = useResourcesStore();
    const summary = { slug: "hydrated-pdf", title: "Hydrated PDF", summary: "Server detail", kind: "pdf", format: "pdf", versionLabel: "v1", access: "public" as const };
    store.items = [summary];
    store.detail = { ...summary, content: "", variant: { url: "/api/v1/public/media/hydrated-pdf" } };
    let resolveList!: (value: { items: typeof summary[] }) => void;
    const gateway = { resources: { listPublic: vi.fn(() => new Promise<{ items: typeof summary[] }>((resolve) => { resolveList = resolve; })) }, resource: vi.fn(), resourceVersion: vi.fn() };

    const refresh = store.refreshPublicDetailFromApi(gateway, summary.slug);
    expect(store.detail).toMatchObject({ slug: summary.slug, variant: { url: "/api/v1/public/media/hydrated-pdf" } });
    resolveList({ items: [summary] });
    gateway.resource.mockResolvedValue(store.detail);
    await refresh;
  });

  it("does not clear a same-slug hydrated detail before the page consumes its useAsyncData cache", () => {
    const detailPage = readFileSync("app/pages/resources/[slug].vue", "utf8");
    expect(detailPage).toContain("resourcesStore.detail?.slug !== slug");
    expect(detailPage).toContain("await useAsyncData(`public-resource-${slug}`");
  });

  it("uses the API resource store in production pages while keeping fixtures only behind the explicit Mock gateway", () => {
    const listPage = readFileSync("app/pages/resources.vue", "utf8");
    const detailPage = readFileSync("app/pages/resources/[slug].vue", "utf8");
    expect(listPage).toContain("useResourcesStore");
    expect(listPage).toContain("useContentGateway");
    expect(detailPage).toContain("useResourcesStore");
    expect(detailPage).toContain("useContentGateway");
    expect(listPage).not.toContain("localStorage");
    expect(detailPage).not.toContain("localStorage");
  });

  it("awaits production list SSR and keeps detail errors, related links, and file actions API-safe", () => {
    const listPage = readFileSync("app/pages/resources.vue", "utf8");
    const detailPage = readFileSync("app/pages/resources/[slug].vue", "utf8");
    expect(listPage).toContain("await useAsyncData(`public-resources`");
    expect(listPage).toContain("resourceData.value");
    expect(detailPage).toContain("createError({ statusCode: 404");
    expect(detailPage).toContain("detailData.value");
    expect(detailPage).toContain("gateway ? [] : PUBLIC_RESOURCES");
    expect(detailPage).toContain("!gateway && resource.kind === 'external'");
  });

  it("normalizes the API resource contract for the existing public detail view", () => {
    const detailPage = readFileSync("app/pages/resources/[slug].vue", "utf8");
    expect(detailPage).toContain("resourceContents");
    expect(detailPage).toContain("versionLabel");
    expect(detailPage).toContain("updatedAt");
  });
});
