<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from "vue";
import { ADMIN_ASSETS, canSelectAsset } from "~/data/admin-assets";
import { HOMEPAGE_SLOTS } from "~/data/admin-content";
import { usePortalCatalog } from "~/composables/usePortalCatalog";
import { resolveHomepageProjection } from "~/composables/usePublishedPortal";
import { usePortalConfigStore } from "~/stores/portal-config";
import { useSessionStore } from "~/stores/session";
import type { PortalCatalogItem, PortalSlotId } from "~/types/portal-content";
import type { PortalReference, PortalVisualConfig } from "~/types/portal-config";

definePageMeta({ layout: "admin" });
useHead({ title: "门户配置｜HSD 管理台" });

const route = useRoute();
const router = useRouter();
const configStore = usePortalConfigStore();
const session = useSessionStore();
const catalog = computed(() => usePortalCatalog());
const usableVisualAssets = ADMIN_ASSETS.filter((asset) => asset.type === "图片" && canSelectAsset(asset));
const activeView = computed<"recommendations" | "visuals">(() => route.query.view === "visuals" ? "visuals" : "recommendations");
const showPreview = ref(false);
const showPublishConfirmation = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");
const visualDraft = reactive<{ home: PortalVisualConfig; join: PortalVisualConfig }>({
  home: { ...configStore.draftConfig.visuals.home },
  join: { ...configStore.draftConfig.visuals.join },
});
const previewProjection = computed(() => resolveHomepageProjection(configStore.preview().slots, catalog.value));
const publishedProjection = computed(() => resolveHomepageProjection(configStore.publishedConfig.slots, catalog.value));
const canPublish = computed(() => session.adminLevel === "owner");
const recommendationsTab = ref<HTMLButtonElement | null>(null);
const visualsTab = ref<HTMLButtonElement | null>(null);
const previewDialog = ref<HTMLElement | null>(null);
const previewCloseButton = ref<HTMLButtonElement | null>(null);
const publishDialog = ref<HTMLElement | null>(null);
const publishCancelButton = ref<HTMLButtonElement | null>(null);
let dialogTrigger: HTMLElement | null = null;

function setView(view: "recommendations" | "visuals", focus = false) {
  void router.replace({ query: view === "visuals" ? { ...route.query, view } : { ...route.query, view: undefined } }).then(() => {
    if (focus) void nextTick(() => (view === "visuals" ? visualsTab.value : recommendationsTab.value)?.focus());
  });
}

function handleTabKeydown(event: KeyboardEvent) {
  const nextView = event.key === "ArrowRight" || event.key === "End"
    ? "visuals"
    : event.key === "ArrowLeft" || event.key === "Home"
      ? "recommendations"
      : undefined;
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
  runDraftAction(() => configStore.replaceReference(slot, index, {
    entityType: candidate.entityType,
    sourceId: candidate.sourceId,
  }, catalog.value));
}

function portalErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "PORTAL_CONFIG_PERSISTENCE_FAILED") {
    return "浏览器存储不可用，配置未持久化；当前公开版本保持不变，请释放存储空间后重试。";
  }
  if (code === "PORTAL_CONFIG_INVALID_VISUAL") return "主视觉发布校验失败。请确认素材已审核通过并填写替代文本。";
  if (code === "PORTAL_CONFIG_INVALID_REFERENCE") return "推荐位引用校验失败。请处理失效、重复或超出容量的引用后重试。";
  if (configStore.persistenceError) {
    return "浏览器存储不可用，配置未持久化；当前公开版本保持不变，请释放存储空间后重试。";
  }
  return "配置操作失败，请检查当前内容和权限后重试。";
}

function runDraftAction(action: () => unknown) {
  try {
    action();
    if (configStore.persistenceError) {
      errorMessage.value = portalErrorMessage(new Error(configStore.persistenceError));
      statusMessage.value = "";
      return;
    }
    errorMessage.value = "";
    statusMessage.value = "更改已保存到门户草稿，公开页面未受影响。";
  } catch (error) {
    errorMessage.value = portalErrorMessage(error);
    statusMessage.value = "";
  }
}

function moveReference(slot: PortalSlotId, index: number, direction: "up" | "down") {
  runDraftAction(() => configStore.moveReference(slot, index, direction));
}

function removeReference(slot: PortalSlotId, index: number) {
  runDraftAction(() => configStore.removeReference(slot, index));
}

function saveVisualDraft() {
  const missingAlt = (["home", "join"] as const).some((slot) => visualDraft[slot].assetId && !visualDraft[slot].alt.trim());
  if (missingAlt) {
    errorMessage.value = "选择主视觉素材后必须填写替代文本。";
    statusMessage.value = "";
    return;
  }
  runDraftAction(() => configStore.saveDraft({
    visuals: {
      home: { ...visualDraft.home, assetId: visualDraft.home.assetId || undefined },
      join: { ...visualDraft.join, assetId: visualDraft.join.assetId || undefined },
    },
  }));
}

function publishConfiguration() {
  try {
    configStore.publish(catalog.value, true);
    closeDialog("publish");
    errorMessage.value = "";
    statusMessage.value = "门户配置已整份发布，用户端现在读取新版本。";
  } catch (error) {
    closeDialog("publish");
    errorMessage.value = portalErrorMessage(error);
    statusMessage.value = "";
  }
}

function openDialog(kind: "preview" | "publish", event: MouseEvent) {
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

function warningText(item: { code: "fallback" | "empty"; sourceId: string; fallbackSourceId?: string }) {
  return item.code === "fallback"
    ? `${item.sourceId} 已失效，当前公开页面自动使用 ${item.fallbackSourceId}，请确认后重新发布。`
    : `${item.sourceId} 已失效且没有同类型候选，当前公开位置留空。`;
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page admin-portal-config">
    <AdminPageHeading eyebrow="Portal Publishing" title="门户配置" description="维护首页推荐位和预定义页面主视觉。所有更改先进入草稿，联盟总负责人确认后整份发布。">
      <template #actions>
        <button type="button" class="button button--ghost" @click="openDialog('preview', $event)">预览门户草稿</button>
        <button v-if="canPublish" type="button" class="button" @click="openDialog('publish', $event)">发布门户配置</button>
      </template>
    </AdminPageHeading>

    <div class="admin-portal-tabs" role="tablist" aria-label="门户配置视图">
      <button id="portal-tab-recommendations" ref="recommendationsTab" type="button" role="tab" aria-controls="portal-panel-recommendations" :aria-selected="activeView === 'recommendations'" :tabindex="activeView === 'recommendations' ? 0 : -1" @keydown="handleTabKeydown" @click="setView('recommendations')">首页推荐位</button>
      <button id="portal-tab-visuals" ref="visualsTab" type="button" role="tab" aria-controls="portal-panel-visuals" :aria-selected="activeView === 'visuals'" :tabindex="activeView === 'visuals' ? 0 : -1" @keydown="handleTabKeydown" @click="setView('visuals')">页面主视觉</button>
    </div>

    <p v-if="statusMessage" class="admin-portal-message" role="status">{{ statusMessage }}</p>
    <p v-if="errorMessage" class="admin-portal-message is-error" role="alert">{{ errorMessage }}</p>
    <div v-if="!canPublish" class="admin-fixed-notice"><strong>发布权限</strong><p>你可以保存和预览门户草稿；整份发布仅限联盟总负责人。</p></div>
    <div v-if="publishedProjection.warnings.length" class="admin-portal-warnings" role="status">
      <strong>公开配置需要重新确认</strong>
      <ul><li v-for="warning in publishedProjection.warnings" :key="`${warning.slot}-${warning.sourceId}`">{{ warningText(warning) }}</li></ul>
    </div>

    <section v-if="activeView === 'recommendations'" id="portal-panel-recommendations" role="tabpanel" aria-labelledby="portal-tab-recommendations" tabindex="0">
      <div class="admin-fixed-notice"><strong>固定模块，不允许删除</strong><p>可替换、移除、上移和下移条目；容量由首页设计基线控制。每次操作都会保存草稿。</p><span>草稿版本 {{ configStore.draftConfig.revision }}</span></div>
      <section class="admin-home-slots" aria-label="首页固定模块">
        <article v-for="(slot, slotIndex) in HOMEPAGE_SLOTS" :key="slot.id">
          <header><div><span>{{ String(slotIndex + 1).padStart(2, "0") }} / FIXED SLOT</span><h2>{{ slot.label }}</h2><p>{{ slot.description }}</p></div><AdminStatusPill :status="`${configStore.draftConfig.slots[slot.id].length} / ${slot.capacity}`" /></header>
          <ol>
            <li v-for="(reference, itemIndex) in configStore.draftConfig.slots[slot.id]" :key="referenceKey(reference)">
              <span>{{ itemIndex + 1 }}</span>
              <label><span class="sr-only">替换{{ slot.label }}第 {{ itemIndex + 1 }} 项</span><select :value="referenceKey(reference)" @change="selectReference(slot.id, itemIndex, $event)"><option v-if="currentReferenceIssue(slot.id, itemIndex, reference)" :value="referenceKey(reference)" disabled>{{ currentReferenceIssue(slot.id, itemIndex, reference) }}</option><option v-for="candidate in candidatesFor(slot.id, itemIndex)" :key="referenceKey(candidate)" :value="referenceKey(candidate)">{{ candidate.title }}</option></select></label>
              <div class="admin-slot-actions"><button type="button" :aria-label="`上移 ${referenceLabel(reference)}`" :disabled="itemIndex === 0" @click="moveReference(slot.id, itemIndex, 'up')">上移</button><button type="button" :aria-label="`下移 ${referenceLabel(reference)}`" :disabled="itemIndex === configStore.draftConfig.slots[slot.id].length - 1" @click="moveReference(slot.id, itemIndex, 'down')">下移</button><button type="button" :aria-label="`移除 ${referenceLabel(reference)}`" @click="removeReference(slot.id, itemIndex)">移除</button></div>
            </li>
            <li v-if="configStore.draftConfig.slots[slot.id].length < slot.capacity" class="is-empty">
              <span>{{ configStore.draftConfig.slots[slot.id].length + 1 }}</span>
              <label><span class="sr-only">添加{{ slot.label }}</span><select value="" @change="selectReference(slot.id, configStore.draftConfig.slots[slot.id].length, $event)"><option value="" disabled>选择已发布内容</option><option v-for="candidate in candidatesFor(slot.id, configStore.draftConfig.slots[slot.id].length)" :key="referenceKey(candidate)" :value="referenceKey(candidate)">{{ candidate.title }}</option></select></label>
            </li>
          </ol>
          <footer><small>容量上限 {{ slot.capacity }} 条</small><span>{{ slot.allowedTypes.join(" / ") }}</span></footer>
        </article>
      </section>
    </section>

    <section v-else id="portal-panel-visuals" class="admin-portal-visuals" role="tabpanel" aria-labelledby="portal-tab-visuals" tabindex="0">
      <article v-for="visual in [{ id: 'home' as const, label: '官网首页', note: '首页首屏主视觉' }, { id: 'join' as const, label: '加入我们', note: '招新页面主视觉' }]" :key="visual.id">
        <header><div><span>PREDEFINED VISUAL</span><h2>{{ visual.label }}</h2><p>{{ visual.note }}</p></div><AdminStatusPill status="预定义位置" /></header>
        <div class="admin-portal-visual-preview"><strong>{{ usableVisualAssets.find((asset) => asset.id === visualDraft[visual.id].assetId)?.name ?? "未选择素材" }}</strong><small>{{ visualDraft[visual.id].alt || "等待替代文本" }}</small></div>
        <label>{{ visual.label }}主视觉素材<select v-model="visualDraft[visual.id].assetId"><option value="">不使用素材</option><option v-for="asset in usableVisualAssets" :key="asset.id" :value="asset.id">{{ asset.name }}</option></select></label>
        <label>替代文本<input v-model="visualDraft[visual.id].alt" type="text" :placeholder="`${visual.label}主视觉的无障碍描述`"></label>
        <label>辅助文案<textarea v-model="visualDraft[visual.id].supportingText" rows="3" placeholder="显示在主视觉素材位中的简短说明"></textarea></label>
      </article>
      <footer><p>招新按钮是否可用仍由招新批次控制，门户配置不能覆盖批次开放状态。</p><button type="button" class="button" @click="saveVisualDraft">保存主视觉草稿</button></footer>
    </section>

    <Teleport to="body">
      <div v-if="showPreview" class="admin-drawer-backdrop" @click.self="closeDialog('preview')" @keydown="handleDialogKeydown($event, 'preview')">
        <aside ref="previewDialog" class="admin-candidate-drawer admin-portal-preview" role="dialog" aria-modal="true" aria-labelledby="portal-preview-title" aria-describedby="portal-preview-description">
          <header class="admin-drawer__header"><div><span>DRAFT PREVIEW</span><h2 id="portal-preview-title">门户草稿预览</h2><p id="portal-preview-description">此视图只读取草稿版本 {{ configStore.draftConfig.revision }}，不会改变公开页面。</p></div><button ref="previewCloseButton" type="button" aria-label="关闭预览" @click="closeDialog('preview')">×</button></header>
          <div class="admin-drawer__body"><section v-for="slot in HOMEPAGE_SLOTS" :key="slot.id"><header><span>{{ slot.capacity }}</span><h3>{{ slot.label }}</h3></header><ol :aria-label="`${slot.label}预览`"><li v-for="item in previewProjection.slots[slot.id]" :key="item.sourceId"><strong>{{ item.title }}</strong><small v-if="item.fallbackFor">自动补位：替代 {{ item.fallbackFor }}</small></li><li v-if="!previewProjection.slots[slot.id].length">暂无可用内容</li></ol></section></div>
        </aside>
      </div>
      <div v-if="showPublishConfirmation" class="admin-confirm-backdrop" @keydown="handleDialogKeydown($event, 'publish')"><section ref="publishDialog" role="dialog" aria-modal="true" aria-labelledby="portal-publish-title" aria-describedby="portal-publish-description"><span>ATOMIC PORTAL PUBLICATION</span><h2 id="portal-publish-title">确认整份发布门户配置？</h2><p id="portal-publish-description">发布前会校验全部容量、重复引用和候选有效性。任一校验失败时，当前公开版本保持不变。</p><div><button ref="publishCancelButton" type="button" class="button button--ghost" @click="closeDialog('publish')">返回检查</button><button type="button" class="button" @click="publishConfiguration">确认整份发布</button></div></section></div>
    </Teleport>
  </div>
</template>
