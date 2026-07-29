<script setup lang="ts">
import { PROJECT_DETAILS, PROJECT_FILTERS } from "~/data/projects";

useHead({ title: "项目成果｜白云 HSD 开发者部落" });

const activeFilter = ref("全部");
const visibleProjects = computed(() => {
  if (activeFilter.value === "全部") return PROJECT_DETAILS;
  return PROJECT_DETAILS.filter((project) => project.category.includes(activeFilter.value));
});
</script>

<template>
  <div>
    <PageBanner
      eyebrow="Project Showcase"
      title="把问题变成可验证的解决方案"
      description="项目从真实校园问题出发，经过需求研究、技术验证、跨中心协作与持续迭代，形成可演示、可复盘的成果。"
      tone="dark"
      media-label="精选项目网格舞台"
    />
    <section class="section section--cool">
      <div class="shell">
        <FilterToolbar v-model="activeFilter" :filters="PROJECT_FILTERS" :result-label="`共 ${visibleProjects.length} 个项目`" />
        <div v-if="visibleProjects.length" class="catalog-grid">
          <NuxtLink v-for="project in visibleProjects" :key="project.slug" :to="`/projects/${project.slug}`" class="catalog-card">
            <MediaPlaceholder :label="`${project.title} 项目素材位`" />
            <div>
              <span>{{ project.year }} · {{ project.category }}</span>
              <h2>{{ project.title }}</h2>
              <p>{{ project.description }}</p>
              <strong>{{ project.status }} →</strong>
            </div>
          </NuxtLink>
        </div>
        <EmptyState v-else />
        <nav class="pagination" aria-label="项目分页">
          <button type="button" disabled>上一页</button><button type="button" class="is-active">1</button><button type="button" disabled>下一页</button>
        </nav>
      </div>
    </section>
  </div>
</template>

