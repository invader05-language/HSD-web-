import { defineStore } from "pinia";
import { DEMO_MEMBER_PROFILE } from "../data/member-profile";
import {
  DEMO_APPLICANT_ACCOUNT,
  DEMO_MEMBER_ACCOUNT,
  findMockAccount,
  MOCK_ACCOUNTS,
  type MockLoginResult
} from "../data/admin-system";
import { useAdminAccessStore } from "./admin-access";

export { DEMO_APPLICANT_ACCOUNT, DEMO_MEMBER_ACCOUNT };

export function resolveDemoMemberId(account: string): string {
  return findMockAccount(MOCK_ACCOUNTS, account)?.memberId ?? DEMO_MEMBER_PROFILE.id;
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    isAuthenticated: false,
    currentAccountId: undefined as string | undefined,
    currentMemberId: DEMO_MEMBER_PROFILE.id
  }),
  getters: {
    currentAccount(state) {
      if (!state.currentAccountId) return undefined;
      return useAdminAccessStore().getAccount(state.currentAccountId);
    },
    adminLevel(): "member" | "admin" | "owner" {
      return this.isAuthenticated ? this.currentAccount?.adminLevel ?? "member" : "member";
    },
    canAccessAdmin(): boolean {
      return this.isAuthenticated
        && this.adminLevel !== "member"
        && Boolean(this.currentAccount?.adminAccessEnabled);
    },
    canManageAdminAccounts(): boolean {
      return this.canAccessAdmin && this.adminLevel === "owner";
    }
  },
  actions: {
    signIn(
      account = DEMO_MEMBER_ACCOUNT,
      options: { requireAdmin?: boolean } = {}
    ): MockLoginResult {
      const result = useAdminAccessStore().resolveLogin(account, options);
      if (result.status !== "success") {
        this.signOut();
        return result;
      }

      this.isAuthenticated = true;
      this.currentAccountId = result.account.account;
      this.currentMemberId = result.account.memberId;
      return result;
    },
    signOut() {
      this.isAuthenticated = false;
      this.currentAccountId = undefined;
    }
  }
});
