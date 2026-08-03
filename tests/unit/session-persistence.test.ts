import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  SESSION_STORAGE_KEY,
  SESSION_STORAGE_VERSION,
  useSessionStore
} from "../../app/stores/session";
import { useAdminAccessStore } from "../../app/stores/admin-access";

describe("session persistence", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.pushState({}, "", "/");
  });

  function registerFirstLoginAccount() {
    const access = useAdminAccessStore();
    access.registerFormalMemberAccount({
      account: "20269999",
      memberId: "member-20269999",
      name: "新成员",
      adminLevel: "member",
      adminAccessEnabled: true,
      mustChangePassword: true
    });
    access.persistAccessState();
  }

  it("accepts only the fixed initial password for a first-login account", () => {
    registerFirstLoginAccount();
    const session = useSessionStore();

    expect(session.signIn("20269999", "wrong-password")).toMatchObject({
      status: "invalid_credentials"
    });
    expect(session.isAuthenticated).toBe(false);

    expect(session.signIn("20269999", "hsd1314")).toMatchObject({
      status: "password_change_required"
    });
    expect(session.isAuthenticated).toBe(true);
    expect(session.mustChangePassword).toBe(true);
  });

  it("restores a first-login session without removing its restriction", () => {
    registerFirstLoginAccount();
    useSessionStore().signIn("20269999", "hsd1314");
    setActivePinia(createPinia());

    const restored = useSessionStore();
    expect(restored.restore()).toBe(true);
    expect(restored.currentAccountId).toBe("20269999");
    expect(restored.mustChangePassword).toBe(true);
  });

  it("completes the mock password-change flow without persisting the replacement password", () => {
    registerFirstLoginAccount();
    const session = useSessionStore();
    session.signIn("20269999", "hsd1314");

    expect(session.completePasswordChange("hsd1314", "hsd1314")).toEqual({
      status: "invalid_input",
      errors: { password: "新密码不能与初始密码相同。" }
    });
    expect(session.completePasswordChange("new-pass-2026", "new-pass-2026"))
      .toEqual({ status: "success" });
    expect(session.mustChangePassword).toBe(false);
    expect(window.localStorage.getItem("baiyun-hsd-admin-access"))
      .not.toContain("new-pass-2026");
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY))
      .not.toContain("new-pass-2026");
  });

  it("serializes only the authenticated account, issued-at time, and storage version", () => {
    const session = useSessionStore();

    session.signIn("media-admin", { requireAdmin: true });

    expect(JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual({
      version: SESSION_STORAGE_VERSION,
      accountId: "media-admin",
      issuedAt: expect.any(Number)
    });
  });

  it("persists and restores member-mode sessions without elevating them", () => {
    const session = useSessionStore();

    session.signIn("demo-member");

    expect(session.isAuthenticated).toBe(true);
    expect(JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toMatchObject({
      version: SESSION_STORAGE_VERSION,
      accountId: "demo-member",
      issuedAt: expect.any(Number)
    });

    setActivePinia(createPinia());
    const restored = useSessionStore();
    expect(restored.restore()).toBe(true);
    expect(restored.adminLevel).toBe("member");
    expect(restored.canAccessAdmin).toBe(false);
  });

  it("restores a valid session into a fresh Pinia store", () => {
    useSessionStore().signIn("media-admin", { requireAdmin: true });
    setActivePinia(createPinia());

    const session = useSessionStore();

    expect(session.restore()).toBe(true);
    expect(session.isAuthenticated).toBe(true);
    expect(session.currentAccountId).toBe("media-admin");
    expect(session.currentMemberId).toBe("member-li");
    expect(session.canAccessAdmin).toBe(true);
  });

  it("clears corrupt and version-mismatched session storage", () => {
    const session = useSessionStore();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "not-json");

    expect(session.restore()).toBe(false);
    expect(session.isAuthenticated).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      version: SESSION_STORAGE_VERSION + 1,
      accountId: "media-admin",
      issuedAt: Date.now()
    }));

    expect(session.restore()).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("invalidates a restored administrator session when access is disabled", () => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      version: SESSION_STORAGE_VERSION,
      accountId: "media-admin",
      issuedAt: Date.now()
    }));
    useAdminAccessStore().setAdminAccessEnabled("media-admin", false, {
      account: "admin-alliance",
      name: "张同学",
      level: "owner"
    });
    window.history.pushState({}, "", "/admin/accounts");

    const session = useSessionStore();

    expect(session.restore()).toBe(false);
    expect(session.isAuthenticated).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("keeps member identity after an administrator is disabled on a member route", () => {
    const session = useSessionStore();
    session.signIn("media-admin");
    useAdminAccessStore().setAdminAccessEnabled("media-admin", false, {
      account: "admin-alliance",
      name: "张同学",
      level: "owner"
    });
    window.history.pushState({}, "", "/member");
    setActivePinia(createPinia());

    const restored = useSessionStore();

    expect(restored.restore()).toBe(true);
    expect(restored.currentAccountId).toBe("media-admin");
    expect(restored.adminLevel).toBe("admin");
    expect(restored.canAccessAdmin).toBe(false);
  });

  it("keeps member identity after administrator qualification is revoked on a member route", () => {
    const session = useSessionStore();
    session.signIn("media-admin");
    useAdminAccessStore().revokeAdmin("media-admin", {
      account: "admin-alliance",
      name: "张同学",
      level: "owner"
    });
    window.history.pushState({}, "", "/member");
    setActivePinia(createPinia());

    const restored = useSessionStore();

    expect(restored.restore()).toBe(true);
    expect(restored.currentAccountId).toBe("media-admin");
    expect(restored.adminLevel).toBe("member");
    expect(restored.canAccessAdmin).toBe(false);
  });

  it("invalidates a restored administrator session when qualification is revoked", () => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      version: SESSION_STORAGE_VERSION,
      accountId: "media-admin",
      issuedAt: Date.now()
    }));
    useAdminAccessStore().revokeAdmin("media-admin", {
      account: "admin-alliance",
      name: "张同学",
      level: "owner"
    });
    window.history.pushState({}, "", "/admin/accounts");

    const session = useSessionStore();

    expect(session.restore()).toBe(false);
    expect(session.isAuthenticated).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("removes the persisted session on explicit sign-out", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });

    session.signOut();

    expect(session.isAuthenticated).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
