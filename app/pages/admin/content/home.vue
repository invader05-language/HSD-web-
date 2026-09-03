<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { HOMEPAGE_SLOTS } from "~/data/admin-content";
import { useContentGateway } from "~/composables/useContentGateway";
import { usePortalCatalog } from "~/composables/usePortalCatalog";
import { resolveHomepageProjection } from "~/composables/usePublishedPortal";
import { useActivitiesStore } from "~/stores/activities";
import { useGalleryStore } from "~/stores/gallery";
import { usePortalConfigStore } from "~/stores/portal-config";
import { useProjectsStore } from "~/stores/projects";
import { useResourcesStore } from "~/stores/resources";
import { useSessionStore } from "~/stores/session";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import type { PortalCatalogItem, PortalSlotId } from "~/types/portal-content";
import type { PortalReference, PortalVisualConfig } from "~/types/portal-config";
import type { ContentMediaAttachment } from "~/types/content-media";
import { isContentMediaAttachmentComplete } from "~/utils/content-media";
import { useAdminToast } from "~/composables/useAdminToast";
import ContentMediaUploader from "~/components/admin/ContentMediaUploader.vue";
import ContentMediaView from "~/components/ContentMediaView.vue";
import { resolvePortalTabKey, type PortalConfigView } from "~/utils/portal-tabs";

definePageMeta({ layout: "admin" });
useHead({ title: "门户配置｜HSD 管理台" });

const route = useRoute();
const router = useRouter();
const configStore = usePortalConfigStore();
const session = useSessionStore();
const adminToast = useAdminToast();
const contentGateway = useContentGateway();
const organizationGateway = useOrganizationGateway();
const runtimeConfig = useRuntimeConfig() as { public: { useMockApi: boolean } };
const projectsStore = useProjectsStore();
const activitiesStore = useActivitiesStore();
const galleryStore = useGalleryStore();
const resourcesStore = useResourcesStore();
const publicContentCatalog = ref<PortalCatalogItem[]>([]);
const catalogLoading = ref(false);
const catalogReady = ref(false);
const draftActionBusy = ref(false);
const catalogError = ref("");
const failedSlots = ref<Set<PortalSlotId>>(new Set());
const failedCatalogLabels = ref<string[]>([]);
const portalUploadCenterId = ref(session.currentAccount?.adminCenterId ?? "");
const catalog = computed(() => [...usePortalCatalog(runtimeConfig.public), ...publicContentCatalog.value]);
const activeView = computed<PortalConfigView>(() => route.query.view === "visuals" ? "visuals" : "recommendations");
const showPreview = ref(false);
const showPublishConfirmation = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");
const visualDraft = reactive<{ home: PortalVisualConfig; join: PortalVisualConfig }>({
  home: { ...configStore.draftConfig.visuals.home },
  join: { ...configStore.draftConfig.visuals.join },
});
const previewProjection = computed(() => resolveHomepageProjection(configStore.draftConfig.slots, catalog.value));
const canConfigure = computed(() => session.hasCapability("portal.configure"));
const canPublish = computed(() => session.hasCapability("portal.publish"));
const draftReady = computed(() => configStore.draftStatus === "ready");
const mutationBusy = computed(() => catalogLoading.value || configStore.loading || draftActionBusy.value || !draftReady.value);
const recommendationsTab = ref<HTMLButtonElement | null>(null);
const visualsTab = ref<HTMLButtonElement | null>(null);
const previewDialog = ref<HTMLElement | null>(null);
const previewCloseButton = ref<HTMLButtonElement | null>(null);
const publishDialog = ref<HTMLElement | null>(null);
const publishCancelButton = ref<HTMLButtonElement | null>(null);
let dialogTrigger: HTMLElement | null = null;
let initializeRequestId = 0;

watch(() => configStore.draftConfig.visuals, (visuals) => {
  for (const slot of ["home", "join"] as const) {
    for (const key of Object.keys(visualDraft[slot])) delete visualDraft[slot][key as keyof PortalVisualConfig];
    Object.assign(visualDraft[slot], visuals[slot]);
  }
}, { deep: true });

async function refreshPublicContentCatalog() {
  if (!contentGateway) return;
  const response = await contentGateway.content.list("status=published&page=1&pageSize=100");
  publicContentCatalog.value = response.items.map((item): PortalCatalogItem => ({
    entityType: item.kind,
    sourceId: item.id,
    title: item.title,
    summary: item.summary ?? "",
    to: item.kind === "flash" ? "/activities" : `/updates/${encodeURIComponent(item.slug)}`,
    publishedAt: item.publishedAt ?? new Date(0).toISOString(),
    eligibleSlots: item.kind === "flash" ? ["flash"] : ["news"],
    available: true,
  }));
}

async function initializePortal() {
  if (!contentGateway) return;
  if (catalogLoading.value) return;
  const requestId = ++initializeRequestId;
  catalogLoading.value = true;
  catalogReady.value = false;
  catalogError.value = "";
  failedSlots.value = new Set();
  failedCatalogLabels.value = [];
  const taskDefinitions: Array<{ label: string; slots: PortalSlotId[]; run: () => Promise<unknown>; failed?: () => boolean }> = [
    { label: "门户草稿", slots: ["flash", "news", "projects", "activities", "gallery", "resources"], run: () => configStore.initializeForRuntime(runtimeConfig.public, contentGateway), failed: () => configStore.draftStatus === "error" },
    { label: "精选项目", slots: ["projects"], run: () => projectsStore.refreshPublicFromApi(contentGateway), failed: () => Boolean(projectsStore.apiError) },
    { label: "近期活动", slots: ["activities"], run: () => activitiesStore.refreshPublicFromApi(contentGateway), failed: () => Boolean(activitiesStore.apiError) },
    { label: "媒体专题", slots: ["gallery"], run: () => galleryStore.refreshPublicFromApi(contentGateway), failed: () => Boolean(galleryStore.apiError) },
    { label: "推荐资源", slots: ["resources"], run: () => resourcesStore.refreshPublicFromApi(contentGateway), failed: () => Boolean(resourcesStore.apiError) },
    { label: "首页快讯与新闻", slots: ["flash", "news"], run: refreshPublicContentCatalog },
    { label: "中心目录", slots: [], run: () => organizationGateway && session.hasCapability("portal.configure") ? organizationGateway.listCenters() : Promise.resolve(undefined) },
  ];
  const tasks = await Promise.allSettled(taskDefinitions.map((task) => task.run()));
  if (requestId !== initializeRequestId) return;
  const centersResult = tasks.at(-1);
  const centers = centersResult?.status === "fulfilled" && centersResult.value && typeof centersResult.value === "object"
    ? centersResult.value as { items?: Array<{ id: string; active: boolean; slug: string }> }
    : undefined;
  if (centers?.items && !portalUploadCenterId.value) {
    portalUploadCenterId.value = centers.items.find((center) => center.active && center.slug === "baize-development")?.id
      ?? centers.items.find((center) => center.active)?.id
      ?? "";
  }
  const failures = tasks.flatMap((task, index) => task.status === "rejected" || taskDefinitions[index]?.failed?.() ? [taskDefinitions[index]!] : []);
  failedCatalogLabels.value = failures.map((task) => task.label);
  failedSlots.value = new Set(failures.flatMap((task) => task.slots));
  if (!draftReady.value) {
    catalogError.value = "门户草稿读取失败，配置编辑已暂停；请点击重试。";
    catalogReady.value = false;
  } else {
    catalogError.value = failures.length
      ? `以下候选模块读取失败：${failedCatalogLabels.value.join("、")}。其余模块仍可配置。`
      : "";
    catalogReady.value = true;
  }
  catalogLoading.value = false;
}

onMounted(() => { void initializePortal(); });

function setView(view: PortalConfigView, focus = false) {
  void router.replace({ query: view === "visuals" ? { ...route.query, view } : { ...route.query, view: undefined } }).then(() => {
    if (focus) void nextTick(() => (view === "visuals" ? visualsTab.value : recommendationsTab.value)?.focus());
  });
}

function handleTabKeydown(event: KeyboardEvent) {
  const nextView = resolvePortalTabKey(activeView.value, event.key);
  if (!nextView) return;
  event.preventDefault();
  setView(nextView, true);
}

function referenceKey(reference: PortalReference) {
  return `${reference.entityType}|${reference.sourceId}`;
}

function findReference(reference: PortalReference) {
  return catalog.value.find((item) => item.entityType === reference.entityType && item.sourceId === reference.sourceId);
}

function referenceLabel(reference: PortalReference) {
  return findReference(reference)?.title ?? `失效引用：${reference.entityType} / ${reference.sourceId}`;
}

function currentReferenceIssue(slot: PortalSlotId, index: number, reference: PortalReference) {
  if (!catalogReady.value) return undefined;
  const candidate = findReference(reference);
  if (!candidate) return `无效当前项（引用不存在）：${reference.entityType} / ${reference.sourceId}`;
  if (!candidate.available) return `无效当前项（内容不可用）：${candidate.title}`;
  if (!candidate.eligibleSlots.includes(slot)) return `无效当前项（位置不匹配）：${candidate.title}`;
  const duplicate = HOMEPAGE_SLOTS.some((definition) => configStore.draftConfig.slots[definition.id].some(
    (item, itemIndex) => (definition.id !== slot || itemIndex !== index) && referenceKey(item) === referenceKey(reference),
  ));
  return duplicate ? `无效当前项（重复引用）：${candidate.title}` : undefined;
}

function candidatesFor(slot: PortalSlotId, currentIndex: number) {
  if (!catalogReady.value || failedSlots.value.has(slot)) return [];
  const used = new Set(
    HOMEPAGE_SLOTS.flatMap((definition) => configStore.draftConfig.slots[definition.id]
      .filter((_, index) => definition.id !== slot || index !== currentIndex)
      .map(referenceKey)),
  );
  return catalog.value
    .filter((item) => item.available && item.eligibleSlots.includes(slot) && !used.has(referenceKey(item)))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

function selectReference(slot: PortalSlotId, index: number, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  const candidate = catalog.value.find((item) => referenceKey(item) === value);
  if (!candidate) return;
  const references = [...configStore.draftConfig.slots[slot]];
  references.splice(index, index === references.length ? 0 : 1, {
    entityType: candidate.entityType,
    sourceId: candidate.sourceId,
  });
  void runDraftAction({ slots: { [slot]: references } });
}

function portalErrorMessage(error: unknown) {
  const code = typeof (error as { code?: unknown })?.code === "string"
    ? (error as { code: string }).code
    : error instanceof Error ? error.message : "";
  if (code === "PORTAL_CONFIG_PERSISTENCE_FAILED") {
    return "浏览器存储不可用，配置未持久化；当前公开版本保持不变，请释放存储空间后重试。";
  }
  if (code === "PORTAL_CONFIG_INVALID_VISUAL") return "主视觉发布校验失败。请确认素材已审核通过并填写替代文本。";
  if (code === "PORTAL_CONFIG_INVALID_REFERENCE") return "推荐位引用校验失败。请处理失效、重复或超出容量的引用后重试。";
  if (code === "PORTAL_CONTENT_VERSION_CONFLICT") return "门户草稿已被其他管理员更新，请先重新读取最新版本再操作。";
  if (code === "PORTAL_CONFIG_NOT_READY") return "门户草稿尚未成功读取，当前不能保存配置；请点击重试。";
  if (configStore.persistenceError) {
    return "浏览器存储不可用，配置未持久化；当前公开版本保持不变，请释放存储空间后重试。";
  }
  return "配置操作失败，请检查当前内容和权限后重试。";
}

async function runDraftAction(patch: Parameters<typeof configStore.saveDraft>[0]) {
  if (mutationBusy.value) return;
  draftActionBusy.value = true;
  try {
    if (runtimeConfig.public.useMockApi) configStore.saveDraft(patch);
    else await configStore.saveDraftForRuntime(runtimeConfig.public, contentGateway, patch);
    if (configStore.persistenceError) {
      errorMessage.value = portalErrorMessage(new Error(configStore.persistenceError));
      statusMessage.value = "";
      return;
    }
    errorMessage.value = "";
    statusMessage.value = "更改已保存到门户草稿，公开页面未受影响。";
    adminToast.success(statusMessage.value);
  } catch (error) {
    errorMessage.value = portalErrorMessage(error);
    statusMessage.value = "";
  } finally {
    draftActionBusy.value = false;
  }
}

function slotLoadFailed(slot: PortalSlotId) {
  return !draftReady.value || failedSlots.value.has(slot);
}

function moveReference(slot: PortalSlotId, index: number, direction: "up" | "down") {
  const references = [...configStore.draftConfig.slots[slot]];
  const target = index + (direction === "up" ? -1 : 1);
  if (target < 0 || target >= references.length) return;
  [references[index], references[target]] = [references[target]!, references[index]!];
  void runDraftAction({ slots: { [slot]: references } });
}

function removeReference(slot: PortalSlotId, index: number) {
  const references = [...configStore.draftConfig.slots[slot]];
  references.splice(index, 1);
  void runDraftAction({ slots: { [slot]: references } });
}

function saveVisualDraft() {
  const visuals = (['home', 'join'] as const).reduce<Record<'home' | 'join', PortalVisualConfig>>((result, slot) => {
    const visual = visualDraft[slot];
    result[slot] = {
      ...visual,
      ...(visual.media ? { media: { ...visual.media, alt: visual.alt.trim() } } : {}),
      assetId: visual.media ? undefined : visual.assetId,
    };
    return result;
  }, { home: visualDraft.home, join: visualDraft.join });
  const missingAlt = (["home", "join"] as const).some((slot) => {
    const visual = visuals[slot];
    return (visual.media && !isContentMediaAttachmentComplete(visual.media)) || (visual.assetId && !visual.alt.trim());
  });
  if (missingAlt) {
    errorMessage.value = "上传主视觉素材后必须完成上传并填写替代文本。";
    statusMessage.value = "";
    return;
  }
  void runDraftAction({ visuals });
}

function updateVisualMedia(slot: "home" | "join", items: ContentMediaAttachment[]) {
  visualDraft[slot].media = items[0];
  if (items[0]) {
    visualDraft[slot].alt = items[0].alt ?? "";
    visualDraft[slot].assetId = undefined;
  }
}

function visualMedia(slot: "home" | "join") {
  return visualDraft[slot].media ? [visualDraft[slot].media] : [];
}

function visualOwner(slot: "home" | "join") {
  if (!portalUploadCenterId.value) return undefined;
  return { centerId: portalUploadCenterId.value, ownerType: `portal_${slot}` as const, ownerId: "global" };
}

async function publishConfiguration() {
  try {
    if (runtimeConfig.public.useMockApi) configStore.publish(catalog.value, true);
    else await configStore.publishForRuntime(runtimeConfig.public, contentGateway, true);
    closeDialog("publish");
    errorMessage.value = "";
    statusMessage.value = "门户配置已整份发布，用户端现在读取新版本。";
    adminToast.success(statusMessage.value);
  } catch (error) {
    closeDialog("publish");
    errorMessage.value = portalErrorMessage(error);
    statusMessage.value = "";
  }
}

async function openDialog(kind: "preview" | "publish", event: MouseEvent) {
  if (kind === "preview" && !runtimeConfig.public.useMockApi) {
    try {
      await configStore.previewForRuntime(runtimeConfig.public, contentGateway);
    } catch (error) {
      errorMessage.value = portalErrorMessage(error);
      statusMessage.value = "";
      return;
    }
  }
  dialogTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  if (kind === "preview") showPreview.value = true;
  else showPublishConfirmation.value = true;
  void nextTick(() => (kind === "preview" ? previewCloseButton.value : publishCancelButton.value)?.focus());
}

function restoreDialogFocus() {
  const trigger = dialogTrigger;
  dialogTrigger = null;
  void nextTick(() => trigger?.focus());
}

function closeDialog(kind: "preview" | "publish") {
  if (kind === "preview") showPreview.value = false;
  else showPublishConfirmation.value = false;
  restoreDialogFocus();
}

function handleDialogKeydown(event: KeyboardEvent, kind: "preview" | "publish") {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog(kind);
    return;
  }
  if (event.key !== "Tab") return;
  const dialog = kind === "preview" ? previewDialog.value : publishDialog.value;
  const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>(
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  ) ?? []);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
  } else if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

onBeforeUnmount(() => {
  dialogTrigger?.focus();
});

</script>

<template>
  <div class="admin-recruitment-page admin-section-page admin-portal-config">
    <AdminPageHeading eyebrow="首页展示管理" title="门户配置" description="管理首页推荐内容和顶部横幅图片。所有更改先保存为草稿，确认后一次发布。">
      <template #actions>
        <button v-if="canConfigure" type="button" class="button button--ghost" :disabled="mutationBusy" @click="openDialog('preview', $event)">预览门户草稿</button>
        <button v-if="canPublish" type="button" class="button" :disabled="mutationBusy" @click="openDialog('publish', $event)">发布门户配置</button>
      </template>
    </AdminPageHeading>

    <template v-if="canConfigure">
    <div class="admin-portal-tabs" role="tablist" aria-label="门户配置视图">
      <button id="portal-tab-recommendations" ref="recommendationsTab" type="button" role="tab" aria-controls="portal-panel-recommendations" :aria-selected="activeView === 'recommendations'" :tabindex="activeView === 'recommendations' ? 0 : -1" @keydown="handleTabKeydown" @click="setView('recommendations')">首页推荐位</button>
      <button id="portal-tab-visuals" ref="visualsTab" type="button" role="tab" aria-controls="portal-panel-visuals" :aria-selected="activeView === 'visuals'" :tabindex="activeView === 'visuals' ? 0 : -1" @keydown="handleTabKeydown" @click="setView('visuals')">页面主视觉</button>
    </div>

    <p v-if="catalogLoading" class="admin-portal-message" role="status">正在读取可推荐内容和门户草稿…</p>
    <p v-if="catalogError" class="admin-portal-message is-error" role="alert">{{ catalogError }} <button type="button" class="button button--text" @click="initializePortal">重试</button></p>
    <p v-if="statusMessage" class="admin-portal-message" role="status">{{ statusMessage }}</p>
    <p v-if="errorMessage" class="admin-portal-message is-error" role="alert">{{ errorMessage }}</p>
    <div v-if="canConfigure && !canPublish" class="admin-fixed-notice"><strong>发布权限</strong><p>你可以保存和预览门户草稿；整份发布仅限联盟总负责人。</p></div>

    <section v-if="activeView === 'recommendations'" id="portal-panel-recommendations" role="tabpanel" aria-labelledby="portal-tab-recommendations" tabindex="0">
      <section class="admin-home-slots" aria-label="首页固定模块">
        <article v-for="slot in HOMEPAGE_SLOTS" :key="slot.id">
          <header><div><h2>{{ slot.label }}</h2><p>{{ slot.description }}</p><div class="admin-slot-capacity"><strong>已配置 {{ configStore.draftConfig.slots[slot.id].length }} 条</strong><span>容量上限：{{ slot.capacity }} 条</span></div></div></header>
          <ol>
            <li v-for="(reference, itemIndex) in configStore.draftConfig.slots[slot.id]" :key="referenceKey(reference)">
              <span>{{ itemIndex + 1 }}</span>
              <label><span class="sr-only">替换{{ slot.label }}第 {{ itemIndex + 1 }} 项</span><select :value="referenceKey(reference)" :disabled="mutationBusy || slotLoadFailed(slot.id)" @change="selectReference(slot.id, itemIndex, $event)"><option v-if="currentReferenceIssue(slot.id, itemIndex, reference)" :value="referenceKey(reference)" disabled>{{ currentReferenceIssue(slot.id, itemIndex, reference) }}</option><option v-for="candidate in candidatesFor(slot.id, itemIndex)" :key="referenceKey(candidate)" :value="referenceKey(candidate)">{{ candidate.title }}</option></select></label>
              <div class="admin-slot-actions"><button type="button" :aria-label="`上移 ${referenceLabel(reference)}`" :disabled="mutationBusy || itemIndex === 0" @click="moveReference(slot.id, itemIndex, 'up')">上移</button><button type="button" :aria-label="`下移 ${referenceLabel(reference)}`" :disabled="mutationBusy || itemIndex === configStore.draftConfig.slots[slot.id].length - 1" @click="moveReference(slot.id, itemIndex, 'down')">下移</button><button type="button" :aria-label="`移除 ${referenceLabel(reference)}`" :disabled="mutationBusy" @click="removeReference(slot.id, itemIndex)">移除</button></div>
            </li>
            <li v-if="configStore.draftConfig.slots[slot.id].length < slot.capacity" class="is-empty">
              <span>{{ configStore.draftConfig.slots[slot.id].length + 1 }}</span>
              <label><span class="sr-only">添加{{ slot.label }}</span><select value="" :disabled="mutationBusy || slotLoadFailed(slot.id)" @change="selectReference(slot.id, configStore.draftConfig.slots[slot.id].length, $event)"><option value="" disabled>{{ catalogLoading ? "正在读取内容…" : failedSlots.has(slot.id) ? "该模块读取失败，请重试" : "选择已发布内容" }}</option><option v-for="candidate in candidatesFor(slot.id, configStore.draftConfig.slots[slot.id].length)" :key="referenceKey(candidate)" :value="referenceKey(candidate)">{{ candidate.title }}</option></select></label>
            </li>
          </ol>
          <footer><em>{{ slot.sourceHint }}</em></footer>
        </article>
      </section>
    </section>

    <section v-else id="portal-panel-visuals" class="admin-portal-visuals" role="tabpanel" aria-labelledby="portal-tab-visuals" tabindex="0">
      <article v-for="visual in [{ id: 'home' as const, label: '官网首页', note: '首页首屏主视觉' }, { id: 'join' as const, label: '加入我们', note: '招新页面主视觉' }]" :key="visual.id">
          <header><div><h2>{{ visual.label }}</h2><p>{{ visual.note }}</p></div><AdminStatusPill status="预定义位置" /></header>
        <div class="admin-portal-visual-preview"><ContentMediaView v-if="visualDraft[visual.id].media" :item="visualDraft[visual.id].media!" preview="thumbnail" :controls="false" /><strong>{{ visualDraft[visual.id].media ? "已上传主视觉素材" : visualDraft[visual.id].assetId ? "历史主视觉素材" : "未选择素材" }}</strong><small>{{ visualDraft[visual.id].alt || "等待替代文本" }}</small></div>
        <ContentMediaUploader :aria-label="`${visual.label}主视觉素材`" :model-value="visualMedia(visual.id)" mode="cover" :owner="visualOwner(visual.id)" :disabled="Boolean(organizationGateway && !visualOwner(visual.id))" title="直接上传主视觉素材" description="上传后可立即预览；新主视觉不经过媒体素材库。" @update:model-value="updateVisualMedia(visual.id, $event)" />
        <label>替代文本<input v-model="visualDraft[visual.id].alt" type="text" :placeholder="`${visual.label}主视觉的无障碍描述`"></label>
        <label v-if="runtimeConfig.public.useMockApi">辅助文案<textarea v-model="visualDraft[visual.id].supportingText" rows="3" placeholder="显示在主视觉素材位中的简短说明"></textarea></label>
      </article>
      <footer><p>招新按钮是否可用仍由招新批次控制，门户配置不能覆盖批次开放状态。</p><button type="button" class="button" :disabled="mutationBusy" @click="saveVisualDraft">保存主视觉草稿</button></footer>
    </section>
    </template>

    <Teleport to="body">
      <div v-if="showPreview" class="admin-drawer-backdrop" @click.self="closeDialog('preview')" @keydown="handleDialogKeydown($event, 'preview')">
        <aside ref="previewDialog" class="admin-candidate-drawer admin-portal-preview" role="dialog" aria-modal="true" aria-labelledby="portal-preview-title" aria-describedby="portal-preview-description">
          <header class="admin-drawer__header"><div><h2 id="portal-preview-title">门户草稿预览</h2></div><button ref="previewCloseButton" type="button" aria-label="关闭预览" @click="closeDialog('preview')">×</button></header>
          <div class="admin-drawer__body"><section v-for="slot in HOMEPAGE_SLOTS" :key="slot.id"><header><span>容量上限：{{ slot.capacity }} 条</span><h3>{{ slot.label }}</h3></header><ol :aria-label="`${slot.label}预览`"><li v-for="item in previewProjection.slots[slot.id]" :key="item.sourceId"><strong>{{ item.title }}</strong><small v-if="item.fallbackFor">自动补位：替代 {{ item.fallbackFor }}</small></li><li v-if="!previewProjection.slots[slot.id].length">暂无可用内容</li></ol></section></div>
        </aside>
      </div>
      <div v-if="showPublishConfirmation" class="admin-confirm-backdrop" @keydown="handleDialogKeydown($event, 'publish')"><section ref="publishDialog" role="dialog" aria-modal="true" aria-labelledby="portal-publish-title" aria-describedby="portal-publish-description"><h2 id="portal-publish-title">确认整份发布门户配置？</h2><p id="portal-publish-description">发布前会校验全部容量、重复引用和候选有效性。任一校验失败时，当前公开版本保持不变。</p><div><button ref="publishCancelButton" type="button" class="button button--ghost" @click="closeDialog('publish')">返回检查</button><button type="button" class="button" @click="publishConfiguration">确认整份发布</button></div></section></div>
    </Teleport>
  </div>
</template>
