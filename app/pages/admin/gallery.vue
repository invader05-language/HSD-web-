<script setup lang="ts">
definePageMeta({ layout: "admin" });
useHead({ title: "画廊专题｜HSD 管理台" });
const albums = [
  { title: "我们的 2026 夏日", count: 24, state: "已发布", cover: "#8d2330" },
  { title: "鸿蒙技术沙龙现场", count: 36, state: "待审核", cover: "#3f4e58" },
  { title: "校园秋日摄影采风", count: 18, state: "草稿", cover: "#806648" }
];
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Gallery Stories" title="画廊专题" description="从素材库选择已审核图片组成专题；用户端采用大图瀑布流与灯箱，不把图片嵌入额外灰色框。">
      <template #actions><button type="button" class="button">新建画廊专题</button></template>
    </AdminPageHeading>
    <section class="admin-gallery-admin-grid">
      <article v-for="album in albums" :key="album.title"><div :style="{ '--gallery-cover': album.cover }"><span>&lt; HSD GALLERY &gt;</span><AdminStatusPill :status="album.state" /><h2>{{ album.title }}</h2><p>{{ album.count }} 张已选素材</p></div><footer><span>封面暗层与文字预览</span><button type="button">编辑专题 →</button></footer></article>
    </section>
  </div>
</template>
