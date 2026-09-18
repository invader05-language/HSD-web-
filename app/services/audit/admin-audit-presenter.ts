import type { AdminAuditListRow, SafeAuditProjection, SafeAuditScalar } from "./admin-audit-list";

export interface PresentedAuditAction {
  label: string;
  module: string;
  technicalCode: string;
}

export interface PresentedAuditTarget {
  typeLabel: string;
  summary: string;
  technicalType: string;
  technicalId: string;
}

const ACTIONS: Record<string, { label: string; module: string }> = {
  "upload.intent.created": { label: "创建上传任务", module: "媒体与资源" },
  "upload.completed": { label: "文件上传完成", module: "媒体与资源" },
  "organization.membership.transferred": { label: "调整成员所属中心", module: "组织与成员" },
  "recruitment.batch.closed": { label: "关闭招新批次", module: "招新与考核" },
  "recruitment.batch.archived": { label: "归档招新批次", module: "招新与考核" },
  "recruitment.application.submitted": { label: "提交报名", module: "招新与考核" },
  "recruitment.assessment.round-recorded": { label: "录入考核结果", module: "招新与考核" },
  "recruitment.assessment.round-advanced": { label: "进入下一轮考核", module: "招新与考核" },
  "recruitment.assessment.adjustment-decided": { label: "确认调剂结果", module: "招新与考核" },
  "recruitment.assessment.results-published": { label: "发布整批考核结果", module: "招新与考核" },
  "member.profile.updated": { label: "更新个人资料", module: "组织与成员" },
  "project.draft.updated": { label: "更新项目草稿", module: "项目与活动" },
  "project.published": { label: "发布项目", module: "项目与活动" },
  "password.changed": { label: "修改密码", module: "系统管理" },
  "account.password.reset": { label: "重置账号临时密码", module: "系统管理" },
};

const TARGET_TYPES: Record<string, string> = {
  Upload: "上传任务",
  center_membership: "成员中心关系",
  RecruitmentBatch: "招新批次",
  RecruitmentAssessmentBatch: "考核批次",
  RecruitmentApplication: "报名记录",
  person: "成员资料",
  account: "平台账号",
  Project: "项目",
  ContentDocument: "官网内容",
  content: "官网内容",
  Activity: "活动",
  Gallery: "媒体画廊",
  Resource: "资源资料",
};

const TARGET_SUMMARY_PREFIX: Record<string, string> = {
  account: "账号",
  person: "成员",
  center_membership: "成员中心关系",
  RecruitmentBatch: "招新批次",
  RecruitmentAssessmentBatch: "考核批次",
  RecruitmentApplication: "报名记录",
  Project: "项目",
  ContentDocument: "官网内容",
  content: "官网内容",
};

const FIELD_LABELS: Record<string, string> = {
  status: "状态",
  version: "版本",
  name: "名称",
  title: "标题",
  slug: "标识",
  lifecycleStatus: "生命周期",
  manualOverride: "手动状态",
  mustChangePassword: "下次登录需改密",
  adminLevel: "管理级别",
  centerId: "所属中心",
  targetCenterId: "目标中心",
  duty: "职责",
  outcome: "结果",
  decision: "决定",
  currentRound: "当前轮次",
  round: "轮次",
  deleted: "已删除",
};

const VALUE_LABELS: Record<string, string> = {
  ENABLED: "已启用",
  DISABLED: "已停用",
  DRAFT: "草稿",
  REVIEW: "审核中",
  PUBLISHED: "已发布",
  PENDING_PUBLICATION: "待发布",
  CLOSED: "已关闭",
  ARCHIVED: "已归档",
  NONE: "无",
  FORCE_OPEN: "强制开放",
  FORCE_CLOSED: "强制关闭",
  PAUSED: "已暂停",
  OWNER: "联盟负责人",
  ADMIN: "中心管理员",
  MEMBER: "成员",
  true: "是",
  false: "否",
};

function displayValue(value: SafeAuditScalar): string {
  if (value === null) return "无";
  if (typeof value === "boolean") return value ? "是" : "否";
  return VALUE_LABELS[value] ?? String(value);
}

function truncateId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

export function presentAuditAction(code: string): PresentedAuditAction {
  const known = ACTIONS[code];
  return {
    label: known?.label ?? "其他系统操作",
    module: known?.module ?? "系统管理",
    technicalCode: code,
  };
}

export function presentAuditTarget(row: Pick<AdminAuditListRow, "targetType" | "targetId" | "before" | "after">): PresentedAuditTarget {
  const typeLabel = TARGET_TYPES[row.targetType] ?? "其他对象";
  const values = [row.after, row.before].filter((value): value is SafeAuditProjection => Boolean(value));
  const namedValue = values.flatMap((value) => [value.name, value.title, value.slug]).find((value): value is string => typeof value === "string" && Boolean(value.trim()));
  const summary = namedValue ? namedValue : `${TARGET_SUMMARY_PREFIX[row.targetType] ?? typeLabel} ${truncateId(row.targetId)}`;
  return { typeLabel, summary, technicalType: row.targetType, technicalId: row.targetId };
}

export function formatAuditProjection(value: SafeAuditProjection | null): string {
  if (!value) return "暂无可展示的安全字段";
  return Object.entries(value)
    .map(([key, entry]) => `${FIELD_LABELS[key] ?? key}：${Array.isArray(entry) ? entry.map(displayValue).join("、") : displayValue(entry)}`)
    .join("\n");
}

export function formatAuditOccurredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date).replace(/年|月/g, "/").replace("日", "");
  return `${formatted} (UTC+8)`;
}
