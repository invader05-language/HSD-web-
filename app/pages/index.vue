<script setup lang="ts">
import {
  CENTERS,
  MEMBERS,
  STATS
} from "~/data/home";
import { usePretextLayout } from "~/composables/usePretextLayout";
import { usePublishedPortal } from "~/composables/usePublishedPortal";
import { createReleaseNoticeState } from "~/utils/admin-release-access";
import { resolvePortalAssetSource } from "~/data/portal-assets";
import { resolvePageVisual } from "~/data/page-visuals";
import ContentMediaView from "~/components/ContentMediaView.vue";

useHead({
  title: "白云 HSD 开发者部落｜让每一种创造力都有真实作品",
  meta: [
    {
      name: "description",
      content: "白云 HSD 开发者部落汇集技术研发、内容传播、活动策划与人才成长，为同学提供学习、项目、赛事和创作平台。"
    }
  ]
});

const heroDescription = "技术研发、品牌传播、活动策划与人才成长，在真实项目中协作，在实践中共同成长。";
const heroText = usePretextLayout(heroDescription, 31);
const route = useRoute();
const { notice: releaseNotice, receive: receiveReleaseNotice } = createReleaseNoticeState();
const { config, homepageSlots, warnings } = usePublishedPortal();
const flashNews = homepageSlots.flash;
const publishedNews = homepageSlots.news.filter((item) => item.entityType === "article" || item.entityType === "notice");
const publishedProjects = homepageSlots.projects;
const publishedActivities = homepageSlots.activities;
const publishedGallery = homepageSlots.gallery;
const publishedResources = homepageSlots.resources;
const emptyProjectionWarnings = warnings.filter((warning) => warning.code === "empty");
const homeVisual = computed(() => resolvePageVisual(config.visuals.home, "home"));
const homeVisualLabel = computed(() => homeVisual.value.alt || "官网主视觉素材位");
const homeVisualDetail = computed(() => homeVisual.value.supportingText || "后续使用单独设计或授权照片");
const homeVisualSource = computed(() => resolvePortalAssetSource(homeVisual.value.assetId));
const homePosterStyle = computed(() => (
  homeVisualSource.value
    ? { "--home-poster-image": `url("${homeVisualSource.value}")` }
    : undefined
));

function publicDate(value: string) {
  const date = new Date(value);
  return {
    day: String(date.getUTCDate()).padStart(2, "0"),
    month: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
  };
}

function clearReleaseNoticeQuery() {
  if (!import.meta.client) return;

  const url = new URL(window.location.href);
  url.searchParams.delete("notice");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function syncReleaseNotice(value: unknown) {
  if (receiveReleaseNotice(value)) {
    clearReleaseNoticeQuery();
  }
}

onMounted(() => {
  syncReleaseNotice(route.query.notice);
});

watch(
  () => route.query.notice,
  (notice) => syncReleaseNotice(notice)
);
</script>

<template>
  <div class="home-page">
    <p v-if="releaseNotice" class="home-release-notice shell" role="status">{{ releaseNotice }}</p>
    <p v-if="emptyProjectionWarnings.length" class="home-projection-warning shell" role="status">部分首页推荐位暂无同类型可用内容，相关位置已安全留空。</p>
    <section class="home-hero">
      <div class="home-hero__inner">
        <div class="home-hero__copy">
          <p class="eyebrow">Baiyun HSD Developer Community</p>
          <h1>鸿蒙启航<br>共赴星河万里</h1>
          <p ref="heroText" class="home-hero__description">{{ heroDescription }}</p>
          <div class="home-hero__actions">
            <NuxtLink class="button button--light" to="/about">了解部落</NuxtLink>
            <NuxtLink class="button button--ghost" to="/join">查看招新</NuxtLink>
          </div>
        </div>
        <div
          class="home-hero__stage"
          :class="{ 'home-hero__stage--layered': Boolean(homeVisualSource) && !homeVisual.media }"
          data-visual-stage="poster"
          :style="homePosterStyle"
        >
          <div v-if="homeVisualSource && !homeVisual.media" class="home-hero__stage-backdrop" aria-hidden="true" />
          <ContentMediaView
            v-if="homeVisual.media"
            :item="homeVisual.media"
            preview="thumbnail"
            :controls="false"
            class="home-hero__media home-hero__media--poster"
          />
          <MediaPlaceholder
            v-else
            :label="homeVisualLabel"
            :detail="homeVisualDetail"
            :src="homeVisualSource"
            :alt="homeVisual.alt"
            :data-asset-id="homeVisual.assetId"
            class="home-hero__media home-hero__media--poster"
            dark
          />
        </div>
      </div>
    </section>

    <section class="flash-band" aria-labelledby="flash-heading">
      <div class="flash-band__inner shell">
        <h2 id="flash-heading">HSD 快讯</h2>
        <div v-if="flashNews.length" class="flash-band__items">
          <NuxtLink v-for="item in flashNews" :key="item.sourceId" :to="item.to">
            <span class="flash-band__tag">快讯</span>
            <span>{{ item.title }}</span>
            <time :datetime="item.publishedAt">{{ item.publishedAt.slice(5, 10).replace('-', '.') }}</time>
          </NuxtLink>
        </div>
        <p v-else class="flash-band__empty" role="status">HSD 快讯 · 暂无新消息</p>
      </div>
    </section>

    <section class="stats-band" aria-label="部落核心数据">
      <div class="stats-band__grid shell">
        <div v-for="stat in STATS" :key="stat.label" class="stat-item">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </div>
    </section>

    <section class="section section--cool">
      <div class="shell">
        <div class="section-heading">
          <div>
            <p class="eyebrow">News & Updates</p>
            <h2>正在发生的事</h2>
          </div>
          <NuxtLink class="text-link" to="/activities">查看全部动态 →</NuxtLink>
        </div>
        <div v-if="publishedNews.length" class="news-layout">
          <article v-if="publishedNews[0]" class="news-feature">
            <MediaPlaceholder label="新闻主图素材位" detail="项目协作与活动现场" />
            <div>
              <span>{{ publishedNews[0].entityType === "notice" ? "公开公告" : "新闻" }} · {{ publishedNews[0].publishedAt.slice(0, 10).replaceAll('-', '.') }}</span>
              <h3>{{ publishedNews[0].title }}</h3>
              <p>{{ publishedNews[0].summary }}</p>
              <NuxtLink class="text-link" :to="publishedNews[0].to">阅读详情 →</NuxtLink>
            </div>
          </article>
          <div class="news-list">
            <NuxtLink v-for="item in publishedNews.slice(1)" :key="item.sourceId" :to="item.to">
              <span>{{ item.entityType === "notice" ? "公开公告" : "新闻" }} · {{ item.publishedAt.slice(0, 10).replaceAll('-', '.') }}</span>
              <h3>{{ item.title }}</h3>
              <p>{{ item.summary }}</p>
            </NuxtLink>
          </div>
        </div>
        <EmptyState v-else title="当前暂无动态" description="近期内容将在此更新。" />
      </div>
    </section>

    <section class="section section--warm">
      <div class="shell">
        <div class="section-heading section-heading--wide">
          <div>
            <p class="eyebrow">Four Centers</p>
            <h2>四大中心，共同完成一件事</h2>
          </div>
          <p>从研发、传播到策划与成长，每个中心都不是附属角色，而是完整协作链路的一部分。</p>
        </div>
        <div class="centers-grid">
          <NuxtLink
            v-for="center in CENTERS"
            :key="center.slug"
            class="center-card"
            :to="`/centers/${center.slug}`"
          >
            <span class="center-card__index">{{ center.index }}</span>
            <p>{{ center.role }}</p>
            <h3>{{ center.title }}</h3>
            <p>{{ center.description }}</p>
            <ul>
              <li v-for="topic in center.topics" :key="topic">{{ topic }}</li>
            </ul>
            <span class="center-card__action">查看中心详情 →</span>
          </NuxtLink>
        </div>
        <NuxtLink class="button button--dark" to="/centers">了解四大中心</NuxtLink>
      </div>
    </section>

    <section class="section projects-section">
      <div class="shell">
        <div class="section-heading section-heading--light">
          <div>
            <p class="eyebrow">Real Projects</p>
            <h2>把想法做成真实项目</h2>
          </div>
          <NuxtLink class="text-link" to="/projects">查看全部项目 →</NuxtLink>
        </div>
        <div v-if="publishedProjects.length" class="projects-layout">
          <article v-if="publishedProjects[0]" class="featured-project">
            <ContentMediaView v-if="publishedProjects[0].media" :item="publishedProjects[0].media" preview="thumbnail" :controls="false" class="featured-project__media" />
            <MediaPlaceholder v-else :label="`${publishedProjects[0].title}演示素材位`" detail="项目实机、流程或现场验证" dark />
            <div class="featured-project__copy">
              <span>精选项目 · Portal Selection</span>
              <h3>{{ publishedProjects[0].title }}</h3>
              <p>{{ publishedProjects[0].summary }}</p>
              <strong>已发布项目</strong>
              <NuxtLink class="button button--light" :to="publishedProjects[0].to">查看项目详情</NuxtLink>
            </div>
          </article>
          <div class="project-list">
            <NuxtLink
              v-for="(project, index) in publishedProjects.slice(1)"
              :key="project.sourceId"
              :to="project.to"
            >
              <strong>0{{ index + 1 }}</strong>
              <div>
                <span>精选项目</span>
                <h3>{{ project.title }}</h3>
                <p>{{ project.summary }}</p>
              </div>
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </div>
        </div>
        <EmptyState v-else title="暂无精选项目" description="项目发布并配置到首页后会显示在这里。" />
      </div>
    </section>

    <section class="section section--surface">
      <div class="shell">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Upcoming</p>
            <h2>近期活动</h2>
          </div>
          <NuxtLink class="text-link" to="/activities">活动日历 →</NuxtLink>
        </div>
        <div v-if="publishedActivities.length" class="activities-list">
          <NuxtLink v-for="activity in publishedActivities" :key="activity.sourceId" :to="activity.to" class="activity-row">
            <div class="activity-date">
              <strong>{{ publicDate(activity.eventAt ?? activity.publishedAt).day }}</strong>
              <span>{{ publicDate(activity.eventAt ?? activity.publishedAt).month }}</span>
            </div>
            <span>近期活动</span>
            <div>
              <h3>{{ activity.title }}</h3>
              <p>{{ activity.summary }}</p>
            </div>
            <span class="activity-row__action">查看活动 →</span>
          </NuxtLink>
        </div>
        <EmptyState v-else title="暂无近期活动" description="活动开放并配置到首页后会显示在这里。" />
      </div>
    </section>

    <section class="section section--cool">
      <div class="shell">
        <div class="section-heading section-heading--wide">
          <div>
            <p class="eyebrow">Media Gallery</p>
            <h2>由成员记录，也由成员创作</h2>
          </div>
          <p>摄影、海报、短视频与人物专访，共同形成部落的内容档案。</p>
        </div>
        <div v-if="publishedGallery.length" class="gallery-grid gallery-grid--portal" :class="{ 'is-single': publishedGallery.length === 1 }">
          <NuxtLink v-for="item in publishedGallery" :key="item.sourceId" class="gallery-grid__lead" :to="item.to"><ContentMediaView v-if="item.media" :item="item.media" preview="thumbnail" :controls="false" /><MediaPlaceholder v-else :label="item.title" :detail="item.summary" /><strong>{{ item.title }}</strong></NuxtLink>
        </div>
        <EmptyState v-else title="暂无媒体专题" description="画廊专题配置到首页后会显示在这里。" />
        <NuxtLink class="button button--dark" to="/gallery">进入媒体画廊</NuxtLink>
      </div>
    </section>

    <section class="section section--warm">
      <div class="shell">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Member Growth</p>
            <h2>在一次次协作里看见成长</h2>
          </div>
          <NuxtLink class="text-link" to="/about#members">认识部落成员 →</NuxtLink>
        </div>
        <div class="members-grid">
          <article v-for="member in MEMBERS" :key="member.name" class="member-story">
            <HsdAvatar :name="member.name" size="lg" />
            <p>“{{ member.quote }}”</p>
            <footer>
              <strong>{{ member.name }}</strong>
              <span>{{ member.center }} · {{ member.year }}</span>
            </footer>
          </article>
        </div>
      </div>
    </section>

    <section class="section section--surface">
      <div class="shell resources-layout">
        <div>
          <p class="eyebrow">Resources</p>
          <h2>把经验沉淀成下一次出发的起点</h2>
          <p>所有资源先进入详情页；当前文件类资源尚未接入，内部资料登录仅用于确认成员身份。</p>
          <NuxtLink class="button button--dark" to="/resources">浏览资源中心</NuxtLink>
        </div>
        <div v-if="publishedResources.length" class="resource-list">
          <NuxtLink v-for="(resource, index) in publishedResources" :key="resource.sourceId" :to="resource.to">
            <span>0{{ index + 1 }}</span>
            <div>
              <small>推荐资源</small>
              <h3>{{ resource.title }}</h3>
            </div>
            <strong>查看详情</strong>
          </NuxtLink>
        </div>
        <EmptyState v-else title="暂无推荐资源" description="资源可用并配置到首页后会显示在这里。" />
      </div>
    </section>

    <section class="recruitment-band">
      <div class="recruitment-band__inner shell">
        <div>
          <p class="eyebrow">Join Us · 2026</p>
          <h2>你的方向不必只有一种，先从一次参与开始</h2>
          <p>开发、摄影、设计、策划或组织成长，四大中心都有适合你的入口。</p>
        </div>
        <div>
          <NuxtLink class="button button--light" to="/join">查看招新与报名</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
