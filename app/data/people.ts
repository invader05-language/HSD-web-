import type { CenterSlug } from "./centers";
import type { MemberDuty } from "./member-profile";
import type { BaizeDirection } from "./recruitment-application";

export interface PublicHonor {
  id: string;
  title: string;
  awardedAt: string;
  description: string;
  featured: boolean;
  visible: true;
  approved: true;
  order: number;
}

interface PublicPersonBase {
  id: string;
  name: string;
  memberDuty: MemberDuty;
  centerSlug: CenterSlug;
  centerName: string;
  baizeDirection?: BaizeDirection;
  bio: string;
  isCore: boolean;
  order: number;
  honors: readonly PublicHonor[];
}

type PublicAvatar =
  | {
      avatarVisible: false;
      avatarUrl?: never;
    }
  | {
      avatarVisible: true;
      avatarUrl: string;
    };

export type PublicPerson = PublicPersonBase & PublicAvatar;

type MockPublicPersonInput = {
  id: string;
  name: string;
  memberDuty: MemberDuty;
  centerSlug: CenterSlug;
  centerName: string;
  baizeDirection?: BaizeDirection;
  isCore: boolean;
  order: number;
};

function createMockPublicPerson(input: MockPublicPersonInput): PublicPerson {
  return {
    ...input,
    bio: `参与${input.centerName}的项目实践与团队协作，持续积累可展示的成果。`,
    honors: [],
    avatarVisible: false
  };
}

const EXTENDED_CORE_PEOPLE: readonly PublicPerson[] = [
  createMockPublicPerson({ id: "gao-development", name: "高同学", memberDuty: "核心人员", centerSlug: "baize-development", centerName: "白泽开发中心", baizeDirection: "鸿蒙开发", isCore: true, order: 17 }),
  createMockPublicPerson({ id: "qian-development", name: "钱同学", memberDuty: "核心人员", centerSlug: "baize-development", centerName: "白泽开发中心", baizeDirection: "大模型 AIGC", isCore: true, order: 18 }),
  createMockPublicPerson({ id: "yu-media", name: "俞同学", memberDuty: "核心人员", centerSlug: "new-media", centerName: "新媒体中心", isCore: true, order: 19 }),
  createMockPublicPerson({ id: "jiang-planning", name: "蒋同学", memberDuty: "核心人员", centerSlug: "tuowei-planning", centerName: "拓维策划中心", isCore: true, order: 20 }),
  createMockPublicPerson({ id: "pan-talent", name: "潘同学", memberDuty: "核心人员", centerSlug: "talent-development", centerName: "人才发展中心", isCore: true, order: 21 }),
  createMockPublicPerson({ id: "su-development", name: "苏同学", memberDuty: "核心人员", centerSlug: "baize-development", centerName: "白泽开发中心", baizeDirection: "后端架构", isCore: true, order: 22 }),
  createMockPublicPerson({ id: "he-media-core", name: "贺同学", memberDuty: "核心人员", centerSlug: "new-media", centerName: "新媒体中心", isCore: true, order: 23 }),
  createMockPublicPerson({ id: "deng-planning", name: "邓同学", memberDuty: "核心人员", centerSlug: "tuowei-planning", centerName: "拓维策划中心", isCore: true, order: 24 }),
  createMockPublicPerson({ id: "ma-talent", name: "马同学", memberDuty: "核心人员", centerSlug: "talent-development", centerName: "人才发展中心", isCore: true, order: 25 }),
  createMockPublicPerson({ id: "lu-media", name: "陆同学", memberDuty: "核心人员", centerSlug: "new-media", centerName: "新媒体中心", isCore: true, order: 26 })
];

const EXTENDED_PUBLIC_MEMBERS: readonly PublicPerson[] = [
  createMockPublicPerson({ id: "yan-development", name: "严同学", memberDuty: "普通成员", centerSlug: "baize-development", centerName: "白泽开发中心", baizeDirection: "鸿蒙开发", isCore: false, order: 27 }),
  createMockPublicPerson({ id: "zhao-media", name: "赵同学", memberDuty: "普通成员", centerSlug: "new-media", centerName: "新媒体中心", isCore: false, order: 28 }),
  createMockPublicPerson({ id: "lu-planning", name: "卢同学", memberDuty: "普通成员", centerSlug: "tuowei-planning", centerName: "拓维策划中心", isCore: false, order: 29 }),
  createMockPublicPerson({ id: "gao-talent", name: "高然同学", memberDuty: "普通成员", centerSlug: "talent-development", centerName: "人才发展中心", isCore: false, order: 30 }),
  createMockPublicPerson({ id: "shen-development", name: "沈同学", memberDuty: "普通成员", centerSlug: "baize-development", centerName: "白泽开发中心", baizeDirection: "嵌入式开发", isCore: false, order: 31 }),
  createMockPublicPerson({ id: "xie-media", name: "谢同学", memberDuty: "普通成员", centerSlug: "new-media", centerName: "新媒体中心", isCore: false, order: 32 }),
  createMockPublicPerson({ id: "cao-planning", name: "曹同学", memberDuty: "普通成员", centerSlug: "tuowei-planning", centerName: "拓维策划中心", isCore: false, order: 33 }),
  createMockPublicPerson({ id: "wei-talent", name: "魏同学", memberDuty: "普通成员", centerSlug: "talent-development", centerName: "人才发展中心", isCore: false, order: 34 }),
  createMockPublicPerson({ id: "bai-development", name: "白同学", memberDuty: "普通成员", centerSlug: "baize-development", centerName: "白泽开发中心", baizeDirection: "大模型 AIGC", isCore: false, order: 35 }),
  createMockPublicPerson({ id: "du-media", name: "杜同学", memberDuty: "普通成员", centerSlug: "new-media", centerName: "新媒体中心", isCore: false, order: 36 }),
  createMockPublicPerson({ id: "qin-planning", name: "秦同学", memberDuty: "普通成员", centerSlug: "tuowei-planning", centerName: "拓维策划中心", isCore: false, order: 37 }),
  createMockPublicPerson({ id: "hong-talent", name: "洪同学", memberDuty: "普通成员", centerSlug: "talent-development", centerName: "人才发展中心", isCore: false, order: 38 }),
  createMockPublicPerson({ id: "yu-development", name: "余同学", memberDuty: "普通成员", centerSlug: "baize-development", centerName: "白泽开发中心", baizeDirection: "后端架构", isCore: false, order: 39 }),
  createMockPublicPerson({ id: "lu-media-member", name: "鲁同学", memberDuty: "普通成员", centerSlug: "new-media", centerName: "新媒体中心", isCore: false, order: 40 }),
  createMockPublicPerson({ id: "kang-planning", name: "康同学", memberDuty: "普通成员", centerSlug: "tuowei-planning", centerName: "拓维策划中心", isCore: false, order: 41 }),
  createMockPublicPerson({ id: "peng-talent", name: "彭同学", memberDuty: "普通成员", centerSlug: "talent-development", centerName: "人才发展中心", isCore: false, order: 42 }),
  createMockPublicPerson({ id: "su-development-member", name: "舒同学", memberDuty: "普通成员", centerSlug: "baize-development", centerName: "白泽开发中心", baizeDirection: "鸿蒙开发", isCore: false, order: 43 }),
  createMockPublicPerson({ id: "cheng-media", name: "程同学", memberDuty: "普通成员", centerSlug: "new-media", centerName: "新媒体中心", isCore: false, order: 44 })
];

export const CORE_PEOPLE: readonly PublicPerson[] = [
  {
    id: "lin-development",
    name: "林同学",
    memberDuty: "核心人员",
    centerSlug: "baize-development",
    centerName: "白泽开发中心",
    baizeDirection: "鸿蒙开发",
    bio: "关注原生应用开发与团队协作，希望把每次练习沉淀为可演示的项目成果。",
    honors: [
      {
        id: "lin-harmonyos-practice",
        title: "HarmonyOS 校园创新实践优秀项目",
        awardedAt: "2026-05",
        description: "参与完成校园服务原型的应用开发、联调与公开展示。",
        featured: true,
        visible: true,
        approved: true,
        order: 1
      },
      {
        id: "lin-software-design",
        title: "校级软件设计竞赛一等奖",
        awardedAt: "2025-12",
        description: "围绕真实校园场景完成需求拆解、工程实现与成果答辩。",
        featured: true,
        visible: true,
        approved: true,
        order: 2
      },
      {
        id: "lin-open-source",
        title: "开源协作实践之星",
        awardedAt: "2025-10",
        description: "持续参与代码评审、问题复盘和团队工程规范建设。",
        featured: true,
        visible: true,
        approved: true,
        order: 3
      },
      {
        id: "lin-project-delivery",
        title: "年度项目交付贡献",
        awardedAt: "2025-06",
        description: "在项目演示准备与跨模块协作中完成稳定性验证。",
        featured: false,
        visible: true,
        approved: true,
        order: 4
      }
    ],
    avatarVisible: false,
    isCore: true,
    order: 1
  },
  {
    id: "chen-media",
    name: "陈同学",
    memberDuty: "核心人员",
    centerSlug: "new-media",
    centerName: "新媒体中心",
    bio: "通过摄影、文字和设计记录真实协作，让活动经验被更多人看见。",
    honors: [
      {
        id: "chen-campus-visual",
        title: "校园影像创作优秀作品",
        awardedAt: "2026-04",
        description: "以系列影像记录跨中心项目协作与校园创新现场。",
        featured: true,
        visible: true,
        approved: true,
        order: 1
      },
      {
        id: "chen-brand-story",
        title: "年度品牌叙事贡献",
        awardedAt: "2025-11",
        description: "完成活动专题的采访、编辑与视觉内容统筹。",
        featured: true,
        visible: true,
        approved: true,
        order: 2
      }
    ],
    avatarVisible: false,
    isCore: true,
    order: 2
  },
  {
    id: "zhou-planning",
    name: "周同学",
    memberDuty: "核心人员",
    centerSlug: "tuowei-planning",
    centerName: "拓维策划中心",
    bio: "专注把分散的任务和角色连接成有节奏、可执行的活动现场。",
    honors: [
      {
        id: "zhou-event-planning",
        title: "校园科技活动优秀策划",
        awardedAt: "2026-03",
        description: "统筹技术分享活动的流程设计、资源协同与现场执行。",
        featured: true,
        visible: true,
        approved: true,
        order: 1
      }
    ],
    avatarVisible: false,
    isCore: true,
    order: 3
  },
  {
    id: "wu-talent",
    name: "吴同学",
    memberDuty: "核心人员",
    centerSlug: "talent-development",
    centerName: "人才发展中心",
    bio: "关注成员融入与成长反馈，陪伴同学从参与者走向能够承担责任的协作者。",
    honors: [
      {
        id: "wu-learning-support",
        title: "优秀学习支持项目",
        awardedAt: "2025-12",
        description: "组织新人实践活动并完善公开学习指引与反馈流程。",
        featured: true,
        visible: true,
        approved: true,
        order: 1
      }
    ],
    avatarVisible: false,
    isCore: true,
    order: 4
  },
  {
    id: "zheng-development",
    name: "郑同学",
    memberDuty: "核心人员",
    centerSlug: "baize-development",
    centerName: "白泽开发中心",
    baizeDirection: "嵌入式开发",
    bio: "关注项目验证、问题复盘与跨模块协作，帮助团队把原型推进到稳定演示。",
    honors: [
      {
        id: "zheng-quality-practice",
        title: "项目质量实践优秀成员",
        awardedAt: "2026-01",
        description: "完善演示项目的验证清单并推动关键问题闭环。",
        featured: true,
        visible: true,
        approved: true,
        order: 1
      },
      {
        id: "zheng-device-collaboration",
        title: "软硬件协作实践成果",
        awardedAt: "2025-09",
        description: "参与设备联调和异常场景复盘，提升演示稳定性。",
        featured: false,
        visible: true,
        approved: true,
        order: 2
      }
    ],
    avatarVisible: false,
    isCore: true,
    order: 5
  },
  {
    id: "luo-talent",
    name: "罗同学",
    memberDuty: "核心人员",
    centerSlug: "talent-development",
    centerName: "人才发展中心",
    bio: "围绕新人实践设计学习支持，让成员能从一次参与逐步承担完整任务。",
    honors: [],
    avatarVisible: false,
    isCore: true,
    order: 6
  },
  ...EXTENDED_CORE_PEOPLE
];

export const PUBLIC_MEMBERS: readonly PublicPerson[] = [
  {
    id: "guo-development",
    name: "郭同学",
    memberDuty: "普通成员",
    centerSlug: "baize-development",
    centerName: "白泽开发中心",
    baizeDirection: "后端架构",
    bio: "正在参与校园智能服务原型的接口联调与场景验证。",
    honors: [
      {
        id: "guo-ai-practice",
        title: "校园 AI 应用实践优秀成果",
        awardedAt: "2026-04",
        description: "参与服务接口开发、场景验证与公开成果演示。",
        featured: true,
        visible: true,
        approved: true,
        order: 1
      }
    ],
    avatarVisible: false,
    isCore: false,
    order: 11
  },
  {
    id: "he-media",
    name: "何同学",
    memberDuty: "普通成员",
    centerSlug: "new-media",
    centerName: "新媒体中心",
    bio: "用设计和影像为部落活动留下可以回看的现场记录。",
    honors: [
      {
        id: "he-event-photography",
        title: "校园活动摄影优秀作品",
        awardedAt: "2025-11",
        description: "完成技术活动现场影像记录与公开作品整理。",
        featured: true,
        visible: true,
        approved: true,
        order: 1
      }
    ],
    avatarVisible: false,
    isCore: false,
    order: 12
  },
  {
    id: "fang-planning",
    name: "方同学",
    memberDuty: "普通成员",
    centerSlug: "tuowei-planning",
    centerName: "拓维策划中心",
    bio: "在技术分享与项目实训中练习流程设计、沟通和现场协调。",
    honors: [],
    avatarVisible: false,
    isCore: false,
    order: 13
  },
  {
    id: "sun-talent",
    name: "孙同学",
    memberDuty: "普通成员",
    centerSlug: "talent-development",
    centerName: "人才发展中心",
    bio: "协助新成员了解中心方向，并参与学习活动的组织与反馈。",
    honors: [],
    avatarVisible: false,
    isCore: false,
    order: 14
  },
  {
    id: "xu-media",
    name: "许同学",
    memberDuty: "普通成员",
    centerSlug: "new-media",
    centerName: "新媒体中心",
    bio: "参与活动采访和专题内容整理，用清晰表达记录团队的实践过程。",
    honors: [
      {
        id: "xu-feature-writing",
        title: "校园专题写作优秀作品",
        awardedAt: "2026-02",
        description: "完成项目实践专题的采访、资料整理与公开发布。",
        featured: true,
        visible: true,
        approved: true,
        order: 1
      }
    ],
    avatarVisible: false,
    isCore: false,
    order: 15
  },
  {
    id: "tang-planning",
    name: "唐同学",
    memberDuty: "普通成员",
    centerSlug: "tuowei-planning",
    centerName: "拓维策划中心",
    bio: "协助技术活动的流程准备与资源联络，在现场实践中积累协作经验。",
    honors: [],
    avatarVisible: false,
    isCore: false,
    order: 16
  },
  ...EXTENDED_PUBLIC_MEMBERS
];

const ALL_PUBLIC_PEOPLE: readonly PublicPerson[] = [...CORE_PEOPLE, ...PUBLIC_MEMBERS];

// Static public fixtures predate the member profile store. Keep their public route
// identity explicitly linked to the platform member instead of guessing by name.
const STATIC_PUBLIC_ID_BY_MEMBER_ID: Readonly<Record<string, PublicPerson["id"]>> = {
  "member-lin": "lin-development",
  "member-wu": "wu-talent",
};

export function getStaticPublicIdForMember(memberId: string): string | undefined {
  return STATIC_PUBLIC_ID_BY_MEMBER_ID[memberId];
}

export function getStaticMemberIdForPublicPerson(publicId: string): string | undefined {
  return Object.entries(STATIC_PUBLIC_ID_BY_MEMBER_ID)
    .find(([, linkedPublicId]) => linkedPublicId === publicId)?.[0];
}

export function findStaticPublicPersonForMember(memberId: string): PublicPerson | undefined {
  const publicId = getStaticPublicIdForMember(memberId);
  return publicId ? ALL_PUBLIC_PEOPLE.find((person) => person.id === publicId) : undefined;
}

export function getPeopleByCenter(slug: string): readonly PublicPerson[] {
  return ALL_PUBLIC_PEOPLE
    .filter((person) => person.centerSlug === slug)
    .sort((a, b) => a.order - b.order);
}

export function findPublicPerson(id: string): PublicPerson | undefined {
  return ALL_PUBLIC_PEOPLE.find((person) => person.id === id);
}

export function getFeaturedHonors(person: PublicPerson): readonly PublicHonor[] {
  return person.honors
    .filter((honor) => honor.featured)
    .sort((a, b) => a.order - b.order)
    .slice(0, 3);
}

export function resolvePublicAvatar(person: PublicPerson): string | undefined {
  return person.avatarVisible ? person.avatarUrl : undefined;
}
