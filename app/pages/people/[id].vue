<script setup lang="ts">
import { resolvePublicAvatar } from "~/data/people";
import { useMemberRepository } from "~/composables/useMemberRepository";
import { usePublicMembersGateway } from '~/composables/usePublicMembersGateway'
import { usePublicMembersStore } from '~/stores/public-members'

const route = useRoute();
const memberRepository = useMemberRepository();
const publicMembersGateway = usePublicMembersGateway()
const publicMembersStore = usePublicMembersStore()
const publicId = String(route.params.id)
const publicMemberRequest = publicMembersGateway
  ? await useAsyncData(`public-member-${publicId}`, () => publicMembersStore.refreshDetail(publicMembersGateway, publicId))
  : undefined
// Pinia is intentionally wired without @pinia/nuxt, so its state is not
// serialized into the browser during SSR hydration. Keep the useAsyncData
// snapshot as the client-side fallback for direct member links.
const ssrPerson = computed(() => publicMemberRequest?.data.value)
const person = computed(() => publicMembersGateway
  ? publicMembersStore.detail ?? ssrPerson.value
  : memberRepository.findPublicPerson(publicId));
const runtimeConfig = useRuntimeConfig() as { public?: { apiBase?: string } }
const apiBase = runtimeConfig.public?.apiBase

if (!person.value) {
  const status = publicMembersStore.apiError && (publicMembersStore.apiError as any).status !== 404 ? 503 : 404
  throw createError({ statusCode: status, statusMessage: status === 404 ? "成员不存在" : '公开成员资料暂时不可用' });
}

const honors = computed(() => [...person.value!.honors].sort((a, b) => b.awardedAt.localeCompare(a.awardedAt)));
const honorDateLabel = (honor: (typeof honors.value)[number]) => honor.awardedDateLabel ?? honor.awardedAt;

useHead(() => ({
  title: `${person.value?.name}｜公开成员详情｜白云 HSD 开发者部落`,
  meta: [
    {
      name: "description",
      content: person.value?.bio
    }
  ]
}));
</script>

<template>
  <div v-if="person" class="member-detail">
    <PageBanner
      :eyebrow="person.memberDuty"
      :title="person.name"
      :description="person.bio || `${person.centerName} · ${person.memberDuty}`"
      tone="warm"
      :media-label="`${person.name}公开风采素材位`"
    />

    <section class="section section--cool">
      <div class="shell member-detail__layout">
        <article class="member-detail__profile">
          <HsdAvatar :name="person.name" :src="resolvePublicAvatar(person, apiBase)" size="lg" />
          <div>
            <p class="eyebrow">公开资料</p>
            <h2>公开成员信息</h2>
            <dl>
              <div>
                <dt>所属中心</dt>
                <dd>{{ person.centerName }}</dd>
              </div>
              <div v-if="person.baizeDirection">
                <dt>实践方向</dt>
                <dd>{{ person.baizeDirection }}</dd>
              </div>
              <div v-if="person.positions?.length"><dt>组织职务</dt><dd>{{ person.positions.join("、") }}</dd></div>
            </dl>
          </div>
        </article>

        <section
          v-if="honors.length"
          class="member-honors"
          aria-labelledby="member-honors-heading"
        >
            <p class="eyebrow">已发布荣誉</p>
          <h2 id="member-honors-heading">个人荣誉</h2>
          <ol>
            <li v-for="honor in honors" :key="honor.id" data-testid="honor-record">
              <time :datetime="honor.awardedAt">{{ honorDateLabel(honor) }}</time>
              <div>
                <h3>{{ honor.title }}</h3>
              </div>
            </li>
          </ol>
        </section>

        <nav class="member-detail__navigation" aria-label="成员详情返回导航">
          <NuxtLink class="button button--dark" to="/people/members">返回全体成员</NuxtLink>
          <NuxtLink class="text-link" :to="`/centers/${person.centerSlug}`">
            查看{{ person.centerName }} →
          </NuxtLink>
        </nav>
      </div>
    </section>
  </div>
</template>
