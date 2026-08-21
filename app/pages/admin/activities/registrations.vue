<script setup lang="ts">
import { useActivitiesStore } from "~/stores/activities";
import { useContentGateway } from "~/composables/useContentGateway";

definePageMeta({ layout: "admin" });
useHead({ title: "活动报名名单｜HSD 管理台" });
const activitiesStore = useActivitiesStore();
const gateway = useContentGateway();
if (gateway) activitiesStore.activateApiMode();
if (import.meta.client && !gateway) activitiesStore.hydrate();
onMounted(async () => {
  if (!gateway) return;
  await activitiesStore.refreshFromApi(gateway);
  await Promise.all(activitiesStore.activities.map((activity) => activitiesStore.refreshRegistrationsFromApi(gateway, activity.id)));
});
const query = ref("");
const activityFilter = ref("");
const statusFilter = ref("");
const notice = ref("");
const registrations = computed(() => activitiesStore.getRegistrationsForAdmin().filter((item) => {
  const activity = activitiesStore.getById(item.activityId);
  return (!activityFilter.value || item.activityId === activityFilter.value)
    && (!statusFilter.value || item.status === statusFilter.value)
    && (!query.value || `${item.memberName} ${item.memberId}`.toLowerCase().includes(query.value.toLowerCase()));
}));
const activityOptions = computed(() => {
  const unique = new Map<string, NonNullable<ReturnType<typeof activitiesStore.getById>>>();
  for (const registration of activitiesStore.getRegistrationsForAdmin()) {
    const activity = activitiesStore.getById(registration.activityId);
    if (activity) unique.set(activity.id, activity);
  }
  return [...unique.values()];
});
const statusLabels: Record<string, string> = { registered: "待审核", accepted: "已录取", rejected: "未录取", cancelled: "已取消" };

function decide(id: string, status: "accepted" | "rejected") {
  const run = async () => { try {
    if (gateway) await activitiesStore.decideRegistrationFromApi(gateway, id, status, status === "accepted" ? "审核通过" : "本次活动安排不匹配");
    else activitiesStore.decideRegistration(id, status, status === "accepted" ? "审核通过" : "本次活动安排不匹配");
    notice.value = status === "accepted" ? "报名已录取。" : "报名已标记为不录取。";
  } catch (caught) {
    notice.value = caught instanceof Error ? `操作失败：${caught.message}` : "操作失败。";
  } };
  void run();
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Registrations" title="活动报名名单" description="按活动查看报名信息并进行录取或不录取审核。活动不设候补。">
      <template #actions><button class="button button--ghost" type="button">配置报名字段</button><button class="button" type="button">导出当前名单</button></template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><span>Registration Records</span><h2>当前活动报名</h2></div><p>共 {{ registrations.length }} 人 · 仅显示当前管理员权限范围</p></header>
      <p v-if="notice" role="status">{{ notice }}</p>
      <p v-if="activitiesStore.apiError" role="alert">{{ activitiesStore.apiError.message }}（{{ activitiesStore.apiError.code }}）</p>
      <p v-if="activitiesStore.apiLoading" role="status">正在加载报名名单…</p>
      <div class="admin-filters"><label>搜索报名人<input v-model="query" type="search" placeholder="姓名或学号"></label><label>活动<select v-model="activityFilter"><option value="">全部活动</option><option v-for="activity in activityOptions" :key="activity!.id" :value="activity!.id">{{ activity!.title }}</option></select></label><label>报名状态<select v-model="statusFilter"><option value="">全部状态</option><option value="registered">待审核</option><option value="accepted">已录取</option><option value="rejected">未录取</option><option value="cancelled">已取消</option></select></label></div>
      <div class="admin-table-scroll"><table aria-label="活动报名名单"><thead><tr><th>报名人</th><th>活动</th><th>状态</th><th>报名时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="item in registrations" :key="item.id"><td><strong>{{ item.memberName }}</strong><small>{{ item.memberId }}</small></td><td>{{ activitiesStore.getById(item.activityId)?.title }}</td><td><AdminStatusPill :status="statusLabels[item.status] ?? item.status" /></td><td>{{ item.createdAt.slice(0, 16).replace('T', ' ') }}</td><td><button v-if="item.status === 'registered'" type="button" @click="decide(item.id, 'accepted')">录取</button><button v-if="item.status === 'registered'" type="button" @click="decide(item.id, 'rejected')">不录取</button><span v-else>{{ statusLabels[item.status] ?? item.status }}</span></td></tr><tr v-if="!registrations.length"><td colspan="5">当前筛选条件下暂无报名。</td></tr></tbody></table></div>
    </section>
  </div>
</template>
