import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useGalleryStore } from "../../app/stores/gallery";
import { useSessionStore } from "../../app/stores/session";
import { usePortalCatalog } from "../../app/composables/usePortalCatalog";

const NOW = new Date("2026-08-06T09:00:00.000Z");

function galleryInput(overrides: Record<string, unknown> = {}) {
  return {
    slug: "new-media-gallery",
    title: "新媒体作品集",
    category: "活动摄影" as const,
    year: "2026",
    summary: "记录新媒体中心的活动影像与成员协作。",
    team: "新媒体中心 · 摄影组",
    ownerCenterId: "new-media",
    assets: [{ id: "asset-recruitment-hero", title: "主视觉", caption: "活动主视觉", alt: "活动主视觉", aspect: "wide" as const, assetId: "asset-recruitment-hero" }],
    ...overrides,
  };
}

describe("gallery publishing workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("publishes new albums and keeps edits private until republish", () => {
    useSessionStore().signIn("media-admin", { requireAdmin: true });
    const store = useGalleryStore();
    const created = store.createDraft(galleryInput(), NOW);
    expect(store.getPublicBySlug(created.slug)).toBeUndefined();

    store.publish(created.id, NOW);
    expect(store.getPublicBySlug(created.slug)).toMatchObject({ title: "新媒体作品集" });
    store.updateDraft(created.id, { title: "新媒体作品集（更新版）" }, NOW);
    expect(store.getPublicBySlug(created.slug)).toMatchObject({ title: "新媒体作品集" });
    store.publish(created.id, NOW);
    expect(store.getPublicBySlug(created.slug)).toMatchObject({ title: "新媒体作品集（更新版）" });
    expect(usePortalCatalog().find((item) => item.sourceId === created.slug)).toMatchObject({
      entityType: "gallery",
      to: `/gallery/${created.slug}`,
      available: true,
    });
  });

  it("scopes center administrators and validates approved asset references", () => {
    useSessionStore().signIn("media-admin", { requireAdmin: true });
    const store = useGalleryStore();
    const created = store.createDraft(galleryInput(), NOW);
    expect(() => store.updateDraft(created.id, { ownerCenterId: "baize-development" }, NOW)).toThrow("GALLERY_CENTER_SCOPE_REQUIRED");
    expect(() => store.createDraft(galleryInput({ slug: "pending-asset", assets: [{ id: "pending-upload", title: "待处理", caption: "素材处理中", alt: "待处理素材", aspect: "wide", role: "detail" as const, kind: "image" as const, sortOrder: 0, status: "processing" as const }] }), NOW)).not.toThrow();
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    expect(() => store.publish(created.id, NOW)).not.toThrow();
  });

  it("hides unpublished albums from the public portal", () => {
    const store = useGalleryStore();
    const album = store.getPublicBySlug("annual-activity-record");
    expect(album).toBeDefined();
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    store.unpublish(album!.id, "内容调整", NOW);
    expect(store.getPublicBySlug(album!.slug)).toBeUndefined();
  });

  it("rehydrates the published album snapshot after a new Pinia instance", () => {
    useSessionStore().signIn("media-admin", { requireAdmin: true });
    const store = useGalleryStore();
    const created = store.createDraft(galleryInput({ slug: "rehydrated-gallery" }), NOW);
    store.publish(created.id, NOW);

    setActivePinia(createPinia());
    expect(useGalleryStore().getPublicBySlug("rehydrated-gallery")).toMatchObject({ title: "新媒体作品集" });
  });

  it("rejects publishing when a direct-upload detail attachment is not fully reviewed", () => {
    useSessionStore().signIn("media-admin", { requireAdmin: true });
    const store = useGalleryStore();
    const created = store.createDraft(galleryInput({
      slug: "unreviewed-gallery",
      assets: [{
        id: "uploaded-1",
        title: "现场照片",
        caption: "",
        alt: "现场照片",
        aspect: "landscape" as const,
        status: "ready",
        role: "detail" as const,
        kind: "image" as const,
        sortOrder: 0,
      }],
    }), NOW);

    expect(() => store.publish(created.id, NOW)).toThrow("GALLERY_ASSET_METADATA_REQUIRED");
  });
});
