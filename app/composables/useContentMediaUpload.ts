import {
  createContentMediaAttachment,
  normalizeContentMediaAttachments,
  validateContentMediaFile,
} from "../utils/content-media";
import { readContentMediaBlob, saveContentMediaBlob } from "../utils/content-media-storage";
import type { ContentMediaAttachment } from "../types/content-media";

export function useContentMediaUpload() {
  async function upload(file: File, mode: "cover" | "collection", sortOrder = 0) {
    validateContentMediaFile(file, mode);
    const attachment = createContentMediaAttachment(file, mode === "cover" ? "cover" : "detail", sortOrder);
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

  return { upload, resolvePreviewUrl, updateDetails };
}
