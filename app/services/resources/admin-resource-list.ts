import { ref } from "vue";
import type { AdminResourceListResponseDto, AdminResourceSummaryResponseDto } from "../../../packages/api-client/src";

export type AdminResourceListStatus = "idle" | "loading" | "success" | "empty" | "unauthorized" | "forbidden" | "notFound" | "error";
export type AdminResourceStatus = "draft" | "published" | "offline";
export type AdminResourceKind = "article" | "pdf" | "docx" | "archive" | "external";
export type AdminResourceFormat = "web" | "pdf" | "docx" | "zip" | "external";
export type AdminResourceAccess = "public" | "member";
export type AdminResourceAvailability = "available" | "unavailable";

export interface AdminResourceListQuery { page: number; pageSize: number; q: string; status?: AdminResourceStatus; kind?: AdminResourceKind; format?: AdminResourceFormat; access?: AdminResourceAccess; availability?: AdminResourceAvailability; centerId?: string; }
export interface AdminResourceListRow { id: string; title: string; summary: string; kind: string; format: string; access: string; availability: string; status: string; versionLabel: string; version: number; updatedAt: string; }
export interface AdminResourceListGateway { list(query: string): Promise<AdminResourceListResponseDto>; }

const KIND_LABELS: Record<AdminResourceKind, string> = { article: "文章", pdf: "PDF", docx: "DOCX", archive: "归档包", external: "外部链接" };
const FORMAT_LABELS: Record<AdminResourceFormat, string> = { web: "网页", pdf: "PDF", docx: "DOCX", zip: "ZIP", external: "外部链接" };
const ACCESS_LABELS: Record<AdminResourceAccess, string> = { public: "公开访问", member: "登录成员" };
const AVAILABILITY_LABELS: Record<AdminResourceAvailability, string> = { available: "可用", unavailable: "暂不可用" };
const STATUS_LABELS: Record<AdminResourceStatus, string> = { draft: "草稿", published: "已发布", offline: "已下架" };

export function mapAdminResourceSummary(item: AdminResourceSummaryResponseDto): AdminResourceListRow {
  return { id: item.id, title: item.title, summary: item.summary, kind: KIND_LABELS[item.kind], format: FORMAT_LABELS[item.format], access: ACCESS_LABELS[item.access], availability: AVAILABILITY_LABELS[item.availability], status: STATUS_LABELS[item.status], versionLabel: item.versionLabel, version: item.version, updatedAt: item.updatedAt };
}

function toQueryString(query: AdminResourceListQuery): string {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  if (query.q.trim()) params.set("q", query.q.trim()); if (query.status) params.set("status", query.status); if (query.kind) params.set("kind", query.kind); if (query.format) params.set("format", query.format); if (query.access) params.set("access", query.access); if (query.availability) params.set("availability", query.availability); if (query.centerId?.trim()) params.set("centerId", query.centerId.trim());
  return params.toString();
}

export function createAdminResourceListController(gateway: AdminResourceListGateway, initialQuery: Partial<AdminResourceListQuery> = {}) {
  const query = ref<AdminResourceListQuery>({ page: initialQuery.page ?? 1, pageSize: initialQuery.pageSize ?? 20, q: initialQuery.q ?? "", ...initialQuery });
  const records = ref<AdminResourceListRow[]>([]); const total = ref(0); const loading = ref(false); const error = ref(""); const status = ref<AdminResourceListStatus>("idle"); let requestGeneration = 0;
  function setFilters(filters: Pick<AdminResourceListQuery, "q" | "status" | "kind" | "format" | "access" | "availability" | "centerId">) { query.value = { page: 1, pageSize: query.value.pageSize, q: filters.q, ...(filters.status ? { status: filters.status } : {}), ...(filters.kind ? { kind: filters.kind } : {}), ...(filters.format ? { format: filters.format } : {}), ...(filters.access ? { access: filters.access } : {}), ...(filters.availability ? { availability: filters.availability } : {}), ...(filters.centerId ? { centerId: filters.centerId } : {}) }; }
  function setPage(page: number) { query.value = { ...query.value, page: Math.max(1, page) }; }
  async function load() {
    const generation = ++requestGeneration; loading.value = true; error.value = ""; records.value = []; total.value = 0; status.value = "loading";
    try { const response = await gateway.list(toQueryString(query.value)); if (generation !== requestGeneration) return; records.value = response.items.map(mapAdminResourceSummary); total.value = response.total; status.value = response.items.length ? "success" : "empty"; }
    catch (cause) { if (generation !== requestGeneration) return; const apiError = cause as { status?: number; message?: string }; error.value = apiError.message || "学习资料读取失败，请稍后重试。"; status.value = apiError.status === 401 ? "unauthorized" : apiError.status === 403 ? "forbidden" : apiError.status === 404 ? "notFound" : "error"; }
    finally { if (generation === requestGeneration) loading.value = false; }
  }
  return { query, records, total, loading, error, status, setFilters, setPage, load };
}
