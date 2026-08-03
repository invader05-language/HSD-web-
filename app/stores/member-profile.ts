import { defineStore } from "pinia";
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

export const MEMBER_PROFILE_STORAGE_KEY = "baiyun-hsd-member-profiles";
export const MEMBER_PROFILE_STORAGE_VERSION = 1;

interface PersistedMemberProfileState {
  version: typeof MEMBER_PROFILE_STORAGE_VERSION;
  profiles: Record<string, MemberProfile>;
}

function createInitialProfiles(): Record<string, MemberProfile> {
  return {
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
      || parsed.version !== MEMBER_PROFILE_STORAGE_VERSION
      || !isRecord(parsed.profiles)
      || !Object.values(parsed.profiles).every(isMemberProfile)
      || !Object.entries(parsed.profiles).every(([memberId, profile]) => (
        isMemberProfile(profile) && memberId === profile.id
      ))
      || !isMemberProfile(parsed.profiles[DEMO_MEMBER_PROFILE.id])
      || !isMemberProfile(parsed.profiles[DEMO_APPLICANT_PROFILE.id])) {
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
  return parsePersistedProfiles(serialized) ?? createInitialProfiles();
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
