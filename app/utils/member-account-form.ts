import type { AdminCenter } from "../data/admin-members";
import { MEMBER_DUTIES, type MemberDuty } from "../data/member-profile";
import {
  BAIZE_DIRECTIONS,
  RECRUITMENT_CENTERS,
  isBaizeDirection,
  type BaizeDirection,
} from "../data/recruitment-application";
import type { CenterSlug } from "../data/centers";

export const DEFAULT_FORMAL_MEMBER_PASSWORD = "hsd1314";

export interface CreateFormalMemberInput {
  name: string;
  studentId: string;
  grade: string;
  className: string;
  center: AdminCenter;
  memberDuty: MemberDuty;
  baizeDirection?: BaizeDirection;
  bio: string;
  avatarUrl?: string;
}

export type CreateFormalMemberResult =
  | { status: "success"; memberId: string; accountId: string }
  | { status: "duplicate_student_id" }
  | { status: "invalid_input"; errors: Record<string, string> }
  | { status: "storage_unavailable" };

export type CreateFormalMemberErrors = Partial<Record<keyof CreateFormalMemberInput, string>>;

const CENTER_SLUG_BY_NAME: Record<AdminCenter, CenterSlug> = {
  "白泽开发中心": "baize-development",
  "新媒体中心": "new-media",
  "拓维策划中心": "tuowei-planning",
  "人才发展中心": "talent-development",
};

export function getCenterSlug(center: AdminCenter): CenterSlug {
  return CENTER_SLUG_BY_NAME[center];
}

export function validateCreateFormalMemberInput(
  input: CreateFormalMemberInput,
): CreateFormalMemberErrors {
  const errors: CreateFormalMemberErrors = {};
  if (!input.name.trim()) errors.name = "请输入成员姓名。";
  if (!input.studentId.trim()) errors.studentId = "请输入学号。";
  if (!input.grade.trim()) errors.grade = "请输入年级。";
  if (!input.className.trim()) errors.className = "请输入班级。";
  if (!(RECRUITMENT_CENTERS as readonly unknown[]).includes(input.center)) {
    errors.center = "请选择所属中心。";
  }
  if (!(MEMBER_DUTIES as readonly unknown[]).includes(input.memberDuty)) {
    errors.memberDuty = "请选择成员职责。";
  }
  if (input.center === "白泽开发中心" && !isBaizeDirection(input.baizeDirection)) {
    errors.baizeDirection = "请选择白泽实践方向。";
  }
  return errors;
}

export function normalizeCreateFormalMemberInput(
  input: CreateFormalMemberInput,
): CreateFormalMemberInput {
  return {
    name: input.name.trim(),
    studentId: input.studentId.trim(),
    grade: input.grade.trim(),
    className: input.className.trim(),
    center: input.center,
    memberDuty: input.memberDuty,
    ...(input.center === "白泽开发中心" && isBaizeDirection(input.baizeDirection)
      ? { baizeDirection: input.baizeDirection }
      : {}),
    bio: input.bio.trim(),
    ...(input.avatarUrl?.trim() ? { avatarUrl: input.avatarUrl.trim() } : {}),
  };
}

export { BAIZE_DIRECTIONS, MEMBER_DUTIES, RECRUITMENT_CENTERS };
