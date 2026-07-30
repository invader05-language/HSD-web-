<script setup lang="ts">
import { ADMIN_UPLOAD_TASKS } from "~/data/admin-assets";
definePageMeta({ layout: "admin" });
useHead({ title: "上传任务｜HSD 管理台" });
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Upload Tasks" title="上传任务" description="跟踪大文件分片上传、异步处理、人工审核与失败重试，避免用户离开页面后失去任务状态。">
      <template #actions><NuxtLink class="button" to="/admin/media">上传新素材</NuxtLink></template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><span>Upload Queue</span><h2>当前上传与处理任务</h2></div><p>{{ ADMIN_UPLOAD_TASKS.length }} 个 Mock 任务</p></header>
      <div class="admin-upload-list admin-upload-list--page"><article v-for="task in ADMIN_UPLOAD_TASKS" :key="task.id"><div><strong>{{ task.name }}</strong><small>{{ task.type }} · {{ task.note }}</small></div><AdminStatusPill :status="task.status" /><span><i :style="{ width: `${task.progress}%` }" /></span><b>{{ task.progress }}%</b></article></div>
    </section>
  </div>
</template>
