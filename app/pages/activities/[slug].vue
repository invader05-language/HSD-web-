<script setup lang="ts">
import { findActivity } from "~/data/activities";
import { buildLoginTarget } from "~/utils/login-continuation";

const route = useRoute();
const activity = computed(() => findActivity(String(route.params.slug)));

if (!activity.value) {
  throw createError({ statusCode: 404, statusMessage: "活动不存在" });
}

const signupTarget = computed(() => buildLoginTarget(`${route.path}?signup=1`));
useHead(() => ({ title: `${activity.value?.title}｜活动中心` }));
</script>

<template>
  <div v-if="activity">
    <PageBanner
      :eyebrow="`${activity.type} · ${activity.date}`"
      :title="activity.title"
      :description="activity.summary"
      tone="red"
      media-label="活动现场或主题视觉素材位"
    >
      <template #actions>
        <NuxtLink class="button button--light" :to="signupTarget">登录后报名</NuxtLink>
      </template>
    </PageBanner>
    <section class="section section--cool">
      <div class="shell detail-layout">
        <article class="detail-main">
          <p class="eyebrow">Activity Brief</p>
          <h2>活动介绍</h2>
          <h3>适合谁参加</h3>
          <p>{{ activity.audience }}</p>
          <h3>活动流程</h3>
          <ol class="agenda-list">
            <li v-for="(item, index) in activity.agenda" :key="item"><span>0{{ index + 1 }}</span>{{ item }}</li>
          </ol>
          <MediaPlaceholder label="活动内容预览素材位" detail="现场、讲师或往期活动素材" />
        </article>
        <aside class="detail-aside detail-aside--sticky">
          <h2>报名信息</h2>
          <dl>
            <div><dt>日期</dt><dd>{{ activity.date }}</dd></div>
            <div><dt>时间</dt><dd>{{ activity.time }}</dd></div>
            <div><dt>地点</dt><dd>{{ activity.location }}</dd></div>
            <div><dt>名额</dt><dd>{{ activity.capacity }}</dd></div>
            <div><dt>状态</dt><dd>{{ activity.status }}</dd></div>
          </dl>
          <NuxtLink class="button" :to="signupTarget">登录后提交报名</NuxtLink>
          <p>浏览活动详情无需登录，只有提交或取消报名属于个人操作。</p>
        </aside>
      </div>
    </section>
  </div>
</template>
