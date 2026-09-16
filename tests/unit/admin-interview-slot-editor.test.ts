import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import AdminInterviewSlotEditor from "../../app/components/admin/AdminInterviewSlotEditor.vue";

vi.stubGlobal("ref", ref);

describe("AdminInterviewSlotEditor", () => {
  it("uses the admin section hierarchy and a compact add control", () => {
    const wrapper = mount(AdminInterviewSlotEditor, {
      props: {
          modelValue: [],
          currentTime: "2026-09-15T00:00:00.000Z",
      },
    });

    expect(wrapper.find(".eyebrow").exists()).toBe(false);
    expect(wrapper.get(".admin-interview-slot-editor__add").text()).toContain("添加时段");
    expect(wrapper.text()).not.toContain("报名截止后");
  });
});
