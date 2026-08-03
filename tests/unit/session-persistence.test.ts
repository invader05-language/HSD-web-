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

    const session = useSessionStore();

    expect(session.restore()).toBe(false);
    expect(session.isAuthenticated).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
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
