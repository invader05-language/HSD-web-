<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ContentMediaAttachment } from "~/types/content-media";
import { useContentMediaUpload } from "~/composables/useContentMediaUpload";
import type { ContentMediaUploadOwner } from "~/services/content-media/api-content-media.gateway";
import { localizeActivityError } from "~/utils/activity-errors";

const props = withDefaults(defineProps<{
  modelValue: ContentMediaAttachment[];
  mode: "cover" | "collection";
  maxItems?: number;
  title?: string;
  description?: string;
  owner?: Omit<ContentMediaUploadOwner, "role" | "sortOrder">;
  disabled?: boolean;
  metadataProfile?: "full" | "activity";
}>(), {
  title: "上传素材",
  description: "支持图片或视频，上传后可在此预览和编辑素材信息。",
  disabled: false,
  metadataProfile: "full",
});

const emit = defineEmits<{ "update:modelValue": [value: ContentMediaAttachment[]] }>();
const fileInput = ref<HTMLInputElement | null>(null);
const items = ref<ContentMediaAttachment[]>([...props.modelValue]);
const uploadError = ref("");
const isUploading = ref(false);
const { upload, updateDetails, updateMetadata } = useContentMediaUpload();

const accept = computed(() => props.mode === "cover" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/webm");
const hasUploading = computed(() => items.value.some((item) => ["uploading", "processing"].includes(item.status)));

watch(() => props.modelValue, (next) => {
  items.value = [...next];
}, { deep: true });

function publishItems() {
  emit("update:modelValue", props.mode === "cover"
    ? items.value.slice(0, 1)
    : updateDetails(items.value));
}

async function addFiles(files: FileList | File[]) {
  uploadError.value = "";
  const selected = Array.from(files);
  if (!selected.length) return;
  if (props.disabled) {
    uploadError.value = "请先保存草稿，再上传素材。";
    return;
  }
  isUploading.value = true;
  try {
    const remaining = props.maxItems === undefined ? selected.length : Math.max(0, props.maxItems - items.value.length);
    const nextFiles = props.mode === "cover" ? selected.slice(0, 1) : selected.slice(0, remaining);
    if (props.mode === "collection" && nextFiles.length < selected.length) uploadError.value = `最多可上传 ${props.maxItems} 项详情素材`;
    const uploaded = [];
    for (const file of nextFiles) {
      try {
        uploaded.push(await upload(file, props.mode, items.value.length + uploaded.length, props.owner));
      } catch (error) {
        uploadError.value = localizeActivityError(error);
      }
    }
    items.value = props.mode === "cover" ? uploaded : [...items.value, ...uploaded];
    publishItems();
  } finally {
    isUploading.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

function onFileChange(event: Event) {
  if (props.disabled) return;
  const input = event.target as HTMLInputElement;
  if (input.files) void addFiles(input.files);
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  if (props.disabled) return;
  if (event.dataTransfer?.files) void addFiles(event.dataTransfer.files);
}

function updateItem(index: number, patch: Partial<ContentMediaAttachment>) {
  const current = items.value[index];
  if (!current) return;
  items.value[index] = { ...current, ...patch };
  publishItems();
}

async function persistMetadata(index: number) {
  const current = items.value[index];
  if (!current?.serverOwned || !current.version) return;
  try {
    const updated = await updateMetadata(current);
    items.value[index] = updated;
    publishItems();
  } catch (error) {
    uploadError.value = `素材信息保存失败：${localizeActivityError(error)}`;
  }
}

function statusLabel(status: ContentMediaAttachment["status"]) {
  return status === "ready" ? "可发布" : status === "processing" ? "处理中" : status === "uploading" ? "上传中" : "处理失败";
}

function inputValue(event: Event) {
  return (event.target as HTMLInputElement).value;
}

function textareaValue(event: Event) {
  return (event.target as HTMLTextAreaElement).value;
}

function aspectValue(event: Event): ContentMediaAttachment["aspect"] {
  const value = (event.target as HTMLSelectElement).value;
  return value === "portrait" || value === "wide" ? value : "landscape";
}

function removeItem(index: number) {
  items.value.splice(index, 1);
  publishItems();
}

function moveItem(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.value.length) return;
  const next = [...items.value];
  const current = next[index];
  const replacement = next[target];
  if (!current || !replacement) return;
  next[index] = replacement;
  next[target] = current;
  items.value = next;
  publishItems();
}
</script>

<template>
  <section class="content-media-uploader" :data-mode="mode">
    <header class="content-media-uploader__header">
      <div>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <span v-if="hasUploading" class="content-media-uploader__status">素材处理中</span>
    </header>

    <div
      class="content-media-uploader__dropzone"
      role="button"
      :tabindex="disabled ? -1 : 0"
      :aria-disabled="disabled ? 'true' : undefined"
      @click="!disabled && fileInput?.click()"
      @keydown.enter.prevent="!disabled && fileInput?.click()"
      @keydown.space.prevent="!disabled && fileInput?.click()"
      @dragover.prevent
      @drop="onDrop"
    >
      <strong>{{ disabled ? "请先保存草稿" : mode === "cover" && items.length ? "替换封面" : "添加图片或视频" }}</strong>
      <span>{{ disabled ? "保存后即可上传并编辑素材信息" : "拖拽文件到这里，或点击选择；上传后可立即审阅" }}</span>
      <input ref="fileInput" type="file" :accept="accept" :multiple="mode === 'collection'" hidden @change="onFileChange">
    </div>

    <p v-if="uploadError" class="content-media-uploader__error" role="alert">{{ uploadError }}</p>

    <div v-if="items.length" class="content-media-uploader__items">
      <article v-for="(item, index) in items" :key="item.id" class="content-media-uploader__item">
        <ContentMediaView :item="item" preview="thumbnail" :controls="false" />
        <div class="content-media-uploader__item-body">
          <div class="content-media-uploader__item-heading">
            <strong>{{ item.kind === "video" ? "视频" : "图片" }} · {{ statusLabel(item.status) }}</strong>
            <button type="button" class="button button--text" @click="removeItem(index)">移除</button>
          </div>
          <label v-if="item.role === 'detail' && metadataProfile === 'full'">标题<input :value="item.title" @input="updateItem(index, { title: inputValue($event) })" @blur="persistMetadata(index)"></label>
          <label v-if="item.role === 'detail' && metadataProfile === 'full'">说明<textarea :value="item.caption" rows="2" @input="updateItem(index, { caption: textareaValue($event) })" @blur="persistMetadata(index)"></textarea></label>
          <label>{{ metadataProfile === 'activity' ? '图片内容描述' : '替代文本' }}<input :value="item.alt" placeholder="描述用户看不到的画面内容" @input="updateItem(index, { alt: inputValue($event) })" @blur="persistMetadata(index)"></label>
          <label v-if="item.role === 'detail'">比例<select :value="item.aspect" @change="updateItem(index, { aspect: aspectValue($event) }); persistMetadata(index)"><option value="landscape">横向</option><option value="portrait">纵向</option><option value="wide">宽幅</option></select></label>
          <div v-if="mode === 'collection'" class="content-media-uploader__sort-actions">
            <button type="button" class="button button--text" :disabled="index === 0" @click="moveItem(index, -1)">上移</button>
            <button type="button" class="button button--text" :disabled="index === items.length - 1" @click="moveItem(index, 1)">下移</button>
          </div>
          <small v-if="item.errorMessage" class="content-media-uploader__error">{{ localizeActivityError({ message: item.errorMessage }) }}</small>
        </div>
      </article>
    </div>
    <p v-else class="content-media-uploader__empty">尚未添加素材。保存草稿不会丢失其他已填写内容。</p>
    <p v-if="isUploading" class="sr-only" role="status">正在上传素材</p>
  </section>
</template>
