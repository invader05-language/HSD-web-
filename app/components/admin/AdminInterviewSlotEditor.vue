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
  currentTime?: string;
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
  errors.value = validateInterviewSlotDrafts(props.modelValue);
  if (errors.value.length || (props.impactMessage && !confirmedImpact.value)) return;
  emit("publish", props.modelValue.map((row) => ({ ...row })));
}

function hasReadySlot() {
  return hasPublishReadyInterviewSlots(props.modelValue.map((row) => ({
    startAt: row.startAt,
    status: "ACTIVE" as const,
  })), props.currentTime || new Date().toISOString());
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
      <div class="admin-interview-slot-editor__heading">
        <span class="admin-interview-slot-editor__index">03</span>
        <div>
          <h2 id="interview-slot-editor-title">面试时段</h2>
          <p>中国标准时间（UTC+8） · 开始和结束时间必填，人数上限选填。</p>
        </div>
      </div>
      <button class="admin-interview-slot-editor__add button button--ghost" type="button" :disabled="disabled" @click="add"><span aria-hidden="true">+</span>添加时段</button>
    </header>
    <p v-if="!modelValue.length" class="admin-empty-copy">尚未配置面试时段。发布前至少添加一个尚未开始的有效时段。</p>
    <div v-for="(row, index) in modelValue" :key="row.id ?? index" class="admin-interview-slot-editor__row">
      <label>开始时间<input :value="row.startAt" type="text" inputmode="numeric" placeholder="2026-09-20 09:00" :disabled="disabled" @input="update(index, { startAt: ($event.target as HTMLInputElement).value })"></label>
      <label>结束时间<input :value="row.endAt" type="text" inputmode="numeric" placeholder="2026-09-20 09:30" :disabled="disabled" @input="update(index, { endAt: ($event.target as HTMLInputElement).value })"></label>
      <label>人数上限<input :value="row.capacity" type="text" inputmode="numeric" placeholder="不限人数" :disabled="disabled" @input="update(index, { capacity: ($event.target as HTMLInputElement).value })"></label>
      <button class="text-link" type="button" :disabled="disabled" :aria-label="`删除第 ${index + 1} 个面试时段`" @click="remove(index)">删除</button>
    </div>
    <p v-if="!hasReadySlot() && modelValue.length" class="form-error" role="alert">至少需要一个尚未开始的有效面试时段。</p>
    <ul v-if="errors.length" class="form-error" role="alert"><li v-for="error in errors" :key="error">{{ error }}</li></ul>
    <label v-if="impactMessage" class="admin-interview-slot-editor__impact"><input v-model="confirmedImpact" type="checkbox" :disabled="disabled">我已确认调整时段会影响 {{ impactMessage }}，受影响报名人需要重新选择。</label>
    <button class="button" type="button" :disabled="disabled || !modelValue.length" @click="publish">保存面试时段</button>
  </section>
</template>

<style scoped>
.admin-interview-slot-editor { display: grid; gap: 1rem; }
.admin-interview-slot-editor__header { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1.25rem; align-items: start; }
.admin-interview-slot-editor__heading { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .7rem; align-items: start; }
.admin-interview-slot-editor__index { color: var(--brand-red, #b1202b); font-size: .72rem; font-weight: 800; letter-spacing: .08em; line-height: 1.5; }
.admin-interview-slot-editor__heading h2 { margin: 0; color: var(--ink, #202328); font-size: 1.15rem; line-height: 1.35; }
.admin-interview-slot-editor__heading p { max-width: 38rem; margin: .3rem 0 0; color: var(--ink-muted, #6f767e); font-size: .82rem; line-height: 1.55; }
.admin-interview-slot-editor__add { min-width: 7rem; min-height: 2.5rem; gap: .45rem; padding-inline: .85rem; border-color: #c7cbd0; background: #fff; color: var(--brand-red, #b1202b); white-space: nowrap; }
.admin-interview-slot-editor__add:hover { border-color: var(--brand-red, #b1202b); background: #fff5f6; color: var(--brand-red, #b1202b); }
.admin-interview-slot-editor__add:focus-visible { outline: 2px solid var(--brand-red, #b1202b); outline-offset: 2px; }
.admin-interview-slot-editor__add span { font-size: 1.15rem; font-weight: 400; line-height: 1; }
.admin-interview-slot-editor__row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: .75rem; align-items: end; padding: .85rem; border: 1px solid var(--line, #ddd); }
.admin-interview-slot-editor__row label { display: grid; gap: .35rem; }
.admin-interview-slot-editor__impact { display: flex; gap: .5rem; align-items: flex-start; }
@media (max-width: 760px) { .admin-interview-slot-editor__row { grid-template-columns: 1fr; } }
@media (max-width: 460px) { .admin-interview-slot-editor__header { grid-template-columns: 1fr; } .admin-interview-slot-editor__add { justify-self: start; } }
</style>
