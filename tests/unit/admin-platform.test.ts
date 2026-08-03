import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ADMIN_NAVIGATION,
  ADMIN_ROUTES,
  getAdminNavigationForAccess,
  getAdminNavigationState
} from "../../app/data/admin-platform";
import {
  ADMIN_DASHBOARD_METRICS,
  ADMIN_TODOS
} from "../../app/data/admin-dashboard";

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
  it("links every overview metric to an actionable administration view", () => {
    expect(ADMIN_DASHBOARD_METRICS.map((metric) => metric.label)).toEqual([
      "待处理事项",
      "待审核内容",
      "待发布内容",
      "存储使用情况"
    ]);
    expect(
      ADMIN_DASHBOARD_METRICS.every((metric) => metric.to.startsWith("/admin/"))
    ).toBe(true);
  });

  it("orders urgent work before normal reminders", () => {
    expect(ADMIN_TODOS.map((todo) => todo.priority)).toEqual([
      "urgent",
      "urgent",
      "warning",
      "normal"
    ]);
    expect(ADMIN_TODOS.every((todo) => todo.to.startsWith("/admin/"))).toBe(true);
  });
});
