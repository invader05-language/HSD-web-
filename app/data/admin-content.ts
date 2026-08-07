import type { PortalContentKind, PortalContentRecord, PortalContentStatus } from "~/types/portal-content";
import type { PortalCatalogEntityType, PortalSlotId } from "~/types/portal-content";

export type AdminContentStatus = "草稿" | "待审核" | "待发布" | "已发布" | "已下架";

export interface AdminContentRecord {
  id: string;
  title: string;
  category: string;
  status: AdminContentStatus;
  owner: string;
  updatedAt: string;
  summary: string;
  recommendation?: string;
}

export interface AdminProjectRecord extends AdminContentRecord {
  centers: string[];
  members: number;
  assets: number;
  result: string;
}

export interface AdminActivityRecord extends AdminContentRecord {
  schedule: string;
  capacity: number;
  registrations: number;
  deadline: string;
}

export interface AdminRecordFilters {
  query: string;
  status: string;
  category: string;
}

export interface AdminContentOverview {
  total: number;
  draft: number;
  inReview: number;
  pendingPublication: number;
  published: number;
  unpublished: number;
}

export const PORTAL_CONTENT_KIND_LABELS: Record<PortalContentKind, string> = {
  flash: "HSD 快讯",
  article: "新闻动态",
  notice: "通知公告"
};

export const PORTAL_CONTENT_STATUS_LABELS: Record<PortalContentStatus, AdminContentStatus> = {
  draft: "草稿",
  "in-review": "待审核",
  "pending-publication": "待发布",
  published: "已发布",
  unpublished: "已下架"
};

export function toAdminContentRecord(record: PortalContentRecord): AdminContentRecord {
  return {
    id: record.id,
    title: record.title,
    category: PORTAL_CONTENT_KIND_LABELS[record.kind],
    status: PORTAL_CONTENT_STATUS_LABELS[record.status],
    owner: record.createdBy,
    updatedAt: new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false
    }).format(new Date(record.updatedAt)),
    summary: record.summary
  };
}

export function getContentOverview(records: PortalContentRecord[]): AdminContentOverview {
  return records.reduce<AdminContentOverview>((overview, record) => {
    overview.total += 1;
    if (record.status === "draft") overview.draft += 1;
    if (record.status === "in-review") overview.inReview += 1;
    if (record.status === "pending-publication") overview.pendingPublication += 1;
    if (record.status === "published") overview.published += 1;
    if (record.status === "unpublished") overview.unpublished += 1;
    return overview;
  }, { total: 0, draft: 0, inReview: 0, pendingPublication: 0, published: 0, unpublished: 0 });
}

export interface HomepageSlot {
  id: PortalSlotId;
  label: string;
  capacity: number;
  description: string;
  allowedTypes: PortalCatalogEntityType[];
  sourceHint: string;
}

export const ADMIN_CONTENT_RECORDS: AdminContentRecord[] = [
  {
    id: "flash-recruitment-2026",
    title: "2026 秋季招新通道开放",
    category: "HSD 快讯",
    status: "已发布",
    owner: "新媒体中心",
    updatedAt: "2026-07-30 09:24",
    summary: "面向 26 级新同学开放在线报名与三志愿填写入口。",
    recommendation: "首页快讯"
  },
  {
    id: "news-harmony-salon",
    title: "鸿蒙技术沙龙开放预约",
    category: "新闻动态",
    status: "待审核",
    owner: "白泽开发中心",
    updatedAt: "2026-07-29 18:10",
    summary: "分享 HarmonyOS 原生应用开发流程与项目实践。"
  },
  {
    id: "notice-studio",
    title: "实训工作室暑期开放安排",
    category: "通知公告",
    status: "草稿",
    owner: "人才发展中心",
    updatedAt: "2026-07-29 14:32",
    summary: "说明暑期值班、设备借用与安全管理安排。"
  },
  {
    id: "help-result",
    title: "如何查询考核结果",
    category: "帮助文章",
    status: "已发布",
    owner: "联盟办公室",
    updatedAt: "2026-07-27 11:06",
    summary: "解释结果中心的登录方式、结果状态和负责人联系入口。"
  }
];

export const ADMIN_PROJECT_RECORDS: AdminProjectRecord[] = [
  {
    id: "smart-patrol",
    title: "智巡先锋",
    category: "科创竞赛",
    status: "已发布",
    owner: "项目组 · 李同学",
    updatedAt: "2026-07-30 08:40",
    summary: "结合嵌入式感知与智能识别的校园巡检方案。",
    recommendation: "首页精选项目 · 第 1 位",
    centers: ["白泽开发中心", "新媒体中心"],
    members: 8,
    assets: 23,
    result: "省级一等奖"
  },
  {
    id: "little-baiyun",
    title: "小白云",
    category: "校园服务",
    status: "待审核",
    owner: "项目组 · 陈同学",
    updatedAt: "2026-07-29 20:16",
    summary: "面向校园问答与办事指引的智能助手。",
    centers: ["白泽开发中心"],
    members: 6,
    assets: 14,
    result: "持续迭代"
  },
  {
    id: "media-map",
    title: "白云校园影像地图",
    category: "媒体创作",
    status: "草稿",
    owner: "新媒体中心",
    updatedAt: "2026-07-28 16:22",
    summary: "通过专题影像记录校园空间与社团技术活动。",
    centers: ["新媒体中心", "拓维策划中心"],
    members: 11,
    assets: 68,
    result: "内容筹备"
  }
];

export const ADMIN_ACTIVITY_RECORDS: AdminActivityRecord[] = [
  {
    id: "autumn-recruitment",
    title: "2026 秋季招新宣讲会",
    category: "招新活动",
    status: "已发布",
    owner: "拓维策划中心",
    updatedAt: "2026-07-30 09:10",
    summary: "介绍四大中心、培养路径和报名考核安排。",
    schedule: "2026-09-12 19:00",
    capacity: 180,
    registrations: 126,
    deadline: "2026-09-11 22:00"
  },
  {
    id: "harmony-workshop",
    title: "HarmonyOS 原生开发工作坊",
    category: "技术沙龙",
    status: "待审核",
    owner: "白泽开发中心",
    updatedAt: "2026-07-29 17:42",
    summary: "从 ArkTS 基础到完整应用构建的实践课程。",
    schedule: "2026-10-18 14:30",
    capacity: 60,
    registrations: 38,
    deadline: "2026-10-16 23:00"
  },
  {
    id: "photo-walk",
    title: "校园秋日摄影采风",
    category: "媒体活动",
    status: "草稿",
    owner: "新媒体中心",
    updatedAt: "2026-07-28 13:05",
    summary: "围绕校园建筑与人物故事开展摄影实训。",
    schedule: "2026-11-02 09:00",
    capacity: 30,
    registrations: 0,
    deadline: "2026-10-30 18:00"
  }
];

export const HOMEPAGE_SLOTS: HomepageSlot[] = [
  {
    id: "flash",
    label: "HSD 快讯",
    capacity: 1,
    description: "首页 Banner 下方的即时信息入口",
    allowedTypes: ["flash"],
    sourceHint: "来自已发布官网内容，可在官网内容中创建。"
  },
  {
    id: "news",
    label: "推荐新闻",
    capacity: 3,
    description: "近期新闻与联盟动态",
    allowedTypes: ["article", "notice"],
    sourceHint: "来自已发布新闻或公告，可在官网内容中创建。"
  },
  {
    id: "projects",
    label: "精选项目",
    capacity: 4,
    description: "优先展示成熟项目与竞赛成果",
    allowedTypes: ["project"],
    sourceHint: "来自项目管理中已发布的项目。"
  },
  {
    id: "activities",
    label: "近期活动",
    capacity: 3,
    description: "按时间顺序展示已发布活动",
    allowedTypes: ["activity"],
    sourceHint: "来自活动管理中已发布的活动；报名状态由活动管理控制。"
  },
  {
    id: "gallery",
    label: "媒体专题",
    capacity: 1,
    description: "使用一张主视觉承载专题入口",
    allowedTypes: ["gallery"],
    sourceHint: "来自画廊专题中已发布且有封面的专题。"
  },
  {
    id: "resources",
    label: "推荐资源",
    capacity: 3,
    description: "公开或成员可访问的学习资料",
    allowedTypes: ["resource"],
    sourceHint: "当前为系统预置资源，后续接入资源管理。"
  }
];

const CONTENT_TRANSITIONS: Record<AdminContentStatus, AdminContentStatus[]> = {
  草稿: ["待审核"],
  待审核: ["草稿", "待发布"],
  待发布: ["已发布"],
  已发布: ["已下架"],
  已下架: ["草稿"]
};

export function canTransitionContent(
  from: AdminContentStatus,
  to: AdminContentStatus
) {
  return CONTENT_TRANSITIONS[from].includes(to);
}

export function filterAdminRecords<T extends AdminContentRecord>(
  records: T[],
  filters: AdminRecordFilters
) {
  const query = filters.query.trim().toLocaleLowerCase();
  return records.filter((record) => {
    const matchesQuery =
      !query ||
      [record.title, record.summary, record.owner]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    const matchesStatus =
      !filters.status ||
      filters.status.startsWith("全部") ||
      record.status === filters.status;
    const matchesCategory =
      !filters.category ||
      filters.category.startsWith("全部") ||
      record.category === filters.category;
    return matchesQuery && matchesStatus && matchesCategory;
  });
}
