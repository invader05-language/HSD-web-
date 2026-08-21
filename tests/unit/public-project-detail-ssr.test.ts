import { createPinia, setActivePinia } from "pinia";
import { computed, createSSRApp, defineComponent, onMounted, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDetailPage from "../../app/pages/projects/[slug].vue";

const slug = "ssr-api-project";
const projectResponse = {
  slug,
  title: "SSR API project",
  displayOrder: null,
  category: "AI_APPLICATION",
  year: "2026",
  description: "Rendered from the public project API",
  achievement: "Achievement",
  projectStage: "Pilot",
  challenge: "Challenge",
  solution: "Solution",
  members: [{ name: "SSR member" }],
  memberCount: 1,
  cover: null,
  details: [],
  available: true,
};

describe("public project detail SSR", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("useRoute", () => ({ params: { slug }, path: `/projects/${slug}` }));
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    vi.stubGlobal("createError", (input: unknown) => Object.assign(new Error("route error"), input));
  });

  it("resolves an API-backed project before server HTML and head rendering", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(projectResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("useAsyncData", async (_key: string, handler: () => Promise<unknown>) => {
      await handler();
      return { data: ref(null), status: ref("success"), error: ref(null) };
    });
    let headFactory: (() => { title?: string }) | undefined;
    vi.stubGlobal("useHead", (factory: () => { title?: string }) => { headFactory = factory; });

    const app = createSSRApp(ProjectDetailPage);
    app.use(createPinia());
    app.component("PageBanner", defineComponent({ props: { title: String }, template: "<h1>{{ title }}</h1>" }));
    app.component("ContentMediaView", defineComponent({ template: "<span />" }));
    app.component("EmptyState", defineComponent({ props: { title: String }, template: "<div data-testid='empty'>{{ title }}</div>" }));
    app.component("NuxtLink", defineComponent({ template: "<a><slot /></a>" }));

    const html = await renderToString(app);

    expect(fetcher).toHaveBeenCalledWith(`https://api.example.test/api/v1/public/projects/${slug}`, expect.objectContaining({ method: "GET" }));
    expect(html).toContain("SSR API project");
    expect(html).not.toContain("data-testid=\"empty\"");
    expect(headFactory?.().title).toContain("SSR API project");
  });
});
