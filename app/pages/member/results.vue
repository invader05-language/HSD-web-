<script setup lang="ts">
import PublishedStageResults from '~/components/member/PublishedStageResults.vue';
import PrivateGroupCode from '~/components/member/PrivateGroupCode.vue';
import MemberCurrentRouting from '~/components/member/MemberCurrentRouting.vue';
import type { MemberStageResultsDto, MyRecruitmentResultDto } from '../../../packages/api-client/src';
import { createResultRefresh } from '~/utils/assessment-result-refresh';
import MemberSpaceNav from "~/components/member/MemberSpaceNav.vue";
import {
  getDemoMemberResult,
  applyPublishedAssessmentProjection,
  memberResultFromApi,
  resultCenterMemberFromSession,
  memberResultFromContext,
  stageResultsFromContext,
  describeAdmission,
  describeAssessment,
  type MemberIdentity,
  type MemberStageView,
} from "~/data/member-results";
import { useCurrentMember } from "~/composables/useCurrentMember";
import { useSessionStore } from "~/stores/session";
import { useRecruitmentApplicationStore } from "~/stores/recruitment-application";
import { copyTextToClipboard } from "~/utils/clipboard";
import { useRecruitmentAssessmentStore } from "~/stores/recruitment-assessment";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { useSessionGateway } from "~/composables/useSessionGateway";

type ResultTab = "admission" | "assessment";

useHead({ title: "结果中心｜白云 HSD 开发者部落" });
definePageMeta({ middleware: "member" });

const apiRuntime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const isMockApi = apiRuntime.public.useMockApi;
const session = useSessionStore();
const sessionGateway = useSessionGateway();
const mockCurrentMember = isMockApi ? useCurrentMember() : undefined;
const currentMember = computed(() => isMockApi
  ? mockCurrentMember?.profile.value
  : resultCenterMemberFromSession(session.apiSession?.person));
const currentMemberIdentity = computed<MemberIdentity | undefined>(() => {
  const identity = currentMember.value?.identity;
  return identity === "正式成员" || identity === "预备成员" || identity === "未录取"
    ? identity
    : undefined;
});
const memberNavProfile = computed(() => currentMember.value
  ? { name: currentMember.value.name, identity: currentMember.value.identity }
  : { name: "成员", identity: "成员" });
const applicationStore = useRecruitmentApplicationStore();
const assessmentStore = useRecruitmentAssessmentStore();
const batchStore = useRecruitmentBatchStore();
const recruitmentGateway = useRecruitmentGateway();
if (recruitmentGateway) assessmentStore.enableApiMode();
const resultsError = computed(() => assessmentStore.myResultsError);

const apiStageResults = ref<MemberStageView>();
const apiResultContext = ref<import("~/data/member-results").MemberResultContextDto>();
const stageResults = computed(() => {
  if (recruitmentGateway) return apiStageResults.value;
  const memberId = currentMember.value?.id;
  if (!memberId) return undefined;
  return batchStore.batches.map(batch => assessmentStore.getMockStageResults(batch.id, memberId))
    .filter(result => result.stages.length).sort((a, b) => Date.parse(b.stages.at(-1)?.publishedAt ?? '') - Date.parse(a.stages.at(-1)?.publishedAt ?? ''))[0];
});
const readStageImage = computed(() => recruitmentGateway?.readGroupCodeImage ?? (async () => { throw new Error('GROUP_CODE_NOT_READY'); }));
const stageError = ref('');
let destroyed = false;
let sessionExpired = false;
function expireSession() {
  if (destroyed || sessionExpired) return;
  sessionExpired = true;
  apiStageResults.value = undefined;
  apiResultContext.value = undefined;
  assessmentStore.myResults = [];
  session.clearProductionSession();
  void navigateTo('/login?redirect=/member/results');
}
let projectionRequest: Promise<void> | undefined;
function refreshResults(): Promise<void> {
  return projectionRequest ??= loadResults().finally(() => { projectionRequest = undefined; });
}
async function loadResults() {
  if (!recruitmentGateway || destroyed || sessionExpired) return;
  const context = await recruitmentGateway.getMyResultContext();
  if (destroyed || sessionExpired) return;
  apiResultContext.value = context;
  const finalProjection = context.finalResult;
  assessmentStore.myResults = finalProjection
    && typeof finalProjection.id === "string"
    && finalProjection.batch
    && finalProjection.preferences
    && finalProjection.responsibleContacts
    ? [finalProjection as MyRecruitmentResultDto]
    : [];
  assessmentStore.myResultsError = undefined;
  apiStageResults.value = stageResultsFromContext(context);
  stageError.value = '';
}
const refresher = createResultRefresh(refreshResults, { unauthorized: expireSession, visible: () => typeof document !== 'undefined' && document.visibilityState === 'visible' });
function visibilityChanged() { refresher.visibilityChanged(); }
async function refreshImageReference() {
  try { await refreshResults(); }
  catch (cause) { if ((cause as { status?: number })?.status === 401) { refresher.stop(); expireSession(); } }
}
const finalGroupCode = computed(() => stageResults.value?.finalGroupCode);
onMounted(async () => {
  if (!recruitmentGateway) return;
  document.addEventListener('visibilitychange', visibilityChanged);
  refresher.start();
});
onBeforeUnmount(() => { destroyed = true; refresher.stop(); document.removeEventListener('visibilitychange', visibilityChanged); });

const publishedAssessment = computed(() => {
  if (recruitmentGateway) return undefined;
  const published = batchStore.batches.flatMap((batch) => (
    assessmentStore.getCandidates(batch.id)
      .filter((candidate) => candidate.memberId === currentMember.value?.id && Boolean(candidate.publishedAt))
      .map((candidate) => ({
        memberId: candidate.memberId,
        center: candidate.center,
        finalDecision: candidate.finalDecision,
        finalCenter: candidate.finalCenter,
        finalBaizeDirection: candidate.finalBaizeDirection,
        publishedAt: candidate.publishedAt,
        batchName: batch.name,
      }))
  ));
  return published.sort((left, right) => (
    Date.parse(right.publishedAt ?? "") - Date.parse(left.publishedAt ?? "")
  ))[0];
});
const result = computed(() => recruitmentGateway
  ? apiResultContext.value
    ? memberResultFromContext(apiResultContext.value, currentMemberIdentity.value ?? "预备成员")
    : assessmentStore.myResults[0]
    ? memberResultFromApi(assessmentStore.myResults[0], currentMemberIdentity.value ?? "预备成员")
    : memberResultFromApi(undefined, currentMemberIdentity.value ?? "预备成员")
  : applyPublishedAssessmentProjection(
      getDemoMemberResult(currentMember.value?.id ?? "", applicationStore.submittedApplication),
      publishedAssessment.value,
    ));
const admission = computed(() => describeAdmission(result.value));
const assessment = computed(() => describeAssessment(result.value));
const publishedRouting = computed(() => {
  const context = apiResultContext.value;
  return !context?.finalResult && context?.currentRouting?.center ? context.currentRouting : undefined;
});
const activeTab = ref<ResultTab>("admission");
const copyStatus = ref<Record<string, "idle" | "success" | "error">>({});
let copyResetTimer: number | undefined;

function activateTab(tab: ResultTab) {
  activeTab.value = tab;
}

async function moveTab(event: KeyboardEvent, current: ResultTab) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const nextTab: ResultTab = current === "admission" ? "assessment" : "admission";
  activateTab(nextTab);
  await nextTick();
  document.querySelector<HTMLButtonElement>(`#result-tab-${nextTab}`)?.focus();
}

async function copyContact(contact: { personId?: string; contact: string; name: string }, resultId: string) {
  if (copyResetTimer) window.clearTimeout(copyResetTimer);
  try {
    const complete = recruitmentGateway && contact.personId
      ? await recruitmentGateway.getMyResponsibleContact(resultId, contact.personId)
      : { contact: contact.contact };
    const succeeded = await copyTextToClipboard(complete.contact);
    copyStatus.value = { ...copyStatus.value, [contact.personId ?? contact.name]: succeeded ? "success" : "error" };
  } catch {
    copyStatus.value = { ...copyStatus.value, [contact.personId ?? contact.name]: "error" };
  }
  copyResetTimer = window.setTimeout(() => {
    copyStatus.value = {};
  }, 1800);
}

onBeforeUnmount(() => {
  if (copyResetTimer) window.clearTimeout(copyResetTimer);
});

async function signOut() { if (await session.signOutForRuntime(useRuntimeConfig().public, sessionGateway)) await navigateTo("/"); }
</script>

<template>
  <div class="member-space member-space--subpage">
    <MemberSpaceNav :profile="memberNavProfile" active="results" :signing-out="session.isSigningOut" :sign-out-error="session.signOutError" @sign-out="signOut" />
    <div class="member-results-page">
    <section class="member-results-hero">
      <div class="member-results-hero__grid shell">
        <div class="member-results-hero__main">
          <p class="member-results-breadcrumb">成员空间&nbsp; / &nbsp;<strong>结果中心</strong></p>
          <p class="eyebrow">成员结果中心</p>
          <h1>结果中心</h1>
          <p>查看本人当前有效的招新录取与阶段考核结果。结果信息仅对当前登录账号开放。</p>
        </div>
        <aside class="member-results-hero__batch" aria-label="当前招新批次">
          <span>当前招新批次</span>
          <h2>{{ apiResultContext?.batch?.name ?? stageResults?.batchName ?? result.batchLabel }}</h2>
          <dl>
            <div><dt>当前账号</dt><dd>{{ currentMember?.name ?? "当前登录成员" }}</dd></div>
            <div><dt>当前身份</dt><dd>{{ result.identity }}</dd></div>
          </dl>
        </aside>
      </div>
    </section>

    <section class="member-results-content">
      <div class="shell">
        <div class="member-results-tabs" role="tablist" aria-label="结果类型">
          <button
            id="result-tab-admission"
            type="button"
            role="tab"
            aria-controls="result-panel-admission"
            :aria-selected="activeTab === 'admission'"
            @click="activateTab('admission')"
            @keydown="moveTab($event, 'admission')"
          >
            招新录取
          </button>
          <button
            id="result-tab-assessment"
            type="button"
            role="tab"
            aria-controls="result-panel-assessment"
            :aria-selected="activeTab === 'assessment'"
            @click="activateTab('assessment')"
            @keydown="moveTab($event, 'assessment')"
          >
            阶段考核
          </button>
          <span v-if="assessmentStore.myResultsLoading" role="status">正在加载服务器结果…</span>
          <span v-else-if="resultsError" role="alert">结果加载失败（{{ resultsError }}）</span>
          <span v-else>仅显示当前账号可查看的已发布结果</span>
        </div>

        <section
          v-show="activeTab === 'admission'"
          id="result-panel-admission"
          role="tabpanel"
          aria-labelledby="result-tab-admission"
          tabindex="0"
        >
          <div class="member-results-grid">
            <article class="member-result-card">
              <header class="member-result-card__header">
                <span>录取结果</span>
                <strong class="member-result-status" :class="result.finalResultPending ? 'member-result-status--pending' : 'member-result-status--success'">{{ publishedRouting ? '已发布结果' : admission.badge }}</strong>
              </header>

              <div class="member-result-summary">
                <p>{{ publishedRouting ? '已发布的考核结果' : '录取结果' }}</p>
                <h2>{{ publishedRouting ? `${publishedRouting.type === 'ADJUSTED' || publishedRouting.type === 'BAIZE_TRANSFER' ? '已调入' : '所属中心：'}${publishedRouting.center?.name}` : admission.headline }}</h2>
                <p>{{ publishedRouting ? '扫码进入对应中心群。' : admission.description }}</p>
              </div>

              <dl class="member-result-facts">
                <div><dt>当前身份</dt><dd>{{ result.identity }}</dd></div>
                <div><dt>当前阶段</dt><dd>{{ result.currentStage }}</dd></div>
                <div><dt>{{ publishedRouting ? '所属中心' : '最终归属' }}</dt><dd>{{ result.finalCenter ?? "待公布" }}</dd></div>
                <div><dt>所属方向</dt><dd>{{ result.finalDirection ?? "不适用" }}</dd></div>
              </dl>

              <MemberCurrentRouting
                v-if="publishedRouting?.center"
                :center="publishedRouting.center"
                :group-code="publishedRouting.groupCode"
                :read-image="readStageImage"
                @refresh="refreshImageReference"
                @unauthorized="refresher.stop(); expireSession()"
              />

              <section v-if="finalGroupCode && recruitmentGateway?.readGroupCodeImage" class="member-final-group"><h3>部门群二维码</h3><PrivateGroupCode :code="finalGroupCode" :read-image="recruitmentGateway.readGroupCodeImage" @refresh="refreshImageReference" @unauthorized="refresher.stop(); expireSession()" /></section>
              <footer class="member-result-card__footer">
                <NuxtLink class="button" to="/member">返回成员空间</NuxtLink>
                <a
                  v-if="result.responsibleContacts?.length"
                  class="button button--ghost"
                  href="#member-result-contact"
                >
                  联系负责人
                </a>
                <span>仅本人登录后可见</span>
              </footer>
            </article>

            <aside class="member-results-side">
              <section class="member-result-panel">
                <header><h2>我的志愿</h2><span>报名信息</span></header>
                <ol class="member-result-preferences">
                  <li v-for="preference in result.preferences" :key="preference.rank">
                    <strong>{{ String(preference.rank).padStart(2, "0") }}</strong>
                    <span>{{ preference.center }}</span>
                    <small>第{{ ["一", "二", "三"][preference.rank - 1] }}志愿</small>
                  </li>
                </ol>
                <dl class="member-result-preference-meta">
                  <div><dt>白泽意向方向</dt><dd>{{ result.baizeInterestDirection ?? "未选择" }}</dd></div>
                  <div><dt>调剂意愿</dt><dd>{{ result.acceptsTransfer === undefined ? "结果投影未提供" : result.acceptsTransfer ? "接受调剂" : "不接受调剂" }}</dd></div>
                </dl>
              </section>

              <section
                v-if="result.responsibleContacts?.length"
                id="member-result-contact"
                class="member-result-panel member-result-contact"
              >
                <header><h2>对应负责人</h2><span>负责人信息</span></header>
                <div v-for="contact in result.responsibleContacts" :key="contact.personId ?? contact.name">
                  <p>{{ contact.role }}</p>
                  <h3>{{ contact.name }}</h3>
                  <span>{{ contact.displayContact }}</span>
                  <button type="button" @click="copyContact(contact, result.id)">
                    {{ copyStatus[contact.personId ?? contact.name] === "success" ? "已复制" : copyStatus[contact.personId ?? contact.name] === "error" ? "复制失败，请重试" : "复制联系方式" }}
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </section>

        <section
          v-show="activeTab === 'assessment'"
          id="result-panel-assessment"
          role="tabpanel"
          aria-labelledby="result-tab-assessment"
          tabindex="0"
        >
          <p v-if="stageError" role="alert">{{ stageError }}</p>
          <div class="member-results-grid">
            <PublishedStageResults v-if="stageResults && (stageResults.stages.length || stageResults.currentRouting || stageResults.transfer)" :results="stageResults" :read-image="readStageImage" @refresh="refreshImageReference" @unauthorized="refresher.stop(); expireSession()" />
            <article v-else class="member-result-card">
              <header class="member-result-card__header">
                <span>考核进度</span>
                <strong class="member-result-status member-result-status--pending">{{ assessment.badge }}</strong>
              </header>

              <div class="member-result-summary">
                <p>阶段考核</p>
                <h2>{{ assessment.headline }}</h2>
                <p>{{ assessment.description }}</p>
              </div>

              <dl class="member-result-facts">
                <div><dt>考核中心</dt><dd>{{ result.finalCenter ?? result.preferences[0]?.center ?? "尚未确定" }}</dd></div>
                <div><dt>当前阶段</dt><dd>{{ result.currentStage }}</dd></div>
                <div><dt>当前结论</dt><dd>{{ result.currentConclusion }}</dd></div>
                <div><dt>数据范围</dt><dd>仅当前有效结果</dd></div>
              </dl>

              <footer class="member-result-card__footer">
                <NuxtLink class="button" to="/member">返回成员空间</NuxtLink>
                <span>已发布的通过轮次可展开查看群二维码</span>
              </footer>
            </article>

            <aside class="member-results-side">
              <section class="member-result-panel member-result-contact">
                <header><h2>结果说明</h2><span>个人数据</span></header>
                <p>仅展示已发布的个人结果</p>
                <h3>各轮结果以联盟总负责人统一发布为准</h3>
                <div><span>如有疑问，请联系对应负责人</span></div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </section>
    </div>
  </div>
</template>

<style scoped>
.member-final-group { margin: 24px; border-top: 1px solid #e5e2dd; padding-top: 24px; text-align: center; }
</style>
