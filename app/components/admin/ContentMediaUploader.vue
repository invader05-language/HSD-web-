<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ContentMediaAttachment } from "~/types/content-media";
import { useContentMediaUpload } from "~/composables/useContentMediaUpload";
import type { ContentMediaUploadOwner } from "~/services/content-media/api-content-media.gateway";

const props = withDefaults(defineProps<{
  modelValue: ContentMediaAttachment[];
  mode: "cover" | "collection";
  maxItems?: number;
  title?: string;
  description?: string;
  owner?: Omit<ContentMediaUploadOwner, "role" | "sortOrder">;
}>(), {
  title: "上传素材",
  description: "支持图片或视频，上传后可在此预览和编辑素材信息。",
});

const emit = defineEmits<{ "update:modelValue": [value: ContentMediaAttachment[]] }>();
const fileInput = ref<HTMLInputElement | null>(null);
const items = ref<ContentMediaAttachment[]>([...props.modelValue]);
const uploadError = ref("");
const isUploading = ref(false);
const { upload, updateDetails } = useContentMediaUpload();

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
        uploadError.value = error instanceof Error ? error.message : "素材上传失败";
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
  const input = event.target as HTMLInputElement;
  if (input.files) void addFiles(input.files);
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer?.files) void addFiles(event.dataTransfer.files);
}

function updateItem(index: number, patch: Partial<ContentMediaAttachment>) {
  const current = items.value[index];
  if (!current) return;
  items.value[index] = { ...current, ...patch };
  publishItems();
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
        <p class="eyebrow">CONTENT MEDIA</p>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <span v-if="hasUploading" class="content-media-uploader__status">素材处理中</span>
    </header>

    <div
      class="content-media-uploader__dropzone"
      role="button"
      tabindex="0"
      @click="fileInput?.click()"
      @keydown.enter.prevent="fileInput?.click()"
      @keydown.space.prevent="fileInput?.click()"
      @dragover.prevent
      @drop="onDrop"
    >
      <strong>{{ mode === "cover" && items.length ? "替换封面" : "添加图片或视频" }}</strong>
      <span>拖拽文件到这里，或点击选择；上传后可立即审阅</span>
      <input ref="fileInput" type="file" :accept="accept" :multiple="mode === 'collection'" hidden @change="onFileChange">
    </div>

    <p v-if="uploadError" class="content-media-uploader__error" role="alert">{{ uploadError }}</p>

    <div v-if="items.length" class="content-media-uploader__items">
      <article v-for="(item, index) in items" :key="item.id" class="content-media-uploader__item">
        <ContentMediaView :item="item" preview="thumbnail" :controls="false" />
        <div class="content-media-uploader__item-body">
          <div class="content-media-uploader__item-heading">
            <strong>{{ item.kind === "video" ? "视频" : "图片" }} · {{ item.status === "ready" ? "可发布" : item.status }}</strong>
            <button type="button" class="button button--text" @click="removeItem(index)">移除</button>
          </div>
          <label v-if="item.role === 'detail'">标题<input :value="item.title" @input="updateItem(index, { title: inputValue($event) })"></label>
          <label v-if="item.role === 'detail'">说明<textarea :value="item.caption" rows="2" @input="updateItem(index, { caption: textareaValue($event) })"></textarea></label>
          <label>替代文本<input :value="item.alt" placeholder="描述用户看不到的画面内容" @input="updateItem(index, { alt: inputValue($event) })"></label>
          <label v-if="item.role === 'detail'">比例<select :value="item.aspect" @change="updateItem(index, { aspect: aspectValue($event) })"><option value="landscape">横向</option><option value="portrait">纵向</option><option value="wide">宽幅</option></select></label>
          <div v-if="mode === 'collection'" class="content-media-uploader__sort-actions">
            <button type="button" class="button button--text" :disabled="index === 0" @click="moveItem(index, -1)">上移</button>
            <button type="button" class="button button--text" :disabled="index === items.length - 1" @click="moveItem(index, 1)">下移</button>
          </div>
          <small v-if="item.errorMessage" class="content-media-uploader__error">{{ item.errorMessage }}</small>
        </div>
      </article>
    </div>
    <p v-else class="content-media-uploader__empty">尚未添加素材。保存草稿不会丢失其他已填写内容。</p>
    <p v-if="isUploading" class="sr-only" role="status">正在上传素材</p>
  </section>
</template>
