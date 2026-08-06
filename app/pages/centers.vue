<script setup lang="ts">
import { CENTERS } from "~/data/home";

const route = useRoute();

useHead({ title: "四大中心｜白云 HSD 开发者部落" });
</script>

<template>
  <NuxtPage v-if="route.params.slug" />
  <div v-else>
    <PageBanner
      eyebrow="Four Centers"
      title="研发、传播、策划、成长"
      description="四大中心各有专业方向，也围绕同一个项目目标共同协作。你可以从擅长的方向开始，再逐步探索更多能力。"
      tone="dark"
      media-label="四中心协作关系视觉位"
    />
    <section class="section section--warm">
      <div class="shell center-detail-list">
        <NuxtLink
          v-for="center in CENTERS"
          :key="center.slug"
          :to="`/centers/${center.slug}`"
          class="center-detail-row"
        >
          <div>
            <span>{{ center.index }}</span>
            <p>{{ center.role }}</p>
          </div>
          <div>
            <h2>{{ center.title }}</h2>
            <p>{{ center.description }}</p>
          </div>
          <ul>
            <li v-for="topic in center.topics" :key="topic">{{ topic }}</li>
          </ul>
          <strong>查看中心详情 →</strong>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
