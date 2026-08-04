<script setup lang="ts">
import { ADMIN_ACTIVITY_RECORDS } from "~/data/admin-content";
import { useActivitiesStore } from "~/stores/activities";

definePageMeta({ layout: "admin" });
useHead({ title: "活动管理｜HSD 管理台" });
const activitiesStore = useActivitiesStore();
const activityActionNotice = ref("");
const automationEventLabel = "activity.registration.opened";

function openRegistration(activityId: string) {
  try {
    activitiesStore.openRegistration(activityId);
    activityActionNotice.value = `报名已开放，并已处理 ${automationEventLabel} 快讯草稿事件。`;
  } catch (caught) {
    activityActionNotice.value = caught instanceof Error ? `操作失败：${caught.message}` : "操作失败。";
  }
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Activities" title="活动管理" description="管理活动排期、报名容量、采集字段、取消状态与名单导出，报名数据继续保持 Mock 边界。">
      <template #actions><NuxtLink class="button button--ghost" to="/admin/activities/registrations">报名名单</NuxtLink><button type="button" class="button">新建活动</button></template>
    </AdminPageHeading>
    <section class="admin-summary-strip" aria-label="活动概览">
      <div><span>近期活动</span><strong>08</strong><small>未来 60 天</small></div>
      <div><span>开放报名</span><strong>03</strong><small>当前可提交报名</small></div>
      <div><span>累计报名</span><strong>164</strong><small>本学期 Mock 数据</small></div>
      <div><span>待审核</span><strong>01</strong><small>发布前内容检查</small></div>
    </section>
    <AdminRecordWorkspace :records="ADMIN_ACTIVITY_RECORDS" table-label="活动管理列表" item-label="活动" new-label="新建活动" :categories="['招新活动', '技术沙龙', '媒体活动']" />
    <section class="admin-list-card" aria-labelledby="activity-registration-control-title">
      <header><div><span>Registration Control</span><h2 id="activity-registration-control-title">活动报名状态</h2></div><p>开放报名成功后生成待人工审核的 HSD 快讯草稿。</p></header>
      <p v-if="activityActionNotice" role="status">{{ activityActionNotice }}</p>
      <div class="admin-table-scroll"><table aria-label="活动报名状态"><thead><tr><th>活动</th><th>报名截止</th><th>状态</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="activity in activitiesStore.activities" :key="activity.id"><td>{{ activity.title }}</td><td>{{ activity.registrationEndAt.slice(0, 10) }}</td><td>{{ activity.registrationOpen ? "报名开放" : "报名关闭" }}</td><td><button type="button" :disabled="activity.registrationOpen" @click="openRegistration(activity.id)">开放报名</button></td></tr></tbody></table></div>
    </section>
    <section class="admin-context-grid admin-context-grid--activities">
      <article v-for="activity in ADMIN_ACTIVITY_RECORDS" :key="activity.id">
        <span>{{ activity.schedule }}</span><h2>{{ activity.title }}</h2><p>报名截止 {{ activity.deadline }}</p>
        <div class="admin-capacity"><i :style="{ width: `${Math.min(100, activity.registrations / activity.capacity * 100)}%` }" /></div>
        <footer><strong>{{ activity.registrations }} / {{ activity.capacity }} 人</strong><NuxtLink to="/admin/activities/registrations">查看报名名单 →</NuxtLink></footer>
      </article>
    </section>
  </div>
</template>
