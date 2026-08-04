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
import { useRecruitmentBatchStore } from "../../app/stores/recruitment-batch";
import { useSessionStore } from "../../app/stores/session";
import { DEMO_MEMBER_PROFILE } from "../../app/data/member-profile";

const CURRENT_BATCH_ID = "batch-current";

function signInApplicant() {
  const session = useSessionStore();
  session.signIn("demo-applicant");
  return session;
}

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
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const currentProfile = profileStore.getProfile(session.currentMemberId);
    const profileDraft = createRegistrationProfileDraft(currentProfile);
    const applicationDraft = createRecruitmentApplicationDraft();

    expect(profileDraft).toMatchObject({
      name: currentProfile.name,
      studentId: currentProfile.studentId,
      grade: currentProfile.grade,
      className: currentProfile.className,
    });
    expect(profileDraft).not.toHaveProperty("direction");
    expect(profileDraft).not.toHaveProperty("experience");
    expect(profileDraft).not.toHaveProperty("expectation");
    expect(applicationDraft).not.toHaveProperty("experience");
    expect(applicationDraft).not.toHaveProperty("expectation");
  });

  it("keeps registration drafts separate from the saved member profile until final submission", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const originalProfile = profileStore.getProfile(session.currentMemberId);
    const draft = createRegistrationProfileDraft(originalProfile);

    draft.name = "报名同学";
    draft.bio = "仅存在报名草稿中的个人简介";

    expect(profileStore.getProfile(session.currentMemberId).name).not.toBe("报名同学");
    expect(profileStore.getProfile(session.currentMemberId).bio).not.toBe("仅存在报名草稿中的个人简介");
  });

  it("updates only the preparatory profile when a valid application is submitted", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const formalProfileBefore = { ...profileStore.getProfile(DEMO_MEMBER_PROFILE.id) };
    const profileDraft = {
      ...createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      name: "报名同学",
      bio: "我希望通过完整的项目协作，持续积累可展示的产品开发实践成果。",
    };

    applicationStore.submitApplication(profileDraft, validApplicationDraft(), true);

    expect(profileStore.getProfile(session.currentMemberId).name).toBe("报名同学");
    expect(profileStore.getProfile(session.currentMemberId).bio)
      .toBe("我希望通过完整的项目协作，持续积累可展示的产品开发实践成果。");
    expect(profileStore.getProfile(DEMO_MEMBER_PROFILE.id)).toEqual(formalProfileBefore);
    expect(applicationStore.isSubmitted).toBe(true);
  });

  it("does not allow a formal member account to create a preparatory application", () => {
    const session = useSessionStore();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();

    session.signIn("demo-member");

    expect(() => applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      true,
    )).toThrow("仅预备成员账号可提交招新报名");
  });

  it("stores contact only in the recruitment application state", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();

    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      true,
    );

    expect(applicationStore.submittedApplication?.contact).toBe("demo@example.com");
    expect(profileStore.getProfile(session.currentMemberId)).not.toHaveProperty("contact");
  });

  it("rejects invalid submissions in the state layer before changing saved profile data", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const originalName = profileStore.getProfile(session.currentMemberId).name;

    expect(() => applicationStore.submitApplication(
      { ...createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)), name: " " },
      { ...validApplicationDraft(), baizeDirection: undefined },
      true,
    )).toThrow("报名信息校验失败");

    expect(() => applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      false,
    )).toThrow("报名信息校验失败");

    expect(profileStore.getProfile(session.currentMemberId).name).toBe(originalName);
    expect(applicationStore.isSubmitted).toBe(false);
  });

  it("validates required registration fields while keeping bio optional", () => {
    expect(validateRegistrationProfileDraft({
      name: " ",
      studentId: "12",
      grade: "",
      className: " ",
      bio: "",
    })).toMatchObject({
      name: expect.any(String),
      studentId: expect.any(String),
      grade: expect.any(String),
      className: expect.any(String),
    });
    expect(validateRegistrationProfileDraft({
      name: "陈同学",
      studentId: "20260026",
      grade: "2026 级",
      className: "软件工程 2 班",
      bio: "",
    })).toEqual({});
    expect(validateRegistrationProfileDraft({
      name: "陈同学",
      studentId: "20260026",
      grade: "2026 级",
      className: "软件工程 2 班",
      bio: "超".repeat(181),
    })).toEqual({ bio: "个人简介最多 180 个字符。" });
  });

  it("keeps the private contact validation with the first registration step", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();

    expect(validateRegistrationStep(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
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

  it("drops a stale Baize direction when a non-Baize application is submitted", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();

    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      {
        ...validApplicationDraft(),
        firstChoice: "新媒体中心",
        secondChoice: "人才发展中心",
        thirdChoice: "拓维策划中心",
        baizeDirection: "鸿蒙开发",
      },
      true,
    );

    expect(applicationStore.submittedApplication?.baizeDirection).toBeUndefined();
  });

  it("requires the truthfulness confirmation and prevents duplicate in-session submissions", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();

    expect(validateConfirmation(false)).toEqual({ confirmation: "请确认资料真实后再提交。" });

    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      true,
    );

    expect(() => applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      true,
    )).toThrow("当前账号已提交报名");
  });

  it("keys applications by batch and member while keeping a compatibility submitted getter", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();

    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      true,
      { batchId: CURRENT_BATCH_ID },
    );

    expect(applicationStore.getApplication(CURRENT_BATCH_ID, session.currentMemberId)).toMatchObject({
      batchId: CURRENT_BATCH_ID,
      memberId: session.currentMemberId,
      batchVersionAtSubmission: 1,
      batchNameSnapshot: "2026 秋季招新",
      status: "submitted",
      applicantProfileSnapshot: expect.objectContaining({ name: expect.any(String) }),
      preferences: [
        { rank: 1, center: "白泽开发中心" },
        { rank: 2, center: "新媒体中心" },
        { rank: 3, center: "人才发展中心" },
      ],
    });
    expect(applicationStore.currentApplication?.batchId).toBe(CURRENT_BATCH_ID);
    expect(applicationStore.latestApplication?.batchId).toBe(CURRENT_BATCH_ID);
    expect(applicationStore.submittedApplication?.batchId).toBe(CURRENT_BATCH_ID);
  });

  it("allows a withdrawn application to resubmit in the same batch without creating a duplicate", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const profileDraft = createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId));

    applicationStore.submitApplication(profileDraft, validApplicationDraft(), true, { batchId: CURRENT_BATCH_ID });
    const original = applicationStore.currentApplication!;
    applicationStore.withdrawApplication(CURRENT_BATCH_ID);
    expect(applicationStore.currentApplication?.status).toBe("withdrawn");

    applicationStore.submitApplication(profileDraft, {
      ...validApplicationDraft(),
      firstChoice: "新媒体中心",
      secondChoice: "拓维策划中心",
      thirdChoice: "人才发展中心",
      baizeDirection: undefined,
    }, true, { batchId: CURRENT_BATCH_ID });

    expect(applicationStore.currentApplication?.id).toBe(original.id);
    expect(applicationStore.currentApplication?.status).toBe("submitted");
    expect(applicationStore.currentApplication?.firstChoice).toBe("新媒体中心");
  });

  it("updates an existing submitted application in place when the member explicitly edits it", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const profileDraft = createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId));

    applicationStore.submitApplication(profileDraft, validApplicationDraft(), true, { batchId: CURRENT_BATCH_ID });
    const originalId = applicationStore.currentApplication?.id;

    applicationStore.submitApplication(profileDraft, {
      ...validApplicationDraft(),
      firstChoice: "新媒体中心",
      secondChoice: "拓维策划中心",
      thirdChoice: "人才发展中心",
      baizeDirection: undefined,
    }, true, { batchId: CURRENT_BATCH_ID, allowExistingUpdate: true });

    expect(applicationStore.currentApplication).toMatchObject({
      id: originalId,
      status: "submitted",
      firstChoice: "新媒体中心",
      submittedAt: expect.any(String),
    });
  });

  it("retains an unavailable center flag on existing snapshots after batch configuration changes", () => {
    const session = signInApplicant();
    const applicantId = session.currentMemberId;
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const batchStore = useRecruitmentBatchStore();
    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      true,
      { batchId: CURRENT_BATCH_ID },
    );

    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    batchStore.updateBatch(CURRENT_BATCH_ID, {
      openCenterIds: ["new-media", "tuowei-planning", "talent-development"],
    });

    const application = applicationStore.getApplication(CURRENT_BATCH_ID, applicantId)!;
    expect(application.centerConfigurationSnapshot.find((item) => item.center === "白泽开发中心"))
      .toMatchObject({ availableAtSubmission: true, currentlyAvailable: false });
  });

  it("locks a submitted application when the batch deadline has passed", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const beforeDeadline = new Date("2026-09-17T23:00:00.000Z");
    const afterDeadline = new Date("2026-09-18T00:00:00.000Z");

    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      true,
      { batchId: CURRENT_BATCH_ID, now: beforeDeadline },
    );
    applicationStore.lockExpiredApplications(afterDeadline);

    expect(applicationStore.getApplication(CURRENT_BATCH_ID, session.currentMemberId)?.status)
      .toBe("locked");
  });

  it("keeps a withdrawn application withdrawn after the batch deadline", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const beforeDeadline = new Date("2026-09-17T23:00:00.000Z");
    const afterDeadline = new Date("2026-09-18T00:00:00.000Z");

    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      true,
      { batchId: CURRENT_BATCH_ID, now: beforeDeadline },
    );
    applicationStore.withdrawApplication(CURRENT_BATCH_ID, session.currentMemberId, beforeDeadline);
    applicationStore.lockExpiredApplications(afterDeadline);

    expect(applicationStore.getApplication(CURRENT_BATCH_ID, session.currentMemberId)?.status)
      .toBe("withdrawn");
    expect(applicationStore.isSubmitted).toBe(false);
  });

  it("rejects explicit submission when batch fixtures contain more than one open batch", () => {
    const session = signInApplicant();
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    const batchStore = useRecruitmentBatchStore();
    batchStore.replaceBatches([
      batchStore.getBatch("batch-current")!,
      {
        ...batchStore.getBatch("batch-current")!,
        id: "batch-conflict",
      },
    ]);

    expect(() => applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(session.currentMemberId)),
      validApplicationDraft(),
      true,
      { batchId: CURRENT_BATCH_ID },
    )).toThrow("BATCH_ALREADY_OPEN");
  });
});
