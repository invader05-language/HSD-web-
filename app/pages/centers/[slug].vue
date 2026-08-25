<script setup lang="ts">
import { CENTERS, getCenterBySlug } from "~/data/centers";
import { resolvePublicAvatar } from "~/data/people";
import { useMemberRepository } from "~/composables/useMemberRepository";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { usePublicCentersStore } from "~/stores/public-centers";
import PaginationControls from "~/components/PaginationControls.vue";
import OrganizationLeadershipPanel from "~/components/OrganizationLeadershipPanel.vue";

type MemberFilter = "all" | "core" | "regular";

const memberFilterOptions: Array<{ value: MemberFilter; label: string }> = [
  { value: "all", label: "全部成员" },
  { value: "core", label: "核心成员" },
  { value: "regular", label: "普通成员" },
];
const PAGE_SIZE = 8;

const route = useRoute();
const center = computed(() => getCenterBySlug(String(route.params.slug)));
const memberRepository = useMemberRepository();
const organizationGateway = useOrganizationGateway();
const publicCenters = usePublicCentersStore();
const router = useRouter();
const runtimeConfig = useRuntimeConfig() as { public?: { apiBase?: string } };
const apiBase = runtimeConfig.public?.apiBase;

if (!center.value) {
  throw createError({ statusCode: 404, statusMessage: "中心不存在" });
}

const apiMode = computed(() => Boolean(organizationGateway));
const publicSlug = computed(() => (
  center.value
    ? publicCenters.resolvePublicSlug(center.value.slug, center.value.title)
    : undefined
));
const detail = computed(() => {
  const current = publicCenters.detail;
  return current && current.publicSlug === publicSlug.value ? current : undefined;
});
const people = computed(() => (
  apiMode.value
    ? detail.value?.members ?? []
    : memberRepository.getPeopleByCenter(center.value?.slug ?? "")
));
const ministers = computed(() => {
  if (apiMode.value) return detail.value?.ministers ?? [];
  return people.value.filter((person) => person.positions?.some((position) => position.includes("中心部长")));
});
const centerIndex = computed(() => CENTERS.findIndex((item) => item.slug === center.value?.slug));
const nextCenter = computed(() => CENTERS[(centerIndex.value + 1) % CENTERS.length]);

type MemberRouteQuery = Record<string, string | string[] | null | undefined>;
const routeQuery = computed<MemberRouteQuery>(() => ((route as { query?: MemberRouteQuery }).query ?? {}));
const queryValue = (value: unknown): string | undefined => Array.isArray(value) ? String(value[0] ?? "") : typeof value === "string" ? value : undefined;
const parseMemberFilter = (value: unknown): MemberFilter => {
  const candidate = queryValue(value);
  return candidate === "core" || candidate === "regular" ? candidate : "all";
};
const parseMemberPage = (value: unknown): number => {
  const candidate = Number.parseInt(queryValue(value) ?? "1", 10);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : 1;
};
const memberFilter = ref<MemberFilter>(parseMemberFilter(routeQuery.value.memberType));
const memberPage = ref(parseMemberPage(routeQuery.value.memberPage));

const filterCounts = computed<Record<MemberFilter, number>>(() => ({
  all: people.value.length,
  core: people.value.filter((person) => person.isCore).length,
  regular: people.value.filter((person) => !person.isCore).length,
}));
const filteredPeople = computed(() => {
  const ministerIds = new Set(ministers.value.map((minister) => minister.id));
  const source = people.value
    .map((person, index) => ({ person, index }))
    .filter(({ person }) => memberFilter.value === "all" || (memberFilter.value === "core" ? person.isCore : !person.isCore));

  return source
    .sort((left, right) => {
      const rank = (person: typeof left.person) => ministerIds.has(person.id) ? 0 : person.isCore ? 1 : 2;
      return rank(left.person) - rank(right.person) || left.index - right.index;
    })
    .map(({ person }) => person);
});
const pageCount = computed(() => Math.max(1, Math.ceil(filteredPeople.value.length / PAGE_SIZE)));
const effectivePage = computed(() => Math.min(memberPage.value, pageCount.value));
const visiblePeople = computed(() => {
  const start = (effectivePage.value - 1) * PAGE_SIZE;
  return filteredPeople.value.slice(start, start + PAGE_SIZE);
});
const activeFilterLabel = computed(() => memberFilterOptions.find((option) => option.value === memberFilter.value)?.label ?? "全部成员");

function replaceMemberQuery(filter: MemberFilter, page: number) {
  const query = { ...routeQuery.value };
  if (filter === "all") delete query.memberType;
  else query.memberType = filter;
  if (page <= 1) delete query.memberPage;
  else query.memberPage = String(page);
  void router.replace({ query });
}

function setMemberFilter(filter: MemberFilter) {
  memberFilter.value = filter;
  memberPage.value = 1;
  replaceMemberQuery(filter, 1);
}

function setMemberPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), pageCount.value);
  memberPage.value = nextPage;
  replaceMemberQuery(memberFilter.value, nextPage);
}

watch(() => routeQuery.value.memberType, (value) => {
  memberFilter.value = parseMemberFilter(value);
});
watch(() => routeQuery.value.memberPage, (value) => {
  memberPage.value = parseMemberPage(value);
});
watch([pageCount, () => center.value?.slug], () => {
  // Do not clamp a query page while the API snapshot is still empty during SSR setup.
  // Once members arrive, an out-of-range page is normalized to the last available page.
  if (people.value.length > 0 && memberPage.value > pageCount.value) setMemberPage(pageCount.value);
}, { immediate: true });
watch(() => center.value?.slug, async (slug, previousSlug) => {
  if (!slug || slug === previousSlug) return;
  memberPage.value = 1;
  memberFilter.value = "all";
  if (organizationGateway) {
    const nextCenter = getCenterBySlug(slug);
    const nextPublicSlug = nextCenter
      ? publicCenters.resolvePublicSlug(nextCenter.slug, nextCenter.title)
      : slug;
    await publicCenters.refreshDetail(organizationGateway, nextPublicSlug);
  }
});

useHead(() => ({
  title: `${center.value?.title}｜四大中心｜白云 HSD 开发者部落`,
  meta: [
    {
      name: "description",
      content: center.value?.mission
    }
  ]
}));

if (organizationGateway && center.value) {
  await useAsyncData("public-center-list", () => publicCenters.refreshList(organizationGateway));
  await useAsyncData(`public-center-${center.value.slug}`, () => publicCenters.refreshDetail(
    organizationGateway,
    publicCenters.resolvePublicSlug(center.value!.slug, center.value!.title),
  ));
  // The project uses a lightweight Pinia plugin without Nuxt state serialization.
  // Rehydrate the public snapshot on the client so SSR data is not replaced by an empty store.
  if (import.meta.client) await publicCenters.refreshDetail(
    organizationGateway,
    publicCenters.resolvePublicSlug(center.value.slug, center.value.title),
  );
}
</script>

<template>
  <div v-if="center">
    <PageBanner
      :eyebrow="center.eyebrow"
      :title="center.title"
      :description="center.headline"
      tone="dark"
      :media-label="`${center.title}项目与协作素材位`"
    />

    <section class="section section--warm">
      <div class="shell center-profile">
        <div class="center-profile__intro">
          <p class="eyebrow">中心使命</p>
          <h2>中心使命</h2>
          <p>{{ center.mission }}</p>
        </div>
        <section class="center-profile__topics" aria-labelledby="center-topics-title">
          <p class="eyebrow">重点方向</p>
          <h2 id="center-topics-title">主要方向</h2>
          <ul>
            <li v-for="topic in center.topics" :key="topic">{{ topic }}</li>
          </ul>
        </section>
        <div class="center-profile__tracks">
          <section>
            <p class="eyebrow">职责范围</p>
            <h2>中心职责</h2>
            <ol>
              <li v-for="(item, index) in center.responsibilities" :key="item">
                <span>0{{ index + 1 }}</span>
                <strong>{{ item }}</strong>
              </li>
            </ol>
          </section>
          <section>
            <p class="eyebrow">成长路径</p>
            <h2>成长路径</h2>
            <ol>
              <li v-for="(item, index) in center.learningPath" :key="item">
                <span>0{{ index + 1 }}</span>
                <strong>{{ item }}</strong>
              </li>
            </ol>
          </section>
        </div>
        <section class="center-profile__collaboration" aria-labelledby="center-collaboration-title">
          <div>
            <p class="eyebrow">协作方式</p>
            <h2 id="center-collaboration-title">协作方式</h2>
          </div>
          <p>{{ center.collaboration }}</p>
        </section>
      </div>
    </section>

    <section class="section section--cool">
      <div class="shell center-people">
        <OrganizationLeadershipPanel
          :people="ministers"
          eyebrow="中心负责人"
          heading="中心管理团队"
          role-label="中心部长"
          count-label="部长"
          description="负责协调本中心的日常工作、项目协作与成员支持。"
          empty-text="当前暂未公布中心部长"
          modifier="center"
          card-test-id="center-minister-card"
          :loading="publicCenters.apiLoading"
          :error="publicCenters.apiError?.message"
        />
        <div class="section-heading section-heading--wide">
          <div>
            <p class="eyebrow">成员</p>
            <h2>相关成员</h2>
          </div>
          <p>共 {{ people.length }} 位成员 · 当前显示 {{ activeFilterLabel }} {{ filteredPeople.length }} 人</p>
        </div>
        <div class="center-members-toolbar" aria-label="成员筛选">
          <div class="center-members-filters" role="group" aria-label="按成员等级筛选">
            <button
              v-for="option in memberFilterOptions"
              :key="option.value"
              type="button"
              :class="{ 'is-active': memberFilter === option.value }"
              :aria-pressed="memberFilter === option.value"
              @click="setMemberFilter(option.value)"
            >
              {{ option.label }} <span>{{ filterCounts[option.value] }}</span>
            </button>
          </div>
          <p class="center-members-toolbar__status" role="status">第 {{ effectivePage }} 页 / 共 {{ pageCount }} 页</p>
        </div>
        <p v-if="publicCenters.apiLoading" class="center-members-status" role="status">正在加载成员…</p>
        <p v-else-if="publicCenters.apiError" class="center-members-status" role="alert">成员加载失败：{{ publicCenters.apiError.message }}</p>
        <p v-else-if="!people.length" class="center-members-status">当前暂无公开成员</p>
        <div v-else class="center-people__list">
          <article v-for="person in visiblePeople" :key="person.id" data-testid="center-member-card">
            <HsdAvatar :name="person.name" :src="resolvePublicAvatar(person, apiBase)" size="md" />
            <div>
              <p>{{ person.memberDuty }}</p>
              <h3>{{ person.name }}</h3>
              <small v-if="person.positions?.length">{{ person.positions.join("、") }}</small>
            </div>
            <p v-if="person.baizeDirection">{{ person.baizeDirection }}</p>
            <p v-if="person.bio">{{ person.bio }}</p>
          </article>
        </div>
        <PaginationControls
          :model-value="effectivePage"
          :page-count="pageCount"
          label="相关成员分页"
          @update:model-value="setMemberPage"
        />
      </div>
    </section>

    <section class="section">
      <div class="shell center-switcher">
        <div>
          <p class="eyebrow">四大中心</p>
          <h2>继续了解其他中心</h2>
        </div>
        <nav aria-label="四大中心详情导航">
          <NuxtLink
            v-for="item in CENTERS"
            :key="item.slug"
            :to="`/centers/${item.slug}`"
            :aria-current="item.slug === center.slug ? 'page' : undefined"
          >
            <span>{{ item.index }}</span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.slug === center.slug ? "当前中心" : "查看详情 →" }}</small>
          </NuxtLink>
        </nav>
        <NuxtLink
          v-if="nextCenter"
          class="center-switcher__next"
          :to="`/centers/${nextCenter.slug}`"
        >
          下一中心 · {{ nextCenter.title }} →
        </NuxtLink>
      </div>
    </section>

    <section class="recruitment-band">
      <div class="recruitment-band__inner shell">
        <div>
          <p class="eyebrow">加入这个中心</p>
          <h2>从一次真实参与开始</h2>
          <p>{{ center.joinHint }}</p>
        </div>
        <NuxtLink class="button button--light" to="/join">查看招新与报名</NuxtLink>
      </div>
    </section>
  </div>
</template>
