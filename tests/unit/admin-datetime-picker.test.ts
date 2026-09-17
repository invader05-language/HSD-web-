import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AdminDateTimePicker from "../../app/components/admin/AdminDateTimePicker.vue";

const DatePickerStub = vi.hoisted(() => ({
  name: "VueDatePicker",
  props: ["modelValue", "locale", "timezone", "textInput", "formats", "timeConfig", "actionRow", "inputAttrs", "ariaLabels", "readonly", "teleport"],
  emits: ["update:modelValue"],
  template: `<button type="button" data-testid="picker" @click="$emit('update:modelValue', new Date('2026-09-20T09:07:00+08:00'))">pick</button>`,
}));

vi.mock("@vuepic/vue-datepicker", () => ({ VueDatePicker: DatePickerStub }));

describe("AdminDateTimePicker", () => {
  it("configures a Chinese, 24-hour picker without text entry", () => {
    const wrapper = mount(AdminDateTimePicker, {
      props: { modelValue: "", inputId: "slot-start-1", label: "开始时间" },
      global: { stubs: { VueDatePicker: DatePickerStub } },
    });
    const picker = wrapper.findComponent({ name: "VueDatePicker" });
    expect(picker.exists()).toBe(true);

    expect(picker.props("timezone")).toBe("Asia/Shanghai");
    expect(picker.props("textInput")).toBe(false);
    expect(picker.props("timeConfig")).toMatchObject({ is24: true, enableSeconds: false, minutesIncrement: 1 });
    expect(picker.props("actionRow")).toMatchObject({ selectBtnLabel: "确定", cancelBtnLabel: "取消" });
    expect(picker.props("inputAttrs")).toMatchObject({ id: "slot-start-1" });
    expect(picker.props("ariaLabels")).toMatchObject({ input: "开始时间", menu: "开始时间选择器", clearInput: "清空开始时间" });
  });

  it("emits a canonical ISO value after a picker selection and clears explicitly", async () => {
    const wrapper = mount(AdminDateTimePicker, {
      props: { modelValue: "", inputId: "slot-start-1", label: "开始时间" },
      global: { stubs: { VueDatePicker: DatePickerStub } },
    });
    await wrapper.get('[data-testid="picker"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-09-20T01:07:00.000Z"]]);
    await wrapper.findComponent({ name: "VueDatePicker" }).vm.$emit("update:modelValue", null);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([""]);
  });
});
