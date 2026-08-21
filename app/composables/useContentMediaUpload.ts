import {
  createContentMediaAttachment,
  detectContentMediaAspect,
  normalizeContentMediaAttachments,
  validateContentMediaFile,
} from "../utils/content-media";
import { readContentMediaBlob, saveContentMediaBlob } from "../utils/content-media-storage";
import type { ContentMediaAttachment } from "../types/content-media";
import { createApiContentMediaGateway, type ContentMediaUploadOwner } from "../services/content-media/api-content-media.gateway";

export function useContentMediaUpload() {
  const config = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
  const production = config.public.useMockApi ? undefined : createApiContentMediaGateway({ apiBase: config.public.apiBase });

  async function upload(file: File, mode: "cover" | "collection", sortOrder = 0, owner?: Omit<ContentMediaUploadOwner, "role" | "sortOrder">) {
    validateContentMediaFile(file, mode);
    const aspect = await detectContentMediaAspect(file);
    if (production) {
      if (!owner) throw new Error("CONTENT_MEDIA_OWNER_REQUIRED");
      return production.upload(file, { ...owner, aspect: owner.aspect ?? aspect, role: mode === "cover" ? "cover" : "detail", sortOrder });
    }
    const attachment = { ...createContentMediaAttachment(file, mode === "cover" ? "cover" : "detail", sortOrder), aspect };
    try {
      if (attachment.localBlobId && import.meta.client) {
        await saveContentMediaBlob(attachment.localBlobId, file);
      }
      return { ...attachment, status: "ready" as const };
    } catch (error) {
      return {
        ...attachment,
        status: "failed" as const,
        errorMessage: error instanceof Error ? error.message : "CONTENT_MEDIA_STORAGE_FAILED",
      };
    }
  }

  async function resolvePreviewUrl(attachment: ContentMediaAttachment) {
    if (attachment.url) return { url: attachment.url, owned: false };
    if (!attachment.localBlobId || !import.meta.client) return { url: undefined, owned: false };
    const blob = await readContentMediaBlob(attachment.localBlobId);
    return blob ? { url: URL.createObjectURL(blob), owned: true } : { url: undefined, owned: false };
  }

  function updateDetails(attachments: readonly ContentMediaAttachment[]) {
    return normalizeContentMediaAttachments(attachments, "detail");
  }

  async function updateMetadata(attachment: ContentMediaAttachment) {
    return production ? production.updateMetadata(attachment) : attachment;
  }

  return { upload, resolvePreviewUrl, updateDetails, updateMetadata };
}
