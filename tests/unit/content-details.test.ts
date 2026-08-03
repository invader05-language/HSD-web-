import { describe, expect, it } from "vitest";
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
    expect(GALLERY_ALBUMS.every((item) => item.to === `/gallery/${item.slug}`)).toBe(true);
    expect(album?.assets).toHaveLength(18);
    expect(getGalleryBatch(album!, 12)).toHaveLength(12);
    expect(findGalleryAlbum("missing")).toBeUndefined();
  });
});
