import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePortalCatalog } from "../../app/composables/usePortalCatalog";
import { useProjectsStore } from "../../app/stores/projects";
import { useActivitiesStore } from "../../app/stores/activities";
import { useGalleryStore } from "../../app/stores/gallery";
import { useResourcesStore } from "../../app/stores/resources";

describe("production portal catalog", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("uses API-backed typed candidates and excludes stale mock catalog data", async () => {
    await useProjectsStore().refreshPublicFromApi({ projects: { listPublic: async () => ({ items: [{
      slug: "api-project", title: "API project", category: "AI", year: "2026", description: "Project summary",
      achievement: "Achievement", projectStage: "Published", challenge: "Challenge", solution: "Solution", technologies: ["TypeScript"], memberCount: 4,
      cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Project cover", aspect: "wide", sortOrder: 0, url: "/project-cover" }, details: [], available: true,
    }] }) } });
    await useActivitiesStore().refreshPublicFromApi({ activities: { listPublic: async () => ({ items: [{
      slug: "api-activity", title: "API activity", type: "Workshop", date: "2026-09-01", time: "09:00", location: "Room", summary: "Activity summary", content: "Details", agenda: ["Start"], registrationEndAt: "2026-08-31T00:00:00.000Z",
      cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Activity cover", aspect: "wide", sortOrder: 0, url: "/activity-cover" }, details: [], available: true, registrationOpen: false,
    }] }) } });
    await useGalleryStore().refreshPublicFromApi({ galleries: { listPublic: async () => ({ items: [{
      slug: "api-gallery", title: "API gallery", description: "Gallery summary", cover: { kind: "image", role: "cover", title: "Frame", caption: "", alt: "Gallery frame", aspect: "wide", sortOrder: 0, url: "/gallery-cover", thumbnailUrl: "/gallery-cover-thumb" }, details: [{ kind: "image", role: "detail", title: "Frame", caption: "", alt: "Gallery frame", aspect: "wide", sortOrder: 0, url: "/gallery-detail", thumbnailUrl: "/gallery-detail-thumb" }], available: true,
    }] }) } });
    await useResourcesStore().refreshPublicFromApi({
      resources: { listPublic: async () => ({ items: [
        { slug: "api-resource", title: "API resource", summary: "Resource summary", kind: "article", format: "web", versionLabel: "v1.0", access: "public" },
        { slug: "member-resource", title: "Member resource", summary: "Member summary", kind: "article", format: "web", versionLabel: "v1.0", access: "member" },
      ] }) },
      resource: async () => { throw new Error("not used"); }, resourceVersion: async () => { throw new Error("not used"); },
    });

    const catalog = usePortalCatalog();
    expect(useGalleryStore().getPublicBySlug("api-gallery")?.cover).toMatchObject({ imageUrl: "/gallery-cover", thumbnailUrl: "/gallery-cover-thumb" });
    expect(useGalleryStore().getPublicBySlug("api-gallery")?.assets[0]).toMatchObject({ imageUrl: "/gallery-detail", thumbnailUrl: "/gallery-detail-thumb" });
    expect(catalog).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: "project", sourceId: "api-project", eligibleSlots: ["projects"], available: true }),
      expect.objectContaining({ entityType: "activity", sourceId: "api-activity", eligibleSlots: ["activities"], available: true }),
      expect.objectContaining({ entityType: "gallery", sourceId: "api-gallery", eligibleSlots: ["gallery"], available: true }),
      expect.objectContaining({ entityType: "resource", sourceId: "api-resource", eligibleSlots: ["resources"], available: true }),
      expect.objectContaining({ entityType: "resource", sourceId: "member-resource", eligibleSlots: ["resources"], available: false }),
    ]));
    expect(catalog.map((item) => item.sourceId)).not.toEqual(expect.arrayContaining(["zhixun-xianfeng", "harmonyos-getting-started"]));
  });
});
