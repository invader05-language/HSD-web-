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

export const SESSION_STORAGE_KEY = "baiyun-hsd.session";
export const SESSION_STORAGE_VERSION = 1;

interface PersistedSession {
  version: typeof SESSION_STORAGE_VERSION;
  accountId: string;
  issuedAt: number;
}

function getSessionStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;

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
      const storage = getSessionStorage();
      if (options.requireAdmin) {
        storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          version: SESSION_STORAGE_VERSION,
          accountId: result.account.account,
          issuedAt: Date.now()
        } satisfies PersistedSession));
      } else {
        storage?.removeItem(SESSION_STORAGE_KEY);
      }
      return result;
    },
    restore(): boolean {
      const storage = getSessionStorage();
      if (!storage) return false;

      const persisted = readPersistedSession(storage);
      const result = persisted && useAdminAccessStore().resolveLogin(persisted.accountId, {
        requireAdmin: true
      });
      if (!persisted || !result || result.status !== "success") {
        this.signOut();
        return false;
      }

      this.isAuthenticated = true;
      this.currentAccountId = result.account.account;
      this.currentMemberId = result.account.memberId;
      return true;
    },
    signOut() {
      this.isAuthenticated = false;
      this.currentAccountId = undefined;
      getSessionStorage()?.removeItem(SESSION_STORAGE_KEY);
    }
  }
});
