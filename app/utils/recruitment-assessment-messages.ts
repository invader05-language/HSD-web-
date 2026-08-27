function errorRecord(error: unknown): Record<string, unknown> {
  return error && typeof error === "object" ? error as Record<string, unknown> : {};
}

function errorCode(error: unknown): string | undefined {
  const code = errorRecord(error).code;
  if (typeof code === "string") return code;
  const message = error instanceof Error ? error.message : undefined;
  return message;
}

/** Convert assessment API/domain errors into copy safe for the admin UI. */
export function getRecruitmentAssessmentMessage(error: unknown, fallback = "考核操作未完成，请刷新后重试。") {
  const code = errorCode(error);
  const serverMessage = errorRecord(error).message;
  if (typeof serverMessage === "string" && /[\u4e00-\u9fff]/.test(serverMessage)) return serverMessage;
  switch (code) {
    case "ASSESSMENT_BATCH_NOT_CLOSED":
      return "关闭报名后才能推进全局考核轮次。";
    case "ASSESSMENT_ROUND_INCOMPLETE":
      return "当前轮仍有未完成的考核结果，请先完成当前轮。";
    case "ASSESSMENT_ADJUSTMENT_PENDING":
      return "仍有待调剂事项，请先完成调剂处理。";
    case "ASSESSMENT_NOT_EDITABLE":
      return "当前考核状态不允许修改。";
    case "ASSESSMENT_VERSION_CONFLICT":
    case "RECRUITMENT_ASSESSMENT_VERSION_CONFLICT":
      return "考核版本已变化，请刷新后重新确认。";
    case "OWNER_ONLY":
    case "FORBIDDEN":
      return "当前账号没有执行该考核操作的权限。";
    case "ASSESSMENT_ADJUSTMENT_OWNER_ONLY":
      return "调剂结果由联盟总负责人直接录入，当前账号无需提交线上建议。";
    case "RECRUITMENT_BATCH_NOT_FOUND":
      return "招新批次不存在，请返回批次列表后重试。";
    case "RECRUITMENT_CSRF_TOKEN_MISSING":
      return "安全令牌缺失，请刷新页面后重试。";
    default:
      return fallback;
  }
}
