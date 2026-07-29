export const CENTER_SLUGS = [
  "baize-development",
  "new-media",
  "tuowei-planning",
  "talent-development"
] as const;

export type CenterSlug = (typeof CENTER_SLUGS)[number];

export interface CenterProfile {
  slug: CenterSlug;
  index: string;
  title: string;
  role: string;
  description: string;
  topics: readonly string[];
  eyebrow: string;
  headline: string;
  mission: string;
  responsibilities: readonly string[];
  learningPath: readonly string[];
  collaboration: string;
  joinHint: string;
}

export const CENTERS: readonly CenterProfile[] = [
  {
    slug: "baize-development",
    index: "01",
    title: "白泽开发中心",
    role: "研发与技术落地",
    description: "覆盖 HarmonyOS、后端架构、大模型 AIGC、UI/UX 与嵌入式开发。",
    topics: ["鸿蒙开发", "AI 与后端", "软硬件联调"],
    eyebrow: "研发 · 验证 · 交付",
    headline: "把校园场景中的想法，做成可验证的产品。",
    mission: "围绕真实问题开展技术研发、原型验证与项目交付，让成员在协作中建立工程能力。",
    responsibilities: ["技术方案拆解", "原型与应用开发", "项目测试与迭代"],
    learningPath: ["基础技能训练", "项目结对实践", "独立负责模块"],
    collaboration: "与策划中心梳理需求，与新媒体中心沉淀项目成果，并为人才发展中心提供技术成长案例。",
    joinHint: "适合愿意持续练习、乐于与团队一起把想法落地的同学。"
  },
  {
    slug: "new-media",
    index: "02",
    title: "新媒体中心",
    role: "品牌视觉与内容传播",
    description: "负责推文撰写、海报设计、摄影剪辑和社群媒体运营。",
    topics: ["摄影", "视觉设计", "内容运营"],
    eyebrow: "记录 · 表达 · 传播",
    headline: "让每一次真实的协作，都被清晰看见。",
    mission: "用文字、影像与视觉设计记录部落的项目和活动，建立可信、持续的内容传播。",
    responsibilities: ["活动影像记录", "视觉与推文创作", "内容发布与归档"],
    learningPath: ["内容工具入门", "活动现场实践", "独立策划专题"],
    collaboration: "与各中心共同采访、记录和发布成果，让研发、策划与成长经验形成可复用的内容。",
    joinHint: "适合对写作、摄影、设计或视频表达有兴趣，并愿意在实践中提升的同学。"
  },
  {
    slug: "tuowei-planning",
    index: "03",
    title: "拓维策划中心",
    role: "活动策划与资源协同",
    description: "策划赛事与技术活动，连接校内外资源并推进现场执行。",
    topics: ["活动策划", "外联合作", "项目统筹"],
    eyebrow: "策划 · 协同 · 执行",
    headline: "把不同角色的行动，组织成一次完整发生。",
    mission: "通过活动策划、资源连接和现场执行，让项目展示、技术交流与成员参与顺畅发生。",
    responsibilities: ["活动方案设计", "资源与流程协调", "现场执行复盘"],
    learningPath: ["活动观察参与", "负责单一环节", "统筹完整项目"],
    collaboration: "与开发中心确认技术内容，与新媒体中心共创传播节奏，并协同人才发展中心组织成员参与。",
    joinHint: "适合喜欢组织、沟通和解决现场问题，并愿意承担责任的同学。"
  },
  {
    slug: "talent-development",
    index: "04",
    title: "人才发展中心",
    role: "成员成长与组织建设",
    description: "为新成员提供循序渐进的学习路径、培训与梯队成长支持。",
    topics: ["新人培养", "成员服务", "梯队建设"],
    eyebrow: "成长 · 支持 · 连接",
    headline: "让每位成员，都能找到持续成长的位置。",
    mission: "设计成员融入、学习与成长支持机制，帮助不同基础的同学建立可持续的发展路径。",
    responsibilities: ["新人融入与培训", "成长反馈支持", "成员协作与梯队建设"],
    learningPath: ["了解部落与方向", "参与中心实践", "承担组织角色"],
    collaboration: "收集各中心的成长需求和实践机会，把项目、活动与成员发展连接成完整的协作链路。",
    joinHint: "适合关心同伴成长、愿意倾听与服务团队，并期待建设长期组织氛围的同学。"
  }
];

export const CENTER_OPTIONS = CENTERS.map((center) => ({
  value: center.slug,
  label: center.title
}));

export function getCenterBySlug(slug: string): CenterProfile | undefined {
  return CENTERS.find((center) => center.slug === slug);
}
