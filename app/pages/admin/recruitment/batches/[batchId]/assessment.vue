<script setup lang="ts">
definePageMeta({ layout: "admin" });

const route = useRoute();
const batchId = computed(() => String(route.params.batchId));

useHead(() => ({ title: `${batchId.value} 预备成员考核｜HSD 管理台` }));
</script>

<template>
  <AdminRecruitmentAssessmentWorkbench :batch-id="batchId" show-back-link />
</template>
