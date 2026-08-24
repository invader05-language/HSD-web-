<script setup lang="ts">
import {
  buildRecruitmentCompatibilityRoute,
  resolveLegacyRecruitmentBatchId,
} from "~/utils/recruitment-compatibility-routes";

definePageMeta({ layout: "admin" });

const route = useRoute();
const runtime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const batchId = computed(() => resolveLegacyRecruitmentBatchId(
  route.query.batchId,
  runtime.public.useMockApi,
));

if (!runtime.public.useMockApi) {
  await navigateTo(buildRecruitmentCompatibilityRoute("assessment", batchId.value), { replace: true });
}

useHead({ title: "预备成员考核台｜白云 HSD 开发者部落" });
</script>

<template>
  <AdminRecruitmentAssessmentWorkbench v-if="batchId" :batch-id="batchId" />
</template>
