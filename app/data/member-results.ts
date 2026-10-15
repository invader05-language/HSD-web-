export type CenterName = string;

export type AdmissionStatus =
  | "pending"
  | "admitted"
  | "waitlisted"
  | "not-admitted"
  | "adjusted-admission"
  | "no-application";

export type MemberIdentity = "预备成员" | "正式成员" | "未录取";

export type AssessmentStage =
  | "尚未开始"
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
  personId?: string;
  role: string;
  name: string;
  contact: string;
  displayContact: string;
}

export interface MemberResultRecord {
  /** Stable result/application identifier used for authenticated contact lookups. */
  id: string;
  batchLabel: string;
  status: AdmissionStatus;
  identity: MemberIdentity;
  preferences: MemberPreference[];
  acceptsTransfer?: boolean;
  baizeInterestDirection?: string;
  currentStage: AssessmentStage;
  currentConclusion: AssessmentConclusion;
  finalCenter?: CenterName;
  finalDirection?: string;
  /** A current routing destination is visible before the alliance publishes the final result. */
  finalResultPending?: boolean;
  routingCenter?: CenterName;
  routingRound?: number;
  routingGroupCode?: import("../../packages/api-client/src").GroupCodeReferenceDto | null;
  responsibleContacts?: ResponsibleContact[];
}

/**
 * Private member result context contract consumed by `/member/results`.
 * The API returns one coherent snapshot so a closed batch's application can be
 * displayed together with current routing, adjustment QR, transfer state and
 * final publication. `stages` may be the existing MemberStageResultsDto shape
 * or its `stages` array while the backend contract settles.
 */
export interface MemberResultContextDto {
  batch: { id: string; name: string; effectiveStatus?: string | null } | null;
  application: {
    id: string;
    batchId: string;
    status?: string;
    acceptsAdjustment?: boolean;
    baizeDirection?: string | null;
    preferences?: Array<{ rank: "FIRST" | "SECOND" | "THIRD" | number; center: { id: string; slug: string; name: string } }>;
  } | null;
  stages: import("../../packages/api-client/src").MemberStageResultsDto | import("../../packages/api-client/src").MemberStageResultsDto["stages"] | null;
  adjustment: {
    decision: "ADMITTED" | "NOT_ADMITTED";
    targetCenter?: { id: string; slug: string; name: string } | null;
    groupCode?: import("../../packages/api-client/src").GroupCodeReferenceDto | null;
    publishedAt?: string | null;
  } | null;
  assessmentTransfer: import("../../packages/api-client/src").PublishedAssessmentTransferDto | null;
  currentRouting: {
    center?: { id: string; slug: string; name: string } | null;
    round?: number | null;
    groupCode?: import("../../packages/api-client/src").GroupCodeReferenceDto | null;
    status?: string | null;
  } | null;
  finalResult: (Partial<MyRecruitmentResultDto> & {
    decision: "ADMITTED" | "NOT_ADMITTED";
    publishedAt: string;
  }) | null;
}

export interface ResultPresentation {
  badge: string;
  headline: string;
  description: string;
}

export interface ResultCenterMember {
  id: string;
  name: string;
  identity: MemberIdentity;
}

export function resultCenterMemberFromSession(
  person?: Pick<SessionPersonResponseDto, "id" | "name" | "status">,
): ResultCenterMember | undefined {
  if (!person) return undefined;
  return {
    id: person.id,
    name: person.name,
    identity: person.status === "FORMAL_MEMBER"
      ? "正式成员"
      : person.status === "PREPARATORY"
        ? "预备成员"
        : "未录取",
  };
}

export function memberResultFromApi(
  result?: MyRecruitmentResultDto,
  fallbackIdentity: MemberIdentity = "预备成员",
): MemberResultRecord {
  if (!result) {
    return {
      id: "no-published-result",
      batchLabel: "暂无已发布结果",
      status: "no-application",
      identity: fallbackIdentity,
      preferences: [],
      currentStage: "尚未开始",
      currentConclusion: "待公布",
    };
  }
  const admitted = result.decision === "ADMITTED";
  const rank = { FIRST: 1, SECOND: 2, THIRD: 3 } as const;
  return {
    id: result.id,
    batchLabel: result.batch.name,
    status: admitted
      ? result.admissionSource === "ADJUSTMENT" ? "adjusted-admission" : "admitted"
      : "not-admitted",
    identity: admitted ? "正式成员" : "未录取",
    preferences: result.preferences
      .slice()
      .sort((left, right) => rank[left.rank] - rank[right.rank])
      .map((preference) => ({ rank: rank[preference.rank], center: preference.center.name })),
    ...(result.baizeDirection
      ? { baizeInterestDirection: baizeDirectionLabel(result.baizeDirection) }
      : {}),
    currentStage: "考核已结束",
    currentConclusion: admitted ? "通过" : "未通过",
    ...(result.finalCenter ? { finalCenter: result.finalCenter.name } : {}),
    ...(admitted && result.finalCenter?.slug === 'baize-development' && result.finalBaizeDirection
      ? { finalDirection: baizeDirectionLabel(result.finalBaizeDirection) }
      : {}),
    ...(result.responsibleContacts.length
      ? { responsibleContacts: result.responsibleContacts.map((contact) => ({
          personId: contact.personId,
          role: "部长",
          name: contact.name,
          contact: "",
          displayContact: contact.displayContact,
        })) }
      : {}),
  };
}

export function memberResultFromApplication(application: SubmittedRecruitmentApplication): MemberResultRecord {
  return {
    id: application.id,
    batchLabel: application.batchNameSnapshot,
    status: "pending",
    identity: "预备成员",
    preferences: [application.firstChoice, application.secondChoice, application.thirdChoice]
      .filter((center): center is NonNullable<typeof center> => Boolean(center))
      .map((center, index) => ({ rank: (index + 1) as 1 | 2 | 3, center })),
    acceptsTransfer: application.acceptsAdjustment,
    baizeInterestDirection: application.baizeDirection,
    currentStage: application.status === "processing" ? "面试" : "尚未开始",
    currentConclusion: "待公布",
  };
}

function stageForRouting(round: number | null | undefined): AssessmentStage {
  if (round === 1) return "第一轮考核";
  if (round === 2) return "第二轮考核";
  if (round === 3) return "第三轮考核";
  return "尚未开始";
}

function rankValue(rank: "FIRST" | "SECOND" | "THIRD" | number): 1 | 2 | 3 | undefined {
  if (rank === "FIRST" || rank === 1) return 1;
  if (rank === "SECOND" || rank === 2) return 2;
  if (rank === "THIRD" || rank === 3) return 3;
  return undefined;
}

export function memberResultFromContext(
  context: MemberResultContextDto,
  fallbackIdentity: MemberIdentity = "预备成员",
): MemberResultRecord {
  if (context.finalResult) {
    const compact = context.finalResult;
    const application = context.application;
    const hasFullProjection = Boolean(compact.batch && compact.preferences && compact.responsibleContacts);
    const fullProjection = hasFullProjection
      ? compact as MyRecruitmentResultDto
      : {
          id: compact.id ?? application?.id ?? "published-result",
          batch: compact.batch ?? { id: context.batch?.id ?? application?.batchId ?? "unknown-batch", name: context.batch?.name ?? "招新批次" },
          decision: compact.decision,
          finalCenter: compact.finalCenter ?? null,
          admissionSource: compact.admissionSource ?? null,
          baizeDirection: compact.baizeDirection ?? application?.baizeDirection ?? null,
          finalBaizeDirection: compact.finalBaizeDirection ?? null,
          preferences: compact.preferences ?? (application?.preferences ?? []).map((preference) => ({ rank: preference.rank === "FIRST" || preference.rank === 1 ? "FIRST" : preference.rank === "SECOND" || preference.rank === 2 ? "SECOND" : "THIRD", center: preference.center })),
          responsibleContacts: compact.responsibleContacts ?? [],
          publishedAt: compact.publishedAt,
        } as MyRecruitmentResultDto;
    return memberResultFromApi(fullProjection, fallbackIdentity);
  }

  const application = context.application;
  if (!application) return memberResultFromApi(undefined, fallbackIdentity);

  const preferences = (application.preferences ?? [])
    .map((preference) => {
      const rank = rankValue(preference.rank);
      return rank ? { rank, center: preference.center.name } : undefined;
    })
    .filter((preference): preference is MemberPreference => Boolean(preference))
    .sort((left, right) => left.rank - right.rank);
  const adjustment = context.adjustment?.decision === "ADMITTED" ? context.adjustment : undefined;
  const routing = context.currentRouting;
  const routingCenter = adjustment?.targetCenter?.name ?? routing?.center?.name;
  const routingGroupCode = adjustment?.groupCode ?? routing?.groupCode ?? null;
  const routingRound = routing?.round ?? routingGroupCode?.round ?? undefined;

  return {
    id: application.id,
    batchLabel: context.batch?.name ?? "暂无报名批次",
    status: "pending",
    identity: fallbackIdentity,
    preferences,
    ...(typeof application.acceptsAdjustment === "boolean" ? { acceptsTransfer: application.acceptsAdjustment } : {}),
    ...(application.baizeDirection ? { baizeInterestDirection: baizeDirectionLabel(application.baizeDirection as any) } : {}),
    currentStage: stageForRouting(routingRound),
    currentConclusion: "待公布",
    ...(routingCenter ? { finalCenter: routingCenter, routingCenter } : {}),
    ...(routingRound ? { routingRound } : {}),
    ...(routingGroupCode ? { routingGroupCode } : {}),
    ...(adjustment ? { finalResultPending: true } : {}),
  };
}

export function stageResultsFromContext(
  context: MemberResultContextDto,
): MemberStageResultsDto | undefined {
  if (!context.stages) return undefined;
  const source = (Array.isArray(context.stages)
    ? { stages: context.stages }
    : context.stages) as Partial<MemberStageResultsDto>;
  return {
    batchId: source.batchId ?? context.batch?.id ?? null,
    batchName: source.batchName ?? context.batch?.name ?? null,
    center: source.center ?? context.currentRouting?.center ?? null,
    stages: source.stages ?? [],
    transfer: source.transfer ?? context.assessmentTransfer ?? null,
    entryGroupCode: source.entryGroupCode ?? null,
    finalGroupCode: source.finalGroupCode ?? null,
  };
}

/**
 * The member center consumes only the final, published assessment fields.
 * Internal notes and per-round history deliberately do not cross this boundary.
 */
export interface PublishedAssessmentProjection {
  memberId: string;
  center: CenterName;
  finalDecision?: "admitted" | "not-admitted";
  finalCenter?: CenterName;
  publishedAt?: string;
  batchName?: string;
  finalBaizeDirection?: MyRecruitmentResultDto['finalBaizeDirection'];
}

export const DEMO_MEMBER_RESULT: MemberResultRecord = {
  id: "demo-member-result",
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
  responsibleContacts: [{
    role: "白泽开发中心负责人",
    name: "负责人姓名",
    contact: "13800008899",
    displayContact: "138 **** 8899"
  }]
};

export function getDemoMemberResult(
  memberId: string,
  application?: SubmittedRecruitmentApplication,
): MemberResultRecord {
  if (memberId === DEMO_MEMBER_PROFILE.id) return DEMO_MEMBER_RESULT;
  if (memberId !== DEMO_APPLICANT_PROFILE.id) {
    return {
      id: "demo-no-application",
      batchLabel: application?.batchNameSnapshot ?? "暂无报名批次",
      status: "no-application",
      identity: "正式成员",
      preferences: [],
      acceptsTransfer: false,
      currentStage: "尚未开始",
      currentConclusion: "待公布",
    };
  }

  const preferences: MemberPreference[] = application
    ? [application.firstChoice, application.secondChoice, application.thirdChoice]
        .filter((center): center is Exclude<typeof center, undefined> => center !== undefined)
        .map((center, index) => ({ rank: (index + 1) as 1 | 2 | 3, center }))
    : [];

  return {
    id: application?.id ?? "demo-applicant-result",
    batchLabel: application?.batchNameSnapshot ?? "暂无报名批次",
    status: application ? "pending" : "no-application",
    identity: "预备成员",
    preferences,
    acceptsTransfer: application?.acceptsAdjustment ?? false,
    baizeInterestDirection: application?.baizeDirection,
    currentStage: application
      ? application.firstChoice === "白泽开发中心"
        ? "第一轮考核"
        : "面试"
      : "尚未开始",
    currentConclusion: "待公布",
  };
}

export function applyPublishedAssessmentProjection(
  fallback: MemberResultRecord,
  projection?: PublishedAssessmentProjection,
): MemberResultRecord {
  if (!projection?.publishedAt || !projection.finalDecision) return fallback;

  const admitted = projection.finalDecision === "admitted";
  return {
    ...fallback,
    batchLabel: projection.batchName ?? fallback.batchLabel,
    status: admitted ? "admitted" : "not-admitted",
    identity: admitted ? "正式成员" : "预备成员",
    currentStage: "考核已结束",
    currentConclusion: admitted ? "通过" : "未通过",
    finalCenter: admitted ? projection.finalCenter ?? projection.center : undefined,
    finalDirection: admitted && projection.finalCenter === '白泽开发中心' && projection.finalBaizeDirection ? baizeDirectionLabel(projection.finalBaizeDirection) : undefined,
  };
}

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
  if (record.currentStage === "尚未开始") {
    return {
      badge: "尚未开始",
      headline: "当前没有进行中的考核",
      description: "提交报名并进入考核流程后，本页会展示当前有效阶段与结论。",
    };
  }
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
import { DEMO_APPLICANT_PROFILE, DEMO_MEMBER_PROFILE } from "./member-profile";
import type { SubmittedRecruitmentApplication } from "./recruitment-application";
import type { MemberStageResultsDto, MyRecruitmentResultDto, SessionPersonResponseDto } from "../../packages/api-client/src";
import { baizeDirectionLabel } from "../utils/baize-direction-label";
