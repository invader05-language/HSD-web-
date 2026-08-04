export type AssetProcessingStatus =
  | "waiting"
  | "uploading"
  | "processing"
  | "ready"
  | "failed";
export type AssetReviewStatus = "pending" | "approved" | "rejected";
export type ResourceAccess = "public" | "member" | "center";

export interface AdminAsset {
  id: string;
  name: string;
  type: "图片" | "视频" | "文档";
  dimensions: string;
  size: string;
  owner: string;
  createdAt: string;
  processingStatus: AssetProcessingStatus;
  reviewStatus: AssetReviewStatus;
  usages: string[];
  alt: string;
  accent: string;
  imageUrl?: string;
}

export interface AdminUploadTask {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: "等待上传" | "上传中" | "处理中" | "待审核" | "可使用" | "失败";
  note: string;
}

export interface ResourceVersion {
  version: string;
  fileName: string;
  size: string;
  uploadedAt: string;
  owner: string;
  state: string;
}

export interface AdminLearningResource {
  id: string;
  title: string;
  category: string;
  format: string;
  access: ResourceAccess;
  status: "草稿" | "待审核" | "已发布";
  owner: string;
  updatedAt: string;
  downloads: number;
  description: string;
  versions: ResourceVersion[];
}

export const ADMIN_ASSETS: AdminAsset[] = [
  {
    id: "asset-recruitment-hero",
    name: "2026 招新首页主视觉",
    type: "图片",
    dimensions: "2400 × 900",
    size: "3.8 MB",
    owner: "新媒体中心",
    createdAt: "2026-07-30",
    processingStatus: "ready",
    reviewStatus: "approved",
    usages: ["官网首页 Banner", "加入我们入口"],
    alt: "白云 HSD 开发者部落 2026 秋季招新主视觉",
    accent: "#9e1b26",
    imageUrl: recruitmentHeroSource
  },
  {
    id: "asset-salon",
    name: "鸿蒙技术沙龙现场 01",
    type: "图片",
    dimensions: "6000 × 4000",
    size: "12.6 MB",
    owner: "摄影组 · 周同学",
    createdAt: "2026-07-29",
    processingStatus: "processing",
    reviewStatus: "pending",
    usages: [],
    alt: "",
    accent: "#34424f"
  },
  {
    id: "asset-project",
    name: "智巡先锋项目演示",
    type: "视频",
    dimensions: "1920 × 1080",
    size: "186 MB",
    owner: "白泽开发中心",
    createdAt: "2026-07-28",
    processingStatus: "ready",
    reviewStatus: "approved",
    usages: ["项目详情页"],
    alt: "智巡先锋项目现场演示视频封面",
    accent: "#765e49"
  },
  {
    id: "asset-campus",
    name: "校园秋日组照 12",
    type: "图片",
    dimensions: "4800 × 3200",
    size: "8.2 MB",
    owner: "新媒体中心",
    createdAt: "2026-07-27",
    processingStatus: "ready",
    reviewStatus: "rejected",
    usages: [],
    alt: "",
    accent: "#82673f"
  },
  {
    id: "asset-failed",
    name: "活动录像原片 03",
    type: "视频",
    dimensions: "3840 × 2160",
    size: "1.8 GB",
    owner: "新媒体中心",
    createdAt: "2026-07-26",
    processingStatus: "failed",
    reviewStatus: "pending",
    usages: [],
    alt: "",
    accent: "#4d4f52"
  }
];

export const ADMIN_UPLOAD_TASKS: AdminUploadTask[] = [
  { id: "u1", name: "招新宣讲会现场-01.jpg", type: "JPG", progress: 0, status: "等待上传", note: "等待用户确认文件与公开授权" },
  { id: "u2", name: "中心介绍短片.mp4", type: "MP4", progress: 68, status: "上传中", note: "分片上传，可断点续传" },
  { id: "u3", name: "摄影采风-精选.zip", type: "ZIP", progress: 100, status: "处理中", note: "生成缩略图并读取元数据" },
  { id: "u4", name: "旧版活动录像.mov", type: "MOV", progress: 34, status: "失败", note: "文件超过演示限制，需要重新压缩" }
];

export const ADMIN_RESOURCES: AdminLearningResource[] = [
  {
    id: "harmony-roadmap",
    title: "HarmonyOS 入门路线",
    category: "鸿蒙开发",
    format: "PDF",
    access: "public",
    status: "已发布",
    owner: "白泽开发中心",
    updatedAt: "2026-07-29 20:10",
    downloads: 286,
    description: "从 ArkTS 语法到原生应用实践的分阶段学习路线。",
    versions: [
      { version: "v2.1", fileName: "HarmonyOS-路线-v2.1.pdf", size: "8.6 MB", uploadedAt: "2026-07-29", owner: "陈同学", state: "当前版本" },
      { version: "v2.0", fileName: "HarmonyOS-路线-v2.0.pdf", size: "7.9 MB", uploadedAt: "2026-06-18", owner: "陈同学", state: "历史版本" }
    ]
  },
  {
    id: "competition-template",
    title: "竞赛项目复盘模板",
    category: "赛事资料",
    format: "DOCX",
    access: "member",
    status: "已发布",
    owner: "拓维策划中心",
    updatedAt: "2026-07-28 15:42",
    downloads: 94,
    description: "用于记录项目目标、分工、结果与下一步改进的标准模板。",
    versions: [
      { version: "v1.3", fileName: "竞赛复盘模板-v1.3.docx", size: "1.2 MB", uploadedAt: "2026-07-28", owner: "林同学", state: "当前版本" }
    ]
  },
  {
    id: "media-guide",
    title: "活动摄影与素材归档规范",
    category: "媒体运营",
    format: "PDF",
    access: "center",
    status: "待审核",
    owner: "新媒体中心",
    updatedAt: "2026-07-27 12:06",
    downloads: 0,
    description: "规定活动拍摄清单、授权确认、文件命名和归档流程。",
    versions: [
      { version: "v1.0", fileName: "媒体素材归档规范-v1.0.pdf", size: "4.4 MB", uploadedAt: "2026-07-27", owner: "周同学", state: "待审核" }
    ]
  }
];

const PROCESSING_LABELS: Record<AssetProcessingStatus, string> = {
  waiting: "等待上传",
  uploading: "上传中",
  processing: "处理中",
  ready: "处理完成",
  failed: "处理失败"
};

export function getAssetProcessingLabel(status: AssetProcessingStatus) {
  return PROCESSING_LABELS[status];
}

export function canSelectAsset(
  asset: Pick<AdminAsset, "processingStatus" | "reviewStatus">
) {
  return asset.processingStatus === "ready" && asset.reviewStatus === "approved";
}

export function canUseAssetForPortalContent(assetId: string) {
  const asset = ADMIN_ASSETS.find((item) => item.id === assetId);
  return Boolean(asset?.imageUrl && asset.type === "图片" && canSelectAsset(asset));
}

export function resolvePortalAssetSource(assetId?: string) {
  if (!assetId) return undefined;
  const asset = ADMIN_ASSETS.find((item) => item.id === assetId);
  if (!asset || asset.type !== "图片" || !canSelectAsset(asset)) return undefined;
  return asset.imageUrl;
}

export function filterAdminAssets(
  assets: AdminAsset[],
  filters: { query: string; type: string; state: string }
) {
  const query = filters.query.trim().toLocaleLowerCase();
  return assets.filter((asset) => {
    const matchesQuery =
      !query ||
      [asset.name, asset.owner, asset.alt]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    const matchesType = filters.type.startsWith("全部") || asset.type === filters.type;
    const matchesState =
      filters.state.startsWith("全部") ||
      (filters.state === "可使用" && canSelectAsset(asset)) ||
      (filters.state === "处理中" && ["waiting", "uploading", "processing"].includes(asset.processingStatus)) ||
      (filters.state === "异常" && (asset.processingStatus === "failed" || asset.reviewStatus === "rejected"));
    return matchesQuery && matchesType && matchesState;
  });
}

export function getResourceAccessLabel(access: ResourceAccess) {
  return {
    public: "公开访问",
    member: "登录成员",
    center: "指定中心"
  }[access];
}
import recruitmentHeroSource from "../../设计稿/页面Banner/01-首页Banner.png?url";
