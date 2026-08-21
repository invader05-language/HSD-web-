import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useProjectsStore } from "../../app/stores/projects";
import { useSessionStore } from "../../app/stores/session";

const NOW = new Date("2026-08-15T00:00:00.000Z");
const CANONICAL_CATEGORIES = ["CAMPUS_SERVICE", "AI_APPLICATION", "SMART_HARDWARE", "INDUSTRY_DIGITALIZATION"] as const;

function completeDraft(overrides: Record<string, unknown> = {}) {
  return {
    slug: "intelligent-inspection-pioneer",
    title: "Intelligent inspection pioneer",
    category: "SMART_HARDWARE",
    year: "2026",
    description: "Real project description",
    achievement: "Real project outcome",
    projectStage: "In continuous development",
    challenge: "Real project challenge",
    solution: "Real project solution",
    ownerCenterId: "baize-development",
    cover: { id: "cover-1", role: "cover", kind: "image", title: "Cover", caption: "", alt: "Project cover", aspect: "wide", sortOrder: 0, status: "ready" },
    details: [],
    ...overrides,
  } as any;
}

function publicProject(overrides: Record<string, unknown> = {}) {
  return {
    slug: "intelligent-inspection-pioneer",
    title: "Intelligent inspection pioneer",
    category: "SMART_HARDWARE",
    year: "2026",
    description: "Real project description",
    achievement: "Real project outcome",
    projectStage: "In continuous development",
    challenge: "Real project challenge",
    solution: "Real project solution",
    displayOrder: null,
    members: [{ name: "Member one" }, { name: "Member two" }],
    cover: null,
    details: [],
    available: true,
    ...overrides,
  };
}

describe("Baize real project contract", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
  });

  it("rejects a category code outside the four canonical project categories", () => {
    const store = useProjectsStore();
    expect(() => store.createDraft(completeDraft({ category: "AI", technologies: ["legacy-tag"], memberCount: 2 }), NOW)).toThrow("PROJECT_CATEGORY_INVALID");
  });

  it.each(CANONICAL_CATEGORIES)("submits %s as a valid project category without a technical tag requirement", async (category) => {
    const store = useProjectsStore();
    let request: Record<string, unknown> | undefined;
    const gateway = { projects: { create: async (payload: Record<string, unknown>) => {
      request = payload;
      return { id: `project-${category}`, centerId: "baize-development", status: "draft", version: 1, publishedAt: null, revisionNumber: 1, ...publicProject({ category }) };
    } } };

    await expect(store.createDraftFromApi(gateway, completeDraft({ category, memberPersonIds: ["person-1", "person-2"] }))).resolves.toBeDefined();

    expect(request).toMatchObject({ category });
    expect(request).not.toHaveProperty("technologies");
  });

  it("sends selected formal members with the project draft", async () => {
    const store = useProjectsStore();
    let request: Record<string, unknown> | undefined;
    const gateway = { projects: { create: async (payload: Record<string, unknown>) => {
      request = payload;
      return { id: "project-1", centerId: "baize-development", status: "draft", version: 1, publishedAt: null, revisionNumber: 1, ...publicProject() };
    } } };

    await store.createDraftFromApi(gateway, completeDraft({ memberPersonIds: ["person-1", "person-2"] }));

    expect(request).toMatchObject({ memberPersonIds: ["person-1", "person-2"] });
  });

  it("does not send technical tags with a complete project draft", async () => {
    const store = useProjectsStore();
    let request: Record<string, unknown> | undefined;
    const gateway = { projects: { create: async (payload: Record<string, unknown>) => {
      request = payload;
      return { id: "project-1", centerId: "baize-development", status: "draft", version: 1, publishedAt: null, revisionNumber: 1, ...publicProject() };
    } } };

    await store.createDraftFromApi(gateway, completeDraft({ memberPersonIds: ["person-1", "person-2"] }));

    expect(request).not.toHaveProperty("technologies");
  });

  it("publishes a member-complete project with no technologies field", () => {
    const store = useProjectsStore();
    const draft = store.createDraft(completeDraft({
      slug: "member-complete-project",
      memberPersonIds: ["person-1", "person-2"],
      members: [{ name: "Member one" }, { name: "Member two" }],
    }), NOW);

    expect(() => store.publish(draft.id, NOW)).not.toThrow();
  });

  it("sends project members instead of a manually entered member count", async () => {
    const store = useProjectsStore();
    let request: Record<string, unknown> | undefined;
    const gateway = { projects: { create: async (payload: Record<string, unknown>) => {
      request = payload;
      return { id: "project-1", centerId: "baize-development", status: "draft", version: 1, publishedAt: null, revisionNumber: 1, ...publicProject() };
    } } };

    await store.createDraftFromApi(gateway, completeDraft({ memberPersonIds: ["person-1", "person-2"] }));

    expect(request).not.toHaveProperty("memberCount");
  });

  it("derives the public member count from the project members", async () => {
    const store = useProjectsStore();
    await store.refreshPublicFromApi({ projects: { listPublic: async () => ({ items: [publicProject({ memberCount: 999, members: [{ name: "Member one" }, { name: "Member two" }] })] }) } });

    expect(store.getPublicBySlug("intelligent-inspection-pioneer")?.memberCount).toBe(2);
  });

  it("projects public project members to names only", async () => {
    const store = useProjectsStore();
    await store.refreshPublicFromApi({ projects: { listPublic: async () => ({ items: [publicProject({ members: [
      { name: "Member one", studentId: "202502210001", className: "Class 1", contact: "13800000000", personId: "f7bf5579-0f43-4fe1-bd7c-21cd5b87c502" },
      { name: "Member two", studentId: "202502210002", className: "Class 2", contact: "13900000000", personId: "33e79b1d-8ef3-4865-85ea-5b6bd3ac043f" },
    ] })] }) } });

    const project = store.getPublicBySlug("intelligent-inspection-pioneer") as unknown as Record<string, unknown>;
    expect(project.members).toEqual([{ name: "Member one" }, { name: "Member two" }]);
    expect(JSON.stringify(project)).not.toMatch(/20250221000[12]|Class [12]|13[89]00000000|f7bf5579|33e79b1d/);
  });

  it("orders the public project catalog by the server display order", async () => {
    const store = useProjectsStore();
    await store.refreshPublicFromApi({ projects: { listPublic: async () => ({ items: [
      publicProject({ slug: "study", title: "DeepSeek-Study", displayOrder: 2 }),
      publicProject({ slug: "patrol", title: "Inspection pioneer", displayOrder: 1 }),
    ] }) } });

    expect(store.getPublicProjects().map((project) => project.slug)).toEqual(["patrol", "study"]);
  });

});
