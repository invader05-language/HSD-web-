<script setup lang="ts">
definePageMeta({ layout: "admin" });

const route = useRoute();
const batchId = computed(() => (
  typeof route.query.batchId === "string" ? route.query.batchId : "batch-current"
));

useHead({ title: "预备成员考核台｜白云 HSD 开发者部落" });
</script>

<template>
  <AdminRecruitmentAssessmentWorkbench :batch-id="batchId" />
</template>
