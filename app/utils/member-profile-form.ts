export interface MemberProfileDraftValues {
  direction: string;
  bio: string;
}

export type MemberProfileFormErrors = Partial<Record<keyof MemberProfileDraftValues, string>>;

export const MAX_DIRECTION_LENGTH = 80;
export const MAX_BIO_LENGTH = 500;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export function validateMemberProfileDraft(
  draft: MemberProfileDraftValues
): MemberProfileFormErrors {
  const errors: MemberProfileFormErrors = {};
  const direction = draft.direction.trim();
  const bio = draft.bio.trim();

  if (!direction) errors.direction = "请填写实践方向。";
  else if (direction.length > MAX_DIRECTION_LENGTH) {
    errors.direction = `实践方向不能超过 ${MAX_DIRECTION_LENGTH} 个字符。`;
  }

  if (!bio) errors.bio = "请填写个人简介。";
  else if (bio.length > MAX_BIO_LENGTH) {
    errors.bio = `个人简介不能超过 ${MAX_BIO_LENGTH} 个字符。`;
  }

  return errors;
}

export function isSupportedAvatar(file: Pick<File, "type" | "size">): boolean {
  return SUPPORTED_AVATAR_TYPES.includes(file.type as (typeof SUPPORTED_AVATAR_TYPES)[number])
    && file.size <= MAX_AVATAR_BYTES;
}
