import type {
  ContentMediaAspect,
  ContentMediaAttachment,
  ContentMediaKind,
  ContentMediaRole,
} from "../types/content-media";

export const CONTENT_MEDIA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const CONTENT_MEDIA_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const CONTENT_MEDIA_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CONTENT_MEDIA_VIDEO_MAX_BYTES = 200 * 1024 * 1024;

function mediaId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getContentMediaKind(file: File): ContentMediaKind {
  if ((CONTENT_MEDIA_IMAGE_TYPES as readonly string[]).includes(file.type)) return "image";
  if ((CONTENT_MEDIA_VIDEO_TYPES as readonly string[]).includes(file.type)) return "video";
  throw new Error("CONTENT_MEDIA_TYPE_UNSUPPORTED");
}

export function validateContentMediaFile(file: File, mode: "cover" | "collection") {
  const kind = getContentMediaKind(file);
  if (mode === "cover" && kind !== "image") throw new Error("CONTENT_MEDIA_COVER_IMAGE_REQUIRED");
  const maxBytes = kind === "image" ? CONTENT_MEDIA_IMAGE_MAX_BYTES : CONTENT_MEDIA_VIDEO_MAX_BYTES;
  if (file.size > maxBytes) throw new Error("CONTENT_MEDIA_SIZE_EXCEEDED");
}

function titleFromFileName(name: string) {
  return name.replace(/\.[^/.]+$/, "").trim();
}

export function createContentMediaAttachment(
  file: File,
  role: ContentMediaRole,
  sortOrder = 0,
): ContentMediaAttachment {
  const kind = getContentMediaKind(file);
  return {
    id: mediaId("media"),
    localBlobId: mediaId("blob"),
    role,
    kind,
    title: role === "cover" ? "" : titleFromFileName(file.name),
    caption: "",
    alt: "",
    aspect: "landscape",
    sortOrder,
    status: "uploading",
  };
}

export function createLegacyContentMediaAttachment(assetId: string, alt: string, caption = ""): ContentMediaAttachment {
  return {
    id: `legacy-${assetId}`,
    legacyAssetId: assetId,
    role: "detail",
    kind: "image",
    title: assetId,
    caption: caption.trim() || "历史内容素材",
    alt: alt.trim(),
    aspect: "landscape",
    sortOrder: 0,
    status: "ready",
  };
}

export function isContentMediaAttachmentComplete(attachment: ContentMediaAttachment) {
  if (attachment.status !== "ready" || !attachment.alt?.trim()) return false;
  if (attachment.role === "cover") return attachment.kind === "image";
  return Boolean(attachment.title.trim() && attachment.caption.trim() && attachment.aspect);
}

export function isActivityContentMediaAttachmentComplete(attachment: ContentMediaAttachment) {
  if (attachment.status !== "ready") return false;
  if (attachment.role === "cover") return attachment.kind === "image";
  return attachment.role === "detail" && Boolean(attachment.aspect);
}

export function isGalleryContentMediaAttachmentComplete(attachment: ContentMediaAttachment) {
  if (attachment.status !== "ready") return false;
  if (attachment.role === "cover") return attachment.kind === "image";
  return attachment.role === "detail" && Boolean(attachment.aspect);
}

export function isRetainedServerContentMediaAttachment(attachment: ContentMediaAttachment) {
  return attachment.serverOwned === true && attachment.status === "processing" && !attachment.url && !attachment.thumbnailUrl && !attachment.localBlobId && !attachment.legacyAssetId;
}

export function normalizeContentMediaAttachments(
  attachments: readonly ContentMediaAttachment[],
  role?: ContentMediaRole,
) {
  return attachments.map((attachment, index) => ({
    ...attachment,
    role: role ?? attachment.role,
    sortOrder: index,
  }));
}

export function inferContentMediaAspect(width: number, height: number): ContentMediaAspect {
  if (!width || !height) return "landscape";
  const ratio = width / height;
  if (ratio >= 1.8) return "wide";
  if (ratio <= 0.8) return "portrait";
  return "landscape";
}

interface ContentMediaDimensions {
  width: number;
  height: number;
}

async function readBrowserMediaDimensions(file: File, kind: ContentMediaKind): Promise<ContentMediaDimensions | undefined> {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return undefined;
  const source = URL.createObjectURL(file);
  try {
    if (kind === "image") {
      const createBitmap = globalThis.createImageBitmap;
      if (typeof createBitmap === "function") {
        const bitmap = await createBitmap(file);
        try {
          return { width: bitmap.width, height: bitmap.height };
        } finally {
          bitmap.close();
        }
      }
      if (typeof Image === "undefined") return undefined;
      return await new Promise<ContentMediaDimensions | undefined>((resolve) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve(undefined);
        image.src = source;
      });
    }

    if (typeof document === "undefined") return undefined;
    const video = document.createElement("video");
    return await new Promise<ContentMediaDimensions | undefined>((resolve) => {
      video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => resolve(undefined);
      video.src = source;
      video.load();
    });
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(source);
  }
}

/**
 * Derive the public layout direction from the uploaded media itself.
 * Metadata is best-effort here; CSS still enforces a hard no-overflow boundary
 * when a browser cannot inspect a file before upload.
 */
export async function detectContentMediaAspect(file: File): Promise<ContentMediaAspect> {
  const kind = getContentMediaKind(file);
  const dimensions = await readBrowserMediaDimensions(file, kind);
  return dimensions ? inferContentMediaAspect(dimensions.width, dimensions.height) : "landscape";
}
