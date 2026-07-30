import { describe, expect, it } from "vitest";
import {
  ADMIN_NAVIGATION,
  ADMIN_ROUTES,
  getAdminNavigationState
} from "../../app/data/admin-platform";
import {
  ADMIN_DASHBOARD_METRICS,
  ADMIN_TODOS
} from "../../app/data/admin-dashboard";

describe("administration platform navigation", () => {
  it("exposes the seven confirmed business domains", () => {
    expect(ADMIN_NAVIGATION.map((group) => group.label)).toEqual([
      "工作台",
      "招新与考核",
      "组织与成员",
      "项目与活动",
      "内容与门户",
      "媒体与资源",
      "系统与权限"
    ]);
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
