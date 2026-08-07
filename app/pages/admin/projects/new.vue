<script setup lang="ts">
import ProjectEditor from "~/components/admin/ProjectEditor.vue";

definePageMeta({ layout: "admin" });
useHead({ title: "新建项目｜HSD 管理台" });

function onSaved(id: string) {
  void navigateTo(`/admin/projects/${encodeURIComponent(id)}?saved=1`);
}

function onPublished() {
  void navigateTo("/admin/projects");
}

function onCancelled() {
  void navigateTo("/admin/projects");
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Projects" title="新建项目" description="保存草稿后继续上传和审阅素材，信息完整后直接发布到项目成果。">
      <template #actions><NuxtLink class="button button--ghost" to="/admin/projects">返回项目管理</NuxtLink></template>
    </AdminPageHeading>
    <ProjectEditor mode="create" @saved="onSaved" @published="onPublished" @cancelled="onCancelled" />
  </div>
</template>
