<script setup lang="ts">
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
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import {
  buildRecruitmentExportName,
  serializeRecruitmentCsv
} from "~/utils/recruitment-export";
import { canAccessRecruitmentCandidate, getAdminCenterScope } from "~/utils/admin-center-scope";
import { useSessionStore } from "~/stores/session";
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { mapAdminApplication, formatAdminApplicationSubmittedAt, type AdminApplicationView } from "~/services/recruitment/admin-application-view";

definePageMeta({ layout: "admin" });

const route = useRoute();
const assessmentStore = useRecruitmentAssessmentStore();
const batchStore = useRecruitmentBatchStore();
const session = useSessionStore();
const runtime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const useMockApi = runtime.public.useMockApi;
const recruitmentGateway = useRecruitmentGateway();
const batchId = computed(() => String(route.params.batchId));
const batch = computed(() => batchStore.getBatch(batchId.value));
const query = ref("");
const center = ref<RecruitmentCenter | "全部中心">("全部中心");
const centerScope = computed(() => getAdminCenterScope(session.currentAccount?.adminCenterRole));
const sort = ref<RecruitmentApplicationSort>("submittedAt.desc");
const scopedCandidates = computed<AdminCandidate[]>(() => assessmentStore
  .getCandidates(batchId.value)
  .map((record) => record.candidate)
  .filter((candidate): candidate is AdminCandidate => Boolean(candidate))
  .filter((candidate) => canAccessRecruitmentCandidate(candidate, centerScope.value)));
watch(centerScope, (scope) => {
  center.value = scope ?? "全部中心";
}, { immediate: true });
const visible = computed(() => filterAndSortRecruitmentApplications(scopedCandidates.value, {
  query: query.value,
  firstChoice: center.value,
  sort: sort.value
}));

const apiBatch = ref<{ id: string; name: string; startAt: string; endAt: string; applicationCount: number }>();
const apiRows = ref<AdminApplicationView[]>([]);
const apiTotal = ref(0);
const apiPage = ref(1);
const apiPageSize = ref(20);
const apiStatus = ref<"idle" | "loading" | "success" | "empty" | "error">("idle");
const apiError = ref("");
let apiGeneration = 0;

async function loadApiApplications() {
  if (useMockApi || !recruitmentGateway) return;
  const generation = ++apiGeneration;
  apiStatus.value = "loading";
  apiError.value = "";
  apiRows.value = [];
  try {
    if (!apiBatch.value) {
      const detail = await recruitmentGateway.getAdminBatch(batchId.value);
      if (generation !== apiGeneration) return;
      apiBatch.value = detail;
    }
    const params = new URLSearchParams({ page: String(apiPage.value), pageSize: String(apiPageSize.value), sort: sort.value });
    if (query.value.trim()) params.set("keyword", query.value.trim());
    const response = await recruitmentGateway.listAdminApplications(batchId.value, params.toString());
    if (generation !== apiGeneration) return;
    apiPage.value = response.page;
    apiPageSize.value = response.pageSize;
    apiTotal.value = response.total;
    apiRows.value = response.items.map(mapAdminApplication);
    apiStatus.value = response.items.length ? "success" : "empty";
  } catch (cause) {
    if (generation !== apiGeneration) return;
    apiError.value = cause instanceof Error ? cause.message : "报名名单读取失败。";
    apiStatus.value = "error";
  }
}

const apiPageCount = computed(() => Math.max(1, Math.ceil(apiTotal.value / apiPageSize.value)));
watch([query, sort], () => {
  if (useMockApi || !recruitmentGateway || route.params.id) return;
  apiPage.value = 1;
  void loadApiApplications();
});
function requestApiPage(page: number) {
  apiPage.value = Math.max(1, page);
  if (!useMockApi && recruitmentGateway && !route.params.id) void loadApiApplications();
}
watch(batchId, () => {
  apiBatch.value = undefined;
  apiRows.value = [];
  apiTotal.value = 0;
  apiPage.value = 1;
  apiError.value = "";
  if (!useMockApi && recruitmentGateway && !route.params.id) {
    void loadApiApplications();
  } else {
    apiGeneration += 1;
    apiStatus.value = "idle";
  }
}, { immediate: true });

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
  <NuxtPage v-if="route.params.id" />
  <div v-else-if="useMockApi" class="admin-recruitment-page admin-section-page">
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

  <div v-else class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Batch Applications"
      :title="`${apiBatch?.name ?? '招新批次'} · 报名人员`"
      :description="apiBatch ? `报名时间：${formatAdminApplicationSubmittedAt(apiBatch.startAt)} — ${formatAdminApplicationSubmittedAt(apiBatch.endAt)}` : '正在读取服务器批次。'"
    >
      <template #actions>
        <NuxtLink class="button button--ghost" :to="buildRecruitmentBatchRoute(batchId)">返回批次概览</NuxtLink>
      </template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><span>Application Roster</span><h2>{{ apiBatch?.name ?? "报名名单" }}</h2></div><p>服务端分页 · 共 {{ apiTotal }} 人</p></header>
      <div class="admin-filters">
        <label>搜索报名人<input v-model="query" type="search" placeholder="姓名或学号"></label>
        <label>排序<select v-model="sort"><option value="submittedAt.desc">最新提交</option><option value="submittedAt.asc">最早提交</option></select></label>
      </div>
      <div v-if="apiStatus === 'loading'" class="admin-empty" role="status"><strong>正在读取报名名单</strong><p>正在请求服务端分页数据。</p></div>
      <div v-else-if="apiStatus === 'error'" class="admin-empty" role="alert"><strong>报名名单读取失败</strong><p>{{ apiError }}</p></div>
      <div v-else-if="apiRows.length" class="admin-table-scroll">
        <table aria-label="批次报名人员">
          <thead><tr><th>报名人</th><th>第一志愿</th><th>第二志愿</th><th>第三志愿</th><th>白泽方向</th><th>接受调剂</th><th>状态</th><th>提交时间</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody><tr v-for="application in apiRows" :key="application.id">
            <td><strong>{{ application.name }}</strong><small>{{ application.studentId }}</small></td>
            <td>{{ application.preferences[0] || "—" }}</td><td>{{ application.preferences[1] || "—" }}</td><td>{{ application.preferences[2] || "—" }}</td>
            <td>{{ application.baizeDirection || "—" }}</td><td>{{ application.acceptsAdjustment ? "接受" : "不接受" }}</td><td>{{ application.status }}</td><td>{{ formatAdminApplicationSubmittedAt(application.submittedAt) }}</td>
            <td><NuxtLink :to="`/admin/recruitment/batches/${encodeURIComponent(batchId)}/applications/${encodeURIComponent(application.id)}`" :aria-label="`查看报名 ${application.name}`">查看报名</NuxtLink></td>
          </tr></tbody>
        </table>
      </div>
      <div v-else class="admin-empty"><strong>没有匹配的报名人员</strong><p>服务端未返回符合当前条件的报名记录。</p></div>
      <PaginationControls v-if="apiStatus !== 'loading'" :model-value="apiPage" :page-count="apiPageCount" label="报名人员分页" @update:model-value="requestApiPage" />
    </section>
  </div>
</template>
