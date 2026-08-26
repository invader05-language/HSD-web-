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

export function getRecruitmentBatchCommandMessage(error: unknown, fallback = "批次操作未完成，请检查填写内容后重试。"): string {
  const code = recruitmentBatchErrorCode(error);
  const conflict = conflictFrom(error);
  const period = conflict
    ? formatRecruitmentBatchPeriod({
      startAt: conflict.startAt,
      endAt: conflict.endAt,
      timezone: "Asia/Shanghai",
    })
    : "";

  // The API may return a localized explanation for a domain error. Preserve
  // that safe user-facing copy while translating protocol/English messages
  // below so an API failure never renders opaque error codes in the admin UI.
  const serverMessage = errorRecord(error).message;
  if (typeof serverMessage === "string" && /[\u4e00-\u9fff]/.test(serverMessage)) {
    return serverMessage;
  }

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
    case "BATCH_INVALID_WINDOW":
      return "报名开始和截止时间无效，请重新检查日期。";
    case "BATCH_ALREADY_PUBLISHED":
      return "该批次已经发布，不能重复执行发布操作。";
    case "OWNER_PERMISSION_REQUIRED":
    case "OWNER_ONLY":
    case "RECRUITMENT_BATCH_OWNER_ONLY":
    case "FORBIDDEN":
      return "权限不足：只有联盟总负责人可以执行此操作。";
    case "RECRUITMENT_BATCH_VERSION_CONFLICT":
    case "BATCH_VERSION_CONFLICT":
      return "批次版本已变化，请刷新后重新确认。";
    case "RECRUITMENT_BATCH_NOT_FOUND":
      return "招新批次不存在，请返回批次列表后重试。";
    case "BATCH_COMMAND_NOT_ALLOWED":
    case "BATCH_STATUS_INVALID":
    case "BATCH_INVALID_TRANSITION":
      return "当前批次状态不允许执行此操作，请刷新后重试。";
    case "BATCH_ARCHIVED_READ_ONLY":
      return "归档批次为只读状态，不能修改。";
    case "CONFIRMATION_REQUIRED":
      return "请确认本次批次状态操作后再提交。";
    case "BATCH_STORAGE_WRITE_FAILED":
    case "BATCH_STORAGE_UNAVAILABLE":
      return "批次数据保存失败，请稍后重试。";
    default:
      return fallback;
  }
}
