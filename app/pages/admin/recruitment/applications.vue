<script setup lang="ts">
definePageMeta({ layout: "admin" });

const route = useRoute();
const batchId = typeof route.query.batchId === "string" ? route.query.batchId : "batch-current";
const applicationId = typeof route.params.id === "string" ? route.params.id : undefined;
const destination = applicationId
  ? `/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(applicationId)}`
  : `/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications`;

await navigateTo(destination, { replace: true });
</script>

<template><div /></template>
