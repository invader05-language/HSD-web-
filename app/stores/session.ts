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
import { DEFAULT_FORMAL_MEMBER_PASSWORD } from "../utils/member-account-form";
import {
  validateNewPassword,
  type PasswordChangeErrors,
} from "../utils/password-change";

export { DEMO_APPLICANT_ACCOUNT, DEMO_MEMBER_ACCOUNT };

export const SESSION_STORAGE_KEY = "baiyun-hsd.session";
export const SESSION_STORAGE_VERSION = 1;

interface PersistedSession {
  version: typeof SESSION_STORAGE_VERSION;
  accountId: string;
  issuedAt: number;
}

export type PasswordChangeResult =
  | { status: "success" }
  | { status: "invalid_input"; errors: PasswordChangeErrors }
  | { status: "not_required" }
  | { status: "storage_unavailable" };

function getSessionStorage(): Storage | undefined {
  if (import.meta.server) return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function readPersistedSession(storage: Storage): PersistedSession | undefined {
  const value = storage.getItem(SESSION_STORAGE_KEY);
  if (!value) return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object"
      || parsed === null
      || !Object.hasOwn(parsed, "version")
      || !Object.hasOwn(parsed, "accountId")
      || !Object.hasOwn(parsed, "issuedAt")
    ) {
      return undefined;
    }

    const session = parsed as Record<string, unknown>;
    if (
      session.version !== SESSION_STORAGE_VERSION
      || typeof session.accountId !== "string"
      || !session.accountId.trim()
      || typeof session.issuedAt !== "number"
      || !Number.isFinite(session.issuedAt)
    ) {
      return undefined;
    }

    return {
      version: SESSION_STORAGE_VERSION,
      accountId: session.accountId,
      issuedAt: session.issuedAt
    };
  } catch {
    return undefined;
  }
}

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
    },
    mustChangePassword(): boolean {
      return this.isAuthenticated && Boolean(this.currentAccount?.mustChangePassword);
    }
  },
  actions: {
    signIn(
      account = DEMO_MEMBER_ACCOUNT,
      passwordOrOptions: string | { requireAdmin?: boolean } = "",
      suppliedOptions: { requireAdmin?: boolean } = {},
    ): MockLoginResult {
      const password = typeof passwordOrOptions === "string" ? passwordOrOptions : "";
      const options = typeof passwordOrOptions === "string" ? suppliedOptions : passwordOrOptions;
      const result = useAdminAccessStore().resolveLogin(account, options);
      if (result.status !== "success") {
        this.signOut();
        return result;
      }

      if (result.account.mustChangePassword && password !== DEFAULT_FORMAL_MEMBER_PASSWORD) {
        this.signOut();
        return { status: "invalid_credentials", account: account.trim() };
      }

      this.isAuthenticated = true;
      this.currentAccountId = result.account.account;
      this.currentMemberId = result.account.memberId;
      const storage = getSessionStorage();
      storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        version: SESSION_STORAGE_VERSION,
        accountId: result.account.account,
        issuedAt: Date.now()
      } satisfies PersistedSession));
      return result.account.mustChangePassword
        ? { status: "password_change_required", account: result.account }
        : result;
    },
    restore(): boolean {
      const storage = getSessionStorage();
      if (!storage) return false;

      const persisted = readPersistedSession(storage);
      const access = useAdminAccessStore();
      const account = persisted && access.getAccount(persisted.accountId);
      const routeRequiresAdmin = typeof window !== "undefined"
        && window.location.pathname.startsWith("/admin");
      const restoreRequiresAdmin = routeRequiresAdmin
        && !(account?.mustChangePassword && account.adminLevel === "member");
      const result = persisted && account
        ? access.resolveLogin(persisted.accountId, {
            requireAdmin: restoreRequiresAdmin
          })
        : undefined;
      if (!persisted || !result || result.status !== "success") {
        this.signOut();
        return false;
      }

      this.isAuthenticated = true;
      this.currentAccountId = result.account.account;
      this.currentMemberId = result.account.memberId;
      return true;
    },
    completePasswordChange(
      newPassword: string,
      confirmation: string,
    ): PasswordChangeResult {
      const access = useAdminAccessStore();
      const account = this.currentAccountId
        ? access.getAccount(this.currentAccountId)
        : undefined;
      if (!this.isAuthenticated || !account?.mustChangePassword) {
        return { status: "not_required" };
      }

      const errors = validateNewPassword(newPassword, confirmation);
      if (Object.keys(errors).length > 0) {
        return { status: "invalid_input", errors };
      }

      account.mustChangePassword = false;
      try {
        access.persistAccessState();
      } catch {
        account.mustChangePassword = true;
        return { status: "storage_unavailable" };
      }
      return { status: "success" };
    },
    signOut() {
      this.isAuthenticated = false;
      this.currentAccountId = undefined;
      getSessionStorage()?.removeItem(SESSION_STORAGE_KEY);
    }
  }
});
