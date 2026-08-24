<script setup lang="ts">
import {
  buildRecruitmentCompatibilityRoute,
  resolveLegacyRecruitmentBatchId,
} from "~/utils/recruitment-compatibility-routes";

definePageMeta({ layout: "admin" });

const route = useRoute();
const runtime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const batchId = resolveLegacyRecruitmentBatchId(route.query.batchId, runtime.public.useMockApi);
const applicationId = typeof route.params.id === "string" ? route.params.id : undefined;
const destination = buildRecruitmentCompatibilityRoute("applications", batchId, applicationId);

await navigateTo(destination, { replace: true });
</script>

<template><div /></template>
