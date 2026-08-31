<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useContentGateway } from "~/composables/useContentGateway";
import { localizeActivityError } from "~/utils/activity-errors";
import type { ActivityRegistrationField, ActivityRegistrationFieldType } from "~/types/activity-registration";

definePageMeta({ layout: "admin" });
useHead({ title: "配置报名字段｜HSD 管理台" });

type TemplateRevision = {
  id: string;
  revisionNumber: number;
  fields: ActivityRegistrationField[];
  publishedAt?: string | null;
  createdAt?: string;
};

type RegistrationTemplate = {
  id: string;
  key?: string;
  version: number;
  workingRevision: TemplateRevision;
  publishedRevision?: TemplateRevision | null;
};

const gateway = useContentGateway();
const loading = ref(false);
const saving = ref(false);
const notice = ref("");
const error = ref("");
const template = ref<RegistrationTemplate>();
const fields = ref<ActivityRegistrationField[]>([]);
const publishedFields = ref<ActivityRegistrationField[]>([]);
const view = ref<"published" | "draft">("draft");

const types: Array<{ value: ActivityRegistrationFieldType; label: string }> = [
  { value: "text", label: "单行文本" }, { value: "textarea", label: "多行文本" }, { value: "phone", label: "联系电话" },
  { value: "number", label: "数字" }, { value: "date", label: "日期" }, { value: "single", label: "单选" },
  { value: "multi", label: "多选" }, { value: "checkbox", label: "确认勾选" },
];

const typeLabels = Object.fromEntries(types.map((type) => [type.value, type.label])) as Record<ActivityRegistrationFieldType, string>;
const publishedRevisionNumber = computed(() => template.value?.publishedRevision?.revisionNumber ?? null);
const hasUnpublishedDraft = computed(() => {
  const working = template.value?.workingRevision;
  const published = template.value?.publishedRevision;
  if (!working) return false;
  return !published || working.revisionNumber !== published.revisionNumber;
});

function cloneFields(value: ActivityRegistrationField[] | undefined): ActivityRegistrationField[] {
  return value ? JSON.parse(JSON.stringify(value)) as ActivityRegistrationField[] : [];
}

function fieldsEqual(left: ActivityRegistrationField[], right: ActivityRegistrationField[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function applyTemplate(value: RegistrationTemplate) {
  template.value = value;
  publishedFields.value = cloneFields(value.publishedRevision?.fields);
  const hasDraft = !value.publishedRevision || value.workingRevision.revisionNumber !== value.publishedRevision.revisionNumber;
  fields.value = cloneFields(hasDraft ? value.workingRevision.fields : value.publishedRevision?.fields);
}

onMounted(async () => {
  if (!gateway) {
    error.value = localizeActivityError(new Error("ACTIVITY_REGISTRATION_TEMPLATE_UNAVAILABLE"));
    return;
  }
  loading.value = true;
  try {
    applyTemplate(await gateway.registrations.template() as RegistrationTemplate);
  } catch (caught) {
    error.value = localizeActivityError(caught);
  } finally {
    loading.value = false;
  }
});

function nextFieldId() {
  const ids = new Set(fields.value.map((field) => field.id));
  let number = fields.value.length + 1;
  while (ids.has(`field_${number}`)) number += 1;
  return `field_${number}`;
}

function addField() {
  fields.value.push({ id: nextFieldId(), type: "text", label: "新字段", required: false, order: fields.value.length + 1 });
}

function removeField(index: number) {
  fields.value.splice(index, 1);
  fields.value.forEach((field, position) => { field.order = position + 1; });
}

function optionsText(field: ActivityRegistrationField) { return field.options?.join("\n") ?? ""; }
function setOptions(field: ActivityRegistrationField, value: string) { field.options = value.split("\n").map((item) => item.trim()).filter(Boolean); }
function normalizeFieldType(field: ActivityRegistrationField) {
  if (field.type !== "single" && field.type !== "multi") { delete field.options; delete field.maxItems; }
  if (field.type !== "text" && field.type !== "textarea" && field.type !== "phone") { delete field.minLength; delete field.maxLength; }
  if (field.type !== "number") { delete field.min; delete field.max; }
}

function reloadPublished() {
  if (!publishedFields.value.length && !fields.value.length) return;
  if (!fieldsEqual(fields.value, publishedFields.value) && !window.confirm("将丢弃当前草稿并载入已发布模板，是否继续？")) return;
  fields.value = cloneFields(publishedFields.value);
  view.value = "draft";
  notice.value = "已载入当前使用中的模板。";
  error.value = "";
}

async function save(publish = false) {
  if (!gateway || !template.value || saving.value) return;
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const saved = await gateway.registrations.saveTemplate({ expectedVersion: template.value.version, fields: cloneFields(fields.value) });
    applyTemplate(saved as RegistrationTemplate);
    if (publish) {
      const released = await gateway.registrations.publishTemplate({ expectedVersion: (saved as RegistrationTemplate).version });
      applyTemplate(released as RegistrationTemplate);
      view.value = "published";
    } else {
      view.value = "draft";
    }
    notice.value = publish ? "报名模板已保存并发布。" : "报名模板草稿已保存。";
  } catch (caught) {
    error.value = localizeActivityError(caught);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="活动管理" title="配置报名字段" description="所有活动共用这一套报名模板；已开启报名的活动继续使用开启时锁定的模板版本。">
      <template #actions><NuxtLink class="button button--ghost" to="/admin/activities/registrations">返回报名名单</NuxtLink></template>
    </AdminPageHeading>

    <section class="admin-list-card admin-registration-template">
      <header>
        <div><span>Shared registration template</span><h2>报名模板</h2></div>
        <p v-if="template">模板版本 {{ template.version }} · 当前使用修订 {{ publishedRevisionNumber ?? "暂无" }}</p>
      </header>
      <div class="admin-template-status">
        <p v-if="loading" role="status">正在加载模板…</p>
        <p v-else-if="error" role="alert">{{ error }}</p>
        <p v-else-if="notice" role="status">{{ notice }}</p>
      </div>

      <nav class="admin-template-tabs" aria-label="报名模板视图">
        <button type="button" :aria-selected="view === 'published'" @click="view = 'published'">当前使用中 <small v-if="publishedRevisionNumber">修订 {{ publishedRevisionNumber }}</small></button>
        <button type="button" :aria-selected="view === 'draft'" @click="view = 'draft'">编辑草稿 <small v-if="hasUnpublishedDraft">未发布</small></button>
      </nav>

      <div v-if="view === 'published'" class="admin-template-current">
        <div class="admin-template-panel-heading"><div><span>Published revision</span><h3>当前使用中的报名字段</h3></div><span v-if="publishedRevisionNumber">修订 {{ publishedRevisionNumber }}</span></div>
        <div v-if="publishedFields.length" class="admin-template-readonly-list">
          <article v-for="(field, index) in publishedFields" :key="`published-${field.id}`">
            <header><strong>字段 {{ index + 1 }} · {{ field.label }}</strong><span>{{ typeLabels[field.type] }}<b v-if="field.required">必填</b></span></header>
            <p v-if="field.helpText">{{ field.helpText }}</p>
            <ul v-if="field.options?.length"><li v-for="option in field.options" :key="option">{{ option }}</li></ul>
          </article>
        </div>
        <p v-else>当前没有已发布的动态字段，成员仍可直接提交报名。</p>
      </div>

      <div v-else class="admin-template-editor">
        <div class="admin-template-panel-heading"><div><span>Working revision</span><h3>编辑草稿</h3></div><span v-if="hasUnpublishedDraft">保存后再发布</span><span v-else>基于当前使用中的模板</span></div>
        <div v-for="(field, index) in fields" :key="field.id + index" class="admin-template-field">
          <div class="admin-template-field__head"><strong>字段 {{ index + 1 }}</strong><button type="button" class="button button--ghost" @click="removeField(index)">删除</button></div>
          <div class="admin-filters"><label>字段 ID<input v-model="field.id" pattern="[a-z][a-z0-9_-]{1,63}" required></label><label>字段名称<input v-model="field.label" maxlength="100" required></label><label>类型<select v-model="field.type" @change="normalizeFieldType(field)"><option v-for="type in types" :key="type.value" :value="type.value">{{ type.label }}</option></select></label><label class="admin-template-required"><input v-model="field.required" type="checkbox"> 必填</label></div>
          <label v-if="field.type === 'single' || field.type === 'multi'">选项（每行一个）<textarea :value="optionsText(field)" rows="3" @input="setOptions(field, ($event.target as HTMLTextAreaElement).value)" /></label>
          <label>填写提示<input v-model="field.helpText" maxlength="500"></label>
        </div>
        <p v-if="!fields.length">当前草稿没有动态字段，成员仍可直接提交报名。</p>
        <div class="admin-template-actions"><button type="button" class="button button--ghost" @click="addField">添加字段</button><button type="button" class="button button--ghost" :disabled="saving" @click="reloadPublished">重新载入当前已发布模板</button><button type="button" class="button button--ghost" :disabled="saving" @click="save(false)">保存草稿</button><button type="button" class="button" :disabled="saving" @click="save(true)">{{ saving ? "保存中…" : "保存并发布" }}</button></div>
      </div>
    </section>
  </div>
</template>
