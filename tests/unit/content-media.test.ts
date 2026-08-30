import { describe, expect, it } from "vitest";
import {
  detectContentMediaAspect,
  isActivityContentMediaAttachmentComplete,
  isContentMediaAttachmentComplete,
  validateContentMediaFile,
} from "../../app/utils/content-media";
import type { ContentMediaAttachment } from "../../app/types/content-media";
import { createApiContentMediaGateway } from "../../app/services/content-media/api-content-media.gateway";
import { resolveApiMediaUrl } from "../../app/utils/media-url";
import { vi } from "vitest";

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
  it("derives the attachment direction from real image dimensions", async () => {
    vi.stubGlobal("createImageBitmap", async () => ({ width: 2400, height: 1137, close: vi.fn() }));
    await expect(detectContentMediaAspect(new File(["image"], "wide.png", { type: "image/png" }))).resolves.toBe("wide");
    vi.unstubAllGlobals();
  });

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

  it("uses the activity metadata profile for detail media", () => {
    expect(isActivityContentMediaAttachmentComplete(attachment({ title: "", caption: "" }))).toBe(true);
    expect(isActivityContentMediaAttachmentComplete(attachment({ title: "", caption: "", alt: "" }))).toBe(false);
    expect(isActivityContentMediaAttachmentComplete(attachment({ title: "", caption: "", role: "cover", kind: "video" }))).toBe(false);
  });

  it("uses direct-upload generated operations in production and never creates a localBlobId", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
      status, headers: { "content-type": "application/json" },
    });
    const responses = [
      json({
        id: "11111111-1111-4111-8111-111111111111", centerId: "22222222-2222-4222-8222-222222222222",
        createdBy: { id: "55555555-5555-4555-8555-555555555555", username: "owner", displayName: "Owner" },
        fileName: "photo.png", mimeType: "image/png", byteSize: 3,
        kind: "image", status: "uploading", version: 1, expiresAt: "2030-01-01T00:00:00.000Z",
        failureCode: null, completedAt: null, createdAt: "2029-12-31T00:00:00.000Z", updatedAt: "2029-12-31T00:00:00.000Z",
        upload: { url: "https://storage.test/direct", headers: { "x-upload": "proof" } },
      }, 201),
      new Response(null, { status: 200 }),
      json({
        id: "11111111-1111-4111-8111-111111111111", centerId: "22222222-2222-4222-8222-222222222222",
        createdBy: { id: "55555555-5555-4555-8555-555555555555", username: "owner", displayName: "Owner" },
        fileName: "photo.png", mimeType: "image/png", byteSize: 3,
        kind: "image", status: "ready", version: 2, expiresAt: "2030-01-01T00:00:00.000Z", failureCode: null,
        completedAt: "2029-12-31T00:01:00.000Z", createdAt: "2029-12-31T00:00:00.000Z", updatedAt: "2029-12-31T00:01:00.000Z",
      }),
      json({
        id: "11111111-1111-4111-8111-111111111111", centerId: "22222222-2222-4222-8222-222222222222",
        createdBy: { id: "55555555-5555-4555-8555-555555555555", username: "owner", displayName: "Owner" },
        fileName: "photo.png", mimeType: "image/png", byteSize: 3,
        kind: "image", status: "ready", version: 2, expiresAt: "2030-01-01T00:00:00.000Z", failureCode: null,
        completedAt: "2029-12-31T00:01:00.000Z", createdAt: "2029-12-31T00:00:00.000Z", updatedAt: "2029-12-31T00:01:00.000Z",
      }),
      json({
        id: "33333333-3333-4333-8333-333333333333", ownerType: "content",
        ownerId: "44444444-4444-4444-8444-444444444444", centerId: "22222222-2222-4222-8222-222222222222",
        role: "detail", kind: "image", title: "photo", caption: "", alt: "", aspect: "landscape",
        sortOrder: 0, status: "ready", version: 1, uploadVersion: 3,
        url: "/api/v1/admin/uploads/11111111-1111-4111-8111-111111111111/preview",
        thumbnailUrl: "/api/v1/admin/uploads/11111111-1111-4111-8111-111111111111/preview",
      }, 201),
    ];
    const gateway = createApiContentMediaGateway({
      apiBase: "https://api.test",
      readCookie: () => "csrf-proof",
      checksumSha256: async () => "a".repeat(64),
      pollDelay: async () => undefined,
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        const response = responses.shift();
        if (!response) throw new Error("unexpected request");
        return response;
      },
    });

    const result = await gateway.upload(new File(["png"], "photo.png", { type: "image/png" }), {
      centerId: "22222222-2222-4222-8222-222222222222",
      ownerType: "content", ownerId: "44444444-4444-4444-8444-444444444444",
      role: "detail", sortOrder: 0,
    });

    expect(result).toMatchObject({
      id: "33333333-3333-4333-8333-333333333333", mediaId: "11111111-1111-4111-8111-111111111111",
      status: "ready", url: "/api/v1/admin/uploads/11111111-1111-4111-8111-111111111111/preview",
    });
    expect(result).not.toHaveProperty("localBlobId");
    expect(requests.map((request) => [request.init?.method, request.url])).toEqual([
      ["POST", "https://api.test/api/v1/admin/uploads/intents"],
      ["PUT", "https://storage.test/direct"],
      ["POST", "https://api.test/api/v1/admin/uploads/11111111-1111-4111-8111-111111111111/complete"],
      ["GET", "https://api.test/api/v1/admin/uploads/11111111-1111-4111-8111-111111111111"],
      ["POST", "https://api.test/api/v1/admin/media/attachments"],
    ]);
  });

  it("resolves backend-relative public media URLs against the configured API origin", () => {
    expect(resolveApiMediaUrl("/api/v1/public/media/token", "http://127.0.0.1:3001")).toBe("http://127.0.0.1:3001/api/v1/public/media/token");
    expect(resolveApiMediaUrl("https://cdn.example/media.jpg", "http://127.0.0.1:3001")).toBe("https://cdn.example/media.jpg");
    expect(resolveApiMediaUrl("/assets/mock.jpg", "http://127.0.0.1:3001")).toBe("/assets/mock.jpg");
    expect(resolveApiMediaUrl("/api/v1/public/media/token", "")).toBe("/api/v1/public/media/token");
  });

  it("persists reviewed metadata with the attachment optimistic version", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const gateway = createApiContentMediaGateway({
      apiBase: "https://api.test",
      readCookie: () => "csrf-proof",
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response(JSON.stringify({
          id: "33333333-3333-4333-8333-333333333333", ownerType: "gallery", ownerId: "gallery-1",
          centerId: "22222222-2222-4222-8222-222222222222", role: "detail", kind: "image",
          title: "Updated", caption: "Updated caption", alt: "Updated alt", aspect: "wide", sortOrder: 2,
          status: "ready", version: 2, uploadVersion: 3, url: "/api/v1/admin/uploads/upload-1/preview",
          thumbnailUrl: "/api/v1/admin/uploads/upload-1/preview",
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    const result = await gateway.updateMetadata(attachment({
      id: "33333333-3333-4333-8333-333333333333", version: 1, serverOwned: true,
    }));

    expect(result).toMatchObject({ title: "Updated", alt: "Updated alt", aspect: "wide", sortOrder: 2, version: 2, serverOwned: true });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.test/api/v1/admin/media/attachments/33333333-3333-4333-8333-333333333333");
    expect(requests[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(String(requests[0]?.init?.body))).toMatchObject({ expectedVersion: 1, title: attachment().title, alt: attachment().alt, sortOrder: 0 });
  });
});
