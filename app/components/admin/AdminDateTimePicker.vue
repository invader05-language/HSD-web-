<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import { zhCN } from "date-fns/locale";
import "@vuepic/vue-datepicker/dist/main.css";
import { interviewPickerDateToIso, parseInterviewDraftDate } from "~/utils/interview-datetime";

const props = withDefaults(defineProps<{
  modelValue: string;
  inputId: string;
  label: string;
  disabled?: boolean;
}>(), { disabled: false });

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const pickerHost = ref<HTMLElement | null>(null);

onMounted(() => {
  pickerHost.value?.querySelector<HTMLInputElement>("[data-test-id='dp-input']")?.setAttribute("readonly", "");
});

const pickerValue = computed<Date | null>({
  get: () => parseInterviewDraftDate(props.modelValue),
  set: (value) => emit("update:modelValue", interviewPickerDateToIso(value)),
});
</script>

<template>
  <div ref="pickerHost" class="admin-date-time-picker">
    <VueDatePicker
      v-model="pickerValue"
      :locale="zhCN"
      timezone="Asia/Shanghai"
      :text-input="false"
      :formats="{ input: 'yyyy-MM-dd HH:mm', preview: 'yyyy-MM-dd HH:mm' }"
      :time-config="{ enableTimePicker: true, is24: true, enableSeconds: false, hoursGridIncrement: 1, minutesGridIncrement: 1, minutesIncrement: 1 }"
      :action-row="{ selectBtnLabel: '确定', cancelBtnLabel: '取消', showSelect: true, showCancel: true }"
      :aria-labels="{ input: label, menu: `${label}选择器`, clearInput: `清空${label}`, calendarIcon: `打开${label}日历`, timePicker: `${label}时间` }"
      :input-attrs="{ id: inputId }"
      :disabled="disabled"
      :placeholder="`选择${label}`"
      :teleport="true"
    />
  </div>
</template>

<style scoped>
:deep(.dp__input) {
  min-height: 2.65rem;
  border-color: var(--line, #d7dadd);
  border-radius: 4px;
  color: var(--ink, #202328);
  font: inherit;
}

:deep(.dp__input:focus) {
  border-color: var(--brand-red, #b1202b);
  box-shadow: 0 0 0 2px rgb(177 32 43 / 15%);
}

:deep(.dp__theme_light) {
  --dp-primary-color: var(--brand-red, #b1202b);
  --dp-border-radius: 4px;
}
</style>
