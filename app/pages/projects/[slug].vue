<script setup lang="ts">
import { findProject } from "~/data/projects";

const route = useRoute();
const project = computed(() => findProject(String(route.params.slug)));

if (!project.value) {
  throw createError({ statusCode: 404, statusMessage: "项目不存在" });
}

useHead(() => ({ title: `${project.value?.title}｜项目成果` }));
</script>

<template>
  <div v-if="project">
    <PageBanner
      :eyebrow="`Featured Project · ${project.year}`"
      :title="project.title"
      :description="project.description"
      tone="dark"
      :media-label="`${project.title} 演示视频封面`"
    />
    <section class="section section--cool">
      <div class="shell detail-layout">
        <article class="detail-main">
          <p class="eyebrow">From Problem to Delivery</p>
          <h2>从问题到落地</h2>
          <h3>我们观察到的问题</h3>
          <p>{{ project.challenge }}</p>
          <MediaPlaceholder :label="`${project.title} 场景与流程素材位`" />
          <h3>解决方案</h3>
          <p>{{ project.solution }}</p>
          <h3>项目阶段</h3>
          <p>当前状态为“{{ project.status }}”。后续将继续补充真实用户反馈、赛事记录和迭代说明。</p>
        </article>
        <aside class="detail-aside">
          <h2>项目信息</h2>
          <dl>
            <div><dt>技术方向</dt><dd>{{ project.category }}</dd></div>
            <div><dt>协作团队</dt><dd>{{ project.team }}</dd></div>
            <div><dt>当前状态</dt><dd>{{ project.status }}</dd></div>
          </dl>
          <h3>核心技术</h3>
          <ul><li v-for="item in project.technologies" :key="item">{{ item }}</li></ul>
        </aside>
      </div>
    </section>
  </div>
</template>

