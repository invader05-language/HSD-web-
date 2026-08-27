<script setup lang="ts">
import { formatRecruitmentApplicationSubmittedAt } from "~/data/recruitment-admin";
import { useRecruitmentAssessmentStore } from "~/stores/recruitment-assessment";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useSessionStore } from "~/stores/session";
import { canAccessRecruitmentCandidate, getAdminCenterScope } from "~/utils/admin-center-scope";
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { mapAdminApplication, formatAdminApplicationSubmittedAt, type AdminApplicationView } from "~/services/recruitment/admin-application-view";

definePageMeta({ layout: "admin" });

const route = useRoute();
const runtime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const useMockApi = runtime.public.useMockApi;
const recruitmentGateway = useRecruitmentGateway();
const assessmentStore = useRecruitmentAssessmentStore();
const batchStore = useRecruitmentBatchStore();
const session = useSessionStore();
const batchId = computed(() => String(route.params.batchId));
const applicationId = computed(() => String(route.params.id));
const batch = computed(() => batchStore.getBatch(batchId.value));
const application = computed(() => assessmentStore
  .getCandidates(batchId.value)
  .map((record) => record.candidate)
  .find((candidate) => candidate?.id === applicationId.value
    && canAccessRecruitmentCandidate(candidate, getAdminCenterScope(session.currentAccount?.adminCenterRole))));

const apiApplication = ref<AdminApplicationView>();
const apiStatus = ref<"idle" | "loading" | "success" | "error">("idle");
const apiError = ref("");
let apiGeneration = 0;

async function loadApiApplication() {
  if (useMockApi || !recruitmentGateway) return;
  const generation = ++apiGeneration;
  apiStatus.value = "loading";
  apiApplication.value = undefined;
  apiError.value = "";
  try {
    const response = await recruitmentGateway.getAdminApplication(batchId.value, applicationId.value);
    if (generation !== apiGeneration) return;
    apiApplication.value = mapAdminApplication(response);
    apiStatus.value = "success";
  } catch (cause) {
    if (generation !== apiGeneration) return;
    apiError.value = cause instanceof Error ? cause.message : "报名记录读取失败。";
    apiStatus.value = "error";
  }
}

watch([batchId, applicationId], () => {
  void loadApiApplication();
}, { immediate: true });

useHead(() => ({ title: `${application.value?.name ?? "报名记录"}｜HSD 管理台` }));
</script>

<template>
  <div v-if="useMockApi && application" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Batch Application Record" :title="application.name" description="只读查看当前批次报名快照，不跨批次读取考核或内部备注。">
      <template #actions><NuxtLink class="button button--ghost" :to="`/admin/recruitment/batches/${batchId}/applications`">返回{{ batch?.name ?? "批次" }}报名人员</NuxtLink></template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><span>报名资料</span><h2>报名资料</h2></div><p>{{ formatRecruitmentApplicationSubmittedAt(application) }} 提交</p></header>
      <div class="admin-detail-form"><div class="admin-form-grid">
        <label>姓名<input :value="application.name" readonly></label>
        <label>学号<input :value="application.studentId" readonly></label>
        <label>年级<input :value="application.grade" readonly></label>
        <label>班级<input :value="application.className" readonly></label>
        <label>联系方式<input :value="application.contact" readonly></label>
        <label>第一志愿<input :value="application.preferences[0]" readonly></label>
        <label>第二志愿<input :value="application.preferences[1] || '—'" readonly></label>
        <label>第三志愿<input :value="application.preferences[2] || '—'" readonly></label>
        <label>白泽方向<input :value="application.baizeDirection || '—'" readonly></label>
        <label>是否接受调剂<input :value="application.acceptsAdjustment ? '接受' : '不接受'" readonly></label>
        <label class="is-wide">个人简介<textarea rows="5" :value="application.bio || '未填写'" readonly></textarea></label>
      </div></div>
    </section>
  </div>
  <div v-else-if="useMockApi" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Batch Application Record" title="报名记录不存在" description="该报名记录不属于当前批次，或已被移除。">
      <template #actions><NuxtLink class="button" :to="`/admin/recruitment/batches/${batchId}/applications`">返回报名人员</NuxtLink></template>
    </AdminPageHeading>
  </div>
  <div v-else-if="apiStatus === 'loading'" class="admin-recruitment-page admin-section-page"><AdminPageHeading eyebrow="Batch Application Record" title="正在读取报名记录" description="正在请求服务端报名详情。" /></div>
  <div v-else-if="apiApplication" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Batch Application Record" :title="apiApplication.name" description="服务端报名快照；只读展示，不跨批次读取内部考核备注。">
      <template #actions><NuxtLink class="button button--ghost" :to="`/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications`">返回报名人员</NuxtLink></template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><span>报名资料</span><h2>报名资料</h2></div><p>{{ formatAdminApplicationSubmittedAt(apiApplication.submittedAt) }} 提交</p></header>
      <div class="admin-detail-form"><div class="admin-form-grid">
        <label>姓名<input :value="apiApplication.name" readonly></label><label>学号<input :value="apiApplication.studentId" readonly></label><label>年级<input :value="apiApplication.grade" readonly></label><label>班级<input :value="apiApplication.className" readonly></label><label>联系方式<input :value="apiApplication.contact" readonly></label>
        <label>第一志愿<input :value="apiApplication.preferences[0] || '—'" readonly></label><label>第二志愿<input :value="apiApplication.preferences[1] || '—'" readonly></label><label>第三志愿<input :value="apiApplication.preferences[2] || '—'" readonly></label><label>白泽方向<input :value="apiApplication.baizeDirection || '—'" readonly></label><label>是否接受调剂<input :value="apiApplication.acceptsAdjustment ? '接受' : '不接受'" readonly></label><label>状态<input :value="apiApplication.status" readonly></label>
      </div></div>
    </section>
  </div>
  <div v-else class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Batch Application Record" title="报名记录不可用" :description="apiError || '该报名记录不存在，或当前管理员无权查看。'">
      <template #actions><NuxtLink class="button" :to="`/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications`">返回报名人员</NuxtLink></template>
    </AdminPageHeading>
  </div>
</template>
