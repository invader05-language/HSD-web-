import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MemberPage from "../../app/pages/member/index.vue";
import MemberProfilePage from "../../app/pages/member/profile.vue";
import { useMemberProfileStore } from "../../app/stores/member-profile";

const profileResponse = {
  id: "person-api-only",
  name: "API 陈同学",
  studentId: "20260088",
  grade: "2026 级",
  className: "软件工程 1 班",
  contact: "13800000000",
  bio: "接口简介",
  biography: null,
  status: "PREPARATORY",
  baizeDirection: null,
  avatar: { kind: "default" },
  publicProfileEnabled: false,
  version: 3,
  membership: null,
};

function mountPage(component: typeof MemberPage | typeof MemberProfilePage) {
  return mount(component, { global: { stubs: {
    HsdAvatar: { props: ["name", "src"], template: "<span data-testid='avatar'>{{ name }}</span>" },
    NuxtLink: { props: ["to"], template: "<a><slot /></a>" },
  } } });
}

describe("Task 3A member page production profile", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("reactive", reactive);
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("onBeforeUnmount", onBeforeUnmount);
    vi.stubGlobal("nextTick", nextTick);
    vi.stubGlobal("definePageMeta", vi.fn());
    vi.stubGlobal("useHead", vi.fn());
    vi.stubGlobal("navigateTo", vi.fn());
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(profileResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
  });

  it("loads /member from the API without reading the local member profile repository", async () => {
    const localLookup = vi.spyOn(useMemberProfileStore(), "getProfile");
    const wrapper = mountPage(MemberPage);
    await flushPromises();
    await nextTick();

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/members/me",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    expect(localLookup).not.toHaveBeenCalled();
    expect(wrapper.get("h1").text()).toContain("API 陈同学");
  });

  it("loads /member/profile from the API without creating a local draft", async () => {
    const localLookup = vi.spyOn(useMemberProfileStore(), "getProfile");
    const wrapper = mountPage(MemberProfilePage);
    await flushPromises();
    await nextTick();

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/members/me",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    expect(localLookup).not.toHaveBeenCalled();
    expect(wrapper.get("h1").text()).toContain("编辑个人资料");
    expect(wrapper.text()).toContain("API 陈同学");
    expect(wrapper.text()).not.toContain("前端演示预览");
  });
});
