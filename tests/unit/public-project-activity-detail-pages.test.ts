import { createPinia, setActivePinia } from "pinia";
import { computed, defineComponent, nextTick, onMounted, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDetailPage from "../../app/pages/projects/[slug].vue";
import ActivityDetailPage from "../../app/pages/activities/[slug].vue";

const route = ref({ params: { slug: "" }, path: "" });

function publicProject(slug: string) {
  return {
    slug, title: "Direct API project", displayOrder: null, category: "AI_APPLICATION", year: "2026", description: "Description",
    achievement: "Achievement", projectStage: "Pilot", challenge: "Challenge", solution: "Solution",
    members: [{ name: "Project member" }], memberCount: 1, available: true,
    cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Project cover", aspect: "wide", sortOrder: 0, url: "/api/v1/public/media/project-cover" },
    details: [{ kind: "video", role: "detail", title: "Demo", caption: "Caption", alt: "Project demo", aspect: "landscape", sortOrder: 0, url: "/api/v1/public/media/project-detail" }],
  };
}

function publicActivity(slug: string) {
  return {
    slug, title: "Direct API activity", type: "Workshop", date: "2026-09-01", time: "09:00", location: "Room 1",
    summary: "Summary", content: "Content", agenda: ["Start"], registrationEndAt: "2026-08-31T00:00:00.000Z",
    registrationOpen: false, available: true,
    cover: { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Activity cover", aspect: "wide", sortOrder: 0, url: "/api/v1/public/media/activity-cover" },
    details: [{ kind: "image", role: "detail", title: "Photo", caption: "Caption", alt: "Activity photo", aspect: "landscape", sortOrder: 0, url: "/api/v1/public/media/activity-detail" }],
  };
}

describe("production public project and activity detail pages", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    route.value = { params: { slug: "" }, path: "" };
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("useRoute", () => route.value);
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    vi.stubGlobal("useAsyncData", async (_key: string, handler: () => Promise<unknown>) => {
      void handler();
      return { data: ref(null), status: ref("pending"), error: ref(null) };
    });
    vi.stubGlobal("useHead", vi.fn());
    vi.stubGlobal("useCookie", () => ref([]));
    vi.stubGlobal("navigateTo", vi.fn());
    vi.stubGlobal("createError", (input: unknown) => Object.assign(new Error("route error"), input));
  });

  it("shows loading and renders a project created only through the public detail API", async () => {
    route.value = { params: { slug: "direct-project" }, path: "/projects/direct-project" };
    let resolveResponse!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const fetcher = vi.fn(() => pending);
    vi.stubGlobal("fetch", fetcher);

    const wrapper = mount(defineComponent({ components: { ProjectDetailPage }, template: "<Suspense><ProjectDetailPage /></Suspense>" }), { global: { stubs: {
      PageBanner: { props: ["title", "mediaFit", "mediaPreview"], template: "<section data-testid='project-banner' :data-fit='mediaFit' :data-preview='mediaPreview'><h1>{{ title }}</h1></section>" },
      ContentMediaView: { props: ["fit", "preview"], template: "<span data-testid='media' :data-fit='fit' :data-preview='preview' />" },
      EmptyState: { props: ["title"], template: "<div data-testid='empty'>{{ title }}</div>" },
      NuxtLink: true,
    } } });
    await flushPromises(); await nextTick();
    expect(wrapper.get("[role='status']").exists()).toBe(true);

    resolveResponse(new Response(JSON.stringify(publicProject("direct-project")), { status: 200, headers: { "Content-Type": "application/json" } }));
    await flushPromises(); await nextTick();

    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/public/projects/direct-project", expect.any(Object));
    expect(wrapper.get("h1").text()).toBe("Direct API project");
    expect(wrapper.findAll("[data-testid='media']")).toHaveLength(1);
    expect(wrapper.get("[data-testid='project-banner']").attributes("data-fit")).toBe("contain");
    expect(wrapper.get("[data-testid='project-banner']").attributes("data-preview")).toBe("full");
    expect(wrapper.get("[data-testid='media']").attributes("data-fit")).toBe("contain");
    expect(wrapper.get("[data-testid='media']").attributes("data-preview")).toBe("full");
  });

  it("loads a direct activity API route without fixture-based pre-404 and exposes API errors", async () => {
    route.value = { params: { slug: "direct-activity" }, path: "/activities/direct-activity" };
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(new Response(JSON.stringify(publicActivity("direct-activity")), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);

    const wrapper = mount(ActivityDetailPage, { global: { stubs: {
      PageBanner: { props: ["title"], template: "<h1>{{ title }}</h1>" },
      ContentMediaView: { props: ["fit", "preview"], template: "<span data-testid='media' :data-fit='fit' :data-preview='preview' />" },
      EmptyState: { props: ["title"], template: "<div data-testid='empty'>{{ title }}</div>" },
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises(); await nextTick();

    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/public/activities/direct-activity", expect.any(Object));
    expect(wrapper.get("h1").text()).toBe("Direct API activity");
    expect(wrapper.get("[data-testid='media']").attributes("data-fit")).toBe("contain");
    expect(wrapper.get("[data-testid='media']").attributes("data-preview")).toBe("full");

    wrapper.unmount();
    setActivePinia(createPinia());
    route.value = { params: { slug: "api-failure" }, path: "/activities/api-failure" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "ACTIVITY_API_DOWN", message: "Activity service unavailable", requestId: "req-1" }), { status: 503, headers: { "Content-Type": "application/json" } })));
    const failed = mount(ActivityDetailPage, { global: { stubs: { PageBanner: true, ContentMediaView: true, EmptyState: { props: ["title"], template: "<div data-testid='empty'>{{ title }}</div>" }, NuxtLink: { template: "<a><slot /></a>" } } } });
    await flushPromises(); await nextTick();
    expect(failed.get("[role='alert']").text()).toContain("Activity service unavailable");
  });
});
