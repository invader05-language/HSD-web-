import { describe, expect, it } from "vitest";
import {
  getLoginDestination,
  getLoginErrorMessage,
  getLoginApiErrorMessage,
} from "../../app/utils/login-mode";
import { SessionApiError } from "../../app/services/api-session.gateway";

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

describe("getLoginApiErrorMessage", () => {
  it.each([
    [401, "INVALID_CREDENTIALS", "账号或密码不正确。若已修改过密码，请使用修改后的密码。"],
    [409, "AUTH_STATE_CHANGED", "登录期间账号状态发生变化，请重新登录。"],
    [423, "LOGIN_ACCOUNT_LOCKED", "该账号暂时锁定，请在剩余时间后重试。"],
    [429, "LOGIN_RATE_LIMITED", "该账号在当前网络尝试过于频繁，请稍后重试。"],
    [503, "AUTH_LOGIN_POLICY_UNAVAILABLE", "登录服务繁忙，请稍后重试。"],
  ])("shows safe copy for HTTP %i", (status, code, expected) => {
    expect(getLoginApiErrorMessage(new SessionApiError({ status, code, message: "internal reason" })))
      .toBe(expected);
  });

  it("identifies network failure without suggesting wrong credentials", () => {
    expect(getLoginApiErrorMessage(new TypeError("Failed to fetch")))
      .toBe("网络连接失败，请检查网络后重试。");
    expect(getLoginApiErrorMessage(new DOMException("timed out", "TimeoutError")))
      .toBe("登录请求超时，请稍后重试。");
  });
});

describe("getLoginErrorMessage", () => {
  it("explains why an account cannot start an administrator session", () => {
    expect(getLoginErrorMessage("unknown-account"))
      .toBe("账号或密码不正确。若已修改过密码，请使用修改后的密码。");
    expect(getLoginErrorMessage("admin-access-missing"))
      .toBe("该账号未获管理员资格，请使用成员登录。");
    expect(getLoginErrorMessage("admin-access-disabled"))
      .toBe("该账号的管理员资格已停用，请联系联盟总负责人。");
  });

  it("does not obscure a successful sign-in with an error", () => {
    expect(getLoginErrorMessage("success")).toBe("");
  });
});
