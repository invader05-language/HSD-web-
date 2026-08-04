export const ACTIVITY_FILTERS = ["全部", "技术沙龙", "项目实训", "媒体创作", "赛事活动"] as const;

export const ACTIVITY_DETAILS = [
  {
    slug: "harmonyos-salon",
    date: "2026-08-06",
    time: "19:00–21:00",
    type: "技术沙龙",
    title: "HarmonyOS 原生应用入门",
    to: "/activities/harmonyos-salon",
    publishedAt: "2026-08-06T00:00:00.000Z",
    available: true,
    location: "鸿蒙实训工作室",
    status: "报名中",
    summary: "从工程结构、页面构建到一次简单的多设备交互，完成可运行的 HarmonyOS 原生应用。",
    capacity: "40 人",
    audience: "对鸿蒙开发感兴趣、具备基础编程能力的同学",
    agenda: ["认识 HarmonyOS 应用结构", "现场完成第一个页面", "多设备交互演示", "答疑与后续学习路线"]
  },
  {
    slug: "project-camp",
    date: "2026-08-12",
    time: "14:30–18:00",
    type: "项目实训",
    title: "从需求到可演示原型",
    to: "/activities/project-camp",
    publishedAt: "2026-08-12T00:00:00.000Z",
    available: true,
    location: "产教融合中心",
    status: "报名中",
    summary: "用半天时间走完问题定义、需求排序、页面结构与演示讲述，做出可沟通的项目原型。",
    capacity: "32 人",
    audience: "开发、设计、策划方向均可参加",
    agenda: ["问题定义", "需求优先级", "快速原型", "小组路演与反馈"]
  },
  {
    slug: "media-story",
    date: "2026-08-22",
    time: "19:30–21:00",
    type: "媒体创作",
    title: "校园影像叙事与活动摄影",
    to: "/activities/media-story",
    publishedAt: "2026-08-22T00:00:00.000Z",
    available: true,
    location: "图书馆报告厅",
    status: "即将开放",
    summary: "从选题、现场观察到画面组织，学习如何用一组照片讲清一次校园活动。",
    capacity: "60 人",
    audience: "摄影、剪辑、推文与品牌设计方向同学",
    agenda: ["活动摄影观察方法", "镜头组合", "现场光线", "作品复盘"]
  }
] as const;

type ActivityRecord = typeof ACTIVITY_DETAILS[number];

export function findActivity(slug: string): ActivityRecord | undefined;
export function findActivity<T extends { slug: string; available: boolean }>(slug: string, activities: readonly T[]): T | undefined;
export function findActivity(slug: string, activities: readonly { slug: string; available: boolean }[] = ACTIVITY_DETAILS) {
  return activities.find((activity) => activity.slug === slug && activity.available);
}
