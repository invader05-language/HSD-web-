const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "草稿",
  UPCOMING: "待开放",
  OPEN: "开放报名",
  PAUSED: "报名暂停",
  CLOSED: "已关闭",
  ARCHIVED: "已归档",
  PUBLISHED: "已发布",
  FORCE_CLOSED: "已关闭",
};

const LIFECYCLE_OVERRIDE_LABELS: Record<string, string> = {
  NONE: "无",
  FORCE_CLOSED: "管理员提前关闭",
};

export function lifecycleStatusLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "无";
  const normalized = String(value).trim().toUpperCase();
  return LIFECYCLE_STATUS_LABELS[normalized] ?? String(value);
}

export function lifecycleOverrideLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "无";
  const normalized = String(value).trim().toUpperCase();
  return LIFECYCLE_OVERRIDE_LABELS[normalized] ?? String(value);
}

export function lifecycleSnapshotValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(lifecycleSnapshotValue).join("、") || "无";
  if (value === null || value === undefined || value === "") return "无";
  if (typeof value === "boolean") return value ? "是" : "否";
  const normalized = String(value).trim().toUpperCase();
  return LIFECYCLE_OVERRIDE_LABELS[normalized]
    ?? LIFECYCLE_STATUS_LABELS[normalized]
    ?? String(value);
}

function snapshotStatus(snapshot: Record<string, unknown> | null | undefined): string | undefined {
  if (!snapshot) return undefined;
  const value = snapshot.lifecycleStatus ?? snapshot.status;
  if (value === null || value === undefined || value === "") return undefined;
  return lifecycleStatusLabel(value);
}

export function lifecycleChangeSummary(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string {
  const beforeStatus = snapshotStatus(before);
  const afterStatus = snapshotStatus(after);
  if (!beforeStatus && !afterStatus) return "已记录变更";
  if (!beforeStatus) return `创建为${afterStatus}`;
  if (!afterStatus) return `${beforeStatus} → 状态已清除`;
  const override = after?.manualOverride;
  const overrideLabel = override && lifecycleOverrideLabel(override) !== "无"
    ? `（${lifecycleOverrideLabel(override)}）`
    : "";
  return `${beforeStatus} → ${afterStatus}${overrideLabel}`;
}
