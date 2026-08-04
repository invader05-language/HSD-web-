import { describe, expect, it } from "vitest";
import {
  DEMO_MEMBER_RESULT,
  getDemoMemberResult,
  applyPublishedAssessmentProjection,
  describeAdmission,
  describeAssessment
} from "../../app/data/member-results";
import { DEMO_APPLICANT_PROFILE, DEMO_MEMBER_PROFILE } from "../../app/data/member-profile";

describe("member result presentation", () => {
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
