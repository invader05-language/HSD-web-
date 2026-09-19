const ACTION_LABELS: Record<string, string> = {
  "account.password.reset": "重置账号为初始密码",
  "password.changed": "修改账号密码",
  "project.published": "发布项目",
  "project.draft.updated": "更新项目草稿",
  "recruitment.assessment.results-published": "发布考核结果",
  "recruitment.batch.closed": "提前结束招新批次",
  "organization.membership.transferred": "调整成员所属中心",
};
const TARGET_LABELS: Record<string, string> = { account: "成员账号", person: "成员资料", center_membership: "中心归属", RecruitmentBatch: "招新批次", RecruitmentApplication: "报名记录", Project: "项目" };
const SNAPSHOT_LABELS: Record<string, string> = { status: "状态", version: "版本", mustChangePassword: "需首次改密", failedLoginCount: "失败次数", locked: "已锁定" };
export function presentAuditAction(action: string): string { return ACTION_LABELS[action] ?? action.replaceAll(".", " · "); }
export function presentAuditTarget(targetType: string, targetId: string): string { return `${TARGET_LABELS[targetType] ?? targetType} / ${targetId}`; }
export function presentAuditSnapshot(value: Record<string, unknown> | null): string {
  if (!value) return "暂无可展示的安全字段";
  return Object.entries(value).map(([key, item]) => `${SNAPSHOT_LABELS[key] ?? key}: ${item === null ? "—" : String(item)}`).join("\n");
}
