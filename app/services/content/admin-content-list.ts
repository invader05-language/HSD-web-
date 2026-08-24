import { ref } from "vue";
import type {
  AdminContentListResponseDto,
  AdminContentSummaryResponseDto,
} from "../../../packages/api-client/src";

export type AdminContentListStatus = "idle" | "loading" | "success" | "empty" | "unauthorized" | "forbidden" | "error";
export type AdminContentCanonicalStatus = "draft" | "review" | "pending_publication" | "published" | "offline";
export type AdminContentKind = "flash" | "article" | "notice";

export interface AdminContentListQuery {
  page: number;
  pageSize: number;
  q: string;
  status?: AdminContentCanonicalStatus;
  kind?: AdminContentKind;
  centerId?: string;
}

export interface AdminContentListRow {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  owner: string;
  updatedAt: string;
}

export interface AdminContentListGateway {
  list(query: string): Promise<AdminContentListResponseDto>;
}

const KIND_LABELS: Record<AdminContentKind, string> = {
  flash: "HSD 快讯",
  article: "新闻动态",
  notice: "通知公告",
};

const STATUS_LABELS: Record<AdminContentCanonicalStatus, string> = {
  draft: "草稿",
  review: "待审核",
  pending_publication: "待发布",
  published: "已发布",
  offline: "已下架",
};

export function mapAdminContentSummary(item: AdminContentSummaryResponseDto): AdminContentListRow {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary ?? "",
    category: KIND_LABELS[item.kind],
    status: STATUS_LABELS[item.status],
    owner: item.createdBy.displayName,
    updatedAt: item.updatedAt,
  };
}

function toQueryString(query: AdminContentListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.status) params.set("status", query.status);
  if (query.kind) params.set("kind", query.kind);
  if (query.centerId?.trim()) params.set("centerId", query.centerId.trim());
  return params.toString();
}

export function createAdminContentListController(
  gateway: AdminContentListGateway,
  initialQuery: Partial<AdminContentListQuery> = {},
) {
  const query = ref<AdminContentListQuery>({
    page: initialQuery.page ?? 1,
    pageSize: initialQuery.pageSize ?? 20,
    q: initialQuery.q ?? "",
    ...(initialQuery.status ? { status: initialQuery.status } : {}),
    ...(initialQuery.kind ? { kind: initialQuery.kind } : {}),
    ...(initialQuery.centerId ? { centerId: initialQuery.centerId } : {}),
  });
  const records = ref<AdminContentListRow[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref("");
  const status = ref<AdminContentListStatus>("idle");
  let requestGeneration = 0;

  function setFilters(filters: Pick<AdminContentListQuery, "q" | "status" | "kind" | "centerId">) {
    query.value = {
      page: 1,
      pageSize: query.value.pageSize,
      q: filters.q,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.kind ? { kind: filters.kind } : {}),
      ...(filters.centerId ? { centerId: filters.centerId } : {}),
    };
  }

  function setPage(page: number) {
    query.value = { ...query.value, page: Math.max(1, page) };
  }

  async function load() {
    const generation = ++requestGeneration;
    loading.value = true;
    error.value = "";
    records.value = [];
    total.value = 0;
    status.value = "loading";
    try {
      const response = await gateway.list(toQueryString(query.value));
      if (generation !== requestGeneration) return;
      query.value = { ...query.value, page: response.page, pageSize: response.pageSize };
      records.value = response.items.map(mapAdminContentSummary);
      total.value = response.total;
      status.value = response.items.length ? "success" : "empty";
    } catch (cause) {
      if (generation !== requestGeneration) return;
      const apiError = cause as { status?: number; message?: string };
      error.value = apiError.message || "官网内容读取失败，请稍后重试。";
      status.value = apiError.status === 401
        ? "unauthorized"
        : apiError.status === 403
          ? "forbidden"
          : "error";
    } finally {
      if (generation === requestGeneration) loading.value = false;
    }
  }

  return { query, records, total, loading, error, status, setFilters, setPage, load };
}
