import { describe, expect, it } from "vitest";
import {
  buildAdminForbiddenTarget,
  getRequiredAdminAccess,
  resolveProtectedRouteTarget
} from "../../app/utils/route-access";

const signedOut = {
  isAuthenticated: false,
  canAccessAdmin: false,
  canManageAdminAccounts: false,
  hasCapability: () => false
};

const member = {
  isAuthenticated: true,
  canAccessAdmin: false,
  canManageAdminAccounts: false,
  hasCapability: () => false
};

const admin = {
  isAuthenticated: true,
  canAccessAdmin: true,
  canManageAdminAccounts: false,
  hasCapability: () => false
};

const owner = {
  isAuthenticated: true,
  canAccessAdmin: true,
  canManageAdminAccounts: true,
  hasCapability: (capability: string) => capability === "portal.configure" || capability === "portal.publish"
};

const portalEditor = {
  isAuthenticated: true,
  canAccessAdmin: true,
  canManageAdminAccounts: false,
  hasCapability: (capability: string) => capability === "portal.configure"
};

describe("resolveProtectedRouteTarget", () => {
  it("sends signed-out admin visitors to administrator login mode", () => {
    expect(resolveProtectedRouteTarget("/admin/logs", "/admin/logs?query=release", signedOut))
      .toBe("/login?mode=admin&redirect=%2Fadmin%2Flogs%3Fquery%3Drelease");
  });

  it("keeps member continuations in member login mode", () => {
    expect(resolveProtectedRouteTarget("/member/results", "/member/results", signedOut))
      .toBe("/login?redirect=%2Fmember%2Fresults");
  });

  it("treats uppercase admin routes as protected administrator destinations", () => {
    expect(resolveProtectedRouteTarget("/ADMIN/ACCOUNTS", "/ADMIN/ACCOUNTS", signedOut))
      .toBe("/login?mode=admin&redirect=%2FADMIN%2FACCOUNTS");
  });

  it("denies members who try to enter an admin route", () => {
    expect(resolveProtectedRouteTarget("/admin", "/admin", member))
      .toBe("/admin/forbidden?from=%2Fadmin&required=center&reason=admin_access_required");
  });

  it("preserves the canonical denied account configuration target for administrators", () => {
    expect(resolveProtectedRouteTarget("/admin/accounts", "/admin/accounts", admin))
      .toBe("/admin/forbidden?from=%2Fadmin%2Faccounts&required=owner&reason=owner_required");
  });

  it("keeps the trailing-slash accounts route owner-only", () => {
    expect(resolveProtectedRouteTarget("/admin/accounts/", "/admin/accounts/", admin))
      .toBe("/admin/forbidden?from=%2Fadmin%2Faccounts&required=owner&reason=owner_required");
  });

  it("keeps nested member records owner-only", () => {
    expect(resolveProtectedRouteTarget(
      "/admin/members/member-lin",
      "/admin/members/member-lin?tab=internal",
      admin,
    )).toBe("/admin/forbidden?from=%2Fadmin%2Fmembers%2Fmember-lin%3Ftab%3Dinternal&required=owner&reason=owner_required");
    expect(resolveProtectedRouteTarget(
      "/admin/members/member-lin",
      "/admin/members/member-lin",
      owner,
    )).toBeUndefined();
    expect(getRequiredAdminAccess("/admin/members/member-lin/")).toBe("owner");
  });

  it("redirects the legacy roles address to accounts for owners", () => {
    expect(resolveProtectedRouteTarget("/admin/roles", "/admin/roles", owner))
      .toBe("/admin/accounts");
  });

  it("denies the legacy roles address to non-owner administrators", () => {
    expect(resolveProtectedRouteTarget("/admin/roles", "/admin/roles", admin))
      .toBe("/admin/forbidden?from=%2Fadmin%2Faccounts&required=owner&reason=owner_required");
  });

  it("redirects the trailing-slash legacy roles address for owners", () => {
    expect(resolveProtectedRouteTarget("/admin/roles/", "/admin/roles/", owner))
      .toBe("/admin/accounts");
  });

  it("allows administrators into regular admin modules", () => {
    expect(resolveProtectedRouteTarget("/admin/logs", "/admin/logs", admin)).toBeUndefined();
  });

  it("denies portal configuration routes when an administrator lacks portal.configure", () => {
    expect(resolveProtectedRouteTarget("/admin/content/home", "/admin/content/home?view=visuals", admin))
      .toBe("/admin/forbidden?from=%2Fadmin%2Fcontent%2Fhome%3Fview%3Dvisuals&required=scope&reason=portal_scope_required");
  });

  it("denies Help management when an administrator lacks portal.configure", () => {
    expect(resolveProtectedRouteTarget("/admin/content/help", "/admin/content/help", admin))
      .toBe("/admin/forbidden?from=%2Fadmin%2Fcontent%2Fhelp&required=scope&reason=portal_scope_required");
    expect(resolveProtectedRouteTarget("/admin/content/help", "/admin/content/help", owner)).toBeUndefined();
  });

  it("allows portal configuration routes from portal.configure rather than owner account management", () => {
    expect(resolveProtectedRouteTarget("/admin/content/home", "/admin/content/home", portalEditor)).toBeUndefined();
  });

  it("treats only the canonical account configuration source as owner-only", () => {
    expect(getRequiredAdminAccess("/admin/accounts/")).toBe("owner");
    expect(getRequiredAdminAccess(["/admin/accounts"])).toBe("admin");
    expect(getRequiredAdminAccess("https://example.com/admin/accounts")).toBe("admin");
  });

  it("recovers a qualified administrator from a structured forbidden target", () => {
    const forbidden = buildAdminForbiddenTarget("/admin/accounts", "owner", "owner_required");
    expect(forbidden).toBe("/admin/forbidden?from=%2Fadmin%2Faccounts&required=owner&reason=owner_required");
    expect(resolveProtectedRouteTarget("/admin/forbidden", forbidden, owner)).toBe("/admin/accounts");
    expect(resolveProtectedRouteTarget("/admin/forbidden", "/admin/forbidden", owner)).toBe("/admin");
    expect(resolveProtectedRouteTarget("/admin/forbidden", forbidden, admin)).toBe("/admin");
  });

  it("rejects an external forbidden continuation", () => {
    expect(resolveProtectedRouteTarget(
      "/admin/forbidden",
      "/admin/forbidden?from=https%3A%2F%2Fevil.example%2Fadmin",
      owner,
    )).toBe("/admin");
  });
});
