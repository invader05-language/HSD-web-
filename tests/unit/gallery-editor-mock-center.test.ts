import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { onMounted, ref } from "vue";

vi.mock("../../app/composables/useContentGateway", () => ({ useContentGateway: () => undefined }));
vi.mock("../../app/composables/useOrganizationGateway", () => ({ useOrganizationGateway: () => undefined }));

import GalleryEditor from "../../app/components/admin/GalleryEditor.vue";
import { useSessionStore } from "../../app/stores/session";

describe("GalleryEditor mock center scope", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("onMounted", onMounted);
  });

  it("maps a Talent Development mock admin's new Gallery draft to the talent center", () => {
    useSessionStore().signIn("disabled-admin");

    const wrapper = mount(GalleryEditor, {
      props: { mode: "create" },
      global: { stubs: { ContentMediaUploader: true } },
    });

    expect((wrapper.findAll("select")[1]!.element as HTMLSelectElement).value).toBe("talent-development");
  });
});
