<script setup lang="ts">
useHead({ title: "媒体画廊｜白云 HSD 开发者部落" });

const categories = ["全部", "活动摄影", "海报设计", "短视频", "人物专访"] as const;
const active = ref("全部");
const works = [
  { title: "年度活动影像记录", category: "活动摄影", year: "2026" },
  { title: "程序员节视觉提案", category: "海报设计", year: "2026" },
  { title: "项目路演幕后", category: "短视频", year: "2026" },
  { title: "成员成长访谈", category: "人物专访", year: "2025" },
  { title: "技术沙龙现场", category: "活动摄影", year: "2025" },
  { title: "招新品牌视觉", category: "海报设计", year: "2025" }
];
const visible = computed(() => active.value === "全部" ? works : works.filter((work) => work.category === active.value));
</script>

<template>
  <div>
    <PageBanner
      eyebrow="Media Gallery"
      title="把活动、人物与创作留在画面里"
      description="这里呈现新媒体中心与成员共同完成的摄影、设计、视频和人物内容。正式素材到位后会替换当前素材位。"
      tone="dark"
      media-label="编辑部式作品拼贴素材位"
    />
    <section class="section section--cool">
      <div class="shell">
        <FilterToolbar v-model="active" :filters="categories" :result-label="`共 ${visible.length} 件作品`" />
        <div v-if="visible.length" class="gallery-catalog">
          <article v-for="(work, index) in visible" :key="work.title" :class="{ 'is-featured': index === 0 }">
            <MediaPlaceholder :label="work.title" :detail="`${work.category} · ${work.year}`" />
            <div><span>{{ work.category }}</span><h2>{{ work.title }}</h2></div>
          </article>
        </div>
        <EmptyState v-else />
        <nav class="pagination" aria-label="媒体作品分页">
          <button type="button" disabled>上一页</button><button type="button" class="is-active">1</button><button type="button">2</button><button type="button">下一页</button>
        </nav>
      </div>
    </section>
  </div>
</template>

