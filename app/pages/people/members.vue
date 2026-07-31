<script setup lang="ts">
import { CENTER_OPTIONS } from "~/data/centers";
import { getFeaturedHonors, resolvePublicAvatar } from "~/data/people";
import { useMemberRepository } from "~/composables/useMemberRepository";

useHead({ title: "全体成员名录｜白云 HSD 开发者部落" });

const query = ref("");
const center = ref("all");
const isHydrated = ref(false);
const memberRepository = useMemberRepository();
const publicMembers = memberRepository.publicMembers;

onMounted(() => {
  isHydrated.value = true;
});

function clearFilters() {
  query.value = "";
  center.value = "all";
}

const visibleMembers = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase();

  return publicMembers.value.filter((person) => {
    const matchesCenter = center.value === "all" || person.centerSlug === center.value;
    const searchableText = [person.name, person.centerName, person.direction, person.bio]
      .join(" ")
      .toLocaleLowerCase();

    return matchesCenter && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
});
</script>

<template>
  <div :data-directory-hydrated="isHydrated">
    <PageBanner
      eyebrow="Public Members"
      title="全体成员名录"
      description="浏览成员公开的基础风采与实践方向。头像未上传时，统一显示白底 HSD 默认头像。"
      tone="dark"
      media-label="成员共同实践影像素材位"
    />

    <section class="section section--cool">
      <div class="shell">
        <div class="directory-toolbar">
          <label>
            <span>搜索成员</span>
            <input v-model="query" type="search" placeholder="姓名、中心或实践方向">
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
          <p aria-live="polite">共 {{ visibleMembers.length }} 位成员</p>
        </div>

        <div v-if="visibleMembers.length" class="people-member-list">
          <NuxtLink
            v-for="person in visibleMembers"
            :key="person.id"
            class="directory-card people-member-card"
            :to="`/people/${person.id}`"
          >
            <HsdAvatar :name="person.name" :src="resolvePublicAvatar(person)" size="lg" />
            <div class="people-member-card__content">
              <span>{{ person.centerName }}</span>
              <h2>{{ person.name }}</h2>
              <strong>{{ person.direction }}</strong>
              <ul v-if="getFeaturedHonors(person).length" class="featured-honors">
                <li
                  v-for="honor in getFeaturedHonors(person)"
                  :key="honor.id"
                  data-testid="featured-honor"
                >
                  重点荣誉 · {{ honor.title }}
                </li>
              </ul>
              <p>{{ person.bio }}</p>
              <span class="directory-card__action">查看成员详情 →</span>
            </div>
          </NuxtLink>
        </div>
        <EmptyState v-else title="没有匹配的成员" description="请尝试更换关键词或中心筛选条件。">
          <template #action>
            <button type="button" class="button button--dark" @click="clearFilters">清除筛选</button>
          </template>
        </EmptyState>

        <p class="privacy-note">本页仅展示成员主动公开的基础风采信息，不包含个人联系方式、考核结果或成长记录。</p>
      </div>
    </section>
  </div>
</template>
