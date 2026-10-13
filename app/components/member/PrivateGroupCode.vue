<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import type { GroupCodeReferenceDto } from '../../../packages/api-client/src';
const props = defineProps<{ code: GroupCodeReferenceDto; readImage: (url: string) => Promise<Blob> }>();
const emit = defineEmits<{ refresh: []; unauthorized: [] }>();
const blobUrl = ref(''), error = ref(''), loading = ref(false), expanded = ref(false);
let generation = 0;
let conflictRetried = false;
function release() { if (blobUrl.value) URL.revokeObjectURL(blobUrl.value); blobUrl.value = ''; expanded.value = false; }
async function load() {
  const request = ++generation;
  release(); error.value = ''; loading.value = false;
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
    if (status === 401) { emit('unauthorized'); return; }
    if (status === 409 && !conflictRetried) { conflictRetried = true; emit('refresh'); }
    error.value = status === 404 ? '二维码暂不可用，请刷新结果。' : status === 409 ? '二维码已更新，正在同步。' : '二维码加载失败，请检查网络后重试。';
  } finally { if (request === generation) loading.value = false; }
}
watch(() => [props.code.id, props.code.version, props.code.status, props.code.imageUrl], () => { void load(); }, { immediate: true });
onBeforeUnmount(() => { generation++; release(); });
</script>

<template>
  <div class="private-group-code">
    <p v-if="code.status === 'MISSING'" class="private-group-code__empty">二维码暂未上传</p>
    <p v-else-if="loading" role="status">正在加载二维码…</p>
    <div v-else-if="error" role="alert"><p>{{ error }}</p><button v-if="!error.includes('正在同步')" type="button" @click="load">重试加载</button></div>
    <button v-else-if="blobUrl" class="private-group-code__image" type="button" aria-label="查看二维码原图" @click="expanded = true"><img :src="blobUrl" alt="部门群二维码"></button>
    <dialog :open="expanded" class="private-group-code__dialog" @keydown.esc="expanded = false" @click.self="expanded = false">
      <div><button type="button" autofocus @click="expanded = false">关闭原图</button><img v-if="expanded && blobUrl" :src="blobUrl" alt="部门群二维码原图"></div>
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
