import { RELEASE_FEATURES, type ReleaseFeatures } from "../config/release-features";

export interface DisabledAdminRoute {
  to: string;
  notice: "当前版本暂未开放";
}

export function resolveDisabledAdminRoute(
  path: string,
  features: ReleaseFeatures = RELEASE_FEATURES
): DisabledAdminRoute | undefined {
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
