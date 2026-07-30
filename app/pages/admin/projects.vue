<script setup lang="ts">
import { ADMIN_PROJECT_RECORDS } from "~/data/admin-content";

definePageMeta({ layout: "admin" });
useHead({ title: "项目管理｜HSD 管理台" });
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Projects" title="项目管理" description="统一维护项目成员、跨中心协作、媒体资产、竞赛成果与官网推荐状态。">
      <template #actions><button type="button" class="button">新建项目</button></template>
    </AdminPageHeading>
    <section class="admin-summary-strip" aria-label="项目概览">
      <div><span>全部项目</span><strong>12</strong><small>含 3 条原型样例</small></div>
      <div><span>进行中</span><strong>07</strong><small>跨中心项目 4 个</small></div>
      <div><span>待审核</span><strong>02</strong><small>成果与公开资料</small></div>
      <div><span>首页推荐</span><strong>04</strong><small>达到固定槽位上限</small></div>
    </section>
    <AdminRecordWorkspace :records="ADMIN_PROJECT_RECORDS" table-label="项目管理列表" item-label="项目" new-label="新建项目" :categories="['科创竞赛', '校园服务', '媒体创作']" />
    <section class="admin-context-grid">
      <article v-for="project in ADMIN_PROJECT_RECORDS" :key="project.id">
        <span>{{ project.category }}</span><h2>{{ project.title }}</h2><p>{{ project.centers.join(" · ") }}</p>
        <dl><div><dt>项目成员</dt><dd>{{ project.members }} 人</dd></div><div><dt>媒体资产</dt><dd>{{ project.assets }} 项</dd></div><div><dt>当前成果</dt><dd>{{ project.result }}</dd></div></dl>
      </article>
    </section>
  </div>
</template>
