<script setup lang="ts">
import { PROJECT_DETAILS, PROJECT_FILTERS } from "~/data/projects";

useHead({ title: "项目成果｜白云 HSD 开发者部落" });

const activeFilter = ref("全部");
const pageSize = 6;
const currentPage = ref(1);
const filteredProjects = computed(() => {
  if (activeFilter.value === "全部") return PROJECT_DETAILS;
  return PROJECT_DETAILS.filter((project) => project.category.includes(activeFilter.value));
});
const pageCount = computed(() => Math.max(1, Math.ceil(filteredProjects.value.length / pageSize)));
const visibleProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredProjects.value.slice(start, start + pageSize);
});

function resetProjectFilter() {
  activeFilter.value = "全部";
  currentPage.value = 1;
}

watch(activeFilter, () => {
  currentPage.value = 1;
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
        <FilterToolbar v-model="activeFilter" :filters="PROJECT_FILTERS" :result-label="`共 ${filteredProjects.length} 个项目`" />
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
        <section v-else class="projects-empty-state" aria-live="polite">
          <span class="projects-empty-state__count">0 个项目</span>
          <strong>该分类暂未收录项目</strong>
          <p>当前筛选范围没有可展示的成果。</p>
          <button type="button" class="text-link" @click="resetProjectFilter">查看全部项目</button>
        </section>
        <PaginationControls v-model="currentPage" :page-count="pageCount" label="项目分页" />
      </div>
    </section>
  </div>
</template>
