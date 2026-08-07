import type { DashboardTarget } from "../types/admin-dashboard";

const CONTENT_STATUS_QUERY: Record<"review" | "publish", "待审核" | "待发布"> = {
  review: "待审核",
  publish: "待发布",
};

function batchRoute(batchId: string, section?: "applications" | "assessment" | "publish") {
  const base = `/admin/recruitment/batches/${encodeURIComponent(batchId)}`;
  return section ? `${base}/${section}` : base;
}

export function dashboardTargetToRoute(target: DashboardTarget): string {
  if (target.module === "recruitment") {
    if (target.resourceType === "batch" && target.resourceId) {
      if (target.action === "applications") return batchRoute(target.resourceId, "applications");
      if (target.action === "assess") return batchRoute(target.resourceId, "assessment");
      if (target.action === "publish-results") return batchRoute(target.resourceId, "publish");
      return batchRoute(target.resourceId);
    }
    if (target.action === "assess") return "/admin/recruitment";
    if (target.action === "publish-results") return "/admin/recruitment/publish";
    return "/admin/recruitment/batches";
  }

  if (target.module === "content") {
    if (target.action === "review") return `/admin/content?status=${CONTENT_STATUS_QUERY.review}`;
    if (target.action === "publish") return `/admin/content?status=${CONTENT_STATUS_QUERY.publish}`;
    if (target.action === "view" && target.resourceType === "content" && target.resourceId) {
      return `/admin/content/${encodeURIComponent(target.resourceId)}`;
    }
    if (target.action === "create" && ["flash", "article", "notice"].includes(target.resourceId ?? "")) {
      return `/admin/content/new?kind=${encodeURIComponent(target.resourceId!)}`;
    }
    return "/admin/content";
  }

  if (target.module === "portal") return "/admin/content/home";
  if (target.module === "media") return "/admin";
  if (target.module === "member") {
    return target.action === "create" ? "/admin/members?create=member" : "/admin/members";
  }
  return "/admin";
}
