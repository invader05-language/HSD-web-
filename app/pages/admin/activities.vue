<script setup lang="ts">
import { useActivitiesStore } from "~/stores/activities";
import { useContentGateway } from "~/composables/useContentGateway";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope, getRecruitmentCenterId } from "~/utils/admin-center-scope";
import { formatActivityRegistrationNotice } from "~/utils/activity-registration-notice";
import { useAdminToast } from "~/composables/useAdminToast";

definePageMeta({ layout: "admin" });
useHead({ title: "活动管理｜HSD 管理台" });

const activitiesStore = useActivitiesStore();
const gateway = useContentGateway();
if (gateway) activitiesStore.activateApiMode();
const session = useSessionStore();
const adminToast = useAdminToast();
const route = useRoute();
if (import.meta.client && !gateway) activitiesStore.hydrate();
onMounted(() => { if (gateway) void activitiesStore.refreshFromApi(gateway); });

const activityActionNotice = ref("");
const scopedActivities = computed(() => {
  if (session.adminLevel === "owner") return activitiesStore.activities;
  const centerScope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return centerScope
    ? activitiesStore.activities.filter((activity) => activity.ownerCenterId === getRecruitmentCenterId(centerScope))
    : [];
});
const registrationCount = computed(() => activitiesStore.registrations.length);
const pendingCount = computed(() => activitiesStore.registrations.filter((item) => item.status === "registered").length);
const openCount = computed(() => scopedActivities.value.filter((activity) => activity.registrationOpen && activity.publishedState === "published").length);

function toggleRegistration(activity: typeof activitiesStore.activities[number]) {
  const run = async () => {
    try {
    const saved = gateway
      ? await activitiesStore.setRegistrationOpenFromApi(gateway, activity.id, !activity.registrationOpen)
      : activitiesStore.setRegistrationOpen(activity.id, !activity.registrationOpen);
    activityActionNotice.value = formatActivityRegistrationNotice(saved.registrationOpen);
    adminToast.success(activityActionNotice.value);
  } catch (caught) {
    activityActionNotice.value = caught instanceof Error ? `操作失败：${caught.message}` : "操作失败。";
  }
  };
  void run();
}

function openRegistration(activityId: string) {
  const activity = activitiesStore.getById(activityId);
  if (activity) toggleRegistration(activity);
}
</script>

<template>
  <NuxtPage v-if="route.path !== '/admin/activities'" />
  <div v-else class="admin-recruitment-page admin-section-page">
    <p v-if="activitiesStore.apiError" role="alert">{{ activitiesStore.apiError.message }}（{{ activitiesStore.apiError.code }}）</p>
    <p v-if="activitiesStore.apiLoading" role="status">正在加载活动…</p>
    <AdminPageHeading eyebrow="活动管理" title="活动管理" description="编辑活动草稿，直接发布到用户端，并处理报名的录取或不录取结果。活动不设候补和人数上限。">
      <template #actions>
        <NuxtLink class="button button--ghost" to="/admin/activities/registrations">报名名单</NuxtLink>
        <NuxtLink class="button" to="/admin/activities/new">新建活动</NuxtLink>
      </template>
    </AdminPageHeading>

    <section class="admin-summary-strip" aria-label="活动概览">
      <div><span>活动总数</span><strong>{{ scopedActivities.length }}</strong><small>当前权限范围</small></div>
      <div><span>开放报名</span><strong>{{ openCount }}</strong><small>不限人数</small></div>
      <div><span>累计报名</span><strong>{{ registrationCount }}</strong><small>已提交报名</small></div>
      <div><span>待审核</span><strong>{{ pendingCount }}</strong><small>需要录取或不录取</small></div>
    </section>

    <section class="admin-list-card" aria-labelledby="activity-registration-control-title">
      <header>
        <div><span>活动工作区</span><h2 id="activity-registration-control-title">活动发布与报名状态</h2></div>
        <p>中心负责人仅能管理本中心活动，联盟总负责人可管理全部活动。</p>
      </header>
      <div class="admin-table-scroll">
        <table aria-label="活动发布与报名状态">
          <thead><tr><th>活动</th><th>发布状态</th><th>报名截止</th><th>报名</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>
            <tr v-for="activity in scopedActivities" :key="activity.id">
              <td><strong>{{ activity.title || "未命名活动" }}</strong><small>{{ activity.type || "未分类" }} · {{ activity.ownerCenterId }}</small></td>
              <td>{{ activity.publishedState === "published" ? "已发布" : activity.status === "unpublished" ? "已下架" : "草稿" }}</td>
              <td>{{ activity.registrationEndAt ? activity.registrationEndAt.slice(0, 10) : "未设置" }}</td>
              <td>{{ activity.registrationOpen ? "开放" : "关闭" }}</td>
              <td>
                <NuxtLink :to="`/admin/activities/${encodeURIComponent(activity.id)}`">编辑</NuxtLink>
                <button type="button" :disabled="activity.publishedState !== 'published'" @click="toggleRegistration(activity)">{{ activity.registrationOpen ? "关闭报名" : "开放报名" }}</button>
              </td>
            </tr>
            <tr v-if="!scopedActivities.length"><td colspan="5">当前权限范围内暂无活动。</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
