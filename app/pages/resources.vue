<script setup lang="ts">
import { PUBLIC_RESOURCES, resourcePrimaryAction } from "~/data/resources";

useHead({ title: "资源中心｜白云 HSD 开发者部落" });

const categories = ["全部", "学习路线", "项目模板", "活动资料", "内部课程"] as const;
const active = ref("全部");
const visible = computed(() => active.value === "全部" ? PUBLIC_RESOURCES : PUBLIC_RESOURCES.filter((item) => item.category === active.value));
const route = useRoute();
</script>

<template>
  <NuxtPage v-if="route.params.slug" />
  <div v-else>
    <PageBanner
      eyebrow="Resource Center"
      title="把方法、模板与学习路线沉淀下来"
      description="公开资源无需登录即可浏览；带有“登录后下载”标记的内部资料，会在查看下载权限时要求成员登录。"
      tone="warm"
      media-label="资源索引与文件视觉位"
    />
    <section class="section">
      <div class="shell">
        <FilterToolbar v-model="active" :filters="categories" :result-label="`共 ${visible.length} 份资源`" />
        <div v-if="visible.length" class="resource-catalog">
          <NuxtLink v-for="(item, index) in visible" :key="item.slug" :to="item.to">
            <span>0{{ index + 1 }}</span>
            <div>
              <small>{{ item.category }} · {{ item.format }}</small>
              <h2>{{ item.title }}</h2>
            </div>
            <strong>{{ resourcePrimaryAction(item) }} →</strong>
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
