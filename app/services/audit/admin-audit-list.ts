import { ref } from "vue";
import type { SafeAuditEventDto, SafeAuditEventListDto } from "../../../packages/api-client/src";

export type AdminAuditListStatus = "idle" | "loading" | "success" | "empty" | "unauthorized" | "forbidden" | "error";
export type SafeAuditScalar = string | number | boolean | null;
export type SafeAuditProjection = Record<string, SafeAuditScalar | SafeAuditScalar[]>;

export interface AdminAuditListQuery { page: number; pageSize: number; action: string; actionPrefix: string; targetType: string; targetId: string; actorAccountId: string; from: string; to: string; }
export interface AdminAuditListRow { id: string; actor: string; actorAccount: string | null; actorType: "account" | "system"; action: string; targetType: string; targetId: string; reason: string | null; occurredAt: string; before: SafeAuditProjection | null; after: SafeAuditProjection | null; }
export interface AdminAuditListGateway { list(query: string): Promise<SafeAuditEventListDto>; }

const SENSITIVE_KEY = /(?:contact|password|secret|token|session|cookie|request[_-]?id|(?:^|[_-])ip(?:$|[_-])|ipaddress|user[_-]?agent|device|storage|object[_-]?storage|(?:^|[_-])url(?:$|[_-])|endpoint)/i;
const isScalar = (value: unknown): value is SafeAuditScalar => value === null || ["string", "number", "boolean"].includes(typeof value);
const isScalarArray = (value: unknown): value is SafeAuditScalar[] => Array.isArray(value) && value.every(isScalar);
function isSensitiveAuditKey(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return SENSITIVE_KEY.test(key) || /(?:^|client|remote|source|origin|forwarded|request)ip(?:address)?$/.test(normalized);
}

export function projectSafeAuditValues(value: unknown): SafeAuditProjection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const projection: SafeAuditProjection = {};
  for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveAuditKey(key)) continue;
    if (isScalar(candidate) || isScalarArray(candidate)) projection[key] = candidate;
  }
  return Object.keys(projection).length ? projection : null;
}

export function mapSafeAuditEvent(event: SafeAuditEventDto): AdminAuditListRow {
  return { id: event.id, actor: event.actor.displayName, actorAccount: event.actor.username, actorType: event.actor.type, action: event.action, targetType: event.target.type, targetId: event.target.id, reason: event.reason, occurredAt: event.createdAt, before: projectSafeAuditValues(event.before), after: projectSafeAuditValues(event.after) };
}

export function formatSafeAuditProjection(value: SafeAuditProjection | null): string {
  if (!value) return "暂无可展示的安全字段";
  return Object.entries(value).map(([key, entry]) => `${key}: ${Array.isArray(entry) ? entry.join(", ") : String(entry)}`).join("\n");
}

function toQueryString(query: AdminAuditListQuery): string {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  for (const key of ["action", "actionPrefix", "targetType", "targetId", "actorAccountId", "from", "to"] as const) {
    const value = query[key].trim(); if (value) params.set(key, value);
  }
  return params.toString();
}

export function createAdminAuditListController(gateway: AdminAuditListGateway, initialQuery: Partial<AdminAuditListQuery> = {}) {
  const query = ref<AdminAuditListQuery>({ page: initialQuery.page ?? 1, pageSize: initialQuery.pageSize ?? 20, action: initialQuery.action ?? "", actionPrefix: initialQuery.actionPrefix ?? "", targetType: initialQuery.targetType ?? "", targetId: initialQuery.targetId ?? "", actorAccountId: initialQuery.actorAccountId ?? "", from: initialQuery.from ?? "", to: initialQuery.to ?? "" });
  const records = ref<AdminAuditListRow[]>([]); const selected = ref<AdminAuditListRow>(); const total = ref(0); const loading = ref(false); const error = ref(""); const status = ref<AdminAuditListStatus>("idle"); let requestGeneration = 0;
  function setFilters(filters: Omit<AdminAuditListQuery, "page" | "pageSize">) { query.value = { page: 1, pageSize: query.value.pageSize, ...filters }; selected.value = undefined; }
  function setPage(page: number) { query.value = { ...query.value, page: Math.max(1, page) }; selected.value = undefined; }
  function select(record: AdminAuditListRow) { selected.value = record; }
  function clearSelection() { selected.value = undefined; }
  async function load() {
    const generation = ++requestGeneration; loading.value = true; error.value = ""; records.value = []; selected.value = undefined; total.value = 0; status.value = "loading";
    try {
      const response = await gateway.list(toQueryString(query.value)); if (generation !== requestGeneration) return;
      query.value = { ...query.value, page: response.page, pageSize: response.pageSize };
      records.value = response.items.map(mapSafeAuditEvent); total.value = response.total; status.value = response.items.length ? "success" : "empty";
    } catch (cause) {
      if (generation !== requestGeneration) return;
      const apiError = cause as { status?: number; message?: string }; error.value = apiError.message || "审计日志读取失败，请稍后重试。"; status.value = apiError.status === 401 ? "unauthorized" : apiError.status === 403 ? "forbidden" : "error";
    } finally { if (generation === requestGeneration) loading.value = false; }
  }
  return { query, records, selected, total, loading, error, status, setFilters, setPage, select, clearSelection, load };
}
