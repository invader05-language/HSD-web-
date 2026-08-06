<script setup lang="ts">
import { useRecruitmentAssessmentStore } from "~/stores/recruitment-assessment";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope } from "~/utils/admin-center-scope";

const props = defineProps<{ batchId: string; showBackLink?: boolean }>();
const assessmentStore = useRecruitmentAssessmentStore();
const batchStore = useRecruitmentBatchStore();
const session = useSessionStore();
const batch = computed(() => batchStore.getBatch(props.batchId));
const state = computed(() => assessmentStore.getBatchState(props.batchId));
const centerScope = computed(() => getAdminCenterScope(session.currentAccount?.adminCenterRole));
const candidates = computed(() => assessmentStore.getCandidates(props.batchId)
  .filter((candidate) => !centerScope.value || candidate.center === centerScope.value));
const isOwner = computed(() => session.canManageAdminAccounts);
const summary = computed(() => {
  const visibleCandidates = candidates.value;
  const ready = visibleCandidates.filter((candidate) => candidate.processingStatus === "ready-to-publish").length;
  const adjustmentPending = visibleCandidates.filter((candidate) => candidate.processingStatus === "offline-adjustment-pending").length;
  const pending = visibleCandidates.filter((candidate) => (
    candidate.processingStatus === "assessing" || candidate.processingStatus === "offline-adjustment-pending"
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
    canPublish: isOwner.value && state.value.status === "ready-to-publish" && pending === 0,
  };
});
const showConfirmation = ref(false);
const feedback = ref("");
const error = ref("");

function outcomeLabel(candidate: ReturnType<typeof assessmentStore.getCandidates>[number]) {
  if (candidate.finalDecision === "admitted") return "已录取";
  if (candidate.finalDecision === "not-admitted") return "未录取";
  return "未形成最终结论";
}

function processingLabel(candidate: ReturnType<typeof assessmentStore.getCandidates>[number]) {
  return candidate.processingStatus === "offline-adjustment-pending"
    ? "待调剂处理"
    : candidate.processingStatus === "ready-to-publish"
      ? "可随整批发布"
      : candidate.processingStatus === "completed"
        ? "已发布"
        : "仍在考核";
}

function publish() {
  try {
    assessmentStore.publishBatchResults(props.batchId, true, new Date(), "管理端确认整批发布招新结果");
    showConfirmation.value = false;
    error.value = "";
    feedback.value = "Mock 发布完成：当前批次全部结果已同步到成员结果中心和正式成员投影。";
  } catch (reason) {
    showConfirmation.value = false;
    error.value = reason instanceof Error ? `发布失败（${reason.message}）` : "发布失败";
  }
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Batch Result Publication" :title="`${batch?.name ?? '未知批次'} · 结果发布`" :description="`发布范围：当前批次全部候选人（batchId：${batchId}）。内部考核保存不会提前公开。`">
      <template #actions>
        <NuxtLink v-if="showBackLink" class="button button--ghost" :to="`/admin/recruitment/batches/${encodeURIComponent(batchId)}`">返回批次概览</NuxtLink>
        <button type="button" class="button" :disabled="!isOwner || !summary.canPublish || state.status === 'published'" :title="isOwner ? '需先完成全批次考核与调剂处理' : '仅联盟总负责人可整批发布'" @click="showConfirmation = true">整批发布结果</button>
      </template>
    </AdminPageHeading>
    <div class="admin-publication-warning"><strong>内部保存不等于对成员公开</strong><p>只有整批结果具备发布条件后，才可一次性更新成员结果中心和成员身份投影。</p></div>
    <section class="admin-summary-strip" aria-label="结果发布概览"><div><span>本批次人员</span><strong>{{ summary.total }}</strong><small>{{ batchId }}</small></div><div><span>已形成结果</span><strong>{{ summary.ready }}</strong><small>等待整批发布</small></div><div><span>待处理</span><strong>{{ summary.pending }}</strong><small>含考核与调剂</small></div><div><span>可录取</span><strong>{{ summary.admitted }}</strong><small>发布时才升级身份</small></div></section>
    <section class="admin-list-card"><header><div><span>Publication Review</span><h2>整批发布复核</h2></div><p>当前状态：{{ state.status === "published" ? "已发布" : summary.canPublish ? "可整批发布" : "暂不可发布" }}</p></header><div class="admin-publication-list"><article v-for="candidate in candidates" :key="candidate.candidateId" :class="{ 'is-disabled': candidate.processingStatus === 'assessing' || candidate.processingStatus === 'offline-adjustment-pending' }"><span><strong>{{ candidate.candidate?.name ?? candidate.memberId }}</strong><small>{{ candidate.candidate?.studentId ?? candidate.memberId }}</small></span><div><span>第一志愿</span><strong>{{ candidate.center }}</strong></div><div><span>内部结果</span><AdminStatusPill :status="outcomeLabel(candidate)" /></div><div><span>处理状态</span><strong>{{ processingLabel(candidate) }}</strong></div><small>{{ candidate.finalCenter ? `最终中心：${candidate.finalCenter}` : '尚未形成最终中心' }}</small></article></div></section>
    <p v-if="feedback" class="admin-save-message" role="status">{{ feedback }}</p><p v-if="error" class="admin-save-message" role="alert">{{ error }}</p>
    <div v-if="showConfirmation" class="admin-modal-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="batch-publish-confirm-title"><span>Publish Recruitment Results</span><h2 id="batch-publish-confirm-title">确认整批发布 {{ summary.total }} 条结果？</h2><p>此 Mock 事务会先校验全部结果，再同步成员结果中心、成员身份、中心关系和公开投影；任一步失败将回滚。</p><div><button type="button" class="button button--ghost" @click="showConfirmation = false">返回检查</button><button type="button" class="button" @click="publish">确认整批发布</button></div></section></div>
  </div>
</template>
