<script setup lang="ts">
import { PUBLIC_RESOURCES, resourcePrimaryAction } from "~/data/resources";
import { PAGE_VISUALS } from "~/data/page-visuals";

useHead({ title: "资源中心｜白云 HSD 开发者部落" });

const categories = ["全部", "学习路线", "项目模板", "活动资料", "内部课程"] as const;
const active = ref("全部");
const pageSize = 6;
const currentPage = ref(1);
const filtered = computed(() => active.value === "全部" ? PUBLIC_RESOURCES : PUBLIC_RESOURCES.filter((item) => item.category === active.value));
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});
const route = useRoute();

watch(active, () => {
  currentPage.value = 1;
});
</script>

<template>
  <NuxtPage v-if="route.params.slug" />
  <div v-else>
    <PageBanner
      eyebrow="Resource Center"
      title="把方法、模板与学习路线沉淀下来"
      description="所有条目先进入详情页；当前文件类资源尚未接入，内部资料登录仅用于确认成员身份。"
      tone="warm"
      media-label="资源索引与文件视觉位"
      :visual="PAGE_VISUALS.resources"
    />
    <section class="section">
      <div class="shell">
        <FilterToolbar v-model="active" :filters="categories" :result-label="`共 ${filtered.length} 份资源`" />
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
        <PaginationControls v-model="currentPage" :page-count="pageCount" label="资源分页" />
      </div>
    </section>
  </div>
</template>
