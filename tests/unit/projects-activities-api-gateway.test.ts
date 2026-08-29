import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContentGatewayForRuntime } from "../../app/composables/useContentGateway";
import { createApiContentGateway } from "../../app/services/content/api-content.gateway";
import { useProjectsStore } from "../../app/stores/projects";
import { useActivitiesStore } from "../../app/stores/activities";
import { useGalleryStore, GALLERY_STORAGE_KEY } from "../../app/stores/gallery";
import { useSessionStore } from "../../app/stores/session";

const projectRecord = { id: "project-api-1", centerId: "baize-development", slug: "api-project", status: "draft", version: 3, publishedAt: null, title: "API project", category: "AI", year: "2026", description: "Description", achievement: "Achievement", projectStage: "Draft", challenge: "Challenge", solution: "Solution", technologies: ["TypeScript"], memberCount: 1, coverAttachmentId: "project-cover-1", detailAttachmentIds: ["project-detail-1", "project-detail-2"], revisionNumber: 1 };
const activityRecord = { id: "activity-api-1", centerId: "baize-development", slug: "api-activity", status: "published", version: 4, registrationOpen: false, publishedAt: "2026-08-10T00:00:00.000Z", title: "API activity", type: "Workshop", date: "2026-09-01", time: "09:00", location: "Room 1", summary: "Summary", content: "Content", agenda: ["Start"], registrationEndAt: "2026-08-31T00:00:00.000Z", coverAttachmentId: "activity-cover-1", detailAttachmentIds: ["activity-detail-1", "activity-detail-2"], revisionNumber: 1 };

describe("project, activity, and registration API gateway", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });
  it("uses the generated public project route and never hides an API failure", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      code: "PROJECT_NOT_FOUND", message: "Project not found", requestId: "project-read-1",
    }), { status: 404, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiContentGateway({ apiBase: "https://api.example.test/", fetcher, createRequestId: () => "request-1" });

    await expect(gateway.project("project/one")).rejects.toMatchObject({ status: 404, code: "PROJECT_NOT_FOUND", requestId: "project-read-1" });
    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/public/projects/project%2Fone", {
      method: "GET", credentials: "include", headers: { "X-Request-ID": "request-1" },
    });
  });

  it("keeps mock fixtures available only when the public runtime flag explicitly enables them", () => {
    expect(createContentGatewayForRuntime({ apiBase: "https://api.example.test", useMockApi: true })).toBeUndefined();
    expect(createContentGatewayForRuntime({ apiBase: "https://api.example.test", useMockApi: false })).toBeDefined();
  });

  it("does not resend a published project's slug when updating its Chinese title", async () => {
    const projects = useProjectsStore();
    const record = {
      ...projectRecord,
      id: "project-chinese-title",
      centerId: "11111111-1111-4111-8111-111111111111",
      slug: "zhixun-xianfeng",
      title: "智巡先锋",
      category: "SMART_HARDWARE",
      memberNames: ["成员甲"],
      members: [{ name: "成员甲" }],
    };
    const api = {
      projects: {
        listAdmin: vi.fn().mockResolvedValue({ items: [record] }),
        update: vi.fn().mockResolvedValue({ ...record, version: 4, title: "智巡先锋（更新）" }),
      },
    };
    await projects.refreshFromApi(api);

    await projects.updateDraftFromApi(api, record.id, {
      ...projects.getById(record.id)!,
      title: "智巡先锋（更新）",
    });

    expect(api.projects.update).toHaveBeenCalledWith(record.id, expect.objectContaining({
      expectedVersion: 3,
      title: "智巡先锋（更新）",
    }));
    expect(api.projects.update.mock.calls[0]?.[1]).not.toHaveProperty("slug");
  });

  it("generates an ASCII slug when creating a project with a Chinese title", async () => {
    const projects = useProjectsStore();
    const api = {
      projects: {
        create: vi.fn().mockResolvedValue({
          ...projectRecord,
          id: "project-new-chinese",
          centerId: "11111111-1111-4111-8111-111111111111",
          slug: "project-123",
          title: "中文项目",
          category: "SMART_HARDWARE",
          memberNames: ["成员甲"],
          members: [{ name: "成员甲" }],
        }),
      },
    };

    await projects.createDraftFromApi(api, {
      title: "中文项目",
      category: "SMART_HARDWARE",
      year: "2026",
      description: "项目简介",
      achievement: "项目成果",
      projectStage: "开发中",
      challenge: "项目问题",
      solution: "项目方案",
      memberPersonIds: [],
      memberNames: ["成员甲"],
      members: [{ name: "成员甲" }],
      displayOrder: 1,
      ownerCenterId: "11111111-1111-4111-8111-111111111111",
      cover: null,
      details: [],
    });

    expect(api.projects.create.mock.calls[0]?.[0].slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("preserves field-level API validation errors", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      code: "VALIDATION_FAILED",
      message: "字段校验失败",
      requestId: "project-validation-1",
      fieldErrors: { slug: "项目地址只能使用英文、数字和连字符" },
    }), { status: 400, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiContentGateway({ apiBase: "https://api.example.test", fetcher, readCookie: () => "csrf" });

    await expect(gateway.projects.update("project-1", { expectedVersion: 3, title: "项目" })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      fieldErrors: { slug: "项目地址只能使用英文、数字和连字符" },
      requestId: "project-validation-1",
    });
  });

  it("exposes gallery reads through the generated production gateway instead of mock fixtures", () => {
    const gateway = createApiContentGateway({ apiBase: "https://api.example.test" });
    expect(gateway.galleries).toBeDefined();
  });

  it("uses the generated public gallery route and preserves the API result shape", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      items: [{ slug: "api-gallery", title: "API gallery", category: "event_documentary", year: "2026", description: "API description", cover: { kind: "image", role: "detail", title: "Frame", caption: "", alt: "API frame", aspect: "wide", sortOrder: 0, url: "/api/v1/public/media/frame" }, details: [{ kind: "image", role: "detail", title: "Frame", caption: "", alt: "API frame", aspect: "wide", sortOrder: 0, url: "/api/v1/public/media/frame" }], available: true }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiContentGateway({ apiBase: "https://api.example.test/", fetcher, createRequestId: () => "gallery-request-1" });

    await expect(gateway.galleries.listPublic()).resolves.toMatchObject({ items: [{ slug: "api-gallery", title: "API gallery" }] });
    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/public/galleries", {
      method: "GET", credentials: "include", headers: { "X-Request-ID": "gallery-request-1" },
    });
  });

  it("keeps gallery data empty after a production API failure instead of restoring persisted fixtures", async () => {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify({ version: 2, albums: [{ id: "persisted", slug: "persisted", title: "Persisted", category: "活动摄影", year: "2026", summary: "Persisted", team: "Media", ownerCenterId: "center", assets: [], to: "/gallery/persisted", publishedAt: "2026-01-01T00:00:00.000Z", revision: 1, status: "published", publishedState: "published", version: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", createdBy: "admin" }] }));
    const store = useGalleryStore();

    await store.refreshPublicFromApi({ galleries: { listPublic: vi.fn().mockRejectedValue(new Error("GALLERY_API_DOWN")) } });

    expect(store.apiModeActive).toBe(true);
    expect(store.albums).toEqual([]);
    expect(store.apiError).toMatchObject({ message: "GALLERY_API_DOWN" });
  });

  it("loads Gallery administration from the production API instead of persisted albums", async () => {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify({ version: 2, albums: [{ id: "persisted", slug: "persisted", title: "Persisted", category: "活动摄影", year: "2026", summary: "Persisted", team: "Media", ownerCenterId: "center", assets: [], to: "/gallery/persisted", publishedAt: "2026-01-01T00:00:00.000Z", revision: 1, status: "published", publishedState: "published", version: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", createdBy: "admin" }] }));
    const store = useGalleryStore();

    await store.refreshFromApi({ galleries: { listAdmin: vi.fn().mockResolvedValue({ items: [{ id: "gallery-admin-1", centerId: "center-api", slug: "api-gallery", status: "draft", version: 3, publishedAt: null, title: "API gallery", description: "API description", team: "Internal team", detailAttachmentIds: ["detail-1"], revisionNumber: 2 }] }) } });

    expect(store.apiModeActive).toBe(true);
    expect(store.albums).toHaveLength(1);
    expect(store.getById("gallery-admin-1")).toMatchObject({ title: "API gallery", summary: "API description", team: "Internal team", ownerCenterId: "center-api" });
  });

  it("uses API center UUIDs and organization center options in Gallery administration", () => {
    const galleryPage = readFileSync(resolve("app/pages/admin/gallery.vue"), "utf8");
    const galleryEditor = readFileSync(resolve("app/components/admin/GalleryEditor.vue"), "utf8");

    expect(galleryPage).toContain("session.currentAccount?.adminCenterId");
    expect(galleryPage).not.toContain("getAdminCenterScope");
    expect(galleryEditor).toContain("useOrganizationGateway");
    expect(galleryEditor).toContain("organizationGateway.listCenters()");
  });

  it("keeps the stored Gallery slug when a published title is updated through the API", async () => {
    const centerId = "11111111-1111-4111-8111-111111111111";
    const record = { id: "gallery-api-1", centerId, slug: "published-gallery", status: "published", version: 7, publishedAt: "2026-08-10T00:00:00.000Z", title: "Original title", description: "Description", team: "Internal team", detailAttachmentIds: ["gallery-detail-1"], revisionNumber: 2 };
    const store = useGalleryStore();
    const api = { galleries: { listAdmin: vi.fn().mockResolvedValue({ items: [record] }), update: vi.fn().mockResolvedValue({ ...record, title: "Renamed title", version: 8 }) } };
    await store.refreshFromApi(api);

    const current = store.getById(record.id)!;
    const { slug: _storedSlug, ...editorPayload } = current;
    await store.updateDraftFromApi(api, record.id, { ...editorPayload, title: "Renamed title" });

    expect(api.galleries.update).toHaveBeenCalledWith(record.id, expect.objectContaining({
      expectedVersion: 7,
      slug: "published-gallery",
      title: "Renamed title",
    }));
  });

  it("keeps production project data empty after an API failure instead of restoring persisted fixtures", async () => {
    localStorage.setItem("baiyun-hsd.projects", JSON.stringify({ version: 2, projects: [{ id: "persisted", slug: "persisted", title: "Persisted", ownerCenterId: "center", publicationStatus: "published" }] }));
    const store = useProjectsStore();
    const api = { projects: { listAdmin: vi.fn().mockRejectedValue(new Error("PROJECT_API_DOWN")) } };

    await store.refreshFromApi(api);

    expect(store.apiModeActive).toBe(true);
    expect(store.projects).toEqual([]);
    expect(store.apiError).toMatchObject({ message: "PROJECT_API_DOWN" });
  });

  it("loads direct public project and activity details with safe detail media projections", async () => {
    const projects = useProjectsStore();
    const activities = useActivitiesStore();
    const project = {
      slug: "api-only-project", title: "API-only project", category: "AI", year: "2026",
      description: "Description", achievement: "Achievement", projectStage: "Pilot",
      challenge: "Challenge", solution: "Solution", technologies: ["TypeScript"], memberCount: 3,
      cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Project cover", aspect: "wide", sortOrder: 0, url: "/api/v1/public/media/project-cover" },
      details: [{ kind: "video", role: "detail", title: "Demo", caption: "Safe caption", alt: "Project demo", aspect: "landscape", sortOrder: 0, url: "/api/v1/public/media/project-detail" }],
      available: true,
    };
    const activity = {
      slug: "api-only-activity", title: "API-only activity", type: "Workshop", date: "2026-09-01", time: "09:00",
      location: "Room 1", summary: "Summary", content: "Content", agenda: ["Start"], registrationEndAt: "2026-08-31T00:00:00.000Z",
      cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Activity cover", aspect: "wide", sortOrder: 0, url: "/api/v1/public/media/activity-cover" },
      details: [{ kind: "image", role: "detail", title: "Photo", caption: "Safe caption", alt: "Activity photo", aspect: "landscape", sortOrder: 0, url: "/api/v1/public/media/activity-detail" }],
      available: true, registrationOpen: false,
    };
    const gateway = { project: vi.fn().mockResolvedValue(project), activity: vi.fn().mockResolvedValue(activity) };

    await projects.refreshPublicDetailFromApi(gateway, project.slug);
    await activities.refreshPublicDetailFromApi(gateway, activity.slug);

    expect(projects.getPublicBySlug(project.slug)?.details).toEqual([
      expect.objectContaining({ kind: "video", url: "/api/v1/public/media/project-detail", alt: "Project demo", caption: "Safe caption", status: "ready" }),
    ]);
    expect(activities.getPublicBySlug(activity.slug)?.details).toEqual([
      expect.objectContaining({ kind: "image", url: "/api/v1/public/media/activity-detail", alt: "Activity photo", caption: "Safe caption", status: "ready" }),
    ]);
    expect(JSON.stringify(projects.getPublicBySlug(project.slug))).not.toMatch(/attachmentId|objectKey/);
    expect(JSON.stringify(activities.getPublicBySlug(activity.slug))).not.toMatch(/attachmentId|objectKey/);
  });

  it("keeps the public project list intact when a detail request resolves", async () => {
    const store = useProjectsStore();
    const list = [
      { ...projectRecord, id: "project-list-1", slug: "list-one", status: "published", publishedAt: "2026-08-10T00:00:00.000Z" },
      { ...projectRecord, id: "project-list-2", slug: "list-two", status: "published", publishedAt: "2026-08-11T00:00:00.000Z" },
    ];
    const detail = {
      slug: "list-one", title: "List one", category: "AI", year: "2026", description: "Description",
      achievement: "Achievement", projectStage: "Published", challenge: "Challenge", solution: "Solution", memberCount: 1,
      cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Cover", aspect: "wide", sortOrder: 0, url: "/cover" },
      details: [], available: true,
    };

    await store.refreshPublicFromApi({ projects: { listPublic: vi.fn().mockResolvedValue({ items: list }) } });
    await store.refreshPublicDetailFromApi({ project: vi.fn().mockResolvedValue(detail) }, "list-one");

    expect(store.getPublicProjects().map((item) => item.slug)).toEqual(["list-one", "list-two"]);
    expect(store.getPublicBySlug("list-one")).toMatchObject({ title: "List one" });
  });

  it("keeps the public gallery list intact when a detail request resolves", async () => {
    const store = useGalleryStore();
    const list = [
      { slug: "gallery-one", title: "Gallery one", description: "Summary", cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Cover", aspect: "wide", sortOrder: 0, url: "/cover-one" }, details: [], available: true },
      { slug: "gallery-two", title: "Gallery two", description: "Summary", cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Cover", aspect: "wide", sortOrder: 0, url: "/cover-two" }, details: [], available: true },
    ];
    const detail = { ...list[0], title: "Gallery one detail" };

    await store.refreshPublicFromApi({ galleries: { listPublic: vi.fn().mockResolvedValue({ items: list }) } });
    await store.refreshPublicDetailFromApi({ gallery: vi.fn().mockResolvedValue(detail) }, "gallery-one");

    expect(store.getPublicAlbums().map((item) => item.slug)).toEqual(["gallery-one", "gallery-two"]);
    expect(store.getPublicBySlug("gallery-one")).toMatchObject({ title: "Gallery one detail" });
  });

  it("uses the API session center UUID for management scope and create payloads", async () => {
    const centerId = "11111111-1111-4111-8111-111111111111";
    const session = useSessionStore();
    session.applyApiSession({
      account: { id: "22222222-2222-4222-8222-222222222222", adminLevel: "ADMIN", adminCenterId: centerId, capabilities: ["content.create"] },
      person: { id: "33333333-3333-4333-8333-333333333333", name: "Center admin", status: "FORMAL_MEMBER" },
      mustChangePassword: false,
    });
    const projects = useProjectsStore();
    const apiRecord = { ...projectRecord, centerId, coverAttachmentId: null, detailAttachmentIds: [] };
    const api = { projects: { listAdmin: vi.fn().mockResolvedValue({ items: [apiRecord] }), create: vi.fn().mockResolvedValue(apiRecord) } };
    await projects.refreshFromApi(api);

    expect(session.currentAccount?.adminCenterId).toBe(centerId);
    expect(projects.canManageProject(apiRecord.id)).toBe(true);
    await projects.createDraftFromApi(api, {
      title: "Scoped project", category: "AI", year: "2026", description: "Description", achievement: "Achievement",
      projectStage: "Draft", challenge: "Challenge", solution: "Solution", technologies: ["TypeScript"], memberCount: 1,
      ownerCenterId: centerId, cover: null, details: [],
    });
    expect(api.projects.create).toHaveBeenCalledWith(expect.objectContaining({ centerId }));
    expect(api.projects.create.mock.calls[0]?.[0].centerId).not.toBe("baize-development");
  });

  it("preserves server-owned attachment IDs across admin reloads and update/publish commands", async () => {
    const projects = useProjectsStore();
    const activities = useActivitiesStore();
    const api = {
      projects: {
        listAdmin: vi.fn().mockResolvedValue({ items: [projectRecord] }),
        create: vi.fn().mockResolvedValue(projectRecord), update: vi.fn().mockResolvedValue(projectRecord),
        publish: vi.fn().mockRejectedValue(Object.assign(new Error("VERSION_CONFLICT"), { code: "VERSION_CONFLICT", status: 409 })),
        offline: vi.fn(), listPublic: vi.fn(), admin: vi.fn(), public: vi.fn(),
      },
      activities: {
        listAdmin: vi.fn().mockResolvedValue({ items: [activityRecord] }), create: vi.fn(), update: vi.fn().mockResolvedValue(activityRecord), publish: vi.fn(), offline: vi.fn(),
        openRegistration: vi.fn().mockResolvedValue({ ...activityRecord, version: 5, registrationOpen: true }), closeRegistration: vi.fn(), listPublic: vi.fn(), admin: vi.fn(), public: vi.fn(),
      },
      registrations: { create: vi.fn(), mine: vi.fn(), cancel: vi.fn(), listAdmin: vi.fn(), decide: vi.fn() },
    };
    await projects.refreshFromApi(api);
    await activities.refreshFromApi(api);

    const project = projects.getById("project-api-1")!;
    const activity = activities.getById("activity-api-1")!;
    expect(project.cover).toMatchObject({ id: "project-cover-1", status: "processing" });
    expect(project.details.map((item) => item.id)).toEqual(["project-detail-1", "project-detail-2"]);
    expect(activity.cover).toMatchObject({ id: "activity-cover-1", status: "processing" });
    expect(activity.details.map((item) => item.id)).toEqual(["activity-detail-1", "activity-detail-2"]);

    await projects.updateDraftFromApi(api, project.id, project);
    await activities.updateDraftFromApi(api, activity.id, activity);

    await expect(projects.publishFromApi(api, "project-api-1")).rejects.toThrow("VERSION_CONFLICT");
    await activities.setRegistrationOpenFromApi(api, "activity-api-1", true);

    expect(api.projects.publish).toHaveBeenCalledWith("project-api-1", { expectedVersion: 3 });
    expect(api.projects.update).toHaveBeenCalledWith("project-api-1", expect.objectContaining({
      expectedVersion: 3, coverAttachmentId: "project-cover-1", detailAttachmentIds: ["project-detail-1", "project-detail-2"],
    }));
    expect(api.activities.update).toHaveBeenCalledWith("activity-api-1", expect.objectContaining({
      expectedVersion: 4, coverAttachmentId: "activity-cover-1", detailAttachmentIds: ["activity-detail-1", "activity-detail-2"],
    }));
    expect(api.activities.openRegistration).toHaveBeenCalledWith("activity-api-1", { expectedVersion: 4 });
    expect(projects.getById("project-api-1")).toMatchObject({ publicationStatus: "draft", version: 3 });
    expect(projects.apiError).toMatchObject({ code: "VERSION_CONFLICT" });
    expect(activities.getById("activity-api-1")).toMatchObject({ registrationOpen: true, version: 5 });
  });

  it("hydrates complete project and activity attachments returned by the admin API", async () => {
    const projects = useProjectsStore();
    const activities = useActivitiesStore();
    const projectAttachment = { id: "project-cover-1", ownerType: "project", ownerId: "project-api-1", centerId: "center-1", role: "cover", kind: "image", title: "Project cover", caption: "", alt: "Project cover", aspect: "wide", sortOrder: 0, status: "ready", version: 2, uploadVersion: 1, url: "/api/v1/admin/uploads/project-upload/preview", thumbnailUrl: "/api/v1/admin/uploads/project-upload/preview" };
    const projectDetail = { ...projectAttachment, id: "project-detail-1", role: "detail", title: "Project detail", sortOrder: 0 };
    const activityAttachment = { ...projectAttachment, id: "activity-cover-1", ownerType: "activity", ownerId: "activity-api-1", url: "/api/v1/admin/uploads/activity-upload/preview" };
    const activityDetail = { ...activityAttachment, id: "activity-detail-1", role: "detail", title: "Activity detail", sortOrder: 0 };
    await projects.refreshFromApi({ projects: { listAdmin: vi.fn().mockResolvedValue({ items: [{ ...projectRecord, cover: projectAttachment, details: [projectDetail] }] }) } });
    await activities.refreshFromApi({ activities: { listAdmin: vi.fn().mockResolvedValue({ items: [{ ...activityRecord, cover: activityAttachment, details: [activityDetail] }] }) } });

    expect(projects.getById("project-api-1")?.cover).toMatchObject({ id: "project-cover-1", url: projectAttachment.url, status: "ready", title: "Project cover" });
    expect(projects.getById("project-api-1")?.details).toEqual([expect.objectContaining({ id: "project-detail-1", url: projectDetail.url, status: "ready", title: "Project detail" })]);
    expect(activities.getById("activity-api-1")?.cover).toMatchObject({ id: "activity-cover-1", url: activityAttachment.url, status: "ready", title: "Project cover" });
    expect(activities.getById("activity-api-1")?.details).toEqual([expect.objectContaining({ id: "activity-detail-1", url: activityDetail.url, status: "ready", title: "Activity detail" })]);
  });
});
