<script setup lang="ts">
import { ADMIN_ACTIVITY_RECORDS } from "~/data/admin-content";

definePageMeta({ layout: "admin" });
useHead({ title: "活动管理｜HSD 管理台" });
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
    <section class="admin-context-grid admin-context-grid--activities">
      <article v-for="activity in ADMIN_ACTIVITY_RECORDS" :key="activity.id">
        <span>{{ activity.schedule }}</span><h2>{{ activity.title }}</h2><p>报名截止 {{ activity.deadline }}</p>
        <div class="admin-capacity"><i :style="{ width: `${Math.min(100, activity.registrations / activity.capacity * 100)}%` }" /></div>
        <footer><strong>{{ activity.registrations }} / {{ activity.capacity }} 人</strong><NuxtLink to="/admin/activities/registrations">查看报名名单 →</NuxtLink></footer>
      </article>
    </section>
  </div>
</template>
