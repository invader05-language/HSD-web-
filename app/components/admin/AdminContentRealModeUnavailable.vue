<script setup lang="ts">
defineProps<{ page: string }>();
</script>

<template>
  <section class="admin-empty" role="status">
    <h1>尚未接入真实 API</h1>
    <p>{{ page }}当前只支持 Mock 模式。真实模式仅开放官网内容列表读取，详情、预览和写入将在后续接入。</p>
    <NuxtLink class="button" to="/admin/content">返回官网内容列表</NuxtLink>
  </section>
</template>
