import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePortalConfigStore } from "../../app/stores/portal-config";
import { resolveHomepageSlots } from "../../app/composables/usePublishedPortal";
import type { PortalCatalogItem } from "../../app/types/portal-content";
import { useSessionStore } from "../../app/stores/session";

const catalog: PortalCatalogItem[] = [
  {
    entityType: "flash", sourceId: "expired", title: "过期快讯", summary: "", to: "/join",
    publishedAt: "2026-08-03T00:00:00.000Z", eligibleSlots: ["flash"], available: false,
  },
  {
    entityType: "flash", sourceId: "replacement", title: "补位快讯", summary: "", to: "/join",
    publishedAt: "2026-08-02T00:00:00.000Z", eligibleSlots: ["flash"], available: true,
  },
];

describe("portal configuration store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("keeps the published configuration intact when atomic validation fails", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalConfigStore();
    store.saveDraft({ slots: { flash: [{ entityType: "flash", sourceId: "replacement" }] } });
    store.publish(catalog, true);
    const publishedId = store.publishedConfig.slots.flash[0]?.sourceId;

    store.saveDraft({ slots: { flash: [{ entityType: "flash", sourceId: "missing" }] } });
    expect(() => store.publish(catalog, true)).toThrow("PORTAL_CONFIG_INVALID_REFERENCE");
    expect(store.publishedConfig.slots.flash[0]?.sourceId).toBe(publishedId);
  });

  it("uses the newest same-slot, same-type available item without changing the saved config", () => {
    const slots = resolveHomepageSlots({
      flash: [{ entityType: "flash", sourceId: "expired" }],
    }, catalog);

    expect(slots.flash[0]).toMatchObject({ sourceId: "replacement" });
    expect(slots.flash[0]?.fallbackFor).toBe("expired");
  });

  it("reserves later valid configured references before selecting an earlier fallback", () => {
    const newsCatalog: PortalCatalogItem[] = [
      { entityType: "article", sourceId: "invalid", title: "失效", summary: "", to: "/updates/invalid", publishedAt: "2026-08-04T00:00:00.000Z", eligibleSlots: ["news"], available: false },
      { entityType: "article", sourceId: "configured", title: "配置项", summary: "", to: "/updates/configured", publishedAt: "2026-08-03T00:00:00.000Z", eligibleSlots: ["news"], available: true },
      { entityType: "article", sourceId: "fallback", title: "补位项", summary: "", to: "/updates/fallback", publishedAt: "2026-08-02T00:00:00.000Z", eligibleSlots: ["news"], available: true },
    ];

    const slots = resolveHomepageSlots({ news: [
      { entityType: "article", sourceId: "invalid" },
      { entityType: "article", sourceId: "configured" },
    ] }, newsCatalog);

    expect(slots.news.map((item) => item.sourceId)).toEqual(["fallback", "configured"]);
  });

  it("restores schema-versioned draft and published configurations", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalConfigStore();
    store.saveDraft({ slots: { flash: [{ entityType: "flash", sourceId: "replacement" }] } });
    store.publish(catalog, true);

    setActivePinia(createPinia());
    const restored = usePortalConfigStore();

    expect(restored.draftConfig.slots.flash[0]?.sourceId).toBe("replacement");
    expect(restored.publishedConfig.slots.flash[0]?.sourceId).toBe("replacement");
  });

  it("discards malformed or version-mismatched portal configuration persistence", () => {
    localStorage.setItem("baiyun-hsd.portal-config", JSON.stringify({ version: 0 }));
    setActivePinia(createPinia());
    expect(usePortalConfigStore().draftConfig.slots.flash).toEqual([]);

    localStorage.setItem("baiyun-hsd.portal-config", JSON.stringify({
      version: 1,
      draftConfig: { revision: 1, updatedAt: "now", updatedBy: "admin", slots: { flash: [{}], news: [], projects: [], activities: [], gallery: [], resources: [] }, visuals: { home: { alt: "" }, join: { alt: "" } } },
      publishedConfig: { revision: 1, updatedAt: "now", updatedBy: "admin", slots: { flash: [], news: [], projects: [], activities: [], gallery: [], resources: [] }, visuals: { home: { alt: "" }, join: { alt: "" } } },
    }));
    setActivePinia(createPinia());
    expect(usePortalConfigStore().draftConfig.slots.flash).toEqual([]);
  });
});
