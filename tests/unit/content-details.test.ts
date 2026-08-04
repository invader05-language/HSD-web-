import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ACTIVITY_DETAILS } from "../../app/data/activities";
import { usePortalCatalog } from "../../app/composables/usePortalCatalog";
import { usePortalContentStore } from "../../app/stores/portal-content";
import { useSessionStore } from "../../app/stores/session";
import {
  GALLERY_ALBUMS,
  findGalleryAlbum,
  getGalleryBatch
} from "../../app/data/gallery";
import {
  PUBLIC_RESOURCES,
  findResource,
  resourcePrimaryAction
} from "../../app/data/resources";

describe("public resource details", () => {
  it("publishes one typed detail route for every resource", () => {
    expect(PUBLIC_RESOURCES.map((item) => item.kind)).toEqual([
      "article",
      "article",
      "docx",
      "pdf",
      "archive",
      "external"
    ]);
    expect(PUBLIC_RESOURCES.every((item) => item.to === `/resources/${item.slug}`)).toBe(true);
  });

  it("keeps file actions honest while real files are not connected", () => {
    const disconnectedFiles = PUBLIC_RESOURCES.filter((resource) =>
      ["pdf", "docx", "archive"].includes(resource.kind)
    );

    expect(disconnectedFiles).toHaveLength(3);
    for (const resource of disconnectedFiles) {
      expect(resource.status).toBe("not-connected");
      expect(resourcePrimaryAction(resource)).toBe("文件暂未接入");
      expect(resourcePrimaryAction(resource)).not.toContain("下载");
    }
    expect(findResource("missing")).toBeUndefined();
  });
});

describe("gallery album details", () => {
  it("publishes gallery albums with twelve-item incremental batches", () => {
    const album = findGalleryAlbum("annual-activity-record");
    expect(GALLERY_ALBUMS).toHaveLength(6);
    expect(album?.assets).toHaveLength(18);
    expect(getGalleryBatch(album!, 12)).toHaveLength(12);
    expect(findGalleryAlbum("missing")).toBeUndefined();
  });
});

describe("published activity and update details", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("exposes stable public detail links from the read-only activity adapter", () => {
    expect(ACTIVITY_DETAILS.map((activity) => activity.to)).toEqual(
      ACTIVITY_DETAILS.map((activity) => `/activities/${activity.slug}`),
    );
    expect(ACTIVITY_DETAILS.every((activity) => activity.available)).toBe(true);
  });

  it("projects published articles and notices without draft or unpublished records", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const draft = store.createDraft({
      kind: "article",
      title: "仍在编辑的新闻",
      summary: "不应出现在用户端。",
      slug: "draft-news",
      target: { type: "internal-route", value: "/updates/draft-news" },
    }, new Date("2026-08-04T08:00:00.000Z"));
    const unpublished = store.createDraft({
      kind: "notice",
      title: "已经下架的公告",
      summary: "不应出现在用户端。",
      slug: "withdrawn-notice",
      target: { type: "internal-route", value: "/updates/withdrawn-notice" },
    }, new Date("2026-08-04T08:10:00.000Z"));
    store.submitForReview(unpublished.id);
    store.approve(unpublished.id);
    store.publish(unpublished.id, true);
    store.unpublish(unpublished.id, "公告已结束");

    const publicUpdates = usePortalCatalog().filter((item) =>
      item.entityType === "article" || item.entityType === "notice"
    );

    expect(publicUpdates.map((item) => item.to)).toEqual([
      "/updates/project-team",
      "/updates/studio-hours",
    ]);
    expect(publicUpdates.some((item) => item.sourceId === draft.id)).toBe(false);
    expect(publicUpdates.some((item) => item.sourceId === unpublished.id)).toBe(false);
    expect(publicUpdates.every((item) => item.available)).toBe(true);
  });

  it("keeps each seeded update slug aligned with its public detail target", () => {
    const updates = usePortalContentStore().getPublicRecords().filter((record) =>
      record.kind === "article" || record.kind === "notice"
    );

    expect(updates.map((record) => `/updates/${record.slug}`)).toEqual(
      updates.map((record) => record.target.value),
    );
  });
});
