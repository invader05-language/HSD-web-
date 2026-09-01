export const CONTENT_MEDIA_ROLES = ["cover", "detail"] as const;
export type ContentMediaRole = (typeof CONTENT_MEDIA_ROLES)[number];

export const CONTENT_MEDIA_KINDS = ["image", "video"] as const;
export type ContentMediaKind = (typeof CONTENT_MEDIA_KINDS)[number];

export const CONTENT_MEDIA_STATUSES = ["uploading", "processing", "ready", "failed"] as const;
export type ContentMediaStatus = (typeof CONTENT_MEDIA_STATUSES)[number];

export type ContentMediaAspect = "landscape" | "portrait" | "wide";

export interface ContentMediaAttachment {
  id: string;
  /** ID-only record returned by an authenticated admin aggregate response. */
  serverOwned?: boolean;
  /** Server optimistic-concurrency version for metadata updates. */
  version?: number;
  mediaId?: string;
  /** Client-only bridge for data created before direct uploads existed. */
  legacyAssetId?: string;
  localBlobId?: string;
  role: ContentMediaRole;
  kind: ContentMediaKind;
  title: string;
  caption: string;
  /** Accessibility metadata used by content, portal, project, and resource media. Activity/gallery media omit it. */
  alt?: string;
  aspect: ContentMediaAspect;
  sortOrder: number;
  url?: string;
  thumbnailUrl?: string;
  status: ContentMediaStatus;
  errorMessage?: string;
}
