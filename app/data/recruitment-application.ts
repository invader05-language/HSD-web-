import type { MemberProfile } from "./member-profile";

export const RECRUITMENT_CENTERS = [
  "白泽开发中心",
  "新媒体中心",
  "拓维策划中心",
  "人才发展中心",
] as const;

export const BAIZE_DIRECTIONS = [
  "鸿蒙开发",
  "后端架构",
  "大模型 AIGC",
  "UI/UX 设计",
  "嵌入式开发",
] as const;

export type RecruitmentCenter = (typeof RECRUITMENT_CENTERS)[number];
export type BaizeDirection = (typeof BAIZE_DIRECTIONS)[number];
export type LaterChoice = Exclude<RecruitmentCenter, "白泽开发中心">;

export type RegistrationProfileDraft = Pick<
  MemberProfile,
  "name" | "studentId" | "grade" | "className" | "bio" | "avatarUrl"
>;

export interface RecruitmentApplicationDraft {
  contact: string;
  firstChoice?: RecruitmentCenter;
  secondChoice?: LaterChoice;
  thirdChoice?: LaterChoice;
  baizeDirection?: BaizeDirection;
  acceptsAdjustment?: boolean;
}

export interface SubmittedRecruitmentApplication extends Required<
  Omit<RecruitmentApplicationDraft, "secondChoice" | "thirdChoice" | "baizeDirection">
> {
  memberId: string;
  secondChoice?: LaterChoice;
  thirdChoice?: LaterChoice;
  baizeDirection?: BaizeDirection;
  status: "submitted";
  submittedAt: string;
}

export const PREPARATORY_MEMBER_STATUS = {
  identityLabel: "预备成员",
  assignedCenter: null,
  organizationRole: null,
} as const;

export function createRegistrationProfileDraft(profile: MemberProfile): RegistrationProfileDraft {
  return {
    name: profile.name,
    studentId: profile.studentId,
    grade: profile.grade,
    className: profile.className,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
  };
}

export function createRecruitmentApplicationDraft(): RecruitmentApplicationDraft {
  return {
    contact: "",
    firstChoice: undefined,
    secondChoice: undefined,
    thirdChoice: undefined,
    baizeDirection: undefined,
    acceptsAdjustment: undefined,
  };
}

export function cloneRecruitmentApplicationDraft(
  draft: RecruitmentApplicationDraft,
): RecruitmentApplicationDraft {
  return { ...draft };
}
