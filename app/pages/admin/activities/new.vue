<script setup lang="ts">
import ActivityEditor from "~/components/admin/ActivityEditor.vue";

definePageMeta({ layout: "admin" });
useHead({ title: "新建活动｜HSD 管理台" });

function onSaved(id: string) {
  void navigateTo(`/admin/activities/${encodeURIComponent(id)}?saved=1`);
}

function onPublished() {
  void navigateTo("/admin/activities");
}

function onCancelled() {
  void navigateTo("/admin/activities");
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Activities" title="新建活动" description="先保存草稿，再在信息完整后直接发布到用户端。活动不设候补和人数上限。">
      <template #actions><NuxtLink class="button button--ghost" to="/admin/activities">返回活动管理</NuxtLink></template>
    </AdminPageHeading>
    <ActivityEditor mode="create" @saved="onSaved" @published="onPublished" @cancelled="onCancelled" />
  </div>
</template>
