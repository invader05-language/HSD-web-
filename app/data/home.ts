export const HOME_SECTIONS = [
  "hero",
  "flash",
  "stats",
  "news",
  "centers",
  "projects",
  "activities",
  "gallery",
  "members",
  "resources",
  "recruitment"
] as const;

export const STATS = [
  { value: "111", label: "部落成员" },
  { value: "32", label: "核心骨干" },
  { value: "4", label: "协作中心" },
  { value: "10+", label: "项目与赛事成果" }
] as const;

export { CENTERS } from "./centers";

export const PROJECTS = [
  {
    slug: "zhixun-xianfeng",
    title: "智巡先锋",
    category: "SMART_HARDWARE",
    description: "面向校园巡检与应急协同的智能解决方案，将识别、告警和处置流程连接起来。",
    achievement: "重点孵化项目 · 场景验证中"
  },
  {
    slug: "zhixue-linghang",
    title: "智学领航",
    category: "AI_APPLICATION",
    description: "大学生智能学习系统，提供个性化学习路径、实时答疑和生活提醒。",
    achievement: "学习效率工具"
  },
  {
    slug: "xiaobaiyun",
    title: "小白云",
    category: "CAMPUS_SERVICE",
    description: "聚合课表、通知、二手与路线信息，帮助新生更快适应校园生活。",
    achievement: "服务 1000+ 校园用户"
  },
  {
    slug: "zhineng-banlv",
    title: "智能伴侣",
    category: "INDUSTRY_DIGITALIZATION",
    description: "探索软硬件联动的陪伴型应用，用可感知交互连接校园生活场景。",
    achievement: "原型迭代中"
  }
] as const;

export const ACTIVITIES = [
  {
    day: "06",
    month: "AUG",
    type: "技术沙龙",
    title: "HarmonyOS 原生应用入门",
    meta: "19:00 · 鸿蒙实训工作室",
    to: "/activities/harmonyos-salon"
  },
  {
    day: "12",
    month: "AUG",
    type: "项目实训",
    title: "从需求到可演示原型",
    meta: "14:30 · 产教融合中心",
    to: "/activities/project-camp"
  },
  {
    day: "22",
    month: "AUG",
    type: "开放分享",
    title: "校园影像叙事与活动摄影",
    meta: "19:30 · 图书馆报告厅",
    to: "/activities/media-story"
  }
] as const;

export const MEMBERS = [
  {
    name: "林同学",
    center: "白泽开发中心",
    quote: "从第一次写原生页面，到能和团队一起完成可演示项目，成长来自持续交付。",
    year: "2025 届成员"
  },
  {
    name: "陈同学",
    center: "新媒体中心",
    quote: "一次活动不只有现场，影像、文字和设计让它被更多人看见，也让经验被保留下来。",
    year: "2025 届成员"
  },
  {
    name: "周同学",
    center: "拓维策划中心",
    quote: "策划教会我的不是写一张流程表，而是让不同角色在同一个目标下顺利协作。",
    year: "2024 届成员"
  }
] as const;

export const RESOURCES = [
  { type: "学习路线", title: "HarmonyOS 原生开发入门清单", access: "公开浏览", to: "/resources/harmonyos-getting-started" },
  { type: "项目模板", title: "校园科创项目需求说明模板", access: "文件暂未接入", to: "/resources/project-requirement-template" },
  { type: "内部资料", title: "2026 成员训练营课程资料", access: "文件暂未接入", to: "/resources/member-training-package" }
] as const;
