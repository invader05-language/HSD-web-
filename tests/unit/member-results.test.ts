import { describe, expect, it } from "vitest";
import {
  DEMO_MEMBER_RESULT,
  describeAdmission,
  describeAssessment
} from "../../app/data/member-results";

describe("member result presentation", () => {
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
