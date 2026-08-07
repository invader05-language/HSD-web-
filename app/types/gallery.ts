import type { GalleryAsset } from "../data/gallery";

export type GalleryCategory = "活动摄影" | "海报设计" | "短视频" | "人物专访";

export interface GalleryDraftInput {
  slug?: string;
  title: string;
  category: GalleryCategory;
  year: string;
  summary: string;
  team: string;
  ownerCenterId: string;
  assets: GalleryAsset[];
}

export interface PublishedGalleryAlbum extends GalleryDraftInput {
  id: string;
  slug: string;
  to: string;
  publishedAt: string;
  revision: number;
  assets: GalleryAsset[];
}

export interface ManagedGalleryAlbum extends PublishedGalleryAlbum {
  status: "draft" | "published" | "unpublished";
  publishedState: "published" | "unpublished";
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedSnapshot?: PublishedGalleryAlbum;
}
