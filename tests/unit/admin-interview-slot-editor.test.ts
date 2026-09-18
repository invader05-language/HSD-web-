import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import AdminInterviewSlotEditor from "../../app/components/admin/AdminInterviewSlotEditor.vue";

vi.stubGlobal("ref", ref);

const DateTimePickerStub = {
  name: "AdminDateTimePicker",
  props: ["modelValue", "inputId", "label", "disabled"],
  template: "<div class='admin-datetime-picker-stub' :data-input-id='inputId' />",
};

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

  it("renders shared date-time controls instead of free-text start and end inputs", () => {
    const wrapper = mount(AdminInterviewSlotEditor, {
      props: {
        modelValue: [{ startAt: "2026-09-20T01:00:00.000Z", endAt: "2026-09-20T01:30:00.000Z", capacity: "" }],
      },
      global: { stubs: { AdminDateTimePicker: DateTimePickerStub } },
    });

    expect(wrapper.findAll(".admin-datetime-picker-stub")).toHaveLength(2);
    expect(wrapper.find('input[placeholder="2026-09-20 09:00"]').exists()).toBe(false);
    expect(wrapper.find('input[placeholder="2026-09-20 09:30"]').exists()).toBe(false);
  });

  it("does not publish a row whose end is not after its start", async () => {
    const wrapper = mount(AdminInterviewSlotEditor, {
      props: {
        modelValue: [{ startAt: "2026-09-20T01:30:00.000Z", endAt: "2026-09-20T01:30:00.000Z", capacity: "" }],
      },
      global: { stubs: { AdminDateTimePicker: DateTimePickerStub } },
    });

    await wrapper.findAll("button").find((button) => button.text() === "保存面试时段")!.trigger("click");
    expect(wrapper.emitted("publish")).toBeUndefined();
    expect(wrapper.text()).toContain("结束时间必须晚于开始时间");
  });
});
