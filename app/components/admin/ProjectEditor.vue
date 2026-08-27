<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useProjectsStore } from "~/stores/projects";
import { useContentGateway } from "~/composables/useContentGateway";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope, getRecruitmentCenterId } from "~/utils/admin-center-scope";
import { isContentMediaAttachmentComplete, isRetainedServerContentMediaAttachment } from "~/utils/content-media";
import type { ContentMediaAttachment } from "~/types/content-media";
import { PROJECT_CATEGORY_LABELS, type ManagedProject, type ProjectCategory, type ProjectDraftInput, type ProjectMember } from "~/types/project";
import ContentMediaUploader from "./ContentMediaUploader.vue";
import { useAdminToast } from "~/composables/useAdminToast";

const props = defineProps<{
  project?: ManagedProject;
  mode: "create" | "edit";
  initialNotice?: string;
}>();

const emit = defineEmits<{
  saved: [id: string];
  published: [id: string];
  offline: [id: string];
  cancelled: [];
}>();

const CENTER_OPTIONS = [
  { id: "baize-development", label: "白泽开发中心" },
  { id: "new-media", label: "新媒体中心" },
  { id: "tuowei-planning", label: "拓维策划中心" },
  { id: "talent-development", label: "人才发展中心" },
] as const;
const CATEGORY_OPTIONS = Object.entries(PROJECT_CATEGORY_LABELS) as Array<[ProjectCategory, string]>;
const DEFAULT_PROJECT_CATEGORY: ProjectCategory = "CAMPUS_SERVICE";

const projectsStore = useProjectsStore();
const gateway = useContentGateway();
const organizationGateway = useOrganizationGateway();
const session = useSessionStore();
const adminToast = useAdminToast();
function defaultOwnerCenterId() {
  if (session.currentAccount?.adminCenterId) return session.currentAccount.adminCenterId;
  if (gateway) return "";
  if (session.adminLevel === "owner") return "baize-development";
  const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return scope ? getRecruitmentCenterId(scope) : "";
}

type ProjectForm = Omit<ProjectDraftInput, "slug" | "members" | "cover" | "details"> & {
  cover: ContentMediaAttachment | null;
  details: ContentMediaAttachment[];
};

const form = reactive<ProjectForm>({
  title: "",
  category: DEFAULT_PROJECT_CATEGORY,
  year: "2026",
  description: "",
  achievement: "",
  projectStage: "",
  challenge: "",
  solution: "",
  memberPersonIds: [],
  memberNames: [],
  displayOrder: 9999,
  ownerCenterId: defaultOwnerCenterId(),
  cover: null,
  details: [],
});
const notice = ref("");
const formError = ref("");
const isSaving = ref(false);
const isPublishing = ref(false);
const isOfflining = ref(false);
const coverItems = computed<ContentMediaAttachment[]>({
  get: () => form.cover ? [form.cover] : [],
  set: (value) => { form.cover = value[0] ?? null; },
});
const detailItems = computed<ContentMediaAttachment[]>({
  get: () => form.details,
  set: (value) => { form.details = value.slice(0, 12); },
});
const centerOptions = ref<Array<{ id: string; label: string }>>([...CENTER_OPTIONS]);
const memberNameInput = ref("");
const selectedMembers = computed<ProjectMember[]>(() => form.memberNames.map((name, index) => ({ name, ...(form.memberPersonIds[index] ? { personId: form.memberPersonIds[index] } : {}) })));
const mediaOwner = computed(() => props.project ? { centerId: props.project.ownerCenterId, ownerType: "project" as const, ownerId: props.project.id } : undefined);

function completeDetail(item: ContentMediaAttachment) {
  return item.role === "detail" && (isRetainedServerContentMediaAttachment(item) || isContentMediaAttachmentComplete(item));
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
    [form.ownerCenterId, "归属中心"],
  ] as const) if (!String(value).trim()) missing.push(label);
  if (!form.memberNames.length) missing.push("项目成员");
  if (!form.cover || form.cover.role !== "cover" || (!isRetainedServerContentMediaAttachment(form.cover) && (form.cover.kind !== "image" || !isContentMediaAttachmentComplete(form.cover)))) missing.push("项目封面");
  if (form.details.some((item) => !completeDetail(item))) missing.push("详情素材信息");
  return missing;
});
const isComplete = computed(() => missingFields.value.length === 0);
const ownerOptions = computed(() => session.adminLevel === "owner"
  ? centerOptions.value
  : centerOptions.value.filter((center) => center.id === (session.currentAccount?.adminCenterId ?? form.ownerCenterId)));

onMounted(async () => {
  if (!organizationGateway) return;
  try {
    const response = await organizationGateway.listCenters();
    centerOptions.value = response.items.map((center) => ({ id: center.id, label: center.name }));
    const assignedCenterId = session.currentAccount?.adminCenterId;
    if (assignedCenterId) form.ownerCenterId = assignedCenterId;
    else if (props.mode === "create" && !centerOptions.value.some((center) => center.id === form.ownerCenterId)) form.ownerCenterId = centerOptions.value[0]?.id ?? "";
  } catch (caught) { formError.value = caught instanceof Error ? `中心加载失败：${caught.message}` : "中心加载失败。"; }
});

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
    memberPersonIds: [...project.memberPersonIds],
    memberNames: [...(project.memberNames?.length ? project.memberNames : project.members.map((member) => member.name))],
    displayOrder: project.displayOrder,
    ownerCenterId: project.ownerCenterId,
    // Pinia exposes reactive proxies; JSON cloning keeps the form independent
    // from the store and works in browsers where structuredClone rejects them.
    cover: project.cover ? JSON.parse(JSON.stringify(project.cover)) as ContentMediaAttachment : null,
    details: project.details.map((item) => JSON.parse(JSON.stringify(item)) as ContentMediaAttachment),
  } : {
    title: "",
    category: DEFAULT_PROJECT_CATEGORY,
    year: "2026",
    description: "",
    achievement: "",
    projectStage: "",
    challenge: "",
    solution: "",
    memberPersonIds: [],
    memberNames: [],
    displayOrder: 9999,
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
    memberPersonIds: [...form.memberPersonIds],
    memberNames: [...form.memberNames],
    members: selectedMembers.value,
    displayOrder: form.displayOrder,
    ownerCenterId: form.ownerCenterId,
    cover: form.cover ? JSON.parse(JSON.stringify(form.cover)) as ContentMediaAttachment : null,
    details: form.details.map((item) => JSON.parse(JSON.stringify(item)) as ContentMediaAttachment),
  };
}

function addMemberName() {
  const name = memberNameInput.value.trim();
  if (!name || form.memberNames.includes(name)) {
    memberNameInput.value = "";
    return;
  }
  form.memberNames.push(name);
  memberNameInput.value = "";
}

function onMemberNameKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" || event.key === "," || event.key === "，") {
    event.preventDefault();
    addMemberName();
  }
}

function removeMemberName(index: number) {
  form.memberNames.splice(index, 1);
  form.memberPersonIds.splice(index, 1);
}

function validateForm() {
  formError.value = missingFields.value.length ? `请补充：${missingFields.value.join("、")}` : "";
  return !formError.value;
}

async function persistDraft() {
  const payload = toPayload();
  if (gateway) return props.mode === "edit" && props.project
    ? projectsStore.updateDraftFromApi(gateway, props.project.id, payload)
    : projectsStore.createDraftFromApi(gateway, payload);
  return props.mode === "edit" && props.project
    ? projectsStore.updateDraft(props.project.id, payload)
    : projectsStore.createDraft(payload);
}

async function saveDraft() {
  if (isSaving.value || isPublishing.value) return;
  isSaving.value = true;
  formError.value = "";
  try {
    const saved = await persistDraft();
    notice.value = "项目草稿已保存，用户端仍保持原公开版本。";
    adminToast.success(notice.value);
    emit("saved", saved.id);
  } catch (caught) {
    formError.value = caught instanceof Error ? `保存失败：${caught.message}` : "保存失败。";
  } finally {
    isSaving.value = false;
  }
}

async function publishProject() {
  if (isSaving.value || isPublishing.value || !validateForm()) return;
  isPublishing.value = true;
  try {
    const saved = await persistDraft();
    if (gateway) await projectsStore.publishFromApi(gateway, saved.id);
    else projectsStore.publish(saved.id);
    notice.value = "项目已发布，用户端将显示最新公开快照。";
    adminToast.success(notice.value);
    emit("published", saved.id);
  } catch (caught) {
    formError.value = caught instanceof Error ? `发布失败：${caught.message}` : "发布失败。";
  } finally {
    isPublishing.value = false;
  }
}

async function offlineProject() {
  if (!props.project || isSaving.value || isPublishing.value || isOfflining.value) return;
  isOfflining.value = true; formError.value = "";
  try {
    if (gateway) await projectsStore.offlineFromApi(gateway, props.project.id, "管理员下线");
    else projectsStore.unpublish(props.project.id, "管理员下线");
    notice.value = "项目已下线，公开页面不再显示该项目。";
    adminToast.success(notice.value);
    emit("offline", props.project.id);
  } catch (caught) { formError.value = caught instanceof Error ? `下线失败：${caught.message}` : "下线失败。"; }
  finally { isOfflining.value = false; }
}
</script>

<template>
  <section class="admin-list-card admin-project-editor" aria-label="项目编辑器">
    <header>
      <div><span>{{ mode === "create" ? "新建项目" : "项目编辑" }}</span><h2>{{ mode === "create" ? "新建项目" : "编辑项目" }}</h2></div>
      <p>保存草稿不会改变用户端；确认发布后才会替换公开快照。</p>
    </header>
    <div class="admin-project-editor__body">
      <p v-if="formError" class="admin-save-message admin-save-message--error" role="alert">{{ formError }}</p>
      <div class="admin-editor-grid">
        <label>标题<input v-model="form.title" type="text"></label>
        <label>分类<select v-model="form.category"><option v-for="[code, label] in CATEGORY_OPTIONS" :key="code" :value="code">{{ label }}</option></select></label>
        <label>年份<input v-model="form.year" type="text" inputmode="numeric"></label>
        <label>项目阶段<input v-model="form.projectStage" type="text"></label>
        <label>当前成果<input v-model="form.achievement" type="text"></label>
        <label class="is-wide">项目成员
          <div class="project-member-input">
            <input v-model="memberNameInput" aria-label="项目成员姓名" placeholder="填写成员姓名，按 Enter 添加" @keydown="onMemberNameKeydown">
            <button type="button" class="button button--text" @click="addMemberName">添加</button>
          </div>
          <div v-if="form.memberNames.length" class="project-member-tags" aria-label="已添加项目成员">
            <span v-for="(name, index) in form.memberNames" :key="`${name}-${index}`" class="project-member-tag">
              {{ name }}
              <button type="button" :aria-label="`移除成员 ${name}`" @click="removeMemberName(index)">×</button>
            </span>
          </div>
          <small>直接填写成员姓名即可，公开页面只展示姓名。</small>
        </label>
        <label>展示排序<input v-model.number="form.displayOrder" data-testid="project-display-order" type="number" min="0"></label>
        <label>归属中心<select v-model="form.ownerCenterId" :disabled="session.adminLevel !== 'owner'"><option value="">请选择归属中心</option><option v-for="center in ownerOptions" :key="center.id" :value="center.id">{{ center.label }}</option></select></label>
        <label class="is-wide">项目简介<textarea v-model="form.description" rows="3"></textarea></label>
        <label class="is-wide">问题<textarea v-model="form.challenge" rows="3"></textarea></label>
        <label class="is-wide">解决方案<textarea v-model="form.solution" rows="3"></textarea></label>
      </div>
      <ContentMediaUploader v-model="coverItems" mode="cover" :owner="mediaOwner" title="项目封面" description="项目封面会显示在项目列表、详情页和首页项目槽位。" />
      <ContentMediaUploader v-model="detailItems" mode="collection" :owner="mediaOwner" title="项目详情素材" description="可选。用于项目成果、过程记录和现场展示。" />
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
      <button v-if="mode === 'edit' && project?.publicationStatus === 'published'" type="button" class="button button--ghost" :disabled="isSaving || isPublishing || isOfflining" @click="offlineProject">{{ isOfflining ? "下线中…" : "下线项目" }}</button>
      <button type="button" class="button" :disabled="!isComplete || isSaving || isPublishing" @click="publishProject">{{ isPublishing ? "发布中…" : "直接发布" }}</button>
    </footer>
  </section>
</template>
