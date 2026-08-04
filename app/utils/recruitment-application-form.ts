import {
  BAIZE_DIRECTIONS,
  RECRUITMENT_CENTERS,
  type RecruitmentApplicationDraft,
  type RegistrationProfileDraft,
} from "../data/recruitment-application";

export type RegistrationProfileErrors = Partial<Record<keyof RegistrationProfileDraft, string>>;
export type RecruitmentApplicationErrors = Partial<Record<keyof RecruitmentApplicationDraft, string>>;

const isBlank = (value: string | undefined) => !value?.trim();
const hasLengthBetween = (value: string | undefined, min: number, max: number) => {
  const length = value?.trim().length ?? 0;
  return length >= min && length <= max;
};

export function validateRegistrationProfileDraft(
  draft: RegistrationProfileDraft,
): RegistrationProfileErrors {
  const errors: RegistrationProfileErrors = {};

  if (!hasLengthBetween(draft.name, 2, 20)) errors.name = "姓名应为 2–20 个字符。";
  if (!/^\d{8,14}$/.test(draft.studentId.trim())) errors.studentId = "请输入 8–14 位数字学号。";
  if (isBlank(draft.grade)) errors.grade = "请选择年级。";
  if (!hasLengthBetween(draft.className, 2, 30)) errors.className = "班级应为 2–30 个字符。";
  if ((draft.bio?.trim().length ?? 0) > 180) errors.bio = "个人简介最多 180 个字符。";

  return errors;
}

export function validateRegistrationStep(
  profileDraft: RegistrationProfileDraft,
  applicationDraft: Pick<RecruitmentApplicationDraft, "contact">,
): RegistrationProfileErrors & Pick<RecruitmentApplicationErrors, "contact"> {
  const errors: RegistrationProfileErrors & Pick<RecruitmentApplicationErrors, "contact"> = {
    ...validateRegistrationProfileDraft(profileDraft),
  };
  if (!hasLengthBetween(applicationDraft.contact, 4, 50)) {
    errors.contact = "请填写 4–50 个字符的联系方式。";
  }
  return errors;
}

export function validateApplicationDraft(
  draft: RecruitmentApplicationDraft,
): RecruitmentApplicationErrors {
  const errors: RecruitmentApplicationErrors = {};
  const firstChoice = draft.firstChoice;
  const secondChoice = draft.secondChoice as string | undefined;
  const thirdChoice = draft.thirdChoice as string | undefined;
  const allowedLaterChoices = RECRUITMENT_CENTERS.filter((center) => center !== "白泽开发中心");
  const laterChoices = [draft.secondChoice, draft.thirdChoice].filter(Boolean);

  if (!firstChoice || !RECRUITMENT_CENTERS.includes(firstChoice)) errors.firstChoice = "请选择第一志愿。";

  if (secondChoice === "白泽开发中心") errors.secondChoice = "白泽开发中心只能作为第一志愿。";
  else if (secondChoice && !allowedLaterChoices.includes(secondChoice as (typeof allowedLaterChoices)[number])) errors.secondChoice = "请选择有效的第二志愿。";
  if (thirdChoice === "白泽开发中心") errors.thirdChoice = "白泽开发中心只能作为第一志愿。";
  else if (thirdChoice && !allowedLaterChoices.includes(thirdChoice as (typeof allowedLaterChoices)[number])) errors.thirdChoice = "请选择有效的第三志愿。";
  if (firstChoice && draft.secondChoice === firstChoice) errors.secondChoice = "第二志愿不能与第一志愿重复。";
  if (firstChoice && draft.thirdChoice === firstChoice) errors.thirdChoice = "第三志愿不能与第一志愿重复。";
  if (draft.secondChoice && draft.thirdChoice === draft.secondChoice) errors.thirdChoice = "第三志愿不能与第二志愿重复。";
  if (new Set(laterChoices).size !== laterChoices.length && !errors.thirdChoice) {
    errors.thirdChoice = "志愿不能重复。";
  }

  if (firstChoice === "白泽开发中心") {
    if (!draft.baizeDirection || !BAIZE_DIRECTIONS.includes(draft.baizeDirection)) {
      errors.baizeDirection = "请选择白泽意向方向。";
    }
  }

  if (draft.acceptsAdjustment === undefined) errors.acceptsAdjustment = "请选择是否接受调剂。";
  return errors;
}

export function validateConfirmation(confirmed: boolean): { confirmation?: string } {
  return confirmed ? {} : { confirmation: "请确认资料真实后再提交。" };
}
