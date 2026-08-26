import { describe, expect, it, vi } from "vitest";
import { createApiMemberAvatarGateway } from "../../app/services/member-avatar/api-member-avatar.gateway";

describe("member avatar gateway", () => {
  it("creates an intent, uploads the file and completes it for the current member", async () => {
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "upload-1", centerId: "center-1", fileName: "avatar.png", mimeType: "image/png", byteSize: file.size,
        kind: "image", status: "uploading", version: 1, expiresAt: "2026-08-26T00:00:00.000Z", failureCode: null,
        completedAt: null, createdAt: "2026-08-26T00:00:00.000Z", updatedAt: "2026-08-26T00:00:00.000Z",
        createdBy: { id: "account-1", username: "member", displayName: "成员" },
        upload: { url: "https://storage.example/upload-1", headers: { "Content-Type": "image/png" } },
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { etag: "etag-1" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "upload-1", centerId: "center-1", fileName: "avatar.png", mimeType: "image/png", byteSize: file.size,
        kind: "image", status: "ready", version: 2, expiresAt: "2026-08-26T00:00:00.000Z", failureCode: null,
        completedAt: "2026-08-26T00:00:01.000Z", createdAt: "2026-08-26T00:00:00.000Z", updatedAt: "2026-08-26T00:00:01.000Z",
        createdBy: { id: "account-1", username: "member", displayName: "成员" }, assetId: "asset-1",
      }), { status: 200 }));
    const gateway = createApiMemberAvatarGateway({
      apiBase: "https://hsd.example",
      fetcher,
      readCookie: () => "csrf-token",
      checksumSha256: async () => "a".repeat(64),
      createRequestId: () => "request-1",
    });

    const result = await gateway.upload(file, "center-1");

    expect(result.assetId).toBe("asset-1");
    expect(fetcher).toHaveBeenNthCalledWith(1, "https://hsd.example/api/v1/members/me/avatar/uploads/intents", expect.objectContaining({
      method: "POST", credentials: "include", body: expect.stringContaining('"centerId":"center-1"'),
    }));
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://storage.example/upload-1", expect.objectContaining({ method: "PUT", body: file }));
    expect(fetcher).toHaveBeenNthCalledWith(3, "https://hsd.example/api/v1/members/me/avatar/uploads/upload-1/complete", expect.objectContaining({
      method: "POST", body: expect.stringContaining('"expectedVersion":1'),
    }));
  });

  it("removes the current avatar through the member endpoint", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: "member-1" }), { status: 200 }));
    const gateway = createApiMemberAvatarGateway({ apiBase: "https://hsd.example", fetcher, readCookie: () => "csrf-token" });

    await gateway.remove();

    expect(fetcher).toHaveBeenCalledWith("https://hsd.example/api/v1/members/me/avatar", expect.objectContaining({
      method: "DELETE", credentials: "include", headers: expect.objectContaining({ "X-CSRF-Token": "csrf-token" }),
    }));
  });
});
