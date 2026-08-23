import { ref } from "vue";
import type { UploadListResponseDto, UploadResponseDto } from "../../../packages/api-client/src";

export type AdminUploadListStatus = "idle" | "loading" | "success" | "empty" | "unauthorized" | "forbidden" | "notFound" | "error";
export type AdminUploadStatus = "uploading" | "processing" | "ready" | "failed" | "expired";
export type AdminUploadKind = "image" | "video";

export interface AdminUploadListQuery { page: number; pageSize: number; q: string; status?: AdminUploadStatus; kind?: AdminUploadKind; centerId?: string; }
export interface AdminUploadListRow { id: string; fileName: string; mimeType: string; byteSize: string; kind: string; status: string; version: number; expiresAt: string; failureCode: string | null; createdAt: string; updatedAt: string; completedAt: string | null; createdBy: string; }
export interface AdminUploadListGateway { list(query: string): Promise<UploadListResponseDto>; }

const STATUS_LABELS: Record<AdminUploadStatus, string> = { uploading: "上传中", processing: "处理中", ready: "可用", failed: "失败", expired: "已过期" };
const KIND_LABELS: Record<AdminUploadKind, string> = { image: "图片", video: "视频" };

export function formatByteSize(byteSize: number): string {
  if (byteSize < 1024) return `${byteSize} B`;
  if (byteSize < 1024 ** 2) return `${Number((byteSize / 1024).toFixed(1))} KB`;
  if (byteSize < 1024 ** 3) return `${Number((byteSize / 1024 ** 2).toFixed(1))} MB`;
  return `${Number((byteSize / 1024 ** 3).toFixed(1))} GB`;
}

export function mapAdminUpload(item: UploadResponseDto): AdminUploadListRow {
  return { id: item.id, fileName: item.fileName, mimeType: item.mimeType, byteSize: formatByteSize(item.byteSize), kind: KIND_LABELS[item.kind], status: STATUS_LABELS[item.status], version: item.version, expiresAt: item.expiresAt, failureCode: item.failureCode, createdAt: item.createdAt, updatedAt: item.updatedAt, completedAt: item.completedAt, createdBy: item.createdBy.displayName || item.createdBy.username };
}

function toQueryString(query: AdminUploadListQuery): string {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.status) params.set("status", query.status);
  if (query.kind) params.set("kind", query.kind);
  if (query.centerId?.trim()) params.set("centerId", query.centerId.trim());
  return params.toString();
}

export function createAdminUploadListController(gateway: AdminUploadListGateway, initialQuery: Partial<AdminUploadListQuery> = {}) {
  const query = ref<AdminUploadListQuery>({ page: initialQuery.page ?? 1, pageSize: initialQuery.pageSize ?? 20, q: initialQuery.q ?? "", ...initialQuery });
  const records = ref<AdminUploadListRow[]>([]); const total = ref(0); const loading = ref(false); const error = ref(""); const status = ref<AdminUploadListStatus>("idle"); let requestGeneration = 0;
  function setFilters(filters: Pick<AdminUploadListQuery, "q" | "status" | "kind" | "centerId">) { query.value = { page: 1, pageSize: query.value.pageSize, q: filters.q, ...(filters.status ? { status: filters.status } : {}), ...(filters.kind ? { kind: filters.kind } : {}), ...(filters.centerId ? { centerId: filters.centerId } : {}) }; }
  function setPage(page: number) { query.value = { ...query.value, page: Math.max(1, page) }; }
  async function load() {
    const generation = ++requestGeneration; loading.value = true; error.value = ""; records.value = []; total.value = 0; status.value = "loading";
    try { const response = await gateway.list(toQueryString(query.value)); if (generation !== requestGeneration) return; records.value = response.items.map(mapAdminUpload); total.value = response.total; status.value = response.items.length ? "success" : "empty"; }
    catch (cause) { if (generation !== requestGeneration) return; const apiError = cause as { status?: number; message?: string }; error.value = apiError.message || "上传任务读取失败，请稍后重试。"; status.value = apiError.status === 401 ? "unauthorized" : apiError.status === 403 ? "forbidden" : apiError.status === 404 ? "notFound" : "error"; }
    finally { if (generation === requestGeneration) loading.value = false; }
  }
  return { query, records, total, loading, error, status, setFilters, setPage, load };
}
