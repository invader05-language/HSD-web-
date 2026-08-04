<script setup lang="ts">
import {
  filterAndSortRecruitmentApplications,
  formatRecruitmentApplicationSubmittedAt,
  type AdminCandidate,
  type RecruitmentCenter,
  type RecruitmentApplicationSort
} from "~/data/recruitment-admin";
import { RECRUITMENT_BATCHES } from "~/data/recruitment-batches";
import { useRecruitmentAssessmentStore } from "~/stores/recruitment-assessment";
import {
  buildRecruitmentExportName,
  serializeRecruitmentCsv
} from "~/utils/recruitment-export";

definePageMeta({ layout: "admin" });
useHead({ title: "报名人员｜HSD 管理台" });

const query = ref("");
const center = ref<RecruitmentCenter | "全部中心">("全部中心");
const sort = ref<RecruitmentApplicationSort>("submittedAt.desc");
const route = useRoute();
const assessmentStore = useRecruitmentAssessmentStore();
const batchId = computed(() => typeof route.query.batchId === "string" ? route.query.batchId : "batch-current");
const batchName = computed(() => RECRUITMENT_BATCHES.find((batch) => batch.id === batchId.value)?.name ?? batchId.value);
const scopedCandidates = computed<AdminCandidate[]>(() => assessmentStore
  .getCandidates(batchId.value)
  .map((record) => record.candidate)
  .filter((candidate): candidate is AdminCandidate => Boolean(candidate)));
const visible = computed(() => filterAndSortRecruitmentApplications(scopedCandidates.value, {
  query: query.value,
  firstChoice: center.value,
  sort: sort.value
}));

function exportRecruitmentCsv() {
  if (!visible.value.length) return;

  const blob = new Blob([serializeRecruitmentCsv(visible.value)], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildRecruitmentExportName(batchName.value, new Date());
  anchor.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <NuxtPage v-if="route.params.id" />
  <div v-else class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Applications"
      title="报名人员"
      description="查看本批次报名资料和三个中心志愿；考核操作仍在预备成员考核台完成。"
    >
      <template #actions>
        <button type="button" class="button button--ghost" :disabled="visible.length === 0" @click="exportRecruitmentCsv">导出当前名单</button>
      </template>
    </AdminPageHeading>

    <section class="admin-list-card">
      <header>
        <div><span>Application Roster</span><h2>{{ batchName }}报名</h2></div>
        <p>共 {{ visible.length }} 人</p>
      </header>
      <div class="admin-filters">
        <label>搜索报名人<input v-model="query" type="search" placeholder="姓名或学号"></label>
        <label>第一志愿<select v-model="center"><option>全部中心</option><option>白泽开发中心</option><option>新媒体中心</option><option>拓维策划中心</option><option>人才发展中心</option></select></label>
        <label>排序<select v-model="sort"><option value="submittedAt.desc">最新提交</option><option value="submittedAt.asc">最早提交</option></select></label>
      </div>
      <p v-if="visible.length === 0" class="admin-empty-copy">当前没有可导出的报名人员</p>
      <div class="admin-table-scroll">
        <table aria-label="招新报名人员">
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
              <td><NuxtLink :to="{ path: `/admin/recruitment/applications/${candidate.id}`, query: { batchId } }" :aria-label="`查看报名 ${candidate.name}`">查看报名</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
