<script setup lang="ts">
import {
  formatRecruitmentApplicationSubmittedAt
} from "~/data/recruitment-admin";
import { useRecruitmentAssessmentStore } from "~/stores/recruitment-assessment";

definePageMeta({ layout: "admin" });

const route = useRoute();
const assessmentStore = useRecruitmentAssessmentStore();
const batchId = computed(() => typeof route.query.batchId === "string" ? route.query.batchId : "batch-current");
const application = computed(() => {
  const candidate = assessmentStore
    .getCandidates(batchId.value)
    .map((record) => record.candidate)
    .find((item) => item?.id === String(route.params.id));
  if (!candidate) throw createError({ statusCode: 404, statusMessage: "报名记录不存在" });
  return candidate;
});

useHead({ title: `${application.value.name}｜报名资料｜HSD 管理台` });
</script>

<template>
  <div v-if="application" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Application Record"
      :title="application.name"
      description="只读查看报名时提交的人员资料，不包含考核处理和内部备注。"
    >
      <template #actions>
        <NuxtLink class="button button--ghost" to="/admin/recruitment/applications">返回报名人员</NuxtLink>
      </template>
    </AdminPageHeading>

    <section class="admin-list-card">
      <header>
        <div><span>Submitted Information</span><h2>报名资料</h2></div>
        <p>{{ formatRecruitmentApplicationSubmittedAt(application) }} 提交</p>
      </header>
      <div class="admin-detail-form">
        <div class="admin-form-grid">
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
        </div>
      </div>
    </section>
  </div>
</template>
