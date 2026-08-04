<script setup lang="ts">
import { RECRUITMENT_BATCHES } from "~/data/recruitment-batches";
import { ADMIN_CANDIDATES, getRecruitmentCounts } from "~/data/recruitment-admin";
import {
  buildRecruitmentBatchRoute,
  filterAdminCandidatesByBatch,
  formatRecruitmentBatchPeriod
} from "~/data/recruitment-admin-context";

definePageMeta({ layout: "admin" });

const route = useRoute();
const batchId = computed(() => String(route.params.batchId));
const batch = computed(() => RECRUITMENT_BATCHES.find((item) => item.id === batchId.value));
const candidates = computed(() => filterAdminCandidatesByBatch(ADMIN_CANDIDATES, batchId.value));
const counts = computed(() => getRecruitmentCounts(candidates.value));

useHead(() => ({ title: `${batch.value?.name ?? "招新批次"}考核台｜HSD 管理台` }));
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Batch Assessment"
      :title="`${batch?.name ?? '未知批次'} · 预备成员考核`"
      :description="batch ? `考核范围限定为当前 batchId：${batchId}，报名时间：${formatRecruitmentBatchPeriod(batch)}` : '批次不存在，无法读取考核数据。'"
    >
      <template #actions><NuxtLink class="button button--ghost" :to="buildRecruitmentBatchRoute(batchId)">返回批次概览</NuxtLink></template>
    </AdminPageHeading>
    <section class="admin-summary-strip" aria-label="批次考核概览">
      <div><span>预备人员</span><strong>{{ counts.preparatory }}</strong><small>当前批次</small></div>
      <div><span>考核处理中</span><strong>{{ counts.assessing }}</strong><small>仅当前 batchId</small></div>
      <div><span>已录取</span><strong>{{ counts.admitted }}</strong><small>已形成正式成员关系</small></div>
      <div><span>未录取</span><strong>{{ counts.notAdmitted }}</strong><small>当前批次最终结果</small></div>
    </section>
    <section class="admin-list-card">
      <header><div><span>Candidate Roster</span><h2>本批次考核名单</h2></div><p>共 {{ candidates.length }} 人 · {{ batchId }}</p></header>
      <p v-if="candidates.length === 0" class="admin-empty-copy">当前批次暂无报名人员</p>
      <div v-else class="admin-table-scroll">
        <table aria-label="本批次预备成员名单">
          <thead><tr><th>成员</th><th>第一志愿</th><th>当前阶段</th><th>结果</th><th>更新时间</th><th>操作</th></tr></thead>
          <tbody><tr v-for="candidate in candidates" :key="candidate.id">
            <td><strong>{{ candidate.name }}</strong><small>{{ candidate.studentId }}</small></td>
            <td>{{ candidate.preferences[0] }}</td><td>{{ candidate.stage }}</td><td>{{ candidate.result }}</td><td>{{ candidate.updatedAt }}</td>
            <td><NuxtLink :to="`/admin/recruitment?batchId=${encodeURIComponent(batchId)}`">打开考核台</NuxtLink></td>
          </tr></tbody>
        </table>
      </div>
    </section>
  </div>
</template>
