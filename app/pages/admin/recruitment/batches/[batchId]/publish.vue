<script setup lang="ts">
definePageMeta({ layout: "admin" });

const route = useRoute();
const batchId = computed(() => String(route.params.batchId));

useHead(() => ({ title: `${batchId.value} 结果发布｜HSD 管理台` }));
</script>

<template>
  <AdminRecruitmentPublicationWorkbench :batch-id="batchId" show-back-link />
</template>
