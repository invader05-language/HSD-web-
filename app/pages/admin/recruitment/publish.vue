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
  await navigateTo(buildRecruitmentCompatibilityRoute("publish", batchId.value), { replace: true });
}

useHead({ title: "结果发布｜HSD 管理台" });
</script>

<template>
  <AdminRecruitmentPublicationWorkbench v-if="batchId" :batch-id="batchId" />
</template>
