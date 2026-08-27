<script setup lang="ts">
import { useRecruitmentAssessmentStore } from "~/stores/recruitment-assessment";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope } from "~/utils/admin-center-scope";
import { canPublishAssessmentBatch } from "~/utils/assessment-workbench-access";
import { getEffectiveRecruitmentBatchStatus } from "~/utils/recruitment-batch-rules";
import { getRecruitmentAssessmentMessage } from "~/utils/recruitment-assessment-messages";
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { useAdminToast } from "~/composables/useAdminToast";

const props = defineProps<{ batchId: string; showBackLink?: boolean }>();
const assessmentStore = useRecruitmentAssessmentStore();
const batchStore = useRecruitmentBatchStore();
const session = useSessionStore();
const recruitmentGateway = useRecruitmentGateway();
const adminToast = useAdminToast();
if (recruitmentGateway) assessmentStore.enableApiMode();
const batch = computed(() => recruitmentGateway ? undefined : batchStore.getBatch(props.batchId));
const state = computed(() => assessmentStore.getBatchState(props.batchId));
const effectiveBatchStatus = computed(() => (
  recruitmentGateway
    ? "server-validated"
    : batch.value ? getEffectiveRecruitmentBatchStatus(batch.value, new Date()).status : "closed"
));
const effectiveBatchStatusLabel = computed(() => ({
  draft: "批次草稿",
  upcoming: "报名尚未开放",
  open: "报名开放中",
  paused: "报名已暂停",
  closed: "报名已关闭",
  archived: "批次已归档",
  "server-validated": "当前批次状态已确认",
}[effectiveBatchStatus.value]));
const centerScope = computed(() => recruitmentGateway
  ? undefined
  : getAdminCenterScope(session.currentAccount?.adminCenterRole));
const candidates = computed(() => assessmentStore.getCandidates(props.batchId)
  .filter((candidate) => !centerScope.value || candidate.center === centerScope.value));
const canPublishResults = computed(() => canPublishAssessmentBatch({
  apiMode: Boolean(recruitmentGateway),
  canManageAdminAccounts: session.canManageAdminAccounts,
  hasCapability: session.hasCapability,
}));
const apiBusy = computed(() => Boolean(
  assessmentStore.apiLoadingByBatch[props.batchId]
  || assessmentStore.apiMutatingByBatch[props.batchId],
));
const apiError = computed(() => assessmentStore.apiErrorByBatch[props.batchId]);
const summary = computed(() => {
  const visibleCandidates = candidates.value;
  const ready = visibleCandidates.filter((candidate) => candidate.processingStatus === "ready-to-publish").length;
  const adjustmentPending = visibleCandidates.filter((candidate) => candidate.processingStatus === "adjustment-suggestion-pending").length;
  const pending = visibleCandidates.filter((candidate) => (
    candidate.processingStatus === "assessing" || candidate.processingStatus === "adjustment-suggestion-pending"
  )).length;
  const admitted = visibleCandidates.filter((candidate) => candidate.finalDecision === "admitted").length;
  const notAdmitted = visibleCandidates.filter((candidate) => candidate.finalDecision === "not-admitted").length;
  return {
    total: visibleCandidates.length,
    ready,
    pending,
    adjustmentPending,
    admitted,
    notAdmitted,
    // The operation is intentionally batch-wide and owner-only. A center admin
    // may review scoped rows but must never see an actionable publish state.
    canPublish: canPublishResults.value
      && (Boolean(recruitmentGateway) || effectiveBatchStatus.value === "closed")
      && state.value.status === "ready-to-publish"
      && pending === 0
      && !apiBusy.value,
  };
});
const showConfirmation = ref(false);
const feedback = ref("");
const error = ref("");

let apiGeneration = 0;
watch(() => props.batchId, async (batchId) => {
  const generation = ++apiGeneration;
  showConfirmation.value = false;
  feedback.value = "";
  error.value = "";
  if (!recruitmentGateway) return;
  try {
    await assessmentStore.refreshAssessmentBatch(batchId, recruitmentGateway);
  } catch (reason) {
    if (generation !== apiGeneration) return;
    error.value = getRecruitmentAssessmentMessage(reason, "批次结果加载失败，请刷新后重试。");
  }
}, { immediate: true });

function outcomeLabel(candidate: ReturnType<typeof assessmentStore.getCandidates>[number]) {
  if (candidate.finalDecision === "admitted") return "已录取";
  if (candidate.finalDecision === "not-admitted") return "未录取";
  return "未形成最终结论";
}

function processingLabel(candidate: ReturnType<typeof assessmentStore.getCandidates>[number]) {
  return candidate.processingStatus === "adjustment-suggestion-pending"
    ? "待总负责人确认调剂"
    : candidate.processingStatus === "ready-to-publish"
      ? "可随整批发布"
      : candidate.processingStatus === "completed"
        ? "已发布"
        : "仍在考核";
}

async function publish() {
  try {
    if (recruitmentGateway) {
      await assessmentStore.publishBatchResultsFromApi(
        recruitmentGateway,
        props.batchId,
        "管理端确认整批发布招新结果",
      );
    } else {
      assessmentStore.publishBatchResults(props.batchId, true, new Date(), "管理端确认整批发布招新结果");
    }
    showConfirmation.value = false;
    error.value = "";
    feedback.value = recruitmentGateway
      ? "发布完成：系统已完整更新当前批次结果与成员展示。"
      : "发布完成：当前批次全部结果已同步到成员结果中心和正式成员投影。";
    adminToast.success(feedback.value);
  } catch (reason) {
    showConfirmation.value = false;
    error.value = getRecruitmentAssessmentMessage(reason, "结果发布失败，请刷新后重试。");
  }
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="结果发布" :title="`${batch?.name ?? '未知批次'} · 结果发布`" description="发布范围：当前批次全部候选人；内部考核保存不会提前公开。">
      <template #actions>
        <NuxtLink v-if="showBackLink" class="button button--ghost" :to="`/admin/recruitment/batches/${encodeURIComponent(batchId)}`">返回批次概览</NuxtLink>
        <button type="button" class="button" :disabled="!canPublishResults || !summary.canPublish || state.status === 'published' || apiBusy" :title="canPublishResults ? (recruitmentGateway ? '服务器将校验批次状态和当前版本' : effectiveBatchStatus === 'closed' ? '需先完成全批次考核与调剂处理' : '关闭报名后才能整批发布') : '仅联盟总负责人可整批发布'" @click="showConfirmation = true">{{ apiBusy ? "处理中…" : "整批发布结果" }}</button>
      </template>
    </AdminPageHeading>
    <div class="admin-publication-warning"><strong>{{ effectiveBatchStatusLabel }} · 内部保存不等于对成员公开</strong><p v-if="effectiveBatchStatus === 'server-validated'">系统已加载当前名单和结论，发布时会再次校验批次状态和权限。</p><p v-else-if="effectiveBatchStatus === 'closed'">只有整批结果具备发布条件后，才可一次性更新成员结果中心和成员身份投影。</p><p v-else-if="effectiveBatchStatus === 'open' || effectiveBatchStatus === 'paused'">可以继续查看和录入已有考核结果；关闭报名后才能推进全局轮次并整批发布。</p><p v-else>当前批次不可发布，请先完成批次发布或恢复可处理状态。</p></div>
    <section class="admin-summary-strip" aria-label="结果发布概览"><div><span>本批次人员</span><strong>{{ summary.total }}</strong><small>当前批次</small></div><div><span>已形成结果</span><strong>{{ summary.ready }}</strong><small>等待整批发布</small></div><div><span>待处理</span><strong>{{ summary.pending }}</strong><small>含考核与调剂</small></div><div><span>可录取</span><strong>{{ summary.admitted }}</strong><small>发布时才升级身份</small></div></section>
    <section class="admin-list-card"><header><div><span>发布复核</span><h2>整批发布复核</h2></div><p>当前状态：{{ state.status === "published" ? "已发布" : summary.canPublish ? "可整批发布" : "暂不可发布" }}</p></header><div class="admin-publication-list"><article v-for="candidate in candidates" :key="candidate.candidateId" :class="{ 'is-disabled': candidate.processingStatus === 'assessing' || candidate.processingStatus === 'adjustment-suggestion-pending' }"><span><strong>{{ candidate.candidate?.name ?? candidate.memberId }}</strong><small>{{ candidate.candidate?.studentId ?? candidate.memberId }}</small></span><div><span>第一志愿</span><strong>{{ candidate.center }}</strong></div><div><span>内部结果</span><AdminStatusPill :status="outcomeLabel(candidate)" /></div><div><span>处理状态</span><strong>{{ processingLabel(candidate) }}</strong></div><small>{{ candidate.finalCenter ? `最终中心：${candidate.finalCenter}` : '尚未形成最终中心' }}</small></article></div></section>
    <p v-if="error" class="admin-save-message" role="alert">{{ error }}</p><p v-else-if="apiError" class="admin-save-message" role="alert">{{ getRecruitmentAssessmentMessage(apiError, "批次结果加载失败，请刷新后重试。") }}</p>
    <div v-if="showConfirmation" class="admin-modal-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="batch-publish-confirm-title"><span>结果发布确认</span><h2 id="batch-publish-confirm-title">确认整批发布 {{ summary.total }} 条结果？</h2><p>系统会一次性校验并更新当前批次结果、成员身份、中心关系和公开展示；任一步失败都不会部分生效。</p><div><button type="button" class="button button--ghost" :disabled="apiBusy" @click="showConfirmation = false">返回检查</button><button type="button" class="button" :disabled="apiBusy" @click="publish">{{ apiBusy ? "发布中…" : "确认整批发布" }}</button></div></section></div>
  </div>
</template>
