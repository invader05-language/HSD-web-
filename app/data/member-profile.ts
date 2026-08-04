import type { AdminMember } from "./admin-members";
import type { PublicPerson } from "./people";
import type { BaizeDirection } from "./recruitment-application";

export const MEMBER_DUTIES = ["普通成员", "核心人员"] as const;
export type MemberDuty = (typeof MEMBER_DUTIES)[number];

export interface MemberProfile {
  id: string;
  publicId?: string;
  name: string;
  studentId: string;
  grade: string;
  className: string;
  center: string;
  centerSlug?: PublicPerson["centerSlug"];
  memberDuty: MemberDuty;
  identity: string;
  baizeDirection?: BaizeDirection;
  bio: string;
  avatarUrl?: string;
}

export type MemberProfilePatch = Partial<Pick<MemberProfile, "baizeDirection" | "bio" | "avatarUrl">>;
export type MemberRegistrationProfilePatch = Pick<
  MemberProfile,
  "name" | "studentId" | "grade" | "className" | "bio" | "avatarUrl"
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
  memberDuty: "核心人员",
  identity: "正式成员",
  baizeDirection: "鸿蒙开发",
  bio: "关注原生应用开发与团队协作，希望把每次练习沉淀为可演示的项目成果。",
};

export const DEMO_APPLICANT_PROFILE: MemberProfile = {
  id: "applicant-chen",
  name: "陈同学",
  studentId: "20260026",
  grade: "2026 级",
  className: "软件工程 2 班",
  center: "待确定",
  memberDuty: "普通成员",
  identity: "预备成员",
  bio: "希望通过真实项目协作持续积累技术、沟通与交付经验。",
};

export function isFormalMemberProfile(
  profile: MemberProfile,
): profile is MemberProfile & Required<Pick<MemberProfile, "publicId" | "centerSlug">> {
  return profile.identity === "正式成员"
    && Boolean(profile.publicId)
    && Boolean(profile.centerSlug);
}

export function cloneMemberProfile(profile: MemberProfile): MemberProfile {
  const clone = { ...profile };
  if (clone.center !== "白泽开发中心") delete clone.baizeDirection;
  return clone;
}

export function projectMemberToPublic(
  profile: MemberProfile,
  base?: PublicPerson,
  centerLeadership?: AdminMember["centerLeadership"],
  coreOverride?: boolean,
): PublicPerson {
  const centerSlug = profile.centerSlug ?? base?.centerSlug;
  if (!centerSlug) throw new Error(`正式成员缺少中心标识：${profile.id}`);
  const isCore = coreOverride ?? (profile.memberDuty === "核心人员" || Boolean(centerLeadership));

  const projected = {
    id: profile.publicId ?? base?.id ?? profile.id,
    name: profile.name,
    memberDuty: isCore ? "核心人员" : profile.memberDuty,
    centerSlug,
    centerName: profile.center,
    bio: profile.bio,
    isCore,
    order: base?.order ?? Number.MAX_SAFE_INTEGER,
    honors: base?.honors ?? [],
    baizeDirection: base?.baizeDirection,
  };

  if (profile.center === "白泽开发中心" && profile.baizeDirection) {
    projected.baizeDirection = profile.baizeDirection;
  } else {
    delete projected.baizeDirection;
  }

  if (profile.avatarUrl) {
    return {
      ...projected,
      avatarVisible: true,
      avatarUrl: profile.avatarUrl,
    };
  }

  return {
    ...projected,
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
    identity: profile.identity as AdminMember["identity"],
    grade: profile.grade,
    memberDuty: profile.memberDuty,
    baizeDirection: profile.center === "白泽开发中心"
      ? profile.baizeDirection
      : undefined,
    profileSummary: profile.bio,
    avatarUrl: profile.avatarUrl ?? null,
  };
}
