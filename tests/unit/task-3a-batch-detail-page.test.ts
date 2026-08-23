import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import BatchDetailPage from "../../app/pages/admin/recruitment/batches/[batchId].vue";

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
    vi.stubGlobal("useRoute", () => ({ params: { batchId: "batch-api-only" }, path: "/admin/recruitment/batches/batch-api-only" }));
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(apiBatch), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
  });

  it("renders API DTO counts, centers, owner and honest unavailable workspaces", async () => {
    const wrapper = mount(BatchDetailPage, { global: { stubs: {
      AdminPageHeading: { props: ["title", "description"], template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>" },
      AdminStatusPill: { props: ["status"], template: "<span>{{ status }}</span>" },
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
    expect(wrapper.text()).toContain("该子工作区尚未接入真实数据");
    expect(wrapper.text()).toContain("后端未提供生命周期审计接口");
    expect(wrapper.text()).not.toContain("归档批次");
  });
});
