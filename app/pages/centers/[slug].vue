<script setup lang="ts">
import { CENTERS, getCenterBySlug } from "~/data/centers";
import { getPeopleByCenter, resolvePublicAvatar } from "~/data/people";

const route = useRoute();
const center = computed(() => getCenterBySlug(String(route.params.slug)));

if (!center.value) {
  throw createError({ statusCode: 404, statusMessage: "中心不存在" });
}

const people = computed(() => getPeopleByCenter(center.value?.slug ?? ""));
const centerIndex = computed(() => CENTERS.findIndex((item) => item.slug === center.value?.slug));
const nextCenter = computed(() => CENTERS[(centerIndex.value + 1) % CENTERS.length]);

useHead(() => ({
  title: `${center.value?.title}｜四大中心｜白云 HSD 开发者部落`,
  meta: [
    {
      name: "description",
      content: center.value?.mission
    }
  ]
}));
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
          <p class="eyebrow">Center Mission</p>
          <h2>中心使命</h2>
          <p>{{ center.mission }}</p>
          <p>{{ center.collaboration }}</p>
        </div>
        <div class="center-profile__tracks">
          <section>
            <p class="eyebrow">Responsibilities</p>
            <h2>中心职责</h2>
            <ol>
              <li v-for="(item, index) in center.responsibilities" :key="item">
                <span>0{{ index + 1 }}</span>
                <strong>{{ item }}</strong>
              </li>
            </ol>
          </section>
          <section>
            <p class="eyebrow">Learning Path</p>
            <h2>成长路径</h2>
            <ol>
              <li v-for="(item, index) in center.learningPath" :key="item">
                <span>0{{ index + 1 }}</span>
                <strong>{{ item }}</strong>
              </li>
            </ol>
          </section>
        </div>
      </div>
    </section>

    <section class="section section--cool">
      <div class="shell center-people">
        <div class="section-heading section-heading--wide">
          <div>
            <p class="eyebrow">People</p>
            <h2>相关成员</h2>
          </div>
          <p>公开展示正在该中心参与项目与协作的核心成员和普通成员，无需登录即可浏览。</p>
        </div>
        <div class="center-people__list">
          <article v-for="person in people" :key="person.id">
            <HsdAvatar :name="person.name" :src="resolvePublicAvatar(person)" size="md" />
            <div>
              <p>{{ person.role }}</p>
              <h3>{{ person.name }}</h3>
            </div>
            <p>{{ person.direction }}</p>
            <p>{{ person.bio }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="shell center-switcher">
        <div>
          <p class="eyebrow">Four Centers</p>
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
          <p class="eyebrow">Join This Center</p>
          <h2>从一次真实参与开始</h2>
          <p>{{ center.joinHint }}</p>
        </div>
        <NuxtLink class="button button--light" to="/join">查看招新与报名</NuxtLink>
      </div>
    </section>
  </div>
</template>
