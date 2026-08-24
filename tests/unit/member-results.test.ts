import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  DEMO_MEMBER_RESULT,
  getDemoMemberResult,
  applyPublishedAssessmentProjection,
  memberResultFromApi,
  describeAdmission,
  describeAssessment,
  resultCenterMemberFromSession,
} from "../../app/data/member-results";
import { DEMO_APPLICANT_PROFILE, DEMO_MEMBER_PROFILE } from "../../app/data/member-profile";
import { useMemberRepository } from "../../app/composables/useMemberRepository";
import { useMemberProfileStore } from "../../app/stores/member-profile";

describe("member result presentation", () => {
  it("keeps an opted-out formal profile out of the public directory", () => {
    setActivePinia(createPinia());
    const profiles = useMemberProfileStore();
    const repository = useMemberRepository();

    expect(repository.findPublicPerson(DEMO_MEMBER_PROFILE.publicId!)).toBeDefined();
    profiles.updateProfile(DEMO_MEMBER_PROFILE.id, { publicDirectoryVisible: false });
    expect(repository.findPublicPerson(DEMO_MEMBER_PROFILE.publicId!)).toBeUndefined();
  });

  it("projects the private API result without assessment history or internal notes", () => {
    expect(memberResultFromApi({
      id: "result-1",
      batch: { id: "batch-1", name: "2026 秋季招新" },
      decision: "ADMITTED",
      finalCenter: { id: "baize", slug: "baize-development", name: "白泽开发中心" },
      admissionSource: "FIRST_CHOICE",
      baizeDirection: "HARMONYOS_DEVELOPMENT",
      preferences: [
        { rank: "FIRST", center: { id: "baize", slug: "baize-development", name: "白泽开发中心" } },
        { rank: "SECOND", center: { id: "media", slug: "media", name: "新媒体中心" } },
      ],
      responsibleContacts: [
        { personId: "minister-1", name: "部长甲", position: "CENTER_MINISTER", displayContact: "138 **** 0000" },
        { personId: "minister-2", name: "部长乙", position: "CENTER_MINISTER", displayContact: "139 **** 1111" },
      ],
      publishedAt: "2026-08-07T09:00:00.000Z",
    })).toEqual({
      batchLabel: "2026 秋季招新",
      status: "admitted",
      identity: "正式成员",
      preferences: [
        { rank: 1, center: "白泽开发中心" },
        { rank: 2, center: "新媒体中心" },
      ],
      baizeInterestDirection: "鸿蒙开发",
      currentStage: "考核已结束",
      currentConclusion: "通过",
      finalCenter: "白泽开发中心",
      responsibleContacts: [
        { personId: "minister-1", role: "部长", name: "部长甲", contact: "", displayContact: "138 **** 0000" },
        { personId: "minister-2", role: "部长", name: "部长乙", contact: "", displayContact: "139 **** 1111" },
      ],
    });
    expect(memberResultFromApi({
      id: "result-2",
      batch: { id: "batch-1", name: "2026 秋季招新" },
      decision: "NOT_ADMITTED",
      finalCenter: null,
      admissionSource: null,
      baizeDirection: null,
      preferences: [],
      responsibleContacts: [],
      publishedAt: "2026-08-07T09:00:00.000Z",
    }).acceptsTransfer).toBeUndefined();
    expect(memberResultFromApi()).toMatchObject({
      batchLabel: "暂无已发布结果",
      status: "no-application",
      currentStage: "尚未开始",
    });
  });

  it("projects the authenticated API person for an empty production result center", () => {
    expect(resultCenterMemberFromSession({
      id: "d5df7b31-eddb-4c6d-b234-8af26ddb0946",
      name: "徐一鸣",
      status: "FORMAL_MEMBER",
    })).toEqual({
      id: "d5df7b31-eddb-4c6d-b234-8af26ddb0946",
      name: "徐一鸣",
      identity: "正式成员",
    });
    expect(memberResultFromApi(undefined, "正式成员")).toMatchObject({
      status: "no-application",
      identity: "正式成员",
    });
  });

  it("selects result data by the single current member id", () => {
    expect(getDemoMemberResult(DEMO_MEMBER_PROFILE.id).status).toBe("admitted");

    const applicantWithoutApplication = getDemoMemberResult(DEMO_APPLICANT_PROFILE.id);
    expect(applicantWithoutApplication).toMatchObject({
      status: "no-application",
      identity: "预备成员",
      preferences: [],
      currentStage: "尚未开始",
    });

    const applicantWithApplication = getDemoMemberResult(DEMO_APPLICANT_PROFILE.id, {
      memberId: DEMO_APPLICANT_PROFILE.id,
      contact: "demo@example.com",
      firstChoice: "新媒体中心",
      secondChoice: "拓维策划中心",
      thirdChoice: "人才发展中心",
      acceptsAdjustment: true,
      status: "submitted",
      submittedAt: "2026-08-02T00:00:00.000Z",
    });

    expect(applicantWithApplication).toMatchObject({
      status: "pending",
      identity: "预备成员",
      currentStage: "面试",
      currentConclusion: "待公布",
      preferences: [
        { rank: 1, center: "新媒体中心" },
        { rank: 2, center: "拓维策划中心" },
        { rank: 3, center: "人才发展中心" },
      ],
    });

    expect(getDemoMemberResult("member-wang")).toMatchObject({
      status: "no-application",
      identity: "正式成员",
      preferences: [],
      currentStage: "尚未开始",
    });
  });

  it("presents the current admitted destination without exposing history", () => {
    expect(describeAdmission(DEMO_MEMBER_RESULT)).toEqual({
      badge: "已录取",
      headline: "你已正式加入白泽开发中心",
      description:
        "你已完成本期招新考核，当前身份已由预备成员更新为正式成员。后续安排请与对应负责人保持联系。"
    });
    expect(DEMO_MEMBER_RESULT.preferences.map((item) => item.center)).toEqual([
      "白泽开发中心",
      "新媒体中心",
      "人才发展中心"
    ]);
  });

  it("presents only the current assessment state after assessment ends", () => {
    expect(describeAssessment(DEMO_MEMBER_RESULT)).toEqual({
      badge: "考核已结束",
      headline: "当前没有进行中的考核",
      description:
        "你的本期考核已经结束。本页只呈现当前有效状态，不展示历史轮次、分数、公开评语或调剂过程。"
    });
  });

  it("hides the offline adjustment process from an admitted member", () => {
    const result = describeAdmission({
      ...DEMO_MEMBER_RESULT,
      status: "adjusted-admission",
      finalCenter: "新媒体中心",
      finalDirection: undefined
    });

    expect(result).toEqual({
      badge: "已录取",
      headline: "你已正式加入新媒体中心",
      description:
        "你已完成本期招新考核，当前身份已由预备成员更新为正式成员。后续安排请与对应负责人保持联系。"
    });
  });

  it("uses a published assessment projection without exposing internal notes", () => {
    const runtimeProjection = {
      memberId: DEMO_MEMBER_PROFILE.id,
      center: "白泽开发中心",
      finalDecision: "not-admitted",
      publishedAt: "2026-08-04T10:20:00.000Z",
      internalNote: "这条内部备注不得进入成员结果中心",
    };
    const result = applyPublishedAssessmentProjection(DEMO_MEMBER_RESULT, runtimeProjection);

    expect(result).toMatchObject({
      status: "not-admitted",
      identity: "预备成员",
      currentStage: "考核已结束",
      currentConclusion: "未通过",
    });
    expect(result).not.toHaveProperty("internalNote");
  });

  it.each([
    ["pending", "待公布", "录取结果待公布"],
    ["waitlisted", "候补", "你当前处于候补状态"],
    ["not-admitted", "未录取", "本期未录取"],
    ["no-application", "无本期申请", "暂无本期申请"]
  ] as const)("maps %s to an explicit current result", (status, badge, headline) => {
    const result = describeAdmission({
      ...DEMO_MEMBER_RESULT,
      status,
      finalCenter: undefined,
      finalDirection: undefined
    });

    expect(result.badge).toBe(badge);
    expect(result.headline).toBe(headline);
  });
});
