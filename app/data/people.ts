import type { CenterSlug } from "./centers";

interface PublicPersonBase {
  id: string;
  name: string;
  role: string;
  centerSlug: CenterSlug;
  centerName: string;
  direction: string;
  bio: string;
  isCore: boolean;
  order: number;
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

export const CORE_PEOPLE: readonly PublicPerson[] = [
  {
    id: "lin-development",
    name: "林同学",
    role: "核心成员 · 项目开发",
    centerSlug: "baize-development",
    centerName: "白泽开发中心",
    direction: "HarmonyOS 与项目工程化",
    bio: "关注原生应用开发与团队协作，希望把每次练习沉淀为可演示的项目成果。",
    avatarVisible: false,
    isCore: true,
    order: 1
  },
  {
    id: "chen-media",
    name: "陈同学",
    role: "核心成员 · 内容创作",
    centerSlug: "new-media",
    centerName: "新媒体中心",
    direction: "影像叙事与品牌内容",
    bio: "通过摄影、文字和设计记录真实协作，让活动经验被更多人看见。",
    avatarVisible: false,
    isCore: true,
    order: 2
  },
  {
    id: "zhou-planning",
    name: "周同学",
    role: "核心成员 · 活动统筹",
    centerSlug: "tuowei-planning",
    centerName: "拓维策划中心",
    direction: "活动策划与资源协同",
    bio: "专注把分散的任务和角色连接成有节奏、可执行的活动现场。",
    avatarVisible: false,
    isCore: true,
    order: 3
  },
  {
    id: "wu-talent",
    name: "吴同学",
    role: "核心成员 · 成员发展",
    centerSlug: "talent-development",
    centerName: "人才发展中心",
    direction: "新人培养与组织支持",
    bio: "关注成员融入与成长反馈，陪伴同学从参与者走向能够承担责任的协作者。",
    avatarVisible: false,
    isCore: true,
    order: 4
  },
  {
    id: "zheng-development",
    name: "郑同学",
    role: "核心成员 · 工程协作",
    centerSlug: "baize-development",
    centerName: "白泽开发中心",
    direction: "质量保障与软硬件联调",
    bio: "关注项目验证、问题复盘与跨模块协作，帮助团队把原型推进到稳定演示。",
    avatarVisible: false,
    isCore: true,
    order: 5
  },
  {
    id: "luo-talent",
    name: "罗同学",
    role: "核心成员 · 学习支持",
    centerSlug: "talent-development",
    centerName: "人才发展中心",
    direction: "学习路径与实践反馈",
    bio: "围绕新人实践设计学习支持，让成员能从一次参与逐步承担完整任务。",
    avatarVisible: false,
    isCore: true,
    order: 6
  }
];

export const PUBLIC_MEMBERS: readonly PublicPerson[] = [
  {
    id: "guo-development",
    name: "郭同学",
    role: "成员",
    centerSlug: "baize-development",
    centerName: "白泽开发中心",
    direction: "AI 应用与后端服务",
    bio: "正在参与校园智能服务原型的接口联调与场景验证。",
    avatarVisible: false,
    isCore: false,
    order: 11
  },
  {
    id: "he-media",
    name: "何同学",
    role: "成员",
    centerSlug: "new-media",
    centerName: "新媒体中心",
    direction: "视觉设计与活动摄影",
    bio: "用设计和影像为部落活动留下可以回看的现场记录。",
    avatarVisible: false,
    isCore: false,
    order: 12
  },
  {
    id: "fang-planning",
    name: "方同学",
    role: "成员",
    centerSlug: "tuowei-planning",
    centerName: "拓维策划中心",
    direction: "项目统筹与现场执行",
    bio: "在技术分享与项目实训中练习流程设计、沟通和现场协调。",
    avatarVisible: false,
    isCore: false,
    order: 13
  },
  {
    id: "sun-talent",
    name: "孙同学",
    role: "成员",
    centerSlug: "talent-development",
    centerName: "人才发展中心",
    direction: "成员服务与学习组织",
    bio: "协助新成员了解中心方向，并参与学习活动的组织与反馈。",
    avatarVisible: false,
    isCore: false,
    order: 14
  },
  {
    id: "xu-media",
    name: "许同学",
    role: "成员",
    centerSlug: "new-media",
    centerName: "新媒体中心",
    direction: "文字编辑与专题策划",
    bio: "参与活动采访和专题内容整理，用清晰表达记录团队的实践过程。",
    avatarVisible: false,
    isCore: false,
    order: 15
  },
  {
    id: "tang-planning",
    name: "唐同学",
    role: "成员",
    centerSlug: "tuowei-planning",
    centerName: "拓维策划中心",
    direction: "活动流程与资源联络",
    bio: "协助技术活动的流程准备与资源联络，在现场实践中积累协作经验。",
    avatarVisible: false,
    isCore: false,
    order: 16
  }
];

const ALL_PUBLIC_PEOPLE: readonly PublicPerson[] = [...CORE_PEOPLE, ...PUBLIC_MEMBERS];

export function getPeopleByCenter(slug: string): readonly PublicPerson[] {
  return ALL_PUBLIC_PEOPLE.filter((person) => person.centerSlug === slug);
}

export function resolvePublicAvatar(person: PublicPerson): string | undefined {
  return person.avatarVisible ? person.avatarUrl : undefined;
}
