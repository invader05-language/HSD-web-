import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectEditor from "../../app/components/admin/ProjectEditor.vue";
import ActivityEditor from "../../app/components/admin/ActivityEditor.vue";
import { useSessionStore } from "../../app/stores/session";
import { useProjectsStore } from "../../app/stores/projects";
import { useActivitiesStore } from "../../app/stores/activities";

const centerId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const activityId = "33333333-3333-4333-8333-333333333333";
const coverId = "44444444-4444-4444-8444-444444444444";
const detailId = "55555555-5555-4555-8555-555555555555";

const projectMemberId = "88888888-8888-4888-8888-888888888888";
const projectRecord = { id: projectId, centerId, slug: "api-project", status: "draft", version: 3, publishedAt: null, title: "API project", category: "SMART_HARDWARE", year: "2026", description: "Description", achievement: "Achievement", projectStage: "Draft", challenge: "Challenge", solution: "Solution", memberPersonIds: [projectMemberId], members: [{ personId: projectMemberId, name: "Member A" }], displayOrder: null, coverAttachmentId: coverId, detailAttachmentIds: [detailId], revisionNumber: 1 };
const activityRecord = { id: activityId, centerId, slug: "api-activity", status: "draft", version: 4, registrationOpen: false, publishedAt: null, title: "API activity", type: "Workshop", date: "2026-09-01", time: "09:00", location: "Room 1", summary: "Summary", content: "Content", agenda: ["Start"], registrationEndAt: "2026-08-31T00:00:00.000Z", coverAttachmentId: coverId, detailAttachmentIds: [detailId], revisionNumber: 1 };

function session(adminLevel: "ADMIN" | "OWNER") {
  useSessionStore().applyApiSession({
    account: { id: "66666666-6666-4666-8666-666666666666", adminLevel, adminCenterId: adminLevel === "ADMIN" ? centerId : null, capabilities: ["content.create"] },
    person: { id: "77777777-7777-4777-8777-777777777777", name: "Editor", status: "FORMAL_MEMBER" }, mustChangePassword: false,
  });
}

const globalOptions = { stubs: { ContentMediaUploader: true, ContentMediaView: true } };

describe("production project and activity editor center/media behavior", () => {
  beforeEach(() => {
    localStorage.clear(); setActivePinia(createPinia());
    vi.stubGlobal("ref", ref); vi.stubGlobal("computed", computed); vi.stubGlobal("reactive", reactive); vi.stubGlobal("watch", watch); vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
  });

  it("renders only authoritative API center UUID options for owners and scoped center admins", async () => {
    session("OWNER");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ currentPermission: { accountId: "66666666-6666-4666-8666-666666666666", personId: "77777777-7777-4777-8777-777777777777", adminLevel: "OWNER", adminCenterId: null, version: 1 }, items: [{ id: centerId, slug: "baize-development", name: "Baize", active: true, positions: [] }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const project = mount(ProjectEditor, { props: { mode: "create" }, global: globalOptions });
    const activity = mount(ActivityEditor, { props: { mode: "create" }, global: globalOptions });
    await flushPromises();

    for (const wrapper of [project, activity]) {
      const centerSelect = wrapper.findAll("select").at(-1)!;
      expect(centerSelect.findAll("option").map((option) => option.attributes("value")).filter(Boolean)).toEqual([centerId]);
    }

    project.unmount(); activity.unmount(); setActivePinia(createPinia()); session("ADMIN");
    const scoped = mount(ProjectEditor, { props: { mode: "create" }, global: globalOptions });
    await flushPromises();
    expect(scoped.findAll("select").at(-1)!.element.value).toBe(centerId);
    expect(scoped.findAll("select").at(-1)!.attributes("disabled")).toBeDefined();
  });

  it("allows server-owned ID-only attachments to survive reload and publish validation", async () => {
    session("ADMIN");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith("/api/v1/admin/members")
      ? { items: [{ id: projectMemberId, name: "Member A", status: "FORMAL_MEMBER", membership: { centerId } }] }
      : { currentPermission: { accountId: "66666666-6666-4666-8666-666666666666", personId: "77777777-7777-4777-8777-777777777777", adminLevel: "ADMIN", adminCenterId: centerId, version: 1 }, items: [{ id: centerId, slug: "baize-development", name: "Baize", active: true, positions: [] }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const projects = useProjectsStore(); const activities = useActivitiesStore();
    await projects.refreshFromApi({ projects: { listAdmin: vi.fn().mockResolvedValue({ items: [projectRecord] }) } });
    await activities.refreshFromApi({ activities: { listAdmin: vi.fn().mockResolvedValue({ items: [activityRecord] }) } });
    const project = mount(ProjectEditor, { props: { mode: "edit", project: projects.getById(projectId)! }, global: globalOptions });
    const activity = mount(ActivityEditor, { props: { mode: "edit", activity: activities.getById(activityId)! }, global: globalOptions });
    await flushPromises();

    expect(project.findAll("button").at(-1)!.attributes("disabled")).toBeUndefined();
    expect(activity.findAll("button").at(-1)!.attributes("disabled")).toBeUndefined();
    expect(projects.getById(projectId)?.cover).toMatchObject({ id: coverId, status: "processing", serverOwned: true });
    expect(activities.getById(activityId)?.cover).toMatchObject({ id: coverId, status: "processing", serverOwned: true });
  });

  it("uses member name input and removes legacy technology and member-count inputs", async () => {
    session("OWNER");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ currentPermission: { accountId: "66666666-6666-4666-8666-666666666666", personId: "77777777-7777-4777-8777-777777777777", adminLevel: "OWNER", adminCenterId: null, version: 1 }, items: [{ id: centerId, slug: "baize-development", name: "Baize", active: true, positions: [] }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const project = mount(ProjectEditor, { props: { mode: "create" }, global: globalOptions });
    await flushPromises();

    expect(project.find("input[aria-label='项目成员姓名']").exists()).toBe(true);
    expect(project.find("[data-testid=project-member-count]").exists()).toBe(false);
    expect(project.find("textarea[placeholder]").exists()).toBe(false);
  });

  it("accepts project member names without loading the full member directory", async () => {
    session("OWNER");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ currentPermission: { accountId: "66666666-6666-4666-8666-666666666666", personId: "77777777-7777-4777-8777-777777777777", adminLevel: "OWNER", adminCenterId: null, version: 1 }, items: [{ id: centerId, slug: "baize-development", name: "Baize", active: true, positions: [] }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const project = mount(ProjectEditor, { props: { mode: "create" }, global: globalOptions });
    await flushPromises();

    expect(project.find("select[multiple]").exists()).toBe(false);
    expect(project.find("input[aria-label='项目成员姓名']").exists()).toBe(true);
    expect(fetcher).not.toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/members"), expect.anything());
  });
});
