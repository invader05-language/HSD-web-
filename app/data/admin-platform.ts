import { RELEASE_FEATURES, type ReleaseFeatures } from "../config/release-features";

export interface AdminNavigationItem {
  id: string;
  label: string;
  to: string;
  feature?: keyof ReleaseFeatures;
}

export interface AdminNavigationGroup {
  id: string;
  label: string;
  items: AdminNavigationItem[];
}

export interface AdminNavigationAccess {
  canManageAdminAccounts: boolean;
  canManageOrganizationPersonnel?: boolean;
  canConfigurePortal?: boolean;
}

export interface AdminNavigationRuntime {
  useMockApi: boolean;
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
      { id: "batches", label: "招新批次", to: "/admin/recruitment/batches", feature: "recruitmentBatches" }
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
      { id: "content", label: "官网内容", to: "/admin/content" },
      { id: "homepage", label: "门户配置", to: "/admin/content/home" },
      { id: "help", label: "帮助中心", to: "/admin/content/help", feature: "helpCenter" }
    ]
  },
  {
    id: "media-resources",
    label: "媒体与资源",
    items: [
      { id: "gallery", label: "画廊专题", to: "/admin/gallery" },
      { id: "resources", label: "学习资料", to: "/admin/resources" },
      { id: "uploads", label: "上传任务", to: "/admin/uploads", feature: "uploadTasks" }
    ]
  },
  {
    id: "system",
    label: "系统管理",
    items: [
      { id: "accounts", label: "管理员资格配置", to: "/admin/accounts" },
      { id: "logs", label: "操作日志", to: "/admin/logs", feature: "auditLog" }
    ]
  }
];

export const ADMIN_ROUTES = ADMIN_NAVIGATION.flatMap((group) =>
  group.items.map((item) => item.to)
);

export function getAdminNavigationForAccess(
  access: AdminNavigationAccess,
  features: ReleaseFeatures = RELEASE_FEATURES,
  runtime: AdminNavigationRuntime = { useMockApi: true },
) {
  const canManageOrganizationPersonnel = access.canManageOrganizationPersonnel ?? access.canManageAdminAccounts;
  const canConfigurePortal = access.canConfigurePortal ?? access.canManageAdminAccounts;
  const navigation = ADMIN_NAVIGATION;
  return navigation.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => (item.id !== "accounts" || access.canManageAdminAccounts)
        && (!["members", "core-members", "centers"].includes(item.id) || canManageOrganizationPersonnel)
        && (item.id !== "homepage" || canConfigurePortal)
        && (item.id !== "help" || canConfigurePortal)
        && (item.feature === undefined || features[item.feature])
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
