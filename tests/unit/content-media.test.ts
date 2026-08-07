import { describe, expect, it } from "vitest";
import {
  isContentMediaAttachmentComplete,
  validateContentMediaFile,
} from "../../app/utils/content-media";
import type { ContentMediaAttachment } from "../../app/types/content-media";

function attachment(overrides: Partial<ContentMediaAttachment> = {}): ContentMediaAttachment {
  return {
    id: "media-1",
    role: "detail",
    kind: "image",
    title: "现场照片",
    caption: "活动现场记录",
    alt: "成员在活动现场交流",
    aspect: "landscape",
    sortOrder: 0,
    status: "ready",
    ...overrides,
  };
}

describe("content media contract", () => {
  it("accepts supported image and video files but rejects documents", () => {
    expect(validateContentMediaFile(new File(["image"], "cover.png", { type: "image/png" }), "cover")).toBeUndefined();
    expect(validateContentMediaFile(new File(["video"], "clip.mp4", { type: "video/mp4" }), "collection")).toBeUndefined();
    expect(() => validateContentMediaFile(new File(["doc"], "brief.pdf", { type: "application/pdf" }), "collection")).toThrow("CONTENT_MEDIA_TYPE_UNSUPPORTED");
    expect(() => validateContentMediaFile(new File(["video"], "clip.mp4", { type: "video/mp4" }), "cover")).toThrow("CONTENT_MEDIA_COVER_IMAGE_REQUIRED");
  });

  it("requires review metadata before a detail attachment can be published", () => {
    expect(isContentMediaAttachmentComplete(attachment())).toBe(true);
    expect(isContentMediaAttachmentComplete(attachment({ caption: "" }))).toBe(false);
    expect(isContentMediaAttachmentComplete(attachment({ alt: "" }))).toBe(false);
    expect(isContentMediaAttachmentComplete(attachment({ status: "processing" }))).toBe(false);
  });

  it("allows a cover to omit detail-only fields while still requiring alt text", () => {
    expect(isContentMediaAttachmentComplete(attachment({ role: "cover", title: "", caption: "" }))).toBe(true);
    expect(isContentMediaAttachmentComplete(attachment({ role: "cover", title: "", caption: "", alt: "" }))).toBe(false);
  });
});
