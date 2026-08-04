import { describe, expect, it } from "vitest";
import {
  buildPasswordChangeTarget,
  normalizePasswordChangeContinuation,
  validateNewPassword
} from "../../app/utils/password-change";
import { resolveProtectedRouteTarget } from "../../app/utils/route-access";

const restrictedMember = {
  isAuthenticated: true,
  canAccessAdmin: false,
  canManageAdminAccounts: false,
  mustChangePassword: true
};

describe("first-login password change", () => {
  it("rejects the initial password and mismatched confirmation", () => {
    expect(validateNewPassword("hsd1314", "hsd1314")).toEqual({
      password: "新密码不能与初始密码相同。"
    });
    expect(validateNewPassword("new-pass-2026", "different")).toEqual({
      confirmation: "两次输入的密码不一致。"
    });
  });

  it("requires a usable replacement password", () => {
    expect(validateNewPassword("short", "short")).toEqual({
      password: "新密码至少 8 位。"
    });
    expect(validateNewPassword("new-pass-2026", "new-pass-2026")).toEqual({});
  });

  it("keeps only safe member continuations", () => {
    expect(normalizePasswordChangeContinuation("/member/profile?tab=basic"))
      .toBe("/member/profile?tab=basic");
    expect(normalizePasswordChangeContinuation("/admin/accounts")).toBe("/member");
    expect(normalizePasswordChangeContinuation("https://example.com/member")).toBe("/member");
    expect(normalizePasswordChangeContinuation("/member/change-password")).toBe("/member");
    expect(buildPasswordChangeTarget("/member/profile?tab=basic"))
      .toBe("/member/change-password?redirect=%2Fmember%2Fprofile%3Ftab%3Dbasic");
  });

  it("rejects member continuations containing backslashes", () => {
    expect(normalizePasswordChangeContinuation("/member/\\\\evil.example")).toBe("/member");
  });

  it("rejects member continuations with a protocol-relative path", () => {
    expect(normalizePasswordChangeContinuation("/member//evil.example")).toBe("/member");
  });

  it("allows only the change-password route while the session is restricted", () => {
    expect(resolveProtectedRouteTarget(
      "/member/profile",
      "/member/profile?tab=basic",
      restrictedMember
    )).toBe("/member/change-password?redirect=%2Fmember%2Fprofile%3Ftab%3Dbasic");
    expect(resolveProtectedRouteTarget(
      "/admin",
      "/admin",
      restrictedMember
    )).toBe("/member/change-password?redirect=%2Fmember");
    expect(resolveProtectedRouteTarget(
      "/people/members",
      "/people/members",
      restrictedMember
    )).toBe("/member/change-password?redirect=%2Fmember");
    expect(resolveProtectedRouteTarget(
      "/member/change-password",
      "/member/change-password?redirect=%2Fmember%2Fprofile",
      restrictedMember
    )).toBeUndefined();
  });
});
