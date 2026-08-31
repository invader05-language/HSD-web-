<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useGalleryStore } from "~/stores/gallery";
import { useContentGateway } from "~/composables/useContentGateway";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope, getRecruitmentCenterId } from "~/utils/admin-center-scope";
import type { GalleryAsset } from "~/data/gallery";
import { GALLERY_CATEGORY_CODES, galleryCategoryLabel, normalizeGalleryCategory, type GalleryCategory, type GalleryDraftInput, type ManagedGalleryAlbum } from "~/types/gallery";
import type { ContentMediaAttachment } from "~/types/content-media";
import { isContentMediaAttachmentComplete, isRetainedServerContentMediaAttachment } from "~/utils/content-media";
import ContentMediaUploader from "./ContentMediaUploader.vue";
import { useAdminToast } from "~/composables/useAdminToast";
import { localizeGalleryError } from "~/utils/gallery-errors";

const props = defineProps<{
  album?: ManagedGalleryAlbum;
  mode: "create" | "edit";
  initialNotice?: string;
}>();

const emit = defineEmits<{
  saved: [id: string];
  published: [id: string];
  offline: [id: string];
  cancelled: [];
}>();

const CATEGORY_OPTIONS = [...GALLERY_CATEGORY_CODES];
const CENTER_OPTIONS = [
  { id: "baize-development", label: "白泽开发中心" },
  { id: "new-media", label: "新媒体中心" },
  { id: "tuowei-planning", label: "拓维策划中心" },
  { id: "talent-development", label: "人才发展中心" },
] as const;

const galleryStore = useGalleryStore();
const gateway = useContentGateway();
const organizationGateway = useOrganizationGateway();
const session = useSessionStore();
const adminToast = useAdminToast();

function defaultOwnerCenterId() {
  if (session.currentAccount?.adminCenterId) return session.currentAccount.adminCenterId;
  if (gateway) return "";
  if (session.adminLevel === "owner") return "new-media";
  const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return scope ? getRecruitmentCenterId(scope) : "";
}

const form = reactive<GalleryDraftInput>({
  title: "",
  category: "event_documentary",
  year: "2026",
  summary: "",
  team: "",
  ownerCenterId: defaultOwnerCenterId(),
  cover: null,
  assets: [],
});
const coverItems = computed<ContentMediaAttachment[]>({
  get: () => form.cover ? [{ id: form.cover.id, localBlobId: form.cover.localBlobId, role: "cover" as const, kind: form.cover.kind ?? "image", title: form.cover.title, caption: form.cover.caption, alt: form.cover.alt, aspect: form.cover.aspect, sortOrder: 0, url: form.cover.imageUrl, thumbnailUrl: form.cover.thumbnailUrl, status: form.cover.status ?? "ready", errorMessage: form.cover.errorMessage, serverOwned: form.cover.serverOwned, version: form.cover.version }] : [],
  set: (items: ContentMediaAttachment[]) => {
    const item = items[0];
    form.cover = item ? { id: item.id, title: item.title, caption: item.caption, alt: item.alt, aspect: item.aspect, imageUrl: item.url, localBlobId: item.localBlobId, thumbnailUrl: item.thumbnailUrl, role: "cover", kind: item.kind, status: item.status, sortOrder: 0, errorMessage: item.errorMessage, serverOwned: item.serverOwned, version: item.version } : null;
  },
});
const centerOptions = ref<Array<{ id: string; label: string }>>([...CENTER_OPTIONS]);
const notice = ref("");
const formError = ref("");
const isSaving = ref(false);
const isPublishing = ref(false);
const isOfflining = ref(false);
const mediaOwner = computed(() => props.album ? {
  centerId: props.album.ownerCenterId,
  ownerType: "gallery" as const,
  ownerId: props.album.id,
} : undefined);
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
    serverOwned: asset.serverOwned,
    version: asset.version,
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
      serverOwned: item.serverOwned,
      version: item.version,
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
  if (!form.cover) missing.push("独立封面");
  if (!form.assets.length) missing.push("专题素材");
  if (form.assets.some((asset) => !isRetainedServerContentMediaAttachment({
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
    serverOwned: asset.serverOwned,
  }) && !isContentMediaAttachmentComplete({
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
  if (form.cover && !isContentMediaAttachmentComplete({ id: form.cover.id, role: "cover", kind: form.cover.kind ?? "image", title: form.cover.title, caption: form.cover.caption, alt: form.cover.alt, aspect: form.cover.aspect, sortOrder: 0, url: form.cover.imageUrl, localBlobId: form.cover.localBlobId, thumbnailUrl: form.cover.thumbnailUrl, status: form.cover.status ?? "ready" })) missing.push("封面信息");
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
  } catch (caught) {
    formError.value = caught instanceof Error ? `中心加载失败：${caught.message}` : "中心加载失败。";
  }
});

function loadAlbum(album?: ManagedGalleryAlbum) {
  Object.assign(form, album ? {
    title: album.title,
    category: normalizeGalleryCategory(album.category),
    year: album.year,
    summary: album.summary,
    team: album.team,
    ownerCenterId: album.ownerCenterId,
    cover: album.cover ? { ...album.cover } : null,
    assets: album.assets.map((asset) => ({ ...asset })),
  } : {
    title: "",
    category: "event_documentary" as GalleryCategory,
    year: "2026",
    summary: "",
    team: "",
    ownerCenterId: defaultOwnerCenterId(),
    cover: null,
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
    cover: form.cover ? { ...form.cover } : null,
    assets: form.assets.map((asset) => ({ ...asset })),
  };
}

function validateForm() {
  formError.value = missingFields.value.length ? `请补充：${missingFields.value.join("、")}` : "";
  return !formError.value;
}

async function persistMediaMetadata() {
  if (!gateway?.media) return;
  const attachments = [
    ...(form.cover ? [{ ...form.cover, role: "cover" as const, kind: form.cover.kind ?? "image" as const, status: form.cover.status ?? "ready" as const, sortOrder: 0, url: form.cover.imageUrl }] : []),
    ...form.assets.map((asset) => ({ ...asset, role: "detail" as const, kind: asset.kind ?? "image" as const, status: asset.status ?? "ready" as const, sortOrder: asset.sortOrder ?? 0, url: asset.imageUrl })),
  ];
  for (const item of attachments.filter((candidate) => candidate.serverOwned && candidate.version)) {
    const updated = await gateway.media.update(item.id, {
      expectedVersion: item.version!,
      title: item.title,
      caption: item.caption,
      alt: item.alt,
      aspect: item.aspect,
      sortOrder: item.sortOrder,
    });
    const next = {
      ...item,
      version: updated.version,
      title: updated.title,
      caption: updated.caption,
      alt: updated.alt,
      aspect: updated.aspect as ContentMediaAttachment["aspect"],
      sortOrder: updated.sortOrder,
      status: updated.status as ContentMediaAttachment["status"],
      url: updated.url,
      thumbnailUrl: updated.thumbnailUrl,
    } satisfies ContentMediaAttachment;
    if (form.cover?.id === next.id) {
      form.cover = { ...form.cover, ...next, imageUrl: next.url, thumbnailUrl: next.thumbnailUrl, version: next.version };
    } else {
      form.assets = form.assets.map((asset) => asset.id === next.id
        ? { ...asset, ...next, imageUrl: next.url, thumbnailUrl: next.thumbnailUrl, version: next.version }
        : asset);
    }
  }
}

async function persistDraft() {
  const payload = toPayload();
  if (gateway) return props.mode === "edit" && props.album
    ? galleryStore.updateDraftFromApi(gateway, props.album.id, payload)
    : galleryStore.createDraftFromApi(gateway, payload);
  return props.mode === "edit" && props.album
    ? galleryStore.updateDraft(props.album.id, payload)
    : galleryStore.createDraft(payload);
}

async function saveDraft() {
  if (isSaving.value || isPublishing.value || isOfflining.value) return;
  isSaving.value = true;
  formError.value = "";
  try {
    await persistMediaMetadata();
    const saved = await persistDraft();
    notice.value = "画廊草稿已保存，用户端仍保持原公开版本。";
    adminToast.success(notice.value);
    emit("saved", saved.id);
  } catch (caught) {
    formError.value = `保存失败：${localizeGalleryError(caught)}`;
  } finally {
    isSaving.value = false;
  }
}

async function publishGallery() {
  if (isSaving.value || isPublishing.value || isOfflining.value || !validateForm()) return;
  isPublishing.value = true;
  try {
    await persistMediaMetadata();
    const saved = await persistDraft();
    if (gateway) await galleryStore.publishFromApi(gateway, saved.id);
    else galleryStore.publish(saved.id);
    notice.value = "画廊专题已发布，用户端将渲染最新公开快照。";
    adminToast.success(notice.value);
    emit("published", saved.id);
  } catch (caught) {
    formError.value = `发布失败：${localizeGalleryError(caught)}`;
  } finally {
    isPublishing.value = false;
  }
}

async function offlineGallery() {
  if (!props.album || isSaving.value || isPublishing.value || isOfflining.value) return;
  isOfflining.value = true;
  formError.value = "";
  try {
    if (gateway) await galleryStore.offlineFromApi(gateway, props.album.id, "管理员下线");
    else galleryStore.unpublish(props.album.id, "管理员下线");
    notice.value = "画廊专题已下线，公开页面不再显示该专题。";
    adminToast.success(notice.value);
    emit("offline", props.album.id);
  } catch (caught) {
    formError.value = `下线失败：${localizeGalleryError(caught)}`;
  } finally {
    isOfflining.value = false;
  }
}
</script>

<template>
  <section class="admin-list-card admin-gallery-editor" aria-label="画廊编辑器">
    <header>
      <div><h2>{{ mode === "create" ? "新建画廊专题" : "编辑画廊专题" }}</h2></div>
    </header>
    <div class="admin-gallery-editor__body">
      <p v-if="formError" class="admin-save-message admin-save-message--error" role="alert">{{ formError }}</p>
      <div class="admin-editor-grid">
        <label>标题<input v-model="form.title" type="text"></label>
        <label>分类<select v-model="form.category"><option v-for="option in CATEGORY_OPTIONS" :key="option" :value="option">{{ galleryCategoryLabel(option) }}</option></select></label>
        <label>年份<input v-model="form.year" type="text" inputmode="numeric"></label>
        <label>归属中心<select v-model="form.ownerCenterId" :disabled="session.adminLevel !== 'owner'"><option value="">请选择归属中心</option><option v-for="center in ownerOptions" :key="center.id" :value="center.id">{{ center.label }}</option></select></label>
        <label class="is-wide">摘要<textarea v-model="form.summary" rows="3"></textarea></label>
        <label class="is-wide">制作团队<input v-model="form.team" type="text"></label>
      </div>
      <ContentMediaUploader v-model="coverItems" mode="cover" :owner="mediaOwner" title="画廊独立封面" description="封面单独上传，不占用详情素材 20 张上限。" />
      <ContentMediaUploader v-model="mediaItems" mode="collection" :max-items="20" :owner="mediaOwner" title="画廊详情素材" description="上传 1–20 张详情照片；详情素材与封面独立保存。" />
    </div>
    <footer class="admin-drawer__footer">
      <span>{{ isComplete ? "必填信息和素材已完整，可直接发布。" : "草稿可暂存，直接发布前需补齐全部信息和素材。" }}</span>
      <button type="button" class="button button--ghost" :disabled="isSaving || isPublishing || isOfflining" @click="emit('cancelled')">取消</button>
      <button type="button" class="button button--ghost" :disabled="isSaving || isPublishing || isOfflining" @click="saveDraft">保存草稿</button>
      <button v-if="mode === 'edit' && album?.publishedState === 'published'" type="button" class="button button--ghost" :disabled="isSaving || isPublishing || isOfflining" @click="offlineGallery">{{ isOfflining ? "下线中…" : "下线专题" }}</button>
      <button type="button" class="button" :disabled="!isComplete || isSaving || isPublishing || isOfflining" @click="publishGallery">{{ isPublishing ? "发布中…" : "直接发布" }}</button>
    </footer>
  </section>
</template>
