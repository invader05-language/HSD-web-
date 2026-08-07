import { RELEASE_FEATURES, type ReleaseFeatures } from "../config/release-features";
import { ref } from "vue";

const RELEASE_NOTICE = "当前版本暂未开放" as const;
export const RETIRED_MEDIA_LIBRARY_NOTICE = "媒体素材库已取消，请在活动、项目或画廊的编辑页直接上传素材。" as const;
const ADMIN_RELEASE_NOTICES = [RELEASE_NOTICE, RETIRED_MEDIA_LIBRARY_NOTICE] as const;

export interface DisabledAdminRoute {
  to: string;
  notice: (typeof ADMIN_RELEASE_NOTICES)[number];
}

function isRouteOrChild(path: string, route: string) {
  return path === route || path.startsWith(`${route}/`);
}

function isAdminReleaseNotice(value: unknown): value is (typeof ADMIN_RELEASE_NOTICES)[number] {
  return typeof value === "string"
    && ADMIN_RELEASE_NOTICES.includes(value as (typeof ADMIN_RELEASE_NOTICES)[number]);
}

export function createReleaseNoticeState() {
  const notice = ref<string>();

  function receive(value: unknown) {
    if (!isAdminReleaseNotice(value)) {
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
  if (path.startsWith("/admin/media")) {
    return { to: "/admin", notice: RETIRED_MEDIA_LIBRARY_NOTICE };
  }
  if (!features.uploadTasks && path.startsWith("/admin/uploads")) {
    return { to: "/admin", notice: RELEASE_NOTICE };
  }

  return undefined;
}

export const resolveDisabledAdminRoute = resolveDisabledRoute;
