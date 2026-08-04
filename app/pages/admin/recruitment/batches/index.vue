<script setup lang="ts">
import { RECRUITMENT_BATCHES as LEGACY_BATCHES } from "~/data/recruitment-admin";
import { RECRUITMENT_BATCHES as DOMAIN_BATCHES } from "~/data/recruitment-batches";
import {
  buildRecruitmentBatchRoute,
  formatRecruitmentBatchPeriod,
  getAdminBatchStatus,
  getRecruitmentBatchStatusLabel,
  type AdminRecruitmentBatchLike
} from "~/data/recruitment-admin-context";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";

definePageMeta({ layout: "admin" });
useHead({ title: "招新批次｜HSD 管理台" });

interface AdminBatchListItem extends AdminRecruitmentBatchLike {
  id: string;
  name: string;
  owner?: string;
  applicants?: number;
  openCenterIds?: readonly string[];
  centers?: number;
}

const showCreate = ref(false);
const batchStore = useRecruitmentBatchStore();
const batches = computed<AdminBatchListItem[]>(() => {
  const storeBatches = (batchStore as unknown as { batches?: unknown }).batches;
  const source = Array.isArray(storeBatches) && storeBatches.length > 0
    ? storeBatches
    : DOMAIN_BATCHES.length > 0 ? DOMAIN_BATCHES : LEGACY_BATCHES;
  return source as AdminBatchListItem[];
});
const visibleBatches = computed(() => batches.value.map((batch) => ({
  ...batch,
  statusLabel: getRecruitmentBatchStatusLabel(
    getAdminBatchStatus({ ...batch, effectiveStatus: batchStore.effectiveStatus(batch.id) })
  ),
  statusKey: getAdminBatchStatus({ ...batch, effectiveStatus: batchStore.effectiveStatus(batch.id) }),
  periodLabel: formatRecruitmentBatchPeriod(batch),
  centerCount: batch.openCenterIds?.length ?? batch.centers ?? 0,
  applicantCount: batch.applicants ?? 0
})));
const openBatchCount = computed(() => visibleBatches.value.filter((batch) => batch.statusKey === "open").length);
const applicantTotal = computed(() => visibleBatches.value.reduce((total, batch) => total + batch.applicantCount, 0));
const openCenterTotal = computed(() => visibleBatches.value.find((batch) => batch.statusKey === "open")?.centerCount ?? 0);
const draftCount = computed(() => visibleBatches.value.filter((batch) => batch.statusKey === "draft").length);
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Recruitment Cycles"
      title="招新批次"
      description="统一管理报名时间、开放中心、负责人和批次状态；关闭后的历史批次继续保留只读记录。"
    >
      <template #actions>
        <button type="button" class="button" @click="showCreate = true">新建招新批次</button>
      </template>
    </AdminPageHeading>

    <section class="admin-summary-strip" aria-label="批次概览">
      <div><span>开放批次</span><strong>{{ String(openBatchCount).padStart(2, "0") }}</strong><small>全站同一时间最多一个</small></div>
      <div><span>报名人数</span><strong>{{ applicantTotal }}</strong><small>按批次汇总</small></div>
      <div><span>开放中心</span><strong>{{ String(openCenterTotal).padStart(2, "0") }}</strong><small>当前开放批次</small></div>
      <div><span>待配置</span><strong>{{ String(draftCount).padStart(2, "0") }}</strong><small>草稿批次</small></div>
    </section>

    <section class="admin-list-card">
      <header>
        <div><span>Recruitment Batch List</span><h2>全部招新批次</h2></div>
        <p>Mock 数据 · 共 {{ visibleBatches.length }} 个批次</p>
      </header>
      <div class="admin-batch-list">
        <article v-for="batch in visibleBatches" :key="batch.id">
          <div class="admin-batch-list__index">{{ batch.statusKey === "open" ? "OPEN" : batch.id.slice(0, 4) }}</div>
          <div>
            <AdminStatusPill :status="batch.statusLabel" />
            <h3>{{ batch.name }}</h3>
            <p>{{ batch.periodLabel }}</p>
          </div>
          <dl>
            <div><dt>开放中心</dt><dd>{{ batch.centerCount }} 个</dd></div>
            <div><dt>报名人数</dt><dd>{{ batch.applicantCount }} 人</dd></div>
            <div><dt>负责人</dt><dd>{{ batch.owner || "联盟总负责人" }}</dd></div>
          </dl>
          <NuxtLink class="admin-text-action" :to="buildRecruitmentBatchRoute(batch.id)">
            {{ batch.statusKey === "closed" || batch.statusKey === "archived" ? "查看归档" : "进入批次" }} →
          </NuxtLink>
        </article>
      </div>
    </section>

    <div v-if="showCreate" class="admin-drawer-backdrop" @click.self="showCreate = false">
      <aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="新建招新批次">
        <header class="admin-drawer__header">
          <div><span>New Recruitment Cycle</span><h2>新建招新批次</h2><p>当前仅展示字段结构，不写入数据库</p></div>
          <button type="button" aria-label="关闭新建批次" @click="showCreate = false">×</button>
        </header>
        <div class="admin-drawer__body">
          <section>
            <header><span>01</span><h3>批次信息</h3></header>
            <div class="admin-form-grid">
              <label>批次名称<input value="2027 春季补招"></label>
              <label>负责人<select><option>联盟总负责人</option><option>人才发展中心负责人</option></select></label>
              <label>报名开始时间<input type="date" value="2027-02-20"></label>
              <label>报名截止时间<input type="date" value="2027-03-08"></label>
            </div>
          </section>
          <section>
            <header><span>02</span><h3>开放中心</h3></header>
            <div class="admin-check-grid">
              <label><input type="checkbox" checked> 白泽开发中心</label>
              <label><input type="checkbox" checked> 新媒体中心</label>
              <label><input type="checkbox" checked> 拓维策划中心</label>
              <label><input type="checkbox" checked> 人才发展中心</label>
            </div>
          </section>
          <section class="admin-inline-note">
            保存后只会形成草稿，批次公开前仍需完成报名表和负责人配置。
          </section>
        </div>
        <footer class="admin-drawer__footer">
          <span>Mock 原型，不创建真实批次</span>
          <button type="button" class="button button--ghost" @click="showCreate = false">取消</button>
          <button type="button" class="button" @click="showCreate = false">保存草稿</button>
        </footer>
      </aside>
    </div>
  </div>
</template>
