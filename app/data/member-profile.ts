import type { AdminMember } from "./admin-members";
import type { PublicPerson } from "./people";

export interface MemberProfile {
  id: string;
  publicId: string;
  name: string;
  studentId: string;
  grade: string;
  className: string;
  center: string;
  centerSlug: PublicPerson["centerSlug"];
  role: string;
  identity: string;
  direction: string;
  bio: string;
  avatarUrl?: string;
}

export type MemberProfilePatch = Pick<MemberProfile, "direction" | "bio" | "avatarUrl">;
export type MemberRegistrationProfilePatch = Pick<
  MemberProfile,
  "name" | "studentId" | "grade" | "className" | "direction" | "bio" | "avatarUrl"
>;

export const DEMO_MEMBER_PROFILE: MemberProfile = {
  id: "member-lin",
  publicId: "lin-development",
  name: "林同学",
  studentId: "20260001",
  grade: "2026 级",
  className: "软件工程 1 班",
  center: "白泽开发中心",
  centerSlug: "baize-development",
  role: "应用开发成员",
  identity: "正式成员",
  direction: "HarmonyOS 与项目工程化",
  bio: "关注原生应用开发与团队协作，希望把每次练习沉淀为可演示的项目成果。",
};

export function cloneMemberProfile(profile: MemberProfile): MemberProfile {
  return { ...profile };
}

export function projectMemberToPublic(
  profile: MemberProfile,
  base: PublicPerson
): PublicPerson {
  const projected = {
    ...base,
    name: profile.name,
    direction: profile.direction,
    bio: profile.bio,
  };

  if (profile.avatarUrl) {
    return {
      ...projected,
      avatarVisible: true,
      avatarUrl: profile.avatarUrl,
    };
  }

  const { avatarUrl: _baseAvatarUrl, ...withoutAvatarUrl } = projected;
  return {
    ...withoutAvatarUrl,
    avatarVisible: false,
  };
}

export function projectMemberToAdmin(
  profile: MemberProfile,
  base: AdminMember
): AdminMember {
  return {
    ...base,
    name: profile.name,
    studentId: profile.studentId,
    center: profile.center as AdminMember["center"],
    grade: profile.grade,
    direction: profile.direction,
    profileSummary: profile.bio,
    avatarUrl: profile.avatarUrl ?? null,
    avatarVisible: Boolean(profile.avatarUrl),
  };
}
