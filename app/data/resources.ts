export type ResourceKind = "article" | "pdf" | "docx" | "archive" | "external";
export type ResourceAccess = "public" | "member";
export type ResourceStatus = "ready" | "not-connected" | "offline";

export interface PublicResource {
  slug: string;
  title: string;
  category: "学习路线" | "项目模板" | "活动资料" | "内部课程";
  kind: ResourceKind;
  format: "网页" | "PDF" | "DOCX" | "ZIP";
  access: ResourceAccess;
  status: ResourceStatus;
  summary: string;
  contents: readonly string[];
  version: string;
  updatedAt: string;
  fileSize?: string;
  to: string;
  externalUrl?: string;
}

export const PUBLIC_RESOURCES: readonly PublicResource[] = [
  {
    slug: "harmonyos-getting-started",
    title: "HarmonyOS 原生开发入门清单",
    category: "学习路线",
    kind: "article",
    format: "网页",
    access: "public",
    status: "ready",
    summary: "从环境准备到第一个应用，梳理 HarmonyOS 原生开发的起步步骤。",
    contents: ["配置开发环境", "完成第一个页面", "理解应用工程结构", "继续学习的推荐路径"],
    version: "v1.2",
    updatedAt: "2026-07-18",
    to: "/resources/harmonyos-getting-started"
  },
  {
    slug: "aigc-practice-roadmap",
    title: "大模型应用开发实践路径",
    category: "学习路线",
    kind: "article",
    format: "网页",
    access: "public",
    status: "ready",
    summary: "围绕真实项目，整理从需求定义、原型验证到交付复盘的 AIGC 实践路线。",
    contents: ["识别适合大模型的问题", "搭建可验证的原型", "评估输出质量与风险", "形成项目复盘"],
    version: "v1.1",
    updatedAt: "2026-07-12",
    to: "/resources/aigc-practice-roadmap"
  },
  {
    slug: "project-requirement-template",
    title: "校园科创项目需求说明模板",
    category: "项目模板",
    kind: "docx",
    format: "DOCX",
    access: "public",
    status: "not-connected",
    summary: "用于在立项前对用户、场景、目标和交付边界达成清晰共识。",
    contents: ["项目背景与问题定义", "目标用户与使用场景", "功能范围与优先级", "验收标准与协作分工"],
    version: "v2.0",
    updatedAt: "2026-07-20",
    fileSize: "暂无",
    to: "/resources/project-requirement-template"
  },
  {
    slug: "event-checklist",
    title: "技术沙龙组织检查表",
    category: "活动资料",
    kind: "pdf",
    format: "PDF",
    access: "public",
    status: "not-connected",
    summary: "覆盖筹备、现场执行与复盘的技术沙龙组织检查项。",
    contents: ["明确活动主题与受众", "确认讲者、场地与物料", "安排现场分工", "收集反馈并完成复盘"],
    version: "v1.4",
    updatedAt: "2026-07-09",
    fileSize: "暂无",
    to: "/resources/event-checklist"
  },
  {
    slug: "member-training-package",
    title: "2026 成员训练营课程包",
    category: "内部课程",
    kind: "archive",
    format: "ZIP",
    access: "member",
    status: "not-connected",
    summary: "面向成员训练营的课程安排、练习材料与阶段任务集合。",
    contents: ["训练营节奏与课程安排", "课前准备与练习任务", "小组协作规范", "阶段成果提交说明"],
    version: "v2026.1",
    updatedAt: "2026-07-24",
    fileSize: "暂无",
    to: "/resources/member-training-package"
  },
  {
    slug: "harmonyos-official-docs",
    title: "外部参考 · HarmonyOS 官方开发文档",
    category: "学习路线",
    kind: "external",
    format: "网页",
    access: "public",
    status: "ready",
    summary: "前往 HarmonyOS 官方文档，查看最新的开发指南与 API 参考。",
    contents: ["应用开发概览", "官方开发指南", "组件与 API 参考", "版本更新说明"],
    version: "官方持续更新",
    updatedAt: "以官网为准",
    to: "/resources/harmonyos-official-docs",
    externalUrl: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/application-dev-overview-V5"
  }
];

export function findResource(slug: string): PublicResource | undefined {
  return PUBLIC_RESOURCES.find((item) => item.slug === slug);
}

export function resourcePrimaryAction(resource: PublicResource): string {
  if (resource.status === "not-connected") return "文件暂未接入";
  if (resource.status === "offline") return "该版本已下线";
  if (resource.kind === "article") return "阅读正文";
  if (resource.kind === "external") return "前往外部网站";
  return resource.access === "member" ? "登录后下载" : `下载 ${resource.format}`;
}
