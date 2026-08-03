import type { MockLoginResult } from "../data/admin-system";
import type { LoginMode } from "./login-continuation";

export function getLoginDestination(
  continuation: { memberTarget: string; adminTarget: string },
  mode: LoginMode
): string {
  return mode === "admin" ? continuation.adminTarget : continuation.memberTarget;
}

export function getLoginErrorMessage(status: MockLoginResult["status"]): string {
  switch (status) {
    case "unknown-account":
      return "未找到该账号，请检查后重试。";
    case "admin-access-missing":
      return "该账号未获管理员资格，请使用成员登录。";
    case "admin-access-disabled":
      return "该账号的管理员资格已停用，请联系联盟总负责人。";
    case "success":
      return "";
  }
}
