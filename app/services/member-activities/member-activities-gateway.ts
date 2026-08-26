export type MemberActivityStatus = "registered" | "accepted" | "rejected" | "cancelled";

export interface MemberActivityRegistration {
  id: string;
  activityId: string;
  slug: string;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  status: MemberActivityStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  cancelledAt: string | null;
  decisionReason: string | null;
}

export interface MemberActivityRegistrationPage {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: MemberActivityRegistration[];
}

export interface MemberActivitiesGateway {
  list(page: number, pageSize: number, status?: MemberActivityStatus | "all"): Promise<MemberActivityRegistrationPage>;
  cancel(id: string, expectedVersion: number): Promise<MemberActivityRegistration>;
}

interface Options { apiBase: string; fetcher?: typeof globalThis.fetch; readCookie?: (name: string) => string | undefined }

function cookie(name: string) {
  if (typeof document === "undefined") return undefined;
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${encodeURIComponent(name)}=`))?.slice(name.length + 1);
}

function requestId() { return globalThis.crypto?.randomUUID?.() ?? `member-activities-${Date.now()}`; }

function normalizeItem(value: Record<string, unknown>): MemberActivityRegistration {
  const activity = value.activity && typeof value.activity === "object" && !Array.isArray(value.activity)
    ? value.activity as Record<string, unknown>
    : value;
  return {
    id: String(value.id),
    activityId: String(value.activityId ?? activity.id ?? ""),
    slug: String(value.slug ?? activity.slug ?? ""),
    title: String(value.title ?? activity.title ?? "活动"),
    type: String(value.type ?? activity.type ?? "活动"),
    date: String(value.date ?? activity.date ?? ""),
    time: String(value.time ?? activity.time ?? ""),
    location: String(value.location ?? activity.location ?? ""),
    status: String(value.status ?? "registered").toLowerCase() as MemberActivityStatus,
    version: Number(value.version ?? 1),
    createdAt: String(value.createdAt ?? ""),
    updatedAt: String(value.updatedAt ?? value.createdAt ?? ""),
    decidedAt: typeof value.decidedAt === "string" ? value.decidedAt : null,
    cancelledAt: typeof value.cancelledAt === "string" ? value.cancelledAt : null,
    decisionReason: typeof value.decisionReason === "string" ? value.decisionReason : null,
  };
}

export function createMemberActivitiesGateway(options: Options): MemberActivitiesGateway {
  const apiBase = options.apiBase.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? globalThis.fetch;
  const readCookie = options.readCookie ?? cookie;
  async function send(path: string, init: RequestInit = {}) {
    const response = await fetcher(`${apiBase}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        "X-Request-ID": requestId(),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.method && init.method !== "GET" ? { "X-CSRF-Token": decodeURIComponent(readCookie("hsd_csrf") ?? "") } : {}),
        ...(init.headers ?? {}),
      },
    });
    const payload = await response.json() as unknown;
    if (!response.ok) throw new Error(typeof payload === "object" && payload && "message" in payload ? String((payload as { message: unknown }).message) : "活动报名请求失败");
    return payload;
  }
  return {
    async list(page, pageSize, status = "all") {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status !== "all") query.set("status", status);
      const payload = await send(`/api/v1/members/me/activity-registrations?${query}`) as Record<string, unknown>;
      return {
        page: Number(payload.page ?? page),
        pageSize: Number(payload.pageSize ?? pageSize),
        total: Number(payload.total ?? 0),
        totalPages: Number(payload.totalPages ?? 0),
        items: Array.isArray(payload.items) ? payload.items.map((item) => normalizeItem(item as Record<string, unknown>)) : [],
      };
    },
    async cancel(id, expectedVersion) {
      const payload = await send(`/api/v1/registrations/${encodeURIComponent(id)}/cancel`, { method: "POST", body: JSON.stringify({ expectedVersion }) });
      return normalizeItem(payload as Record<string, unknown>);
    },
  };
}
