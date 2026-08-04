import { RELEASE_FEATURES, type ReleaseFeatures } from "../config/release-features";
import { ref } from "vue";

const RELEASE_NOTICE = "当前版本暂未开放" as const;

export interface DisabledAdminRoute {
  to: string;
  notice: typeof RELEASE_NOTICE;
}

function isRouteOrChild(path: string, route: string) {
  return path === route || path.startsWith(`${route}/`);
}

export function createReleaseNoticeState() {
  const notice = ref<string>();

  function receive(value: unknown) {
    if (value !== RELEASE_NOTICE) {
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
    return { to: "/admin/content", notice: RELEASE_NOTICE };
  }
  if (!features.helpCenter && isRouteOrChild(path, "/help")) {
    return { to: "/", notice: RELEASE_NOTICE };
  }
  if (!features.auditLog && path.startsWith("/admin/logs")) {
    return { to: "/admin", notice: RELEASE_NOTICE };
  }
  if (!features.recycleBin && path.startsWith("/admin/recycle-bin")) {
    return { to: "/admin", notice: RELEASE_NOTICE };
  }
  if (!features.uploadTasks && path.startsWith("/admin/uploads")) {
    return { to: "/admin/media", notice: RELEASE_NOTICE };
  }

  return undefined;
}

export const resolveDisabledAdminRoute = resolveDisabledRoute;
