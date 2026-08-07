<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useProjectsStore } from "~/stores/projects";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope, getRecruitmentCenterId } from "~/utils/admin-center-scope";
import { isContentMediaAttachmentComplete } from "~/utils/content-media";
import type { ContentMediaAttachment } from "~/types/content-media";
import type { ManagedProject, ProjectDraftInput } from "~/types/project";
import ContentMediaUploader from "./ContentMediaUploader.vue";

const props = defineProps<{
  project?: ManagedProject;
  mode: "create" | "edit";
  initialNotice?: string;
}>();

const emit = defineEmits<{
  saved: [id: string];
  published: [id: string];
  cancelled: [];
}>();

const CENTER_OPTIONS = [
  { id: "baize-development", label: "白泽开发中心" },
  { id: "new-media", label: "新媒体中心" },
  { id: "tuowei-planning", label: "拓维策划中心" },
  { id: "talent-development", label: "人才发展中心" },
] as const;
const CATEGORY_OPTIONS = ["AI × HarmonyOS", "DeepSeek × HarmonyOS", "校园服务", "软硬件", "媒体创作"] as const;

const projectsStore = useProjectsStore();
const session = useSessionStore();
function defaultOwnerCenterId() {
  if (session.adminLevel === "owner") return "baize-development";
  const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return scope ? getRecruitmentCenterId(scope) : "";
}

type ProjectForm = Omit<ProjectDraftInput, "slug" | "technologies" | "cover" | "details"> & {
  technologies: string;
  cover: ContentMediaAttachment | null;
  details: ContentMediaAttachment[];
};

const form = reactive<ProjectForm>({
  title: "",
  category: CATEGORY_OPTIONS[0],
  year: "2026",
  description: "",
  achievement: "",
  projectStage: "",
  challenge: "",
  solution: "",
  technologies: "",
  memberCount: 1,
  ownerCenterId: defaultOwnerCenterId(),
  cover: null,
  details: [],
});
const notice = ref("");
const formError = ref("");
const isSaving = ref(false);
const isPublishing = ref(false);
const coverItems = computed<ContentMediaAttachment[]>({
  get: () => form.cover ? [form.cover] : [],
  set: (value) => { form.cover = value[0] ?? null; },
});
const detailItems = computed<ContentMediaAttachment[]>({
  get: () => form.details,
  set: (value) => { form.details = value; },
});

function completeDetail(item: ContentMediaAttachment) {
  return item.role === "detail" && isContentMediaAttachmentComplete(item);
}

const missingFields = computed(() => {
  const missing: string[] = [];
  for (const [value, label] of [
    [form.title, "标题"],
    [form.category, "分类"],
    [form.year, "年份"],
    [form.description, "项目简介"],
    [form.achievement, "当前成果"],
    [form.projectStage, "项目阶段"],
    [form.challenge, "问题"],
    [form.solution, "解决方案"],
    [form.technologies, "核心技术"],
    [form.ownerCenterId, "归属中心"],
  ] as const) if (!String(value).trim()) missing.push(label);
  if (form.memberCount < 1) missing.push("项目成员数");
  if (!form.cover || form.cover.role !== "cover" || form.cover.kind !== "image" || !isContentMediaAttachmentComplete(form.cover)) missing.push("项目封面");
  if (form.details.some((item) => !completeDetail(item))) missing.push("详情素材信息");
  return missing;
});
const isComplete = computed(() => missingFields.value.length === 0);
const ownerOptions = computed(() => session.adminLevel === "owner"
  ? CENTER_OPTIONS
  : CENTER_OPTIONS.filter((center) => center.id === form.ownerCenterId));

function loadProject(project?: ManagedProject) {
  Object.assign(form, project ? {
    title: project.title,
    category: project.category,
    year: project.year,
    description: project.description,
    achievement: project.achievement,
    projectStage: project.projectStage,
    challenge: project.challenge,
    solution: project.solution,
    technologies: project.technologies.join("\n"),
    memberCount: project.memberCount,
    ownerCenterId: project.ownerCenterId,
    // Pinia exposes reactive proxies; JSON cloning keeps the form independent
    // from the store and works in browsers where structuredClone rejects them.
    cover: project.cover ? JSON.parse(JSON.stringify(project.cover)) as ContentMediaAttachment : null,
    details: project.details.map((item) => JSON.parse(JSON.stringify(item)) as ContentMediaAttachment),
  } : {
    title: "",
    category: CATEGORY_OPTIONS[0],
    year: "2026",
    description: "",
    achievement: "",
    projectStage: "",
    challenge: "",
    solution: "",
    technologies: "",
    memberCount: 1,
    ownerCenterId: defaultOwnerCenterId(),
    cover: null,
    details: [],
  });
  formError.value = "";
  notice.value = props.initialNotice ?? "";
}

watch(() => [props.mode, props.project, props.initialNotice], () => loadProject(props.project), { immediate: true, deep: true });

function toPayload(): ProjectDraftInput {
  return {
    title: form.title,
    category: form.category,
    year: form.year,
    description: form.description,
    achievement: form.achievement,
    projectStage: form.projectStage,
    challenge: form.challenge,
    solution: form.solution,
    technologies: form.technologies.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
    memberCount: form.memberCount,
    ownerCenterId: form.ownerCenterId,
    cover: form.cover ? JSON.parse(JSON.stringify(form.cover)) as ContentMediaAttachment : null,
    details: form.details.map((item) => JSON.parse(JSON.stringify(item)) as ContentMediaAttachment),
  };
}

function validateForm() {
  formError.value = missingFields.value.length ? `请补充：${missingFields.value.join("、")}` : "";
  return !formError.value;
}

function persistDraft() {
  const payload = toPayload();
  return props.mode === "edit" && props.project
    ? projectsStore.updateDraft(props.project.id, payload)
    : projectsStore.createDraft(payload);
}

function saveDraft() {
  if (isSaving.value || isPublishing.value) return;
  isSaving.value = true;
  formError.value = "";
  try {
    const saved = persistDraft();
    notice.value = "项目草稿已保存，用户端仍保持原公开版本。";
    emit("saved", saved.id);
  } catch (caught) {
    formError.value = caught instanceof Error ? `保存失败：${caught.message}` : "保存失败。";
  } finally {
    isSaving.value = false;
  }
}

function publishProject() {
  if (isSaving.value || isPublishing.value || !validateForm()) return;
  isPublishing.value = true;
  try {
    const saved = persistDraft();
    projectsStore.publish(saved.id);
    notice.value = "项目已发布，用户端将显示最新公开快照。";
    emit("published", saved.id);
  } catch (caught) {
    formError.value = caught instanceof Error ? `发布失败：${caught.message}` : "发布失败。";
  } finally {
    isPublishing.value = false;
  }
}
</script>

<template>
  <section class="admin-list-card admin-project-editor" aria-label="项目编辑器">
    <header>
      <div><span>{{ mode === "create" ? "Draft Editor" : "Project Editor" }}</span><h2>{{ mode === "create" ? "新建项目" : "编辑项目" }}</h2></div>
      <p>保存草稿不会改变用户端；确认发布后才会替换公开快照。</p>
    </header>
    <div class="admin-project-editor__body">
      <p v-if="formError" class="admin-save-message admin-save-message--error" role="alert">{{ formError }}</p>
      <p v-else-if="notice" class="admin-save-message" role="status">{{ notice }}</p>
      <div class="admin-editor-grid">
        <label>标题<input v-model="form.title" type="text"></label>
        <label>分类<select v-model="form.category"><option v-for="option in CATEGORY_OPTIONS" :key="option" :value="option">{{ option }}</option></select></label>
        <label>年份<input v-model="form.year" type="text" inputmode="numeric"></label>
        <label>项目阶段<input v-model="form.projectStage" type="text"></label>
        <label>当前成果<input v-model="form.achievement" type="text"></label>
        <label>项目成员数<input v-model.number="form.memberCount" type="number" min="1"></label>
        <label>归属中心<select v-model="form.ownerCenterId" :disabled="session.adminLevel !== 'owner'"><option value="">请选择归属中心</option><option v-for="center in ownerOptions" :key="center.id" :value="center.id">{{ center.label }}</option></select></label>
        <label class="is-wide">项目简介<textarea v-model="form.description" rows="3"></textarea></label>
        <label class="is-wide">问题<textarea v-model="form.challenge" rows="3"></textarea></label>
        <label class="is-wide">解决方案<textarea v-model="form.solution" rows="3"></textarea></label>
        <label class="is-wide">核心技术<textarea v-model="form.technologies" rows="3" placeholder="每行一个技术方向"></textarea></label>
      </div>
      <ContentMediaUploader v-model="coverItems" mode="cover" title="项目封面" description="项目封面会显示在项目列表、详情页和首页项目槽位。" />
      <ContentMediaUploader v-model="detailItems" mode="collection" title="项目详情素材" description="可选。用于项目成果、过程记录和现场展示。" />
      <section class="admin-project-editor__preview" aria-label="项目公开预览">
        <div><span class="eyebrow">PUBLIC PREVIEW</span><h3>{{ form.title || "项目标题预览" }}</h3><p>{{ form.description || "项目简介会显示在用户端项目卡片。" }}</p></div>
        <ContentMediaView v-if="form.cover" :item="form.cover" preview="thumbnail" :controls="false" />
        <div v-if="form.details.length" class="admin-project-editor__preview-details"><ContentMediaView v-for="item in form.details" :key="item.id" :item="item" preview="thumbnail" :controls="false" /></div>
      </section>
    </div>
    <footer class="admin-drawer__footer">
      <span>{{ isComplete ? "必填信息和封面已完整，可直接发布。" : "草稿可暂存，直接发布前需补齐全部信息和素材。" }}</span>
      <button type="button" class="button button--ghost" :disabled="isSaving || isPublishing" @click="emit('cancelled')">取消</button>
      <button type="button" class="button button--ghost" :disabled="isSaving || isPublishing" @click="saveDraft">保存草稿</button>
      <button type="button" class="button" :disabled="!isComplete || isSaving || isPublishing" @click="publishProject">{{ isPublishing ? "发布中…" : "直接发布" }}</button>
    </footer>
  </section>
</template>
