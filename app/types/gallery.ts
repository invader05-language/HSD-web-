import type { GalleryAsset } from "../data/gallery";

export const GALLERY_CATEGORY_CODES = ["event_documentary", "visual_creation", "video_work", "people_stories"] as const;
export type GalleryCategoryCode = (typeof GALLERY_CATEGORY_CODES)[number];
export type GalleryLegacyCategory = "活动摄影" | "海报设计" | "短视频" | "人物专访";
export type GalleryCategory = GalleryCategoryCode | GalleryLegacyCategory;

export function normalizeGalleryCategory(value: unknown): GalleryCategoryCode {
  if (value === "visual_creation" || value === "海报设计") return "visual_creation";
  if (value === "video_work" || value === "短视频") return "video_work";
  if (value === "people_stories" || value === "人物专访") return "people_stories";
  return "event_documentary";
}

export function galleryCategoryLabel(value: GalleryCategory): string {
  switch (normalizeGalleryCategory(value)) {
    case "visual_creation": return "视觉创作";
    case "video_work": return "视频作品";
    case "people_stories": return "人物风采";
    default: return "活动纪实";
  }
}

export interface GalleryDraftInput {
  slug?: string;
  title: string;
  category: GalleryCategory;
  year: string;
  summary: string;
  team: string;
  ownerCenterId: string;
  /** Independent cover attachment; legacy callers may omit it and are normalized at draft creation. */
  cover?: GalleryAsset | null;
  assets: GalleryAsset[];
}

export interface PublishedGalleryAlbum extends Omit<GalleryDraftInput, "team"> {
  id: string;
  slug: string;
  to: string;
  publishedAt: string;
  revision: number;
  assets: GalleryAsset[];
  cover: GalleryAsset | null;
}

export interface ManagedGalleryAlbum extends PublishedGalleryAlbum {
  team: string;
  status: "draft" | "published" | "unpublished";
  publishedState: "published" | "unpublished";
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedSnapshot?: PublishedGalleryAlbum;
}
