<script setup lang="ts">
import {
  ACTIVITIES,
  CENTERS,
  FLASH_NEWS,
  MEMBERS,
  NEWS,
  PROJECTS,
  RESOURCES,
  STATS
} from "~/data/home";
import { usePretextLayout } from "~/composables/usePretextLayout";

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
</script>

<template>
  <div class="home-page">
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
        <MediaPlaceholder label="官网主视觉素材位" detail="后续使用单独设计或授权照片" dark />
      </div>
    </section>

    <section class="flash-band" aria-labelledby="flash-heading">
      <div class="flash-band__inner shell">
        <h2 id="flash-heading">HSD 快讯</h2>
        <div class="flash-band__items">
          <NuxtLink v-for="item in FLASH_NEWS" :key="item.title" :to="item.to">
            <span class="flash-band__tag">{{ item.tag }}</span>
            <span>{{ item.title }}</span>
            <time>{{ item.date }}</time>
          </NuxtLink>
        </div>
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
        <div class="news-layout">
          <article class="news-feature">
            <MediaPlaceholder label="新闻主图素材位" detail="项目协作与活动现场" />
            <div>
              <span>{{ NEWS[0].category }} · {{ NEWS[0].date }}</span>
              <h3>{{ NEWS[0].title }}</h3>
              <p>{{ NEWS[0].summary }}</p>
              <NuxtLink class="text-link" :to="NEWS[0].to">阅读详情 →</NuxtLink>
            </div>
          </article>
          <div class="news-list">
            <NuxtLink v-for="item in NEWS.slice(1)" :key="item.title" :to="item.to">
              <span>{{ item.category }} · {{ item.date }}</span>
              <h3>{{ item.title }}</h3>
              <p>{{ item.summary }}</p>
            </NuxtLink>
          </div>
        </div>
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
        <div class="projects-layout">
          <article class="featured-project">
            <MediaPlaceholder label="智巡先锋演示素材位" detail="项目实机、流程或现场验证" dark />
            <div class="featured-project__copy">
              <span>精选项目 · {{ PROJECTS[0].category }}</span>
              <h3>{{ PROJECTS[0].title }}</h3>
              <p>{{ PROJECTS[0].description }}</p>
              <strong>{{ PROJECTS[0].achievement }}</strong>
              <NuxtLink class="button button--light" :to="`/projects/${PROJECTS[0].slug}`">查看项目详情</NuxtLink>
            </div>
          </article>
          <div class="project-list">
            <NuxtLink
              v-for="(project, index) in PROJECTS.slice(1)"
              :key="project.slug"
              :to="`/projects/${project.slug}`"
            >
              <strong>0{{ index + 1 }}</strong>
              <div>
                <span>{{ project.category }}</span>
                <h3>{{ project.title }}</h3>
                <p>{{ project.description }}</p>
              </div>
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </div>
        </div>
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
        <div class="activities-list">
          <NuxtLink v-for="activity in ACTIVITIES" :key="activity.title" :to="activity.to" class="activity-row">
            <div class="activity-date">
              <strong>{{ activity.day }}</strong>
              <span>{{ activity.month }}</span>
            </div>
            <span>{{ activity.type }}</span>
            <div>
              <h3>{{ activity.title }}</h3>
              <p>{{ activity.meta }}</p>
            </div>
            <span class="activity-row__action">查看活动 →</span>
          </NuxtLink>
        </div>
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
        <div class="gallery-grid">
          <MediaPlaceholder class="gallery-grid__lead" label="年度活动摄影精选" detail="主作品素材位" />
          <MediaPlaceholder label="校园影像" detail="摄影作品素材位" />
          <MediaPlaceholder label="活动视觉" detail="海报与品牌作品素材位" />
          <MediaPlaceholder label="人物专访" detail="访谈封面素材位" />
        </div>
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
          <p>公开学习路线与项目模板无需登录；内部课程资料会在下载时要求成员登录。</p>
          <NuxtLink class="button button--dark" to="/resources">浏览资源中心</NuxtLink>
        </div>
        <div class="resource-list">
          <NuxtLink v-for="(resource, index) in RESOURCES" :key="resource.title" :to="resource.to">
            <span>0{{ index + 1 }}</span>
            <div>
              <small>{{ resource.type }}</small>
              <h3>{{ resource.title }}</h3>
            </div>
            <strong>{{ resource.access }}</strong>
          </NuxtLink>
        </div>
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
          <NuxtLink class="button button--ghost" to="/help">报名帮助</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
