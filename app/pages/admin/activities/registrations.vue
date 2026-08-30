<script setup lang="ts">
import { useActivitiesStore } from "~/stores/activities";
import { useContentGateway } from "~/composables/useContentGateway";
import { localizeActivityError } from "~/utils/activity-errors";

definePageMeta({ layout: "admin" });
useHead({ title: "活动报名名单｜HSD 管理台" });
const activitiesStore = useActivitiesStore();
const gateway = useContentGateway();
if (gateway) activitiesStore.activateApiMode();
if (import.meta.client && !gateway) activitiesStore.hydrate();
const query = ref("");
const activityFilter = ref("");
const statusFilter = ref("");
const page = ref(1);
const pageSize = 50;
const serverTotal = ref(0);
const serverTotalPages = ref(1);
const notice = ref("");
const detailOpen = ref(false);
const detailLoading = ref(false);
const detailError = ref("");
const detailRegistration = ref<any>();
const detailFields = ref<any[]>([]);
const runtime = useRuntimeConfig() as { public: { apiBase: string } };
const registrations = computed(() => {
  const rows = activitiesStore.getRegistrationsForAdmin();
  if (gateway) return rows;
  return rows.filter((item) => {
  const activity = activitiesStore.getById(item.activityId);
  return (!activityFilter.value || item.activityId === activityFilter.value)
    && (!statusFilter.value || item.status === statusFilter.value)
    && (!query.value || `${item.memberName} ${item.memberId}`.toLowerCase().includes(query.value.toLowerCase()));
  });
});
const activityOptions = computed(() => activitiesStore.activities);
const statusLabels: Record<string, string> = { registered: "待审核", accepted: "已录取", rejected: "未录取", cancelled: "已取消" };

let listRequest = 0;
async function loadAdminRegistrations() {
  if (!gateway) return;
  const request = ++listRequest;
  const response = await activitiesStore.refreshAllRegistrationsFromApi(gateway, {
    ...(activityFilter.value ? { activityId: activityFilter.value } : {}),
    ...(query.value.trim() ? { search: query.value.trim() } : {}),
    ...(statusFilter.value ? { status: statusFilter.value } : {}),
    page: page.value,
    pageSize,
  });
  if (request !== listRequest || !response) return;
  serverTotal.value = response.total;
  serverTotalPages.value = Math.max(1, response.totalPages);
  if (page.value > serverTotalPages.value) page.value = serverTotalPages.value;
}

onMounted(async () => {
  if (!gateway) return;
  await activitiesStore.refreshFromApi(gateway);
  await loadAdminRegistrations();
});
watch([query, activityFilter, statusFilter], () => { page.value = 1; void loadAdminRegistrations(); });
watch(page, () => { void loadAdminRegistrations(); });

function decide(id: string, status: "accepted" | "rejected") {
  const run = async () => { try {
    if (gateway) await activitiesStore.decideRegistrationFromApi(gateway, id, status, status === "accepted" ? "审核通过" : "本次活动安排不匹配");
    else activitiesStore.decideRegistration(id, status, status === "accepted" ? "审核通过" : "本次活动安排不匹配");
    notice.value = status === "accepted" ? "报名已录取。" : "报名已标记为不录取。";
  } catch (caught) {
    notice.value = `操作失败：${localizeActivityError(caught)}`;
  } };
  void run();
}
async function openDetail(item: any) {
  detailOpen.value = true;
  detailLoading.value = true;
  detailError.value = "";
  detailRegistration.value = { ...item, templateRevisionId: item.templateRevisionId ?? "本地模板", answers: item.answers ?? {} };
  detailFields.value = [];
  try {
    if (gateway) {
      const activity = activitiesStore.getById(item.activityId);
      const [detail, form] = await Promise.all([
        gateway.registrations.detail(item.id),
        activity ? gateway.registrations.activityForm(activity.id) : Promise.resolve(undefined),
      ]);
      detailRegistration.value = detail;
      detailFields.value = form?.fields ?? [];
    }
  } catch (caught) {
    detailError.value = localizeActivityError(caught);
  } finally {
    detailLoading.value = false;
  }
}
function closeDetail() { detailOpen.value = false; }
function exportCurrent() {
  if (!activityFilter.value) { notice.value = "请先选择一个活动再导出名单。"; return; }
  if (gateway) {
    const params = new URLSearchParams();
    if (query.value.trim()) params.set("search", query.value.trim());
    if (statusFilter.value) params.set("status", statusFilter.value);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    window.location.href = `${runtime.public.apiBase.replace(/\/+$/, "")}/api/v1/admin/activities/${encodeURIComponent(activityFilter.value)}/registrations/export.csv${suffix}`;
    return;
  }
  const activity = activitiesStore.getById(activityFilter.value);
  const items = activitiesStore.getRegistrationsForAdmin(activityFilter.value);
  const cell = (value: unknown) => { const text = String(value ?? ""); const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; };
  const csv = "\uFEFF" + [["姓名", "学号", "报名状态", "报名时间"], ...items.map((item) => [item.memberName, item.memberId, statusLabels[item.status] ?? item.status, item.createdAt])].map((row) => row.map(cell).join(",")).join("\r\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = `HSD-${activity?.title ?? "activity"}-activity-roster.csv`; link.click(); URL.revokeObjectURL(link.href);
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="活动管理" title="活动报名名单" description="按活动查看报名信息并进行录取或不录取审核。活动不设候补。">
      <template #actions><NuxtLink class="button button--ghost" to="/admin/activities/registration-template">配置报名字段</NuxtLink><button class="button" type="button" @click="exportCurrent">导出当前名单</button></template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><h2>当前活动报名</h2></div><p>共 {{ gateway ? serverTotal : registrations.length }} 人 · 仅显示当前管理员权限范围</p></header>
      <p v-if="notice" role="status">{{ notice }}</p>
      <p v-if="activitiesStore.apiError" role="alert">{{ localizeActivityError(activitiesStore.apiError) }}</p>
      <p v-if="activitiesStore.apiLoading" role="status">正在加载报名名单…</p>
      <div class="admin-filters"><label>搜索报名人<input v-model="query" type="search" placeholder="姓名或学号"></label><label>活动<select v-model="activityFilter"><option value="">全部活动</option><option v-for="activity in activityOptions" :key="activity!.id" :value="activity!.id">{{ activity!.title }}</option></select></label><label>报名状态<select v-model="statusFilter"><option value="">全部状态</option><option value="registered">待审核</option><option value="accepted">已录取</option><option value="rejected">未录取</option><option value="cancelled">已取消</option></select></label></div>
      <div class="admin-table-scroll"><table aria-label="活动报名名单"><thead><tr><th>报名人</th><th>活动</th><th>状态</th><th>报名时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="item in registrations" :key="item.id" tabindex="0" @click="openDetail(item)" @keydown.enter="openDetail(item)"><td><strong>{{ item.memberName }}</strong><small>{{ item.memberId }}</small></td><td>{{ activitiesStore.getById(item.activityId)?.title }}</td><td><AdminStatusPill :status="statusLabels[item.status] ?? item.status" /></td><td>{{ item.createdAt.slice(0, 16).replace('T', ' ') }}</td><td><button type="button" class="button button--ghost" @click.stop="openDetail(item)">查看详情</button><button v-if="item.status === 'registered'" type="button" @click.stop="decide(item.id, 'accepted')">录取</button><button v-if="item.status === 'registered'" type="button" @click.stop="decide(item.id, 'rejected')">不录取</button><span v-else>{{ statusLabels[item.status] ?? item.status }}</span></td></tr><tr v-if="!registrations.length"><td colspan="5">当前筛选条件下暂无报名。</td></tr></tbody></table></div>
      <PaginationControls v-if="gateway && !activitiesStore.apiLoading" v-model="page" :page-count="serverTotalPages" label="活动报名名单分页" />
    </section>
  </div>
  <ActivityRegistrationDetailDrawer :open="detailOpen" :registration="detailRegistration" :fields="detailFields" :loading="detailLoading" :error="detailError" @close="closeDetail" />
</template>
