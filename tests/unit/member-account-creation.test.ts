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
import { useMemberRepository } from "../../app/composables/useMemberRepository";

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
      identity: "正式成员",
      center: "白泽开发中心",
      centerSlug: "baize-development",
      memberDuty: "普通成员",
      baizeDirection: "后端架构",
      bio: "",
    });
  });

  it("adds the created profile to the admin member repository and restores it after refresh", () => {
    const repository = useMemberRepository();

    expect(useMemberAdministrationStore().createFormalMember(validInput)).toMatchObject({
      status: "success",
    });
    expect(repository.findAdminMember("member-20269999")).toMatchObject({
      id: "member-20269999",
      name: "郑同学",
      studentId: "20269999",
      identity: "正式成员",
      center: "白泽开发中心",
      memberDuty: "普通成员",
      baizeDirection: "后端架构",
    });

    setActivePinia(createPinia());
    expect(useMemberRepository().findAdminMember("member-20269999")).toMatchObject({
      name: "郑同学",
      studentId: "20269999",
      identity: "正式成员",
    });
  });

  it("uses a stable public route id that does not expose the student id", () => {
    expect(useMemberAdministrationStore().createFormalMember(validInput)).toMatchObject({
      status: "success",
    });

    const profile = useMemberProfileStore().getProfile("member-20269999");
    expect(profile.publicId).toBeTruthy();
    expect(profile.publicId).not.toContain(validInput.studentId);
    expect(useMemberRepository().findPublicPerson(profile.publicId!)).toMatchObject({
      id: profile.publicId,
      name: "郑同学",
    });
    expect(useMemberRepository().findPublicPerson(profile.publicId!)).not.toHaveProperty("studentId");

    const publicId = profile.publicId;
    setActivePinia(createPinia());
    expect(useMemberProfileStore().getProfile("member-20269999").publicId).toBe(publicId);
    expect(useMemberRepository().findPublicPerson(publicId!)).toMatchObject({ id: publicId });
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

  it("restores both non-empty storage values when the access-state write fails", () => {
    const access = useAdminAccessStore();
    const profiles = useMemberProfileStore();
    const previousAccessState = '{"existing":"access"}';
    const previousProfileState = '{"existing":"profile"}';
    localStorage.setItem(ADMIN_ACCESS_STORAGE_KEY, previousAccessState);
    localStorage.setItem(MEMBER_PROFILE_STORAGE_KEY, previousProfileState);

    const originalSetItem = localStorage.setItem.bind(localStorage);
    let rejectedAccessWrite = false;
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === ADMIN_ACCESS_STORAGE_KEY && !rejectedAccessWrite) {
        rejectedAccessWrite = true;
        throw new Error("storage unavailable");
      }
      originalSetItem(key, value);
    });

    expect(useMemberAdministrationStore().createFormalMember(validInput)).toEqual({
      status: "storage_unavailable",
    });
    expect(access.getAccount("20269999")).toBeUndefined();
    expect(() => profiles.getProfile("member-20269999")).toThrow("成员档案不存在");
    expect(localStorage.getItem(ADMIN_ACCESS_STORAGE_KEY)).toBe(previousAccessState);
    expect(localStorage.getItem(MEMBER_PROFILE_STORAGE_KEY)).toBe(previousProfileState);

    setItem.mockRestore();
  });

  it("restores both non-empty storage values when the profile-state write fails", () => {
    const access = useAdminAccessStore();
    const profiles = useMemberProfileStore();
    const previousAccessState = '{"existing":"access"}';
    const previousProfileState = '{"existing":"profile"}';
    localStorage.setItem(ADMIN_ACCESS_STORAGE_KEY, previousAccessState);
    localStorage.setItem(MEMBER_PROFILE_STORAGE_KEY, previousProfileState);

    const originalSetItem = localStorage.setItem.bind(localStorage);
    let rejectedProfileWrite = false;
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === MEMBER_PROFILE_STORAGE_KEY && !rejectedProfileWrite) {
        rejectedProfileWrite = true;
        throw new Error("storage unavailable");
      }
      originalSetItem(key, value);
    });

    expect(useMemberAdministrationStore().createFormalMember(validInput)).toEqual({
      status: "storage_unavailable",
    });
    expect(access.getAccount("20269999")).toBeUndefined();
    expect(() => profiles.getProfile("member-20269999")).toThrow("成员档案不存在");
    expect(localStorage.getItem(ADMIN_ACCESS_STORAGE_KEY)).toBe(previousAccessState);
    expect(localStorage.getItem(MEMBER_PROFILE_STORAGE_KEY)).toBe(previousProfileState);

    setItem.mockRestore();
  });
});
