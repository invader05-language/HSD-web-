<script setup lang="ts">
import { RECRUITMENT_BATCHES } from "~/data/recruitment-batches";
import { formatRecruitmentApplicationSubmittedAt } from "~/data/recruitment-admin";
import { useRecruitmentAssessmentStore } from "~/stores/recruitment-assessment";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope } from "~/utils/admin-center-scope";

definePageMeta({ layout: "admin" });

const route = useRoute();
const assessmentStore = useRecruitmentAssessmentStore();
const session = useSessionStore();
const batchId = computed(() => String(route.params.batchId));
const applicationId = computed(() => String(route.params.id));
const batch = computed(() => RECRUITMENT_BATCHES.find((item) => item.id === batchId.value));
const application = computed(() => assessmentStore
  .getCandidates(batchId.value)
  .map((record) => record.candidate)
  .find((candidate) => candidate?.id === applicationId.value
    && (!getAdminCenterScope(session.currentAccount?.adminCenterRole)
      || candidate.preferences[0] === getAdminCenterScope(session.currentAccount?.adminCenterRole))));

useHead(() => ({ title: `${application.value?.name ?? "报名记录"}｜HSD 管理台` }));
</script>

<template>
  <div v-if="application" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Batch Application Record" :title="application.name" description="只读查看当前批次报名快照，不跨批次读取考核或内部备注。">
      <template #actions><NuxtLink class="button button--ghost" :to="`/admin/recruitment/batches/${batchId}/applications`">返回{{ batch?.name ?? "批次" }}报名人员</NuxtLink></template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><span>Submitted Information</span><h2>报名资料</h2></div><p>{{ formatRecruitmentApplicationSubmittedAt(application) }} 提交 · {{ batchId }}</p></header>
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
  <div v-else class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Batch Application Record" title="报名记录不存在" description="该报名记录不属于当前批次，或已被移除。">
      <template #actions><NuxtLink class="button" :to="`/admin/recruitment/batches/${batchId}/applications`">返回报名人员</NuxtLink></template>
    </AdminPageHeading>
  </div>
</template>
