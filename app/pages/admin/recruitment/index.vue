<script setup lang="ts">
// Recruitment assessment workbench.
import {
  ADMIN_CANDIDATES,
  REGULAR_CENTERS,
  filterRecruitmentCandidates,
  getRecruitmentCounts,
  type AdminCandidate,
  type RecruitmentAdminFilters,
  type RecruitmentCenter
} from "~/data/recruitment-admin";

definePageMeta({ layout: "admin" });
useHead({ title: "预备成员考核台｜白云 HSD 开发者部落" });

const introText = "按第一志愿查看预备成员，录入当前考核状态与线下确认后的最终结果。";
const introRef = usePretextLayout(introText, 26);
const candidates = ref(ADMIN_CANDIDATES.map((candidate) => ({
  ...candidate,
  preferences: [...candidate.preferences] as AdminCandidate["preferences"],
  rounds: candidate.rounds?.map((round) => ({ ...round }))
})));
const counts = computed(() => getRecruitmentCounts(candidates.value));
const filters = reactive<RecruitmentAdminFilters>({
  center: "全部人员",
  query: "",
  stage: "全部阶段",
  result: "全部结果",
  adjustment: "全部"
});
const selectedCandidate = ref<AdminCandidate | null>(null);
const selectedFinalCenter = ref("");
const internalNote = ref("");
const showConfirmation = ref(false);
const saveMessage = ref("");
const closeButton = ref<HTMLButtonElement | null>(null);
let previousFocus: HTMLElement | null = null;

const centerGroups = [
  "全部人员",
  "白泽开发中心",
  "新媒体中心",
  "拓维策划中心",
  "人才发展中心"
] as const;

const filteredCandidates = computed(() =>
  filterRecruitmentCandidates(candidates.value, filters)
);

watch(selectedCandidate, async (candidate) => {
  if (!candidate) {
    document.body.classList.remove("is-admin-drawer-open");
    previousFocus?.focus();
    return;
  }
  selectedFinalCenter.value = candidate.finalCenter ?? "";
  internalNote.value = candidate.internalNote ?? "";
  document.body.classList.add("is-admin-drawer-open");
  await nextTick();
  closeButton.value?.focus();
});

onBeforeUnmount(() => {
  document.body.classList.remove("is-admin-drawer-open");
});

function selectCenter(center: typeof centerGroups[number]) {
  filters.center = center;
}

function openCandidate(candidate: AdminCandidate, event: Event) {
  previousFocus = event.currentTarget as HTMLElement;
  saveMessage.value = "";
  selectedCandidate.value = candidate;
}

function closeCandidate() {
  showConfirmation.value = false;
  selectedCandidate.value = null;
}

function handleDrawerKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeCandidate();
  }
}

function requestSave() {
  showConfirmation.value = true;
}

function confirmSave() {
  if (!selectedCandidate.value) return;
  if (selectedCandidate.value.stage === "线下结果待录入" && selectedFinalCenter.value) {
    selectedCandidate.value.finalCenter = selectedFinalCenter.value as RecruitmentCenter;
    selectedCandidate.value.identity = "正式成员";
    selectedCandidate.value.stage = "已结束";
    selectedCandidate.value.result = "已录取";
  }
  selectedCandidate.value.internalNote = internalNote.value;
  selectedCandidate.value.updatedAt = "刚刚";
  showConfirmation.value = false;
  saveMessage.value = "结果已保存到当前 Mock 会话";
}
</script>

<template>
  <div class="admin-recruitment-page">
    <section class="admin-page-heading">
      <div>
        <p class="eyebrow">Recruitment Operations</p>
        <h1>预备成员考核台</h1>
        <p ref="introRef" class="admin-page-heading__intro">{{ introText }}</p>
      </div>
      <div class="admin-batch-card">
        <span>当前批次</span>
        <strong>2026 秋季招新</strong>
        <small>Mock 数据 · 不写入数据库</small>
      </div>
    </section>

    <section class="admin-metrics" aria-label="招新数据概览">
      <article><span>预备人员</span><strong>{{ String(counts.preparatory).padStart(2, "0") }}</strong><small>本批次全部人员</small></article>
      <article><span>考核处理中</span><strong>{{ String(counts.assessing).padStart(2, "0") }}</strong><small>含线下结果待录入</small></article>
      <article><span>已录取</span><strong>{{ String(counts.admitted).padStart(2, "0") }}</strong><small>已形成正式成员关系</small></article>
      <article><span>未录取</span><strong>{{ String(counts.notAdmitted).padStart(2, "0") }}</strong><small>当前批次最终结果</small></article>
    </section>

    <section class="admin-roster">
      <aside class="admin-groups" aria-label="第一志愿分组">
        <header>
          <span>GROUP BY FIRST CHOICE</span>
          <h2>第一志愿分组</h2>
        </header>
        <button
          v-for="center in centerGroups"
          :key="center"
          type="button"
          :class="{ 'is-active': filters.center === center }"
          @click="selectCenter(center)"
        >
          <span>{{ center }}</span>
          <strong>{{
            center === "全部人员"
              ? candidates.length
              : candidates.filter((candidate) => candidate.preferences[0] === center).length
          }}</strong>
        </button>
        <p>白泽只按中心分组，不按五个方向继续拆分。</p>
      </aside>

      <div class="admin-roster__main">
        <header class="admin-roster__header">
          <div>
            <span>Candidate Roster</span>
            <h2>预备成员名单</h2>
          </div>
          <p>共 {{ filteredCandidates.length }} 人</p>
        </header>

        <div class="admin-filters">
          <label>
            搜索成员
            <input v-model="filters.query" type="search" placeholder="姓名或学号" />
          </label>
          <label>
            当前阶段
            <select v-model="filters.stage">
              <option>全部阶段</option>
              <option>面试</option>
              <option>第一轮考核</option>
              <option>第二轮考核</option>
              <option>第三轮考核</option>
              <option>线下结果待录入</option>
              <option>已结束</option>
            </select>
          </label>
          <label>
            当前结果
            <select v-model="filters.result">
              <option>全部结果</option>
              <option>待公布</option>
              <option>待处理</option>
              <option>通过</option>
              <option>未通过</option>
              <option>已录取</option>
            </select>
          </label>
          <label>
            调剂意愿
            <select v-model="filters.adjustment">
              <option>全部</option>
              <option>接受调剂</option>
              <option>不接受调剂</option>
            </select>
          </label>
        </div>

        <div class="admin-table-scroll" tabindex="0" aria-label="预备成员名单表格区域">
          <table aria-label="预备成员名单">
            <thead>
              <tr>
                <th scope="col">成员</th>
                <th scope="col">第一志愿</th>
                <th scope="col">白泽方向</th>
                <th scope="col">当前阶段</th>
                <th scope="col">结果</th>
                <th scope="col">调剂</th>
                <th scope="col">更新时间</th>
                <th scope="col"><span class="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="candidate in filteredCandidates" :key="candidate.id">
                <td>
                  <strong>{{ candidate.name }}</strong>
                  <small>{{ candidate.studentId }}</small>
                </td>
                <td>{{ candidate.preferences[0] }}</td>
                <td>{{ candidate.baizeDirection ?? "—" }}</td>
                <td>{{ candidate.stage }}</td>
                <td><span class="admin-result-pill" :data-result="candidate.result">{{ candidate.result }}</span></td>
                <td>{{ candidate.acceptsAdjustment ? "接受" : "不接受" }}</td>
                <td>{{ candidate.updatedAt }}</td>
                <td>
                  <button
                    type="button"
                    :aria-label="`查看处理 ${candidate.name}`"
                    @click="openCandidate(candidate, $event)"
                  >
                    查看/处理
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredCandidates.length === 0" class="admin-empty">
            <strong>没有匹配的预备成员</strong>
            <p>保留当前筛选条件，可修改任一条件继续查找。</p>
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="selectedCandidate"
      class="admin-drawer-backdrop"
      @click.self="closeCandidate"
    >
      <aside
        class="admin-candidate-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="预备成员详情"
        @keydown="handleDrawerKeydown"
      >
        <header class="admin-drawer__header">
          <div>
            <span>Candidate Record</span>
            <h2>{{ selectedCandidate.name }}</h2>
            <p>{{ selectedCandidate.studentId }} · {{ selectedCandidate.identity }}</p>
          </div>
          <button ref="closeButton" type="button" aria-label="关闭详情" @click="closeCandidate">×</button>
        </header>

        <div class="admin-drawer__body">
          <section>
            <header><span>01</span><h3>志愿信息</h3></header>
            <ol class="admin-preference-list">
              <li v-for="(center, index) in selectedCandidate.preferences.filter(Boolean)" :key="center">
                <span>0{{ index + 1 }}</span>
                <strong>{{ center }}</strong>
              </li>
            </ol>
            <dl class="admin-detail-grid">
              <div><dt>白泽方向</dt><dd>{{ selectedCandidate.baizeDirection ?? "不适用" }}</dd></div>
              <div><dt>接受调剂</dt><dd>{{ selectedCandidate.acceptsAdjustment ? "是" : "否" }}</dd></div>
            </dl>
          </section>

          <section>
            <header><span>02</span><h3>当前考核</h3></header>

            <div v-if="selectedCandidate.rounds" class="admin-rounds">
              <label v-for="round in selectedCandidate.rounds" :key="round.label">
                {{ round.label }}
                <select
                  :aria-label="`${round.label.replace('考核', '')}结果`"
                  :disabled="!round.editable"
                  :value="round.result"
                >
                  <option>尚未开始</option>
                  <option>待公布</option>
                  <option>通过</option>
                  <option>未通过</option>
                </select>
              </label>
            </div>

            <label v-else>
              面试结果
              <select :value="selectedCandidate.result">
                <option>待公布</option>
                <option>通过</option>
                <option>未通过</option>
              </select>
            </label>
          </section>

          <section v-if="selectedCandidate.stage === '线下结果待录入'">
            <header><span>03</span><h3>线下结果录入</h3></header>
            <p class="admin-inline-note">调剂已在线下确认，本页只记录最终普通中心或未录取结果。</p>
            <label>
              最终中心
              <select v-model="selectedFinalCenter">
                <option value="">请选择最终中心</option>
                <option v-for="center in REGULAR_CENTERS" :key="center" :value="center">{{ center }}</option>
              </select>
            </label>
          </section>

          <section>
            <header><span>{{ selectedCandidate.stage === "线下结果待录入" ? "04" : "03" }}</span><h3>内部备注</h3></header>
            <label>
              仅管理员可见
              <textarea v-model="internalNote" rows="4" placeholder="记录必要的内部说明"></textarea>
            </label>
          </section>

          <section class="admin-sync-preview">
            <strong>保存后的 Mock 联动预览</strong>
            <ul>
              <li>预备成员当前身份</li>
              <li>个人结果中心</li>
              <li>中心成员关系</li>
              <li>公开成员数据来源</li>
            </ul>
            <p>真实后端接入后，这些更新必须在同一事务中完成。</p>
          </section>
        </div>

        <footer class="admin-drawer__footer">
          <span aria-live="polite">{{ saveMessage }}</span>
          <button type="button" class="button button--ghost" @click="closeCandidate">取消</button>
          <button type="button" class="button" @click="requestSave">保存结果</button>
        </footer>

        <div v-if="showConfirmation" class="admin-confirm-backdrop">
          <section role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title">
            <span>Identity Change</span>
            <h3 id="admin-confirm-title">确认保存本次结果？</h3>
            <p>系统将更新当前身份、个人结果中心和中心成员关系的 Mock 状态。</p>
            <dl>
              <div><dt>变更前身份</dt><dd>{{ selectedCandidate.identity }}</dd></div>
              <div><dt>最终中心</dt><dd>{{ selectedFinalCenter || selectedCandidate.finalCenter || "保持当前" }}</dd></div>
            </dl>
            <div>
              <button type="button" class="button button--ghost" @click="showConfirmation = false">返回检查</button>
              <button type="button" class="button" @click="confirmSave">确认保存</button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  </div>
</template>
