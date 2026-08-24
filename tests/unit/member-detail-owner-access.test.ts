import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MemberDetailPage from "../../app/pages/admin/members/[id].vue";
import { useSessionStore } from "../../app/stores/session";

describe("member detail owner access", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("reactive", reactive);
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("nextTick", nextTick);
    vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("definePageMeta", vi.fn());
    vi.stubGlobal("useHead", vi.fn());
    vi.stubGlobal("createError", (input: unknown) => input);
    vi.stubGlobal("useRoute", () => ({
      path: "/admin/members/member-private",
      params: { id: "member-private" },
    }));
    vi.stubGlobal("useRuntimeConfig", () => ({
      public: { apiBase: "https://api.example.test", useMockApi: false },
    }));
  });

  it("redirects a non-owner before any sensitive production read starts", async () => {
    useSessionStore().applyApiSession({
      account: {
        id: "center-admin",
        adminLevel: "ADMIN",
        adminCenterId: "center-media",
        capabilities: ["member.create"],
      },
      person: { id: "person-admin", name: "中心管理员", status: "FORMAL_MEMBER" },
      mustChangePassword: false,
    });
    const navigateTo = vi.fn();
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(
      JSON.stringify({ items: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("navigateTo", navigateTo);
    vi.stubGlobal("fetch", fetcher);

    const wrapper = mount(MemberDetailPage, { global: { stubs: {
      AdminPageHeading: true,
      AdminOrganizationPositionActionDialog: true,
      NuxtLink: true,
    } } });
    await flushPromises();
    await nextTick();

    expect(navigateTo).toHaveBeenCalledWith(
      "/admin/forbidden?from=%2Fadmin%2Fmembers%2Fmember-private",
      { replace: true },
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain("手机号");
    expect(wrapper.text()).not.toContain("组织职务");
  });
});
