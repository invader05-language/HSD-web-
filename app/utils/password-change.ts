import { DEFAULT_FORMAL_MEMBER_PASSWORD } from "./member-account-form";

export interface PasswordChangeErrors {
  password?: string;
  confirmation?: string;
}

const MEMBER_HOME = "/member";
const PASSWORD_CHANGE_PATH = "/member/change-password";

export function validateNewPassword(
  password: string,
  confirmation: string,
): PasswordChangeErrors {
  if (password === DEFAULT_FORMAL_MEMBER_PASSWORD) {
    return { password: "新密码不能与初始密码相同。" };
  }
  if (password.length < 8) {
    return { password: "新密码至少 8 位。" };
  }
  if (password !== confirmation) {
    return { confirmation: "两次输入的密码不一致。" };
  }
  return {};
}

export function normalizePasswordChangeContinuation(value: unknown): string {
  if (typeof value !== "string" || !/^\/member(?:[/?#]|$)/i.test(value)) {
    return MEMBER_HOME;
  }
  const path = value.split(/[?#]/, 1)[0] ?? "";
  if (value.includes("\\") || path.includes("//")) {
    return MEMBER_HOME;
  }
  const normalizedPath = path.replace(/\/+$/, "").toLowerCase();
  return normalizedPath === PASSWORD_CHANGE_PATH ? MEMBER_HOME : value;
}

export function buildPasswordChangeTarget(value: unknown): string {
  const continuation = normalizePasswordChangeContinuation(value);
  return `${PASSWORD_CHANGE_PATH}?redirect=${encodeURIComponent(continuation)}`;
}
