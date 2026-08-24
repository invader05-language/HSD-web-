<script setup lang="ts">
import { PUBLIC_RESOURCES, resourcePrimaryAction } from "~/data/resources";
import { useResourcesStore } from "~/stores/resources";
import { useContentGateway } from "~/composables/useContentGateway";
import { PAGE_VISUALS } from "~/data/page-visuals";

useHead({ title: "资源中心｜白云 HSD 开发者部落" });

const categories = ["全部", "学习路线", "项目模板", "活动资料", "内部课程"] as const;
const active = ref("全部");
const pageSize = 6;
const currentPage = ref(1);
const resourcesStore = useResourcesStore();
const gateway = useContentGateway();
const resourceData = ref<{ items: typeof resourcesStore.items } | undefined>();
if (gateway) {
  resourcesStore.activateApiMode();
  const { data } = await useAsyncData(`public-resources`, async () => {
    await resourcesStore.refreshPublicFromApi(gateway);
    return { items: resourcesStore.items };
  });
  resourceData.value = data.value;
}
const filtered = computed<any[]>(() => gateway
  ? (resourcesStore.items.length ? resourcesStore.items : resourceData.value?.items ?? [])
  : (active.value === "全部" ? [...PUBLIC_RESOURCES] : PUBLIC_RESOURCES.filter((item) => item.category === active.value)));
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});
const route = useRoute();
const itemLink = (item: { slug: string; to?: string }) => item.to ?? `/resources/${item.slug}`;
const itemAction = (item: any) => gateway ? (item.kind === "article" ? "阅读正文" : item.access === "member" ? "登录后访问" : "查看资源") : resourcePrimaryAction(item);

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
        <p v-if="resourcesStore.apiError" role="alert">{{ resourcesStore.apiError.message }}（{{ resourcesStore.apiError.code }}）</p>
        <p v-if="resourcesStore.apiLoading" role="status">正在加载公开资源…</p>
        <FilterToolbar v-model="active" :filters="categories" :result-label="`共 ${filtered.length} 份资源`" />
        <div v-if="visible.length" class="resource-catalog">
          <NuxtLink v-for="(item, index) in visible" :key="item.slug" :to="itemLink(item)">
            <span>0{{ index + 1 }}</span>
            <div>
              <small>{{ item.category ?? item.kind }} · {{ item.format }}</small>
              <h2>{{ item.title }}</h2>
            </div>
            <strong>{{ itemAction(item) }} →</strong>
          </NuxtLink>
        </div>
        <EmptyState v-else />
        <PaginationControls v-model="currentPage" :page-count="pageCount" label="资源分页" />
      </div>
    </section>
  </div>
</template>
