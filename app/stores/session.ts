import { defineStore } from "pinia";
import { DEMO_MEMBER_PROFILE } from "../data/member-profile";
import {
  DEMO_APPLICANT_ACCOUNT,
  DEMO_MEMBER_ACCOUNT,
  findMockAccount,
  MOCK_ACCOUNTS,
  type AdminCenterRole,
  type AdminLevel,
  type MockAccount,
  type MockLoginResult
} from "../data/admin-system";
import type { CurrentSessionResponseDto, LoginDto } from "../../packages/api-client/src";
import type { ApiSessionGateway } from "../services/api-session.gateway";
import { useAdminAccessStore } from "./admin-access";
import { DEFAULT_FORMAL_MEMBER_PASSWORD } from "../utils/member-account-form";
import {
  validateNewPassword,
  type PasswordChangeErrors,
} from "../utils/password-change";

export { DEMO_APPLICANT_ACCOUNT, DEMO_MEMBER_ACCOUNT };

export const SESSION_STORAGE_KEY = "baiyun-hsd.session";
export const SESSION_STORAGE_VERSION = 1;

export interface SessionRuntimeConfig {
  useMockApi: boolean;
}

interface SessionAccountProjection {
  account: string;
  memberId: string;
  name: string;
  adminLevel: AdminLevel;
  adminAccessEnabled: boolean;
  mustChangePassword: boolean;
  adminCenterId?: string;
  adminCenterRole?: AdminCenterRole;
  capabilities: string[];
}

interface PersistedSession {
  version: typeof SESSION_STORAGE_VERSION;
  accountId: string;
  issuedAt: number;
}

export type PasswordChangeResult =
  | { status: "success" }
  | { status: "invalid_input"; errors: PasswordChangeErrors }
  | { status: "not_required" }
  | { status: "storage_unavailable" }
  | { status: "api_error"; message: string };

const PASSWORD_CHANGE_API_ERROR_MESSAGE = "密码修改失败，请检查网络后重试。";

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

function mockCapabilities(account: MockAccount): string[] {
  if (account.adminLevel === "owner") {
    return [
      "recruitment.batch.manage",
      "recruitment.assessment.edit",
      "recruitment.result.publish",
      "content.create",
      "content.review",
      "content.publish",
      "portal.configure",
      "portal.publish",
      "member.create",
    ];
  }
  if (account.adminLevel === "admin" && account.adminAccessEnabled) {
    return ["recruitment.assessment.edit", "content.create"];
  }
  return [];
}

function mockAccountProjection(account: MockAccount): SessionAccountProjection {
  return {
    ...account,
    capabilities: mockCapabilities(account),
  };
}

function apiAccountProjection(session: CurrentSessionResponseDto): SessionAccountProjection {
  const adminLevel: AdminLevel = session.account.adminLevel === "OWNER"
    ? "owner"
    : session.account.adminLevel === "ADMIN"
      ? "admin"
      : "member";
  return {
    account: session.account.id,
    memberId: session.person.id,
    name: session.person.name,
    adminLevel,
    adminAccessEnabled: adminLevel === "owner" || session.account.adminCenterId !== null,
    mustChangePassword: session.mustChangePassword,
    ...(session.account.adminCenterId ? { adminCenterId: session.account.adminCenterId } : {}),
    capabilities: [...session.account.capabilities],
  };
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    isAuthenticated: false,
    currentAccountId: undefined as string | undefined,
    currentMemberId: DEMO_MEMBER_PROFILE.id,
    apiSession: undefined as CurrentSessionResponseDto | undefined,
    isHydrated: false,
  }),
  getters: {
    currentAccount(state): SessionAccountProjection | undefined {
      if (state.apiSession) return apiAccountProjection(state.apiSession);
      if (!state.currentAccountId) return undefined;
      const account = useAdminAccessStore().getAccount(state.currentAccountId);
      return account ? mockAccountProjection(account) : undefined;
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
    hasCapability(): (capability: string) => boolean {
      return (capability: string) => Boolean(this.currentAccount?.capabilities.includes(capability));
    },
    mustChangePassword(): boolean {
      return this.isAuthenticated && Boolean(this.currentAccount?.mustChangePassword);
    }
  },
  actions: {
    applyApiSession(session: CurrentSessionResponseDto) {
      this.apiSession = session;
      this.isAuthenticated = true;
      this.currentAccountId = session.account.id;
      this.currentMemberId = session.person.id;
      getSessionStorage()?.removeItem(SESSION_STORAGE_KEY);
    },
    clearProductionSession() {
      this.apiSession = undefined;
      this.isAuthenticated = false;
      this.currentAccountId = undefined;
      this.currentMemberId = DEMO_MEMBER_PROFILE.id;
      getSessionStorage()?.removeItem(SESSION_STORAGE_KEY);
    },
    async signInForRuntime(
      config: SessionRuntimeConfig,
      gateway: ApiSessionGateway | undefined,
      account: string,
      password: string,
      options: { requireAdmin?: boolean } = {},
    ): Promise<MockLoginResult> {
      if (config.useMockApi) return this.signIn(account, password, options);
      if (!gateway) {
        this.clearProductionSession();
        throw new Error("SESSION_GATEWAY_UNAVAILABLE");
      }

      this.clearProductionSession();
      const session = await gateway.login({
        account: account.trim(),
        password,
        rememberMe: false,
      } satisfies LoginDto);
      this.applyApiSession(session);

      if (options.requireAdmin && !this.canAccessAdmin) {
        this.clearProductionSession();
        return {
          status: "admin-access-missing",
          account: apiAccountProjection(session),
        };
      }
      return session.mustChangePassword
        ? { status: "password_change_required", account: apiAccountProjection(session) }
        : { status: "success", account: apiAccountProjection(session) };
    },
    async restoreForRuntime(
      config: SessionRuntimeConfig,
      gateway: ApiSessionGateway | undefined,
    ): Promise<boolean> {
      if (config.useMockApi) {
        const restored = this.restore();
        this.isHydrated = true;
        return restored;
      }
      if (!gateway) {
        this.clearProductionSession();
        this.isHydrated = true;
        return false;
      }

      try {
        this.clearProductionSession();
        this.applyApiSession(await gateway.currentSession());
        return true;
      } catch {
        this.clearProductionSession();
        return false;
      } finally {
        this.isHydrated = true;
      }
    },
    signIn(
      account = DEMO_MEMBER_ACCOUNT,
      passwordOrOptions: string | { requireAdmin?: boolean } = "",
      suppliedOptions: { requireAdmin?: boolean } = {},
    ): MockLoginResult {
      this.apiSession = undefined;
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
      this.apiSession = undefined;
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
    async completePasswordChangeForRuntime(
      config: SessionRuntimeConfig,
      gateway: ApiSessionGateway | undefined,
      newPassword: string,
      confirmation: string,
    ): Promise<PasswordChangeResult> {
      if (config.useMockApi) {
        return this.completePasswordChange(newPassword, confirmation);
      }
      if (!this.isAuthenticated || !this.apiSession?.mustChangePassword) {
        return { status: "not_required" };
      }

      const errors = validateNewPassword(newPassword, confirmation);
      if (Object.keys(errors).length > 0) {
        return { status: "invalid_input", errors };
      }
      if (!gateway) {
        return { status: "api_error", message: PASSWORD_CHANGE_API_ERROR_MESSAGE };
      }

      try {
        this.applyApiSession(await gateway.changePassword(newPassword));
        return { status: "success" };
      } catch {
        return { status: "api_error", message: PASSWORD_CHANGE_API_ERROR_MESSAGE };
      }
    },
    signOut() {
      this.apiSession = undefined;
      this.isAuthenticated = false;
      this.currentAccountId = undefined;
      this.currentMemberId = DEMO_MEMBER_PROFILE.id;
      getSessionStorage()?.removeItem(SESSION_STORAGE_KEY);
    }
  }
});
