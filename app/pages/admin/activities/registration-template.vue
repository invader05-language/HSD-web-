<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useContentGateway } from "~/composables/useContentGateway";
import { localizeActivityError } from "~/utils/activity-errors";
import type { ActivityRegistrationField, ActivityRegistrationFieldType } from "~/types/activity-registration";

definePageMeta({ layout: "admin" });
useHead({ title: "配置报名字段｜HSD 管理台" });
const gateway = useContentGateway();
const loading = ref(false); const saving = ref(false); const notice = ref(""); const error = ref("");
const template = ref<{ id: string; version: number; workingRevision: { fields: ActivityRegistrationField[] }; publishedRevision?: { revisionNumber: number } | null }>();
const fields = ref<ActivityRegistrationField[]>([]);
const types: Array<{ value: ActivityRegistrationFieldType; label: string }> = [
  { value: "text", label: "单行文本" }, { value: "textarea", label: "多行文本" }, { value: "phone", label: "联系电话" }, { value: "number", label: "数字" }, { value: "date", label: "日期" }, { value: "single", label: "单选" }, { value: "multi", label: "多选" }, { value: "checkbox", label: "确认勾选" },
];
onMounted(async () => { if (!gateway) return; loading.value = true; try { template.value = await gateway.registrations.template(); fields.value = [...(template.value?.workingRevision.fields ?? [])]; } catch (caught) { error.value = localizeActivityError(caught); } finally { loading.value = false; } });
function addField() { fields.value.push({ id: `field_${fields.value.length + 1}`, type: "text", label: "新字段", required: false, order: fields.value.length + 1 }); }
function removeField(index: number) { fields.value.splice(index, 1); fields.value.forEach((field, position) => { field.order = position + 1; }); }
function optionsText(field: ActivityRegistrationField) { return field.options?.join("\n") ?? ""; }
function setOptions(field: ActivityRegistrationField, value: string) { field.options = value.split("\n").map((item) => item.trim()).filter(Boolean); }
function normalizeFieldType(field: ActivityRegistrationField) {
  if (field.type !== "single" && field.type !== "multi") { delete field.options; delete field.maxItems; }
  if (field.type !== "text" && field.type !== "textarea" && field.type !== "phone") { delete field.minLength; delete field.maxLength; }
  if (field.type !== "number") { delete field.min; delete field.max; }
}
async function save(publish = false) { if (!gateway || !template.value) return; saving.value = true; error.value = ""; notice.value = ""; try { const saved = await gateway.registrations.saveTemplate({ expectedVersion: template.value.version, fields: fields.value }); template.value = saved; fields.value = [...saved.workingRevision.fields]; if (publish) { template.value = await gateway.registrations.publishTemplate({ expectedVersion: saved.version }); } notice.value = publish ? "报名模板已保存并发布。" : "报名模板草稿已保存。"; } catch (caught) { error.value = localizeActivityError(caught); } finally { saving.value = false; } }
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="活动管理" title="配置报名字段" description="所有活动共用这一套报名模板；已开启报名的活动继续使用开启时锁定的模板版本。">
      <template #actions><NuxtLink class="button button--ghost" to="/admin/activities/registrations">返回报名名单</NuxtLink></template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><span>Shared registration template</span><h2>字段草稿</h2></div><p v-if="template">模板版本 {{ template.version }} · 已发布修订 {{ template.publishedRevision?.revisionNumber ?? "暂无" }}</p></header>
      <p v-if="loading" role="status">正在加载模板…</p><p v-if="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
      <div v-for="(field, index) in fields" :key="field.id + index" class="admin-template-field">
        <div class="admin-template-field__head"><strong>字段 {{ index + 1 }}</strong><button type="button" class="button button--ghost" @click="removeField(index)">删除</button></div>
        <div class="admin-filters"><label>字段 ID<input v-model="field.id" pattern="[a-z][a-z0-9_-]{1,63}" required></label><label>字段名称<input v-model="field.label" maxlength="100" required></label><label>类型<select v-model="field.type" @change="normalizeFieldType(field)"><option v-for="type in types" :key="type.value" :value="type.value">{{ type.label }}</option></select></label><label class="admin-template-required"><input v-model="field.required" type="checkbox"> 必填</label></div>
        <label v-if="field.type === 'single' || field.type === 'multi'">选项（每行一个）<textarea :value="optionsText(field)" rows="3" @input="setOptions(field, ($event.target as HTMLTextAreaElement).value)" /></label>
        <label>填写提示<input v-model="field.helpText" maxlength="500"></label>
      </div>
      <p v-if="!fields.length">当前模板没有动态字段，成员仍可直接提交报名。</p>
      <div class="admin-template-actions"><button type="button" class="button button--ghost" @click="addField">添加字段</button><button type="button" class="button button--ghost" :disabled="saving" @click="save(false)">保存草稿</button><button type="button" class="button" :disabled="saving" @click="save(true)">保存并发布</button></div>
    </section>
  </div>
</template>
