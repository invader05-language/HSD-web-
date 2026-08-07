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
  if (attachment.status !== "ready" || !attachment.alt.trim()) return false;
  if (attachment.role === "cover") return attachment.kind === "image";
  return Boolean(attachment.title.trim() && attachment.caption.trim() && attachment.aspect);
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
