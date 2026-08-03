import { describe, expect, it } from "vitest";
import {
  getLoginDestination,
  getLoginErrorMessage
} from "../../app/utils/login-mode";

describe("getLoginDestination", () => {
  it("keeps member-mode sign-in out of an admin continuation", () => {
    expect(getLoginDestination({ memberTarget: "/member", adminTarget: "/admin/logs" }, "member"))
      .toBe("/member");
  });

  it("restores the saved admin continuation in administrator mode", () => {
    expect(getLoginDestination({ memberTarget: "/join/apply", adminTarget: "/admin/logs" }, "admin"))
      .toBe("/admin/logs");
  });
});

describe("getLoginErrorMessage", () => {
  it("explains why an account cannot start an administrator session", () => {
    expect(getLoginErrorMessage("unknown-account"))
      .toBe("未找到该账号，请检查后重试。");
    expect(getLoginErrorMessage("admin-access-missing"))
      .toBe("该账号未获管理员资格，请使用成员登录。");
    expect(getLoginErrorMessage("admin-access-disabled"))
      .toBe("该账号的管理员资格已停用，请联系联盟总负责人。");
  });

  it("does not obscure a successful sign-in with an error", () => {
    expect(getLoginErrorMessage("success")).toBe("");
  });
});
