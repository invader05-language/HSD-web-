import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  ADMIN_LEVELS,
  DEMO_APPLICANT_ACCOUNT,
  DEMO_MEMBER_ACCOUNT,
  MOCK_ACCOUNTS
} from "../../app/data/admin-system";
import { useAdminAccessStore } from "../../app/stores/admin-access";
import { useSessionStore } from "../../app/stores/session";
import {
  DEMO_APPLICANT_PROFILE,
  DEMO_MEMBER_PROFILE
} from "../../app/data/member-profile";

describe("mock administration access", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("keeps member, admin and owner as the only account levels", () => {
    expect(ADMIN_LEVELS).toEqual(["member", "admin", "owner"]);
    expect(MOCK_ACCOUNTS.map((account) => account.adminLevel)).toEqual(
      expect.arrayContaining(["member", "admin", "owner"])
    );
  });

  it("preserves the existing member and applicant account-to-profile mappings", () => {
    const session = useSessionStore();

    expect(session.signIn(DEMO_MEMBER_ACCOUNT)).toMatchObject({ status: "success" });
    expect(session.currentMemberId).toBe(DEMO_MEMBER_PROFILE.id);
    expect(session.adminLevel).toBe("member");
    expect(session.canAccessAdmin).toBe(false);

    expect(session.signIn(DEMO_APPLICANT_ACCOUNT)).toMatchObject({ status: "success" });
    expect(session.currentMemberId).toBe(DEMO_APPLICANT_PROFILE.id);
    expect(session.canAccessAdmin).toBe(false);
  });

  it("distinguishes unknown, missing, disabled and successful admin login eligibility", () => {
    const session = useSessionStore();

    expect(session.signIn("not-an-account")).toMatchObject({ status: "unknown-account" });
    expect(session.signIn(DEMO_MEMBER_ACCOUNT, { requireAdmin: true })).toMatchObject({
      status: "admin-access-missing"
    });
    expect(session.signIn("disabled-admin", { requireAdmin: true })).toMatchObject({
      status: "admin-access-disabled"
    });
    expect(session.signIn("media-admin", { requireAdmin: true })).toMatchObject({
      status: "success"
    });
  });

  it("derives administrative capabilities from the authenticated account", () => {
    const session = useSessionStore();

    session.signIn("media-admin");
    expect(session.adminLevel).toBe("admin");
    expect(session.canAccessAdmin).toBe(true);
    expect(session.canManageAdminAccounts).toBe(false);

    session.signIn("admin-alliance");
    expect(session.adminLevel).toBe("owner");
    expect(session.canAccessAdmin).toBe(true);
    expect(session.canManageAdminAccounts).toBe(true);
  });

  it("lets the access boundary grant and revoke admin eligibility without changing owner access", () => {
    const access = useAdminAccessStore();
    const session = useSessionStore();

    expect(access.grantAdmin(DEMO_MEMBER_ACCOUNT)).toBe(true);
    session.signIn(DEMO_MEMBER_ACCOUNT);
    expect(session.adminLevel).toBe("admin");
    expect(session.canAccessAdmin).toBe(true);

    expect(access.revokeAdmin(DEMO_MEMBER_ACCOUNT)).toBe(true);
    expect(session.adminLevel).toBe("member");
    expect(session.canAccessAdmin).toBe(false);

    expect(access.revokeAdmin("admin-alliance")).toBe(false);
    expect(access.setAdminAccessEnabled("admin-alliance", false)).toBe(false);
    expect(access.getAccount("admin-alliance")).toMatchObject({
      adminLevel: "owner",
      adminAccessEnabled: true
    });
  });
});
