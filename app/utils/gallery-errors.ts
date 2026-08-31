const GALLERY_ERROR_MESSAGES: Record<string, string> = {
  GALLERY_INCOMPLETE: "请补充画廊专题的必填信息。",
  GALLERY_NOT_FOUND: "画廊专题不存在，或当前账号无权访问。",
  GALLERY_CENTER_SCOPE_REQUIRED: "当前账号只能管理所属中心的画廊专题。",
  GALLERY_SLUG_CONFLICT: "专题地址已被占用，请修改标题后重试。",
  GALLERY_SLUG_IMMUTABLE: "已发布专题的地址不可修改。",
  GALLERY_VERSION_CONFLICT: "画廊专题已被其他管理员修改，请刷新后重试。",
  GALLERY_COVER_REQUIRED: "请先上传并选择一张图片封面。",
  GALLERY_COVER_METADATA_REQUIRED: "封面信息不完整，请补充替代文本。",
  GALLERY_DETAILS_REQUIRED: "请至少添加一项专题详情素材。",
  GALLERY_ASSET_REQUIRED: "请至少添加一项专题详情素材。",
  GALLERY_ASSET_METADATA_REQUIRED: "专题详情素材信息不完整，请补充标题、说明、替代文本或比例。",
  GALLERY_DETAILS_LIMIT_EXCEEDED: "专题详情素材最多添加 20 项。",
  GALLERY_NOT_PUBLISHED: "该专题当前不是已发布状态。",
  MEDIA_ATTACHMENT_DUPLICATE: "封面和详情素材不能重复使用同一项素材。",
  MEDIA_NOT_READY: "素材仍在处理中，请稍后再发布。",
  MEDIA_PROCESSING_FAILED: "素材处理失败，请更换文件后重试。",
  MEDIA_COVER_INCOMPLETE: "封面信息不完整，请补充替代文本。",
  MEDIA_DETAIL_INCOMPLETE: "详情素材信息不完整，请补充标题和替代文本。",
  MEDIA_ATTACHMENT_VERSION_REQUIRED: "素材信息已更新，请刷新后重试。",
  CONTENT_MEDIA_OWNER_REQUIRED: "请先保存画廊草稿，再上传素材。",
  CONTENT_MEDIA_CSRF_TOKEN_MISSING: "当前登录校验已失效，请刷新页面后重试。",
  CONTENT_MEDIA_CHECKSUM_FAILED: "文件摘要计算失败，请重试或使用 HTTPS 访问管理台。",
  CONTENT_MEDIA_TYPE_UNSUPPORTED: "文件格式不受支持。",
  CONTENT_MEDIA_COVER_IMAGE_REQUIRED: "画廊封面必须是图片。",
  CONTENT_MEDIA_SIZE_EXCEEDED: "文件大小超过限制。",
  DIRECT_UPLOAD_FAILED: "文件上传失败，请检查网络后重试。",
  UPLOAD_DESTINATION_MISSING: "暂时无法创建上传任务，请稍后重试。",
  CONTENT_MEDIA_API_REQUEST_FAILED: "素材服务暂时不可用，请稍后重试。",
  GALLERY_API_REQUEST_FAILED: "画廊服务暂时不可用，请稍后重试。",
};

export function localizeGalleryError(error: unknown): string {
  const rawMessage = error instanceof Error
    ? error.message
    : error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  const code = error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : rawMessage || "GALLERY_API_REQUEST_FAILED";
  return GALLERY_ERROR_MESSAGES[code] ?? (rawMessage && !/^[A-Z][A-Z0-9_]+$/.test(rawMessage) ? rawMessage : "操作未完成，请稍后重试。");
}
