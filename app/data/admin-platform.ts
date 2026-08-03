import { RELEASE_FEATURES, type ReleaseFeatures } from "../config/release-features";

export interface AdminNavigationItem {
  id: string;
  label: string;
  to: string;
}

export interface AdminNavigationGroup {
  id: string;
  label: string;
  items: AdminNavigationItem[];
}

export interface AdminNavigationAccess {
  canManageAdminAccounts: boolean;
}

export const ADMIN_NAVIGATION: AdminNavigationGroup[] = [
  {
    id: "dashboard",
    label: "工作台",
    items: [{ id: "dashboard", label: "管理工作台", to: "/admin" }]
  },
  {
    id: "recruitment",
    label: "招新与考核",
    items: [
      { id: "batches", label: "招新批次", to: "/admin/recruitment/batches" },
      { id: "applications", label: "报名人员", to: "/admin/recruitment/applications" },
      { id: "assessment", label: "预备成员考核", to: "/admin/recruitment" },
      { id: "publication", label: "结果发布", to: "/admin/recruitment/publish" }
    ]
  },
  {
    id: "organization",
    label: "组织与成员",
    items: [
      { id: "members", label: "全体成员", to: "/admin/members" },
      { id: "core-members", label: "核心人员", to: "/admin/core-members" },
      { id: "centers", label: "中心组织", to: "/admin/centers" },
      { id: "honors", label: "荣誉审核", to: "/admin/honors" }
    ]
  },
  {
    id: "projects-activities",
    label: "项目与活动",
    items: [
      { id: "projects", label: "项目管理", to: "/admin/projects" },
      { id: "activities", label: "活动管理", to: "/admin/activities" },
      { id: "registrations", label: "报名名单", to: "/admin/activities/registrations" }
    ]
  },
  {
    id: "content-portal",
    label: "内容与门户",
    items: [
      { id: "content", label: "内容管理", to: "/admin/content" },
      { id: "homepage", label: "首页配置", to: "/admin/content/home" },
      { id: "banners", label: "Banner 配置", to: "/admin/content/banners" },
      { id: "help", label: "帮助中心", to: "/admin/content/help" }
    ]
  },
  {
    id: "media-resources",
    label: "媒体与资源",
    items: [
      { id: "media", label: "媒体素材库", to: "/admin/media" },
      { id: "gallery", label: "画廊专题", to: "/admin/gallery" },
      { id: "resources", label: "学习资料", to: "/admin/resources" },
      { id: "uploads", label: "上传任务", to: "/admin/uploads" }
    ]
  },
  {
    id: "system",
    label: "系统管理",
    items: [
      { id: "accounts", label: "管理员资格配置", to: "/admin/accounts" },
      { id: "logs", label: "操作日志", to: "/admin/logs" },
      { id: "recycle-bin", label: "回收站", to: "/admin/recycle-bin" }
    ]
  }
];

export const ADMIN_ROUTES = ADMIN_NAVIGATION.flatMap((group) =>
  group.items.map((item) => item.to)
);

export function getAdminNavigationForAccess(
  access: AdminNavigationAccess,
  features: ReleaseFeatures = RELEASE_FEATURES
) {
  return ADMIN_NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => (item.id !== "accounts" || access.canManageAdminAccounts)
        && (item.id !== "logs" || features.auditLog)
        && (item.id !== "recycle-bin" || features.recycleBin)
        && (item.id !== "uploads" || features.uploadTasks)
        && (item.id !== "batches" || features.recruitmentBatches)
    )
  })).filter((group) => group.items.length > 0);
}

export function getAdminNavigationState(path: string) {
  const matches = ADMIN_NAVIGATION.flatMap((group) =>
    group.items
      .filter((item) => path === item.to || path.startsWith(`${item.to}/`))
      .map((item) => ({
        groupId: group.id,
        itemId: item.id,
        matchLength: item.to.length
      }))
  ).sort((left, right) => right.matchLength - left.matchLength);

  const match = matches[0];
  return match
    ? { groupId: match.groupId, itemId: match.itemId }
    : { groupId: "dashboard", itemId: "dashboard" };
}

export function getAdminTopbarLabel(path: string) {
  const state = getAdminNavigationState(path);
  const group = ADMIN_NAVIGATION.find((item) => item.id === state.groupId);
  const page = group?.items.find((item) => item.id === state.itemId);
  return {
    group: group?.label ?? "工作台",
    page: page?.label ?? "管理工作台"
  };
}
