import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { computed, defineComponent, nextTick, ref, watch } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import CentersPage from "../../app/pages/centers.vue";
import CenterDetailPage from "../../app/pages/centers/[slug].vue";

const publicMember = (publicId: string, name: string, type: "ALLIANCE_OWNER" | "CENTER_MINISTER") => ({
  publicId,
  name,
  grade: "2025",
  className: "计算机科学与技术 1 班",
  avatar: { kind: "default", variant: "white-hsd" },
  center: { publicSlug: "new-media", name: "新媒体中心" },
  duty: "CORE",
  honors: [],
  positions: [{ type, ...(type === "CENTER_MINISTER" ? { centerPublicSlug: "new-media" } : {}) }],
});

const regularMember = (publicId: string, name: string) => ({
  ...publicMember(publicId, name, "ALLIANCE_OWNER"),
  duty: "REGULAR",
  positions: [],
});

describe("public centers live organization integration", () => {
  let routeParams: Record<string, string>;
  let routeQuery: Record<string, string>;
  let routerReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("useHead", vi.fn());
    vi.stubGlobal("useAsyncData", async (_key: string, handler: () => Promise<unknown>) => ({ data: ref(await handler()) }));
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    routeParams = {};
    routeQuery = {};
    routerReplace = vi.fn();
    vi.stubGlobal("useRoute", () => ({ params: routeParams, query: routeQuery }));
    vi.stubGlobal("useRouter", () => ({ replace: routerReplace }));
    vi.stubGlobal("createError", (error: unknown) => error);
  });

  it("renders live alliance owners and every minister instead of static center leadership", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const payload = url.endsWith("/new-media")
        ? {
          publicSlug: "new-media", name: "新媒体中心", publicMemberCount: 3, publicCoreMemberCount: 3,
          ministers: [publicMember("minister-li", "李泽宇", "CENTER_MINISTER"), publicMember("minister-chen", "陈奕伟", "CENTER_MINISTER"), publicMember("minister-xiao", "肖子妤", "CENTER_MINISTER")],
          members: [], coreMembers: [],
        }
        : {
          allianceOwners: [publicMember("owner-xu", "徐一鸣", "ALLIANCE_OWNER")],
          items: [{ publicSlug: "new-media", name: "新媒体中心", publicMemberCount: 2, publicCoreMemberCount: 2 }],
        };
      return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const global = { stubs: { NuxtPage: true, PageBanner: true, NuxtLink: { template: "<a><slot /></a>" }, HsdAvatar: true } };
    const list = mount(defineComponent({ components: { CentersPage }, template: "<Suspense><CentersPage /></Suspense>" }), { global });
    await flushPromises();
    await nextTick();

    expect(list.text()).toContain("徐一鸣");
    expect(list.text()).toContain("联盟负责人");

    routeParams = { slug: "new-media" };
    const detail = mount(defineComponent({ components: { CenterDetailPage }, template: "<Suspense><CenterDetailPage /></Suspense>" }), { global });
    await flushPromises();
    await nextTick();
    expect(detail.text()).toContain("李泽宇");
    expect(detail.text()).toContain("陈奕伟");
    expect(detail.text()).toContain("部长");
    expect(detail.findAll("[data-testid='center-minister-card']")).toHaveLength(3);
  });

  it("renders alliance owners in the shared leadership panel without exposing private fields", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const payload = url.endsWith("/new-media")
        ? {
          publicSlug: "new-media", name: "新媒体中心", publicMemberCount: 0, publicCoreMemberCount: 0,
          ministers: [], members: [], coreMembers: [],
        }
        : {
          allianceOwners: [
            {
              ...publicMember("owner-xu", "徐一鸣", "ALLIANCE_OWNER"),
              grade: "2024",
              className: "25级计算机科学与技术1班",
            },
            {
              ...publicMember("owner-guo", "郭展良", "ALLIANCE_OWNER"),
              grade: "2024",
              className: "25级软件工程1班",
            },
          ],
          items: [],
        };
      return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const global = { stubs: { NuxtPage: true, PageBanner: true, NuxtLink: { template: "<a><slot /></a>" }, HsdAvatar: true } };
    const list = mount(defineComponent({ components: { CentersPage }, template: "<Suspense><CentersPage /></Suspense>" }), { global });
    await flushPromises();
    await nextTick();

    expect(list.get("[data-testid='organization-leadership-panel']").text()).toContain("2 位负责人");
    expect(list.findAll("[data-testid='organization-leadership-card']")).toHaveLength(2);
    expect(list.text()).toContain("徐一鸣");
    expect(list.text()).toContain("郭展良");
    expect(list.text()).toContain("联盟负责人");
    expect(list.text()).not.toContain("202402210204");
    expect(list.text()).not.toContain("25级计算机科学与技术1班");
    expect(list.findAll("a[to='/people/owner-xu']")).toHaveLength(1);
    expect(list.findAll("a[to='/people/owner-guo']")).toHaveLength(1);
  });

  it("renders an explicit empty state when the live owner list is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ allianceOwners: [], items: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })));

    const global = { stubs: { NuxtPage: true, PageBanner: true, NuxtLink: { template: "<a><slot /></a>" }, HsdAvatar: true } };
    const list = mount(defineComponent({ components: { CentersPage }, template: "<Suspense><CentersPage /></Suspense>" }), { global });
    await flushPromises();
    await nextTick();

    expect(list.get("[data-testid='organization-leadership-panel']").text()).toContain("当前暂未公布联盟负责人");
    expect(list.findAll("[data-testid='organization-leadership-card']")).toHaveLength(0);
  });

  it("renders the API failure state instead of silently hiding alliance leadership", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network unavailable"); }));

    const global = { stubs: { NuxtPage: true, PageBanner: true, NuxtLink: { template: "<a><slot /></a>" }, HsdAvatar: true } };
    const list = mount(defineComponent({ components: { CentersPage }, template: "<Suspense><CentersPage /></Suspense>" }), { global });
    await flushPromises();
    await nextTick();

    expect(list.get("[data-testid='organization-leadership-panel'] [role='alert']").text()).toContain("负责人加载失败");
  });

  it("uses the center detail snapshot for members and limits the first page to eight cards", async () => {
    const members = Array.from({ length: 10 }, (_, index) => publicMember(
      `member-${index}`,
      `新媒体成员${index + 1}`,
      index === 0 ? "CENTER_MINISTER" : "ALLIANCE_OWNER",
    ));
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(
      url.endsWith("/new-media")
        ? {
          publicSlug: "new-media", name: "新媒体中心", publicMemberCount: 10, publicCoreMemberCount: 2,
          ministers: [members[0]], members, coreMembers: members.slice(0, 2),
        }
        : { allianceOwners: [], items: [] },
    ), { status: 200, headers: { "content-type": "application/json" } })));

    routeParams = { slug: "new-media" };
    const global = { stubs: { NuxtPage: true, PageBanner: true, NuxtLink: { template: "<a><slot /></a>" }, HsdAvatar: true } };
    const detail = mount(defineComponent({ components: { CenterDetailPage }, template: "<Suspense><CenterDetailPage /></Suspense>" }), { global });
    await flushPromises();
    await nextTick();

    expect(detail.text()).toContain("共 10 位成员");
    expect(detail.findAll("[data-testid='center-member-card']")).toHaveLength(8);
    expect(detail.text()).toContain("第 1 页");
  });

  it("restores filter and page from the URL and writes filter changes back to the URL", async () => {
    const members = [
      ...Array.from({ length: 6 }, (_, index) => publicMember(`core-${index}`, `核心成员${index + 1}`, "ALLIANCE_OWNER")),
      ...Array.from({ length: 6 }, (_, index) => regularMember(`regular-${index}`, `普通成员${index + 1}`)),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      publicSlug: "new-media", name: "新媒体中心", publicMemberCount: 12, publicCoreMemberCount: 6,
      ministers: [], members, coreMembers: members.slice(0, 6),
    }), { status: 200, headers: { "content-type": "application/json" } })));

    routeParams = { slug: "new-media" };
    routeQuery = { memberType: "core", memberPage: "2" };
    const global = { stubs: { NuxtPage: true, PageBanner: true, NuxtLink: { template: "<a><slot /></a>" }, HsdAvatar: true } };
    const detail = mount(defineComponent({ components: { CenterDetailPage }, template: "<Suspense><CenterDetailPage /></Suspense>" }), { global });
    await flushPromises();
    await nextTick();

    expect(detail.text()).toContain("当前显示 核心成员 6 人");
    expect(detail.text()).toContain("第 1 页 / 共 1 页");
    expect(detail.findAll("[data-testid='center-member-card']")).toHaveLength(6);

    const coreFilter = detail.findAll("button").find((button) => button.text().includes("核心成员"));
    expect(coreFilter).toBeDefined();
    await coreFilter!.trigger("click");
    expect(routerReplace).toHaveBeenCalled();
    expect(routerReplace.mock.calls.at(-1)?.[0]).toEqual({ query: { memberType: "core" } });
  });
});
