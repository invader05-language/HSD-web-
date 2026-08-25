<script setup lang="ts">
import { CENTER_OPTIONS } from "~/data/centers";
import { resolvePublicAvatar } from "~/data/people";
import { useMemberRepository } from "~/composables/useMemberRepository";
import { usePublicMembersGateway } from '~/composables/usePublicMembersGateway'
import { usePublicMembersStore } from '~/stores/public-members'

useHead({ title: "全体成员名录｜白云 HSD 开发者部落" });

const query = ref("");
const center = ref("all");
const isHydrated = ref(false);
const memberRepository = useMemberRepository();
const publicMembersGateway = usePublicMembersGateway()
const publicMembersStore = usePublicMembersStore()
const runtimeConfig = useRuntimeConfig() as { public?: { apiBase?: string } }
const apiBase = runtimeConfig.public?.apiBase
const publicMembersRequest = publicMembersGateway
  ? await useAsyncData('public-members', async () => {
      await publicMembersStore.refresh(publicMembersGateway)
      return [...publicMembersStore.items]
    })
  : undefined
const apiPublicPeople = computed(() => publicMembersRequest?.data.value ?? publicMembersStore.items)
const publicMembers = computed(() => publicMembersGateway ? apiPublicPeople.value.filter((person) => !person.isCore) : memberRepository.publicMembers.value)
const pageSize = 12;
const currentPage = ref(1);

onMounted(() => {
  isHydrated.value = true;
});

function clearFilters() {
  query.value = "";
  center.value = "all";
}

const filteredMembers = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase();

  return publicMembers.value.filter((person) => {
    const matchesCenter = center.value === "all" || person.centerSlug === center.value;
    const searchableText = [person.name, person.centerName, person.baizeDirection, person.bio]
      .join(" ")
      .toLocaleLowerCase();

    return matchesCenter && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredMembers.value.length / pageSize)));
const visibleMembers = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredMembers.value.slice(start, start + pageSize);
});
const displayStart = computed(() => filteredMembers.value.length ? (currentPage.value - 1) * pageSize + 1 : 0);
const displayEnd = computed(() => Math.min(currentPage.value * pageSize, filteredMembers.value.length));

watch([query, center], () => {
  currentPage.value = 1;
});

watch(pageCount, (nextPageCount) => {
  currentPage.value = Math.min(currentPage.value, nextPageCount);
});
</script>

<template>
  <div :data-directory-hydrated="isHydrated">
    <PageBanner
      eyebrow="公开成员"
      title="全体成员名录"
      description="浏览正式成员默认公开的基础风采资料。白泽开发中心成员同时展示统一实践方向；头像未上传时使用白底 HSD 默认头像。"
      tone="dark"
      media-label="成员共同实践影像素材位"
    />

    <section class="section section--cool">
      <div class="shell">
        <p v-if="publicMembersStore.apiLoading" role="status">正在加载公开成员…</p>
        <p v-else-if="publicMembersStore.apiError" role="alert">{{ publicMembersStore.apiError.message }}</p>
        <div class="directory-toolbar">
          <label>
            <span>搜索成员</span>
            <input v-model="query" type="search" placeholder="姓名、中心或白泽实践方向">
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
          <p aria-live="polite">
            共 {{ filteredMembers.length }} 位成员<span v-if="filteredMembers.length">，当前显示 {{ displayStart }}–{{ displayEnd }} 位</span>
          </p>
        </div>

        <div v-if="visibleMembers.length" class="people-member-list">
          <NuxtLink
            v-for="person in visibleMembers"
            :key="person.id"
            class="directory-card people-member-card"
            :to="`/people/${person.id}`"
          >
            <HsdAvatar :name="person.name" :src="resolvePublicAvatar(person, apiBase)" size="md" />
            <div class="people-member-card__content">
              <span>{{ person.centerName }}</span>
              <h2>{{ person.name }}</h2>
              <strong v-if="person.baizeDirection">{{ person.baizeDirection }}</strong>
              <p v-if="person.bio">{{ person.bio }}</p>
              <span class="directory-card__action">查看成员详情 →</span>
            </div>
          </NuxtLink>
        </div>
        <EmptyState v-else title="没有匹配的成员" description="请尝试更换关键词或中心筛选条件。">
          <template #action>
            <button type="button" class="button button--dark" @click="clearFilters">清除筛选</button>
          </template>
        </EmptyState>

        <PaginationControls v-if="visibleMembers.length" v-model="currentPage" :page-count="pageCount" label="全体成员分页" />
        <p class="privacy-note">本页默认展示正式成员的基础风采信息，不包含学号、班级、联系方式、报名信息、考核结果或帐号资料。</p>
      </div>
    </section>
  </div>
</template>
