import { PUBLIC_RESOURCES } from "../data/resources";
import type { PortalCatalogItem } from "../types/portal-content";
import { useActivitiesStore } from "../stores/activities";
import { useGalleryStore } from "../stores/gallery";
import { useProjectsStore } from "../stores/projects";
import { usePortalContentStore } from "../stores/portal-content";
import { useResourcesStore } from "../stores/resources";

const toIso = (date: string) => `${date}T00:00:00.000Z`;

export function usePortalCatalog(runtime?: { useMockApi: boolean }): PortalCatalogItem[] {
  const activitiesStore = useActivitiesStore();
  const galleryStore = useGalleryStore();
  const projectsStore = useProjectsStore();
  const resourcesStore = useResourcesStore();
  if (runtime?.useMockApi === false) {
    if (!projectsStore.apiModeActive) projectsStore.activateApiMode();
    if (!activitiesStore.apiModeActive) activitiesStore.activateApiMode();
    if (!galleryStore.apiModeActive) galleryStore.activateApiMode();
    if (!resourcesStore.apiModeActive) resourcesStore.activateApiMode();
  }
  const productionCatalog = runtime?.useMockApi === false
    || projectsStore.apiModeActive
    || activitiesStore.apiModeActive
    || galleryStore.apiModeActive
    || resourcesStore.apiModeActive;
  if (import.meta.client) {
    if (!productionCatalog) {
      activitiesStore.hydrate();
      galleryStore.hydrate();
      projectsStore.hydrate();
    }
  }
  const content = productionCatalog ? [] : usePortalContentStore().getPublicRecords().map((record): PortalCatalogItem => ({
    entityType: record.kind,
    sourceId: record.id,
    title: record.title,
    summary: record.summary,
    to: record.kind === "flash" ? record.target.value : `/updates/${encodeURIComponent(record.slug)}`,
    publishedAt: record.publishedAt,
    eligibleSlots: record.kind === "flash" ? ["flash"] : ["news"],
    available: record.sourceValidity === "valid" && (!record.expiresAt || Date.parse(record.expiresAt) > Date.now()),
  }));

  const projects = projectsStore.getPublicProjects().map((project): PortalCatalogItem => ({
    entityType: "project",
    sourceId: project.slug,
    title: project.title,
    summary: project.description,
    to: `/projects/${project.slug}`,
    publishedAt: project.publishedAt,
    media: project.cover ?? undefined,
    eligibleSlots: ["projects"],
    available: true,
  }));
  const activities = activitiesStore.getPublicActivities().map((activity): PortalCatalogItem => ({
    entityType: "activity",
    sourceId: activity.slug,
    title: activity.title,
    summary: activity.summary,
    to: `/activities/${activity.slug}`,
    publishedAt: activity.publishedAt,
    eventAt: toIso(activity.date),
    media: activity.cover ?? undefined,
    eligibleSlots: ["activities"],
    // The portal slot represents published activity content. Registration state
    // controls the detail-page CTA, but closed/upcoming activities can still be
    // shown and selected as recent activity records.
    available: true,
  }));
  const gallery = galleryStore.getPublicAlbums().map((album): PortalCatalogItem => ({
    entityType: "gallery",
    sourceId: album.slug,
    title: album.title,
    summary: album.summary,
    to: album.to,
    publishedAt: album.publishedAt,
    media: album.assets
      .slice()
      .filter((asset) => (asset.status ?? "ready") === "ready")
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
      .map((asset) => ({
        id: asset.id,
        legacyAssetId: asset.assetId,
        localBlobId: asset.localBlobId,
        role: "detail" as const,
        kind: asset.kind ?? "image",
        title: asset.title,
        caption: asset.caption,
        aspect: asset.aspect,
        sortOrder: asset.sortOrder ?? 0,
        url: asset.imageUrl,
        thumbnailUrl: asset.thumbnailUrl,
        status: asset.status ?? "ready",
        errorMessage: asset.errorMessage,
      }))[0],
    eligibleSlots: ["gallery"],
    available: album.assets.length > 0 && album.assets.some((asset) => (asset.status ?? "ready") === "ready"),
  }));
  const resources = productionCatalog
    ? resourcesStore.items.map((resource): PortalCatalogItem => ({
      entityType: "resource",
      sourceId: resource.slug,
      title: resource.title,
      summary: resource.summary,
      to: `/resources/${resource.slug}`,
      publishedAt: "1970-01-01T00:00:00.000Z",
      eligibleSlots: ["resources"],
      available: resource.access === "public",
    }))
    : PUBLIC_RESOURCES.map((resource): PortalCatalogItem => ({
    entityType: "resource",
    sourceId: resource.slug,
    title: resource.title,
    summary: resource.summary,
    to: resource.to,
    publishedAt: toIso(resource.updatedAt),
    eligibleSlots: ["resources"],
    available: resource.status !== "offline",
    }));
  return [...content, ...projects, ...activities, ...gallery, ...resources];
}
