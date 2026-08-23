import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import UpdateDetailPage from "../../app/pages/updates/[slug].vue";
import { usePortalContentStore } from "../../app/stores/portal-content";

const updateRouteState = reactive({ params: { slug: "api-only-update" } });

describe("Task 3A update detail runtime boundary", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("watch", watch);
    updateRouteState.params.slug = "api-only-update";
    vi.stubGlobal("useRoute", () => updateRouteState);
    vi.stubGlobal("useHead", vi.fn());
    vi.stubGlobal("createError", (input: unknown) => Object.assign(new Error("route error"), input));
  });

  it("renders API-only content in real mode without consulting the portal mock store", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      slug: "api-only-update",
      kind: "article",
      title: "API 独有动态",
      summary: "生产接口摘要",
      tag: "新闻",
      expiresAt: null,
      blocks: [{ type: "image", url: "/api/v1/public/media/image-token", alt: "接口配图", caption: "接口说明" }],
      publishedAt: "2026-08-23T00:00:00.000Z",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const store = usePortalContentStore();
    const localLookup = vi.spyOn(store, "getPublicBySlug");

    const wrapper = mount(UpdateDetailPage, { global: { stubs: {
      PageBanner: { props: ["title"], template: "<h1>{{ title }}</h1>" },
      ContentMediaView: true,
      MediaPlaceholder: true,
      EmptyState: { props: ["title"], template: "<div>{{ title }}</div>" },
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/public/content/api-only-update",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(localLookup).not.toHaveBeenCalled();
    expect(wrapper.get("h1").text()).toBe("API 独有动态");
    expect(wrapper.html()).toContain("接口配图");
  });

  it("shows a real 404 state without rendering a seeded update", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "", useMockApi: false } }));
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      code: "CONTENT_NOT_FOUND",
      message: "Content not found",
      requestId: "request-404",
    }), { status: 404, headers: { "Content-Type": "application/json" } })));
    updateRouteState.params.slug = "project-team";
    const localLookup = vi.spyOn(usePortalContentStore(), "getPublicBySlug");

    const wrapper = mount(UpdateDetailPage, { global: { stubs: {
      PageBanner: true,
      ContentMediaView: true,
      MediaPlaceholder: true,
      EmptyState: { props: ["title"], template: "<div data-testid='empty'>{{ title }}</div>" },
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();

    expect(localLookup).not.toHaveBeenCalled();
    expect(wrapper.get("[data-testid='empty']").text()).toContain("动态不存在");
    expect(wrapper.html()).not.toContain("项目团队招募");
  });

  it("keeps the seeded mock update available when mock mode is explicit", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "", useMockApi: true } }));
    updateRouteState.params.slug = "project-team";

    const wrapper = mount(UpdateDetailPage, { global: { stubs: {
      PageBanner: { props: ["title"], template: "<h1>{{ title }}</h1>" },
      ContentMediaView: true,
      MediaPlaceholder: true,
      EmptyState: true,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();
    expect(wrapper.get("h1").text()).toBeTruthy();
  });

  it("refetches a changed real slug and clears the stale update while the new request is pending", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    let resolveSecond!: (response: Response) => void;
    const secondResponse = new Promise<Response>((resolve) => { resolveSecond = resolve; });
    const content = (slug: string, title: string) => ({
      slug,
      kind: "article",
      title,
      summary: null,
      tag: null,
      expiresAt: null,
      blocks: [],
      publishedAt: "2026-08-23T00:00:00.000Z",
    });
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(content("api-only-update", "动态 A")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockImplementationOnce(() => secondResponse);
    vi.stubGlobal("fetch", fetcher);
    const wrapper = mount(UpdateDetailPage, { global: { stubs: {
      PageBanner: { props: ["title"], template: "<h1>{{ title }}</h1>" },
      ContentMediaView: true,
      MediaPlaceholder: true,
      EmptyState: true,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();
    expect(wrapper.get("h1").text()).toBe("动态 A");

    updateRouteState.params.slug = "update-b";
    await nextTick();

    expect(fetcher).toHaveBeenNthCalledWith(2,
      "https://api.example.test/api/v1/public/content/update-b",
      expect.objectContaining({ method: "GET" }),
    );
    expect(wrapper.find("h1").exists()).toBe(false);
    expect(wrapper.get("[role='status']").text()).toContain("正在加载动态");

    resolveSecond(new Response(JSON.stringify(content("update-b", "动态 B")), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    await flushPromises();
    await nextTick();
    expect(wrapper.get("h1").text()).toBe("动态 B");
  });
});
