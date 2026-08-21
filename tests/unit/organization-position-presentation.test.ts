import { describe, expect, it } from "vitest";
import { getAdminNavigationForAccess } from "../../app/data/admin-platform";
import { getOrganizationPositionLabel } from "../../app/utils/organization-positions";
import { resolveProtectedRouteTarget } from "../../app/utils/route-access";

describe("organization position presentation", () => {
  it("uses the fixed position dictionary instead of deriving a title from admin level", () => {
    expect(getOrganizationPositionLabel("ALLIANCE_OWNER")).toBe("联盟负责人");
    expect(getOrganizationPositionLabel("CENTER_MINISTER")).toBe("部长");
    expect(getOrganizationPositionLabel("PROJECT_LEAD")).toBe("项目负责人");
  });

  it("keeps organization-personnel controls out of an ADMIN navigation while retaining business navigation", () => {
    const navigation = getAdminNavigationForAccess({
      canManageAdminAccounts: false,
      canConfigurePortal: false,
    });

    expect(navigation.flatMap((group) => group.items).map((item) => item.id)).toContain("projects");
    expect(navigation.flatMap((group) => group.items).map((item) => item.id)).not.toContain("members");
    expect(navigation.flatMap((group) => group.items).map((item) => item.id)).not.toContain("core-members");
    expect(navigation.flatMap((group) => group.items).map((item) => item.id)).not.toContain("centers");
  });

  it("redirects an ADMIN away from organization personnel routes but leaves business routes accessible", () => {
    const admin = {
      isAuthenticated: true,
      canAccessAdmin: true,
      canManageAdminAccounts: false,
      hasCapability: () => false,
    };

    expect(resolveProtectedRouteTarget("/admin/members", "/admin/members", admin)).toBe("/admin/forbidden?from=%2Fadmin%2Fmembers");
    expect(resolveProtectedRouteTarget("/admin/projects", "/admin/projects", admin)).toBeUndefined();
  });
});
