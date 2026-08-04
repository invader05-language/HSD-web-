<script setup lang="ts">
import {
  ADMIN_CANDIDATES,
  getPublicationSummary
} from "~/data/recruitment-admin";
import { RECRUITMENT_BATCHES } from "~/data/recruitment-batches";
import { filterAdminCandidatesByBatch } from "~/data/recruitment-admin-context";

definePageMeta({ layout: "admin" });
useHead({ title: "结果发布｜HSD 管理台" });

const route = useRoute();
const batchId = computed(() => typeof route.query.batchId === "string" ? route.query.batchId : "batch-current");
const batch = computed(() => RECRUITMENT_BATCHES.find((item) => item.id === batchId.value));
const candidates = computed(() => filterAdminCandidatesByBatch(ADMIN_CANDIDATES, batchId.value));
const summary = computed(() => getPublicationSummary(candidates.value));
const selected = ref(new Set<string>());
const showConfirmation = ref(false);
const published = ref(false);

watch(candidates, (items) => {
  selected.value = new Set(items.filter((candidate) => candidate.stage === "已结束").map((candidate) => candidate.id));
}, { immediate: true });

function toggleCandidate(id: string) {
  const next = new Set(selected.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selected.value = next;
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Result Publication"
      title="结果发布"
      :description="`集中检查${batch?.name ?? batchId}已经完成的内部结果，确认后再向成员结果中心公开。`"
    >
      <template #actions>
        <button type="button" class="button" :disabled="selected.size === 0" @click="showConfirmation = true">
          发布所选结果
        </button>
      </template>
    </AdminPageHeading>

    <div class="admin-publication-warning">
      <strong>内部保存不等于对成员公开</strong>
      <p>考核台中的修改只形成内部结果；只有在本页发布后，成员才会在个人结果中心看到更新。</p>
    </div>

    <section class="admin-summary-strip" aria-label="结果发布概览">
      <div><span>本批次人员</span><strong>{{ summary.total }}</strong><small>{{ batchId }}</small></div>
      <div><span>可发布</span><strong>{{ summary.ready }}</strong><small>内部结果已完成</small></div>
      <div><span>仍在考核</span><strong>{{ summary.pending }}</strong><small>不可提前发布</small></div>
      <div><span>已选择</span><strong>{{ selected.size }}</strong><small>等待本次发布</small></div>
    </section>

    <section class="admin-list-card">
      <header>
        <div><span>Publication Review</span><h2>待发布结果</h2></div>
        <p>发布后影响个人结果中心和正式成员关系</p>
      </header>
      <div class="admin-publication-list">
        <article
          v-for="candidate in candidates"
          :key="candidate.id"
          :class="{ 'is-disabled': candidate.stage !== '已结束' }"
        >
          <label>
            <input
              type="checkbox"
              :checked="selected.has(candidate.id)"
              :disabled="candidate.stage !== '已结束'"
              @change="toggleCandidate(candidate.id)"
            >
            <span><strong>{{ candidate.name }}</strong><small>{{ candidate.studentId }}</small></span>
          </label>
          <div><span>第一志愿</span><strong>{{ candidate.preferences[0] }}</strong></div>
          <div><span>内部结果</span><AdminStatusPill :status="candidate.result" /></div>
          <div><span>最终中心</span><strong>{{ candidate.finalCenter || "尚未形成" }}</strong></div>
          <small>{{ candidate.stage === "已结束" ? "可以发布" : `当前阶段：${candidate.stage}` }}</small>
        </article>
      </div>
    </section>

    <p v-if="published" class="admin-save-message" role="status">Mock 发布完成：所选结果已在当前会话标记为已发布。</p>

    <div v-if="showConfirmation" class="admin-modal-backdrop">
      <section role="alertdialog" aria-modal="true" aria-labelledby="publish-confirm-title">
        <span>Publish Recruitment Results</span>
        <h2 id="publish-confirm-title">确认发布 {{ selected.size }} 条结果？</h2>
        <p>发布后将更新成员结果中心、当前身份、中心成员关系和公开成员数据来源。真实后端接入后必须在同一事务中完成。</p>
        <ul><li>个人结果中心</li><li>成员身份与中心归属</li><li>中心详情成员来源</li><li>操作审计记录</li></ul>
        <div>
          <button type="button" class="button button--ghost" @click="showConfirmation = false">返回检查</button>
          <button type="button" class="button" @click="showConfirmation = false; published = true">确认发布</button>
        </div>
      </section>
    </div>
  </div>
</template>
