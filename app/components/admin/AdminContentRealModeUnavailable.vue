<script setup lang="ts">
defineProps<{ page: string }>();
</script>

<template>
  <section class="admin-empty" role="status">
    <h1>尚未接入真实 API</h1>
    <p>{{ page }}当前只支持 Mock 模式。真实模式已开放官网内容列表读取；详情与审核写入请使用服务端 API。</p>
    <NuxtLink class="button" to="/admin/content">返回官网内容列表</NuxtLink>
  </section>
</template>
