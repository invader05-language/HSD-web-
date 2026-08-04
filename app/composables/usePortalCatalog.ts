import { ACTIVITY_DETAILS } from "../data/activities";
import { GALLERY_ALBUMS } from "../data/gallery";
import { PROJECT_DETAILS } from "../data/projects";
import { PUBLIC_RESOURCES } from "../data/resources";
import type { PortalCatalogItem } from "../types/portal-content";
import { usePortalContentStore } from "../stores/portal-content";

const toIso = (date: string) => `${date}T00:00:00.000Z`;

export function usePortalCatalog(): PortalCatalogItem[] {
  const content = usePortalContentStore().publicRecords.map((record): PortalCatalogItem => ({
    entityType: record.kind,
    sourceId: record.id,
    title: record.title,
    summary: record.summary,
    to: record.target.value,
    publishedAt: record.publishedAt,
    eligibleSlots: record.kind === "flash" ? ["flash"] : ["news"],
    available: record.sourceValidity === "valid" && (!record.expiresAt || Date.parse(record.expiresAt) > Date.now()),
  }));

  const projects = PROJECT_DETAILS.map((project): PortalCatalogItem => ({
    entityType: "project",
    sourceId: project.slug,
    title: project.title,
    summary: project.description,
    to: `/projects/${project.slug}`,
    publishedAt: "2026-07-30T00:00:00.000Z",
    eligibleSlots: ["projects"],
    available: true,
  }));
  const activities = ACTIVITY_DETAILS.map((activity): PortalCatalogItem => ({
    entityType: "activity",
    sourceId: activity.slug,
    title: activity.title,
    summary: activity.summary,
    to: `/activities/${activity.slug}`,
    publishedAt: toIso(activity.date),
    eligibleSlots: ["activities"],
    available: activity.status === "报名中" || activity.status === "即将开放",
  }));
  const gallery = GALLERY_ALBUMS.map((album): PortalCatalogItem => ({
    entityType: "gallery",
    sourceId: album.slug,
    title: album.title,
    summary: album.summary,
    to: album.to,
    publishedAt: `${album.year}-01-01T00:00:00.000Z`,
    eligibleSlots: ["gallery"],
    available: true,
  }));
  const resources = PUBLIC_RESOURCES.map((resource): PortalCatalogItem => ({
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
