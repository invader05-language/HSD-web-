import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  DEMO_MEMBER_PROFILE,
  projectMemberToAdmin,
  projectMemberToPublic,
} from "../../app/data/member-profile";
import { ADMIN_MEMBERS } from "../../app/data/admin-members";
import { CORE_PEOPLE } from "../../app/data/people";
import { useMemberProfileStore } from "../../app/stores/member-profile";
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

  it("keeps an unsaved draft separate from the saved profile", () => {
    const store = useMemberProfileStore();
    const draft = store.createDraft();

    draft.direction = "新的实践方向";
    draft.bio = "新的个人简介";

    expect(store.currentMember.direction).toBe(DEMO_MEMBER_PROFILE.direction);
    expect(store.currentMember.bio).toBe(DEMO_MEMBER_PROFILE.bio);

    store.updateOwnProfile({ direction: draft.direction, bio: draft.bio });

    expect(store.currentMember.direction).toBe("新的实践方向");
    expect(store.currentMember.bio).toBe("新的个人简介");
  });

  it("can cancel a draft by starting from the latest saved snapshot", () => {
    const store = useMemberProfileStore();
    store.updateOwnProfile({ direction: "已保存方向" });

    const draft = store.createDraft();
    draft.direction = "未保存方向";

    const cancelled = store.createDraft();
    expect(cancelled.direction).toBe("已保存方向");
    expect(store.currentMember.direction).toBe("已保存方向");
  });

  it("projects the same saved values to public and admin records", () => {
    const store = useMemberProfileStore();
    store.updateOwnProfile({
      direction: "统一方向",
      bio: "统一简介",
      avatarUrl: "blob:demo-avatar"
    });

    const publicBase = CORE_PEOPLE.find((person) => person.id === DEMO_MEMBER_PROFILE.publicId)!;
    const adminBase = ADMIN_MEMBERS.find((member) => member.id === DEMO_MEMBER_PROFILE.id)!;
    const publicProjection = projectMemberToPublic(store.currentMember, publicBase);
    const adminProjection = projectMemberToAdmin(store.currentMember, adminBase);

    expect(publicProjection.direction).toBe(adminProjection.direction);
    expect(publicProjection.bio).toBe(adminProjection.profileSummary);
    expect(publicProjection.avatarVisible).toBe(true);
    expect(adminProjection.avatarVisible).toBe(true);
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
