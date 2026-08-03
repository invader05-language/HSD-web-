import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  DEMO_APPLICANT_PROFILE,
  DEMO_MEMBER_PROFILE,
  projectMemberToAdmin,
  projectMemberToPublic,
} from "../../app/data/member-profile";
import { ADMIN_MEMBERS } from "../../app/data/admin-members";
import { CORE_PEOPLE } from "../../app/data/people";
import { useMemberProfileStore } from "../../app/stores/member-profile";
import { useSessionStore } from "../../app/stores/session";
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
      direction: "预备成员的新方向",
      bio: "预备成员的新简介，不得覆盖任何正式成员公开资料。",
      avatarUrl: "blob:applicant-avatar",
    });

    expect(repository.findPublicPerson(DEMO_APPLICANT_PROFILE.id)).toBeUndefined();
    expect(repository.findAdminMember(DEMO_APPLICANT_PROFILE.id)).toBeUndefined();
    expect(repository.findPublicPerson(DEMO_MEMBER_PROFILE.publicId!)).toEqual(formalPublicPerson);
    expect(repository.findAdminMember(DEMO_MEMBER_PROFILE.id)).toEqual(formalAdminMember);
  });

  it("keeps an unsaved draft separate from the saved profile", () => {
    const session = useSessionStore();
    const store = useMemberProfileStore();
    const draft = store.createDraft(session.currentMemberId);

    draft.direction = "新的实践方向";
    draft.bio = "新的个人简介";

    expect(store.getProfile(session.currentMemberId).direction).toBe(DEMO_MEMBER_PROFILE.direction);
    expect(store.getProfile(session.currentMemberId).bio).toBe(DEMO_MEMBER_PROFILE.bio);

    store.updateProfile(session.currentMemberId, { direction: draft.direction, bio: draft.bio });

    expect(store.getProfile(session.currentMemberId).direction).toBe("新的实践方向");
    expect(store.getProfile(session.currentMemberId).bio).toBe("新的个人简介");
  });

  it("can cancel a draft by starting from the latest saved snapshot", () => {
    const session = useSessionStore();
    const store = useMemberProfileStore();
    store.updateProfile(session.currentMemberId, { direction: "已保存方向" });

    const draft = store.createDraft(session.currentMemberId);
    draft.direction = "未保存方向";

    const cancelled = store.createDraft(session.currentMemberId);
    expect(cancelled.direction).toBe("已保存方向");
    expect(store.getProfile(session.currentMemberId).direction).toBe("已保存方向");
  });

  it("projects the same saved values to public and admin records", () => {
    const session = useSessionStore();
    const store = useMemberProfileStore();
    store.updateProfile(session.currentMemberId, {
      direction: "统一方向",
      bio: "统一简介",
      avatarUrl: "blob:demo-avatar"
    });

    const publicBase = CORE_PEOPLE.find((person) => person.id === DEMO_MEMBER_PROFILE.publicId)!;
    const adminBase = ADMIN_MEMBERS.find((member) => member.id === DEMO_MEMBER_PROFILE.id)!;
    const profile = store.getProfile(session.currentMemberId);
    const publicProjection = projectMemberToPublic(profile, publicBase);
    const adminProjection = projectMemberToAdmin(profile, adminBase);

    expect(publicProjection.direction).toBe(adminProjection.direction);
    expect(publicProjection.bio).toBe(adminProjection.profileSummary);
    expect(publicProjection.avatarVisible).toBe(true);
    expect(adminProjection.avatarUrl).toBe("blob:demo-avatar");
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

  it("requires non-blank direction and bio within the field limits", () => {
    expect(validateMemberProfileDraft({ direction: "  ", bio: "简介" })).toEqual({
      direction: "请填写实践方向。",
    });
    expect(validateMemberProfileDraft({ direction: "开发", bio: "  " })).toEqual({
      bio: "请填写个人简介。",
    });
    expect(validateMemberProfileDraft({ direction: "开发", bio: "简介" })).toEqual({});
  });

  it("accepts common image files and rejects unsupported or oversized files", () => {
    expect(isSupportedAvatar({ type: "image/png", size: 1024 })).toBe(true);
    expect(isSupportedAvatar({ type: "image/svg+xml", size: 1024 })).toBe(false);
    expect(isSupportedAvatar({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toBe(false);
  });
});
