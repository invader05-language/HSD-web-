import { defineStore } from "pinia";
import {
  cloneMemberProfile,
  DEMO_APPLICANT_PROFILE,
  DEMO_MEMBER_PROFILE,
  type MemberProfile,
  type MemberProfilePatch,
  type MemberRegistrationProfilePatch,
} from "../data/member-profile";

export const useMemberProfileStore = defineStore("member-profile", {
  state: () => ({
    profiles: {
      [DEMO_MEMBER_PROFILE.id]: cloneMemberProfile(DEMO_MEMBER_PROFILE),
      [DEMO_APPLICANT_PROFILE.id]: cloneMemberProfile(DEMO_APPLICANT_PROFILE),
    } as Record<string, MemberProfile>,
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
  },
});
