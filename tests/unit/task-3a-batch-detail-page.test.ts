import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import BatchDetailPage from "../../app/pages/admin/recruitment/batches/[batchId].vue";
import {
  RECRUITMENT_BATCH_STORAGE_KEY,
  useRecruitmentBatchStore,
} from "../../app/stores/recruitment-batch";
import { useSessionStore } from "../../app/stores/session";

const routeState = reactive({
  params: { batchId: "batch-api-only" },
  path: "/admin/recruitment/batches/batch-api-only",
});
enableAutoUnmount(afterEach);

const apiBatch = {
  id: "batch-api-only",
  name: "API 2026 秋季招新",
  startAt: "2026-09-01T00:00:00.000Z",
  endAt: "2026-09-20T00:00:00.000Z",
  timezone: "Asia/Shanghai",
  lifecycleStatus: "PUBLISHED",
  manualOverride: "PAUSED",
  effectiveStatus: "paused",
  effectiveStatusReason: "paused",
  version: 9,
  publishedAt: "2026-08-30T00:00:00.000Z",
  actualOpenedAt: "2026-09-01T00:00:00.000Z",
  closedAt: null,
  archivedAt: null,
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
  applicationCount: 17,
  openCenters: [
    { id: "center-active", slug: "active", name: "开放中心", active: true },
    { id: "center-inactive", slug: "inactive", name: "已停用中心", active: false },
  ],
  responsibleAccounts: [
    { id: "account-1", username: "owner", status: "ENABLED", adminLevel: "OWNER", person: { id: "person-1", name: "总负责人" } },
  ],
};

const emptyLifecycle = { page: 1, pageSize: 50, total: 0, items: [] };
const closedApiBatch = {
  ...apiBatch,
  lifecycleStatus: "CLOSED",
  manualOverride: "FORCE_CLOSED",
  effectiveStatus: "closed",
  effectiveStatusReason: "force-closed",
  closedAt: "2026-09-21T00:00:00.000Z",
};

function installOwnerSession() {
  useSessionStore().applyApiSession({
    account: { id: "owner-api", adminLevel: "OWNER", adminCenterId: null, capabilities: ["recruitment.batch.manage"] },
    person: { id: "person-owner", name: "接口负责人", status: "FORMAL_MEMBER" },
    mustChangePassword: false,
  });
}

function seedMockBatch(name = "Mock 批次概览") {
  localStorage.setItem(RECRUITMENT_BATCH_STORAGE_KEY, JSON.stringify({
    version: 1,
    batches: [{
      id: "batch-api-only",
      name,
      startAt: "2026-09-01T00:00:00.000Z",
      endAt: "2026-09-20T00:00:00.000Z",
      timezone: "Asia/Shanghai",
      openCenterIds: ["fixture-center"],
      responsibleAccountIds: ["fixture-owner"],
      lifecycleStatus: "published",
      manualOverride: "none",
      version: 1,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z",
    }],
  }));
}

describe("Task 3A production batch detail page", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("reactive", reactive);
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("onBeforeUnmount", onBeforeUnmount);
    vi.stubGlobal("definePageMeta", vi.fn());
    vi.stubGlobal("useHead", vi.fn());
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    routeState.params.batchId = "batch-api-only";
    routeState.path = "/admin/recruitment/batches/batch-api-only";
    vi.stubGlobal("useRoute", () => routeState);
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => new Response(JSON.stringify(
      String(input).includes("/lifecycle-events") ? emptyLifecycle : apiBatch,
    ), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
  });

  it.each([
    ["canonical", "/admin/recruitment/batches/batch-api-only"],
    ["trailing-slash", "/admin/recruitment/batches/batch-api-only/"],
  ])("renders the real %s overview without treating it as a child route", async (_label, path) => {
    routeState.path = path;
    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: { props: ["title", "description"], template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>" },
      AdminStatusPill: { props: ["status"], template: "<span>{{ status }}</span>" },
      PaginationControls: true,
      NuxtPage: true,
      NuxtLink: { props: ["to"], template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/admin/recruitment/batches/batch-api-only",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    expect(wrapper.get("h1").text()).toBe("API 2026 秋季招新");
    expect(wrapper.text()).toContain("17 人");
    expect(wrapper.text()).toContain("开放中心");
    expect(wrapper.text()).toContain("已停用中心（已停用）");
    expect(wrapper.text()).toContain("总负责人 · v9");
    expect(wrapper.text()).toContain("服务端名单已接入");
    expect(wrapper.text()).toContain("服务端考核已接入");
    expect(wrapper.text()).toContain("服务端发布已接入");
    expect(wrapper.text()).toContain("当前批次暂无生命周期记录。");
    expect(wrapper.text()).not.toContain("后端未提供生命周期审计接口");
    expect(wrapper.text()).not.toContain("该子工作区尚未接入真实数据");
    expect(wrapper.text()).not.toContain("归档批次");
  });

  it.each([
    ["canonical", "/admin/recruitment/batches/batch-api-only"],
    ["trailing-slash", "/admin/recruitment/batches/batch-api-only/"],
  ])("renders the mock %s overview without mounting NuxtPage", async (_label, path) => {
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "", useMockApi: true } }));
    seedMockBatch();
    routeState.path = path;
    const nestedPageMounted = vi.fn();
    const NestedPage = defineComponent({
      setup() {
        nestedPageMounted();
        return {};
      },
      template: "<div data-testid='mock-child'>Mock child</div>",
    });

    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: { props: ["title", "description"], template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>" },
      AdminStatusPill: true,
      PaginationControls: true,
      NuxtPage: NestedPage,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();

    expect(nestedPageMounted).not.toHaveBeenCalled();
    expect(wrapper.get("h1").text()).toBe("Mock 批次概览");
    expect(wrapper.text()).not.toContain("该子工作区尚未接入真实数据");
  });

  it("continues to mount NuxtPage for an actual mock child route", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "", useMockApi: true } }));
    seedMockBatch();
    routeState.path = "/admin/recruitment/batches/batch-api-only/applications/";
    const nestedPageMounted = vi.fn();
    const NestedPage = defineComponent({
      setup() {
        nestedPageMounted();
        return {};
      },
      template: "<div data-testid='mock-child'>Mock child</div>",
    });

    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: true,
      AdminStatusPill: true,
      PaginationControls: true,
      NuxtPage: NestedPage,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();

    expect(nestedPageMounted).toHaveBeenCalledTimes(1);
    expect(wrapper.get("[data-testid='mock-child']").text()).toBe("Mock child");
  });

  it("mounts the real-mode child workspace for a nested route", async () => {
    routeState.path = "/admin/recruitment/batches/batch-api-only/applications";
    const nestedPageMounted = vi.fn();
    const RealNestedPage = defineComponent({
      setup() {
        nestedPageMounted();
        return {};
      },
      template: "<div data-testid='real-child'>Real child workspace</div>",
    });

    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: { props: ["title", "description"], template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>" },
      AdminStatusPill: true,
      PaginationControls: true,
      NuxtPage: RealNestedPage,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();

    expect(nestedPageMounted).toHaveBeenCalledTimes(1);
    expect(wrapper.get("[data-testid='real-child']").text()).toBe("Real child workspace");
  });

  it("renders an empty responsible-account list as unassigned", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      ...apiBatch,
      responsibleAccounts: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: { props: ["title"], template: "<header><h1>{{ title }}</h1><slot name='actions' /></header>" },
      AdminStatusPill: true,
      PaginationControls: true,
      NuxtPage: true,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("未分配 · v9");
    expect(wrapper.text()).not.toContain("联盟总负责人 · v9");
  });

  it("refetches a changed batch id and clears the stale batch while the new request is pending", async () => {
    let resolveSecond!: (response: Response) => void;
    const secondResponse = new Promise<Response>((resolve) => { resolveSecond = resolve; });
    const fetcher = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/lifecycle-events")) return new Response(JSON.stringify(emptyLifecycle), { status: 200, headers: { "Content-Type": "application/json" } });
      if (url.includes("/batch-b")) return secondResponse;
      return new Response(JSON.stringify(apiBatch), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: { props: ["title", "description"], template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>" },
      AdminStatusPill: true,
      PaginationControls: true,
      NuxtPage: true,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();
    expect(wrapper.get("h1").text()).toBe("API 2026 秋季招新");

    routeState.params.batchId = "batch-b";
    routeState.path = "/admin/recruitment/batches/batch-b";
    await nextTick();

    expect(fetcher.mock.calls).toContainEqual([
      "https://api.example.test/api/v1/admin/recruitment/batches/batch-b",
      expect.objectContaining({ method: "GET" }),
    ]);
    expect(wrapper.text()).not.toContain("API 2026 秋季招新");
    expect(wrapper.get("h1").text()).toBe("正在读取批次…");

    resolveSecond(new Response(JSON.stringify({ ...apiBatch, id: "batch-b", name: "API B 批次" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    await flushPromises();
    await nextTick();
    expect(wrapper.get("h1").text()).toBe("API B 批次");
  });

  it("keeps batch B when the slower batch A response resolves last", async () => {
    let resolveA!: (response: Response) => void;
    let resolveB!: (response: Response) => void;
    const responseA = new Promise<Response>((resolve) => { resolveA = resolve; });
    const responseB = new Promise<Response>((resolve) => { resolveB = resolve; });
    const fetcher = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/lifecycle-events")) return new Response(JSON.stringify(emptyLifecycle), { status: 200, headers: { "Content-Type": "application/json" } });
      return url.includes("/batch-b") ? responseB : responseA;
    });
    vi.stubGlobal("fetch", fetcher);
    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: { props: ["title", "description"], template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>" },
      AdminStatusPill: true,
      PaginationControls: true,
      NuxtPage: true,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await nextTick();

    routeState.params.batchId = "batch-b";
    routeState.path = "/admin/recruitment/batches/batch-b";
    await nextTick();
    // Real-mode detail pages also load the authoritative center options used by
    // the draft editor on mount, so the initial detail/lifecycle pair plus the
    // center catalog and the second detail/lifecycle pair total five requests.
    expect(fetcher).toHaveBeenCalledTimes(5);

    resolveB(new Response(JSON.stringify({ ...apiBatch, id: "batch-b", name: "API B 批次" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    await flushPromises();
    await nextTick();
    expect(wrapper.get("h1").text()).toBe("API B 批次");

    resolveA(new Response(JSON.stringify({ ...apiBatch, id: "batch-api-only", name: "过期 API A 批次" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    await flushPromises();
    await nextTick();
    expect(wrapper.get("h1").text()).toBe("API B 批次");
    expect(wrapper.text()).not.toContain("过期 API A 批次");
  });

  it("clears a bound archive dialog, reason, and error when the route batch changes", async () => {
    installOwnerSession();
    document.cookie = "hsd_csrf=csrf-token; path=/";
    let archiveRequests = 0;
    const fetcher = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/lifecycle-events")) {
        return new Response(JSON.stringify(emptyLifecycle), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.endsWith("/archive") && init?.method === "POST") {
        archiveRequests += 1;
        return new Response(JSON.stringify({ code: "OWNER_ONLY", message: "归档被拒绝", requestId: "archive-denied" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      const isBatchB = url.includes("/batch-b");
      return new Response(JSON.stringify({
        ...closedApiBatch,
        ...(isBatchB ? { id: "batch-b", name: "API B 已关闭批次", version: 4 } : {}),
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: { props: ["title", "description"], template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>" },
      AdminStatusPill: true,
      PaginationControls: true,
      NuxtPage: true,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();

    await wrapper.findAll("button").find((button) => button.text() === "归档批次")!.trigger("click");
    await wrapper.get("textarea").setValue("只能属于批次 A 的原因");
    const confirm = wrapper.findAll("button").find((button) => button.text() === "确认归档批次");
    expect(confirm).toBeDefined();
    await confirm!.trigger("click");
    await flushPromises();
    expect(wrapper.get('[role="alertdialog"]').text()).toContain("归档被拒绝");

    routeState.params.batchId = "batch-b";
    routeState.path = "/admin/recruitment/batches/batch-b";
    await nextTick();
    await flushPromises();
    await nextTick();

    expect(wrapper.get("h1").text()).toBe("API B 已关闭批次");
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("只能属于批次 A 的原因");
    expect(wrapper.text()).not.toContain("归档被拒绝");
    expect(archiveRequests).toBe(1);
  });

  it("clears archive success messaging when navigating to another batch", async () => {
    installOwnerSession();
    document.cookie = "hsd_csrf=csrf-token; path=/";
    const fetcher = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/lifecycle-events")) {
        return new Response(JSON.stringify(emptyLifecycle), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.endsWith("/archive") && init?.method === "POST") {
        return new Response(JSON.stringify({
          ...closedApiBatch,
          lifecycleStatus: "ARCHIVED",
          effectiveStatus: "archived",
          effectiveStatusReason: "archived",
          version: 10,
          archivedAt: "2026-09-30T00:00:00.000Z",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const isBatchB = url.includes("/batch-b");
      return new Response(JSON.stringify({
        ...closedApiBatch,
        ...(isBatchB ? { id: "batch-b", name: "API B 已关闭批次", version: 4 } : {}),
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: { props: ["title", "description"], template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>" },
      AdminStatusPill: true,
      PaginationControls: true,
      NuxtPage: true,
      NuxtLink: { template: "<a><slot /></a>" },
    } } });
    await flushPromises();
    await nextTick();

    await wrapper.findAll("button").find((button) => button.text() === "归档批次")!.trigger("click");
    const confirm = wrapper.findAll("button").find((button) => button.text() === "确认归档批次");
    await confirm!.trigger("click");
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toContain("归档批次已完成");

    routeState.params.batchId = "batch-b";
    routeState.path = "/admin/recruitment/batches/batch-b";
    await nextTick();
    await flushPromises();
    await nextTick();

    expect(wrapper.get("h1").text()).toBe("API B 已关闭批次");
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });
});
