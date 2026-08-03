<script setup lang="ts">
import { ACTIVITY_DETAILS, ACTIVITY_FILTERS } from "~/data/activities";

useHead({ title: "活动中心｜白云 HSD 开发者部落" });

const activeFilter = ref("全部");
const pageSize = 6;
const currentPage = ref(1);
const filteredActivities = computed(() => {
  if (activeFilter.value === "全部") return ACTIVITY_DETAILS;
  return ACTIVITY_DETAILS.filter((activity) => activity.type === activeFilter.value);
});
const pageCount = computed(() => Math.max(1, Math.ceil(filteredActivities.value.length / pageSize)));
const visibleActivities = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredActivities.value.slice(start, start + pageSize);
});

watch(activeFilter, () => {
  currentPage.value = 1;
});
</script>

<template>
  <div>
    <PageBanner
      eyebrow="Activities"
      title="下一场活动，从这里开始"
      description="技术沙龙、项目实训、摄影创作和赛事协作对所有同学公开浏览；提交报名时再登录。"
      tone="warm"
      media-label="近期活动日期视觉位"
    />
    <section class="section">
      <div class="shell">
        <FilterToolbar v-model="activeFilter" :filters="ACTIVITY_FILTERS" :result-label="`共 ${filteredActivities.length} 场活动`" />
        <div v-if="visibleActivities.length" class="activity-catalog">
          <NuxtLink v-for="activity in visibleActivities" :key="activity.slug" :to="`/activities/${activity.slug}`">
            <time :datetime="activity.date">{{ activity.date.slice(5).replace('-', '.') }}</time>
            <div>
              <span>{{ activity.type }} · {{ activity.status }}</span>
              <h2>{{ activity.title }}</h2>
              <p>{{ activity.summary }}</p>
            </div>
            <strong>{{ activity.location }} →</strong>
          </NuxtLink>
        </div>
        <EmptyState v-else />
        <PaginationControls v-model="currentPage" :page-count="pageCount" label="活动分页" />
      </div>
    </section>
  </div>
</template>

