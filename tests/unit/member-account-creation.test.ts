import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  MEMBER_PROFILE_STORAGE_KEY,
  MEMBER_PROFILE_STORAGE_VERSION,
  useMemberProfileStore,
} from "../../app/stores/member-profile";
import { useAdminAccessStore } from "../../app/stores/admin-access";
import {
  useMemberAdministrationStore,
  type CreateFormalMemberInput,
} from "../../app/stores/member-administration";
import { ADMIN_ACCESS_STORAGE_KEY } from "../../app/data/admin-system";

const validInput: CreateFormalMemberInput = {
  name: "郑同学",
  studentId: "20269999",
  grade: "2026 级",
  className: "软件工程 3 班",
  center: "白泽开发中心",
  memberDuty: "普通成员",
  baizeDirection: "后端架构",
  bio: "",
};

describe("formal member account creation", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("creates a formal profile and first-login account from the student id", () => {
    const administration = useMemberAdministrationStore();
    const access = useAdminAccessStore();
    const profiles = useMemberProfileStore();

    expect(administration.createFormalMember(validInput)).toEqual({
      status: "success",
      memberId: "member-20269999",
      accountId: "20269999",
    });
    expect(access.getAccount(validInput.studentId)).toMatchObject({
      account: "20269999",
      memberId: "member-20269999",
      name: "郑同学",
      adminLevel: "member",
      adminAccessEnabled: true,
      mustChangePassword: true,
    });
    expect(access.getAccount(validInput.studentId)).not.toHaveProperty("password");
    expect(profiles.getProfile("member-20269999")).toMatchObject({
      publicId: "member-20269999",
      identity: "正式成员",
      center: "白泽开发中心",
      centerSlug: "baize-development",
      memberDuty: "普通成员",
      baizeDirection: "后端架构",
      bio: "",
    });
  });

  it("rejects duplicate student ids across all accounts without changing either store", () => {
    const administration = useMemberAdministrationStore();
    const access = useAdminAccessStore();
    const profiles = useMemberProfileStore();

    expect(administration.createFormalMember(validInput)).toMatchObject({ status: "success" });
    const accountCount = access.accounts.length;
    const profileCount = Object.keys(profiles.profiles).length;

    expect(administration.createFormalMember({ ...validInput, name: "重复帐号" })).toEqual({
      status: "duplicate_student_id",
    });
    expect(access.accounts).toHaveLength(accountCount);
    expect(Object.keys(profiles.profiles)).toHaveLength(profileCount);
  });

  it("validates required fields and the Baize-only direction contract before mutation", () => {
    const administration = useMemberAdministrationStore();
    const access = useAdminAccessStore();
    const profiles = useMemberProfileStore();
    const initialAccountCount = access.accounts.length;
    const initialProfileCount = Object.keys(profiles.profiles).length;

    expect(administration.createFormalMember({
      ...validInput,
      name: " ",
      grade: "",
      className: "",
      baizeDirection: undefined,
    })).toEqual({
      status: "invalid_input",
      errors: {
        name: "请输入成员姓名。",
        grade: "请输入年级。",
        className: "请输入班级。",
        baizeDirection: "请选择白泽实践方向。",
      },
    });
    expect(access.accounts).toHaveLength(initialAccountCount);
    expect(Object.keys(profiles.profiles)).toHaveLength(initialProfileCount);
  });

  it("drops a direction submitted for a non-Baize member", () => {
    const result = useMemberAdministrationStore().createFormalMember({
      ...validInput,
      center: "新媒体中心",
      baizeDirection: "鸿蒙开发",
    });

    expect(result).toMatchObject({ status: "success" });
    expect(useMemberProfileStore().getProfile("member-20269999").baizeDirection).toBeUndefined();
  });

  it("persists both versioned states and restores the new account and profile", () => {
    expect(useMemberAdministrationStore().createFormalMember(validInput)).toMatchObject({
      status: "success",
    });

    const profileState = JSON.parse(localStorage.getItem(MEMBER_PROFILE_STORAGE_KEY)!);
    expect(profileState.version).toBe(MEMBER_PROFILE_STORAGE_VERSION);
    expect(profileState.profiles["member-20269999"]).toMatchObject({ identity: "正式成员" });
    expect(localStorage.getItem(ADMIN_ACCESS_STORAGE_KEY)).not.toContain("password");

    setActivePinia(createPinia());
    expect(useAdminAccessStore().getAccount("20269999")).toMatchObject({
      memberId: "member-20269999",
      mustChangePassword: true,
    });
    expect(useMemberProfileStore().getProfile("member-20269999")).toMatchObject({
      studentId: "20269999",
      identity: "正式成员",
    });
  });

  it("rolls both memory stores back when either versioned persistence write fails", () => {
    const access = useAdminAccessStore();
    const profiles = useMemberProfileStore();
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === MEMBER_PROFILE_STORAGE_KEY) throw new Error("storage unavailable");
      originalSetItem(key, value);
    });

    expect(useMemberAdministrationStore().createFormalMember(validInput)).toEqual({
      status: "storage_unavailable",
    });
    expect(access.getAccount("20269999")).toBeUndefined();
    expect(() => profiles.getProfile("member-20269999")).toThrow("成员档案不存在");

    setItem.mockRestore();
  });
});
