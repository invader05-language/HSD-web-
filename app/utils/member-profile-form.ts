import { BAIZE_DIRECTIONS, type BaizeDirection } from "../data/recruitment-application";

export interface MemberProfileDraftValues {
  name: string;
  grade: string;
  className: string;
  center: string;
  baizeDirection?: BaizeDirection;
  bio: string;
}

export type MemberProfileFormErrors = Partial<Record<keyof MemberProfileDraftValues, string>>;

export const MAX_BIO_LENGTH = 500;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AvatarValidationErrorCode = "empty" | "type" | "size";

export type AvatarValidationResult =
  | { valid: true }
  | { valid: false; code: AvatarValidationErrorCode; message: string };

/** Keep the member-facing label stable while accepting the API's year-only value. */
export function normalizeMemberGrade(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  const compact = trimmed.replace(/\s+/g, "");
  if (/^\d{4}$/.test(compact)) return `${compact} 级`;
  if (/^\d{4}级$/.test(compact)) return `${compact.slice(0, -1)} 级`;
  return trimmed;
}

/** Serialize the canonical UI label back to the API's year-only format. */
export function serializeMemberGrade(value: string | null | undefined): string {
  const normalized = normalizeMemberGrade(value);
  const match = normalized.match(/^(\d{4})\s*级$/);
  return match?.[1] ?? normalized;
}

export function validateMemberProfileDraft(
  draft: MemberProfileDraftValues
): MemberProfileFormErrors {
  const errors: MemberProfileFormErrors = {};
  const name = draft.name.trim();
  const grade = draft.grade.trim();
  const className = draft.className.trim();
  const bio = draft.bio.trim();

  if (name.length < 2 || name.length > 20) errors.name = "姓名应为 2–20 个字符。";
  if (!grade || grade.length > 12) errors.grade = "请填写不超过 12 个字符的年级。";
  if (className.length < 2 || className.length > 30) errors.className = "班级应为 2–30 个字符。";

  if (draft.center === "白泽开发中心"
    && (!draft.baizeDirection || !BAIZE_DIRECTIONS.includes(draft.baizeDirection))) {
    errors.baizeDirection = "请选择白泽实践方向。";
  }

  if (bio.length > MAX_BIO_LENGTH) {
    errors.bio = `个人简介不能超过 ${MAX_BIO_LENGTH} 个字符。`;
  }

  return errors;
}

export function validateAvatarFile(file: Pick<File, "type" | "size">): AvatarValidationResult {
  if (file.size <= 0) {
    return { valid: false, code: "empty", message: "请选择不为空的图片文件。" };
  }
  if (!SUPPORTED_AVATAR_TYPES.includes(file.type as (typeof SUPPORTED_AVATAR_TYPES)[number])) {
    return { valid: false, code: "type", message: "请选择 JPG、PNG 或 WEBP 图片。" };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { valid: false, code: "size", message: "图片文件不能超过 5 MiB。" };
  }
  return { valid: true };
}

export function isSupportedAvatar(file: Pick<File, "type" | "size">): boolean {
  return validateAvatarFile(file).valid;
}
