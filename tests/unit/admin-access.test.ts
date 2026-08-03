import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  ADMIN_CENTER_LEAD_LABELS,
  ADMIN_LEVELS,
  ADMIN_ACCESS_STORAGE_KEY,
  ADMIN_ACCESS_STORAGE_VERSION,
  DEMO_APPLICANT_ACCOUNT,
  DEMO_MEMBER_ACCOUNT,
  getAdminQualificationLabel,
  getAdminLevelLabel,
  MOCK_ACCOUNTS
} from "../../app/data/admin-system";
import { useAdminAccessStore } from "../../app/stores/admin-access";
import { useSessionStore } from "../../app/stores/session";
import {
  DEMO_APPLICANT_PROFILE,
  DEMO_MEMBER_PROFILE
} from "../../app/data/member-profile";
import { ADMIN_MEMBERS } from "../../app/data/admin-members";

describe("mock administration access", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("keeps member, admin and owner as the only account levels", () => {
    expect(ADMIN_LEVELS).toEqual(["member", "admin", "owner"]);
    expect(MOCK_ACCOUNTS.map((account) => account.adminLevel)).toEqual(
      expect.arrayContaining(["member", "admin", "owner"])
    );
  });

  it("labels account boundaries without presenting ordinary admins as generic platform administrators", () => {
    expect(getAdminLevelLabel("member")).toBe("普通成员");
    expect(getAdminLevelLabel("admin")).toBe("中心负责人");
    expect(getAdminLevelLabel("owner")).toBe("联盟总负责人");
  });

  it("assigns every ordinary administrator one of the four typed center lead roles", () => {
    const access = useAdminAccessStore();
    const owner = { account: "admin-alliance", name: "张同学", level: "owner" as const };

    expect(ADMIN_CENTER_LEAD_LABELS).toEqual([
      "白泽开发中心负责人",
      "新媒体中心负责人",
      "拓维策划中心负责人",
      "人才发展中心负责人"
    ]);
    expect(access.assignAdminCenterRole(DEMO_MEMBER_ACCOUNT, "白泽开发中心负责人", owner)).toBe(true);
    expect(access.getAccount(DEMO_MEMBER_ACCOUNT)).toMatchObject({
      adminLevel: "admin",
      adminCenterRole: "白泽开发中心负责人",
      adminAccessEnabled: true
    });
    expect(getAdminQualificationLabel(access.getAccount(DEMO_MEMBER_ACCOUNT)!)).toBe(
      "白泽开发中心负责人"
    );
    expect(
      MOCK_ACCOUNTS.filter((account) => account.adminLevel === "admin").every(
        (account) => ADMIN_CENTER_LEAD_LABELS.includes(account.adminCenterRole!)
      )
    ).toBe(true);
  });

  it("uses every established platform member as a selectable account fixture", () => {
    expect(MOCK_ACCOUNTS.map((account) => account.memberId)).toEqual(
      expect.arrayContaining(ADMIN_MEMBERS.map((member) => member.id))
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
    const owner = { account: "admin-alliance", name: "张同学", level: "owner" as const };

    expect(access.grantAdmin(DEMO_MEMBER_ACCOUNT, owner)).toBe(true);
    session.signIn(DEMO_MEMBER_ACCOUNT);
    expect(session.adminLevel).toBe("admin");
    expect(session.canAccessAdmin).toBe(true);

    expect(access.revokeAdmin(DEMO_MEMBER_ACCOUNT, owner)).toBe(true);
    expect(session.adminLevel).toBe("member");
    expect(session.canAccessAdmin).toBe(false);

    expect(access.revokeAdmin("admin-alliance", owner)).toBe(false);
    expect(access.setAdminAccessEnabled("admin-alliance", false, owner)).toBe(false);
    expect(access.getAccount("admin-alliance")).toMatchObject({
      adminLevel: "owner",
      adminAccessEnabled: true
    });
  });

  it("does not expose an unaudited owner promotion through the legacy level setter", () => {
    const access = useAdminAccessStore();

    expect(access.setAdminLevel("disabled-admin", "owner", {
      account: "admin-alliance",
      name: "张同学",
      level: "owner"
    })).toBe(false);
    expect(access.getAccount("disabled-admin")).toMatchObject({
      adminLevel: "admin",
      adminAccessEnabled: false
    });
  });

  it("derives owner authorization from the actor account instead of caller-supplied claims", () => {
    const access = useAdminAccessStore();

    expect(access.assignAdminCenterRole(DEMO_MEMBER_ACCOUNT, "白泽开发中心负责人", {
      account: DEMO_MEMBER_ACCOUNT,
      name: "伪造负责人",
      level: "owner"
    })).toBe(false);
    expect(access.assignAdminCenterRole(DEMO_MEMBER_ACCOUNT, "白泽开发中心负责人", {
      account: "admin-alliance",
      name: "伪造姓名",
      level: "member"
    })).toBe(true);
    expect(access.auditRecords[0]?.actor).toBe("张同学");
  });

  it("limits platform owners to two, keeps one owner, and rejects self-demotion", () => {
    const access = useAdminAccessStore();
    const owner = { account: "admin-alliance", name: "张同学", level: "owner" as const };

    expect(access.promoteToOwner(DEMO_MEMBER_ACCOUNT, owner)).toBe(true);
    expect(access.promoteToOwner(DEMO_APPLICANT_ACCOUNT, owner)).toBe(false);
    expect(access.demoteOwner("admin-alliance", owner)).toBe(false);
    expect(
      access.demoteOwner("admin-alliance", {
        account: DEMO_MEMBER_ACCOUNT,
        name: "成员账号",
        level: "owner"
      })
    ).toBe(true);
    expect(access.getAccount("admin-alliance")).toMatchObject({
      adminLevel: "admin",
      adminAccessEnabled: true
    });
    expect(access.accounts.filter((account) => account.adminLevel === "owner")).toHaveLength(1);
  });

  it("records each actual owner qualification change and protects the owner account", () => {
    const access = useAdminAccessStore();
    const actor = { account: "admin-alliance", name: "张同学", level: "owner" as const };

    const initialCount = access.auditRecords.length;
    expect(
      access.changeAdminQualification(DEMO_MEMBER_ACCOUNT, "grant", {
        account: "media-admin",
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
      actor: "张同学",
      role: "联盟总负责人",
      module: "系统管理",
      action: "停用管理员资格",
      target: "李同学（media-admin）",
      result: "成功"
    });
    expect(access.getQualification(DEMO_MEMBER_ACCOUNT)).toMatchObject({
      configuredBy: "张同学"
    });
  });

  it("restores versioned qualification state and audit records from local storage without passwords", () => {
    const owner = { account: "admin-alliance", name: "张同学", level: "owner" as const };
    const access = useAdminAccessStore();

    expect(access.assignAdminCenterRole(DEMO_MEMBER_ACCOUNT, "白泽开发中心负责人", owner)).toBe(true);
    const persisted = localStorage.getItem(ADMIN_ACCESS_STORAGE_KEY)!;
    expect(persisted).toContain(`\"version\":${ADMIN_ACCESS_STORAGE_VERSION}`);
    expect(persisted).not.toContain("password");

    setActivePinia(createPinia());
    const restored = useAdminAccessStore();
    expect(restored.getAccount(DEMO_MEMBER_ACCOUNT)).toMatchObject({
      adminLevel: "admin",
      adminCenterRole: "白泽开发中心负责人"
    });
    expect(restored.auditRecords[0]?.action).toBe("分配中心负责人资格");
  });

  it("falls back to initial fixtures when persisted qualification state has an invalid shape or version", () => {
    localStorage.setItem(ADMIN_ACCESS_STORAGE_KEY, "not-json");
    setActivePinia(createPinia());
    expect(useAdminAccessStore().getAccount(DEMO_MEMBER_ACCOUNT)?.adminLevel).toBe("member");

    localStorage.setItem(ADMIN_ACCESS_STORAGE_KEY, JSON.stringify({ version: 0, accounts: [] }));
    setActivePinia(createPinia());
    expect(useAdminAccessStore().auditRecords).toHaveLength(4);
    expect(useAdminAccessStore().getAccount("admin-alliance")).toMatchObject({
      adminLevel: "owner",
      adminAccessEnabled: true
    });
  });

  it("falls back to initial fixtures when browser storage reads throw", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    setActivePinia(createPinia());
    expect(useAdminAccessStore().getAccount("admin-alliance")).toMatchObject({
      adminLevel: "owner",
      adminAccessEnabled: true
    });

    getItem.mockRestore();
  });
});
