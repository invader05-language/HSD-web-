<script setup lang="ts">
import type { PortalCatalogItem } from "~/types/portal-content";
import { usePortalCatalog } from "~/composables/usePortalCatalog";
import { useContentGateway } from "~/composables/useContentGateway";
import { PAGE_VISUALS } from "~/data/page-visuals";

type PublicView = "all" | "activities" | "articles" | "notices";
type TimelineItem = PortalCatalogItem & { entityType: "activity" | "article" | "notice" };
type TimelineApiItem = {
  entityType: "activity" | "article" | "notice";
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  eventAt: string | null;
  available: boolean;
  media?: unknown;
  to: string;
};

const views = [
  { value: "all", label: "全部动态" },
  { value: "activities", label: "活动" },
  { value: "articles", label: "新闻" },
  { value: "notices", label: "公告" },
] as const;
const route = useRoute();
const catalog = usePortalCatalog();
const gateway = useContentGateway();
const activeView = computed<PublicView>(() => {
  const value = String(route.query.view ?? "all");
  return views.some((view) => view.value === value) ? value as PublicView : "all";
});
const pageSize = 12;
const currentPage = ref(1);
const timelineTotal = ref(0);
const timelineItems = ref<TimelineItem[]>([]);
const timelineLoading = ref(false);
const timelineError = ref<{ message: string; code: string } | null>(null);
const activeKind = computed(() => activeView.value === "activities" ? "activity" : activeView.value === "articles" ? "article" : activeView.value === "notices" ? "notice" : undefined);

function timelineDate(item: TimelineItem) {
  return item.entityType === "activity" ? item.eventAt ?? item.publishedAt : item.publishedAt;
}

function toTimelineItem(item: TimelineApiItem): TimelineItem {
  return {
    entityType: item.entityType,
    sourceId: item.slug,
    title: item.title,
    summary: item.summary ?? "",
    to: item.to,
    publishedAt: item.publishedAt ?? item.eventAt ?? "",
    ...(item.eventAt ? { eventAt: item.eventAt } : {}),
    ...(item.media && typeof item.media === "object" ? { media: item.media as TimelineItem["media"] } : {}),
    available: item.available,
    eligibleSlots: [],
  };
}

const localTimeline = computed<TimelineItem[]>(() => catalog
  .filter((item): item is TimelineItem => item.available && ["activity", "article", "notice"].includes(item.entityType))
  .filter((item) => activeView.value === "all"
    || (activeView.value === "activities" && item.entityType === "activity")
    || (activeView.value === "articles" && item.entityType === "article")
    || (activeView.value === "notices" && item.entityType === "notice"))
  .sort((left, right) => Date.parse(timelineDate(right)) - Date.parse(timelineDate(left))));
const pageCount = computed(() => Math.max(1, Math.ceil((gateway ? timelineTotal.value : localTimeline.value.length) / pageSize)));
const timeline = computed(() => gateway ? timelineItems.value : localTimeline.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize));

async function loadTimeline() {
  if (!gateway) return;
  timelineLoading.value = true;
  timelineError.value = null;
  try {
    const response = await gateway.timeline.listPublic({ page: currentPage.value, pageSize, ...(activeKind.value ? { kind: activeKind.value } : {}) });
    timelineTotal.value = response.total ?? response.items.length;
    timelineItems.value = (response.items as TimelineApiItem[]).map(toTimelineItem);
  } catch (error) {
    const value = error as { message?: string; code?: string };
    timelineItems.value = [];
    timelineTotal.value = 0;
    timelineError.value = { message: value.message ?? "公开动态加载失败", code: value.code ?? "PUBLIC_TIMELINE_REQUEST_FAILED" };
  } finally {
    timelineLoading.value = false;
  }
}

watch(activeView, () => {
  currentPage.value = 1;
  void loadTimeline();
});
if (gateway) {
  await useAsyncData("public-timeline-page-1", async () => {
    await loadTimeline();
    return { items: timelineItems.value, total: timelineTotal.value };
  });
}

async function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
  await loadTimeline();
  await nextTick();
  document.querySelector(".activity-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

useHead({ title: "动态与活动｜白云 HSD 开发者部落" });
</script>

<template>
  <div>
    <PageBanner
      eyebrow="动态与活动"
      title="动态与活动"
      description="汇集联盟新闻、公开公告与近期活动，持续了解部落动态与活动安排。"
      tone="warm"
      media-label="动态与活动视觉位"
      :visual="PAGE_VISUALS.activities"
    />
    <section class="section">
      <div class="shell">
        <p v-if="timelineError" role="alert">{{ timelineError.message }}（{{ timelineError.code }}）</p>
        <p v-if="timelineLoading" role="status">正在加载公开动态…</p>
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
        <PaginationControls
          :model-value="currentPage"
          :page-count="pageCount"
          label="动态分页"
          @update:model-value="goToPage"
        />
      </div>
    </section>
  </div>
</template>
