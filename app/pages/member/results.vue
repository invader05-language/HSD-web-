<script setup lang="ts">
import {
  getDemoMemberResult,
  describeAdmission,
  describeAssessment
} from "~/data/member-results";
import { useCurrentMember } from "~/composables/useCurrentMember";
import { useRecruitmentApplicationStore } from "~/stores/recruitment-application";
import { copyTextToClipboard } from "~/utils/clipboard";

type ResultTab = "admission" | "assessment";

useHead({ title: "结果中心｜白云 HSD 开发者部落" });

const { profile: currentMember } = useCurrentMember();
const applicationStore = useRecruitmentApplicationStore();
const result = computed(() =>
  getDemoMemberResult(currentMember.value.id, applicationStore.submittedApplication)
);
const admission = computed(() => describeAdmission(result.value));
const assessment = computed(() => describeAssessment(result.value));
const activeTab = ref<ResultTab>("admission");
const copyStatus = ref<"idle" | "success" | "error">("idle");
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

async function copyContact() {
  if (!result.value.responsibleContact) return;
  if (copyResetTimer) window.clearTimeout(copyResetTimer);
  const succeeded = await copyTextToClipboard(result.value.responsibleContact.contact);
  copyStatus.value = succeeded ? "success" : "error";
  copyResetTimer = window.setTimeout(() => {
    copyStatus.value = "idle";
  }, 1800);
}

onBeforeUnmount(() => {
  if (copyResetTimer) window.clearTimeout(copyResetTimer);
});
</script>

<template>
  <div class="member-results-page">
    <section class="member-results-hero">
      <div class="member-results-hero__grid shell">
        <div class="member-results-hero__main">
          <p class="member-results-breadcrumb">成员空间&nbsp; / &nbsp;<strong>结果中心</strong></p>
          <p class="eyebrow">Member Result Center</p>
          <h1>结果中心</h1>
          <p>查看本人当前有效的招新录取与阶段考核结果。结果信息仅对当前登录账号开放。</p>
        </div>
        <aside class="member-results-hero__batch" aria-label="当前招新批次">
          <span>Current Recruitment</span>
          <h2>{{ result.batchLabel }}</h2>
          <dl>
            <div><dt>当前账号</dt><dd>{{ currentMember.name }}</dd></div>
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
          <span>当前为前端演示数据</span>
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
                <span>Admission Result · 当前有效结果</span>
                <strong class="member-result-status member-result-status--success">{{ admission.badge }}</strong>
              </header>

              <div class="member-result-summary">
                <p>录取结果</p>
                <h2>{{ admission.headline }}</h2>
                <p>{{ admission.description }}</p>
              </div>

              <dl class="member-result-facts">
                <div><dt>当前身份</dt><dd>{{ result.identity }}</dd></div>
                <div><dt>当前阶段</dt><dd>{{ result.currentStage }}</dd></div>
                <div><dt>最终归属</dt><dd>{{ result.finalCenter ?? "待公布" }}</dd></div>
                <div><dt>所属方向</dt><dd>{{ result.finalDirection ?? "不适用" }}</dd></div>
              </dl>

              <footer class="member-result-card__footer">
                <NuxtLink class="button" to="/member">返回成员空间</NuxtLink>
                <a
                  v-if="result.responsibleContact"
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
                  <div><dt>调剂意愿</dt><dd>{{ result.acceptsTransfer ? "接受调剂" : "不接受调剂" }}</dd></div>
                </dl>
              </section>

              <section
                v-if="result.responsibleContact"
                id="member-result-contact"
                class="member-result-panel member-result-contact"
              >
                <header><h2>对应负责人</h2><span>演示数据</span></header>
                <p>{{ result.responsibleContact.role }}</p>
                <h3>{{ result.responsibleContact.name }}</h3>
                <div>
                  <span>{{ result.responsibleContact.displayContact }}</span>
                  <button type="button" @click="copyContact">
                    {{ copyStatus === "success" ? "已复制" : copyStatus === "error" ? "复制失败，请重试" : "复制联系方式" }}
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
          <div class="member-results-grid">
            <article class="member-result-card">
              <header class="member-result-card__header">
                <span>Assessment Status · 当前阶段</span>
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
                <span>不展示完整考核历程</span>
              </footer>
            </article>

            <aside class="member-results-side">
              <section class="member-result-panel member-result-contact">
                <header><h2>结果说明</h2><span>个人数据</span></header>
                <p>系统仅展示当前有效状态</p>
                <h3>结果以负责人最终发布为准</h3>
                <div><span>如有疑问，请联系对应负责人</span></div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
