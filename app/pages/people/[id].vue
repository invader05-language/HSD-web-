<script setup lang="ts">
import { resolvePublicAvatar } from "~/data/people";
import { useMemberRepository } from "~/composables/useMemberRepository";

const route = useRoute();
const memberRepository = useMemberRepository();
const person = computed(() => memberRepository.findPublicPerson(String(route.params.id)));

if (!person.value) {
  throw createError({ statusCode: 404, statusMessage: "成员不存在" });
}

const honors = computed(() => [...person.value!.honors].sort((a, b) => a.order - b.order));

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
          <HsdAvatar :name="person.name" :src="resolvePublicAvatar(person)" size="lg" />
          <div>
            <p class="eyebrow">Public Profile</p>
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
            </dl>
          </div>
        </article>

        <section
          v-if="honors.length"
          class="member-honors"
          aria-labelledby="member-honors-heading"
        >
          <p class="eyebrow">Published Honors</p>
          <h2 id="member-honors-heading">个人荣誉</h2>
          <ol>
            <li v-for="honor in honors" :key="honor.id" data-testid="honor-record">
              <time :datetime="honor.awardedAt">{{ honor.awardedAt }}</time>
              <div>
                <h3>{{ honor.title }}</h3>
                <p>{{ honor.description }}</p>
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
