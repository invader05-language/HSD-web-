<script setup lang="ts">
import { useProjectsStore } from "~/stores/projects";
import ProjectEditor from "~/components/admin/ProjectEditor.vue";

definePageMeta({ layout: "admin" });

const route = useRoute();
const projectsStore = useProjectsStore();
const projectId = computed(() => decodeURIComponent(String(route.params.id)));
if (import.meta.client) projectsStore.hydrate();
const sourceProject = computed(() => projectsStore.getById(projectId.value));
const canEdit = computed(() => Boolean(sourceProject.value && projectsStore.canManageProject(projectId.value)));
const project = computed(() => canEdit.value ? sourceProject.value : undefined);
const savedNotice = computed(() => route.query.saved === "1" ? "项目草稿已保存，发布前的编辑不会影响用户端。" : undefined);

watchEffect(() => {
  if (import.meta.client && sourceProject.value && !canEdit.value) {
    void navigateTo(`/admin/forbidden?from=${encodeURIComponent(route.fullPath)}`, { replace: true });
  }
});

useHead(() => ({ title: `${project.value?.title || "编辑项目"}｜HSD 管理台` }));

function onPublished() {
  void navigateTo("/admin/projects");
}

function onCancelled() {
  void navigateTo("/admin/projects");
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Projects"
      :title="project?.title || (sourceProject ? '编辑项目' : '项目不存在')"
      :description="project ? '编辑工作版本不会提前覆盖当前公开项目。' : '该项目不存在，或当前管理员无权访问。'"
    >
      <template #actions>
        <NuxtLink v-if="project?.publishedSnapshot" class="button button--ghost" :to="`/projects/${encodeURIComponent(project.slug)}`" target="_blank">预览用户端</NuxtLink>
        <NuxtLink class="button button--ghost" to="/admin/projects">返回项目管理</NuxtLink>
      </template>
    </AdminPageHeading>
    <ProjectEditor v-if="project" mode="edit" :project="project" :initial-notice="savedNotice" @published="onPublished" @cancelled="onCancelled" />
    <section v-else class="admin-list-card admin-empty" aria-live="polite"><strong>找不到项目</strong><p>请返回项目列表重新选择，或确认当前账号具有对应中心的管理权限。</p><NuxtLink class="button" to="/admin/projects">返回项目管理</NuxtLink></section>
  </div>
</template>
