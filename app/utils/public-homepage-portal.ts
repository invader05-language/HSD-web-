import type { PublicPortalResponseDto, PortalResolvedEntryResponseDto } from "../../packages/api-client/src";
import type { ContentMediaAttachment } from "../types/content-media";
import type { PortalCatalogItem, PortalSlotId } from "../types/portal-content";
import type { PortalVisualConfig } from "../types/portal-config";

export interface PublicHomepageProjection {
  publishedAt: string | null;
  slots: Record<PortalSlotId, PortalCatalogItem[]>;
  visuals: Record<string, unknown>;
}

const emptySlots = (): Record<PortalSlotId, PortalCatalogItem[]> => ({
  flash: [], news: [], projects: [], activities: [], gallery: [], resources: [],
});

/** Convert the public API's resolved visual URL into the shared media shape. */
export function resolvePublicPortalVisual(
  slot: "home" | "join",
  value: unknown,
): Pick<PortalVisualConfig, "alt" | "media"> {
  const visual = asRecord(value);
  if (!visual || typeof visual.url !== "string" || typeof visual.alt !== "string") return { alt: "" };
  return {
    alt: visual.alt,
    media: {
      id: `public-portal-visual-${slot}`,
      role: "cover",
      kind: "image",
      title: visual.alt,
      caption: "",
      alt: visual.alt,
      aspect: "wide",
      sortOrder: 0,
      url: visual.url,
      ...(typeof visual.thumbnailUrl === "string" ? { thumbnailUrl: visual.thumbnailUrl } : {}),
      status: "ready",
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function mediaFrom(value: unknown, role: "cover" | "detail"): ContentMediaAttachment | undefined {
  const media = asRecord(value);
  if (!media || typeof media.url !== "string") return undefined;
  return {
    id: typeof media.id === "string" ? media.id : `public-${role}-${media.url}`,
    role,
    kind: media.kind === "video" ? "video" : "image",
    title: typeof media.title === "string" ? media.title : "",
    caption: typeof media.caption === "string" ? media.caption : "",
    alt: typeof media.alt === "string" ? media.alt : "",
    aspect: media.aspect === "wide" || media.aspect === "portrait" ? media.aspect : "landscape",
    sortOrder: typeof media.sortOrder === "number" ? media.sortOrder : 0,
    url: media.url,
    thumbnailUrl: typeof media.thumbnailUrl === "string" ? media.thumbnailUrl : undefined,
    status: "ready",
  };
}

function dateAt(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? fallback : date.toISOString();
}

function entryToCatalog(entry: PortalResolvedEntryResponseDto, publishedAt: string): PortalCatalogItem | undefined {
  const content = asRecord(entry.content);
  if (!content || typeof content.slug !== "string" || typeof content.title !== "string") return undefined;
  const slot = entry.slot as PortalSlotId;
  const entityType: PortalCatalogItem["entityType"] = slot === "news"
    ? (content.kind === "notice" ? "notice" : "article")
    : slot === "flash" ? "flash" : slot === "projects" ? "project" : slot === "activities" ? "activity" : slot === "gallery" ? "gallery" : "resource";
  const summary = typeof content.summary === "string" ? content.summary : typeof content.description === "string" ? content.description : "";
  const to = entityType === "flash"
    ? `/updates/${encodeURIComponent(content.slug)}`
    : entityType === "article" || entityType === "notice" ? `/updates/${encodeURIComponent(content.slug)}`
      : `/${entityType === "project" ? "projects" : entityType === "activity" ? "activities" : entityType === "gallery" ? "gallery" : "resources"}/${encodeURIComponent(content.slug)}`;
  const media = mediaFrom(content.cover, "cover");
  return {
    entityType,
    sourceId: content.slug,
    title: content.title,
    summary,
    to,
    publishedAt: typeof content.publishedAt === "string" ? content.publishedAt : publishedAt,
    ...(entityType === "activity" ? { eventAt: dateAt(content.date, publishedAt) } : {}),
    ...(media ? { media } : {}),
    eligibleSlots: [slot === "news" ? "news" : slot],
    available: content.available !== false,
  };
}

export function projectPublicPortal(response: PublicPortalResponseDto): PublicHomepageProjection {
  const publishedAt = response.publishedAt ?? "1970-01-01T00:00:00.000Z";
  const slots = emptySlots();
  for (const entry of response.entries.slice().sort((left, right) => left.position - right.position)) {
    const item = entryToCatalog(entry, publishedAt);
    if (item) slots[entry.slot === "news" ? "news" : entry.slot].push(item);
  }
  return { publishedAt: response.publishedAt, slots, visuals: response.visuals ?? {} };
}
