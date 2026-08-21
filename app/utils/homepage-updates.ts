import type { PortalCatalogItem } from "../types/portal-content";
import type { ContentMediaAttachment } from "../types/content-media";

type PublicActivityForHomepage = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  date: string;
  publishedAt: string;
  cover?: ContentMediaAttachment | null;
};

const activityTimestamp = (activity: PublicActivityForHomepage) => (
  activity.publishedAt || `${activity.date}T00:00:00.000Z`
);

export function resolveHomepageUpdates(
  configuredNews: readonly PortalCatalogItem[],
  publicActivities: readonly PublicActivityForHomepage[],
  useProductionApi: boolean,
): PortalCatalogItem[] {
  if (!useProductionApi) return [...configuredNews];

  return publicActivities
    .slice()
    .sort((left, right) => Date.parse(activityTimestamp(right)) - Date.parse(activityTimestamp(left)))
    .slice(0, 3)
    .map((activity) => ({
      entityType: "activity",
      sourceId: activity.slug || activity.id,
      title: activity.title,
      summary: activity.summary,
      to: `/activities/${activity.slug}`,
      publishedAt: activityTimestamp(activity),
      eventAt: `${activity.date}T00:00:00.000Z`,
      ...(activity.cover ? { media: activity.cover } : {}),
      eligibleSlots: ["activities"],
      available: true,
    }));
}
