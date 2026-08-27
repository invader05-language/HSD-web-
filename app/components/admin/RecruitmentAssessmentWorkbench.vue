<script setup lang="ts">
import { RECRUITMENT_CENTERS, type RecruitmentCenter } from "~/data/recruitment-application";
import type {
  AdjustmentDestination,
  AssessmentCenterIdentity,
  AssessmentRoundNumber,
} from "~/types/recruitment-assessment";
import { getAssessmentRounds } from "~/utils/recruitment-assessment-rules";
import { useRecruitmentAssessmentStore, type RecruitmentAssessmentCandidate } from "~/stores/recruitment-assessment";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope } from "~/utils/admin-center-scope";
import { canEditAssessmentCandidate } from "~/utils/assessment-workbench-access";
import { getEffectiveRecruitmentBatchStatus } from "~/utils/recruitment-batch-rules";
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { getRecruitmentAssessmentMessage } from "~/utils/recruitment-assessment-messages";
import { matchesAssessmentStage, type AssessmentStageFilter } from "~/utils/recruitment-assessment-filters";

const props = defineProps<{ batchId: string; showBackLink?: boolean }>();

type StageFilter = AssessmentStageFilter;
type ResultFilter = "全部结果" | "考核中" | "待调剂处理";
type RoundDraft = "" | "passed" | "failed";
type AdjustmentDraft = "" | string;

const assessmentStore = useRecruitmentAssessmentStore();
const batchStore = useRecruitmentBatchStore();
const session = useSessionStore();
const route = useRoute();
const recruitmentGateway = useRecruitmentGateway();
if (recruitmentGateway) assessmentStore.enableApiMode();

const mockBatch = computed(() => recruitmentGateway ? undefined : batchStore.getBatch(props.batchId));
const batch = computed(() => recruitmentGateway
  ? assessmentStore.getApiBatchContext(props.batchId)
  : mockBatch.value);
const state = computed(() => assessmentStore.getBatchState(props.batchId));
const effectiveBatchStatus = computed(() => (
  recruitmentGateway
    ? assessmentStore.getApiBatchContext(props.batchId)?.lifecycleStatus ?? "server-validated"
    : mockBatch.value ? getEffectiveRecruitmentBatchStatus(mockBatch.value, new Date()).status : "closed"
));
const effectiveBatchStatusLabel = computed(() => ({
  draft: "批次草稿",
  upcoming: "报名尚未开放",
  open: "报名开放中",
  paused: "报名已暂停",
  closed: "报名已关闭",
  archived: "批次已归档",
  "server-validated": "服务器状态校验",
}[effectiveBatchStatus.value]));
const centerScope = computed(() => recruitmentGateway
  ? undefined
  : getAdminCenterScope(session.currentAccount?.adminCenterRole));
const allCandidates = computed(() => assessmentStore.getCandidates(props.batchId)
  .filter((candidate) => !centerScope.value || candidate.center === centerScope.value));
const candidates = computed(() => allCandidates.value);
const processedCandidates = computed(() => candidates.value.filter((candidate) => (
  candidate.processingStatus !== "assessing" && candidate.processingStatus !== "adjustment-suggestion-pending"
)));
const actionableCandidates = computed(() => assessmentStore.getActionableCandidates(props.batchId)
  .filter((candidate) => !centerScope.value || candidate.center === centerScope.value));
const currentRoundLabel = computed(() => `第${["一", "二", "三"][state.value.currentRound - 1]}轮考核`);
const isOwner = computed(() => session.canManageAdminAccounts);
const filters = reactive({
  center: "全部人员" as "全部人员" | RecruitmentCenter,
  query: "",
  stage: "当前待办" as StageFilter,
  result: "全部结果" as ResultFilter,
  adjustment: "全部" as "全部" | "接受调剂" | "不接受调剂",
});
const centerGroups = computed<Array<"全部人员" | RecruitmentCenter>>(
  () => centerScope.value ? [centerScope.value] : ["全部人员", ...RECRUITMENT_CENTERS],
);
watch(centerScope, (scope) => {
  filters.center = scope ?? "全部人员";
}, { immediate: true });
const selectedCandidateId = ref<string>();
const roundDrafts = ref<Partial<Record<AssessmentRoundNumber, RoundDraft>>>({});
const internalNote = ref("");
const adjustmentDecision = ref<AdjustmentDraft>("");
const adjustmentSuggestion = ref<"" | string>("");
const showSaveConfirmation = ref(false);
const showAdvanceConfirmation = ref(false);
const saveMessage = ref("");
const saveError = ref("");
const closeButton = ref<HTMLButtonElement>();
let previousFocus: HTMLElement | undefined;
const apiBusy = computed(() => Boolean(
  assessmentStore.apiLoadingByBatch[props.batchId]
  || assessmentStore.apiMutatingByBatch[props.batchId],
));
const apiError = computed(() => assessmentStore.apiErrorByBatch[props.batchId]);
const apiWorkflowSummary = computed(() => assessmentStore.getApiWorkflowSummary(props.batchId));

let apiGeneration = 0;
watch(() => props.batchId, async (batchId) => {
  const generation = ++apiGeneration;
  selectedCandidateId.value = undefined;
  showSaveConfirmation.value = false;
  showAdvanceConfirmation.value = false;
  saveMessage.value = "";
  saveError.value = "";
  if (!recruitmentGateway) return;
  try {
    await assessmentStore.refreshAssessmentBatch(batchId, recruitmentGateway);
  } catch (error) {
    if (generation !== apiGeneration) return;
    saveError.value = errorText(error, "无法加载服务器考核数据");
  }
}, { immediate: true });

const selectedCandidate = computed(() => (
  selectedCandidateId.value
    ? assessmentStore.getCandidate(props.batchId, selectedCandidateId.value)
    : undefined
));
const selectedRounds = computed(() => (
  selectedCandidate.value ? getAssessmentRounds(selectedCandidate.value.center) : []
));
const filteredCandidates = computed(() => {
  const query = filters.query.trim().toLocaleLowerCase();
  return candidates.value.filter((candidate) => {
    const source = candidate.candidate;
    const matchesCenter = filters.center === "全部人员" || candidate.center === filters.center;
    const matchesQuery = !query
      || source?.name.toLocaleLowerCase().includes(query)
      || source?.studentId.includes(query)
      || candidate.memberId.toLocaleLowerCase().includes(query);
    const matchesStage = matchesAssessmentStage(filters.stage, candidate, currentRoundLabel.value);
    const matchesResult = filters.result === "全部结果" || processingLabel(candidate) === filters.result;
    const matchesAdjustment = filters.adjustment === "全部"
      || (filters.adjustment === "接受调剂") === candidate.acceptsAdjustment;
    return matchesCenter && matchesQuery && matchesStage && matchesResult && matchesAdjustment;
  });
});
const roundIncomplete = computed(() => recruitmentGateway
  ? (apiWorkflowSummary.value?.pending ?? actionableCandidates.value.filter((candidate) => candidate.processingStatus === "assessing").length) > 0
  : actionableCandidates.value.some((candidate) => candidate.processingStatus === "assessing"));
const canAdvance = computed(() => isOwner.value
  && effectiveBatchStatus.value === "closed"
  && (!recruitmentGateway || apiWorkflowSummary.value?.canAdvance === true)
  && state.value.status === "assessing"
  && !roundIncomplete.value
  && !apiBusy.value);
const advanceLabel = computed(() => {
  if (state.value.status !== "assessing") return "考核已完成，等待发布";
  if (effectiveBatchStatus.value !== "closed") return "关闭报名后推进全局轮次";
  if (roundIncomplete.value) return "完成当前轮后推进";
  return state.value.currentRound === 3 ? "结束考核并进入结果发布" : `推进至第${["二", "三"][state.value.currentRound - 1]}轮考核`;
});
const advanceDisabledReason = computed(() => {
  if (!isOwner.value) return "仅联盟总负责人可推进全局轮次。";
  if (effectiveBatchStatus.value === "open" || effectiveBatchStatus.value === "paused") return "关闭报名后才能推进全局考核轮次。";
  if (effectiveBatchStatus.value === "server-validated") return "正在等待服务器批次生命周期摘要。";
  if (apiWorkflowSummary.value?.advanceBlocker?.code) {
    return getRecruitmentAssessmentMessage({ code: apiWorkflowSummary.value.advanceBlocker.code });
  }
  if (roundIncomplete.value) return "当前轮仍有未完成的考核结果，请先完成当前轮。";
  if (state.value.status !== "assessing") return "当前考核状态不允许推进。";
  if (recruitmentGateway && apiWorkflowSummary.value?.canAdvance !== true) return "服务器尚未确认可以推进当前轮。";
  return "";
});
const adjustmentTargets = computed(() => recruitmentGateway
  ? assessmentStore.getApiAdjustmentTargets(props.batchId)
  : RECRUITMENT_CENTERS
    .filter((center) => center !== "白泽开发中心")
    .map((center) => ({ id: center, slug: center, name: center })));

watch(selectedCandidateId, async (candidateId) => {
  if (!candidateId) {
    document.body.classList.remove("is-admin-drawer-open");
    previousFocus?.focus();
    return;
  }
  resetDrafts();
  document.body.classList.add("is-admin-drawer-open");
  await nextTick();
  closeButton.value?.focus();
});

onBeforeUnmount(() => document.body.classList.remove("is-admin-drawer-open"));

function candidateName(candidate: RecruitmentAssessmentCandidate) {
  return candidate.candidate?.name ?? candidate.memberId;
}

function roundLabel(round: AssessmentRoundNumber) {
  return `第${["一", "二", "三"][round - 1]}轮考核`;
}

function phaseLabel(candidate: RecruitmentAssessmentCandidate) {
  if (candidate.processingStatus === "adjustment-suggestion-pending") return "待调剂";
  if (candidate.processingStatus === "ready-to-publish" || candidate.processingStatus === "completed") return "已处理/历史结果";
  return candidate.currentPhase ?? "当前待办";
}

function processingLabel(candidate: RecruitmentAssessmentCandidate): string {
  switch (candidate.processingStatus) {
    case "assessing": return "考核中";
    case "adjustment-suggestion-pending": return "待调剂处理";
    case "ready-to-publish": return "待整批发布";
    case "completed": return "已发布";
  }
}

function outcomeLabel(candidate: RecruitmentAssessmentCandidate) {
  if (candidate.finalDecision === "admitted") return candidate.processingStatus === "completed" ? "已录取" : "通过";
  if (candidate.finalDecision === "not-admitted") return "未通过";
  const latestRound = ([3, 2, 1] as AssessmentRoundNumber[]).find((round) => (
    candidate.roundOutcomes[round] && candidate.roundOutcomes[round] !== "pending"
  ));
  if (latestRound) return candidate.roundOutcomes[latestRound] === "passed" ? "通过" : "未通过";
  return "待公布";
}

function formatUpdatedAt(candidate: RecruitmentAssessmentCandidate) {
  return candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleString("zh-CN", { hour12: false }) : "未保存";
}

function canEdit(candidate: RecruitmentAssessmentCandidate) {
  return canEditAssessmentCandidate({
    apiMode: Boolean(recruitmentGateway),
    canAccessAdmin: session.canAccessAdmin,
    adminLevel: session.adminLevel,
    hasCapability: session.hasCapability,
    adminCenterRole: session.currentAccount?.adminCenterRole,
    candidateCenter: candidate.center,
  });
}

function isRoundEditable(round: AssessmentRoundNumber) {
  const candidate = selectedCandidate.value;
  return Boolean(candidate
    && canEdit(candidate)
    && candidate.currentPhase === roundLabel(round)
    && state.value.currentRound === round);
}

const canSaveSelectedCandidate = computed(() => {
  const candidate = selectedCandidate.value;
  if (!candidate || !canEdit(candidate)) return false;
  return selectedRounds.value.some(isRoundEditable)
    || (isOwner.value
      && candidate.processingStatus === "adjustment-suggestion-pending"
      && Boolean(adjustmentDecision.value));
});

function resetDrafts() {
  const candidate = selectedCandidate.value;
  if (!candidate) return;
  roundDrafts.value = Object.fromEntries(
    getAssessmentRounds(candidate.center).map((round) => [round, candidate.roundOutcomes[round] ?? ""]),
  ) as Partial<Record<AssessmentRoundNumber, RoundDraft>>;
  internalNote.value = candidate.internalNote ?? "";
  const targetSelectionValue = (
    targetIdentity: AssessmentCenterIdentity | undefined,
    mockCenterName: string | undefined,
  ) => {
    // Production selections use the exact server identity; fixture names remain a Mock-only fallback.
    if (recruitmentGateway) return targetIdentity?.id ?? "";
    return mockCenterName ?? "";
  };
  adjustmentDecision.value = candidate.finalDecision === "not-admitted"
    ? "not-admitted"
    : targetSelectionValue(candidate.finalCenterIdentity, candidate.finalCenter);
  adjustmentSuggestion.value = targetSelectionValue(
    candidate.adjustmentSuggestionIdentity,
    candidate.adjustmentSuggestion,
  );
  saveError.value = "";
  saveMessage.value = "";
}

function openCandidate(candidate: RecruitmentAssessmentCandidate, event: Event) {
  previousFocus = event.currentTarget as HTMLElement;
  selectedCandidateId.value = candidate.candidateId;
}

function closeCandidate() {
  showSaveConfirmation.value = false;
  resetDrafts();
  selectedCandidateId.value = undefined;
}

function handleDrawerKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeCandidate();
  }
}

function requestSave() {
  const candidate = selectedCandidate.value;
  if (!candidate) return;
  const round = selectedRounds.value.find(isRoundEditable);
  if (round && roundDrafts.value[round]) {
    showSaveConfirmation.value = true;
    return;
  }
  if (candidate.processingStatus === "adjustment-suggestion-pending"
    && isOwner.value
    && adjustmentDecision.value) {
    showSaveConfirmation.value = true;
    return;
  }
  saveError.value = isOwner.value
    ? "请先为当前可编辑考核轮次选择通过或不通过，或确认最终调剂结果。"
    : candidate.processingStatus === "adjustment-suggestion-pending"
      ? "调剂结果由联盟总负责人直接录入，当前账号无需提交线上建议。"
      : "请先为当前可编辑考核轮次选择通过或不通过。";
}

function errorText(error: unknown, fallback: string) {
  return getRecruitmentAssessmentMessage(error, fallback);
}

async function confirmSave() {
  const candidate = selectedCandidate.value;
  if (!candidate) return;
  try {
    const round = selectedRounds.value.find(isRoundEditable);
    if (round && roundDrafts.value[round]) {
      if (recruitmentGateway) {
        await assessmentStore.saveRoundOutcomeFromApi(recruitmentGateway, {
          batchId: props.batchId,
          candidateId: candidate.candidateId,
          round,
          outcome: roundDrafts.value[round] as "passed" | "failed",
          internalNote: internalNote.value,
        });
      } else {
        assessmentStore.saveRoundOutcome({
          batchId: props.batchId,
          candidateId: candidate.candidateId,
          round,
          outcome: roundDrafts.value[round] as "passed" | "failed",
          internalNote: internalNote.value,
          now: new Date(),
        });
      }
    } else if (candidate.processingStatus === "adjustment-suggestion-pending") {
      if (isOwner.value && adjustmentDecision.value) {
        if (recruitmentGateway) {
          const targetCenterId = adjustmentDecision.value === "not-admitted"
            ? undefined
            : adjustmentDecision.value;
          if (adjustmentDecision.value !== "not-admitted" && (
            !targetCenterId || !assessmentStore.getApiAdjustmentTarget(props.batchId, targetCenterId)
          )) {
            throw new Error("ASSESSMENT_TARGET_CENTER_UNAVAILABLE");
          }
          await assessmentStore.recordAdjustmentDecisionFromApi(recruitmentGateway, {
            batchId: props.batchId,
            candidateId: candidate.candidateId,
            decision: adjustmentDecision.value === "not-admitted" ? "NOT_ADMITTED" : "ADMITTED",
            ...(targetCenterId ? { targetCenterId } : {}),
          });
        } else {
          assessmentStore.recordAdjustmentDecision({
            batchId: props.batchId,
            candidateId: candidate.candidateId,
            decision: adjustmentDecision.value as AdjustmentDestination | "not-admitted",
            now: new Date(),
          });
        }
      } else {
        throw new Error("ASSESSMENT_ADJUSTMENT_OWNER_ONLY");
      }
    } else {
      throw new Error("ASSESSMENT_DRAFT_INCOMPLETE");
    }
    showSaveConfirmation.value = false;
    saveError.value = "";
    saveMessage.value = recruitmentGateway
      ? "结果已保存到服务器，尚未对成员发布。"
      : "结果已保存到当前批次的内部状态，尚未对成员发布。";
    selectedCandidateId.value = undefined;
  } catch (error) {
    showSaveConfirmation.value = false;
    saveError.value = errorText(error, "保存失败");
  }
}

function requestAdvance() {
  if (!canAdvance.value) return;
  showAdvanceConfirmation.value = true;
}

async function confirmAdvance() {
  try {
    if (recruitmentGateway) {
      await assessmentStore.advanceAssessmentRoundFromApi(
        recruitmentGateway,
        props.batchId,
        "管理端确认推进全局考核轮次",
      );
    } else {
      assessmentStore.advanceAssessmentRound(props.batchId, true, new Date(), "管理端确认推进全局考核轮次");
    }
    showAdvanceConfirmation.value = false;
    saveError.value = "";
    saveMessage.value = "全局考核轮次已更新，已保存的上一轮结果保持锁定。";
  } catch (error) {
    showAdvanceConfirmation.value = false;
    saveError.value = errorText(error, "无法推进轮次");
  }
}
</script>

<template>
  <div class="admin-recruitment-page">
    <section class="admin-page-heading">
      <div>
        <p class="eyebrow">招新考核</p>
        <h1>{{ batch?.name ?? "未知批次" }} · 预备成员考核</h1>
        <p class="admin-page-heading__intro">当前批次的考核结果仅在完成整批发布后向成员公开。</p>
      </div>
      <div class="admin-batch-card">
        <span>当前批次</span>
        <strong>{{ batch?.name ?? batchId }}</strong>
        <small>批次生命周期：{{ effectiveBatchStatusLabel }}</small>
        <small>全局当前轮次：{{ currentRoundLabel }}</small>
        <small>考核状态：{{ state.status === "assessing" ? "考核中" : state.status === "ready-to-publish" ? "等待发布" : "已发布" }}</small>
      </div>
    </section>
    <div class="admin-publication-warning" role="status">
      <strong>{{ effectiveBatchStatusLabel }}</strong>
      <p v-if="effectiveBatchStatus === 'server-validated'">批次名单与考核轮次已同步，提交操作时会再次校验当前状态。</p>
      <p v-else-if="effectiveBatchStatus === 'closed'">当前批次已关闭，候选人结果可继续录入；完成本轮后可推进全局考核或进入整批发布。</p>
      <p v-else-if="effectiveBatchStatus === 'open' || effectiveBatchStatus === 'paused'">可继续录入已有候选人的当前轮次结果；首次保存会锁定该报名。关闭报名后才能推进全局轮次或发布整批结果。</p>
      <p v-else>当前批次不可录入考核结果，请先完成批次发布或恢复可处理状态。</p>
    </div>

    <section v-if="recruitmentGateway && batch" class="admin-assessment-workflow-summary" aria-label="批次生命周期与考核摘要">
      <div><span>批次</span><strong>{{ batch.name }}</strong><small>{{ batch.lifecycleStatus === "closed" ? "已关闭，可按规则推进" : "关闭报名后才可推进" }}</small></div>
      <div><span>下一步</span><strong>{{ apiWorkflowSummary?.nextAction === "PUBLISH_BATCH" ? "发布批次" : apiWorkflowSummary?.nextAction === "OPEN_BATCH" ? "立即开放" : apiWorkflowSummary?.nextAction === "CLOSE_BATCH" ? "关闭报名" : apiWorkflowSummary?.nextAction === "RECORD_CURRENT_ROUND_RESULTS" ? "完成当前轮" : apiWorkflowSummary?.nextAction === "SUBMIT_ADJUSTMENT_PROPOSALS" ? "提交调剂建议" : apiWorkflowSummary?.nextAction === "DECIDE_ADJUSTMENTS" ? "处理调剂" : apiWorkflowSummary?.nextAction === "ADVANCE_ROUND" ? "推进轮次" : apiWorkflowSummary?.nextAction === "PUBLISH_RESULTS" ? "发布结果" : apiWorkflowSummary?.nextAction === "NONE" ? "已完成" : "等待服务器确认" }}</strong><small>{{ advanceDisabledReason || "当前可执行推进" }}</small></div>
      <div><span>服务器待办</span><strong>{{ apiWorkflowSummary?.pending ?? actionableCandidates.filter((candidate) => candidate.processingStatus === "assessing").length }}</strong><small>当前轮未完成</small></div>
      <div><span>待调剂</span><strong>{{ apiWorkflowSummary?.adjustmentPending ?? candidates.filter((candidate) => candidate.processingStatus === "adjustment-suggestion-pending").length }}</strong><small>等待最终处理</small></div>
    </section>

    <section class="admin-summary-strip" aria-label="批次考核概览">
      <div><span>本批次人员</span><strong>{{ allCandidates.length }}</strong><small>当前批次</small></div>
      <div><span>当前轮待处理</span><strong>{{ candidates.filter((candidate) => candidate.currentPhase === currentRoundLabel).length }}</strong><small>{{ currentRoundLabel }}</small></div>
      <div><span>待调剂处理</span><strong>{{ candidates.filter((candidate) => candidate.processingStatus === "adjustment-suggestion-pending").length }}</strong><small>负责人建议后由总负责人确认</small></div>
      <div><span>已处理 / 历史结果</span><strong>{{ processedCandidates.length }}</strong><small>历史轮次只读</small></div>
    </section>

    <section class="admin-roster">
      <aside class="admin-groups" aria-label="第一志愿分组">
        <header><span>GROUP BY FIRST CHOICE</span><h2>第一志愿分组</h2></header>
        <button v-for="center in centerGroups" :key="center" type="button" :class="{ 'is-active': filters.center === center }" @click="filters.center = center">
          <span>{{ center }}</span>
          <strong>{{ center === "全部人员" ? candidates.length : candidates.filter((candidate) => candidate.center === center).length }}</strong>
        </button>
        <p>白泽开发中心按全局三轮考核推进，其他中心仅保留第一轮考核。</p>
      </aside>

      <div class="admin-roster__main">
        <header class="admin-roster__header">
          <div><h2>预备成员名单</h2></div>
          <div>
            <p>共 {{ filteredCandidates.length }} 人</p>
            <button type="button" class="button button--ghost" :disabled="!canAdvance" :title="advanceDisabledReason" @click="requestAdvance">{{ apiBusy ? "处理中…" : advanceLabel }}</button>
            <NuxtLink v-if="showBackLink" class="button button--ghost" :to="`/admin/recruitment/batches/${encodeURIComponent(batchId)}`">返回批次概览</NuxtLink>
          </div>
        </header>

        <p v-if="!canAdvance" class="admin-inline-note" role="status">{{ advanceDisabledReason }}</p>

        <div class="admin-filters">
          <label>搜索成员<input v-model="filters.query" type="search" placeholder="姓名或学号"></label>
          <label>当前阶段<select v-model="filters.stage"><option>当前待办</option><option>待调剂</option><option>已处理/历史结果</option><option>全部成员</option></select></label>
          <label>处理状态<select v-model="filters.result"><option>全部结果</option><option>考核中</option><option>待调剂处理</option></select></label>
          <label>调剂意愿<select v-model="filters.adjustment"><option>全部</option><option>接受调剂</option><option>不接受调剂</option></select></label>
        </div>

        <p v-if="saveError" class="admin-save-message" role="alert">{{ saveError }}</p>
        <p v-else-if="apiError" class="admin-save-message" role="alert">{{ getRecruitmentAssessmentMessage(apiError, "服务器请求失败，请刷新后重试。") }}</p>
        <p v-if="saveMessage" class="admin-save-message" role="status">{{ saveMessage }}</p>
        <div class="admin-table-scroll" tabindex="0" aria-label="预备成员名单表格区域">
          <table aria-label="预备成员名单">
            <thead><tr><th>成员</th><th>第一志愿</th><th>白泽方向</th><th>当前阶段</th><th>处理状态</th><th>当前结果</th><th>调剂</th><th>更新时间</th><th><span class="sr-only">操作</span></th></tr></thead>
            <tbody>
              <tr v-for="candidate in filteredCandidates" :key="candidate.candidateId">
                <td><strong>{{ candidateName(candidate) }}</strong><small>{{ candidate.candidate?.studentId ?? candidate.memberId }}</small></td>
                <td>{{ candidate.center }}</td><td>{{ candidate.candidate?.baizeDirection ?? "—" }}</td><td>{{ phaseLabel(candidate) }}</td>
                <td>{{ processingLabel(candidate) }}</td><td><span class="admin-result-pill">{{ outcomeLabel(candidate) }}</span></td>
                <td>{{ candidate.acceptsAdjustment ? "接受" : "不接受" }}</td><td>{{ formatUpdatedAt(candidate) }}</td>
                <td><button type="button" :aria-label="`查看处理 ${candidateName(candidate)}`" @click="openCandidate(candidate, $event)">查看/处理</button></td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredCandidates.length === 0" class="admin-empty"><strong>没有匹配的预备成员</strong><p>修改筛选条件后可继续查找。</p></div>
        </div>
      </div>
    </section>

    <div v-if="selectedCandidate" class="admin-drawer-backdrop" @click.self="closeCandidate">
      <aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="预备成员详情" @keydown="handleDrawerKeydown">
        <header class="admin-drawer__header"><div><h2>{{ candidateName(selectedCandidate) }}</h2><p>{{ selectedCandidate.candidate?.studentId ?? selectedCandidate.memberId }} · {{ selectedCandidate.center }}</p></div><button ref="closeButton" type="button" aria-label="关闭详情" @click="closeCandidate">×</button></header>
        <div class="admin-drawer__body">
          <p v-if="saveError" class="admin-save-message" role="alert">{{ saveError }}</p>
          <section><header><span>01</span><h3>志愿信息</h3></header><ol class="admin-preference-list"><li v-for="(center, index) in selectedCandidate.candidate?.preferences.filter(Boolean) ?? [selectedCandidate.center]" :key="center"><span>0{{ index + 1 }}</span><strong>{{ center }}</strong></li></ol><dl class="admin-detail-grid"><div><dt>白泽方向</dt><dd>{{ selectedCandidate.candidate?.baizeDirection ?? "不适用" }}</dd></div><div><dt>接受调剂</dt><dd>{{ selectedCandidate.acceptsAdjustment ? "是" : "否" }}</dd></div></dl></section>
          <section><header><span>02</span><h3>当前考核</h3></header><p class="admin-inline-note">全局当前轮次：{{ currentRoundLabel }}。上一轮结果和未到达的轮次不可编辑。</p><p v-if="selectedCandidate.processingStatus === 'ready-to-publish' || selectedCandidate.processingStatus === 'completed'" class="admin-inline-note">历史轮次只读，仅展示已处理结果。</p><div class="admin-rounds"><label v-for="round in selectedRounds" :key="round">{{ roundLabel(round) }}<select v-model="roundDrafts[round]" :aria-label="`${roundLabel(round).replace('考核', '')}结果`" :disabled="!isRoundEditable(round)"><option value="">待录入</option><option value="passed">通过</option><option value="failed">不通过</option></select></label></div></section>
          <section v-if="selectedCandidate.processingStatus === 'adjustment-suggestion-pending' && selectedCandidate.acceptsAdjustment"><header><span>03</span><h3>最终调剂结果</h3></header><p class="admin-inline-note">{{ isOwner ? '联盟总负责人可确认非白泽中心或淘汰；确认后无需二次面试或成员确认。' : '调剂结果由联盟总负责人直接录入，当前账号无需提交线上建议。' }}</p><p v-if="isOwner && selectedCandidate.adjustmentSuggestion" class="admin-inline-note">已有调剂记录：{{ selectedCandidate.adjustmentSuggestion }}</p><label v-if="isOwner">最终调剂结果<select v-model="adjustmentDecision" aria-label="最终调剂结果"><option value="">请选择处理结果</option><option value="not-admitted">不录取</option><option v-for="target in adjustmentTargets" :key="target.id" :value="target.id">录取至{{ target.name }}</option></select></label></section>
          <section><header><span>{{ selectedCandidate.processingStatus === 'adjustment-suggestion-pending' ? '04' : '03' }}</span><h3>内部备注</h3></header><label>仅管理员可见<textarea v-model="internalNote" aria-label="内部备注" rows="4" placeholder="记录必要的内部说明" :disabled="!selectedCandidate.currentPhase || selectedCandidate.processingStatus !== 'assessing'"></textarea></label></section>
          <section class="admin-sync-preview"><strong>保存与发布</strong><p>保存只更新当前批次的内部考核状态，整批发布后成员才能查看结果。</p></section>
        </div>
        <footer class="admin-drawer__footer"><span aria-live="polite">{{ saveMessage }}</span><button type="button" class="button button--ghost" @click="closeCandidate">取消</button><button type="button" class="button" :disabled="!canSaveSelectedCandidate || apiBusy" @click="requestSave">{{ apiBusy ? "保存中…" : "保存结果" }}</button></footer>
        <div v-if="showSaveConfirmation" class="admin-confirm-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="assessment-save-confirm-title"><h3 id="assessment-save-confirm-title">确认保存本次结果？</h3><p>保存后会锁定本次结果，且不会提前向成员公开。</p><div><button type="button" class="button button--ghost" :disabled="apiBusy" @click="showSaveConfirmation = false">返回检查</button><button type="button" class="button" :disabled="apiBusy" @click="confirmSave">{{ apiBusy ? "保存中…" : "确认保存" }}</button></div></section></div>
      </aside>
    </div>

    <div v-if="showAdvanceConfirmation" class="admin-modal-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="assessment-advance-confirm-title"><h2 id="assessment-advance-confirm-title">确认{{ advanceLabel }}？</h2><p>推进后，上一轮结果将保持锁定；本操作只影响 {{ batch?.name ?? batchId }}。</p><div><button type="button" class="button button--ghost" :disabled="apiBusy" @click="showAdvanceConfirmation = false">返回检查</button><button type="button" class="button" :disabled="apiBusy" @click="confirmAdvance">{{ apiBusy ? "处理中…" : "确认推进" }}</button></div></section></div>
  </div>
</template>
