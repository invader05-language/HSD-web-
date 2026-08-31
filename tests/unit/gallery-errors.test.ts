import { describe, expect, it } from "vitest";
import { localizeGalleryError } from "../../app/utils/gallery-errors";

describe("gallery error messages", () => {
  it("maps publication and media failure codes to actionable Chinese messages", () => {
    expect(localizeGalleryError({ code: "GALLERY_COVER_REQUIRED", message: "Exactly one image cover is required" })).toBe("请先上传并选择一张图片封面。 ".trim());
    expect(localizeGalleryError({ code: "GALLERY_DETAILS_REQUIRED", message: "At least one detail attachment is required" })).toBe("请至少添加一项专题详情素材。 ".trim());
    expect(localizeGalleryError({ code: "MEDIA_NOT_READY", message: "Media is not ready" })).toBe("素材仍在处理中，请稍后再发布。 ".trim());
    expect(localizeGalleryError({ code: "GALLERY_VERSION_CONFLICT", message: "Gallery changed; refresh and retry" })).toBe("画廊专题已被其他管理员修改，请刷新后重试。 ".trim());
  });

  it("does not expose an internal uppercase error code as the only message", () => {
    expect(localizeGalleryError(new Error("GALLERY_API_REQUEST_FAILED"))).toBe("画廊服务暂时不可用，请稍后重试。 ".trim());
  });
});
