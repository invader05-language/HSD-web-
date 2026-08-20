import type { PortalVisualConfig } from "../types/portal-config";
import { resolvePortalAssetSource } from "./portal-assets";

export type PageVisualId = "home" | "about" | "centers" | "projects" | "activities" | "gallery" | "resources" | "join";

export const PAGE_VISUALS = {
  home: { assetId: "asset-home-poster", alt: "白云 HSD 开发者部落主题海报", supportingText: "鸿蒙启航主题海报" },
  about: { assetId: "asset-about-team", alt: "白云 HSD 开发者部落成员集体合影", supportingText: "部落成员年度合影" },
  centers: { assetId: "asset-centers-baize", alt: "白泽开发中心成员合影", supportingText: "中心成员协作合影" },
  projects: { assetId: "asset-projects-baize", alt: "白泽开发中心项目团队合影", supportingText: "项目团队成果合影" },
  activities: { assetId: "asset-activities-programmer-day", alt: "1024 程序员节活动现场", supportingText: "程序员节活动记录" },
  gallery: { assetId: "asset-gallery-transition", alt: "HSD 换届大会现场合影", supportingText: "换届大会影像记录" },
  resources: { assetId: "asset-resources-programmer-day", alt: "1024 程序员节分享活动现场", supportingText: "技术分享与学习现场" },
  join: { assetId: "asset-join-orientation", alt: "白云 HSD 迎新活动现场", supportingText: "迎新与招募活动记录" },
} as const satisfies Record<PageVisualId, PortalVisualConfig>;

export function resolvePageVisual(configured: PortalVisualConfig, page: PageVisualId): PortalVisualConfig {
  return configured.media || resolvePortalAssetSource(configured.assetId) ? configured : PAGE_VISUALS[page];
}
