import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  DEMO_APPLICANT_PROFILE,
  DEMO_MEMBER_PROFILE,
  MEMBER_DUTIES,
  projectMemberToAdmin,
  projectMemberToPublic,
} from "../../app/data/member-profile";
import { ADMIN_MEMBERS } from "../../app/data/admin-members";
import * as adminMemberData from "../../app/data/admin-members";
import { CORE_PEOPLE } from "../../app/data/people";
import { useMemberProfileStore } from "../../app/stores/member-profile";
import { useSessionStore } from "../../app/stores/session";
import { useAdminAccessStore } from "../../app/stores/admin-access";
import { useMemberRepository } from "../../app/composables/useMemberRepository";
import {
  isSupportedAvatar,
  validateMemberProfileDraft,
} from "../../app/utils/member-profile-form";

describe("member profile domain", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("provides the className field without a public visibility switch", () => {
    expect(DEMO_MEMBER_PROFILE.className).toBeTruthy();
    expect(DEMO_MEMBER_PROFILE).not.toHaveProperty("publicVisible");
    expect(DEMO_MEMBER_PROFILE).not.toHaveProperty("avatarVisible");
  });

  it("uses one two-value member-duty contract", () => {
    expect(MEMBER_DUTIES).toEqual(["普通成员", "核心人员"]);
    expect(MEMBER_DUTIES).toContain(DEMO_MEMBER_PROFILE.memberDuty);
    expect(MEMBER_DUTIES).toContain(DEMO_APPLICANT_PROFILE.memberDuty);
  });

  it("uses the session store as the only source of the current member id", () => {
    const session = useSessionStore();
    const profileStore = useMemberProfileStore();
    const repository = useMemberRepository();

    expect(profileStore).not.toHaveProperty("currentMemberId");
    expect(profileStore).not.toHaveProperty("currentMember");
    expect(repository.currentProfile.value.id).toBe(DEMO_MEMBER_PROFILE.id);

    session.signIn("demo-applicant");

    expect(session.currentMemberId).toBe(DEMO_APPLICANT_PROFILE.id);
    expect(repository.currentProfile.value.id).toBe(DEMO_APPLICANT_PROFILE.id);
  });

  it("never projects a preparatory applicant into formal public or admin directories", () => {
    const session = useSessionStore();
    const profileStore = useMemberProfileStore();
    const repository = useMemberRepository();
    const formalPublicPerson = repository.findPublicPerson(DEMO_MEMBER_PROFILE.publicId!);
    const formalAdminMember = repository.findAdminMember(DEMO_MEMBER_PROFILE.id);

    session.signIn("demo-applicant");
    profileStore.updateProfile(session.currentMemberId, {
      baizeDirection: "鸿蒙开发",
      bio: "预备成员的新简介，不得覆盖任何正式成员公开资料。",
      avatarUrl: "blob:applicant-avatar",
    });

    expect(profileStore.getProfile(session.currentMemberId).baizeDirection).toBeUndefined();

    expect(repository.findPublicPerson(DEMO_APPLICANT_PROFILE.id)).toBeUndefined();
    expect(repository.findAdminMember(DEMO_APPLICANT_PROFILE.id)).toBeUndefined();
    expect(repository.findPublicPerson(DEMO_MEMBER_PROFILE.publicId!)).toEqual(formalPublicPerson);
    expect(repository.findAdminMember(DEMO_MEMBER_PROFILE.id)).toEqual(formalAdminMember);
  });

  it("automatically projects a newly stored formal profile into the public directory", () => {
    const profileStore = useMemberProfileStore();
    profileStore.profiles["member-new"] = {
      id: "member-new",
      publicId: "new-media-member",
      name: "新成员",
      studentId: "20269999",
      grade: "2026 级",
      className: "数字媒体 1 班",
      center: "新媒体中心",
      centerSlug: "new-media",
      memberDuty: "普通成员",
      identity: "正式成员",
      bio: "",
    };

    const repository = useMemberRepository();
    const publicPerson = repository.findPublicPerson("new-media-member");

    expect(publicPerson).toMatchObject({
      id: "new-media-member",
      name: "新成员",
      centerName: "新媒体中心",
      centerSlug: "new-media",
      memberDuty: "普通成员",
      bio: "",
      isCore: false,
      avatarVisible: false,
    });
    expect(publicPerson).not.toHaveProperty("studentId");
    expect(publicPerson).not.toHaveProperty("className");
    expect(publicPerson).not.toHaveProperty("baizeDirection");
  });

  it("preserves a static core relationship while reflecting center-lead qualification", () => {
    const profileStore = useMemberProfileStore();
    const accessStore = useAdminAccessStore();
    const repository = useMemberRepository();
    const memberId = DEMO_MEMBER_PROFILE.id;
    const publicId = DEMO_MEMBER_PROFILE.publicId!;
    const owner = { account: "admin-alliance", name: "张同学", level: "owner" } as const;

    profileStore.profiles[memberId] = {
      ...profileStore.getProfile(memberId),
      memberDuty: "普通成员",
    };
    expect(repository.findPublicPerson(publicId)?.isCore).toBe(true);

    expect(accessStore.assignAdminCenterRole(
      "demo-member",
      "白泽开发中心负责人",
      owner,
    )).toBe(true);
    expect(repository.findPublicPerson(publicId)?.isCore).toBe(true);

    expect(accessStore.revokeAdmin("demo-member", owner)).toBe(true);
    expect(repository.findPublicPerson(publicId)?.isCore).toBe(true);
  });

  it("keeps static public core mappings out of the admin core candidates", () => {
    const repository = useMemberRepository();

    expect(repository.findAdminMember("member-wu")).toMatchObject({
      memberDuty: "核心人员",
      isCore: true,
    });
    expect(repository.publicCorePeople.value.find((person) => person.id === "wu-talent"))
      .toMatchObject({ memberDuty: "核心人员" });
  });

  it("shows enabled centre leads as core members in the public directory", () => {
    const repository = useMemberRepository();

    expect(repository.publicCorePeople.value.find((person) => person.name === "李同学"))
      .toMatchObject({ memberDuty: "核心人员", isCore: true });
  });

  it("keeps a stored static-core profile aligned with the public core projection", () => {
    const profileStore = useMemberProfileStore();
    profileStore.profiles["member-wu"] = {
      id: "member-wu",
      publicId: "wu-talent",
      name: "吴同学",
      studentId: "20250021",
      grade: "2025 级",
      className: "软件工程 1 班",
      center: "人才发展中心",
      centerSlug: "talent-development",
      memberDuty: "普通成员",
      identity: "正式成员",
      bio: "存储档案中的吴同学",
    };

    const person = useMemberRepository().findPublicPerson("wu-talent");
    expect(person).toMatchObject({ memberDuty: "核心人员", isCore: true });
  });

  it("ignores a disabled center-lead qualification when deriving core membership", () => {
    const repository = useMemberRepository();

    expect(repository.findAdminMember("member-zhao")?.centerLeadership).toBeUndefined();
  });

  it("keeps a linked static public core member out of core-member candidates", () => {
    const repository = useMemberRepository();
    const eligibleCandidateIds = repository.adminMembers.value
      .filter((member) => member.identity === "正式成员" && member.memberDuty !== "核心人员")
      .map((member) => member.id);

    expect(repository.findAdminMember("member-wu")?.memberDuty).toBe("核心人员");
    expect(eligibleCandidateIds).not.toContain("member-wu");
  });

  it("projects an enabled formal center lead without a stored profile into the public core directory", () => {
    const repository = useMemberRepository();
    const centerLead = repository.publicCorePeople.value.find((person) => person.name === "李同学");

    expect(centerLead).toMatchObject({
      id: "platform-member-li",
      name: "李同学",
      centerName: "新媒体中心",
      memberDuty: "核心人员",
      isCore: true,
    });
    expect(centerLead).not.toHaveProperty("studentId");
  });

  it("removes the legacy core placement contract with role, term, and public switches", () => {
    expect(adminMemberData).not.toHaveProperty("CORE_MEMBER_PLACEMENTS");
  });

  it("keeps an unsaved draft separate from the saved profile", () => {
    const session = useSessionStore();
    const store = useMemberProfileStore();
    const draft = store.createDraft(session.currentMemberId);

    draft.baizeDirection = "后端架构";
    draft.bio = "新的个人简介";

    expect(store.getProfile(session.currentMemberId).baizeDirection).toBe(DEMO_MEMBER_PROFILE.baizeDirection);
    expect(store.getProfile(session.currentMemberId).bio).toBe(DEMO_MEMBER_PROFILE.bio);

    store.updateProfile(session.currentMemberId, {
      baizeDirection: draft.baizeDirection,
      bio: draft.bio,
    });

    expect(store.getProfile(session.currentMemberId).baizeDirection).toBe("后端架构");
    expect(store.getProfile(session.currentMemberId).bio).toBe("新的个人简介");
  });

  it("can cancel a draft by starting from the latest saved snapshot", () => {
    const session = useSessionStore();
    const store = useMemberProfileStore();
    store.updateProfile(session.currentMemberId, { baizeDirection: "大模型 AIGC" });

    const draft = store.createDraft(session.currentMemberId);
    draft.baizeDirection = "UI/UX 设计";

    const cancelled = store.createDraft(session.currentMemberId);
    expect(cancelled.baizeDirection).toBe("大模型 AIGC");
    expect(store.getProfile(session.currentMemberId).baizeDirection).toBe("大模型 AIGC");
  });

  it("projects the same saved values to public and admin records", () => {
    const session = useSessionStore();
    const store = useMemberProfileStore();
    store.updateProfile(session.currentMemberId, {
      baizeDirection: "嵌入式开发",
      bio: "统一简介",
      avatarUrl: "blob:demo-avatar"
    });

    const publicBase = CORE_PEOPLE.find((person) => person.id === DEMO_MEMBER_PROFILE.publicId)!;
    const adminBase = ADMIN_MEMBERS.find((member) => member.id === DEMO_MEMBER_PROFILE.id)!;
    const profile = store.getProfile(session.currentMemberId);
    const publicProjection = projectMemberToPublic(profile, publicBase);
    const adminProjection = projectMemberToAdmin(profile, adminBase);

    expect(publicProjection.baizeDirection).toBe(adminProjection.baizeDirection);
    expect(publicProjection.baizeDirection).toBe("嵌入式开发");
    expect(publicProjection.bio).toBe(adminProjection.profileSummary);
    expect(publicProjection.avatarVisible).toBe(true);
    expect(adminProjection.avatarUrl).toBe("blob:demo-avatar");
  });

  it("never projects private member fields and hides directions outside Baize", () => {
    const baizeBase = CORE_PEOPLE.find((person) => person.id === DEMO_MEMBER_PROFILE.publicId)!;
    const baizeProjection = projectMemberToPublic(
      { ...DEMO_MEMBER_PROFILE, baizeDirection: "鸿蒙开发" },
      baizeBase,
    );
    const nonBaizeProjection = projectMemberToPublic(
      {
        ...DEMO_MEMBER_PROFILE,
        center: "新媒体中心",
        centerSlug: "new-media",
        baizeDirection: "鸿蒙开发",
      },
      { ...baizeBase, centerSlug: "new-media", centerName: "新媒体中心" },
    );

    expect(baizeProjection.baizeDirection).toBe("鸿蒙开发");
    expect(nonBaizeProjection.baizeDirection).toBeUndefined();
    expect(nonBaizeProjection).not.toHaveProperty("studentId");
    expect(nonBaizeProjection).not.toHaveProperty("className");
    expect(nonBaizeProjection).not.toHaveProperty("identity");
  });

  it("automatically publishes an uploaded avatar and falls back after removal", () => {
    const publicBase = CORE_PEOPLE.find((person) => person.id === DEMO_MEMBER_PROFILE.publicId)!;
    const withAvatar = projectMemberToPublic(
      { ...DEMO_MEMBER_PROFILE, avatarUrl: "blob:demo-avatar" },
      publicBase,
    );
    const withoutAvatar = projectMemberToPublic(
      { ...DEMO_MEMBER_PROFILE, avatarUrl: undefined },
      publicBase,
    );

    expect(withAvatar).toMatchObject({ avatarVisible: true, avatarUrl: "blob:demo-avatar" });
    expect(withoutAvatar.avatarVisible).toBe(false);
    expect(withoutAvatar).not.toHaveProperty("avatarUrl");
  });

  it("requires a valid direction only for Baize and keeps bio optional", () => {
    expect(validateMemberProfileDraft({
      center: "白泽开发中心",
      baizeDirection: undefined,
      bio: "",
    })).toEqual({ baizeDirection: "请选择白泽实践方向。" });
    expect(validateMemberProfileDraft({
      center: "新媒体中心",
      baizeDirection: undefined,
      bio: "  ",
    })).toEqual({});
    expect(validateMemberProfileDraft({
      center: "白泽开发中心",
      baizeDirection: "鸿蒙开发",
      bio: "简介",
    })).toEqual({});
  });

  it("accepts common image files and rejects unsupported or oversized files", () => {
    expect(isSupportedAvatar({ type: "image/png", size: 1024 })).toBe(true);
    expect(isSupportedAvatar({ type: "image/svg+xml", size: 1024 })).toBe(false);
    expect(isSupportedAvatar({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toBe(false);
  });
});
