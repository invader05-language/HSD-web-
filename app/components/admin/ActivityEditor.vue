<script setup lang="ts">
import { ACTIVITY_TIME_OPTIONS, ACTIVITY_TYPE_OPTIONS } from "~/data/activities";
import { useActivitiesStore } from "~/stores/activities";
import { useContentGateway } from "~/composables/useContentGateway";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope, getRecruitmentCenterId } from "~/utils/admin-center-scope";
import type { ActivityDraftInput, ManagedActivity } from "~/types/activity";
import type { ContentMediaAttachment } from "~/types/content-media";
import { isContentMediaAttachmentComplete, isRetainedServerContentMediaAttachment } from "~/utils/content-media";
import ContentMediaUploader from "./ContentMediaUploader.vue";

const props = defineProps<{
  activity?: ManagedActivity;
  mode: "create" | "edit";
  initialNotice?: string;
}>();

const emit = defineEmits<{
  saved: [id: string];
  published: [id: string];
  offline: [id: string];
  cancelled: [];
}>();

const activitiesStore = useActivitiesStore();
const gateway = useContentGateway();
const organizationGateway = useOrganizationGateway();
const session = useSessionStore();

const CENTER_OPTIONS = [
  { id: "baize-development", label: "白泽开发中心" },
  { id: "new-media", label: "新媒体中心" },
  { id: "tuowei-planning", label: "拓维策划中心" },
  { id: "talent-development", label: "人才发展中心" },
] as const;

type ActivityForm = Omit<ActivityDraftInput, "slug" | "agenda" | "cover" | "details"> & {
  agenda: string;
  cover: ContentMediaAttachment | null;
  details: ContentMediaAttachment[];
};

function defaultOwnerCenterId() {
  if (session.currentAccount?.adminCenterId) return session.currentAccount.adminCenterId;
  if (gateway) return "";
  if (session.adminLevel === "owner") return "baize-development";
  const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return scope ? getRecruitmentCenterId(scope) : "";
}

function emptyForm(): ActivityForm {
  return {
    title: "",
    type: ACTIVITY_TYPE_OPTIONS[0],
    date: "",
    time: "",
    location: "",
    summary: "",
    content: "",
    agenda: "",
    cover: null,
    details: [],
    ownerCenterId: defaultOwnerCenterId(),
    registrationEndAt: "",
  };
}

const form = reactive<ActivityForm>(emptyForm());
const centerOptions = ref<Array<{ id: string; label: string }>>([...CENTER_OPTIONS]);
const formError = ref("");
const fieldErrors = ref<Record<string, string>>({});
const notice = ref("");
const isSaving = ref(false);
const isPublishing = ref(false);
const isOfflining = ref(false);
const coverItems = computed<ContentMediaAttachment[]>({
  get: () => form.cover ? [form.cover] : [],
  set: (value) => { form.cover = value[0] ?? null; },
});
const detailItems = computed<ContentMediaAttachment[]>({
  get: () => form.details,
  set: (value) => { form.details = value; },
});
const mediaOwner = computed(() => props.activity ? { centerId: props.activity.ownerCenterId, ownerType: "activity" as const, ownerId: props.activity.id } : undefined);

const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.title.trim()) missing.push("标题");
  if (!form.type.trim()) missing.push("分类");
  if (!form.date.trim()) missing.push("日期");
  if (!form.time.trim()) missing.push("时间");
  if (!form.location.trim()) missing.push("地点");
  if (!form.registrationEndAt.trim()) missing.push("报名截止");
  if (!form.ownerCenterId.trim()) missing.push("归属中心");
  if (!form.summary.trim()) missing.push("摘要");
  if (!form.content.trim()) missing.push("活动内容");
  if (!form.agenda.split(/\r?\n/).some((item) => item.trim())) missing.push("活动流程");
  if (!form.cover || form.cover.role !== "cover" || (!isRetainedServerContentMediaAttachment(form.cover) && (form.cover.kind !== "image" || !isContentMediaAttachmentComplete(form.cover)))) missing.push("活动封面");
  if (form.details.some((item) => item.role !== "detail" || (!isRetainedServerContentMediaAttachment(item) && !isContentMediaAttachmentComplete(item)))) missing.push("详情素材信息");
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

function loadActivity(activity?: ManagedActivity) {
  const source = activity ? {
    title: activity.title,
    type: activity.type,
    date: activity.date,
    time: activity.time,
    location: activity.location,
    summary: activity.summary,
    content: activity.content,
    agenda: activity.agenda.join("\n"),
    // Pinia exposes reactive proxies; JSON cloning keeps the form independent
    // from the store and works in browsers where structuredClone rejects them.
    cover: activity.cover ? JSON.parse(JSON.stringify(activity.cover)) as ContentMediaAttachment : null,
    details: activity.details.map((item) => JSON.parse(JSON.stringify(item)) as ContentMediaAttachment),
    ownerCenterId: activity.ownerCenterId,
    registrationEndAt: activity.registrationEndAt,
  } : emptyForm();
  Object.assign(form, source);
  formError.value = "";
  fieldErrors.value = {};
  notice.value = props.initialNotice ?? "";
}

watch(() => [props.mode, props.activity, props.initialNotice], () => loadActivity(props.activity), { immediate: true, deep: true });

function toPayload(): ActivityDraftInput {
  return {
    title: form.title,
    type: form.type,
    date: form.date,
    time: form.time,
    location: form.location,
    summary: form.summary,
    content: form.content,
    agenda: form.agenda.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    cover: form.cover ? JSON.parse(JSON.stringify(form.cover)) as ContentMediaAttachment : null,
    details: form.details.map((item) => JSON.parse(JSON.stringify(item)) as ContentMediaAttachment),
    ownerCenterId: form.ownerCenterId,
    registrationEndAt: form.registrationEndAt,
  };
}

function validateForm() {
  const errors: Record<string, string> = {};
  for (const field of missingFields.value) errors[field] = `${field}不能为空`;
  fieldErrors.value = errors;
  formError.value = missingFields.value.length ? `请补充：${missingFields.value.join("、")}` : "";
  return missingFields.value.length === 0;
}

async function persistDraft() {
  const payload = toPayload();
  if (gateway) return props.mode === "edit" && props.activity
    ? activitiesStore.updateDraftFromApi(gateway, props.activity.id, payload)
    : activitiesStore.createDraftFromApi(gateway, payload);
  return props.mode === "edit" && props.activity
    ? activitiesStore.updateDraft(props.activity.id, payload)
    : activitiesStore.createDraft(payload);
}

async function saveDraft() {
  if (isSaving.value || isPublishing.value) return;
  isSaving.value = true;
  formError.value = "";
  try {
    const saved = await persistDraft();
    notice.value = "草稿已保存。发布前的编辑不会影响用户端。";
    emit("saved", saved.id);
  } catch (caught) {
    notice.value = "";
    formError.value = caught instanceof Error ? `保存失败：${caught.message}` : "保存失败。";
  } finally {
    isSaving.value = false;
  }
}

async function publishActivity() {
  if (isSaving.value || isPublishing.value) return;
  if (!validateForm()) return;
  isPublishing.value = true;
  notice.value = "";
  try {
    const saved = await persistDraft();
    if (gateway) await activitiesStore.publishFromApi(gateway, saved.id);
    else activitiesStore.publish(saved.id);
    notice.value = "活动已发布，用户端将显示最新公开快照。";
    emit("published", saved.id);
  } catch (caught) {
    formError.value = caught instanceof Error ? `发布失败：${caught.message}` : "发布失败。";
  } finally {
    isPublishing.value = false;
  }
}

async function offlineActivity() {
  if (!props.activity || isSaving.value || isPublishing.value || isOfflining.value) return;
  isOfflining.value = true; formError.value = "";
  try {
    if (gateway) await activitiesStore.offlineFromApi(gateway, props.activity.id, "管理员下线");
    else activitiesStore.unpublish(props.activity.id, "管理员下线");
    notice.value = "活动已下线，报名已关闭。";
    emit("offline", props.activity.id);
  } catch (caught) { formError.value = caught instanceof Error ? `下线失败：${caught.message}` : "下线失败。"; }
  finally { isOfflining.value = false; }
}
</script>

<template>
  <section class="admin-list-card admin-activity-editor" aria-label="活动编辑器">
    <header>
      <div><span>{{ mode === "create" ? "Draft Editor" : "Activity Editor" }}</span><h2>{{ mode === "create" ? "新建活动" : "编辑活动" }}</h2></div>
      <p>保存草稿不会改变用户端；确认发布后才会替换公开快照。</p>
    </header>
    <div class="admin-activity-editor__body">
      <p v-if="formError" class="admin-save-message admin-save-message--error" role="alert">{{ formError }}</p>
      <p v-else-if="notice" class="admin-save-message" role="status">{{ notice }}</p>
      <div class="admin-editor-grid">
        <label>标题<input v-model="form.title" type="text" autocomplete="off"></label>
        <label>分类<select v-model="form.type"><option v-for="option in ACTIVITY_TYPE_OPTIONS" :key="option" :value="option">{{ option }}</option></select></label>
        <label>日期<input v-model="form.date" type="date"></label>
        <label>时间<select v-model="form.time"><option value="">请选择时间段</option><option v-for="option in ACTIVITY_TIME_OPTIONS" :key="option" :value="option">{{ option }}</option></select></label>
        <label>地点<input v-model="form.location" type="text"></label>
        <label>报名截止<input v-model="form.registrationEndAt" type="datetime-local"></label>
        <label>归属中心<select v-model="form.ownerCenterId" :disabled="session.adminLevel !== 'owner'"><option value="">请选择归属中心</option><option v-for="center in ownerOptions" :key="center.id" :value="center.id">{{ center.label }}</option></select></label>
        <label class="is-wide">摘要<textarea v-model="form.summary" rows="3"></textarea></label>
        <label class="is-wide">活动内容<textarea v-model="form.content" rows="3"></textarea></label>
        <label class="is-wide">活动流程<textarea v-model="form.agenda" rows="4" placeholder="每行一个环节"></textarea></label>
      </div>
      <ContentMediaUploader
        v-model="coverItems"
        mode="cover"
        :owner="mediaOwner"
        title="活动封面"
        description="封面会出现在活动列表、活动详情页和公开导航中。"
      />
      <ContentMediaUploader
        v-model="detailItems"
        mode="collection"
        :owner="mediaOwner"
        title="活动详情素材"
        description="可选。用于活动详情中的现场照片、视频或补充记录。"
      />
    </div>
    <footer class="admin-drawer__footer">
      <span>{{ isComplete ? "必填信息已完整，可直接发布。" : "草稿可暂存，直接发布前需补齐全部信息。" }}</span>
      <button type="button" class="button button--ghost" :disabled="isSaving || isPublishing" @click="emit('cancelled')">取消</button>
      <button type="button" class="button button--ghost" :disabled="isSaving || isPublishing" @click="saveDraft">保存草稿</button>
      <button v-if="mode === 'edit' && activity?.publishedState === 'published'" type="button" class="button button--ghost" :disabled="isSaving || isPublishing || isOfflining" @click="offlineActivity">{{ isOfflining ? "下线中…" : "下线活动" }}</button>
      <button type="button" class="button" :disabled="!isComplete || isSaving || isPublishing" @click="publishActivity">{{ isPublishing ? "发布中…" : "直接发布" }}</button>
    </footer>
  </section>
</template>
