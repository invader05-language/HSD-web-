import { defineStore } from "pinia";
import {
  findMockAccount,
  MOCK_ACCOUNTS,
  resolveMockLogin,
  type AdminLevel,
  type MockAccount
} from "../data/admin-system";

function cloneAccounts(): MockAccount[] {
  return MOCK_ACCOUNTS.map((account) => ({ ...account }));
}

export const useAdminAccessStore = defineStore("admin-access", {
  state: () => ({
    accounts: cloneAccounts()
  }),
  getters: {
    getAccount: (state) => (account: string) => findMockAccount(state.accounts, account)
  },
  actions: {
    resolveLogin(account: string, options: { requireAdmin?: boolean } = {}) {
      return resolveMockLogin(this.accounts, account, options.requireAdmin ?? false);
    },
    grantAdmin(account: string): boolean {
      const target = this.getAccount(account);
      if (!target) return false;
      if (target.adminLevel === "owner") return true;

      target.adminLevel = "admin";
      target.adminAccessEnabled = true;
      return true;
    },
    revokeAdmin(account: string): boolean {
      const target = this.getAccount(account);
      if (!target || target.adminLevel === "owner") return false;

      target.adminLevel = "member";
      target.adminAccessEnabled = true;
      return true;
    },
    setAdminAccessEnabled(account: string, enabled: boolean): boolean {
      const target = this.getAccount(account);
      if (!target || target.adminLevel === "member" || target.adminLevel === "owner") {
        return false;
      }

      target.adminAccessEnabled = enabled;
      return true;
    },
    setAdminLevel(account: string, level: AdminLevel): boolean {
      const target = this.getAccount(account);
      if (!target || (target.adminLevel === "owner" && level !== "owner")) return false;

      target.adminLevel = level;
      if (level === "admin" || level === "owner") target.adminAccessEnabled = true;
      if (level === "member") target.adminAccessEnabled = true;
      return true;
    }
  }
});
