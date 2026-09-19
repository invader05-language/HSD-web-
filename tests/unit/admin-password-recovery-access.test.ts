import { describe, expect, it } from "vitest";
import { getAdminNavigationForAccess } from "../../app/data/admin-platform";
import { getRequiredAdminAccess, resolveProtectedRouteTarget } from "../../app/utils/route-access";

describe("password recovery owner boundary", () => {
  it("shows the queue only to the alliance owner", () => {
    expect(getAdminNavigationForAccess({ canManageAdminAccounts: false }).flatMap((group) => group.items).map((item) => item.to)).not.toContain("/admin/password-recovery");
    expect(getAdminNavigationForAccess({ canManageAdminAccounts: true }).flatMap((group) => group.items).map((item) => item.to)).toContain("/admin/password-recovery");
  });
  it("protects the route as an owner-only admin route", () => {
    expect(getRequiredAdminAccess("/admin/password-recovery")).toBe("owner");
    expect(resolveProtectedRouteTarget("/admin/password-recovery", "/admin/password-recovery", { isAuthenticated: true, canAccessAdmin: true, canManageAdminAccounts: false })).toContain("/admin/forbidden");
  });
});
