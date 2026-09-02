<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { CreateContentDto, UpdateContentDto } from "../../../packages/api-client/src";
import type { AdminContentDetail, AdminContentDetailBlock } from "~/services/content/admin-content-detail";
import { useContentGateway } from "~/composables/useContentGateway";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { useSessionStore } from "~/stores/session";
import { useAdminToast } from "~/composables/useAdminToast";
import type { ContentMediaAttachment } from "~/types/content-media";
import ContentMediaUploader from "~/components/admin/ContentMediaUploader.vue";

type ContentKind = "flash" | "article" | "notice";
type EditableBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; attachmentId: string; alt: string; caption?: string };

const props = defineProps<{ record?: AdminContentDetail }>();
const emit = defineEmits<{ saved: [id: string]; reload: [] }>();
const gateway = useContentGateway();
const organizationGateway = useOrganizationGateway();
const session = useSessionStore();
const adminToast = useAdminToast();

const kind = ref<ContentKind>(props.record?.kind ?? "article");
const centerId = ref(props.record?.centerId ?? session.currentAccount?.adminCenterId ?? "");
const centerOptions = ref<Array<{ id: string; name: string }>>([]);
const slug = ref(props.record?.slug ?? "");
const title = ref(props.record?.title ?? "");
const summary = ref(props.record?.summary ?? "");
const tag = ref(props.record?.tag ?? "");
const internalTarget = ref(props.record?.internalTarget ?? "/activities");
const expiresAt = ref(props.record?.expiresAt?.slice(0, 16) ?? "");
const blocks = ref<EditableBlock[]>([]);
const mediaItems = ref<ContentMediaAttachment[]>([]);
const reason = ref("");
const error = ref("");
const notice = ref("");
const pending = ref(false);
const reloadRequired = ref(false);

const isNew = computed(() => !props.record);
const isOwner = computed(() => session.adminLevel === "owner");
const isReadOnly = computed(() => Boolean(props.record && ["review", "pending_publication"].includes(props.record.canonicalStatus)));
const canReview = computed(() => session.hasCapability("content.review"));
const canPublish = computed(() => session.hasCapability("content.publish"));
const mediaOwner = computed(() => props.record?.centerId ? {
  centerId: props.record.centerId,
  ownerType: "content" as const,
  ownerId: props.record.id,
} : undefined);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function createSlug() {
  const normalized = slug.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 110);
  return normalized || `content-${Date.now().toString(36)}`;
}

function blockFromRecord(block: AdminContentDetailBlock): EditableBlock {
  if (block.type === "heading") return { type: "heading", level: block.level, text: block.text };
  if (block.type === "paragraph") return { type: "paragraph", text: block.text };
  return { type: "image", attachmentId: block.attachmentId, alt: block.alt, ...(block.caption ? { caption: block.caption } : {}) };
}

function syncFromRecord(record: AdminContentDetail | undefined) {
  if (!record) return;
  kind.value = record.kind;
  centerId.value = record.centerId ?? session.currentAccount?.adminCenterId ?? "";
  slug.value = record.slug;
  title.value = record.title;
  summary.value = record.summary;
  tag.value = record.tag ?? "";
  internalTarget.value = record.internalTarget ?? "/activities";
  expiresAt.value = record.expiresAt?.slice(0, 16) ?? "";
  blocks.value = record.blocks.map(blockFromRecord);
  mediaItems.value = [];
  reloadRequired.value = false;
  error.value = "";
}

watch(() => props.record, syncFromRecord, { immediate: true });

onMounted(async () => {
  if (!organizationGateway || !isOwner.value) return;
  try {
    const response = await organizationGateway.listCenters();
    centerOptions.value = response.items.filter((item) => item.active).map((item) => ({ id: item.id, name: item.name }));
  } catch {
    error.value = "中心列表读取失败，请确认权限后重试。";
  }
});

const missingFields = computed(() => {
  const missing: string[] = [];
  if (!title.value.trim()) missing.push("标题");
  if (!centerId.value.trim()) missing.push("归属中心");
  if (kind.value === "flash") {
    if (!tag.value.trim()) missing.push("标签");
    if (!internalTarget.value.trim()) missing.push("站内目标");
  } else {
    if (!summary.value.trim()) missing.push("摘要");
    if (!blocks.value.some((block) => block.type !== "image" && block.text.trim())) missing.push("正文");
  }
  return missing;
});

function blocksPayload(): Array<Record<string, unknown>> {
  if (kind.value === "flash") return [];
  return blocks.value.filter((block) => block.type === "image" || block.text.trim()).map((block) => {
    if (block.type === "image") return { type: "image", attachmentId: block.attachmentId, alt: block.alt.trim(), ...(block.caption?.trim() ? { caption: block.caption.trim() } : {}) };
    if (block.type === "heading") return { type: "heading", level: block.level, text: block.text.trim() };
    return { type: "paragraph", text: block.text.trim() };
  });
}

function validate() {
  if (!gateway) { error.value = "官网内容服务不可用，请稍后重试。"; return false; }
  if (isNew.value && slug.value.trim() && !slugPattern.test(slug.value.trim())) {
    error.value = "Slug 只能使用小写字母、数字和连字符。留空会自动生成。";
    return false;
  }
  if (missingFields.value.length) { error.value = `请补充：${missingFields.value.join("、")}。`; return false; }
  if (kind.value !== "flash" && !blocksPayload().length) { error.value = "新闻和公告至少需要一段正文。"; return false; }
  return true;
}

function commonPayload() {
  if (kind.value === "flash") return {
    title: title.value.trim(),
    tag: tag.value.trim(),
    internalTarget: internalTarget.value.trim(),
    ...(expiresAt.value ? { expiresAt: new Date(expiresAt.value).toISOString() } : {}),
  };
  return {
    title: title.value.trim(),
    summary: summary.value.trim(),
    blocks: blocksPayload(),
    ...(expiresAt.value ? { expiresAt: new Date(expiresAt.value).toISOString() } : {}),
  };
}

function fail(cause: unknown) {
  const api = cause as { status?: number; message?: string };
  if (api.status === 409) {
    reloadRequired.value = true;
    error.value = "版本冲突：当前草稿未覆盖，请重新读取服务端版本后再提交。";
  } else error.value = api.message || "内容操作失败，请稍后重试。";
}

async function save() {
  if (!validate()) return;
  pending.value = true;
  error.value = "";
  notice.value = "";
  try {
    const payload = commonPayload();
    const result = props.record
      ? await gateway!.content.update(props.record.id, { expectedVersion: props.record.version, ...payload } as UpdateContentDto)
      : await gateway!.content.create({ centerId: centerId.value.trim(), kind: kind.value, slug: createSlug(), ...payload } as CreateContentDto);
    notice.value = "草稿已保存。";
    adminToast.success(notice.value);
    emit("saved", result.id);
  } catch (cause) { fail(cause); }
  finally { pending.value = false; }
}

function addBlock(type: "heading" | "paragraph" | "image") {
  if (type === "heading") blocks.value.push({ type, level: 2, text: "" });
  else if (type === "paragraph") blocks.value.push({ type, text: "" });
  else blocks.value.push({ type, attachmentId: "", alt: "" });
}

function removeBlock(index: number) { blocks.value.splice(index, 1); }
function updateMedia(items: ContentMediaAttachment[]) { mediaItems.value = items; }
function appendUploadedImages() {
  const attachments = mediaItems.value.filter((item) => item.status === "ready");
  if (!attachments.length) return;
  for (const item of attachments) blocks.value.push({ type: "image", attachmentId: item.id, alt: item.alt ?? "", ...(item.caption ? { caption: item.caption } : {}) });
  mediaItems.value = [];
}

async function command(action: "submit" | "return" | "approve" | "publish" | "offline") {
  if (!gateway || !props.record) return;
  if (action === "submit" && !canReview.value) { error.value = "当前账号没有提交审核权限。"; return; }
  if (["return", "approve"].includes(action) && !canReview.value) { error.value = "当前账号没有审核权限。"; return; }
  if (["publish", "offline"].includes(action) && !canPublish.value) { error.value = "当前账号没有发布权限。"; return; }
  if (["return", "offline"].includes(action) && !reason.value.trim()) { error.value = "请填写原因。"; return; }
  if ((action === "publish" || action === "offline") && !window.confirm(action === "publish" ? "确认发布此内容？" : "确认下架此内容？")) return;
  pending.value = true;
  error.value = "";
  try {
    const version = props.record.version;
    const result = action === "submit" ? await gateway.content.submitReview(props.record.id, { expectedVersion: version })
      : action === "return" ? await gateway.content.returnDraft(props.record.id, { expectedVersion: version, reason: reason.value.trim() })
        : action === "approve" ? await gateway.content.approvePublication(props.record.id, { expectedVersion: version })
          : action === "publish" ? await gateway.content.publish(props.record.id, { expectedVersion: version, confirmed: true })
            : await gateway.content.offline(props.record.id, { expectedVersion: version, reason: reason.value.trim() });
    notice.value = action === "offline" ? "内容已下架。" : action === "publish" ? "内容已发布到官网。" : "内容状态已更新。";
    adminToast.success(notice.value);
    emit("saved", result.id);
  } catch (cause) { fail(cause); }
  finally { pending.value = false; }
}
</script>

<template>
  <section class="admin-content-editor" :aria-label="record ? '官网内容编辑器' : '新建官网内容'">
    <p v-if="error" class="admin-content-editor__message is-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-content-editor__message" role="status">{{ notice }}</p>
    <p v-if="reloadRequired" class="admin-inline-note">请重新读取服务端版本；不会自动覆盖当前草稿。</p>
    <div class="admin-content-editor__layout">
      <div class="admin-content-editor__form">
        <section>
          <header><h2>基础信息</h2><AdminStatusPill :status="record?.status ?? '草稿'" /></header>
          <div class="admin-editor-grid">
            <label v-if="isNew">归属中心<select v-model="centerId" :disabled="!isOwner"><option value="" disabled>选择归属中心</option><option v-if="!isOwner && centerId" :value="centerId">当前管理中心</option><option v-for="option in centerOptions" :key="option.id" :value="option.id">{{ option.name }}</option></select></label>
            <label v-if="isNew && isOwner">Slug（可选）<input v-model="slug" placeholder="留空则自动生成英文标识"></label>
            <label v-if="isNew">内容类型<select v-model="kind"><option value="article">新闻动态</option><option value="notice">通知公告</option><option value="flash">HSD 快讯</option></select></label>
            <label class="is-wide">标题<input v-model="title" :disabled="isReadOnly"></label>
            <template v-if="kind === 'flash'">
              <label>标签<input v-model="tag" :disabled="isReadOnly" placeholder="例如：活动通知"></label>
              <label>站内目标<input v-model="internalTarget" :disabled="isReadOnly" placeholder="例如：/activities"></label>
              <label>失效时间（可选）<input v-model="expiresAt" :disabled="isReadOnly" type="datetime-local"></label>
            </template>
            <template v-else>
              <label class="is-wide">摘要<textarea v-model="summary" :disabled="isReadOnly" rows="3"></textarea></label>
              <label>失效时间（可选）<input v-model="expiresAt" :disabled="isReadOnly" type="datetime-local"></label>
            </template>
          </div>
        </section>
        <section v-if="kind !== 'flash'">
          <header><h2>正文内容</h2><p>按顺序添加小标题、正文段落或图片。</p></header>
          <div class="admin-content-blocks">
            <article v-for="(block, index) in blocks" :key="index">
              <label v-if="block.type === 'heading'">小标题<textarea v-model="block.text" :disabled="isReadOnly" rows="2"></textarea></label>
              <label v-else-if="block.type === 'paragraph'">正文段落<textarea v-model="block.text" :disabled="isReadOnly" rows="5"></textarea></label>
              <div v-else class="admin-inline-note">正文图片附件：{{ block.attachmentId || "尚未上传" }}<input v-model="block.alt" :disabled="isReadOnly" placeholder="图片替代文本"><input v-if="block.caption !== undefined" v-model="block.caption" :disabled="isReadOnly" placeholder="图片说明（可选）"></div>
              <button v-if="!isReadOnly" type="button" class="button button--text" @click="removeBlock(index)">移除</button>
            </article>
          </div>
          <ContentMediaUploader v-if="!isReadOnly && mediaOwner" v-model="mediaItems" mode="collection" :max-items="10" :owner="mediaOwner" metadata-profile="full" title="上传正文图片" description="上传完成后点击“添加到正文”，素材会写入当前内容草稿。" />
          <p v-else-if="!isReadOnly" class="admin-inline-note">保存草稿后才能上传正文图片。</p>
          <button v-if="!isReadOnly" type="button" class="button button--ghost" @click="addBlock('heading')">添加小标题</button>
          <button v-if="!isReadOnly" type="button" class="button button--ghost" @click="addBlock('paragraph')">添加正文段落</button>
          <button v-if="!isReadOnly" type="button" class="button button--ghost" :disabled="!mediaItems.length" @click="appendUploadedImages">添加已上传图片</button>
        </section>
        <section v-if="record">
          <header><h2>审核与发布</h2></header>
          <div class="admin-content-editor__review-actions">
            <label v-if="record.canonicalStatus === 'review' || record.canonicalStatus === 'published'">处理原因<input v-model="reason" placeholder="退回或下架时必填"></label>
            <button v-if="record.canonicalStatus === 'draft'" type="button" :disabled="pending || reloadRequired" @click="command('submit')">提交审核</button>
            <button v-if="record.canonicalStatus === 'review'" type="button" :disabled="pending || !canReview" @click="command('return')">退回草稿</button>
            <button v-if="record.canonicalStatus === 'review'" type="button" :disabled="pending || !canReview" @click="command('approve')">审核通过</button>
            <button v-if="record.canonicalStatus === 'pending_publication'" type="button" class="button" :disabled="pending || !canPublish" @click="command('publish')">发布内容</button>
            <button v-if="record.canonicalStatus === 'published'" type="button" :disabled="pending || !canPublish" @click="command('offline')">确认下架</button>
          </div>
        </section>
      </div>
      <aside class="admin-content-editor__sidebar"><span>官网展示预览</span><h2>{{ title || "未命名内容" }}</h2><p>{{ summary || (kind === 'flash' ? "快讯将以标题和标签展示。" : "摘要将在这里显示。") }}</p><small>{{ kind === 'flash' ? 'HSD 快讯' : kind === 'notice' ? '通知公告' : '新闻动态' }} · {{ record?.status ?? '草稿' }}</small></aside>
    </div>
    <footer class="admin-content-editor__footer"><NuxtLink class="button button--ghost" to="/admin/content">返回列表</NuxtLink><button type="button" class="button" :disabled="pending || isReadOnly || reloadRequired" @click="save">保存草稿</button><button v-if="reloadRequired" type="button" @click="emit('reload')">重新读取</button></footer>
  </section>
</template>
