import { buildLoginTarget } from "./login-continuation";
import { buildPasswordChangeTarget } from "./password-change";
import { isSafeInternalPath } from "./internal-route";

export interface RouteAccessSession {
  isAuthenticated: boolean;
  canAccessAdmin: boolean;
  canManageAdminAccounts: boolean;
  hasCapability?: (capability: string) => boolean;
  mustChangePassword?: boolean;
}

export type AdminRequiredAccess = "owner" | "center" | "scope";
export type AdminForbiddenReason = "admin_access_required" | "owner_required" | "portal_scope_required";

const ADMIN_FORBIDDEN = "/admin/forbidden";
const INTERNAL_ROUTE_ORIGIN = "https://baiyun-hsd.invalid";
const OWNER_ADMIN_ROUTES = [
  "/admin/accounts",
  "/admin/members",
  "/admin/core-members",
  "/admin/centers",
  "/admin/password-recovery",
] as const;

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

function normalizeAdminContinuation(source: unknown): string | undefined {
  if (!isSafeInternalPath(source)) return undefined;

  const parsed = new URL(source, INTERNAL_ROUTE_ORIGIN);
  const pathname = normalizeRoutePath(parsed.pathname);
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return undefined;
  return `${pathname}${parsed.search}${parsed.hash}`;
}

function requiresOwnerAccess(path: string): boolean {
  return OWNER_ADMIN_ROUTES.some((root) => path === root || path.startsWith(`${root}/`));
}

function defaultForbiddenReason(required: AdminRequiredAccess): AdminForbiddenReason {
  if (required === "owner") return "owner_required";
  if (required === "scope") return "portal_scope_required";
  return "admin_access_required";
}

export function getAdminPermissionRequirement(source: unknown): AdminRequiredAccess {
  if (typeof source !== "string") return "center";
  const path = normalizeRoutePath(source);
  if (requiresOwnerAccess(path)) return "owner";
  if (path.startsWith("/admin/content/home") || path.startsWith("/admin/content/help")) return "scope";
  return "center";
}

export function buildAdminForbiddenTarget(
  path: string,
  required: AdminRequiredAccess = getAdminPermissionRequirement(path),
  reason: AdminForbiddenReason = defaultForbiddenReason(required),
): string {
  const from = normalizeAdminContinuation(path) ?? "/admin";
  const query = new URLSearchParams({ from, required, reason });
  return `${ADMIN_FORBIDDEN}?${query.toString()}`;
}

export function getRequiredAdminAccess(source: unknown): "admin" | "owner" {
  return typeof source === "string" && requiresOwnerAccess(normalizeRoutePath(source))
    ? "owner"
    : "admin";
}

function hasRequiredAdminAccess(required: AdminRequiredAccess, session: RouteAccessSession): boolean {
  if (required === "owner") return session.canManageAdminAccounts;
  if (required === "scope") return session.canAccessAdmin && Boolean(session.hasCapability?.("portal.configure"));
  return session.canAccessAdmin;
}

function resolveForbiddenContinuation(fullPath: string, session: RouteAccessSession): string | undefined {
  if (!session.canAccessAdmin) return undefined;

  const safePath = isSafeInternalPath(fullPath) ? fullPath : ADMIN_FORBIDDEN;
  const query = new URL(safePath, INTERNAL_ROUTE_ORIGIN).searchParams;
  const from = normalizeAdminContinuation(query.get("from"));
  const rawRequired = query.get("required");
  const required: AdminRequiredAccess = rawRequired === "owner" || rawRequired === "scope" || rawRequired === "center"
    ? rawRequired
    : getAdminPermissionRequirement(from);

  if (from && from !== ADMIN_FORBIDDEN && hasRequiredAdminAccess(required, session)) return from;
  return "/admin";
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
  if (!normalizedPath.startsWith("/admin")) return undefined;
  if (normalizedPath === ADMIN_FORBIDDEN) return resolveForbiddenContinuation(fullPath, session);
  if (!session.canAccessAdmin) return buildAdminForbiddenTarget(fullPath, "center", "admin_access_required");
  if (normalizedPath === "/admin/roles") {
    return session.canManageAdminAccounts
      ? "/admin/accounts"
      : buildAdminForbiddenTarget("/admin/accounts", "owner", "owner_required");
  }
  if (requiresOwnerAccess(normalizedPath) && !session.canManageAdminAccounts) {
    return buildAdminForbiddenTarget(fullPath, "owner", "owner_required");
  }
  if ((normalizedPath.startsWith("/admin/content/home") || normalizedPath.startsWith("/admin/content/help"))
    && !session.hasCapability?.("portal.configure")) {
    return buildAdminForbiddenTarget(fullPath, "scope", "portal_scope_required");
  }
  return undefined;
}
