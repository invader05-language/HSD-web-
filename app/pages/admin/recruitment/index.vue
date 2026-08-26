<script setup lang="ts">
import {
  buildRecruitmentCompatibilityRoute,
  resolveLegacyRecruitmentBatchId,
} from "~/utils/recruitment-compatibility-routes";

definePageMeta({ layout: "admin" });

const route = useRoute();
const runtime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const requestedBatchId = typeof route.query.batchId === "string" ? route.query.batchId : undefined;
const batchId = requestedBatchId
  ? resolveLegacyRecruitmentBatchId(requestedBatchId, runtime.public.useMockApi)
  : undefined;

// The old route used to render the assessment workbench directly, which
// silently selected a batch and made the global navigation ambiguous. Keep
// deep links with an explicit batch id working, but make the bare entry point
// land on the canonical batch list so an operator must choose the context.
await navigateTo(
  batchId
    ? buildRecruitmentCompatibilityRoute("assessment", batchId)
    : "/admin/recruitment/batches",
  { replace: true },
);
</script>

<template><div /></template>
