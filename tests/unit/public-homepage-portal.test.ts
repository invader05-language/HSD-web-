import { describe, expect, it } from "vitest";
import { projectPublicPortal, resolvePublicPortalVisual } from "../../app/utils/public-homepage-portal";

describe("public homepage portal projection", () => {
  it("projects resolved public portal entries without using legacy seed slugs", () => {
    const result = projectPublicPortal({
      publishedAt: "2026-08-16T00:00:00.000Z",
      entries: [
        { slot: "projects", position: 1, content: { slug: "real-project", title: "Real project", description: "Project summary", cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Cover", aspect: "wide", sortOrder: 0, url: "/project-cover" } } },
        { slot: "gallery", position: 1, content: { slug: "real-gallery", title: "Real gallery", description: "Gallery summary", cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Cover", aspect: "wide", sortOrder: 0, url: "/gallery-cover" } } },
        { slot: "activities", position: 1, content: { slug: "real-activity", title: "Real activity", summary: "Activity summary", date: "2026-08-20", cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Cover", aspect: "wide", sortOrder: 0, url: "/activity-cover" } } },
      ],
    });

    expect(result.slots.projects.map((item) => item.sourceId)).toEqual(["real-project"]);
    expect(result.slots.gallery.map((item) => item.sourceId)).toEqual(["real-gallery"]);
    expect(result.slots.activities[0]).toMatchObject({
      sourceId: "real-activity",
      eventAt: "2026-08-20T00:00:00.000Z",
      media: { role: "cover", kind: "image", url: "/activity-cover" },
    });
    expect(result.slots.gallery[0]?.media).toMatchObject({ url: "/gallery-cover" });
    expect(result.slots.projects.map((item) => item.sourceId)).not.toContain("annual-activity-record");
  });

  it("keeps empty public portal slots empty instead of restoring frontend fixtures", () => {
    const result = projectPublicPortal({ publishedAt: null, entries: [] });

    expect(result.slots.projects).toEqual([]);
    expect(result.slots.gallery).toEqual([]);
    expect(result.slots.activities).toEqual([]);
  });

  it("converts a published backend visual into media so it takes precedence over defaults", () => {
    const visual = resolvePublicPortalVisual("home", {
      url: "/uploads/home-real.webp",
      thumbnailUrl: "/uploads/home-real-thumb.webp",
      alt: "正式门户主视觉",
    });

    expect(visual).toMatchObject({
      alt: "正式门户主视觉",
      media: {
        id: "public-portal-visual-home",
        role: "cover",
        kind: "image",
        url: "/uploads/home-real.webp",
        thumbnailUrl: "/uploads/home-real-thumb.webp",
        status: "ready",
      },
    });
  });

  it("ignores malformed public visuals so the caller can use the default asset", () => {
    expect(resolvePublicPortalVisual("home", { url: "/missing-alt.webp" })).toEqual({ alt: "" });
  });
});
