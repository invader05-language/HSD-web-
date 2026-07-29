import { PROJECTS } from "./home";

export const PROJECT_FILTERS = ["全部", "HarmonyOS", "AI 应用", "校园服务", "软硬件"] as const;

export const PROJECT_DETAILS = PROJECTS.map((project, index) => ({
  ...project,
  year: index < 2 ? "2026" : "2025",
  status: index === 0 ? "场景验证中" : index === 1 ? "持续迭代" : "已发布原型",
  challenge: index === 0
    ? "校园巡检信息分散、响应链路长，现场异常难以及时同步给协同人员。"
    : "把校园中的真实问题转化为可验证、可迭代的数字产品。",
  solution: index === 0
    ? "通过视觉识别、HarmonyOS 终端与后端事件流，形成采集、告警、处置、复盘的完整闭环。"
    : "从用户访谈出发，完成需求排序、交互原型、技术验证和小范围测试。",
  technologies: index === 0
    ? ["HarmonyOS", "AI 视觉识别", "事件驱动架构"]
    : ["Vue", "HarmonyOS", "校园场景研究"],
  team: "白泽开发中心 × 新媒体中心 × 拓维策划中心"
}));

export function findProject(slug: string) {
  return PROJECT_DETAILS.find((project) => project.slug === slug);
}

