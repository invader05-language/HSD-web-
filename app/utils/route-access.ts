import { buildLoginTarget } from "./login-continuation";

export interface RouteAccessSession {
  isAuthenticated: boolean;
  canAccessAdmin: boolean;
  canManageAdminAccounts: boolean;
}

const ADMIN_FORBIDDEN = "/admin/forbidden";

function normalizeRoutePath(path: string): string {
  const normalizedPath = path.toLowerCase();
  return normalizedPath.length > 1 ? normalizedPath.replace(/\/+$/, "") : normalizedPath;
}

function isProtectedRoute(path: string): boolean {
  return path.startsWith("/member")
    || path.startsWith("/admin")
    || path === "/join/apply"
    || path === "/assessment-results";
}

export function resolveProtectedRouteTarget(
  path: string,
  fullPath: string,
  session: RouteAccessSession
): string | undefined {
  const normalizedPath = normalizeRoutePath(path);
  if (!isProtectedRoute(normalizedPath)) return undefined;
  if (!session.isAuthenticated) return buildLoginTarget(fullPath);
  if (!normalizedPath.startsWith("/admin") || normalizedPath === ADMIN_FORBIDDEN) return undefined;
  if (!session.canAccessAdmin) return ADMIN_FORBIDDEN;
  if (normalizedPath === "/admin/roles") {
    return session.canManageAdminAccounts ? "/admin/accounts" : ADMIN_FORBIDDEN;
  }
  if (normalizedPath === "/admin/accounts" && !session.canManageAdminAccounts) {
    return ADMIN_FORBIDDEN;
  }
  return undefined;
}
