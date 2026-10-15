function errorRecord(error: unknown): Record<string, unknown> {
  return error && typeof error === "object" ? error as Record<string, unknown> : {};
}

function errorCode(error: unknown): string | undefined {
  if (typeof error === "string") return error;
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
    case 'ASSESSMENT_TRANSFER_WINDOW_CLOSED':
      return '白泽调入仅在第一轮结果统一公开前开放；当前窗口已关闭，请刷新核对。';
    case 'ASSESSMENT_TRANSFER_NOT_ALLOWED':
      return '仅原第一志愿非白泽、第一轮不通过且接受调剂的成员可调入白泽。';
    case 'ASSESSMENT_TRANSFER_ALREADY_EXISTS':
      return '该成员已调入白泽，不能重复调入或修改已确认方向。';
    case 'ASSESSMENT_TRANSFER_FINAL_DECISION_EXISTS':
      return '该成员已有最终处理结果，不能再调入白泽考核。';
    case 'ASSESSMENT_TRANSFER_TARGET_INVALID':
      return '白泽考核调入目标暂不可用，请刷新核对目标中心。';
    case 'ASSESSMENT_TRANSFER_UNSUPPORTED':
      return '当前服务尚未开放白泽考核调入。';
    case 'ASSESSMENT_TRANSFER_SAVE_UNKNOWN':
      return '暂不能确认保存状态，请先刷新核对。';
    case 'BAIZE_DIRECTION_REQUIRED':
    case 'BAIZE_DIRECTION_INVALID':
      return '请选择有效的白泽方向后再确认调入。';
    case "ROUND_RESULT_ALREADY_RECORDED":
      return "该成员本轮结果已录入，请核对服务器当前结果。";
    case "POST_SAVED_REFRESH_FAILED":
      return "结果已保存，名单刷新失败，请重试刷新。";
    case "ASSESSMENT_ROUND_CHANGED":
    case "ASSESSMENT_CURRENT_ROUND_CHANGED":
    case "ASSESSMENT_ROUND_NOT_CURRENT":
      return "当前考核轮次已变化，请刷新核对后重新确认。";
    case 'UPLOAD_CHECKSUM_MISMATCH':
      return '文件完整性校验失败，请重新选择图片上传。';
    case 'UPLOAD_MIME_TYPE_MISMATCH':
    case 'PRIVATE_IMAGE_INVALID':
    case 'GROUP_CODE_FILE_INVALID':
      return '图片格式无效，请选择不超过5MiB的PNG、JPEG或WebP图片。';
    case 'UPLOAD_INTENT_EXPIRED':
      return '上传任务已过期，请重新选择图片上传。';
    case 'OBJECT_STORAGE_UNAVAILABLE':
      return '存储服务暂不可用，请稍后重试。';
    case 'UPLOAD_PROCESSING_FAILED':
    case 'MEDIA_SCANNER_UNAVAILABLE':
      return '图片安全检查未完成，请稍后重试；持续失败请联系管理员。';
    case "ASSESSMENT_PREVIOUS_ROUND_NOT_PUBLISHED":
      return "请先由联盟总负责人统一发布已完成轮次的结果。";
    case "ASSESSMENT_ROUND_ALREADY_PUBLISHED":
    case "RECRUITMENT_ROUND_PUBLISHED":
      return "本轮结果已发布，不能修改成绩或重新开放报名。";
    case "ASSESSMENT_PREVIEW_STALE":
    case "GROUP_CODE_VERSION_CONFLICT":
      return "数据已更新，请刷新后重新确认。";
    case "GROUP_CODE_UPLOAD_NOT_READY":
    case 'GROUP_CODE_NOT_READY':
      return "图片尚未完成安全检查，请稍后重试。";
    case "ASSESSMENT_BATCH_NOT_CLOSED":
      return "关闭报名后才能推进全局考核轮次。";
    case "ASSESSMENT_ROUND_INCOMPLETE":
      return "当前轮仍有未完成的考核结果，请先完成当前轮。";
    case "ASSESSMENT_ADJUSTMENT_PENDING":
      return "仍有待调剂事项，请先完成调剂处理。";
    case "ADJUSTMENT_NOT_ALLOWED":
      return "当前成员不符合最终调剂条件。";
    case "ADJUSTMENT_TARGET_FORBIDDEN":
      return "不能将成员调剂至该中心。";
    case "ADJUSTMENT_DECISION_ALREADY_EXISTS":
      return "当前成员已经存在最终处理结果。";
    case "ASSESSMENT_NOT_EDITABLE":
      return "当前考核状态不允许修改。";
    case "ASSESSMENT_VERSION_CONFLICT":
    case "RECRUITMENT_ASSESSMENT_VERSION_CONFLICT":
      return "考核版本已变化，请刷新后重新确认。";
    case "OWNER_ONLY":
    case "OWNER_PERMISSION_REQUIRED":
    case "FORBIDDEN":
    case "ASSESSMENT_CENTER_SCOPE_FORBIDDEN":
    case "ASSESSMENT_SCOPE_FORBIDDEN":
      return "当前账号没有执行该考核操作的权限。";
    case "ASSESSMENT_ADJUSTMENT_OWNER_ONLY":
      return "调剂结果由联盟总负责人直接录入，当前账号无需提交线上建议。";
    case "RECRUITMENT_BATCH_NOT_FOUND":
      return "招新批次不存在，请返回批次列表后重试。";
    case "RECRUITMENT_CSRF_TOKEN_MISSING":
      return "安全令牌缺失，请刷新页面后重试。";
    default:
      if (errorRecord(error).status === 403) return "当前账号没有执行该考核操作的权限。";
      return fallback;
  }
}
