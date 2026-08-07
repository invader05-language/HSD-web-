import { describe, expect, it } from "vitest";
import { getAdminTopbarLabel } from "../../app/data/admin-platform";

describe("administration topbar wayfinding", () => {
  it("uses the current domain and page instead of a static recruitment label", () => {
    expect(getAdminTopbarLabel("/admin/projects")).toEqual({
      group: "项目与活动",
      page: "项目管理"
    });
    expect(getAdminTopbarLabel("/admin/gallery")).toEqual({
      group: "媒体与资源",
      page: "画廊专题"
    });
    expect(getAdminTopbarLabel("/admin/accounts")).toEqual({
      group: "系统管理",
      page: "管理员资格配置"
    });
  });
});
