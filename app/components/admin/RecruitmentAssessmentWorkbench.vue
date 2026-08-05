<script setup lang="ts">
import { RECRUITMENT_CENTERS, type RecruitmentCenter } from "~/data/recruitment-application";
import type { AssessmentRoundNumber } from "~/types/recruitment-assessment";
import { getAssessmentRounds } from "~/utils/recruitment-assessment-rules";
import { useRecruitmentAssessmentStore, type RecruitmentAssessmentCandidate } from "~/stores/recruitment-assessment";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope } from "~/utils/admin-center-scope";

const props = defineProps<{ batchId: string; showBackLink?: boolean }>();

type StageFilter = "全部阶段" | "第一轮考核" | "第二轮考核" | "第三轮考核";
type ResultFilter = "全部结果" | "考核中" | "待调剂处理" | "待整批发布" | "已发布";
type RoundDraft = "" | "passed" | "failed";

const assessmentStore = useRecruitmentAssessmentStore();
const batchStore = useRecruitmentBatchStore();
const session = useSessionStore();
const route = useRoute();

const batch = computed(() => batchStore.getBatch(props.batchId));
const state = computed(() => assessmentStore.getBatchState(props.batchId));
const centerScope = computed(() => getAdminCenterScope(session.currentAccount?.adminCenterRole));
const candidates = computed(() => assessmentStore.getCandidates(props.batchId)
  .filter((candidate) => !centerScope.value || candidate.center === centerScope.value));
const currentRoundLabel = computed(() => `第${["一", "二", "三"][state.value.currentRound - 1]}轮考核`);
const isOwner = computed(() => session.canManageAdminAccounts);
const filters = reactive({
  center: "全部人员" as "全部人员" | RecruitmentCenter,
  query: "",
  stage: "全部阶段" as StageFilter,
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
const adjustmentCenter = ref<RecruitmentCenter | "">("");
const adjustmentAdmitted = ref(true);
const showSaveConfirmation = ref(false);
const showAdvanceConfirmation = ref(false);
const saveMessage = ref("");
const saveError = ref("");
const closeButton = ref<HTMLButtonElement>();
let previousFocus: HTMLElement | undefined;

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
    const matchesStage = filters.stage === "全部阶段" || candidate.currentPhase === filters.stage;
    const matchesResult = filters.result === "全部结果" || processingLabel(candidate) === filters.result;
    const matchesAdjustment = filters.adjustment === "全部"
      || (filters.adjustment === "接受调剂") === candidate.acceptsAdjustment;
    return matchesCenter && matchesQuery && matchesStage && matchesResult && matchesAdjustment;
  });
});
const roundIncomplete = computed(() => candidates.value.some((candidate) => candidate.currentPhase === currentRoundLabel.value));
const canAdvance = computed(() => isOwner.value && state.value.status === "assessing" && !roundIncomplete.value);
const advanceLabel = computed(() => {
  if (state.value.status !== "assessing") return "考核已完成，等待发布";
  return state.value.currentRound === 3 ? "结束考核并进入结果发布" : `推进至第${["二", "三"][state.value.currentRound - 1]}轮考核`;
});
const regularCenters = computed(() => RECRUITMENT_CENTERS.filter((center) => center !== "白泽开发中心"));

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
  return candidate.currentPhase ?? "—";
}

function processingLabel(candidate: RecruitmentAssessmentCandidate): Exclude<ResultFilter, "全部结果"> {
  switch (candidate.processingStatus) {
    case "assessing": return "考核中";
    case "offline-adjustment-pending": return "待调剂处理";
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
  const account = session.currentAccount;
  return session.canAccessAdmin && (
    session.adminLevel === "owner" || account?.adminCenterRole === `${candidate.center}负责人`
  );
}

function isRoundEditable(round: AssessmentRoundNumber) {
  const candidate = selectedCandidate.value;
  return Boolean(candidate
    && canEdit(candidate)
    && candidate.currentPhase === roundLabel(round)
    && state.value.currentRound === round);
}

function resetDrafts() {
  const candidate = selectedCandidate.value;
  if (!candidate) return;
  roundDrafts.value = Object.fromEntries(
    getAssessmentRounds(candidate.center).map((round) => [round, candidate.roundOutcomes[round] ?? ""]),
  ) as Partial<Record<AssessmentRoundNumber, RoundDraft>>;
  internalNote.value = candidate.internalNote ?? "";
  adjustmentCenter.value = candidate.finalCenter ?? "";
  adjustmentAdmitted.value = candidate.finalDecision !== "not-admitted";
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
  if (candidate.processingStatus === "offline-adjustment-pending"
    && (!adjustmentAdmitted.value || adjustmentCenter.value)) {
    showSaveConfirmation.value = true;
    return;
  }
  saveError.value = "请先为当前可编辑考核轮次选择通过或不通过，或完成线下调剂决定。";
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? `${fallback}（${error.message}）` : fallback;
}

function confirmSave() {
  const candidate = selectedCandidate.value;
  if (!candidate) return;
  try {
    const round = selectedRounds.value.find(isRoundEditable);
    if (round && roundDrafts.value[round]) {
      assessmentStore.saveRoundOutcome({
        batchId: props.batchId,
        candidateId: candidate.candidateId,
        round,
        outcome: roundDrafts.value[round] as "passed" | "failed",
        internalNote: internalNote.value,
        now: new Date(),
      });
    } else if (candidate.processingStatus === "offline-adjustment-pending"
      && (!adjustmentAdmitted.value || adjustmentCenter.value)) {
      assessmentStore.recordAdjustmentDecision({
        batchId: props.batchId,
        candidateId: candidate.candidateId,
        finalCenter: adjustmentAdmitted.value ? adjustmentCenter.value || undefined : undefined,
        admitted: adjustmentAdmitted.value,
        now: new Date(),
      });
    } else {
      throw new Error("ASSESSMENT_DRAFT_INCOMPLETE");
    }
    showSaveConfirmation.value = false;
    saveError.value = "";
    saveMessage.value = "结果已保存到当前批次的内部 Mock 状态，尚未对成员发布。";
  } catch (error) {
    showSaveConfirmation.value = false;
    saveError.value = errorText(error, "保存失败");
  }
}

function requestAdvance() {
  if (!canAdvance.value) return;
  showAdvanceConfirmation.value = true;
}

function confirmAdvance() {
  try {
    assessmentStore.advanceAssessmentRound(props.batchId, true, new Date(), "管理端确认推进全局考核轮次");
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
        <p class="eyebrow">Batch Assessment</p>
        <h1>{{ batch?.name ?? "未知批次" }} · 预备成员考核</h1>
        <p class="admin-page-heading__intro">考核范围限定为当前 batchId：{{ batchId }}。内部保存不会提前公开结果或改变成员身份。</p>
      </div>
      <div class="admin-batch-card">
        <span>当前批次</span>
        <strong>{{ batch?.name ?? batchId }}</strong>
        <small>batchId：{{ batchId }}</small>
        <small>全局当前轮次：{{ currentRoundLabel }}</small>
        <small>考核状态：{{ state.status === "assessing" ? "考核中" : state.status === "ready-to-publish" ? "等待发布" : "已发布" }}</small>
      </div>
    </section>

    <section class="admin-summary-strip" aria-label="批次考核概览">
      <div><span>本批次人员</span><strong>{{ candidates.length }}</strong><small>{{ batchId }}</small></div>
      <div><span>当前轮待录入</span><strong>{{ candidates.filter((candidate) => candidate.currentPhase === currentRoundLabel).length }}</strong><small>{{ currentRoundLabel }}</small></div>
      <div><span>待调剂处理</span><strong>{{ candidates.filter((candidate) => candidate.processingStatus === "offline-adjustment-pending").length }}</strong><small>线下确认后录入</small></div>
      <div><span>待整批发布</span><strong>{{ candidates.filter((candidate) => candidate.processingStatus === "ready-to-publish").length }}</strong><small>不会单独发布</small></div>
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
          <div><span>Candidate Roster</span><h2>预备成员名单</h2></div>
          <div>
            <p>共 {{ filteredCandidates.length }} 人</p>
            <button type="button" class="button button--ghost" :disabled="!canAdvance" :title="isOwner ? '请先完成当前轮所有可编辑结果' : '仅联盟总负责人可推进全局轮次'" @click="requestAdvance">{{ advanceLabel }}</button>
            <NuxtLink v-if="showBackLink" class="button button--ghost" :to="`/admin/recruitment/batches/${encodeURIComponent(batchId)}`">返回批次概览</NuxtLink>
          </div>
        </header>

        <div class="admin-filters">
          <label>搜索成员<input v-model="filters.query" type="search" placeholder="姓名或学号"></label>
          <label>当前阶段<select v-model="filters.stage"><option>全部阶段</option><option>第一轮考核</option><option>第二轮考核</option><option>第三轮考核</option></select></label>
          <label>处理状态<select v-model="filters.result"><option>全部结果</option><option>考核中</option><option>待调剂处理</option><option>待整批发布</option><option>已发布</option></select></label>
          <label>调剂意愿<select v-model="filters.adjustment"><option>全部</option><option>接受调剂</option><option>不接受调剂</option></select></label>
        </div>

        <p v-if="saveError" class="admin-save-message" role="alert">{{ saveError }}</p>
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
        <header class="admin-drawer__header"><div><span>Candidate Record</span><h2>{{ candidateName(selectedCandidate) }}</h2><p>{{ selectedCandidate.candidate?.studentId ?? selectedCandidate.memberId }} · {{ selectedCandidate.center }}</p></div><button ref="closeButton" type="button" aria-label="关闭详情" @click="closeCandidate">×</button></header>
        <div class="admin-drawer__body">
          <section><header><span>01</span><h3>志愿信息</h3></header><ol class="admin-preference-list"><li v-for="(center, index) in selectedCandidate.candidate?.preferences.filter(Boolean) ?? [selectedCandidate.center]" :key="center"><span>0{{ index + 1 }}</span><strong>{{ center }}</strong></li></ol><dl class="admin-detail-grid"><div><dt>白泽方向</dt><dd>{{ selectedCandidate.candidate?.baizeDirection ?? "不适用" }}</dd></div><div><dt>接受调剂</dt><dd>{{ selectedCandidate.acceptsAdjustment ? "是" : "否" }}</dd></div></dl></section>
          <section><header><span>02</span><h3>当前考核</h3></header><p class="admin-inline-note">全局当前轮次：{{ currentRoundLabel }}。上一轮结果和未到达的轮次不可编辑。</p><div class="admin-rounds"><label v-for="round in selectedRounds" :key="round">{{ roundLabel(round) }}<select v-model="roundDrafts[round]" :aria-label="`${roundLabel(round).replace('考核', '')}结果`" :disabled="!isRoundEditable(round)"><option value="">待录入</option><option value="passed">通过</option><option value="failed">不通过</option></select></label></div></section>
          <section v-if="selectedCandidate.processingStatus === 'offline-adjustment-pending' && selectedCandidate.acceptsAdjustment"><header><span>03</span><h3>线下调剂结果</h3></header><p class="admin-inline-note">录取时需选择普通中心；不录取时无需填写去向。此决定仍属于内部结果，需整批发布后才对成员生效。</p><label>线下决定<select v-model="adjustmentAdmitted" aria-label="线下决定"><option :value="true">录取至最终中心</option><option :value="false">不录取</option></select></label><label v-if="adjustmentAdmitted">最终中心<select v-model="adjustmentCenter" aria-label="最终中心"><option value="">请选择最终中心</option><option v-for="center in regularCenters" :key="center" :value="center">{{ center }}</option></select></label></section>
          <section><header><span>{{ selectedCandidate.processingStatus === 'offline-adjustment-pending' ? '04' : '03' }}</span><h3>内部备注</h3></header><label>仅管理员可见<textarea v-model="internalNote" aria-label="内部备注" rows="4" placeholder="记录必要的内部说明"></textarea></label></section>
          <section class="admin-sync-preview"><strong>保存与发布边界</strong><p>保存只更新当前批次的内部考核状态；整批发布才会更新成员结果中心、正式成员关系和公开投影。真实后端接入后必须在同一事务中完成。</p></section>
        </div>
        <footer class="admin-drawer__footer"><span aria-live="polite">{{ saveMessage }}</span><button type="button" class="button button--ghost" @click="closeCandidate">取消</button><button type="button" class="button" :disabled="!canEdit(selectedCandidate)" @click="requestSave">保存结果</button></footer>
        <div v-if="showSaveConfirmation" class="admin-confirm-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="assessment-save-confirm-title"><span>Save Internal Assessment</span><h3 id="assessment-save-confirm-title">确认保存本次结果？</h3><p>保存后会锁定本次结果，且不会提前向成员公开。</p><div><button type="button" class="button button--ghost" @click="showSaveConfirmation = false">返回检查</button><button type="button" class="button" @click="confirmSave">确认保存</button></div></section></div>
      </aside>
    </div>

    <div v-if="showAdvanceConfirmation" class="admin-modal-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="assessment-advance-confirm-title"><span>Advance Global Assessment</span><h2 id="assessment-advance-confirm-title">确认{{ advanceLabel }}？</h2><p>推进后，上一轮结果将保持锁定；本操作只影响 {{ batch?.name ?? batchId }}。</p><div><button type="button" class="button button--ghost" @click="showAdvanceConfirmation = false">返回检查</button><button type="button" class="button" @click="confirmAdvance">确认推进</button></div></section></div>
  </div>
</template>
