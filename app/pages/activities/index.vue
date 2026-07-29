<script setup lang="ts">
import { ACTIVITY_DETAILS, ACTIVITY_FILTERS } from "~/data/activities";

useHead({ title: "活动中心｜白云 HSD 开发者部落" });

const activeFilter = ref("全部");
const visibleActivities = computed(() => {
  if (activeFilter.value === "全部") return ACTIVITY_DETAILS;
  return ACTIVITY_DETAILS.filter((activity) => activity.type === activeFilter.value);
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
        <FilterToolbar v-model="activeFilter" :filters="ACTIVITY_FILTERS" :result-label="`共 ${visibleActivities.length} 场活动`" />
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
        <nav class="pagination" aria-label="活动分页">
          <button type="button" disabled>上一页</button><button type="button" class="is-active">1</button><button type="button" disabled>下一页</button>
        </nav>
      </div>
    </section>
  </div>
</template>

