import { beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({
  upload: vi.fn(),
  updateMetadata: vi.fn(),
}));

vi.mock("../../app/services/content-media/api-content-media.gateway", () => ({
  createApiContentMediaGateway: vi.fn(() => gateway),
}));

import { useContentMediaUpload } from "../../app/composables/useContentMediaUpload";

const owner = {
  centerId: "center-1",
  ownerType: "activity" as const,
  ownerId: "activity-1",
};

function stubImageDimensions(width: number, height: number) {
  vi.stubGlobal("createImageBitmap", async () => ({ width, height, close: vi.fn() }));
}

describe("content media upload aspect inference", () => {
  beforeEach(() => {
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.test", useMockApi: false } }));
    gateway.upload.mockResolvedValue({ id: "attachment-1", status: "ready" });
  });

  it.each([
    ["wide", 2400, 1137],
    ["landscape", 1600, 1200],
    ["portrait", 900, 1600],
  ] as const)("passes the detected %s aspect to the production gateway", async (expectedAspect, width, height) => {
    stubImageDimensions(width, height);
    const { upload } = useContentMediaUpload();

    await upload(new File(["image"], `${expectedAspect}.png`, { type: "image/png" }), "collection", 2, owner);

    expect(gateway.upload).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ ...owner, aspect: expectedAspect, role: "detail", sortOrder: 2 }),
    );
  });

  it("falls back to landscape when browser dimensions cannot be read", async () => {
    vi.stubGlobal("createImageBitmap", async () => { throw new Error("metadata unavailable"); });
    const { upload } = useContentMediaUpload();

    await upload(new File(["image"], "unknown.png", { type: "image/png" }), "cover", 0, owner);

    expect(gateway.upload).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ ...owner, aspect: "landscape", role: "cover", sortOrder: 0 }),
    );
  });
});
