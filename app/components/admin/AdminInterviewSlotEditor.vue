<script setup lang="ts">
import {
  createInterviewSlotDraft,
  hasPublishReadyInterviewSlots,
  parseInterviewSlotCapacity,
  validateInterviewSlotDrafts,
} from "~/utils/recruitment-interview-slots";
import type {
  RecruitmentInterviewSlot,
  RecruitmentInterviewSlotDraft,
} from "~/types/recruitment-interview";

const props = withDefaults(defineProps<{
  modelValue: RecruitmentInterviewSlotDraft[];
  registrationEndAt: string;
  impactMessage?: string;
  disabled?: boolean;
}>(), { impactMessage: "", disabled: false });

const emit = defineEmits<{
  "update:modelValue": [value: RecruitmentInterviewSlotDraft[]];
  publish: [value: RecruitmentInterviewSlotDraft[]];
}>();

const errors = ref<string[]>([]);
const confirmedImpact = ref(false);

function update(index: number, patch: Partial<RecruitmentInterviewSlotDraft>) {
  const rows = props.modelValue.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : { ...row });
  emit("update:modelValue", rows);
  errors.value = [];
}

function add() {
  emit("update:modelValue", [...props.modelValue.map((row) => ({ ...row })), createInterviewSlotDraft()]);
}

function remove(index: number) {
  emit("update:modelValue", props.modelValue.filter((_, rowIndex) => rowIndex !== index).map((row) => ({ ...row })));
}

function publish() {
  errors.value = validateInterviewSlotDrafts(props.modelValue, props.registrationEndAt);
  if (errors.value.length || (props.impactMessage && !confirmedImpact.value)) return;
  emit("publish", props.modelValue.map((row) => ({ ...row })));
}

function hasReadySlot() {
  return hasPublishReadyInterviewSlots(props.modelValue.map((row) => ({
    startAt: row.startAt,
    status: "ACTIVE" as const,
  })), props.registrationEndAt);
}

function toSlot(row: RecruitmentInterviewSlotDraft, index: number): RecruitmentInterviewSlot {
  return {
    id: row.id ?? `draft-${index + 1}`,
    startAt: row.startAt,
    endAt: row.endAt,
    timezone: "Asia/Shanghai",
    capacity: parseInterviewSlotCapacity(row.capacity),
    status: "ACTIVE",
    version: 1,
  };
}

defineExpose({ publish, hasReadySlot, toSlot });
</script>

<template>
  <section class="admin-interview-slot-editor" aria-labelledby="interview-slot-editor-title">
    <header class="admin-interview-slot-editor__header">
      <div><span class="eyebrow">Interview slots</span><h2 id="interview-slot-editor-title">面试时段</h2><p>时间按中国标准时间（UTC+8）填写，格式为 YYYY-MM-DD HH:mm。</p></div>
      <button class="button button--ghost" type="button" :disabled="disabled" @click="add">添加时段</button>
    </header>
    <p v-if="!modelValue.length" class="admin-empty-copy">尚未配置面试时段。发布前至少添加一个报名截止后开始的时段。</p>
    <div v-for="(row, index) in modelValue" :key="row.id ?? index" class="admin-interview-slot-editor__row">
      <label>开始时间<input :value="row.startAt" type="text" inputmode="numeric" placeholder="2026-09-20 09:00" :disabled="disabled" @input="update(index, { startAt: ($event.target as HTMLInputElement).value })"></label>
      <label>结束时间<input :value="row.endAt" type="text" inputmode="numeric" placeholder="2026-09-20 09:30" :disabled="disabled" @input="update(index, { endAt: ($event.target as HTMLInputElement).value })"></label>
      <label>人数上限<input :value="row.capacity" type="text" inputmode="numeric" placeholder="不限人数" :disabled="disabled" @input="update(index, { capacity: ($event.target as HTMLInputElement).value })"></label>
      <button class="text-link" type="button" :disabled="disabled" :aria-label="`删除第 ${index + 1} 个面试时段`" @click="remove(index)">删除</button>
    </div>
    <p v-if="!hasReadySlot() && modelValue.length" class="form-error" role="alert">至少需要一个在报名截止后开始的有效面试时段。</p>
    <ul v-if="errors.length" class="form-error" role="alert"><li v-for="error in errors" :key="error">{{ error }}</li></ul>
    <label v-if="impactMessage" class="admin-interview-slot-editor__impact"><input v-model="confirmedImpact" type="checkbox" :disabled="disabled">我已确认调整时段会影响 {{ impactMessage }}，受影响报名人需要重新选择。</label>
    <button class="button" type="button" :disabled="disabled || !modelValue.length" @click="publish">保存面试时段</button>
  </section>
</template>

<style scoped>
.admin-interview-slot-editor { display: grid; gap: 1rem; }
.admin-interview-slot-editor__header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
.admin-interview-slot-editor__row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: .75rem; align-items: end; padding: .85rem; border: 1px solid var(--line, #ddd); }
.admin-interview-slot-editor__row label { display: grid; gap: .35rem; }
.admin-interview-slot-editor__impact { display: flex; gap: .5rem; align-items: flex-start; }
@media (max-width: 760px) { .admin-interview-slot-editor__row { grid-template-columns: 1fr; } .admin-interview-slot-editor__header { display: grid; } }
</style>
