import { DEFAULT_FORMAL_MEMBER_PASSWORD } from "./member-account-form";

export interface PasswordChangeErrors {
  password?: string;
  confirmation?: string;
}

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;

const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "passwordpassword",
  "password1234567",
  "qwertyuiopasdfg",
  "letmeinletmein",
  "abcdefghijklmno",
  "123456789012345",
  "111111111111111",
  "aaaaaaaaaaaaaaa",
  "welcomewelcomewelcome",
  "adminadminadmin",
  "hsdhsdhsdhsdhsd",
]);

const MEMBER_HOME = "/member";
const PASSWORD_CHANGE_PATH = "/member/change-password";

export function validateNewPassword(
  password: string,
  confirmation: string,
): PasswordChangeErrors {
  const length = Array.from(password).length;
  if (password === DEFAULT_FORMAL_MEMBER_PASSWORD) {
    return { password: "新密码不能与初始密码相同。" };
  }
  if (length < MIN_PASSWORD_LENGTH) {
    return { password: `新密码至少 ${MIN_PASSWORD_LENGTH} 位。` };
  }
  if (length > MAX_PASSWORD_LENGTH) {
    return { password: `新密码不能超过 ${MAX_PASSWORD_LENGTH} 位。` };
  }
  if (isCommonWeakPassword(password)) {
    return { password: "请勿使用常见或容易猜测的密码。" };
  }
  if (password !== confirmation) {
    return { confirmation: "两次输入的密码不一致。" };
  }
  return {};
}

export function isCommonWeakPassword(password: string): boolean {
  const normalized = password.toLocaleLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(normalized)) return true;
  return /^(.)\1+$/u.test(password);
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
