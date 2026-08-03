export type LoginMode = "member" | "admin";

export interface LoginContinuation {
  mode: LoginMode;
  memberTarget: string;
  adminTarget: string;
}

const MEMBER_HOME = "/member";
const ADMIN_HOME = "/admin";

function isSafeInternalTarget(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function isAdminTarget(value: string): boolean {
  return value === ADMIN_HOME || value.startsWith(`${ADMIN_HOME}/`);
}

export function buildLoginTarget(target: string): string {
  const mode = isAdminTarget(target) ? "?mode=admin&" : "?";
  return `/login${mode}redirect=${encodeURIComponent(target)}`;
}

export function resolveLoginAwareTarget(target: string, isAuthenticated: boolean): string {
  return isAuthenticated ? target : buildLoginTarget(target);
}

export function normalizeRedirectTarget(value: unknown): string {
  return isSafeInternalTarget(value) ? value : MEMBER_HOME;
}

export function resolveLoginContinuation(query: Record<string, unknown>): LoginContinuation {
  const redirect = isSafeInternalTarget(query.redirect) ? query.redirect : undefined;
  const adminTarget = redirect && isAdminTarget(redirect) ? redirect : ADMIN_HOME;
  const memberTarget = redirect && !isAdminTarget(redirect) ? redirect : MEMBER_HOME;
  const mode: LoginMode = query.mode === "admin" || (!query.mode && adminTarget !== ADMIN_HOME)
    ? "admin"
    : "member";

  return { mode, memberTarget, adminTarget };
}
