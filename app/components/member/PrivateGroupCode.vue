<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue';
import type { GroupCodeReferenceDto } from '../../../packages/api-client/src';
const props = defineProps<{ code: GroupCodeReferenceDto; readImage: (url: string) => Promise<Blob>; context?: 'admin' | 'member' }>();
const emit = defineEmits<{ refresh: []; unauthorized: [] }>();
const blobUrl = ref(''), error = ref(''), loading = ref(false), expanded = ref(false);
const originalDialog = ref<HTMLDialogElement>();
let generation = 0;
let conflictRetried = false;
let automaticRetries = 0;
let retryable = false;
const MAX_AUTOMATIC_RETRIES = 2;
function closeOriginal() { originalDialog.value?.close(); expanded.value = false; }
async function openOriginal() { expanded.value = true; await nextTick(); if (expanded.value && blobUrl.value) originalDialog.value?.showModal(); }
function release() { closeOriginal(); if (blobUrl.value) URL.revokeObjectURL(blobUrl.value); blobUrl.value = ''; }
async function load() {
  const request = ++generation;
  release(); error.value = ''; loading.value = false; retryable = false;
  if (props.code.status !== 'READY' || !props.code.imageUrl) return;
  loading.value = true;
  try {
    const blob = await props.readImage(props.code.imageUrl);
    if (request !== generation) return;
    blobUrl.value = URL.createObjectURL(blob);
    conflictRetried = false;
  } catch (cause) {
    if (request !== generation) return;
    const status = (cause as { status?: number })?.status;
    retryable = status !== 401 && status !== 403;
    if (status === 401) { emit('unauthorized'); return; }
    if (status === 409 && !conflictRetried) { conflictRetried = true; emit('refresh'); }
    error.value = status === 403 ? '当前账号没有预览此二维码的权限，请刷新配置。' : status === 404 ? (props.context === 'admin' ? '二维码图片暂不可用，请刷新配置。' : '二维码暂不可用，请刷新结果。') : status === 409 ? '二维码已更新，正在同步。' : props.context === 'admin' ? '二维码已保存，预览加载失败，请重试预览。' : '二维码加载失败，请检查网络后重试。';
  } finally { if (request === generation) loading.value = false; }
}
// A fresh context with the same reference may recover a failed image. Keep a
// successful image (and its open original) intact, and bound automatic retries.
watch([() => props.code, () => props.code.id, () => props.code.version, () => props.code.status, () => props.code.imageUrl], (current, previous) => {
  const changed = !previous?.length || current.slice(1).some((value, index) => value !== previous[index + 1]);
  if (changed) { automaticRetries = 0; void load(); }
  else if (error.value && retryable && !loading.value && automaticRetries < MAX_AUTOMATIC_RETRIES) {
    automaticRetries++; void load();
  }
}, { immediate: true });
onBeforeUnmount(() => { generation++; release(); });
</script>

<template>
  <div class="private-group-code">
    <p v-if="code.status === 'MISSING'" class="private-group-code__empty">二维码暂未上传</p>
    <p v-else-if="loading" role="status">正在加载二维码…</p>
    <div v-else-if="error" role="alert"><p>{{ error }}</p><button v-if="!error.includes('正在同步')" type="button" @click="load">重试加载</button></div>
    <button v-else-if="blobUrl" class="private-group-code__image" type="button" aria-label="查看二维码原图" @click="openOriginal"><img :src="blobUrl" alt="部门群二维码"></button>
    <dialog ref="originalDialog" class="private-group-code__dialog" aria-label="部门群二维码原图" @close="expanded = false" @cancel="expanded = false" @click.self="closeOriginal">
      <div><button type="button" autofocus @click="closeOriginal">关闭原图</button><img v-if="expanded && blobUrl" :src="blobUrl" alt="部门群二维码原图"></div>
    </dialog>
  </div>
</template>

<style scoped>
.private-group-code { padding: 20px 0; text-align: center; }
.private-group-code__image { width: min(244px, 100%); padding: 12px; background: white; border: 1px solid #e4e1dc; cursor: zoom-in; }
.private-group-code img { display: block; width: 100%; height: auto; object-fit: contain; }
.private-group-code__empty { padding: 70px 16px; background: #f8f7f4; color: #696662; }
.private-group-code__dialog { position: fixed; inset: 0; z-index: 1000; width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 24px; border: 0; background: rgb(0 0 0 / .75); }
.private-group-code__dialog[open] { display: grid; place-items: center; }
.private-group-code__dialog > div { max-width: min(90vw, 700px); max-height: 90dvh; overflow: auto; background: white; padding: 20px; }
.private-group-code__dialog button { display: block; margin: 0 0 16px auto; }
</style>
