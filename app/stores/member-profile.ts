import { defineStore } from "pinia";
import { ADMIN_MEMBERS, type AdminMember } from "../data/admin-members";
import { MOCK_ACCOUNTS } from "../data/admin-system";
import { CENTER_SLUGS, type CenterSlug } from "../data/centers";
import {
  cloneMemberProfile,
  DEMO_APPLICANT_PROFILE,
  DEMO_MEMBER_PROFILE,
  MEMBER_DUTIES,
  type MemberProfile,
  type MemberProfilePatch,
  type MemberRegistrationProfilePatch,
} from "../data/member-profile";
import { isBaizeDirection } from "../data/recruitment-application";
import { getStaticPublicIdForMember } from "../data/people";
import { getCenterSlug } from "../utils/member-account-form";

export const MEMBER_PROFILE_STORAGE_KEY = "baiyun-hsd-member-profiles";
export const MEMBER_PROFILE_STORAGE_VERSION = 2;
const LEGACY_MEMBER_PROFILE_STORAGE_VERSIONS = [1, MEMBER_PROFILE_STORAGE_VERSION] as const;

interface PersistedMemberProfileState {
  version: typeof MEMBER_PROFILE_STORAGE_VERSION;
  profiles: Record<string, MemberProfile>;
}

function createPlatformMemberProfile(member: AdminMember): MemberProfile {
  const isFormal = member.identity === "正式成员";
  return {
    id: member.id,
    ...(isFormal
      ? {
          publicId: getStaticPublicIdForMember(member.id) ?? `platform-${member.id}`,
          centerSlug: getCenterSlug(member.center),
        }
      : {}),
    name: member.name,
    studentId: member.studentId,
    grade: member.grade,
    className: "待补充",
    center: member.center,
    memberDuty: member.memberDuty,
    identity: member.identity,
    ...(member.baizeDirection ? { baizeDirection: member.baizeDirection } : {}),
    bio: member.profileSummary,
    ...(member.avatarUrl ? { avatarUrl: member.avatarUrl } : {}),
    publicDirectoryVisible: false,
  };
}

function createInitialProfiles(): Record<string, MemberProfile> {
  return {
    ...Object.fromEntries(
      MOCK_ACCOUNTS
        .filter((account) => account.adminLevel !== "member")
        .map((account) => ADMIN_MEMBERS.find((member) => member.id === account.memberId))
        .filter((member): member is AdminMember => Boolean(member))
        .map((member) => [member.id, createPlatformMemberProfile(member)])
    ),
    [DEMO_MEMBER_PROFILE.id]: cloneMemberProfile(DEMO_MEMBER_PROFILE),
    [DEMO_APPLICANT_PROFILE.id]: cloneMemberProfile(DEMO_APPLICANT_PROFILE),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMemberProfile(value: unknown): value is MemberProfile {
  if (!isRecord(value)) return false;
  const requiredStrings = [
    "id",
    "name",
    "studentId",
    "grade",
    "className",
    "center",
    "identity",
    "bio",
  ];
  if (!requiredStrings.every((key) => typeof value[key] === "string")) return false;
  if (!MEMBER_DUTIES.includes(value.memberDuty as MemberProfile["memberDuty"])) return false;
  if (value.publicId !== undefined && typeof value.publicId !== "string") return false;
  if (value.centerSlug !== undefined
    && (typeof value.centerSlug !== "string"
      || !CENTER_SLUGS.includes(value.centerSlug as CenterSlug))) {
    return false;
  }
  if (value.baizeDirection !== undefined && !isBaizeDirection(value.baizeDirection)) return false;
  if (value.avatarUrl !== undefined && typeof value.avatarUrl !== "string") return false;
  if (value.publicDirectoryVisible !== undefined && typeof value.publicDirectoryVisible !== "boolean") return false;
  if (value.identity === "正式成员" && (!value.publicId || !value.centerSlug)) return false;
  return value.center === "白泽开发中心" || value.baizeDirection === undefined;
}

function cloneProfiles(profiles: Record<string, MemberProfile>): Record<string, MemberProfile> {
  return Object.fromEntries(
    Object.entries(profiles).map(([memberId, profile]) => [
      memberId,
      cloneMemberProfile(profile),
    ])
  );
}

function parsePersistedProfiles(serialized: string | null): Record<string, MemberProfile> | undefined {
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed)
      || !LEGACY_MEMBER_PROFILE_STORAGE_VERSIONS.includes(parsed.version as 1 | 2)
      || !isRecord(parsed.profiles)
      || !Object.values(parsed.profiles).every(isMemberProfile)
      || !Object.entries(parsed.profiles).every(([memberId, profile]) => (
        isMemberProfile(profile) && memberId === profile.id
      ))) {
      return undefined;
    }
    return cloneProfiles(parsed.profiles as Record<string, MemberProfile>);
  } catch {
    return undefined;
  }
}

function getProfileStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function restoreInitialOrPersistedProfiles(): Record<string, MemberProfile> {
  let serialized: string | null = null;
  try {
    serialized = getProfileStorage()?.getItem(MEMBER_PROFILE_STORAGE_KEY) ?? null;
  } catch {
    serialized = null;
  }
  const initialProfiles = createInitialProfiles();
  const persistedProfiles = parsePersistedProfiles(serialized);
  return persistedProfiles
    ? {
        ...initialProfiles,
        ...cloneProfiles(persistedProfiles),
      }
    : initialProfiles;
}

function createPersistedProfileState(
  profiles: Record<string, MemberProfile>,
): PersistedMemberProfileState {
  return {
    version: MEMBER_PROFILE_STORAGE_VERSION,
    profiles: cloneProfiles(profiles),
  };
}

export const useMemberProfileStore = defineStore("member-profile", {
  state: () => ({
    profiles: restoreInitialOrPersistedProfiles(),
  }),
  actions: {
    getProfile(memberId: string): MemberProfile {
      const profile = this.profiles[memberId];
      if (!profile) throw new Error(`成员档案不存在：${memberId}`);
      return profile;
    },
    createDraft(memberId: string): MemberProfile {
      return cloneMemberProfile(this.getProfile(memberId));
    },
    updateProfile(memberId: string, patch: MemberProfilePatch) {
      this.profiles[memberId] = cloneMemberProfile({
        ...this.getProfile(memberId),
        ...patch,
      });
    },
    registerProfile(memberId: string, patch: MemberRegistrationProfilePatch) {
      this.profiles[memberId] = cloneMemberProfile({
        ...this.getProfile(memberId),
        ...patch,
      });
    },
    addFormalProfile(profile: MemberProfile): boolean {
      if (this.profiles[profile.id]) return false;
      this.profiles[profile.id] = cloneMemberProfile(profile);
      return true;
    },
    replaceProfiles(profiles: Record<string, MemberProfile>) {
      this.profiles = cloneProfiles(profiles);
    },
    persistProfileState() {
      const storage = getProfileStorage();
      if (!storage) throw new Error("成员资料存储不可用");
      storage.setItem(
        MEMBER_PROFILE_STORAGE_KEY,
        JSON.stringify(createPersistedProfileState(this.profiles))
      );
    },
  },
});
