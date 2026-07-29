<script setup lang="ts">
import { CENTER_OPTIONS } from "~/data/centers";
import { CORE_PEOPLE, resolvePublicAvatar } from "~/data/people";

useHead({ title: "核心人员名录｜白云 HSD 开发者部落" });

const query = ref("");
const center = ref("all");
const isHydrated = ref(false);

onMounted(() => {
  isHydrated.value = true;
});

const visiblePeople = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase();

  return CORE_PEOPLE.filter((person) => {
    const matchesCenter = center.value === "all" || person.centerSlug === center.value;
    const searchableText = [person.name, person.role, person.centerName, person.direction, person.bio]
      .join(" ")
      .toLocaleLowerCase();

    return matchesCenter && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
});
</script>

<template>
  <div :data-directory-hydrated="isHydrated">
    <PageBanner
      eyebrow="Core People"
      title="核心人员名录"
      description="认识正在承担组织方向、项目推进与跨中心协作职责的核心人员。名录为公开信息，无需登录即可浏览。"
      tone="warm"
      media-label="核心人员协作影像素材位"
    />

    <section class="section section--warm">
      <div class="shell">
        <div class="directory-toolbar">
          <label>
            <span>搜索核心人员</span>
            <input v-model="query" type="search" placeholder="姓名、职责或方向">
          </label>
          <label>
            <span>按中心筛选</span>
            <select v-model="center">
              <option value="all">全部中心</option>
              <option v-for="option in CENTER_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <p aria-live="polite">共 {{ visiblePeople.length }} 位核心人员</p>
        </div>

        <div v-if="visiblePeople.length" class="people-core-grid">
          <article v-for="person in visiblePeople" :key="person.id">
            <div class="people-core-grid__identity">
              <HsdAvatar :name="person.name" :src="resolvePublicAvatar(person)" size="lg" />
              <span>{{ person.centerName }}</span>
            </div>
            <p class="people-core-grid__role">{{ person.role }}</p>
            <h2>{{ person.name }}</h2>
            <strong>{{ person.direction }}</strong>
            <p>{{ person.bio }}</p>
          </article>
        </div>
        <EmptyState v-else title="没有匹配的核心人员" description="请尝试更换关键词或中心筛选条件。" />
      </div>
    </section>
  </div>
</template>
