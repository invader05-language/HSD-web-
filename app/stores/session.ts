import { defineStore } from "pinia";
import { DEMO_MEMBER_PROFILE } from "../data/member-profile";
import { useMemberProfileStore } from "./member-profile";

export const useSessionStore = defineStore("session", {
  state: () => ({
    isAuthenticated: false,
    currentMemberId: DEMO_MEMBER_PROFILE.id
  }),
  getters: {
    currentMember() {
      return useMemberProfileStore().currentMember;
    },
    memberName(): string {
      return this.currentMember.name;
    },
    memberAvatarUrl(): string | undefined {
      return this.currentMember.avatarUrl;
    }
  },
  actions: {
    signIn() {
      this.isAuthenticated = true;
      this.currentMemberId = DEMO_MEMBER_PROFILE.id;
    },
    signOut() {
      this.isAuthenticated = false;
    }
  }
});
