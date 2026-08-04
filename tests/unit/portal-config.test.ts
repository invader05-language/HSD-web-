import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { readFileSync } from "node:fs";
import { usePortalConfigStore } from "../../app/stores/portal-config";
import { resolveHomepageSlots } from "../../app/composables/usePublishedPortal";
import * as publishedPortal from "../../app/composables/usePublishedPortal";
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
  {
    entityType: "article", sourceId: "news-a", title: "新闻 A", summary: "", to: "/updates/news-a",
    publishedAt: "2026-08-04T00:00:00.000Z", eligibleSlots: ["news"], available: true,
  },
  {
    entityType: "article", sourceId: "news-b", title: "新闻 B", summary: "", to: "/updates/news-b",
    publishedAt: "2026-08-03T00:00:00.000Z", eligibleSlots: ["news"], available: true,
  },
  {
    entityType: "article", sourceId: "news-unavailable", title: "失效新闻", summary: "", to: "/updates/news-unavailable",
    publishedAt: "2026-08-02T00:00:00.000Z", eligibleSlots: ["news"], available: false,
  },
];

function clearDefaultSlots(store: ReturnType<typeof usePortalConfigStore>) {
  store.saveDraft({
    slots: { projects: [], activities: [], gallery: [], resources: [] },
  });
}

describe("portal configuration store", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("keeps the published configuration intact when atomic validation fails", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalConfigStore();
    clearDefaultSlots(store);
    store.saveDraft({ slots: { flash: [{ entityType: "flash", sourceId: "replacement" }] } });
    store.publish(catalog, true);
    const publishedId = store.publishedConfig.slots.flash[0]?.sourceId;

    store.saveDraft({ slots: { flash: [{ entityType: "flash", sourceId: "missing" }] } });
    expect(() => store.publish(catalog, true)).toThrow("PORTAL_CONFIG_INVALID_REFERENCE");
    expect(store.publishedConfig.slots.flash[0]?.sourceId).toBe(publishedId);
  });

  it("keeps the published configuration intact when persistence fails", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalConfigStore();
    clearDefaultSlots(store);
    const previousPublished = JSON.parse(JSON.stringify(store.publishedConfig));

    store.saveDraft({ slots: { flash: [{ entityType: "flash", sourceId: "replacement" }] } });
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => store.publish(catalog, true)).toThrow("PORTAL_CONFIG_PERSISTENCE_FAILED");
    expect(store.publishedConfig).toEqual(previousPublished);
    expect(store.persistenceError).toBe("PORTAL_CONFIG_PERSISTENCE_FAILED");
    setItem.mockRestore();
  });

  it("replaces, removes, and reorders draft references without mutating the published configuration", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalConfigStore();

    store.replaceReference("news", 0, { entityType: "article", sourceId: "news-a" }, catalog);
    store.replaceReference("news", 1, { entityType: "article", sourceId: "news-b" }, catalog);
    store.moveReference("news", 1, "up");

    expect(store.preview().slots.news.map((reference) => reference.sourceId)).toEqual(["news-b", "news-a"]);
    expect(store.publishedConfig.slots.news).toEqual([]);

    store.removeReference("news", 1);
    expect(store.preview().slots.news.map((reference) => reference.sourceId)).toEqual(["news-b"]);
    expect(store.publishedConfig.slots.news).toEqual([]);
  });

  it("rejects unavailable, ineligible, duplicate, and over-capacity draft references", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalConfigStore();

    expect(() => store.replaceReference(
      "news",
      0,
      { entityType: "article", sourceId: "news-unavailable" },
      catalog,
    )).toThrow("PORTAL_CONFIG_INVALID_REFERENCE");
    expect(() => store.replaceReference(
      "projects",
      0,
      { entityType: "article", sourceId: "news-a" },
      catalog,
    )).toThrow("PORTAL_CONFIG_INVALID_REFERENCE");

    store.replaceReference("news", 0, { entityType: "article", sourceId: "news-a" }, catalog);
    expect(() => store.replaceReference(
      "news",
      1,
      { entityType: "article", sourceId: "news-a" },
      catalog,
    )).toThrow("PORTAL_CONFIG_INVALID_REFERENCE");
    expect(() => store.replaceReference(
      "news",
      3,
      { entityType: "article", sourceId: "news-b" },
      catalog,
    )).toThrow("PORTAL_CONFIG_INVALID_REFERENCE");
  });

  it("keeps draft preview isolated until an owner confirms full publication", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalConfigStore();
    clearDefaultSlots(store);
    store.replaceReference("news", 0, { entityType: "article", sourceId: "news-a" }, catalog);
    store.publish(catalog, true);

    store.replaceReference("news", 0, { entityType: "article", sourceId: "news-b" }, catalog);
    expect(store.preview().slots.news[0]?.sourceId).toBe("news-b");
    expect(store.publishedConfig.slots.news[0]?.sourceId).toBe("news-a");

    session.signOut();
    session.signIn("media-admin", { requireAdmin: true });
    expect(() => store.publish(catalog, true)).toThrow("PORTAL_CONTENT_PERMISSION_REQUIRED");
    expect(store.publishedConfig.slots.news[0]?.sourceId).toBe("news-a");

    session.signOut();
    session.signIn("admin-alliance", { requireAdmin: true });
    expect(() => store.publish(catalog, false)).toThrow("CONFIRMATION_REQUIRED");
    expect(store.publishedConfig.slots.news[0]?.sourceId).toBe("news-a");
    expect(store.publish(catalog, true).slots.news[0]?.sourceId).toBe("news-b");
  });

  it("rejects an invalid visual asset without partially publishing the draft", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalConfigStore();
    clearDefaultSlots(store);
    store.saveDraft({ visuals: { home: { assetId: "asset-salon", alt: "待审核素材" } } });

    expect(() => store.publish(catalog, true)).toThrow("PORTAL_CONFIG_INVALID_VISUAL");
    expect(store.publishedConfig.visuals.home.assetId).toBeUndefined();

    store.saveDraft({ visuals: { home: { assetId: "asset-recruitment-hero", alt: "已审核招新主视觉" } } });
    expect(store.publish(catalog, true).visuals.home.assetId).toBe("asset-recruitment-hero");
  });

  it("uses the newest same-slot, same-type available item without changing the saved config", () => {
    const slots = resolveHomepageSlots({
      flash: [{ entityType: "flash", sourceId: "expired" }],
    }, catalog);

    expect(slots.flash[0]).toMatchObject({ sourceId: "replacement" });
    expect(slots.flash[0]?.fallbackFor).toBe("expired");
  });

  it("reports fallback and empty runtime projections without crossing entity types", () => {
    expect(publishedPortal.resolveHomepageProjection).toBeTypeOf("function");
    const projection = publishedPortal.resolveHomepageProjection({
      flash: [{ entityType: "flash", sourceId: "expired" }],
      news: [{ entityType: "article", sourceId: "missing-article" }],
    }, [
      ...catalog.filter((item) => item.entityType === "flash"),
      {
        entityType: "notice", sourceId: "newer-notice", title: "公告", summary: "", to: "/updates/newer-notice",
        publishedAt: "2026-08-04T00:00:00.000Z", eligibleSlots: ["news"], available: true,
      },
    ]);

    expect(projection.slots.flash[0]).toMatchObject({ sourceId: "replacement", fallbackFor: "expired" });
    expect(projection.slots.news).toEqual([]);
    expect(projection.warnings).toEqual([
      { slot: "flash", sourceId: "expired", entityType: "flash", fallbackSourceId: "replacement", code: "fallback" },
      { slot: "news", sourceId: "missing-article", entityType: "article", code: "empty" },
    ]);
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
    clearDefaultSlots(store);
    store.saveDraft({ slots: { flash: [{ entityType: "flash", sourceId: "replacement" }] } });
    store.publish(catalog, true);

    setActivePinia(createPinia());
    const restored = usePortalConfigStore();

    expect(restored.draftConfig.slots.flash[0]?.sourceId).toBe("replacement");
    expect(restored.publishedConfig.slots.flash[0]?.sourceId).toBe("replacement");
  });

  it("starts with the approved project, activity, gallery, and resource references", () => {
    const store = usePortalConfigStore();

    expect(store.publishedConfig.slots.projects.map((reference) => reference.sourceId)).toEqual([
      "zhixun-xianfeng",
      "zhixue-linghang",
      "xiaobaiyun",
      "zhineng-banlv",
    ]);
    expect(store.publishedConfig.slots.activities.map((reference) => reference.sourceId)).toEqual([
      "harmonyos-salon",
      "project-camp",
      "media-story",
    ]);
    expect(store.publishedConfig.slots.gallery[0]?.sourceId).toBe("annual-activity-record");
    expect(store.publishedConfig.slots.resources.map((reference) => reference.sourceId)).toEqual([
      "harmonyos-getting-started",
      "project-requirement-template",
      "member-training-package",
    ]);
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

describe("portal configuration surfaces", () => {
  it("connects the merged administration workspace to catalog, draft, preview, and publication APIs", () => {
    const source = readFileSync("app/pages/admin/content/home.vue", "utf8");
    const legacySource = readFileSync("app/pages/admin/content/banners.vue", "utf8");

    expect(source).toContain("usePortalCatalog");
    expect(source).toContain("replaceReference");
    expect(source).toContain("moveReference");
    expect(source).toContain("removeReference");
    expect(source).toContain("页面主视觉");
    expect(source).toContain("确认整份发布");
    expect(legacySource).toContain('query: { view: "visuals" }');
    expect(legacySource).not.toContain("const banners");
  });

  it("renders every configurable homepage domain and published page visual", () => {
    const homeSource = readFileSync("app/pages/index.vue", "utf8");
    const joinSource = readFileSync("app/pages/join.vue", "utf8");
    const bannerSource = readFileSync("app/components/PageBanner.vue", "utf8");

    expect(homeSource).toContain("homepageSlots.projects");
    expect(homeSource).toContain("homepageSlots.activities");
    expect(homeSource).toContain("homepageSlots.gallery");
    expect(homeSource).toContain("homepageSlots.resources");
    expect(homeSource).toContain("config.visuals.home");
    expect(joinSource).toContain("config.visuals.join");
    expect(bannerSource).toContain("visual");
  });

  it("provides keyboard-complete tabs and focus-managed publication dialogs", () => {
    const source = readFileSync("app/pages/admin/content/home.vue", "utf8");

    expect(source).toContain('aria-controls="portal-panel-recommendations"');
    expect(source).toContain('aria-controls="portal-panel-visuals"');
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain("handleTabKeydown");
    expect(source).toContain('aria-labelledby="portal-preview-title"');
    expect(source).toContain('aria-labelledby="portal-publish-title"');
    expect(source).toContain("handleDialogKeydown");
    expect(source).toContain("restoreDialogFocus");
    expect(source).toContain("resolvePortalTabKey(activeView.value, event.key)");
  });

  it("keeps browser-local portal publications outside the SSR rendering contract", () => {
    const configSource = readFileSync("nuxt.config.ts", "utf8");

    expect(configSource).toContain('"/": { ssr: false }');
    expect(configSource).toContain('"/join/**": { ssr: false }');
    expect(configSource).not.toContain('"/": { ssr: true }');
    expect(configSource).not.toContain('"/join/**": { ssr: true }');
  });

  it("shows invalid current references and distinguishes publication failures", () => {
    const source = readFileSync("app/pages/admin/content/home.vue", "utf8");

    expect(source).toContain("currentReferenceIssue");
    expect(source).toContain("无效当前项");
    expect(source).toContain("PORTAL_CONFIG_PERSISTENCE_FAILED");
    expect(source).toContain("PORTAL_CONFIG_INVALID_VISUAL");
    expect(source).toContain("当前公开版本保持不变");
  });
});
