import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  createRecruitmentApplicationDraft,
  createRegistrationProfileDraft,
  type RecruitmentApplicationDraft,
} from "../../app/data/recruitment-application";
import {
  validateApplicationDraft,
  validateConfirmation,
  validateRegistrationProfileDraft,
  validateRegistrationStep,
} from "../../app/utils/recruitment-application-form";
import { useMemberProfileStore } from "../../app/stores/member-profile";
import { useRecruitmentApplicationStore } from "../../app/stores/recruitment-application";

function validApplicationDraft(): RecruitmentApplicationDraft {
  return {
    ...createRecruitmentApplicationDraft(),
    contact: "demo@example.com",
    firstChoice: "白泽开发中心",
    secondChoice: "新媒体中心",
    thirdChoice: "人才发展中心",
    baizeDirection: "鸿蒙开发",
    acceptsAdjustment: true,
  };
}

describe("recruitment application domain", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("creates a registration draft without experience-and-expectation fields", () => {
    const profileStore = useMemberProfileStore();
    const profileDraft = createRegistrationProfileDraft(profileStore.currentMember);
    const applicationDraft = createRecruitmentApplicationDraft();

    expect(profileDraft).toMatchObject({
      name: profileStore.currentMember.name,
      studentId: profileStore.currentMember.studentId,
      grade: profileStore.currentMember.grade,
      className: profileStore.currentMember.className,
    });
    expect(profileDraft).not.toHaveProperty("experience");
    expect(profileDraft).not.toHaveProperty("expectation");
    expect(applicationDraft).not.toHaveProperty("experience");
    expect(applicationDraft).not.toHaveProperty("expectation");
  });

  it("keeps registration drafts separate from the saved member profile until final submission", () => {
    const profileStore = useMemberProfileStore();
    const draft = createRegistrationProfileDraft(profileStore.currentMember);

    draft.name = "报名同学";
    draft.direction = "校园产品开发";

    expect(profileStore.currentMember.name).not.toBe("报名同学");
    expect(profileStore.currentMember.direction).not.toBe("校园产品开发");
  });

  it("updates the saved profile only when a valid application is submitted", () => {
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const profileDraft = {
      ...createRegistrationProfileDraft(profileStore.currentMember),
      name: "报名同学",
      direction: "校园产品开发",
      bio: "我希望通过完整的项目协作，持续积累可展示的产品开发实践成果。",
    };

    applicationStore.submitApplication(profileDraft, validApplicationDraft(), true);

    expect(profileStore.currentMember.name).toBe("报名同学");
    expect(profileStore.currentMember.direction).toBe("校园产品开发");
    expect(applicationStore.isSubmitted).toBe(true);
  });

  it("stores contact only in the recruitment application state", () => {
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();

    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.currentMember),
      validApplicationDraft(),
      true,
    );

    expect(applicationStore.submittedApplication?.contact).toBe("demo@example.com");
    expect(profileStore.currentMember).not.toHaveProperty("contact");
  });

  it("rejects invalid submissions in the state layer before changing saved profile data", () => {
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const originalName = profileStore.currentMember.name;

    expect(() => applicationStore.submitApplication(
      { ...createRegistrationProfileDraft(profileStore.currentMember), name: " " },
      { ...validApplicationDraft(), baizeDirection: undefined },
      true,
    )).toThrow("报名信息校验失败");

    expect(() => applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.currentMember),
      validApplicationDraft(),
      false,
    )).toThrow("报名信息校验失败");

    expect(profileStore.currentMember.name).toBe(originalName);
    expect(applicationStore.isSubmitted).toBe(false);
  });

  it("validates required registration profile fields and their lengths", () => {
    expect(validateRegistrationProfileDraft({
      name: " ",
      studentId: "12",
      grade: "",
      className: " ",
      direction: " ",
      bio: "太短",
    })).toMatchObject({
      name: expect.any(String),
      studentId: expect.any(String),
      grade: expect.any(String),
      className: expect.any(String),
      direction: expect.any(String),
      bio: expect.any(String),
    });
  });

  it("keeps the private contact validation with the first registration step", () => {
    const profileStore = useMemberProfileStore();

    expect(validateRegistrationStep(
      createRegistrationProfileDraft(profileStore.currentMember),
      { ...createRecruitmentApplicationDraft(), contact: " " },
    )).toMatchObject({ contact: expect.any(String) });
  });

  it("requires a first choice, unique non-Baize later choices, and a Baize direction", () => {
    expect(validateApplicationDraft({
      ...createRecruitmentApplicationDraft(),
      contact: "demo@example.com",
      secondChoice: "白泽开发中心" as never,
      thirdChoice: "白泽开发中心" as never,
    })).toMatchObject({
      firstChoice: expect.any(String),
      secondChoice: expect.any(String),
      thirdChoice: expect.any(String),
    });

    expect(validateApplicationDraft({
      ...validApplicationDraft(),
      secondChoice: "新媒体中心",
      thirdChoice: "新媒体中心",
    })).toMatchObject({ thirdChoice: expect.any(String) });

    expect(validateApplicationDraft({
      ...validApplicationDraft(),
      baizeDirection: undefined,
    })).toMatchObject({ baizeDirection: expect.any(String) });

    expect(validateApplicationDraft({
      ...validApplicationDraft(),
      secondChoice: "不存在的中心" as never,
    })).toMatchObject({ secondChoice: expect.any(String) });
  });

  it("clears a Baize direction when the first choice changes away from Baize", () => {
    const applicationStore = useRecruitmentApplicationStore();
    const draft = validApplicationDraft();

    applicationStore.setFirstChoice(draft, "新媒体中心");

    expect(draft.baizeDirection).toBeUndefined();
  });

  it("requires the truthfulness confirmation and prevents duplicate in-session submissions", () => {
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();

    expect(validateConfirmation(false)).toEqual({ confirmation: "请确认资料真实后再提交。" });

    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.currentMember),
      validApplicationDraft(),
      true,
    );

    expect(() => applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.currentMember),
      validApplicationDraft(),
      true,
    )).toThrow("当前账号已提交报名");
  });
});
