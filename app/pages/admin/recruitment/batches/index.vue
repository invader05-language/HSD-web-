<script setup lang="ts">
import { RECRUITMENT_CENTERS } from "~/data/recruitment-application";
import { RECRUITMENT_BATCHES as LEGACY_BATCHES } from "~/data/recruitment-admin";
import { RECRUITMENT_BATCHES as DOMAIN_BATCHES } from "~/data/recruitment-batches";
import {
  buildRecruitmentBatchRoute,
  formatRecruitmentBatchPeriod,
  getAdminBatchStatus,
  getRecruitmentBatchStatusLabel,
  type RecruitmentBatchEffectiveStatus,
  type AdminRecruitmentBatchLike
} from "~/data/recruitment-admin-context";
import { getRecruitmentBatchCommandMessage } from "~/utils/recruitment-batch-messages";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useSessionStore } from "~/stores/session";
import { useRecruitmentNow } from "~/composables/useRecruitmentNow";
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { mapAdminRecruitmentBatch, type AdminRecruitmentBatchView } from "~/services/recruitment/recruitment-view-models";
import type { CreateRecruitmentBatchDto } from "../../../../../packages/api-client/src";

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
const runtimeConfig = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
const isMockApi = runtimeConfig.public.useMockApi;
const recruitmentGateway = useRecruitmentGateway();
const organizationGateway = useOrganizationGateway();
const batchStore = isMockApi ? useRecruitmentBatchStore() : undefined;
const session = useSessionStore();
const now = useRecruitmentNow();
if (isMockApi) watch(now, (value) => batchStore?.syncLifecycle(value), { immediate: true });
const createMessage = ref("");
const createError = ref("");
const creating = ref(false);
const productionLoading = ref(!isMockApi);
const productionCenterLoading = ref(!isMockApi);
const productionError = ref("");
const productionCenterError = ref("");
const productionBatches = ref<AdminRecruitmentBatchView[]>([]);
const productionPage = ref(1);
const productionPageSize = ref(20);
const productionTotal = ref(0);
const productionCenterOptions = ref<ReadonlyArray<readonly [string, string]>>([]);
let productionLoadGeneration = 0;
const draftForm = reactive({
  name: "",
  startAt: "",
  endAt: "",
  openCenterIds: isMockApi ? ["baize-development", "new-media", "tuowei-planning", "talent-development"] : [],
});
const mockCenterOptions = [
  ["baize-development", RECRUITMENT_CENTERS[0]],
  ["new-media", RECRUITMENT_CENTERS[1]],
  ["tuowei-planning", RECRUITMENT_CENTERS[2]],
  ["talent-development", RECRUITMENT_CENTERS[3]],
] as const;
const centerOptions = computed<ReadonlyArray<readonly [string, string]>>(() => (
  isMockApi ? mockCenterOptions : productionCenterOptions.value
));
const batches = computed<AdminBatchListItem[]>(() => {
  if (!isMockApi) return productionBatches.value;
  const storeBatches = (batchStore as unknown as { batches?: unknown }).batches;
  const source = Array.isArray(storeBatches) && storeBatches.length > 0
    ? storeBatches
    : DOMAIN_BATCHES.length > 0 ? DOMAIN_BATCHES : LEGACY_BATCHES;
  return source as AdminBatchListItem[];
});
function batchStatus(batch: AdminBatchListItem): RecruitmentBatchEffectiveStatus {
  const effectiveStatus = isMockApi ? batchStore?.effectiveStatus(batch.id, now.value) : batch.effectiveStatus;
  return getAdminBatchStatus({ ...batch, effectiveStatus });
}
const visibleBatches = computed(() => batches.value.map((batch) => ({
  ...batch,
  statusLabel: getRecruitmentBatchStatusLabel(batchStatus(batch)),
  statusKey: batchStatus(batch),
  periodLabel: formatRecruitmentBatchPeriod(batch),
  centerCount: batch.openCenterIds?.length ?? batch.centers ?? 0,
  applicantCount: batch.applicants ?? 0
})));
const openBatchCount = computed(() => visibleBatches.value.filter((batch) => batch.statusKey === "open").length);
const applicantTotal = computed(() => visibleBatches.value.reduce((total, batch) => total + batch.applicantCount, 0));
const openCenterTotal = computed(() => visibleBatches.value.find((batch) => batch.statusKey === "open")?.centerCount ?? 0);
const draftCount = computed(() => visibleBatches.value.filter((batch) => batch.statusKey === "draft").length);
const productionPageCount = computed(() => Math.max(1, Math.ceil(productionTotal.value / productionPageSize.value)));
const createDisabled = computed(() => creating.value || (!isMockApi && (
  productionCenterLoading.value || productionCenterError.value.length > 0 || centerOptions.value.length === 0
)));

function openCreateDrawer() {
  if (createDisabled.value) {
    createError.value = productionCenterError.value || "开放中心尚未读取完成，暂不能新建批次。";
    return;
  }
  createError.value = "";
  draftForm.name = "";
  draftForm.startAt = "";
  draftForm.endAt = "";
  draftForm.openCenterIds = centerOptions.value.map(([id]) => id);
  showCreate.value = true;
}

function toDateTime(value: string, endOfDay = false) {
  return value
    ? new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}+08:00`).toISOString()
    : "";
}

async function loadProductionBatches() {
  if (isMockApi || !recruitmentGateway) return;
  const requestGeneration = ++productionLoadGeneration;
  productionLoading.value = true;
  productionCenterLoading.value = true;
  productionError.value = "";
  productionCenterError.value = "";
  const batchRequest = recruitmentGateway.listAdminBatches(productionPage.value, productionPageSize.value)
    .then((response) => {
      if (requestGeneration !== productionLoadGeneration) return;
      productionBatches.value = response.items.map(mapAdminRecruitmentBatch);
      productionPage.value = response.page;
      productionPageSize.value = response.pageSize;
      productionTotal.value = response.total;
    })
    .catch(() => {
      if (requestGeneration !== productionLoadGeneration) return;
      productionBatches.value = [];
      productionTotal.value = 0;
      productionError.value = "暂时无法读取生产招新批次，请稍后重试。";
    })
    .finally(() => { if (requestGeneration === productionLoadGeneration) productionLoading.value = false; });
  const centerRequest = (organizationGateway?.listCenters() ?? Promise.reject(new Error("ADMIN_ORGANIZATION_GATEWAY_UNAVAILABLE")))
    .then((response) => {
      if (requestGeneration !== productionLoadGeneration) return;
      productionCenterOptions.value = response.items.filter((center) => center.active).map((center) => [center.id, center.name] as const);
    })
    .catch(() => {
      if (requestGeneration !== productionLoadGeneration) return;
      productionCenterOptions.value = [];
      productionCenterError.value = "暂时无法读取开放中心，请稍后重试。";
    })
    .finally(() => { if (requestGeneration === productionLoadGeneration) productionCenterLoading.value = false; });
  await Promise.all([batchRequest, centerRequest]);
}

async function saveDraft() {
  if (creating.value) return;
  creating.value = true;
  try {
    if (isMockApi) {
      batchStore?.createBatch({
        name: draftForm.name,
        startAt: toDateTime(draftForm.startAt),
        endAt: toDateTime(draftForm.endAt, true),
        openCenterIds: draftForm.openCenterIds,
      });
    } else if (recruitmentGateway && session.currentAccount?.account) {
      if (!draftForm.openCenterIds.length) throw new Error("请至少选择一个开放中心。");
      await recruitmentGateway.createAdminBatch({
        name: draftForm.name.trim(),
        startAt: toDateTime(draftForm.startAt),
        endAt: toDateTime(draftForm.endAt, true),
        timezone: "Asia/Shanghai",
        openCenterIds: draftForm.openCenterIds,
        responsibleAccountIds: [session.currentAccount.account],
      } satisfies CreateRecruitmentBatchDto);
      ++productionLoadGeneration;
      await loadProductionBatches();
    } else {
      throw new Error("ADMIN_RECRUITMENT_GATEWAY_UNAVAILABLE");
    }
    showCreate.value = false;
    createError.value = "";
    createMessage.value = "招新批次已保存为草稿，可进入批次继续复核并发布。";
  } catch (error) {
    createError.value = getRecruitmentBatchCommandMessage(error);
  } finally {
    creating.value = false;
  }
}

onMounted(loadProductionBatches);
watch(productionPage, () => { if (!isMockApi) void loadProductionBatches(); });
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Recruitment Cycles"
      title="招新批次"
      description="统一管理报名时间、开放中心和批次状态；关闭后的历史批次继续保留只读记录。"
    >
      <template #actions>
        <button v-if="!isMockApi" type="button" class="button button--ghost" :disabled="productionLoading" aria-label="重新读取生产招新批次" @click="loadProductionBatches">重新读取</button>
        <button v-if="session.canManageAdminAccounts" type="button" class="button" :disabled="createDisabled" :title="createDisabled && !isMockApi ? '开放中心加载完成后才能新建批次' : undefined" @click="openCreateDrawer">新建招新批次</button>
      </template>
    </AdminPageHeading>

    <p v-if="productionLoading" class="admin-save-message" role="status">正在读取生产招新批次…</p>
    <p v-else-if="productionError" class="admin-save-message" role="alert">{{ productionError }} <button type="button" class="admin-text-action" @click="loadProductionBatches">重新读取</button></p>
    <p v-if="productionCenterLoading" class="admin-save-message" role="status">正在读取开放中心…</p>
    <p v-else-if="productionCenterError" class="admin-save-message" role="alert">{{ productionCenterError }} <button type="button" class="admin-text-action" @click="loadProductionBatches">重新读取</button></p>
    <p v-if="createMessage" class="admin-save-message" role="status">{{ createMessage }}</p>

    <section class="admin-summary-strip" aria-label="批次概览">
      <div><span>开放批次</span><strong>{{ String(openBatchCount).padStart(2, "0") }}</strong><small v-if="isMockApi">全站同一时间最多一个</small></div>
      <div><span>报名人数</span><strong>{{ applicantTotal }}</strong><small>按批次汇总</small></div>
      <div><span>开放中心</span><strong>{{ String(openCenterTotal).padStart(2, "0") }}</strong><small>当前开放批次</small></div>
      <div><span>待配置</span><strong>{{ String(draftCount).padStart(2, "0") }}</strong><small>草稿批次</small></div>
    </section>

    <section class="admin-list-card">
      <header>
        <div><span>Recruitment Batch List</span><h2>全部招新批次</h2></div>
        <p>共 {{ isMockApi ? visibleBatches.length : productionTotal }} 个批次</p>
      </header>
      <div v-if="!productionLoading" class="admin-batch-list">
        <p v-if="!visibleBatches.length" class="admin-empty-state">当前生产数据库暂无招新批次。</p>
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
            <div><dt>负责人</dt><dd>{{ batch.owner || "未分配" }}</dd></div>
          </dl>
          <NuxtLink class="admin-text-action" :to="buildRecruitmentBatchRoute(batch.id)">
            {{ batch.statusKey === "archived" ? "查看归档" : batch.statusKey === "closed" ? "处理收尾" : "进入批次" }} →
          </NuxtLink>
        </article>
      </div>
      <PaginationControls v-if="!isMockApi && !productionLoading" v-model="productionPage" :page-count="productionPageCount" label="招新批次分页" />
    </section>

    <div v-if="showCreate && session.canManageAdminAccounts" class="admin-drawer-backdrop" @click.self="showCreate = false">
      <aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="新建招新批次">
        <header class="admin-drawer__header">
          <div><span>New Recruitment Cycle</span><h2>新建招新批次</h2><p>保存后形成草稿，报名统一使用用户端当前招新表单。</p></div>
          <button type="button" aria-label="关闭新建批次" @click="showCreate = false">×</button>
        </header>
        <div class="admin-drawer__body">
          <section>
            <header><span>01</span><h3>批次信息</h3></header>
            <div class="admin-form-grid">
              <label>批次名称<input v-model="draftForm.name" required placeholder="例如：2027 春季招新"></label>
              <label>负责人<input value="联盟总负责人" readonly></label>
              <label>报名开始时间<input v-model="draftForm.startAt" type="date" required></label>
              <label>报名截止时间<input v-model="draftForm.endAt" type="date" required></label>
            </div>
          </section>
          <section>
            <header><span>02</span><h3>开放中心</h3></header>
            <div class="admin-check-grid">
              <label v-for="[id, label] in centerOptions" :key="id"><span>{{ label }}</span><input v-model="draftForm.openCenterIds" type="checkbox" :value="id"></label>
            </div>
          </section>
          <section class="admin-inline-note">
            保存后为草稿，不会立即开放报名。发布批次后，用户进入“加入我们”时会自动关联到唯一开放批次。
          </section>
          <p v-if="createError" class="admin-save-message" role="alert">{{ createError }}</p>
        </div>
        <footer class="admin-drawer__footer">
          <span>联盟总负责人创建 · 保存为草稿</span>
          <button type="button" class="button button--ghost" :disabled="creating" @click="showCreate = false">取消</button>
          <button type="button" class="button" :disabled="creating" @click="saveDraft">保存草稿</button>
        </footer>
      </aside>
    </div>
  </div>
</template>
