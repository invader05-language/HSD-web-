import { describe, expect, it } from "vitest";
import { getAdminTopbarLabel } from "../../app/data/admin-platform";

describe("administration topbar wayfinding", () => {
  it("uses the current domain and page instead of a static recruitment label", () => {
    expect(getAdminTopbarLabel("/admin/projects")).toEqual({
      group: "项目与活动",
      page: "项目管理"
    });
    expect(getAdminTopbarLabel("/admin/media")).toEqual({
      group: "媒体与资源",
      page: "媒体素材库"
    });
    expect(getAdminTopbarLabel("/admin/roles")).toEqual({
      group: "系统与权限",
      page: "角色权限"
    });
  });
});
