<script setup lang="ts">
import { CENTER_OPTIONS } from "~/data/centers";
import { resolvePublicAvatar } from "~/data/people";
import { useMemberRepository } from "~/composables/useMemberRepository";
import { usePublicMembersGateway } from '~/composables/usePublicMembersGateway'
import { usePublicMembersStore } from '~/stores/public-members'

useHead({ title: "核心人员名录｜白云 HSD 开发者部落" });

const query = ref("");
const center = ref("all");
const isHydrated = ref(false);
const memberRepository = useMemberRepository();
const publicMembersGateway = usePublicMembersGateway()
const publicMembersStore = usePublicMembersStore()
const runtimeConfig = useRuntimeConfig() as { public?: { apiBase?: string } }
const apiBase = runtimeConfig.public?.apiBase
const publicMembersRequest = publicMembersGateway
  ? await useAsyncData('public-core-members', async () => {
      await publicMembersStore.refresh(publicMembersGateway)
      return [...publicMembersStore.items]
    })
  : undefined
const apiPublicPeople = computed(() => publicMembersRequest?.data.value ?? publicMembersStore.items)
const corePeople = computed(() => publicMembersGateway
  ? apiPublicPeople.value.filter((person) => person.isCore)
  : memberRepository.publicCorePeople.value)
const pageSize = 12;
const currentPage = ref(1);

onMounted(() => {
  isHydrated.value = true;
});

function clearFilters() {
  query.value = "";
  center.value = "all";
}

const filteredPeople = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase();

  return corePeople.value.filter((person) => {
    const matchesCenter = center.value === "all" || person.centerSlug === center.value;
    const searchableText = [person.name, person.memberDuty, person.centerName, person.baizeDirection, person.bio]
      .join(" ")
      .toLocaleLowerCase();

    return matchesCenter && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredPeople.value.length / pageSize)));
const visiblePeople = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredPeople.value.slice(start, start + pageSize);
});
const displayStart = computed(() => filteredPeople.value.length ? (currentPage.value - 1) * pageSize + 1 : 0);
const displayEnd = computed(() => Math.min(currentPage.value * pageSize, filteredPeople.value.length));

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
      eyebrow="Core People"
      title="核心人员名录"
      description="认识正在承担组织方向、项目推进与跨中心协作职责的核心人员。名录为公开信息，无需登录即可浏览。"
      tone="warm"
      media-label="核心人员协作影像素材位"
    />

    <section class="section section--warm">
      <div class="shell">
        <p v-if="publicMembersStore.apiLoading" role="status">正在加载公开核心成员…</p>
        <p v-else-if="publicMembersStore.apiError" role="alert">{{ publicMembersStore.apiError.message }}</p>
        <div class="directory-toolbar">
          <label>
            <span>搜索核心人员</span>
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
            共 {{ filteredPeople.length }} 位核心人员<span v-if="filteredPeople.length">，当前显示 {{ displayStart }}–{{ displayEnd }} 位</span>
          </p>
        </div>

        <div v-if="visiblePeople.length" class="people-core-grid">
          <NuxtLink
            v-for="person in visiblePeople"
            :key="person.id"
            class="directory-card"
            :to="`/people/${person.id}`"
          >
            <div class="people-core-grid__identity">
              <HsdAvatar :name="person.name" :src="resolvePublicAvatar(person, apiBase)" size="lg" />
              <span>{{ person.centerName }}</span>
            </div>
            <p class="people-core-grid__role">{{ person.memberDuty }}</p>
            <h2>{{ person.name }}</h2>
            <p v-if="person.positions?.length" class="people-core-grid__role">{{ person.positions.join("、") }}</p>
            <strong v-if="person.baizeDirection">{{ person.baizeDirection }}</strong>
            <p v-if="person.bio">{{ person.bio }}</p>
            <span class="directory-card__action">查看成员详情 →</span>
          </NuxtLink>
        </div>
        <EmptyState v-else title="没有匹配的核心人员" description="请尝试更换关键词或中心筛选条件。">
          <template #action>
            <button type="button" class="button button--dark" @click="clearFilters">清除筛选</button>
          </template>
        </EmptyState>
        <PaginationControls v-if="visiblePeople.length" v-model="currentPage" :page-count="pageCount" label="核心人员分页" />
      </div>
    </section>
  </div>
</template>
