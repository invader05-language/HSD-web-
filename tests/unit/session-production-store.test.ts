import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { ApiSessionGateway } from "../../app/services/api-session.gateway";
import { SESSION_STORAGE_KEY, useSessionStore } from "../../app/stores/session";

const ownerSession = {
  account: {
    id: "account-owner",
    adminLevel: "OWNER" as const,
    adminCenterId: null,
    capabilities: ["recruitment.assessment.edit", "recruitment.result.publish"],
  },
  person: { id: "person-owner", name: "总负责人", status: "FORMAL_MEMBER" as const },
  mustChangePassword: false,
};

const centerAdminSession = {
  account: {
    id: "account-center-admin",
    adminLevel: "ADMIN" as const,
    adminCenterId: "center-media",
    capabilities: ["recruitment.assessment.edit", "content.create"],
  },
  person: { id: "person-center-admin", name: "媒体管理员", status: "FORMAL_MEMBER" as const },
  mustChangePassword: false,
};

describe("production session store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("hydrates identity and assessment capabilities only from the live API session", async () => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      version: 1,
      accountId: "admin-alliance",
      issuedAt: Date.now(),
    }));
    const gateway: ApiSessionGateway = {
      login: vi.fn(),
      currentSession: vi.fn().mockResolvedValue(ownerSession),
      changePassword: vi.fn(),
    };
    const session = useSessionStore();

    await expect(session.restoreForRuntime({ useMockApi: false }, gateway)).resolves.toBe(true);

    expect(session.isAuthenticated).toBe(true);
    expect(session.currentAccountId).toBe("account-owner");
    expect(session.currentMemberId).toBe("person-owner");
    expect(session.currentAccount).toMatchObject({
      account: "account-owner",
      memberId: "person-owner",
      name: "总负责人",
      adminLevel: "owner",
    });
    expect(session.canManageAdminAccounts).toBe(true);
    expect(session.hasCapability("recruitment.assessment.edit")).toBe(true);
    expect(session.hasCapability("recruitment.result.publish")).toBe(true);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("allows an authenticated center admin into the member workspace without granting portal configuration", async () => {
    const gateway: ApiSessionGateway = {
      login: vi.fn(),
      currentSession: vi.fn().mockResolvedValue(centerAdminSession),
      changePassword: vi.fn(),
    };
    const session = useSessionStore();

    await expect(session.restoreForRuntime({ useMockApi: false }, gateway)).resolves.toBe(true);

    expect(session.isAuthenticated).toBe(true);
    expect(session.currentMemberId).toBe("person-center-admin");
    expect(session.canAccessAdmin).toBe(true);
    expect(session.hasCapability("content.create")).toBe(true);
    expect(session.hasCapability("portal.configure")).toBe(false);
  });

  it("keeps Mock center administrators on the same capability contract as the API", () => {
    const session = useSessionStore();

    expect(session.signIn("media-admin", { requireAdmin: true })).toMatchObject({ status: "success" });
    expect(session.hasCapability("recruitment.assessment.edit")).toBe(true);
    expect(session.hasCapability("content.create")).toBe(true);
    expect(session.hasCapability("portal.configure")).toBe(false);
  });

  it("clears local Mock state after an anonymous production session instead of falling back", async () => {
    const gateway: ApiSessionGateway = {
      login: vi.fn(),
      currentSession: vi.fn().mockRejectedValue(new Error("Authentication is required")),
      changePassword: vi.fn(),
    };
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });

    await expect(session.restoreForRuntime({ useMockApi: false }, gateway)).resolves.toBe(false);

    expect(session.isAuthenticated).toBe(false);
    expect(session.currentAccountId).toBeUndefined();
    expect(session.canAccessAdmin).toBe(false);
  });

  it("keeps the fixture sign-in path available only when the explicit Mock flag is true", async () => {
    const session = useSessionStore();

    await expect(session.signInForRuntime(
      { useMockApi: true },
      undefined,
      "admin-alliance",
      "",
      { requireAdmin: true },
    )).resolves.toMatchObject({ status: "success" });
    expect(session.canManageAdminAccounts).toBe(true);
  });

  it("completes a required production password change through the API instead of the Mock account store", async () => {
    const gateway = {
      login: vi.fn(),
      currentSession: vi.fn().mockResolvedValue({
        ...ownerSession,
        account: { ...ownerSession.account, adminLevel: "MEMBER" as const, capabilities: [] },
        mustChangePassword: true,
      }),
      changePassword: vi.fn().mockResolvedValue({
        ...ownerSession,
        account: { ...ownerSession.account, adminLevel: "MEMBER" as const, capabilities: [] },
        mustChangePassword: false,
      }),
    } satisfies ApiSessionGateway;
    const session = useSessionStore();
    await session.restoreForRuntime({ useMockApi: false }, gateway);

    await expect(session.completePasswordChangeForRuntime(
      { useMockApi: false },
      gateway,
      "safe-password-2026",
      "safe-password-2026",
    )).resolves.toEqual({ status: "success" });

    expect(gateway.changePassword).toHaveBeenCalledWith("safe-password-2026");
    expect(session.mustChangePassword).toBe(false);
  });

  it("keeps the first-login restriction and returns a visible error when the production password API fails", async () => {
    const gateway = {
      login: vi.fn(),
      currentSession: vi.fn().mockResolvedValue({
        ...ownerSession,
        account: { ...ownerSession.account, adminLevel: "MEMBER" as const, capabilities: [] },
        mustChangePassword: true,
      }),
      changePassword: vi.fn().mockRejectedValue(new Error("network unavailable")),
    } satisfies ApiSessionGateway;
    const session = useSessionStore();
    await session.restoreForRuntime({ useMockApi: false }, gateway);

    await expect(session.completePasswordChangeForRuntime(
      { useMockApi: false },
      gateway,
      "safe-password-2026",
      "safe-password-2026",
    )).resolves.toEqual({
      status: "api_error",
      message: "密码修改失败，请检查网络后重试。",
    });

    expect(session.mustChangePassword).toBe(true);
  });
});
