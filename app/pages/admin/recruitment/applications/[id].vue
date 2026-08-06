<script setup lang="ts">
definePageMeta({ layout: "admin" });

const route = useRoute();
const batchId = typeof route.query.batchId === "string" ? route.query.batchId : "batch-current";
await navigateTo(
  `/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(String(route.params.id))}`,
  { replace: true },
);
</script>

<template><div /></template>
