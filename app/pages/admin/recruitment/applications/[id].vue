<script setup lang="ts">
import {
  buildRecruitmentCompatibilityRoute,
  resolveLegacyRecruitmentBatchId,
} from "~/utils/recruitment-compatibility-routes";

definePageMeta({ layout: "admin" });

const route = useRoute();
const runtime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const batchId = resolveLegacyRecruitmentBatchId(route.query.batchId, runtime.public.useMockApi);
await navigateTo(
  buildRecruitmentCompatibilityRoute("applications", batchId, String(route.params.id)),
  { replace: true },
);
</script>

<template><div /></template>
