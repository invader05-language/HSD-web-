export type CenterName =
  | "白泽开发中心"
  | "新媒体中心"
  | "拓维策划中心"
  | "人才发展中心";

export type AdmissionStatus =
  | "pending"
  | "admitted"
  | "waitlisted"
  | "not-admitted"
  | "adjusted-admission"
  | "no-application";

export type MemberIdentity = "预备成员" | "正式成员" | "未录取";

export type AssessmentStage =
  | "面试"
  | "第一轮考核"
  | "第二轮考核"
  | "第三轮考核"
  | "考核已结束";

export type AssessmentConclusion = "待公布" | "通过" | "未通过";

export interface MemberPreference {
  rank: 1 | 2 | 3;
  center: CenterName;
}

export interface ResponsibleContact {
  role: string;
  name: string;
  contact: string;
}

export interface MemberResultRecord {
  batchLabel: string;
  status: AdmissionStatus;
  identity: MemberIdentity;
  preferences: MemberPreference[];
  acceptsTransfer: boolean;
  baizeInterestDirection?: string;
  currentStage: AssessmentStage;
  currentConclusion: AssessmentConclusion;
  finalCenter?: CenterName;
  finalDirection?: string;
  responsibleContact?: ResponsibleContact;
}

export interface ResultPresentation {
  badge: string;
  headline: string;
  description: string;
}

export const DEMO_MEMBER_RESULT: MemberResultRecord = {
  batchLabel: "2026 秋季招新",
  status: "admitted",
  identity: "正式成员",
  preferences: [
    { rank: 1, center: "白泽开发中心" },
    { rank: 2, center: "新媒体中心" },
    { rank: 3, center: "人才发展中心" }
  ],
  acceptsTransfer: true,
  baizeInterestDirection: "鸿蒙开发",
  currentStage: "考核已结束",
  currentConclusion: "通过",
  finalCenter: "白泽开发中心",
  finalDirection: "鸿蒙开发",
  responsibleContact: {
    role: "白泽开发中心负责人",
    name: "负责人姓名",
    contact: "138 **** 8899"
  }
};

export function describeAdmission(record: MemberResultRecord): ResultPresentation {
  switch (record.status) {
    case "admitted":
    case "adjusted-admission":
      return {
        badge: "已录取",
        headline: `你已正式加入${record.finalCenter ?? "对应中心"}`,
        description:
          "你已完成本期招新考核，当前身份已由预备成员更新为正式成员。后续安排请与对应负责人保持联系。"
      };
    case "pending":
      return {
        badge: "待公布",
        headline: "录取结果待公布",
        description: "当前结果尚未正式发布，请稍后再次查看。"
      };
    case "waitlisted":
      return {
        badge: "候补",
        headline: "你当前处于候补状态",
        description: "请保持联系方式畅通，后续结果以负责人最终发布为准。"
      };
    case "not-admitted":
      return {
        badge: "未录取",
        headline: "本期未录取",
        description: "本页只展示当前有效结果，如有疑问请联系对应负责人。"
      };
    case "no-application":
      return {
        badge: "无本期申请",
        headline: "暂无本期申请",
        description: "当前账号没有本招新批次的申请记录。"
      };
  }
}

export function describeAssessment(record: MemberResultRecord): ResultPresentation {
  if (record.currentStage === "考核已结束") {
    return {
      badge: "考核已结束",
      headline: "当前没有进行中的考核",
      description:
        "你的本期考核已经结束。本页只呈现当前有效状态，不展示历史轮次、分数、公开评语或调剂过程。"
    };
  }

  if (record.currentConclusion === "待公布") {
    return {
      badge: "待公布",
      headline: `${record.currentStage}结果待公布`,
      description: "当前阶段结果尚未正式发布，请稍后再次查看。"
    };
  }

  return {
    badge: record.currentConclusion,
    headline: `${record.currentStage}：${record.currentConclusion}`,
    description: "本页只呈现当前有效状态，后续阶段以负责人最终发布为准。"
  };
}
