import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  ADMIN_LEVELS,
  DEMO_APPLICANT_ACCOUNT,
  DEMO_MEMBER_ACCOUNT,
  getAdminLevelLabel,
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

  it("labels every current account level without elevating ordinary members", () => {
    expect(getAdminLevelLabel("member")).toBe("普通成员");
    expect(getAdminLevelLabel("admin")).toBe("平台管理员");
    expect(getAdminLevelLabel("owner")).toBe("联盟总负责人");
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

  it("enables access when promoting a disabled administrator to owner", () => {
    const access = useAdminAccessStore();

    expect(access.setAdminLevel("disabled-admin", "owner")).toBe(true);
    expect(access.getAccount("disabled-admin")).toMatchObject({
      adminLevel: "owner",
      adminAccessEnabled: true
    });
  });

  it("records each actual owner qualification change and protects the owner account", () => {
    const access = useAdminAccessStore();
    const actor = { name: "联盟管理员", level: "owner" as const };

    const initialCount = access.auditRecords.length;
    expect(
      access.changeAdminQualification(DEMO_MEMBER_ACCOUNT, "grant", {
        name: "周同学",
        level: "admin"
      })
    ).toBe(false);
    expect(access.changeAdminQualification(DEMO_MEMBER_ACCOUNT, "grant", actor)).toBe(true);
    expect(access.changeAdminQualification(DEMO_MEMBER_ACCOUNT, "grant", actor)).toBe(false);
    expect(access.changeAdminQualification("media-admin", "disable", actor)).toBe(true);
    expect(access.changeAdminQualification("admin-alliance", "disable", actor)).toBe(false);

    expect(access.auditRecords).toHaveLength(initialCount + 2);
    expect(access.auditRecords[0]).toMatchObject({
      actor: "联盟管理员",
      role: "联盟总负责人",
      module: "系统管理",
      action: "停用管理员资格",
      target: "周同学（media-admin）",
      result: "成功"
    });
    expect(access.getQualification(DEMO_MEMBER_ACCOUNT)).toMatchObject({
      configuredBy: "联盟管理员"
    });
  });
});
