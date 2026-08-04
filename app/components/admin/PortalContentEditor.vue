<script setup lang="ts">
import type { ContentBlock, PortalContentDraftInput, PortalContentKind, PortalContentRecord } from "~/types/portal-content";
import { PORTAL_CONTENT_KIND_LABELS, PORTAL_CONTENT_STATUS_LABELS } from "~/data/admin-content";
import { usePortalContentStore } from "~/stores/portal-content";
import { useSessionStore } from "~/stores/session";
import { ADMIN_ASSETS, canSelectAsset, canUseAssetForPortalContent } from "~/data/admin-assets";
import { isSafeInternalPath } from "~/utils/internal-route";

const props = defineProps<{ record?: PortalContentRecord; initialKind?: PortalContentKind }>();
const emit = defineEmits<{ saved: [id: string] }>();
const content = usePortalContentStore();
const session = useSessionStore();
const kind = ref<PortalContentKind>(props.record?.kind ?? props.initialKind ?? "article");
const title = ref(props.record?.title ?? "");
const summary = ref(props.record?.summary ?? "");
const target = ref(props.record?.target.value ?? "/activities");
const expiresAt = ref(props.record?.expiresAt?.slice(0, 16) ?? "");
const blocks = ref<ContentBlock[]>(structuredClone(props.record?.blocks ?? [{ type: "paragraph", text: "" }]));
const error = ref("");
const notice = ref("");
const unpublishReason = ref("");
const rejectionReason = ref("");
const actionPending = ref(false);

const isOwner = computed(() => session.adminLevel === "owner");
const currentStatus = computed(() => props.record ? PORTAL_CONTENT_STATUS_LABELS[props.record.status] : "草稿");
const isReadOnly = computed(() => Boolean(props.record && ["in-review", "pending-publication"].includes(props.record.status)));
const approvedImageAssets = computed(() => ADMIN_ASSETS.filter((asset) => asset.type === "图片" && canSelectAsset(asset)));

function buildInput(): PortalContentDraftInput {
  return {
    kind: kind.value,
    title: title.value,
    summary: summary.value,
    ...(kind.value === "flash" ? { target: { type: "internal-route" as const, value: target.value } } : {}),
    blocks: blocks.value.filter((block) => block.type === "image" || block.text.trim()),
    ...(expiresAt.value ? { expiresAt: new Date(expiresAt.value).toISOString() } : {})
  };
}

function validate() {
  if (!title.value.trim() || !summary.value.trim()) {
    error.value = "请填写标题和摘要。";
    return false;
  }
  if (kind.value === "flash" && !isSafeInternalPath(target.value)) {
    error.value = "站内目标必须是以 / 开头的规范站内路径，例如 /join 或 /activities/foo。";
    return false;
  }
  const invalidImage = blocks.value
    .filter((block): block is Extract<ContentBlock, { type: "image" }> => block.type === "image")
    .find((block) => !block.assetId.trim() || !canUseAssetForPortalContent(block.assetId) || !block.alt.trim());
  if (invalidImage) {
    error.value = !invalidImage.assetId.trim()
      ? "图片内容块请选择一个处理完成且审核通过的媒体库素材。"
      : !canUseAssetForPortalContent(invalidImage.assetId)
        ? "所选图片素材尚未处理完成或未通过审核，请重新选择媒体库素材。"
        : "图片内容块必须填写替代文本。";
    return false;
  }
  if ((kind.value === "article" || kind.value === "notice") && !blocks.value.some((block) => block.type !== "image" && block.text.trim())) {
    error.value = "新闻和公告至少需要一个标题或正文内容块。";
    return false;
  }
  return true;
}

function saveDraft() {
  error.value = "";
  notice.value = "";
  if (!validate()) return;
  try {
    const saved = props.record
      ? content.updateDraft(props.record.id, buildInput())
      : content.createDraft(buildInput());
    notice.value = "草稿已保存。";
    emit("saved", saved.id);
  } catch (caught) {
    error.value = caught instanceof Error && caught.message === "PORTAL_CONTENT_DUPLICATE_SLUG"
      ? "标题生成的详情 Slug 已被其他内容使用，请修改标题后重试。"
      : caught instanceof Error && caught.message === "PORTAL_CONTENT_PERSISTENCE_FAILED"
        ? "本地存储失败，草稿未保存，请释放浏览器存储空间后重试。"
        : caught instanceof Error ? "当前状态不能保存草稿。" : "保存草稿失败。";
  }
}

function submitForReview() {
  saveDraft();
  if (error.value || !props.record) return;
  try {
    content.submitForReview(props.record.id);
    notice.value = "已提交审核。";
  } catch {
    error.value = "当前内容无法提交审核。";
  }
}

function completeAction(action: "return" | "approve" | "publish" | "unpublish") {
  if (!props.record) return;
  error.value = "";
  try {
    if (action === "return") content.returnToDraft(props.record.id, rejectionReason.value);
    if (action === "approve") content.approve(props.record.id);
    if (action === "publish") content.publish(props.record.id, true);
    if (action === "unpublish") content.unpublish(props.record.id, unpublishReason.value);
    actionPending.value = false;
    notice.value = action === "return"
      ? "已退回草稿。"
      : action === "approve" ? "审核通过，内容进入待发布。" : action === "publish" ? "已发布到官网。" : "内容已下架。";
  } catch (caught) {
    error.value = caught instanceof Error && caught.message === "PORTAL_CONTENT_PERMISSION_REQUIRED"
      ? "只有联盟总负责人可以执行此操作。"
      : caught instanceof Error && caught.message === "PORTAL_CONTENT_PERSISTENCE_FAILED"
        ? "本地存储失败，操作未生效，官网公开版本保持不变。"
        : "操作未完成，请检查状态和原因。";
  }
}

function addBlock(type: ContentBlock["type"]) {
  if (type === "image") blocks.value.push({ type, assetId: "", alt: "" });
  else blocks.value.push({ type, text: "" });
}

function removeBlock(index: number) {
  blocks.value.splice(index, 1);
}
</script>

<template>
  <section class="admin-content-editor" :aria-label="record ? '官网内容编辑器' : '新建官网内容'">
    <p v-if="error" class="admin-content-editor__message is-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-content-editor__message" role="status">{{ notice }}</p>
    <div class="admin-content-editor__layout">
      <div class="admin-content-editor__form">
        <section><header><span>01</span><h2>基础信息</h2><AdminStatusPill :status="currentStatus" /></header><div class="admin-editor-grid"><label>内容类型<select v-model="kind" :disabled="Boolean(record)"><option v-for="(label, value) in PORTAL_CONTENT_KIND_LABELS" :key="value" :value="value">{{ label }}</option></select></label><label v-if="kind === 'flash'">站内目标<input v-model="target" :disabled="isReadOnly" placeholder="/activities"></label><p v-else class="admin-inline-note">详情地址将在保存后按内容 Slug 自动生成。</p><label class="is-wide">标题<input v-model="title" :disabled="isReadOnly"></label><label class="is-wide">摘要<textarea v-model="summary" :disabled="isReadOnly" rows="4"></textarea></label><label v-if="kind === 'flash'">失效时间（可选）<input v-model="expiresAt" :disabled="isReadOnly" type="datetime-local"></label></div></section>
        <section v-if="kind !== 'flash'"><header><span>02</span><h2>结构化正文</h2></header><div class="admin-content-blocks"><article v-for="(block, index) in blocks" :key="index"><label>{{ block.type === 'heading' ? '小标题' : block.type === 'paragraph' ? '正文段落' : '媒体库素材' }}<template v-if="block.type === 'image'"><select v-model="block.assetId" :disabled="isReadOnly"><option value="">选择已审核图片素材</option><option v-for="asset in approvedImageAssets" :key="asset.id" :value="asset.id">{{ asset.name }}</option></select><input v-model="block.alt" :disabled="isReadOnly" placeholder="替代文本"></template><textarea v-else v-model="block.text" :disabled="isReadOnly" :rows="block.type === 'heading' ? 2 : 4"></textarea></label><button v-if="!isReadOnly" type="button" :aria-label="`移除第 ${index + 1} 个内容块`" @click="removeBlock(index)">移除</button></article></div><div v-if="!isReadOnly" class="admin-content-editor__block-actions"><button type="button" @click="addBlock('heading')">添加标题</button><button type="button" @click="addBlock('paragraph')">添加段落</button><button type="button" @click="addBlock('image')">添加图片</button></div></section>
        <section v-if="record"><header><span>03</span><h2>审核与发布</h2></header><p v-if="!isOwner" class="admin-inline-note">普通管理员可保存草稿、提交审核和预览；审核、发布与下架由联盟总负责人执行。</p><div v-else class="admin-content-editor__review-actions"><template v-if="record.status === 'in-review'"><label>退回原因<input v-model="rejectionReason" placeholder="必填：说明需要修改的内容"></label><button type="button" :disabled="!rejectionReason.trim()" @click="completeAction('return')">退回草稿</button><button type="button" @click="actionPending = true">审核通过</button></template><button v-if="record.status === 'pending-publication'" type="button" class="button" @click="actionPending = true">发布内容</button><label v-if="record.publishedState === 'published'">下架原因<input v-model="unpublishReason" placeholder="说明下架原因"></label><button v-if="record.publishedState === 'published'" type="button" @click="completeAction('unpublish')">确认下架</button></div></section>
      </div>
      <aside class="admin-content-editor__sidebar"><span>Public Projection</span><h2>{{ title || '未命名内容' }}</h2><p>{{ summary || '摘要将在这里显示。' }}</p><small>{{ PORTAL_CONTENT_KIND_LABELS[kind] }} · {{ currentStatus }}</small><NuxtLink v-if="record" :to="`/admin/content/${record.id}/preview`">打开预览</NuxtLink></aside>
    </div>
    <footer class="admin-content-editor__footer"><NuxtLink class="button button--ghost" to="/admin/content">返回列表</NuxtLink><button v-if="!isReadOnly" type="button" class="button button--ghost" @click="saveDraft">保存草稿</button><button v-if="record?.status === 'draft'" type="button" class="button" @click="submitForReview">提交审核</button></footer>
    <div v-if="actionPending" class="admin-confirm-backdrop"><section role="alertdialog" aria-label="发布确认"><span>Publication Confirmation</span><h2>{{ record?.status === 'in-review' ? '确认审核通过？' : '确认发布内容？' }}</h2><p>此操作会记录操作者、实际时间与内容版本。</p><div><button type="button" class="button button--ghost" @click="actionPending = false">返回检查</button><button type="button" class="button" @click="completeAction(record?.status === 'in-review' ? 'approve' : 'publish')">确认操作</button></div></section></div>
  </section>
</template>
