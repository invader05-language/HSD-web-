import { formatRecruitmentBatchPeriod } from "../data/recruitment-admin-context";
import type {
  RecruitmentBatchCommandErrorCode,
  RecruitmentBatchConflictSummary,
} from "../types/recruitment-batch";

function errorRecord(error: unknown): Record<string, unknown> {
  return error && typeof error === "object" ? error as Record<string, unknown> : {};
}

function conflictFrom(error: unknown): RecruitmentBatchConflictSummary | undefined {
  const candidate = errorRecord(error).conflict;
  if (!candidate || typeof candidate !== "object") return undefined;
  const value = candidate as Partial<RecruitmentBatchConflictSummary>;
  if (![value.batchId, value.batchName, value.startAt, value.endAt].every((item) => typeof item === "string")) {
    return undefined;
  }
  return value as RecruitmentBatchConflictSummary;
}

export function recruitmentBatchErrorCode(error: unknown): RecruitmentBatchCommandErrorCode | undefined {
  const value = errorRecord(error).code;
  if (typeof value === "string") return value as RecruitmentBatchCommandErrorCode;
  const message = error instanceof Error ? error.message : undefined;
  return message as RecruitmentBatchCommandErrorCode | undefined;
}

export function getRecruitmentBatchCommandMessage(error: unknown): string {
  const code = recruitmentBatchErrorCode(error);
  const conflict = conflictFrom(error);
  const period = conflict
    ? formatRecruitmentBatchPeriod({
      startAt: conflict.startAt,
      endAt: conflict.endAt,
      timezone: "Asia/Shanghai",
    })
    : "";

  switch (code) {
    case "BATCH_SCHEDULE_OVERLAP":
      return conflict
        ? `报名时间与「${conflict.batchName}」重叠（${period}）。该批次即使暂停仍属于已发布批次，请修改当前时间后再发布。`
        : "报名时间与其他已发布批次重叠，请修改当前批次时间。";
    case "BATCH_ALREADY_OPEN":
      return conflict
        ? `当前已有开放批次「${conflict.batchName}」，请先处理现有批次或调整当前报名时间。`
        : "当前已有开放批次，请先处理现有批次。";
    case "BATCH_CENTER_REQUIRED":
      return "至少选择一个开放中心后才能发布批次。";
    case "BATCH_WINDOW_INVALID":
      return "报名开始和截止时间无效，请重新检查日期。";
    case "BATCH_ALREADY_PUBLISHED":
      return "该批次已经发布，不能重复执行发布操作。";
    case "OWNER_PERMISSION_REQUIRED":
      return "只有联盟总负责人可以执行此操作。";
    case "BATCH_STORAGE_WRITE_FAILED":
    case "BATCH_STORAGE_UNAVAILABLE":
      return "批次数据保存失败，请稍后重试。";
    default:
      return "批次操作未完成，请检查填写内容后重试。";
  }
}
