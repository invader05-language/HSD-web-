import { defineStore } from "pinia";
import { DEMO_APPLICANT_PROFILE, DEMO_MEMBER_PROFILE } from "../data/member-profile";

export const DEMO_MEMBER_ACCOUNT = "demo-member";
export const DEMO_APPLICANT_ACCOUNT = "demo-applicant";

export function resolveDemoMemberId(account: string): string {
  return account.trim() === DEMO_APPLICANT_ACCOUNT
    ? DEMO_APPLICANT_PROFILE.id
    : DEMO_MEMBER_PROFILE.id;
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    isAuthenticated: false,
    currentMemberId: DEMO_MEMBER_PROFILE.id
  }),
  actions: {
    signIn(account = DEMO_MEMBER_ACCOUNT) {
      this.isAuthenticated = true;
      this.currentMemberId = resolveDemoMemberId(account);
    },
    signOut() {
      this.isAuthenticated = false;
    }
  }
});
