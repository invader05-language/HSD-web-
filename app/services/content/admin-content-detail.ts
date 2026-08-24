import { ref } from "vue";
import type { AdminContentResponseDto, ContentAttachmentImageBlockResponseDto, ContentHeadingBlockResponseDto, ContentParagraphBlockResponseDto } from "../../../packages/api-client/src";
import type { AdminContentCanonicalStatus, AdminContentKind } from "./admin-content-list";

export type AdminContentDetailStatus = "idle" | "loading" | "success" | "missingRevision" | "unauthorized" | "forbidden" | "notFound" | "error";
export type AdminContentDetailBlock = ContentAttachmentImageBlockResponseDto | ContentHeadingBlockResponseDto | ContentParagraphBlockResponseDto;
export interface AdminContentDetail { id: string; kind: AdminContentKind; status: string; canonicalStatus: AdminContentCanonicalStatus; version: number; workingRevisionNumber: number; title: string; summary: string; internalTarget: string | null; expiresAt: string | null; blocks: AdminContentDetailBlock[]; createdBy: string; updatedAt: string; rejectionReason: string | null; }
export interface AdminContentDetailGateway { detail(contentId: string): Promise<AdminContentResponseDto>; }

const STATUS_LABELS: Record<AdminContentCanonicalStatus, string> = { draft: "草稿", review: "待审核", pending_publication: "待发布", published: "已发布", offline: "已下架" };

export function mapAdminContentDetail(item: AdminContentResponseDto): AdminContentDetail | undefined {
  const revision = item.workingRevision;
  if (!revision) return undefined;
  return { id: item.id, kind: item.kind, status: STATUS_LABELS[item.status], canonicalStatus: item.status, version: item.version, workingRevisionNumber: revision.revisionNumber, title: revision.title, summary: revision.summary ?? "", internalTarget: revision.internalTarget, expiresAt: revision.expiresAt, blocks: revision.blocks, createdBy: item.createdBy.displayName, updatedAt: item.updatedAt, rejectionReason: item.rejectionReason };
}

export function replaceFirstContentParagraph(blocks: AdminContentDetailBlock[], text: string): AdminContentDetailBlock[] {
  const paragraphCount = blocks.filter((block) => block.type === "paragraph").length;
  if (!paragraphCount) return text.trim() ? [...blocks, { type: "paragraph", text: text.trim() }] : blocks;
  if (paragraphCount > 1) return blocks;
  return blocks.map((block) => block.type === "paragraph" ? { type: "paragraph", text: text.trim() } : block);
}

export function createAdminContentDetailController(gateway: AdminContentDetailGateway) {
  const record = ref<AdminContentDetail>(); const loading = ref(false); const error = ref(""); const status = ref<AdminContentDetailStatus>("idle"); let requestGeneration = 0;
  async function load(contentId: string) {
    const generation = ++requestGeneration; record.value = undefined; error.value = ""; loading.value = true; status.value = "loading";
    try { const response = await gateway.detail(contentId); if (generation !== requestGeneration) return; const mapped = mapAdminContentDetail(response); if (!mapped) { status.value = "missingRevision"; error.value = "服务端未返回可编辑的工作版本。"; return; } record.value = mapped; status.value = "success"; }
    catch (cause) { if (generation !== requestGeneration) return; const apiError = cause as { status?: number; message?: string }; error.value = apiError.message || "官网内容读取失败，请稍后重试。"; status.value = apiError.status === 401 ? "unauthorized" : apiError.status === 403 ? "forbidden" : apiError.status === 404 ? "notFound" : "error"; }
    finally { if (generation === requestGeneration) loading.value = false; }
  }
  return { record, loading, error, status, load };
}
