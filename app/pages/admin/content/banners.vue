<script setup lang="ts">
definePageMeta({ layout: "admin" });
useHead({ title: "Banner 配置｜HSD 管理台" });
const banners = [
  { title: "鸿蒙启航，共赴星河万里", page: "官网首页", state: "已启用", ratio: "16:6" },
  { title: "四大中心，共同成长", page: "部落介绍", state: "已启用", ratio: "16:5" },
  { title: "2026 秋季招新", page: "加入我们", state: "待审核", ratio: "16:5" }
];
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Banner Management" title="Banner 配置" description="按一级页面维护桌面端主视觉、暗层文案与跳转入口，不复用需求海报作为正式素材。">
      <template #actions><button type="button" class="button">新建 Banner</button></template>
    </AdminPageHeading>
    <section class="admin-context-grid">
      <article v-for="banner in banners" :key="banner.page" class="admin-banner-card">
        <div><span>HSD VISUAL PLACEHOLDER</span><strong>{{ banner.ratio }}</strong></div>
        <h2>{{ banner.title }}</h2><p>{{ banner.page }} · <AdminStatusPill :status="banner.state" /></p>
        <button type="button">编辑视觉与文案 →</button>
      </article>
    </section>
  </div>
</template>
