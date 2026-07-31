import { defineStore } from "pinia";
import {
  cloneMemberProfile,
  DEMO_MEMBER_PROFILE,
  type MemberProfile,
  type MemberProfilePatch,
  type MemberRegistrationProfilePatch,
} from "../data/member-profile";

export const useMemberProfileStore = defineStore("member-profile", {
  state: () => ({
    currentMemberId: DEMO_MEMBER_PROFILE.id,
    profiles: {
      [DEMO_MEMBER_PROFILE.id]: cloneMemberProfile(DEMO_MEMBER_PROFILE),
    } as Record<string, MemberProfile>,
  }),
  getters: {
    currentMember(state): MemberProfile {
      return state.profiles[state.currentMemberId] ?? DEMO_MEMBER_PROFILE;
    },
  },
  actions: {
    createDraft(): MemberProfile {
      return cloneMemberProfile(this.currentMember);
    },
    updateOwnProfile(patch: MemberProfilePatch) {
      this.profiles[this.currentMemberId] = {
        ...this.currentMember,
        ...patch,
      };
    },
    registerOwnProfile(patch: MemberRegistrationProfilePatch) {
      this.profiles[this.currentMemberId] = {
        ...this.currentMember,
        ...patch,
      };
    },
  },
});
