import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePortalConfigStore } from "../../app/stores/portal-config";
import { useSessionStore } from "../../app/stores/session";

function signInWithPortalCapabilities() {
  useSessionStore().applyApiSession({
    account: { id: "owner-account", adminLevel: "OWNER", adminCenterId: null, capabilities: ["portal.configure", "portal.publish"] },
    person: { id: "owner-person", name: "Portal owner", status: "FORMAL_MEMBER" },
    mustChangePassword: false,
  });
}

const apiDraft = {
  version: 7,
  entries: [{
    slot: "news" as const,
    position: 1,
    content: {
      slug: "api-news",
      kind: "article" as const,
      title: "API news",
      summary: "From the authoritative API",
      tag: null,
      expiresAt: null,
      blocks: [],
      publishedAt: "2026-08-12T00:00:00.000Z",
    },
  }],
  visuals: { home: { attachmentId: "11111111-1111-4111-8111-111111111111", alt: "API visual" } },
};

describe("portal configuration production API mode", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    setActivePinia(createPinia());
  });

  it("loads, previews, saves, and publishes from the API without reading or writing stale local storage", async () => {
    localStorage.setItem("baiyun-hsd.portal-config", JSON.stringify({ draftConfig: { slots: { news: [{ sourceId: "stale-local" }] } } }));
    const getItem = vi.spyOn(localStorage, "getItem");
    const setItem = vi.spyOn(localStorage, "setItem");
    const gateway = {
      portal: {
        draft: vi.fn().mockResolvedValue(apiDraft),
        preview: vi.fn().mockResolvedValue(apiDraft),
        saveDraft: vi.fn().mockResolvedValue({ ...apiDraft, version: 8 }),
        publish: vi.fn().mockResolvedValue({ ...apiDraft, version: 9, publishedAt: "2026-08-12T01:00:00.000Z" }),
      },
    };
    const store = usePortalConfigStore();
    signInWithPortalCapabilities();

    await store.initializeForRuntime({ useMockApi: false }, gateway as never);
    expect(store.draftConfig.slots.news[0]?.sourceId).toBe("api-news");
    await expect(store.previewForRuntime({ useMockApi: false }, gateway as never)).resolves.toMatchObject({ revision: 7 });
    await store.saveDraftForRuntime({ useMockApi: false }, gateway as never, { slots: { news: [] } });
    await store.publishForRuntime({ useMockApi: false }, gateway as never, true);

    expect(gateway.portal.saveDraft).toHaveBeenCalledWith({ expectedVersion: 7, entries: [], visuals: { home: { attachmentId: "11111111-1111-4111-8111-111111111111", alt: "API visual" }, join: {} } });
    expect(gateway.portal.publish).toHaveBeenCalledWith({ expectedVersion: 8, confirmed: true });
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps stale local state out of production when an API request fails", async () => {
    localStorage.setItem("baiyun-hsd.portal-config", JSON.stringify({ version: 4, draftConfig: apiDraft, publishedConfig: apiDraft, auditRecords: [] }));
    const store = usePortalConfigStore();
    signInWithPortalCapabilities();
    const failingGateway = { portal: { draft: vi.fn().mockRejectedValue(Object.assign(new Error("Portal unavailable"), { code: "PORTAL_DOWN", status: 503 })) } };

    await expect(store.initializeForRuntime({ useMockApi: false }, failingGateway as never)).rejects.toThrow("Portal unavailable");
    expect(store.draftConfig.slots.news).toEqual([]);
    expect(store.requestError).toMatchObject({ code: "PORTAL_DOWN", status: 503 });
    expect(store.apiModeActive).toBe(true);
  });

  it("requires portal.configure for draft and preview API commands and portal.publish for publication", async () => {
    const store = usePortalConfigStore();
    signInWithPortalCapabilities();
    await expect(store.initializeForRuntime({ useMockApi: false }, undefined)).rejects.toThrow("PORTAL_CONFIG_API_UNAVAILABLE");
    await expect(store.saveDraftForRuntime({ useMockApi: false }, undefined, { slots: { news: [] } })).rejects.toThrow("PORTAL_CONFIG_API_UNAVAILABLE");
    await expect(store.previewForRuntime({ useMockApi: false }, undefined)).rejects.toThrow("PORTAL_CONFIG_API_UNAVAILABLE");
    await expect(store.publishForRuntime({ useMockApi: false }, undefined, true)).rejects.toThrow("PORTAL_CONFIG_API_UNAVAILABLE");
    expect(store.requestError).toMatchObject({ code: "PORTAL_CONFIG_API_UNAVAILABLE" });
  });

  it("does not issue portal draft requests for a center administrator without portal.configure", async () => {
    const store = usePortalConfigStore();
    useSessionStore().applyApiSession({
      account: { id: "center-admin", adminLevel: "ADMIN", adminCenterId: "center-1", capabilities: ["content.create"] },
      person: { id: "admin-person", name: "Center admin", status: "FORMAL_MEMBER" },
      mustChangePassword: false,
    });
    const gateway = { portal: { draft: vi.fn(), preview: vi.fn(), saveDraft: vi.fn(), publish: vi.fn() } };

    await expect(store.initializeForRuntime({ useMockApi: false }, gateway as never)).rejects.toThrow("PORTAL_CONTENT_PERMISSION_REQUIRED");
    await expect(store.previewForRuntime({ useMockApi: false }, gateway as never)).rejects.toThrow("PORTAL_CONTENT_PERMISSION_REQUIRED");
    await expect(store.saveDraftForRuntime({ useMockApi: false }, gateway as never, { slots: { news: [] } })).rejects.toThrow("PORTAL_CONTENT_PERMISSION_REQUIRED");
    await expect(store.publishForRuntime({ useMockApi: false }, gateway as never, true)).rejects.toThrow("PORTAL_CONTENT_PERMISSION_REQUIRED");
    expect(gateway.portal.draft).not.toHaveBeenCalled();
    expect(gateway.portal.preview).not.toHaveBeenCalled();
    expect(gateway.portal.saveDraft).not.toHaveBeenCalled();
    expect(gateway.portal.publish).not.toHaveBeenCalled();
  });

  it("rejects the legacy synchronous persistence path in production instead of writing local storage", () => {
    const store = usePortalConfigStore();
    signInWithPortalCapabilities();
    const setItem = vi.spyOn(localStorage, "setItem");

    expect(() => store.saveDraft({ slots: { news: [] } })).toThrow("PORTAL_CONFIG_API_REQUIRED");
    expect(() => store.persist()).toThrow("PORTAL_CONFIG_API_REQUIRED");
    expect(setItem).not.toHaveBeenCalled();
  });
});
