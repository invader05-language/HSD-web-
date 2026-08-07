<script setup lang="ts">
import { useProjectsStore } from "~/stores/projects";

definePageMeta({ layout: "admin" });
useHead({ title: "项目管理｜HSD 管理台" });

const projectsStore = useProjectsStore();
const route = useRoute();
if (import.meta.client) projectsStore.hydrate();
const projects = computed(() => projectsStore.getManageableProjects());
const publishedCount = computed(() => projects.value.filter((project) => project.publicationStatus === "published").length);
const draftCount = computed(() => projects.value.filter((project) => project.publicationStatus === "draft").length);
const mediaCount = computed(() => projects.value.reduce((total, project) => total + (project.cover ? 1 : 0) + project.details.length, 0));

function status(project: typeof projects.value[number]) {
  if (project.publicationStatus === "published") return "已发布";
  if (project.publicationStatus === "unpublished") return "已下架";
  return "草稿";
}
</script>

<template>
  <NuxtPage v-if="route.path !== '/admin/projects'" />
  <div v-else class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Projects" title="项目管理" description="项目在独立编辑页维护基础信息、封面和成果素材，发布后才进入用户端项目成果与首页槽位。">
      <template #actions><NuxtLink class="button" to="/admin/projects/new">新建项目</NuxtLink></template>
    </AdminPageHeading>
    <section class="admin-summary-strip" aria-label="项目概览">
      <div><span>全部项目</span><strong>{{ projects.length }}</strong><small>当前权限范围</small></div>
      <div><span>已发布</span><strong>{{ publishedCount }}</strong><small>用户端可见</small></div>
      <div><span>草稿</span><strong>{{ draftCount }}</strong><small>待补齐后发布</small></div>
      <div><span>关联素材</span><strong>{{ mediaCount }}</strong><small>封面与详情素材</small></div>
    </section>
    <section class="admin-list-card" role="table" aria-label="项目管理列表">
      <header><div><span>PROJECT WORKSPACE</span><h2>项目发布与素材状态</h2></div><p>草稿素材仅在当前编辑页可见，重新发布后才替换公开快照。</p></header>
      <div v-if="projects.length" class="admin-project-list">
        <article v-for="project in projects" :key="project.id" class="admin-project-list__item">
          <div>
            <span>{{ project.category }} · {{ project.year }}</span>
            <h3>{{ project.title }}</h3>
            <p>{{ project.description }}</p>
          </div>
          <dl><div><dt>发布状态</dt><dd>{{ status(project) }}</dd></div><div><dt>项目阶段</dt><dd>{{ project.projectStage }}</dd></div><div><dt>素材</dt><dd>{{ (project.cover ? 1 : 0) + project.details.length }} 项</dd></div></dl>
          <NuxtLink class="button button--ghost" :to="`/admin/projects/${encodeURIComponent(project.id)}`">编辑项目</NuxtLink>
        </article>
      </div>
      <div v-else class="admin-empty"><strong>暂无可管理项目</strong><p>创建项目后可以在独立编辑页上传封面和详情素材。</p><NuxtLink class="button" to="/admin/projects/new">新建项目</NuxtLink></div>
    </section>
  </div>
</template>
