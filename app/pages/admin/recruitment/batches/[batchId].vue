<script setup lang="ts">
import { RECRUITMENT_BATCHES } from "~/data/recruitment-batches";
import {
  buildRecruitmentBatchRoute,
  buildRecruitmentBatchSectionRoute,
  formatRecruitmentBatchPeriod,
  getAdminBatchStatus,
  getRecruitmentBatchStatusLabel,
  canManageRecruitmentBatch,
  type AdminRecruitmentBatchLike,
  type RecruitmentBatchAdminSection
} from "~/data/recruitment-admin-context";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useSessionStore } from "~/stores/session";

definePageMeta({ layout: "admin" });

interface AdminBatchDetail extends AdminRecruitmentBatchLike {
  id: string;
  name: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  openCenterIds?: readonly string[];
  responsibleAccountIds?: readonly string[];
  version?: number;
  actualOpenedAt?: string;
  owner?: string;
}

type LifecycleAction = "publish" | "openNow" | "pause" | "resume" | "close" | "reopen" | "archive";

const route = useRoute();
const session = useSessionStore();
const batchStore = useRecruitmentBatchStore();
const batchId = computed(() => String(route.params.batchId));
const batches = computed<AdminBatchDetail[]>(() => {
  const storeBatches = (batchStore as unknown as { batches?: unknown }).batches;
  return (Array.isArray(storeBatches) && storeBatches.length > 0 ? storeBatches : RECRUITMENT_BATCHES) as AdminBatchDetail[];
});
const batch = computed(() => batches.value.find((item) => item.id === batchId.value));
const overviewRoute = computed(() => buildRecruitmentBatchRoute(batchId.value));
const statusKey = computed(() => {
  const effective = batchStore.effectiveStatus(batchId.value);
  return effective ?? (batch.value ? getAdminBatchStatus(batch.value) : "closed");
});
const statusLabel = computed(() => getRecruitmentBatchStatusLabel(statusKey.value));
const canManage = computed(() => canManageRecruitmentBatch(
  session.currentAccount
    ? { account: session.currentAccount.account, name: session.currentAccount.name, level: session.currentAccount.adminLevel as "admin" | "owner" }
    : undefined
));
const pendingAction = ref<LifecycleAction | null>(null);
const reason = ref("");
const actionMessage = ref("");
const actionError = ref("");
const auditRecords = computed(() => {
  const records = (batchStore as unknown as { auditRecords?: unknown }).auditRecords;
  if (!Array.isArray(records)) return [];
  return records.filter((record) => (record as { batchId?: string }).batchId === batchId.value);
});

function auditText(record: unknown, ...keys: string[]): string {
  if (!record || typeof record !== "object") return "-";
  const value = record as Record<string, unknown>;
  const found = keys.map((key) => value[key]).find((item) => typeof item === "string" && item.length > 0);
  return typeof found === "string" ? found : "-";
}

useHead(() => ({ title: `${batch.value?.name ?? "招新批次"}｜HSD 管理台` }));

function sectionRoute(section: RecruitmentBatchAdminSection) {
  return buildRecruitmentBatchSectionRoute(batchId.value, section);
}

function requestAction(action: LifecycleAction) {
  actionError.value = "";
  actionMessage.value = "";
  if (!canManage.value) {
    actionError.value = "只有联盟总负责人可以修改批次状态。";
    return;
  }
  pendingAction.value = action;
}

function actionLabel(action: LifecycleAction) {
  return {
    publish: "发布批次",
    openNow: "立即开放",
    pause: "暂停报名",
    resume: "恢复报名",
    close: "提前关闭",
    reopen: "重新开放",
    archive: "归档批次"
  }[action];
}

function invokeAction(action: LifecycleAction) {
  const methodName = action === "publish" ? "publishBatch" : action;
  const method = (batchStore as unknown as Record<string, unknown>)[methodName];
  if (typeof method !== "function") {
    actionError.value = "当前 Mock 会话尚未提供该批次命令。";
    return;
  }
  try {
    const rationale = reason.value.trim() || undefined;
    const currentTime = new Date();
    const result = action === "openNow" || action === "close" || action === "reopen"
      ? (method as (id: string, confirmed: boolean, now: Date, reason?: string) => unknown).call(
        batchStore, batchId.value, true, currentTime, rationale
      )
      : (method as (id: string, now?: Date, reason?: string) => unknown).call(
        batchStore, batchId.value, currentTime, rationale
      );
    if (result === false || (result && typeof result === "object" && "ok" in result && !(result as { ok: boolean }).ok)) {
      actionError.value = "批次命令未执行，请刷新后重试。";
      return;
    }
    actionMessage.value = `${actionLabel(action)}已记录到当前 Mock 会话。`;
    pendingAction.value = null;
    reason.value = "";
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "批次命令未执行，请刷新后重试。";
  }
}

function confirmAction() {
  if (!pendingAction.value) return;
  invokeAction(pendingAction.value);
}
</script>

<template>
  <NuxtPage v-if="route.path !== overviewRoute" />
  <div v-else-if="batch" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Recruitment Batch Context"
      :title="batch.name"
      :description="`所有报名、考核、结果发布和导出均限定在 ${batch.name}（${batch.id}）内。`"
    >
      <template #actions>
        <NuxtLink class="button button--ghost" to="/admin/recruitment/batches">返回批次列表</NuxtLink>
        <NuxtLink class="button button--ghost" to="/join">查看用户端页面</NuxtLink>
      </template>
    </AdminPageHeading>

    <section class="admin-batch-card admin-batch-context-card" aria-label="批次上下文">
      <div><span>有效状态</span><strong><AdminStatusPill :status="statusLabel" /></strong></div>
      <div><span>计划时间</span><strong>{{ formatRecruitmentBatchPeriod(batch) }}</strong></div>
      <div><span>实际开放</span><strong>{{ batch.actualOpenedAt?.slice(0, 16).replace("T", " ") || "尚未开放" }}</strong></div>
      <div><span>开放中心</span><strong>{{ batch.openCenterIds?.length ?? 0 }} 个</strong></div>
      <div><span>负责人</span><strong>{{ batch.owner || "联盟总负责人" }}</strong></div>
      <div><span>配置版本</span><strong>v{{ batch.version ?? 1 }}</strong></div>
    </section>

    <p v-if="actionMessage" class="admin-save-message" role="status">{{ actionMessage }}</p>
    <p v-if="actionError" class="admin-inline-note" role="alert">{{ actionError }}</p>

    <section class="admin-list-card">
      <header>
        <div><span>Batch Workflow</span><h2>批次工作区</h2></div>
        <p>{{ canManage ? "当前账号具备批次管理权限" : "当前账号仅可查看与处理授权数据" }}</p>
      </header>
      <nav class="admin-batch-context-nav" aria-label="当前批次工作区">
        <NuxtLink :to="sectionRoute('applications')">报名名单</NuxtLink>
        <NuxtLink :to="sectionRoute('assessment')">考核台</NuxtLink>
        <NuxtLink :to="sectionRoute('publish')">结果发布</NuxtLink>
      </nav>
      <div class="admin-batch-actions">
        <button v-if="statusKey === 'draft'" type="button" :disabled="!canManage" @click="requestAction('publish')">发布批次</button>
        <button v-if="statusKey === 'upcoming'" type="button" :disabled="!canManage" @click="requestAction('openNow')">立即开放</button>
        <button v-if="statusKey === 'open'" type="button" :disabled="!canManage" @click="requestAction('pause')">暂停报名</button>
        <button v-if="statusKey === 'paused'" type="button" :disabled="!canManage" @click="requestAction('resume')">恢复报名</button>
        <button v-if="statusKey === 'open' || statusKey === 'paused'" type="button" :disabled="!canManage" @click="requestAction('close')">提前关闭</button>
        <button v-if="statusKey === 'closed'" type="button" :disabled="!canManage" @click="requestAction('reopen')">重新开放</button>
        <button v-if="statusKey === 'closed'" type="button" :disabled="!canManage" @click="requestAction('archive')">归档批次</button>
      </div>
      <p v-if="!canManage" class="admin-inline-note">普通管理员不会显示可执行的批次变更权限，所有状态命令由联盟总负责人确认。</p>
    </section>

    <section class="admin-list-card">
      <header>
        <div><span>Lifecycle Audit</span><h2>生命周期审计</h2></div>
        <p>原计划时间、操作人和实际时间随命令保存</p>
      </header>
      <p v-if="auditRecords.length === 0" class="admin-empty-copy">当前批次尚无生命周期审计记录</p>
      <div v-else class="admin-table-scroll">
        <table aria-label="批次生命周期审计">
          <thead><tr><th>操作</th><th>操作人</th><th>前后状态</th><th>原计划开始</th><th>实际时间</th><th>原因</th></tr></thead>
          <tbody>
            <tr v-for="record in auditRecords" :key="auditText(record, 'id')">
              <td>{{ auditText(record, 'action') }}</td>
              <td>{{ auditText(record, 'actorName', 'actor') }}</td>
              <td>{{ auditText(record, 'beforeStatus', 'before') }} → {{ auditText(record, 'afterStatus', 'after') }}</td>
              <td>{{ auditText(record, 'originalStartAt') }}</td>
              <td>{{ auditText(record, 'actualAt', 'createdAt') }}</td>
              <td>{{ auditText(record, 'reason') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="pendingAction" class="admin-modal-backdrop">
      <section role="alertdialog" aria-modal="true" aria-labelledby="batch-action-confirm-title">
        <span>Recruitment Lifecycle</span>
        <h2 id="batch-action-confirm-title">确认{{ actionLabel(pendingAction) }}？</h2>
        <p>该操作会改变当前批次的用户报名入口。操作人、原计划时间、实际执行时间和前后状态会写入审计记录。</p>
        <label>操作原因（可选）<textarea v-model="reason" rows="3" placeholder="填写本次批次状态变更原因"></textarea></label>
        <div>
          <button type="button" class="button button--ghost" @click="pendingAction = null">返回检查</button>
          <button type="button" class="button" @click="confirmAction">确认{{ actionLabel(pendingAction) }}</button>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Recruitment Batch Context" title="批次不存在" description="请从招新批次列表重新进入。">
      <template #actions><NuxtLink class="button" to="/admin/recruitment/batches">返回批次列表</NuxtLink></template>
    </AdminPageHeading>
  </div>
</template>
