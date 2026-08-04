import type {
  BaizeDirection,
  RecruitmentCenter as ApplicationRecruitmentCenter,
} from "./recruitment-application";
import type {
  AssessmentOutcome,
  AssessmentRoundNumber,
  RecruitmentAssessmentRecord,
} from "../types/recruitment-assessment";

export type RecruitmentCenter = ApplicationRecruitmentCenter;

export type RecruitmentStage =
  | "面试"
  | "第一轮考核"
  | "第二轮考核"
  | "第三轮考核"
  | "线下结果待录入"
  | "已结束";

export type RecruitmentResult = "待公布" | "待处理" | "通过" | "未通过" | "已录取";
export type CandidateIdentity = "预备成员" | "正式成员" | "未录取";

export interface AssessmentRound {
  label: "第一轮考核" | "第二轮考核" | "第三轮考核";
  result: "待公布" | "通过" | "未通过" | "尚未开始";
  editable: boolean;
}

export interface AdminCandidate {
  id: string;
  batchId?: string;
  memberId?: string;
  name: string;
  studentId: string;
  grade: string;
  className: string;
  contact: string;
  bio?: string;
  identity: CandidateIdentity;
  preferences: [RecruitmentCenter, RecruitmentCenter?, RecruitmentCenter?];
  baizeDirection?: BaizeDirection;
  acceptsAdjustment: boolean;
  stage: RecruitmentStage;
  result: RecruitmentResult;
  finalCenter?: RecruitmentCenter;
  submittedAt: string;
  updatedAt: string;
  rounds?: AssessmentRound[];
  internalNote?: string;
}

export type RecruitmentApplicationSort = "submittedAt.desc" | "submittedAt.asc";

export interface RecruitmentApplicationFilters {
  query: string;
  firstChoice: RecruitmentCenter | "全部中心";
  sort: RecruitmentApplicationSort;
}

export interface RecruitmentAdminFilters {
  center: RecruitmentCenter | "全部人员";
  query: string;
  stage: RecruitmentStage | "全部阶段";
  result: RecruitmentResult | "全部结果";
  adjustment: "全部" | "接受调剂" | "不接受调剂";
}

export interface RecruitmentBatch {
  id: string;
  name: string;
  status: "进行中" | "草稿" | "已结束";
  period: string;
  centers: number;
  applicants: number;
  owner: string;
}

export const RECRUITMENT_BATCHES: RecruitmentBatch[] = [
  {
    id: "2026-autumn",
    name: "2026 秋季招新",
    status: "进行中",
    period: "2026.08.20 — 2026.09.18",
    centers: 4,
    applicants: 80,
    owner: "联盟总负责人"
  },
  {
    id: "2027-spring-draft",
    name: "2027 春季补招",
    status: "草稿",
    period: "时间尚未发布",
    centers: 3,
    applicants: 0,
    owner: "人才发展中心"
  },
  {
    id: "2025-autumn",
    name: "2025 秋季招新",
    status: "已结束",
    period: "2025.08.22 — 2025.09.20",
    centers: 4,
    applicants: 64,
    owner: "联盟总负责人"
  }
];

export const REGULAR_CENTERS = [
  "新媒体中心",
  "拓维策划中心",
  "人才发展中心"
] as const;

export const ADMIN_CANDIDATES: AdminCandidate[] = [
  {
    id: "candidate-lin",
    batchId: "batch-current",
    memberId: "member-lin",
    name: "林同学",
    studentId: "20260001",
    grade: "2026 级",
    className: "软件工程 1 班",
    contact: "lin@example.com",
    bio: "希望通过原生应用开发与团队协作积累可展示的项目实践。",
    identity: "预备成员",
    preferences: ["白泽开发中心", "新媒体中心", "人才发展中心"],
    baizeDirection: "鸿蒙开发",
    acceptsAdjustment: true,
    stage: "第二轮考核",
    result: "待公布",
    submittedAt: "2026-07-30T14:28:00.000Z",
    updatedAt: "07-30 14:28",
    rounds: [
      { label: "第一轮考核", result: "通过", editable: false },
      { label: "第二轮考核", result: "待公布", editable: true },
      { label: "第三轮考核", result: "尚未开始", editable: false }
    ]
  },
  {
    id: "candidate-zhou",
    batchId: "batch-current",
    memberId: "applicant-zhou",
    name: "周同学",
    studentId: "20260002",
    grade: "2026 级",
    className: "软件工程 2 班",
    contact: "zhou@example.com",
    identity: "预备成员",
    preferences: ["白泽开发中心", "拓维策划中心"],
    baizeDirection: "后端架构",
    acceptsAdjustment: false,
    stage: "第一轮考核",
    result: "待公布",
    submittedAt: "2026-07-30T13:45:00.000Z",
    updatedAt: "07-30 13:45",
    rounds: [
      { label: "第一轮考核", result: "待公布", editable: true },
      { label: "第二轮考核", result: "尚未开始", editable: false },
      { label: "第三轮考核", result: "尚未开始", editable: false }
    ]
  },
  {
    id: "candidate-gao",
    batchId: "batch-current",
    memberId: "member-gao",
    name: "高同学",
    studentId: "20260003",
    grade: "2026 级",
    className: "计算机科学与技术 1 班",
    contact: "gao@example.com",
    bio: "关注大模型应用与校园服务场景，希望参与完整产品的设计和交付。",
    identity: "正式成员",
    preferences: ["白泽开发中心", "人才发展中心"],
    baizeDirection: "大模型 AIGC",
    acceptsAdjustment: true,
    stage: "已结束",
    result: "已录取",
    finalCenter: "白泽开发中心",
    submittedAt: "2026-07-29T21:12:00.000Z",
    updatedAt: "07-29 21:12",
    rounds: [
      { label: "第一轮考核", result: "通过", editable: false },
      { label: "第二轮考核", result: "通过", editable: false },
      { label: "第三轮考核", result: "通过", editable: false }
    ]
  },
  {
    id: "candidate-wang",
    batchId: "batch-current",
    memberId: "applicant-wang",
    name: "王同学",
    studentId: "20260004",
    grade: "2026 级",
    className: "新闻传播学 1 班",
    contact: "wang@example.com",
    identity: "预备成员",
    preferences: ["新媒体中心", "人才发展中心", "拓维策划中心"],
    acceptsAdjustment: true,
    stage: "面试",
    result: "待公布",
    submittedAt: "2026-07-30T12:16:00.000Z",
    updatedAt: "07-30 12:16"
  },
  {
    id: "candidate-li",
    batchId: "batch-current",
    memberId: "member-li",
    name: "李同学",
    studentId: "20260005",
    grade: "2026 级",
    className: "网络与新媒体 1 班",
    contact: "li@example.com",
    bio: "希望用影像和内容记录真实协作，让技术成果更容易被看见。",
    identity: "正式成员",
    preferences: ["新媒体中心", "拓维策划中心"],
    acceptsAdjustment: true,
    stage: "已结束",
    result: "已录取",
    finalCenter: "新媒体中心",
    submittedAt: "2026-07-30T10:34:00.000Z",
    updatedAt: "07-30 10:34"
  },
  {
    id: "candidate-zhang",
    batchId: "batch-current",
    memberId: "applicant-zhang",
    name: "张同学",
    studentId: "20260006",
    grade: "2026 级",
    className: "工商管理 1 班",
    contact: "zhang@example.com",
    identity: "预备成员",
    preferences: ["拓维策划中心", "人才发展中心"],
    acceptsAdjustment: false,
    stage: "面试",
    result: "待公布",
    submittedAt: "2026-07-30T09:50:00.000Z",
    updatedAt: "07-30 09:50"
  },
  {
    id: "candidate-chen",
    batchId: "batch-current",
    memberId: "applicant-chen",
    name: "陈同学",
    studentId: "20260007",
    grade: "2026 级",
    className: "市场营销 1 班",
    contact: "chen@example.com",
    bio: "希望在赛事和活动策划中提升项目协同与现场执行能力。",
    identity: "预备成员",
    preferences: ["拓维策划中心", "新媒体中心", "人才发展中心"],
    acceptsAdjustment: true,
    stage: "线下结果待录入",
    result: "待处理",
    submittedAt: "2026-07-29T22:08:00.000Z",
    updatedAt: "07-29 22:08",
    internalNote: "面试未通过，等待线下确认最终去向。"
  },
  {
    id: "candidate-wu",
    batchId: "batch-current",
    memberId: "applicant-wu",
    name: "吴同学",
    studentId: "20260008",
    grade: "2026 级",
    className: "人力资源管理 1 班",
    contact: "wu@example.com",
    identity: "未录取",
    preferences: ["人才发展中心", "新媒体中心"],
    acceptsAdjustment: false,
    stage: "已结束",
    result: "未通过",
    submittedAt: "2026-07-29T20:40:00.000Z",
    updatedAt: "07-29 20:40"
  }
];

const LEGACY_ROUND_LABELS: Record<AssessmentRoundNumber, AssessmentRound["label"]> = {
  1: "第一轮考核",
  2: "第二轮考核",
  3: "第三轮考核",
};

function toAssessmentOutcome(result: AssessmentRound["result"]): AssessmentOutcome {
  if (result === "通过") return "passed";
  if (result === "未通过") return "failed";
  return "pending";
}

function legacyRoundOutcomes(candidate: AdminCandidate): RecruitmentAssessmentRecord["roundOutcomes"] {
  const outcomes: RecruitmentAssessmentRecord["roundOutcomes"] = {};

  candidate.rounds?.forEach((round) => {
    const roundNumber = ([1, 2, 3] as AssessmentRoundNumber[]).find((value) => (
      LEGACY_ROUND_LABELS[value] === round.label
    ));
    if (roundNumber) outcomes[roundNumber] = toAssessmentOutcome(round.result);
  });

  if (candidate.stage === "第二轮考核" && !outcomes[1]) outcomes[1] = "passed";
  if (candidate.stage === "第三轮考核") {
    if (!outcomes[1]) outcomes[1] = "passed";
    if (!outcomes[2]) outcomes[2] = "passed";
  }
  if (candidate.stage === "线下结果待录入" && !outcomes[1]) outcomes[1] = "failed";
  if (candidate.stage === "已结束" && candidate.identity === "正式成员") {
    const roundCount = candidate.preferences[0] === "白泽开发中心" ? 3 : 1;
    ([1, 2, 3] as AssessmentRoundNumber[])
      .slice(0, roundCount)
      .forEach((round) => {
        if (!outcomes[round]) outcomes[round] = "passed";
      });
  }
  if (candidate.stage === "已结束" && candidate.identity === "未录取" && !outcomes[1]) {
    outcomes[1] = "failed";
  }

  return outcomes;
}

/**
 * Bridges legacy roster fixtures to the batch-scoped assessment model until
 * the assessment store becomes the authority for candidate records.
 */
export function getAdminCandidateAssessmentRecord(
  candidate: AdminCandidate,
  fallbackBatchId = "batch-current",
): RecruitmentAssessmentRecord {
  const isCompletedLegacyRecord = candidate.stage === "已结束";

  return {
    batchId: candidate.batchId ?? fallbackBatchId,
    candidateId: candidate.id,
    memberId: candidate.memberId ?? candidate.id,
    center: candidate.preferences[0],
    acceptsAdjustment: candidate.acceptsAdjustment,
    roundOutcomes: legacyRoundOutcomes(candidate),
    finalDecision: candidate.identity === "正式成员"
      ? "admitted"
      : candidate.identity === "未录取"
        ? "not-admitted"
        : undefined,
    finalCenter: candidate.finalCenter,
    internalNote: candidate.internalNote,
    updatedAt: candidate.updatedAt,
    publishedAt: isCompletedLegacyRecord ? candidate.submittedAt : undefined,
  };
}

export function filterAndSortRecruitmentApplications(
  candidates: AdminCandidate[],
  filters: RecruitmentApplicationFilters
): AdminCandidate[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return candidates
    .filter((candidate) => {
      const matchesQuery = !query
        || candidate.name.toLocaleLowerCase().includes(query)
        || candidate.studentId.toLocaleLowerCase().includes(query);
      const matchesFirstChoice = filters.firstChoice === "全部中心"
        || candidate.preferences[0] === filters.firstChoice;
      return matchesQuery && matchesFirstChoice;
    })
    .slice()
    .sort((left, right) => {
      const difference = Date.parse(left.submittedAt) - Date.parse(right.submittedAt);
      return filters.sort === "submittedAt.asc" ? difference : -difference;
    });
}

export function findRecruitmentApplication(id: string): AdminCandidate | undefined {
  return ADMIN_CANDIDATES.find((candidate) => candidate.id === id);
}

export function requireRecruitmentApplication(
  id: string,
  createNotFoundError: () => unknown = () => ({
    statusCode: 404,
    statusMessage: "报名记录不存在"
  })
): AdminCandidate {
  const application = findRecruitmentApplication(id);

  if (!application) {
    throw createNotFoundError();
  }

  return application;
}

export function formatRecruitmentApplicationSubmittedAt(
  application: Pick<AdminCandidate, "submittedAt">
): string {
  return application.submittedAt.slice(0, 16).replace("T", " ");
}

export function filterRecruitmentCandidates(
  candidates: AdminCandidate[],
  filters: RecruitmentAdminFilters
): AdminCandidate[] {
  const query = filters.query.trim().toLowerCase();

  return candidates.filter((candidate) => {
    const matchesCenter =
      filters.center === "全部人员" || candidate.preferences[0] === filters.center;
    const matchesQuery =
      !query
      || candidate.name.toLowerCase().includes(query)
      || candidate.studentId.toLowerCase().includes(query);
    const matchesStage =
      filters.stage === "全部阶段" || candidate.stage === filters.stage;
    const matchesResult =
      filters.result === "全部结果" || candidate.result === filters.result;
    const matchesAdjustment =
      filters.adjustment === "全部"
      || (filters.adjustment === "接受调剂" && candidate.acceptsAdjustment)
      || (filters.adjustment === "不接受调剂" && !candidate.acceptsAdjustment);

    return matchesCenter && matchesQuery && matchesStage && matchesResult && matchesAdjustment;
  });
}

export function getRecruitmentCounts(candidates: AdminCandidate[]) {
  return {
    preparatory: candidates.length,
    assessing: candidates.filter((candidate) =>
      candidate.identity === "预备成员"
      && candidate.stage !== "已结束"
    ).length,
    admitted: candidates.filter((candidate) => candidate.identity === "正式成员").length,
    notAdmitted: candidates.filter((candidate) => candidate.identity === "未录取").length
  };
}

export function getPublicationSummary(candidates: AdminCandidate[]) {
  const ready = candidates.filter((candidate) => candidate.stage === "已结束").length;
  return {
    total: candidates.length,
    ready,
    pending: candidates.length - ready,
    selected: ready
  };
}
