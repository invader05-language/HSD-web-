import { BAIZE_DIRECTIONS, type BaizeDirection } from "../data/recruitment-application";

export interface MemberProfileDraftValues {
  center: string;
  baizeDirection?: BaizeDirection;
  bio: string;
}

export type MemberProfileFormErrors = Partial<Record<keyof MemberProfileDraftValues, string>>;

export const MAX_BIO_LENGTH = 500;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export function validateMemberProfileDraft(
  draft: MemberProfileDraftValues
): MemberProfileFormErrors {
  const errors: MemberProfileFormErrors = {};
  const bio = draft.bio.trim();

  if (draft.center === "白泽开发中心"
    && (!draft.baizeDirection || !BAIZE_DIRECTIONS.includes(draft.baizeDirection))) {
    errors.baizeDirection = "请选择白泽实践方向。";
  }

  if (bio.length > MAX_BIO_LENGTH) {
    errors.bio = `个人简介不能超过 ${MAX_BIO_LENGTH} 个字符。`;
  }

  return errors;
}

export function isSupportedAvatar(file: Pick<File, "type" | "size">): boolean {
  return SUPPORTED_AVATAR_TYPES.includes(file.type as (typeof SUPPORTED_AVATAR_TYPES)[number])
    && file.size <= MAX_AVATAR_BYTES;
}
