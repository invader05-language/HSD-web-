<script setup lang="ts">
import { useProjectsStore } from "~/stores/projects";
import { useContentGateway } from "~/composables/useContentGateway";
import { projectCategoryLabel, type ManagedProject } from "~/types/project";

const route = useRoute();
const projectsStore = useProjectsStore();
const gateway = useContentGateway();
const slug = String(route.params.slug);
const ssrProject = ref<ManagedProject | undefined>();
if (gateway) {
  projectsStore.activateApiMode(false);
  const { data: detailData } = await useAsyncData(`public-project-${slug}`, () => projectsStore.refreshPublicDetailFromApi(gateway, slug));
  ssrProject.value = detailData.value;
  // The app uses a small custom Pinia plugin rather than @pinia/nuxt, so the
  // store itself is not serialized into the browser during SSR hydration.
  // Keep the public snapshot from useAsyncData as a rendering fallback.
  const project = computed(() => projectsStore.getPublicBySlug(slug) ?? detailData.value?.publishedSnapshot);
  if (!gateway && !project.value) {
    throw createError({ statusCode: 404, statusMessage: "项目不存在" });
  }
  useHead(() => ({ title: `${project.value?.title}｜项目成果` }));
} else if (import.meta.client) projectsStore.hydrate();
const project = computed(() => projectsStore.getPublicBySlug(slug) ?? ssrProject.value?.publishedSnapshot);
</script>

<template>
  <div v-if="project">
    <PageBanner
      :eyebrow="`Featured Project · ${project.year}`"
      :title="project.title"
      :description="project.description"
      tone="dark"
      :media-label="`${project.title} 演示视频封面`"
      :media="project.cover ?? undefined"
      media-fit="contain"
      media-preview="full"
    />
    <section class="section section--cool">
      <div class="shell detail-layout">
        <article class="detail-main">
          <p class="eyebrow">从问题到交付</p>
          <h2>从问题到落地</h2>
          <h3>我们观察到的问题</h3>
          <p>{{ project.challenge }}</p>
          <div v-if="project.details.length" class="project-detail-media" aria-label="项目详情素材">
            <ContentMediaView v-for="item in project.details" :key="item.id" :item="item" fit="contain" preview="full" controls />
          </div>
          <h3>解决方案</h3>
          <p>{{ project.solution }}</p>
          <h3>项目阶段</h3>
          <p>当前状态为“{{ project.projectStage }}”。后续将继续补充真实用户反馈、赛事记录和迭代说明。</p>
        </article>
        <aside class="detail-aside">
          <h2>项目信息</h2>
          <dl>
            <div><dt>项目分类</dt><dd>{{ projectCategoryLabel(project.category) }}</dd></div>
            <div><dt>当前状态</dt><dd>{{ project.projectStage }}</dd></div>
          </dl>
          <section v-if="project.members.length" class="project-members" aria-label="项目成员">
            <h3>项目成员</h3>
            <ul><li v-for="member in project.members" :key="member.name">{{ member.name }}</li></ul>
          </section>
        </aside>
      </div>
    </section>
  </div>

  <section v-else class="section section--cool">
    <div class="shell">
      <p v-if="projectsStore.apiLoading" role="status">正在加载项目…</p>
      <p v-else-if="projectsStore.apiError && projectsStore.apiError.status !== 404" role="alert">{{ projectsStore.apiError.message }}（{{ projectsStore.apiError.code }}）</p>
      <EmptyState
        v-else
        title="项目不存在"
        description="该项目可能尚未发布，或已被下线。"
      >
        <template #action><NuxtLink class="button" to="/projects">返回项目成果</NuxtLink></template>
      </EmptyState>
    </div>
  </section>
</template>
