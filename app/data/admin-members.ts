export type AdminCenter =
  | "白泽开发中心"
  | "新媒体中心"
  | "拓维策划中心"
  | "人才发展中心";

export type AdminMemberIdentity = "正式成员" | "预备成员" | "核心成员";
export type AdminPublicState = "已公开" | "未公开" | "资料待审核";

export interface AdminMember {
  id: string;
  name: string;
  studentId: string;
  center: AdminCenter;
  identity: AdminMemberIdentity;
  grade: string;
  direction: string;
  role: string;
  publicState: AdminPublicState;
  avatarUrl: string | null;
  avatarVisible: boolean;
  profileSummary: string;
  updatedAt: string;
}

export interface AdminMemberFilters {
  query: string;
  center: AdminCenter | "全部中心";
  identity: AdminMemberIdentity | "全部身份";
  publicState: AdminPublicState | "全部状态";
}

export const ADMIN_MEMBERS: AdminMember[] = [
  {
    id: "member-lin",
    name: "林同学",
    studentId: "20260001",
    center: "白泽开发中心",
    identity: "正式成员",
    grade: "2026 级",
    direction: "鸿蒙开发",
    role: "应用开发成员",
    publicState: "已公开",
    avatarUrl: "/images/members/member-lin.webp",
    avatarVisible: true,
    profileSummary: "参与 HarmonyOS 原生应用开发与项目联调。",
    updatedAt: "07-30 15:20"
  },
  {
    id: "member-gao",
    name: "高同学",
    studentId: "20260003",
    center: "白泽开发中心",
    identity: "正式成员",
    grade: "2026 级",
    direction: "大模型 AIGC",
    role: "AI 应用成员",
    publicState: "已公开",
    avatarUrl: null,
    avatarVisible: false,
    profileSummary: "负责大模型应用验证和公开演示内容。",
    updatedAt: "07-30 14:42"
  },
  {
    id: "member-wang",
    name: "王同学",
    studentId: "20260004",
    center: "新媒体中心",
    identity: "预备成员",
    grade: "2026 级",
    direction: "摄影剪辑",
    role: "预备成员",
    publicState: "未公开",
    avatarUrl: "/private/avatars/member-wang-original.jpg",
    avatarVisible: false,
    profileSummary: "报名资料尚未转为公开成员资料。",
    updatedAt: "07-30 12:16"
  },
  {
    id: "member-li",
    name: "李同学",
    studentId: "20260005",
    center: "新媒体中心",
    identity: "正式成员",
    grade: "2026 级",
    direction: "内容运营",
    role: "内容编辑",
    publicState: "资料待审核",
    avatarUrl: null,
    avatarVisible: false,
    profileSummary: "参与推文写作、视觉内容整理和媒体运营。",
    updatedAt: "07-30 10:34"
  },
  {
    id: "member-zhang",
    name: "张同学",
    studentId: "20250012",
    center: "拓维策划中心",
    identity: "核心成员",
    grade: "2025 级",
    direction: "活动策划",
    role: "中心负责人",
    publicState: "已公开",
    avatarUrl: null,
    avatarVisible: false,
    profileSummary: "负责赛事活动策划与跨中心协作。",
    updatedAt: "07-29 20:18"
  },
  {
    id: "member-chen",
    name: "陈同学",
    studentId: "20260007",
    center: "拓维策划中心",
    identity: "预备成员",
    grade: "2026 级",
    direction: "赛事统筹",
    role: "预备成员",
    publicState: "未公开",
    avatarUrl: null,
    avatarVisible: false,
    profileSummary: "等待线下最终结果录入。",
    updatedAt: "07-29 22:08"
  },
  {
    id: "member-zhao",
    name: "赵同学",
    studentId: "20250008",
    center: "人才发展中心",
    identity: "核心成员",
    grade: "2025 级",
    direction: "成员成长",
    role: "中心负责人",
    publicState: "已公开",
    avatarUrl: "/images/members/member-zhao.webp",
    avatarVisible: true,
    profileSummary: "负责新人培养、训练营与成长反馈。",
    updatedAt: "07-29 18:36"
  },
  {
    id: "member-wu",
    name: "吴同学",
    studentId: "20250021",
    center: "人才发展中心",
    identity: "正式成员",
    grade: "2025 级",
    direction: "培训组织",
    role: "成长伙伴",
    publicState: "已公开",
    avatarUrl: null,
    avatarVisible: false,
    profileSummary: "参与新人学习支持和活动组织。",
    updatedAt: "07-29 17:20"
  }
];

export const CORE_MEMBER_PLACEMENTS = [
  { id: "core-01", memberId: "member-zhang", name: "张同学", role: "拓维策划中心负责人", term: "2026.07 — 2027.06", public: true },
  { id: "core-02", memberId: "member-zhao", name: "赵同学", role: "人才发展中心负责人", term: "2026.07 — 2027.06", public: true },
  { id: "core-03", memberId: "member-lin", name: "林同学", role: "白泽项目联络人", term: "2026.09 — 2027.06", public: true },
  { id: "core-04", memberId: "member-li", name: "李同学", role: "新媒体内容联络人", term: "2026.09 — 2027.06", public: false }
];

export const HONOR_REVIEW_RECORDS = [
  { id: "honor-01", member: "林同学", title: "HarmonyOS 创新赛校级一等奖", type: "比赛奖项", consent: true, proof: "已上传", status: "待审核", submittedAt: "07-30 14:20" },
  { id: "honor-02", member: "李同学", title: "招新主视觉设计入选", type: "优秀作品", consent: true, proof: "已上传", status: "待审核", submittedAt: "07-30 11:08" },
  { id: "honor-03", member: "吴同学", title: "训练营优秀成长伙伴", type: "内部称号", consent: false, proof: "无需证明", status: "待审核", submittedAt: "07-29 20:45" },
  { id: "honor-04", member: "赵同学", title: "年度优秀学生干部", type: "表彰", consent: true, proof: "已核验", status: "已通过", submittedAt: "07-28 09:30" }
];

export const ADMIN_CENTER_SUMMARIES = [
  { name: "白泽开发中心", members: 32, core: 5, lead: "白泽中心负责人", state: "正常", description: "HarmonyOS、后端、AIGC、UI/UX 与嵌入式方向" },
  { name: "新媒体中心", members: 18, core: 3, lead: "新媒体中心负责人", state: "正常", description: "推文、海报、摄影剪辑与媒体运营" },
  { name: "拓维策划中心", members: 16, core: 3, lead: "拓维策划中心负责人", state: "正常", description: "赛事、技术活动与跨中心协作策划" },
  { name: "人才发展中心", members: 14, core: 4, lead: "人才发展中心负责人", state: "正常", description: "新人培养、学习支持与成长反馈" }
];

export function filterAdminMembers(
  records: AdminMember[],
  filters: AdminMemberFilters
) {
  const query = filters.query.trim().toLowerCase();
  return records.filter((member) => {
    const matchesQuery =
      !query
      || member.name.toLowerCase().includes(query)
      || member.studentId.toLowerCase().includes(query);
    const matchesCenter =
      filters.center === "全部中心" || member.center === filters.center;
    const matchesIdentity =
      filters.identity === "全部身份" || member.identity === filters.identity;
    const matchesPublicState =
      filters.publicState === "全部状态" || member.publicState === filters.publicState;
    return matchesQuery && matchesCenter && matchesIdentity && matchesPublicState;
  });
}

export function getPublicProfilePreview(member: AdminMember) {
  const canExposeAvatar = member.avatarVisible && Boolean(member.avatarUrl);
  return {
    name: member.name,
    center: member.center,
    role: member.role,
    summary: member.profileSummary,
    avatarUrl: canExposeAvatar ? member.avatarUrl : null,
    usesDefaultAvatar: !canExposeAvatar
  };
}
