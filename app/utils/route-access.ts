import { buildLoginTarget } from "./login-continuation";

export interface RouteAccessSession {
  isAuthenticated: boolean;
  canAccessAdmin: boolean;
  canManageAdminAccounts: boolean;
}

const ADMIN_FORBIDDEN = "/admin/forbidden";

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
  if (!isProtectedRoute(path)) return undefined;
  if (!session.isAuthenticated) return buildLoginTarget(fullPath);
  if (!path.startsWith("/admin") || path === ADMIN_FORBIDDEN) return undefined;
  if (!session.canAccessAdmin) return ADMIN_FORBIDDEN;
  if (path === "/admin/roles") {
    return session.canManageAdminAccounts ? "/admin/accounts" : ADMIN_FORBIDDEN;
  }
  if (path === "/admin/accounts" && !session.canManageAdminAccounts) {
    return ADMIN_FORBIDDEN;
  }
  return undefined;
}
