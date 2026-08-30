const ACTIVITY_ERROR_MESSAGES: Record<string, string> = {
  ACTIVITY_INCOMPLETE: "请补充活动必填信息。",
  ACTIVITY_REGISTRATION_CLOSED: "报名截止时间已过；如需继续报名，请确认手动重新开放。",
  ACTIVITY_NOT_PUBLISHED: "活动发布后才能开放报名。",
  ACTIVITY_CENTER_SCOPE_REQUIRED: "当前账号只能管理所属中心的活动。",
  ACTIVITY_VERSION_CONFLICT: "活动已被其他管理员修改，请刷新后重试。",
  ACTIVITY_TIME_INVALID: "请选择有效的开始和结束时间。",
  CONTENT_MEDIA_OWNER_REQUIRED: "请先保存活动草稿，再上传素材。",
  CONTENT_MEDIA_CSRF_TOKEN_MISSING: "当前登录校验已失效，请刷新页面后重试。",
  CONTENT_MEDIA_TYPE_UNSUPPORTED: "文件格式不受支持。",
  CONTENT_MEDIA_COVER_IMAGE_REQUIRED: "活动封面必须是图片。",
  CONTENT_MEDIA_SIZE_EXCEEDED: "文件大小超过限制。",
  MEDIA_NOT_READY: "素材仍在处理中，请稍后再试。",
  MEDIA_PROCESSING_FAILED: "素材处理失败，请更换文件后重试。",
  DIRECT_UPLOAD_FAILED: "文件上传失败，请检查网络后重试。",
  UPLOAD_DESTINATION_MISSING: "暂时无法创建上传任务，请稍后重试。",
  CONTENT_MEDIA_API_REQUEST_FAILED: "素材服务暂时不可用，请稍后重试。",
  MEDIA_ATTACHMENT_VERSION_REQUIRED: "素材信息已更新，请刷新后重试。",
  ACTIVITY_REGISTRATION_TEMPLATE_INVALID: "报名字段配置不完整或格式不正确。",
  ACTIVITY_REGISTRATION_TEMPLATE_UNAVAILABLE: "报名模板暂不可用，请联系管理员。",
  ACTIVITY_REGISTRATION_TEMPLATE_CHANGED: "报名表已更新，请刷新后重新填写。",
  ACTIVITY_REGISTRATION_TEMPLATE_VERSION_CONFLICT: "报名模板已被其他管理员修改，请刷新后重试。",
  ACTIVITY_REGISTRATION_ANSWERS_INVALID: "请检查报名信息后再提交。",
  OWNER_PERMISSION_REQUIRED: "只有联盟负责人可以配置共用报名模板。",
};

export function localizeActivityError(error: unknown): string {
  const rawMessage = error instanceof Error
    ? error.message
    : error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  const code = error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : rawMessage || "ACTIVITY_API_REQUEST_FAILED";
  return ACTIVITY_ERROR_MESSAGES[code] ?? (rawMessage && !/^[A-Z][A-Z0-9_]+$/.test(rawMessage) ? rawMessage : "操作未完成，请稍后重试。");
}
