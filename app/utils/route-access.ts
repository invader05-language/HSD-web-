import { buildLoginTarget } from "./login-continuation";
import { buildPasswordChangeTarget } from "./password-change";

export interface RouteAccessSession {
  isAuthenticated: boolean;
  canAccessAdmin: boolean;
  canManageAdminAccounts: boolean;
  hasCapability?: (capability: string) => boolean;
  mustChangePassword?: boolean;
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

function buildAdminForbiddenTarget(path: string): string {
  return `${ADMIN_FORBIDDEN}?from=${encodeURIComponent(normalizeRoutePath(path))}`;
}

export function getRequiredAdminAccess(source: unknown): "admin" | "owner" {
  return typeof source === "string" && ["/admin/accounts", "/admin/members", "/admin/core-members", "/admin/centers"]
    .includes(normalizeRoutePath(source))
    ? "owner"
    : "admin";
}

export function resolveProtectedRouteTarget(
  path: string,
  fullPath: string,
  session: RouteAccessSession
): string | undefined {
  const normalizedPath = normalizeRoutePath(path);
  if (session.isAuthenticated && session.mustChangePassword) {
    return normalizedPath === "/member/change-password"
      ? undefined
      : buildPasswordChangeTarget(fullPath);
  }
  if (!isProtectedRoute(normalizedPath)) return undefined;
  if (!session.isAuthenticated) return buildLoginTarget(fullPath);
  if (!normalizedPath.startsWith("/admin") || normalizedPath === ADMIN_FORBIDDEN) return undefined;
  if (!session.canAccessAdmin) return buildAdminForbiddenTarget(normalizedPath);
  if (normalizedPath === "/admin/roles") {
    return session.canManageAdminAccounts
      ? "/admin/accounts"
      : buildAdminForbiddenTarget("/admin/accounts");
  }
  if (["/admin/accounts", "/admin/members", "/admin/core-members", "/admin/centers"].includes(normalizedPath)
    && !session.canManageAdminAccounts) {
    return buildAdminForbiddenTarget(normalizedPath);
  }
  if ((normalizedPath.startsWith("/admin/content/home") || normalizedPath.startsWith("/admin/content/help"))
    && !session.hasCapability?.("portal.configure")) {
    return buildAdminForbiddenTarget(normalizedPath);
  }
  return undefined;
}
