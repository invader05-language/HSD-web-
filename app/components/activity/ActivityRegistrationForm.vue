<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { ActivityRegistrationAnswers, ActivityRegistrationField, ActivityRegistrationForm } from "~/types/activity-registration";

const props = defineProps<{
  form: ActivityRegistrationForm;
  modelValue?: ActivityRegistrationAnswers;
  identity?: { name: string; studentId: string; account?: string };
  submitting?: boolean;
  serverErrors?: Record<string, string>;
}>();
const emit = defineEmits<{ "update:modelValue": [value: ActivityRegistrationAnswers]; submit: [] }>();
const answers = reactive<ActivityRegistrationAnswers>({ ...(props.modelValue ?? {}) });

watch(() => props.modelValue, (value) => { Object.keys(answers).forEach((key) => delete answers[key]); Object.assign(answers, value ?? {}); }, { deep: true });
const fields = computed(() => [...props.form.fields].sort((left, right) => left.order - right.order));
function setValue(id: string, value: ActivityRegistrationAnswers[string]) { answers[id] = value; emit("update:modelValue", { ...answers }); }
function toggleMulti(field: ActivityRegistrationField, option: string, checked: boolean) {
  const current = Array.isArray(answers[field.id]) ? [...answers[field.id] as string[]] : [];
  const next = checked ? [...new Set([...current, option])] : current.filter((item) => item !== option);
  setValue(field.id, next);
}
function errorFor(field: ActivityRegistrationField) { return props.serverErrors?.[field.id]; }
</script>

<template>
  <form class="activity-registration-form" @submit.prevent="emit('submit')">
    <div class="activity-registration-form__identity" aria-label="报名身份">
      <div><span>姓名</span><strong>{{ identity?.name || "当前登录成员" }}</strong></div>
      <div><span>学号</span><strong>{{ identity?.studentId || "已从账号读取" }}</strong></div>
      <div v-if="identity?.account"><span>账号</span><strong>{{ identity.account }}</strong></div>
    </div>
    <fieldset v-for="field in fields" :key="field.id" :class="{ 'has-error': errorFor(field) }">
      <legend>{{ field.label }}<span v-if="field.required" aria-label="必填">*</span></legend>
      <p v-if="field.helpText" class="field-help">{{ field.helpText }}</p>
      <input
        v-if="['text', 'phone'].includes(field.type)"
        :value="answers[field.id] as string | undefined"
        :type="field.type === 'phone' ? 'tel' : 'text'"
        :required="field.required"
        :maxlength="field.maxLength"
        :minlength="field.minLength"
        @input="setValue(field.id, ($event.target as HTMLInputElement).value)"
      >
      <textarea
        v-else-if="field.type === 'textarea'"
        :value="answers[field.id] as string | undefined"
        :required="field.required"
        :maxlength="field.maxLength"
        :minlength="field.minLength"
        rows="4"
        @input="setValue(field.id, ($event.target as HTMLTextAreaElement).value)"
      />
      <input
        v-else-if="field.type === 'number'"
        :value="answers[field.id] as number | undefined"
        type="number"
        :required="field.required"
        :min="field.min"
        :max="field.max"
        @input="setValue(field.id, ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value))"
      >
      <input
        v-else-if="field.type === 'date'"
        :value="answers[field.id] as string | undefined"
        type="date"
        :required="field.required"
        @input="setValue(field.id, ($event.target as HTMLInputElement).value)"
      >
      <select
        v-else-if="field.type === 'single'"
        :value="answers[field.id] as string | undefined"
        :required="field.required"
        @change="setValue(field.id, ($event.target as HTMLSelectElement).value)"
      >
        <option value="">请选择</option>
        <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
      </select>
      <div v-else-if="field.type === 'multi'" class="activity-registration-form__options">
        <label v-for="option in field.options" :key="option"><input type="checkbox" :checked="Array.isArray(answers[field.id]) && (answers[field.id] as string[]).includes(option)" @change="toggleMulti(field, option, ($event.target as HTMLInputElement).checked)">{{ option }}</label>
      </div>
      <label v-else class="activity-registration-form__checkbox"><input type="checkbox" :checked="answers[field.id] === true" :required="field.required" @change="setValue(field.id, ($event.target as HTMLInputElement).checked)">{{ field.label }}</label>
      <small v-if="errorFor(field)" class="field-error" role="alert">{{ errorFor(field) }}</small>
    </fieldset>
    <button class="button" type="submit" :disabled="submitting">{{ submitting ? "提交中…" : "提交报名" }}</button>
  </form>
</template>
