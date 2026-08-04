<script setup lang="ts">
definePageMeta({ layout: "admin" });

const route = useRoute();
const batchId = computed(() => (
  typeof route.query.batchId === "string" ? route.query.batchId : "batch-current"
));

useHead({ title: "结果发布｜HSD 管理台" });
</script>

<template>
  <AdminRecruitmentPublicationWorkbench :batch-id="batchId" />
</template>
