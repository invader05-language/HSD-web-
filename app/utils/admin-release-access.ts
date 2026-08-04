import { RELEASE_FEATURES, type ReleaseFeatures } from "../config/release-features";
import { ref } from "vue";

export interface DisabledAdminRoute {
  to: string;
  notice: "当前版本暂未开放";
}

function isRouteOrChild(path: string, route: string) {
  return path === route || path.startsWith(`${route}/`);
}

export function createReleaseNoticeState() {
  const notice = ref<string>();

  function receive(value: unknown) {
    if (typeof value !== "string" || value.length === 0) {
      notice.value = undefined;
      return false;
    }

    notice.value = value;
    return true;
  }

  return { notice, receive };
}

export function resolveDisabledRoute(
  path: string,
  features: ReleaseFeatures = RELEASE_FEATURES
): DisabledAdminRoute | undefined {
  if (!features.helpCenter && isRouteOrChild(path, "/admin/content/help")) {
    return { to: "/admin/content", notice: "当前版本暂未开放" };
  }
  if (!features.helpCenter && isRouteOrChild(path, "/help")) {
    return { to: "/", notice: "当前版本暂未开放" };
  }
  if (!features.auditLog && path.startsWith("/admin/logs")) {
    return { to: "/admin", notice: "当前版本暂未开放" };
  }
  if (!features.recycleBin && path.startsWith("/admin/recycle-bin")) {
    return { to: "/admin", notice: "当前版本暂未开放" };
  }
  if (!features.uploadTasks && path.startsWith("/admin/uploads")) {
    return { to: "/admin/media", notice: "当前版本暂未开放" };
  }

  return undefined;
}

export const resolveDisabledAdminRoute = resolveDisabledRoute;
