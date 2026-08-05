import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ADMIN_NAVIGATION,
  ADMIN_ROUTES,
  getAdminNavigationForAccess,
  getAdminNavigationState
} from "../../app/data/admin-platform";

describe("administration platform navigation", () => {
  it("exposes the seven confirmed business domains with a system management group", () => {
    expect(ADMIN_NAVIGATION.map((group) => group.label)).toEqual([
      "工作台",
      "招新与考核",
      "组织与成员",
      "项目与活动",
      "内容与门户",
      "媒体与资源",
      "系统管理"
    ]);
  });

  it("removes the role matrix from navigation and keeps account configuration owner-only", () => {
    expect(ADMIN_ROUTES).not.toContain("/admin/roles");
    expect(
      getAdminNavigationForAccess({ canManageAdminAccounts: false })
        .flatMap((group) => group.items)
        .map((item) => item.to)
    ).not.toContain("/admin/accounts");
    expect(
      getAdminNavigationForAccess({ canManageAdminAccounts: true })
        .flatMap((group) => group.items)
        .map((item) => item.to)
    ).toContain("/admin/accounts");
  });

  it("resolves nested routes to the correct navigation item", () => {
    expect(getAdminNavigationState("/admin/resources")).toEqual({
      groupId: "media-resources",
      itemId: "resources"
    });
    expect(getAdminNavigationState("/admin/members/member-lin")).toEqual({
      groupId: "organization",
      itemId: "members"
    });
  });

  it("publishes a unique route for every administration entry", () => {
    expect(new Set(ADMIN_ROUTES).size).toBe(ADMIN_ROUTES.length);
    expect(ADMIN_ROUTES.every((route) => route.startsWith("/admin"))).toBe(true);
  });

  it("does not retain the retired role matrix implementation surface", () => {
    const systemData = readFileSync("app/data/admin-system.ts", "utf8");
    const styles = readFileSync("app/assets/css/main.css", "utf8");

    expect(systemData).not.toContain("ADMIN_ROLES");
    expect(styles).not.toContain(".admin-role-layout");
  });
});

describe("administration dashboard", () => {
  it("keeps the dashboard as a semantic snapshot projection rather than static mock cards", () => {
    const page = readFileSync("app/pages/admin/index.vue", "utf8");

    expect(page).toContain('useAdminDashboard');
    expect(page).toContain('dashboardTargetToRoute');
    expect(page).not.toContain('ADMIN_DASHBOARD_METRICS');
    expect(page).not.toContain('ADMIN_TODOS');
    expect(page).not.toContain('ADMIN_STORAGE_OVERVIEW');
  });

  it("keeps direct dashboard actions limited to implemented destinations", () => {
    const page = readFileSync("app/pages/admin/index.vue", "utf8");

    expect(page).toContain('content.create');
    expect(page).toContain('member.create');
    expect(page).not.toContain('上传学习资料');
  });
});
