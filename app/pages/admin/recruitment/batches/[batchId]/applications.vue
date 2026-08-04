<script setup lang="ts">
import { RECRUITMENT_BATCHES } from "~/data/recruitment-batches";
import {
  filterAndSortRecruitmentApplications,
  formatRecruitmentApplicationSubmittedAt,
  type AdminCandidate,
  type RecruitmentCenter,
  type RecruitmentApplicationSort
} from "~/data/recruitment-admin";
import {
  buildRecruitmentBatchRoute,
  formatRecruitmentBatchPeriod
} from "~/data/recruitment-admin-context";
import { useRecruitmentAssessmentStore } from "~/stores/recruitment-assessment";
import {
  buildRecruitmentExportName,
  serializeRecruitmentCsv
} from "~/utils/recruitment-export";

definePageMeta({ layout: "admin" });

const route = useRoute();
const assessmentStore = useRecruitmentAssessmentStore();
const batchId = computed(() => String(route.params.batchId));
const batch = computed(() => RECRUITMENT_BATCHES.find((item) => item.id === batchId.value));
const query = ref("");
const center = ref<RecruitmentCenter | "全部中心">("全部中心");
const sort = ref<RecruitmentApplicationSort>("submittedAt.desc");
const scopedCandidates = computed<AdminCandidate[]>(() => assessmentStore
  .getCandidates(batchId.value)
  .map((record) => record.candidate)
  .filter((candidate): candidate is AdminCandidate => Boolean(candidate)));
const visible = computed(() => filterAndSortRecruitmentApplications(scopedCandidates.value, {
  query: query.value,
  firstChoice: center.value,
  sort: sort.value
}));

useHead(() => ({ title: `${batch.value?.name ?? "招新批次"}报名人员｜HSD 管理台` }));

function exportRecruitmentCsv() {
  if (!visible.value.length || !batch.value) return;
  const blob = new Blob([serializeRecruitmentCsv(visible.value)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildRecruitmentExportName(batch.value.name, new Date());
  anchor.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Batch Applications"
      :title="`${batch?.name ?? '未知批次'} · 报名人员`"
      :description="batch ? `报名时间：${formatRecruitmentBatchPeriod(batch)}` : '批次不存在，无法读取报名名单。'"
    >
      <template #actions>
        <NuxtLink class="button button--ghost" :to="buildRecruitmentBatchRoute(batchId)">返回批次概览</NuxtLink>
        <button type="button" class="button button--ghost" :disabled="visible.length === 0" @click="exportRecruitmentCsv">导出当前名单</button>
      </template>
    </AdminPageHeading>

    <section class="admin-list-card">
      <header>
        <div><span>Application Roster</span><h2>{{ batch?.name ?? "批次不存在" }}报名</h2></div>
        <p>共 {{ visible.length }} 人 · 当前 batchId：{{ batchId }}</p>
      </header>
      <div class="admin-filters">
        <label>搜索报名人<input v-model="query" type="search" placeholder="姓名或学号"></label>
        <label>第一志愿<select v-model="center"><option>全部中心</option><option>白泽开发中心</option><option>新媒体中心</option><option>拓维策划中心</option><option>人才发展中心</option></select></label>
        <label>排序<select v-model="sort"><option value="submittedAt.desc">最新提交</option><option value="submittedAt.asc">最早提交</option></select></label>
      </div>
      <p v-if="visible.length === 0" class="admin-empty-copy">当前批次没有可导出的报名人员</p>
      <div class="admin-table-scroll">
        <table aria-label="批次报名人员">
          <thead><tr><th>报名人</th><th>第一志愿</th><th>第二志愿</th><th>第三志愿</th><th>白泽方向</th><th>接受调剂</th><th>提交时间</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>
            <tr v-for="candidate in visible" :key="candidate.id">
              <td><strong>{{ candidate.name }}</strong><small>{{ candidate.studentId }}</small></td>
              <td>{{ candidate.preferences[0] }}</td>
              <td>{{ candidate.preferences[1] || "—" }}</td>
              <td>{{ candidate.preferences[2] || "—" }}</td>
              <td>{{ candidate.baizeDirection || "—" }}</td>
              <td>{{ candidate.acceptsAdjustment ? "接受" : "不接受" }}</td>
              <td>{{ formatRecruitmentApplicationSubmittedAt(candidate) }}</td>
              <td><NuxtLink :to="`/admin/recruitment/batches/${batchId}/applications/${candidate.id}`" :aria-label="`查看报名 ${candidate.name}`">查看报名</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
