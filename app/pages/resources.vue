<script setup lang="ts">
import { buildLoginTarget } from "~/utils/login-continuation";

useHead({ title: "资源中心｜白云 HSD 开发者部落" });

const categories = ["全部", "学习路线", "项目模板", "活动资料", "内部课程"] as const;
const active = ref("全部");
const resources = [
  { title: "HarmonyOS 原生开发入门清单", category: "学习路线", format: "网页", access: "公开浏览", to: "/resources#harmonyos" },
  { title: "大模型应用开发实践路径", category: "学习路线", format: "网页", access: "公开浏览", to: "/resources#aigc" },
  { title: "校园科创项目需求说明模板", category: "项目模板", format: "DOCX", access: "公开浏览", to: "/resources#prd" },
  { title: "技术沙龙组织检查表", category: "活动资料", format: "PDF", access: "公开浏览", to: "/resources#event" },
  { title: "2026 成员训练营课程包", category: "内部课程", format: "ZIP", access: "登录后下载", to: buildLoginTarget("/resources?download=training") }
];
const visible = computed(() => active.value === "全部" ? resources : resources.filter((item) => item.category === active.value));
</script>

<template>
  <div>
    <PageBanner
      eyebrow="Resource Center"
      title="把方法、模板与学习路线沉淀下来"
      description="公开资源无需登录即可浏览；带有“登录后下载”标记的内部资料，会在点击下载时要求成员登录。"
      tone="warm"
      media-label="资源索引与文件视觉位"
    />
    <section class="section">
      <div class="shell">
        <FilterToolbar v-model="active" :filters="categories" :result-label="`共 ${visible.length} 份资源`" />
        <div v-if="visible.length" class="resource-catalog">
          <NuxtLink v-for="(item, index) in visible" :key="item.title" :to="item.to">
            <span>0{{ index + 1 }}</span>
            <div><small>{{ item.category }} · {{ item.format }}</small><h2>{{ item.title }}</h2></div>
            <strong>{{ item.access }} →</strong>
          </NuxtLink>
        </div>
        <EmptyState v-else />
        <nav class="pagination" aria-label="资源分页">
          <button type="button" disabled>上一页</button><button type="button" class="is-active">1</button><button type="button" disabled>下一页</button>
        </nav>
      </div>
    </section>
  </div>
</template>

