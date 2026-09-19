export interface PasswordRecoveryAcceptedResponse { accepted: true; message: string }

export class PasswordRecoveryApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "PasswordRecoveryApiError";
  }
}

const isErrorResponse = (value: unknown): value is { code: string; message: string } => Boolean(
  value && typeof value === "object" && typeof (value as { code?: unknown }).code === "string" && typeof (value as { message?: unknown }).message === "string",
);

const browserCookie = (name: string) => typeof document === "undefined"
  ? undefined
  : document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);

export interface PasswordRecoveryGatewayOptions { apiBase: string; fetcher?: typeof globalThis.fetch; readCookie?: (name: string) => string | undefined }

export interface PasswordRecoveryTarget { maskedAccount: string; name: string; centerName: string | null; status: string; accountVersion: number }
export interface PasswordRecoveryRequest { id: string; status: "PENDING" | "COMPLETED" | "REJECTED"; version: number; requestedAt: string; lastRequestedAt: string; resolvedAt: string | null; resolutionReason: string | null; target: PasswordRecoveryTarget }
export interface PasswordRecoveryList { page: number; pageSize: number; total: number; items: PasswordRecoveryRequest[] }
export interface ResetPasswordResponse { status: "COMPLETED"; resolvedAt: string; targetName: string; revokedSessionCount: number }

export function createPasswordRecoveryGateway(options: PasswordRecoveryGatewayOptions) {
  const apiBase = options.apiBase.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? globalThis.fetch;
  const readCookie = options.readCookie ?? browserCookie;
  const request = async <T>(path: string, init: RequestInit = {}, csrfRequired = true): Promise<T> => {
    const headers = new Headers(init.headers);
    headers.set("X-Request-ID", globalThis.crypto?.randomUUID?.() ?? `password-recovery-${Date.now()}`);
    if (init.method && init.method !== "GET") {
      if (csrfRequired) {
        const csrf = readCookie("hsd_csrf");
        if (!csrf) throw new PasswordRecoveryApiError(403, "CSRF_TOKEN_MISSING", "请求校验失败，请刷新后重试");
        headers.set("X-CSRF-Token", decodeURIComponent(csrf));
      }
      headers.set("Content-Type", "application/json");
    }
    const response = await fetcher(`${apiBase}${path}`, { ...init, credentials: "include", headers });
    const payload: unknown = response.status === 204 ? undefined : await response.json();
    if (!response.ok) {
      throw new PasswordRecoveryApiError(response.status, isErrorResponse(payload) ? payload.code : "PASSWORD_RECOVERY_REQUEST_FAILED", isErrorResponse(payload) ? payload.message : "请求处理失败");
    }
    return payload as T;
  };
  return {
    submit: (account: string) => request<PasswordRecoveryAcceptedResponse>("/api/v1/auth/password-recovery-requests", { method: "POST", body: JSON.stringify({ account }) }, false),
    list: (query: { page?: number; pageSize?: number; status?: string; search?: string } = {}) => {
      const params = new URLSearchParams({ page: String(query.page ?? 1), pageSize: String(query.pageSize ?? 20), status: query.status ?? "PENDING" });
      if (query.search) params.set("search", query.search);
      return request<PasswordRecoveryList>(`/api/v1/admin/password-recovery-requests?${params.toString()}`);
    },
    pendingCount: () => request<{ count: number }>("/api/v1/admin/password-recovery-requests/pending-count"),
    detail: (id: string) => request<PasswordRecoveryRequest>(`/api/v1/admin/password-recovery-requests/${encodeURIComponent(id)}`),
    reset: (id: string, body: { requestVersion: number; accountVersion: number; contactedInPerson: true; identityMatched: true; organizationMatched: true; resolutionReason: string }) => request<ResetPasswordResponse>(`/api/v1/admin/password-recovery-requests/${encodeURIComponent(id)}/reset-to-initial-password`, { method: "POST", body: JSON.stringify(body) }),
    reject: (id: string, body: { requestVersion: number; resolutionReason: string }) => request<{ status: "REJECTED"; resolvedAt: string }>(`/api/v1/admin/password-recovery-requests/${encodeURIComponent(id)}/reject`, { method: "POST", body: JSON.stringify(body) }),
  };
}
