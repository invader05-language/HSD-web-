<script setup lang="ts">
import type { PortalCatalogItem } from "~/types/portal-content";
import { usePortalCatalog } from "~/composables/usePortalCatalog";
import { PAGE_VISUALS } from "~/data/page-visuals";

type PublicView = "all" | "activities" | "articles" | "notices";
type TimelineItem = PortalCatalogItem & { entityType: "activity" | "article" | "notice" };

const views = [
  { value: "all", label: "全部动态" },
  { value: "activities", label: "活动" },
  { value: "articles", label: "新闻" },
  { value: "notices", label: "公告" },
] as const;
const route = useRoute();
const catalog = usePortalCatalog();
function timelineDate(item: TimelineItem) {
  return item.entityType === "activity" ? item.eventAt ?? item.publishedAt : item.publishedAt;
}
const activeView = computed<PublicView>(() => {
  const value = String(route.query.view ?? "all");
  return views.some((view) => view.value === value) ? value as PublicView : "all";
});
const timeline = computed<TimelineItem[]>(() => catalog
  .filter((item): item is TimelineItem => item.available && ["activity", "article", "notice"].includes(item.entityType))
  .filter((item) => activeView.value === "all"
    || (activeView.value === "activities" && item.entityType === "activity")
    || (activeView.value === "articles" && item.entityType === "article")
    || (activeView.value === "notices" && item.entityType === "notice"))
  .sort((left, right) => Date.parse(timelineDate(right)) - Date.parse(timelineDate(left))));

useHead({ title: "动态与活动｜白云 HSD 开发者部落" });
</script>

<template>
  <div>
    <PageBanner
      eyebrow="Updates & Activities"
      title="动态与活动"
      description="查看公开新闻、公告与近期活动；活动详情无需登录，提交报名时再验证成员身份。"
      tone="warm"
      media-label="动态与活动视觉位"
      :visual="PAGE_VISUALS.activities"
    />
    <section class="section">
      <div class="shell">
        <nav class="filter-toolbar" aria-label="动态类型">
          <div class="filter-toolbar__options">
            <NuxtLink
              v-for="view in views"
              :key="view.value"
              :to="{ path: '/activities', query: { view: view.value } }"
              :class="{ 'is-active': activeView === view.value }"
              :aria-current="activeView === view.value ? 'page' : undefined"
            >
              {{ view.label }}
            </NuxtLink>
          </div>
          <span>共 {{ timeline.length }} 条公开内容</span>
        </nav>
        <div v-if="timeline.length" class="activity-catalog">
          <NuxtLink
            v-for="item in timeline"
            :key="`${item.entityType}:${item.sourceId}`"
            :to="item.to"
            data-testid="public-timeline-item"
          >
            <time :datetime="timelineDate(item)">{{ timelineDate(item).slice(0, 10).replaceAll('-', '.') }}</time>
            <ContentMediaView v-if="item.entityType === 'activity' && item.media" :item="item.media" preview="thumbnail" :controls="false" />
            <div>
              <span>{{ item.entityType === "activity" ? "活动" : item.entityType === "article" ? "新闻" : "公开公告" }}</span>
              <h2>{{ item.title }}</h2>
              <p>{{ item.summary }}</p>
            </div>
            <strong>{{ item.entityType === "activity" ? "查看活动" : "阅读详情" }} →</strong>
          </NuxtLink>
        </div>
        <EmptyState v-else title="暂无已发布内容" description="当前分类还没有可公开浏览的动态或活动。" />
      </div>
    </section>
  </div>
</template>
