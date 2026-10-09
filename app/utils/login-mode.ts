import type { MockLoginResult } from "../data/admin-system";
import type { LoginMode } from "./login-continuation";
import { SessionApiError } from "../services/api-session.gateway";

export function getLoginApiErrorMessage(error: unknown): string {
  if (error instanceof SessionApiError) {
    if (error.kind === "configuration" || error.code === "API_ENDPOINT_CONFIGURATION_INVALID") {
      return "页面配置已失效，请刷新页面后重试。";
    }
    if (error.kind === "transport") {
      return "无法连接登录服务，请刷新页面后重试。";
    }
    if (error.kind === "timeout") {
      return "登录请求超时，请稍后重试。";
    }
    if (error.kind === "contract") {
      return "登录服务响应异常，请稍后重试。";
    }
    if (error.status === 401 && error.phase === "session_get" && error.credentialValidated) {
      return "账号验证已通过，但登录状态未能建立。请重试登录状态。";
    }
    switch (error.status) {
      case 401: return "账号或密码不正确。若已修改过密码，请使用修改后的密码。";
      case 409: return "登录期间账号状态发生变化，请重新登录。";
      case 423: return "该账号暂时锁定，请在剩余时间后重试。";
      case 429: return "该账号在当前网络尝试过于频繁，请稍后重试。";
      case 503: return "登录服务繁忙，请稍后重试。";
      default: return "登录失败，请稍后重试。";
    }
  }
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "登录请求超时，请稍后重试。";
  }
  if (error instanceof TypeError) return "页面出现异常，请刷新后重试。";
  return "登录失败，请稍后重试。";
}

export function getLoginDestination(
  continuation: { memberTarget: string; adminTarget: string },
  mode: LoginMode
): string {
  return mode === "admin" ? continuation.adminTarget : continuation.memberTarget;
}

export function getLoginErrorMessage(status: MockLoginResult["status"]): string {
  switch (status) {
    case "unknown-account":
      return "账号或密码不正确。若已修改过密码，请使用修改后的密码。";
    case "admin-access-missing":
      return "该账号未获管理员资格，请使用成员登录。";
    case "admin-access-disabled":
      return "该账号的管理员资格已停用，请联系联盟总负责人。";
    case "invalid_credentials":
      return "账号或密码不正确。若已修改过密码，请使用修改后的密码。";
    case "password_change_required":
      return "首次登录需要修改初始密码。";
    case "success":
      return "";
  }
}
