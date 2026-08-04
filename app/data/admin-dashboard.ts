export type AdminPriority = "urgent" | "warning" | "normal";

export interface AdminDashboardMetric {
  label: string;
  value: string;
  description: string;
  to: string;
  tone: "red" | "dark" | "green" | "amber";
}

export interface AdminTodo {
  id: string;
  type: string;
  title: string;
  meta: string;
  priority: AdminPriority;
  to: string;
}

export const ADMIN_DASHBOARD_METRICS: AdminDashboardMetric[] = [
  {
    label: "待处理事项",
    value: "12",
    description: "其中 5 项今天到期",
    to: "/admin/recruitment?result=待处理",
    tone: "red"
  },
  {
    label: "待审核内容",
    value: "06",
    description: "媒体素材与个人荣誉",
    to: "/admin/content?status=待审核",
    tone: "dark"
  },
  {
    label: "待发布内容",
    value: "04",
    description: "已检查，等待最终发布",
    to: "/admin/content?status=待发布",
    tone: "green"
  },
  {
    label: "存储使用情况",
    value: "37%",
    description: "Mock 配额 100 GB",
    to: "/admin/media?view=storage",
    tone: "amber"
  }
];

export const ADMIN_TODOS: AdminTodo[] = [
  {
    id: "todo-publication",
    type: "招新结果",
    title: "2026 秋季招新有 5 条结果等待检查",
    meta: "今天 18:00 前 · 联盟总负责人",
    priority: "urgent",
    to: "/admin/recruitment/publish"
  },
  {
    id: "todo-upload-failed",
    type: "文件处理",
    title: "训练营课程包的安全扫描状态异常",
    meta: "需要重新上传 · 媒体与资源",
    priority: "urgent",
    to: "/admin/resources?status=处理失败"
  },
  {
    id: "todo-honors",
    type: "荣誉审核",
    title: "3 位成员提交了新的公开荣誉",
    meta: "本周内处理 · 组织与成员",
    priority: "warning",
    to: "/admin/honors?status=待审核"
  },
  {
    id: "todo-activity",
    type: "活动提醒",
    title: "HarmonyOS 技术沙龙报名将在两天后截止",
    meta: "当前 42 / 60 人 · 项目与活动",
    priority: "normal",
    to: "/admin/activities"
  }
];

export const ADMIN_RECRUITMENT_PROGRESS = [
  { label: "白泽开发中心", value: 32, meta: "第二轮进行中", tone: "red" },
  { label: "新媒体中心", value: 18, meta: "面试结果待发布", tone: "dark" },
  { label: "拓维策划中心", value: 16, meta: "面试进行中", tone: "dark" },
  { label: "人才发展中心", value: 14, meta: "报名确认中", tone: "dark" }
];

export const ADMIN_CONTENT_ACTIVITY = [
  { type: "HSD 快讯", title: "2026 秋季招新通道开放", status: "已发布", time: "11 分钟前" },
  { type: "活动", title: "HarmonyOS 原生开发技术沙龙", status: "待审核", time: "35 分钟前" },
  { type: "项目", title: "智巡先锋阶段成果更新", status: "草稿", time: "1 小时前" },
  { type: "媒体专题", title: "夏季训练营影像记录", status: "处理中", time: "2 小时前" }
];

export const ADMIN_STORAGE_OVERVIEW = [
  { label: "图片素材", value: "286", meta: "8.4 GB" },
  { label: "学习资料", value: "42", meta: "19.6 GB" },
  { label: "上传处理中", value: "07", meta: "预计 3 分钟" },
  { label: "处理失败", value: "02", meta: "需要关注" }
];

export const ADMIN_QUICK_CREATE = [
  { label: "发布 HSD 快讯", to: "/admin/content?create=flash" },
  { label: "新建新闻", to: "/admin/content?create=article" },
  { label: "新建公告", to: "/admin/content?create=notice" },
  { label: "新建项目", to: "/admin/projects?create=project" },
  { label: "新建活动", to: "/admin/activities?create=activity" },
  { label: "上传媒体作品", to: "/admin/media?upload=1" },
  { label: "上传学习资料", to: "/admin/resources?upload=1" },
  { label: "添加成员", to: "/admin/members?create=member" }
];
