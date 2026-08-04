<script setup lang="ts">
import { RECRUITMENT_BATCHES } from "~/data/recruitment-batches";
import { ADMIN_CANDIDATES, getPublicationSummary } from "~/data/recruitment-admin";
import { buildRecruitmentBatchRoute, filterAdminCandidatesByBatch } from "~/data/recruitment-admin-context";

definePageMeta({ layout: "admin" });

const route = useRoute();
const batchId = computed(() => String(route.params.batchId));
const batch = computed(() => RECRUITMENT_BATCHES.find((item) => item.id === batchId.value));
const candidates = computed(() => filterAdminCandidatesByBatch(ADMIN_CANDIDATES, batchId.value));
const summary = computed(() => getPublicationSummary(candidates.value));
const selected = ref(new Set<string>());
const showConfirmation = ref(false);
const published = ref(false);

watch(candidates, (items) => {
  selected.value = new Set(items.filter((candidate) => candidate.stage === "已结束").map((candidate) => candidate.id));
}, { immediate: true });

useHead(() => ({ title: `${batch.value?.name ?? "招新批次"}结果发布｜HSD 管理台` }));

function toggleCandidate(id: string) {
  const next = new Set(selected.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selected.value = next;
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Batch Result Publication" :title="`${batch?.name ?? '未知批次'} · 结果发布`" description="结果发布只能处理当前 batchId 的候选人，发布后才会进入成员结果中心。">
      <template #actions>
        <NuxtLink class="button button--ghost" :to="buildRecruitmentBatchRoute(batchId)">返回批次概览</NuxtLink>
        <button type="button" class="button" :disabled="selected.size === 0" @click="showConfirmation = true">发布所选结果</button>
      </template>
    </AdminPageHeading>
    <div class="admin-publication-warning"><strong>内部保存不等于对成员公开</strong><p>本次发布只影响 {{ batch?.name ?? batchId }}，不会跨批次选择人员。</p></div>
    <section class="admin-summary-strip" aria-label="结果发布概览">
      <div><span>本批次人员</span><strong>{{ summary.total }}</strong><small>{{ batchId }}</small></div>
      <div><span>可发布</span><strong>{{ summary.ready }}</strong><small>内部结果已完成</small></div>
      <div><span>仍在考核</span><strong>{{ summary.pending }}</strong><small>不可提前发布</small></div>
      <div><span>已选择</span><strong>{{ selected.size }}</strong><small>等待本次发布</small></div>
    </section>
    <section class="admin-list-card">
      <header><div><span>Publication Review</span><h2>待发布结果</h2></div><p>当前批次共 {{ candidates.length }} 人</p></header>
      <div class="admin-publication-list">
        <article v-for="candidate in candidates" :key="candidate.id" :class="{ 'is-disabled': candidate.stage !== '已结束' }">
          <label><input type="checkbox" :checked="selected.has(candidate.id)" :disabled="candidate.stage !== '已结束'" @change="toggleCandidate(candidate.id)"><span><strong>{{ candidate.name }}</strong><small>{{ candidate.studentId }}</small></span></label>
          <div><span>第一志愿</span><strong>{{ candidate.preferences[0] }}</strong></div>
          <div><span>内部结果</span><AdminStatusPill :status="candidate.result" /></div>
          <div><span>最终中心</span><strong>{{ candidate.finalCenter || "尚未形成" }}</strong></div>
          <small>{{ candidate.stage === "已结束" ? "可以发布" : `当前阶段：${candidate.stage}` }}</small>
        </article>
      </div>
    </section>
    <p v-if="published" class="admin-save-message" role="status">Mock 发布完成：当前批次所选结果已在会话中标记为已发布。</p>
    <div v-if="showConfirmation" class="admin-modal-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="batch-publish-confirm-title"><span>Publish Recruitment Results</span><h2 id="batch-publish-confirm-title">确认发布 {{ selected.size }} 条结果？</h2><p>发布后只会更新当前批次的成员结果中心和正式成员关系。</p><div><button type="button" class="button button--ghost" @click="showConfirmation = false">返回检查</button><button type="button" class="button" @click="showConfirmation = false; published = true">确认发布</button></div></section></div>
  </div>
</template>
