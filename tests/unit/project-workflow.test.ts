import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useProjectsStore } from "../../app/stores/projects";
import { useSessionStore } from "../../app/stores/session";

const NOW = new Date("2026-08-07T09:00:00.000Z");

function projectInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "智巡先锋测试项目",
    category: "AI × HarmonyOS",
    year: "2026",
    description: "面向校园巡检与应急协同的智能解决方案。",
    achievement: "场景验证中",
    projectStage: "场景验证中",
    challenge: "校园巡检信息分散，现场异常难以及时同步。",
    solution: "通过识别、告警、处置和复盘形成闭环。",
    technologies: ["HarmonyOS", "AI 视觉识别"],
    memberCount: 8,
    ownerCenterId: "baize-development",
    cover: {
      id: "project-cover",
      role: "cover" as const,
      kind: "image" as const,
      title: "项目封面",
      caption: "",
      alt: "智巡先锋项目封面",
      aspect: "wide" as const,
      sortOrder: 0,
      status: "ready" as const,
    },
    details: [],
    ...overrides,
  };
}

describe("project publishing workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("keeps project drafts private until a complete publish", () => {
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const store = useProjectsStore();
    const created = store.createDraft(projectInput(), NOW);

    expect(store.getPublicBySlug(created.slug)).toBeUndefined();
    store.publish(created.id, NOW);
    expect(store.getPublicBySlug(created.slug)).toMatchObject({ title: "智巡先锋测试项目" });

    store.updateDraft(created.id, { description: "新的项目公开说明。" }, NOW);
    expect(store.getPublicBySlug(created.slug)).toMatchObject({ description: "面向校园巡检与应急协同的智能解决方案。" });
    store.publish(created.id, NOW);
    expect(store.getPublicBySlug(created.slug)).toMatchObject({ description: "新的项目公开说明。" });
  });

  it("keeps removed collaboration fields out of managed and public project records", () => {
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const store = useProjectsStore();
    const created = store.createDraft(projectInput(), NOW);

    expect(created).not.toHaveProperty("team");
    expect(created).not.toHaveProperty("collaboratingCenterIds");

    store.publish(created.id, NOW);
    const published = store.getPublicBySlug(created.slug);
    expect(published).not.toHaveProperty("team");
    expect(published).not.toHaveProperty("collaboratingCenterIds");
  });

  it("migrates legacy project storage without losing projects", () => {
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const seedStore = useProjectsStore();
    const legacyProject = JSON.parse(JSON.stringify(seedStore.projects[0]));
    legacyProject.team = "旧制作团队";
    legacyProject.collaboratingCenterIds = ["new-media"];
    localStorage.setItem("baiyun-hsd.projects", JSON.stringify({
      version: 1,
      projects: [legacyProject],
    }));
    setActivePinia(createPinia());

    const store = useProjectsStore();
    expect(store.projects).toHaveLength(1);
    expect(store.projects[0].title).toBe(legacyProject.title);
    expect(store.projects[0]).not.toHaveProperty("team");
    expect(store.projects[0]).not.toHaveProperty("collaboratingCenterIds");
  });

  it("requires a cover and complete detail metadata before publishing", () => {
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const store = useProjectsStore();
    const created = store.createDraft(projectInput({ cover: null }), NOW);
    expect(() => store.publish(created.id, NOW)).toThrow("PROJECT_INCOMPLETE");

    store.updateDraft(created.id, {
      cover: projectInput().cover,
      details: [{
        id: "project-detail",
        role: "detail" as const,
        kind: "image" as const,
        title: "项目成果",
        caption: "",
        alt: "项目成果图",
        aspect: "landscape" as const,
        sortOrder: 0,
        status: "ready" as const,
      }],
    }, NOW);
    expect(() => store.publish(created.id, NOW)).toThrow("PROJECT_INCOMPLETE");
  });

  it("scopes center administrators to their own projects while allowing direct publish", () => {
    const store = useProjectsStore();
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const created = store.createDraft(projectInput(), NOW);
    useSessionStore().signIn("media-admin", { requireAdmin: true });
    expect(() => store.publish(created.id, NOW)).toThrow("PROJECT_CENTER_SCOPE_REQUIRED");
  });
});
