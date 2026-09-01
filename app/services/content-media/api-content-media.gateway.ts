import { createHsdApiClient, type ApiRequest, type ApiTransport, type ErrorResponse } from "../../../packages/api-client/src";
import type { ContentMediaAttachment, ContentMediaAspect, ContentMediaRole } from "../../types/content-media";
import { sha256File } from "../../utils/sha256";

export interface ContentMediaUploadOwner {
  centerId: string;
  ownerType: "content" | "portal_home" | "portal_join" | "project" | "activity" | "gallery";
  ownerId: string;
  role: ContentMediaRole;
  sortOrder: number;
  title?: string;
  caption?: string;
  alt?: string;
  aspect?: ContentMediaAspect;
}

export interface ApiContentMediaGatewayOptions {
  apiBase: string;
  fetcher?: typeof globalThis.fetch;
  readCookie?: (name: string) => string | undefined;
  checksumSha256?: (file: File) => Promise<string>;
  pollDelay?: (milliseconds: number) => Promise<void>;
  createRequestId?: () => string;
}

export interface ContentMediaGateway {
  upload(file: File, owner: ContentMediaUploadOwner): Promise<ContentMediaAttachment>;
  updateMetadata(attachment: ContentMediaAttachment): Promise<ContentMediaAttachment>;
}

export class ContentMediaApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly requestId?: string) {
    super(message);
    this.name = "ContentMediaApiError";
  }
}

const requestId = () => globalThis.crypto?.randomUUID?.() ?? `media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const readBrowserCookie = (name: string) => {
  if (typeof document === "undefined") return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
};
const isError = (value: unknown): value is ErrorResponse => Boolean(
  value && typeof value === "object" && typeof (value as ErrorResponse).code === "string"
  && typeof (value as ErrorResponse).message === "string",
);
const defaultChecksum = sha256File;
const title = (name: string) => name.replace(/\.[^/.]+$/, "").trim();
const usesAccessibilityMetadata = (ownerType: ContentMediaUploadOwner["ownerType"]) => ownerType !== "activity" && ownerType !== "gallery";

export function createApiContentMediaGateway(options: ApiContentMediaGatewayOptions): ContentMediaGateway {
  const apiBase = options.apiBase.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? globalThis.fetch;
  const readCookie = options.readCookie ?? readBrowserCookie;
  const createRequestId = options.createRequestId ?? requestId;
  const checksumSha256 = options.checksumSha256 ?? defaultChecksum;
  const pollDelay = options.pollDelay ?? delay;

  const transport: ApiTransport = async (request: ApiRequest) => {
    const headers: Record<string, string> = { "X-Request-ID": createRequestId() };
    if (request.method !== "GET") {
      const csrf = readCookie("hsd_csrf");
      if (!csrf) throw new ContentMediaApiError(403, "CONTENT_MEDIA_CSRF_TOKEN_MISSING", "Media request could not be verified");
      headers["Content-Type"] = "application/json";
      headers["X-CSRF-Token"] = decodeURIComponent(csrf);
    }
    const response = await fetcher(`${apiBase}${request.path}`, {
      method: request.method, credentials: "include", headers,
      ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new ContentMediaApiError(
      response.status, isError(payload) ? payload.code : "CONTENT_MEDIA_API_REQUEST_FAILED",
      isError(payload) ? payload.message : "Media API request failed", isError(payload) ? payload.requestId : undefined,
    );
    return payload;
  };
  const client = createHsdApiClient(transport);

  return {
    async upload(file, owner) {
      let checksum: string;
      try {
        checksum = await checksumSha256(file);
      } catch (error) {
        throw new ContentMediaApiError(422, "CONTENT_MEDIA_CHECKSUM_FAILED", error instanceof Error ? error.message : "Unable to calculate file checksum");
      }
      const kind = file.type.startsWith("image/") ? "image" as const : "video" as const;
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm";
      const intent = await client.uploads.createIntent({
        expectedVersion: 0, centerId: owner.centerId, fileName: file.name,
        mimeType, byteSize: file.size, checksumSha256: checksum, kind,
      });
      if (!intent.upload?.url) throw new ContentMediaApiError(503, "UPLOAD_DESTINATION_MISSING", "Upload destination is unavailable");
      let storageResponse: Response;
      try {
        storageResponse = await fetcher(intent.upload.url, {
          method: "PUT", body: file, headers: intent.upload.headers,
        });
      } catch (error) {
        throw new ContentMediaApiError(503, "DIRECT_UPLOAD_NETWORK_FAILED", error instanceof Error ? error.message : "Direct upload could not reach storage");
      }
      if (!storageResponse.ok) throw new ContentMediaApiError(storageResponse.status, "DIRECT_UPLOAD_FAILED", "Direct upload failed");
      const completed = await client.uploads.complete(intent.id, {
        expectedVersion: intent.version,
        parts: [{ partNumber: 1, etag: storageResponse.headers.get("etag") ?? "direct-upload" }],
      });
      let current = completed;
      for (let attempt = 0; current.status !== "ready" && current.status !== "failed" && attempt < 60; attempt += 1) {
        await pollDelay(500);
        current = await client.uploads.status(intent.id);
      }
      if (current.status !== "ready") throw new ContentMediaApiError(422, typeof current.failureCode === "string" ? current.failureCode : "MEDIA_PROCESSING_FAILED", "Media processing failed");
      // Always perform one authoritative read after completion; the completion response may race the processor commit.
      current = await client.uploads.status(intent.id);
      if (current.status !== "ready") throw new ContentMediaApiError(422, typeof current.failureCode === "string" ? current.failureCode : "MEDIA_PROCESSING_FAILED", "Media processing failed");
      const attachment = await client.media.bind({
        uploadId: current.id, expectedUploadVersion: current.version,
        ownerType: owner.ownerType, ownerId: owner.ownerId, centerId: owner.centerId,
        role: owner.role, kind, title: owner.title ?? (owner.role === "cover" ? "" : title(file.name)),
        caption: owner.caption ?? "", ...(usesAccessibilityMetadata(owner.ownerType) ? { alt: owner.alt ?? "" } : {}), aspect: owner.aspect ?? "landscape",
        sortOrder: owner.sortOrder,
      });
      return {
        id: attachment.id, mediaId: current.id, serverOwned: true, version: attachment.version, role: attachment.role as ContentMediaRole,
        kind: attachment.kind as "image" | "video", title: attachment.title, caption: attachment.caption,
        ...(typeof attachment.alt === "string" ? { alt: attachment.alt } : {}), aspect: attachment.aspect as ContentMediaAspect, sortOrder: attachment.sortOrder,
        status: attachment.status as "ready", url: attachment.url,
        ...(attachment.thumbnailUrl ? { thumbnailUrl: attachment.thumbnailUrl } : {}),
      };
    },
    async updateMetadata(value) {
      if (!value.version || value.version < 1) throw new ContentMediaApiError(409, "MEDIA_ATTACHMENT_VERSION_REQUIRED", "Media attachment version is required");
      const updated = await client.media.update(value.id, {
        expectedVersion: value.version,
        title: value.title,
        caption: value.caption,
        ...(value.alt !== undefined ? { alt: value.alt } : {}),
        aspect: value.aspect,
        sortOrder: value.sortOrder,
      });
      return {
        id: updated.id,
        mediaId: value.mediaId,
        serverOwned: true,
        version: updated.version,
        role: updated.role as ContentMediaRole,
        kind: updated.kind as "image" | "video",
        title: updated.title,
        caption: updated.caption,
        ...(typeof updated.alt === "string" ? { alt: updated.alt } : {}),
        aspect: updated.aspect as ContentMediaAspect,
        sortOrder: updated.sortOrder,
        status: updated.status as "ready" | "failed",
        url: updated.url,
        ...(updated.thumbnailUrl ? { thumbnailUrl: updated.thumbnailUrl } : {}),
      };
    },
  };
}
