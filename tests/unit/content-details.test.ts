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
    expect(findResource("project-requirement-template")?.status).toBe("not-connected");
    expect(resourcePrimaryAction(findResource("project-requirement-template")!)).toBe("文件暂未接入");
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
