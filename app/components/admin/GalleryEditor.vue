<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useGalleryStore } from "~/stores/gallery";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope, getRecruitmentCenterId } from "~/utils/admin-center-scope";
import type { GalleryAsset } from "~/data/gallery";
import type { GalleryCategory, GalleryDraftInput, ManagedGalleryAlbum } from "~/types/gallery";
import type { ContentMediaAttachment } from "~/types/content-media";
import { isContentMediaAttachmentComplete } from "~/utils/content-media";
import ContentMediaUploader from "./ContentMediaUploader.vue";

const props = defineProps<{
  album?: ManagedGalleryAlbum;
  mode: "create" | "edit";
  initialNotice?: string;
}>();

const emit = defineEmits<{
  saved: [id: string];
  published: [id: string];
  cancelled: [];
}>();

const CATEGORY_OPTIONS: GalleryCategory[] = ["活动摄影", "海报设计", "短视频", "人物专访"];
const CENTER_OPTIONS = [
  { id: "baize-development", label: "白泽开发中心" },
  { id: "new-media", label: "新媒体中心" },
  { id: "tuowei-planning", label: "拓维策划中心" },
  { id: "talent-development", label: "人才发展中心" },
] as const;

const galleryStore = useGalleryStore();
const session = useSessionStore();

function defaultOwnerCenterId() {
  if (session.adminLevel === "owner") return "new-media";
  const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return scope ? getRecruitmentCenterId(scope) : "";
}

const form = reactive<GalleryDraftInput>({
  title: "",
  category: "活动摄影",
  year: "2026",
  summary: "",
  team: "",
  ownerCenterId: defaultOwnerCenterId(),
  assets: [],
});
const notice = ref("");
const formError = ref("");
const isSaving = ref(false);
const isPublishing = ref(false);
const mediaItems = computed<ContentMediaAttachment[]>({
  get: () => form.assets.map((asset, index) => ({
    id: asset.id,
    localBlobId: asset.localBlobId,
    role: "detail" as const,
    kind: asset.kind ?? "image",
    title: asset.title,
    caption: asset.caption,
    alt: asset.alt,
    aspect: asset.aspect,
    sortOrder: asset.sortOrder ?? index,
    url: asset.imageUrl,
    thumbnailUrl: asset.thumbnailUrl,
    status: asset.status ?? "ready",
    errorMessage: asset.errorMessage,
  })),
  set: (items: ContentMediaAttachment[]) => {
    form.assets = items.map((item): GalleryAsset => ({
      id: item.id,
      title: item.title,
      caption: item.caption,
      alt: item.alt,
      aspect: item.aspect,
      imageUrl: item.url,
      localBlobId: item.localBlobId,
      thumbnailUrl: item.thumbnailUrl,
      role: "detail",
      kind: item.kind,
      status: item.status,
      sortOrder: item.sortOrder,
      errorMessage: item.errorMessage,
    }));
  },
});

const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.title.trim()) missing.push("标题");
  if (!form.category) missing.push("分类");
  if (!form.year.trim()) missing.push("年份");
  if (!form.ownerCenterId.trim()) missing.push("归属中心");
  if (!form.summary.trim()) missing.push("摘要");
  if (!form.team.trim()) missing.push("制作团队");
  if (!form.assets.length) missing.push("专题素材");
  if (form.assets.some((asset) => !isContentMediaAttachmentComplete({
    id: asset.id,
    role: "detail",
    kind: asset.kind ?? "image",
    title: asset.title,
    caption: asset.caption,
    alt: asset.alt,
    aspect: asset.aspect,
    sortOrder: asset.sortOrder ?? 0,
    url: asset.imageUrl,
    localBlobId: asset.localBlobId,
    thumbnailUrl: asset.thumbnailUrl,
    status: asset.status ?? "ready",
  }))) missing.push("专题素材信息");
  return missing;
});
const isComplete = computed(() => missingFields.value.length === 0);
const ownerOptions = computed(() => session.adminLevel === "owner"
  ? CENTER_OPTIONS
  : CENTER_OPTIONS.filter((center) => center.id === form.ownerCenterId));

function loadAlbum(album?: ManagedGalleryAlbum) {
  Object.assign(form, album ? {
    title: album.title,
    category: album.category,
    year: album.year,
    summary: album.summary,
    team: album.team,
    ownerCenterId: album.ownerCenterId,
    assets: album.assets.map((asset) => ({ ...asset })),
  } : {
    title: "",
    category: "活动摄影" as GalleryCategory,
    year: "2026",
    summary: "",
    team: "",
    ownerCenterId: defaultOwnerCenterId(),
    assets: [],
  });
  formError.value = "";
  notice.value = props.initialNotice ?? "";
}

watch(() => [props.mode, props.album, props.initialNotice], () => loadAlbum(props.album), { immediate: true, deep: true });

function toPayload(): GalleryDraftInput {
  return {
    title: form.title,
    category: form.category,
    year: form.year,
    summary: form.summary,
    team: form.team,
    ownerCenterId: form.ownerCenterId,
    assets: form.assets.map((asset) => ({ ...asset })),
  };
}

function validateForm() {
  formError.value = missingFields.value.length ? `请补充：${missingFields.value.join("、")}` : "";
  return !formError.value;
}

function persistDraft() {
  const payload = toPayload();
  return props.mode === "edit" && props.album
    ? galleryStore.updateDraft(props.album.id, payload)
    : galleryStore.createDraft(payload);
}

function saveDraft() {
  if (isSaving.value || isPublishing.value) return;
  isSaving.value = true;
  formError.value = "";
  try {
    const saved = persistDraft();
    notice.value = "画廊草稿已保存，用户端仍保持原公开版本。";
    emit("saved", saved.id);
  } catch (caught) {
    formError.value = caught instanceof Error ? `保存失败：${caught.message}` : "保存失败。";
  } finally {
    isSaving.value = false;
  }
}

function publishGallery() {
  if (isSaving.value || isPublishing.value || !validateForm()) return;
  isPublishing.value = true;
  try {
    const saved = persistDraft();
    galleryStore.publish(saved.id);
    notice.value = "画廊专题已发布，用户端将渲染最新公开快照。";
    emit("published", saved.id);
  } catch (caught) {
    formError.value = caught instanceof Error ? `发布失败：${caught.message}` : "发布失败。";
  } finally {
    isPublishing.value = false;
  }
}
</script>

<template>
  <section class="admin-list-card admin-gallery-editor" aria-label="画廊编辑器">
    <header>
      <div><span>{{ mode === "create" ? "Draft Editor" : "Gallery Editor" }}</span><h2>{{ mode === "create" ? "新建画廊专题" : "编辑画廊专题" }}</h2></div>
      <p>第一项专题素材会作为画廊列表封面；保存草稿不会改变用户端。</p>
    </header>
    <div class="admin-gallery-editor__body">
      <p v-if="formError" class="admin-save-message admin-save-message--error" role="alert">{{ formError }}</p>
      <p v-else-if="notice" class="admin-save-message" role="status">{{ notice }}</p>
      <div class="admin-editor-grid">
        <label>标题<input v-model="form.title" type="text"></label>
        <label>分类<select v-model="form.category"><option v-for="option in CATEGORY_OPTIONS" :key="option" :value="option">{{ option }}</option></select></label>
        <label>年份<input v-model="form.year" type="text" inputmode="numeric"></label>
        <label>归属中心<select v-model="form.ownerCenterId" :disabled="session.adminLevel !== 'owner'"><option value="">请选择归属中心</option><option v-for="center in ownerOptions" :key="center.id" :value="center.id">{{ center.label }}</option></select></label>
        <label class="is-wide">摘要<textarea v-model="form.summary" rows="3"></textarea></label>
        <label class="is-wide">制作团队<input v-model="form.team" type="text"></label>
      </div>
      <ContentMediaUploader v-model="mediaItems" mode="collection" title="专题素材" description="可直接上传图片或视频；每项都可预览、排序和编辑公开说明。" />
    </div>
    <footer class="admin-drawer__footer">
      <span>{{ isComplete ? "必填信息和素材已完整，可直接发布。" : "草稿可暂存，直接发布前需补齐全部信息和素材。" }}</span>
      <button type="button" class="button button--ghost" :disabled="isSaving || isPublishing" @click="emit('cancelled')">取消</button>
      <button type="button" class="button button--ghost" :disabled="isSaving || isPublishing" @click="saveDraft">保存草稿</button>
      <button type="button" class="button" :disabled="!isComplete || isSaving || isPublishing" @click="publishGallery">{{ isPublishing ? "发布中…" : "直接发布" }}</button>
    </footer>
  </section>
</template>
