<script setup lang="ts">
import type { PublicPerson } from "~/data/people";
import { resolvePublicAvatar } from "~/data/people";

withDefaults(defineProps<{
  people: readonly PublicPerson[];
  heading: string;
  eyebrow: string;
  roleLabel: string;
  countLabel: string;
  description?: string;
  emptyText?: string;
  loading?: boolean;
  error?: string | null;
  modifier?: "alliance" | "center";
  panelTestId?: string;
  cardTestId?: string;
}>(), {
  description: "",
  emptyText: "当前暂未公布负责人",
  loading: false,
  error: null,
  modifier: "center",
  panelTestId: "organization-leadership-panel",
  cardTestId: "organization-leadership-card",
});
</script>

<template>
  <section
    class="organization-leadership center-ministers"
    :class="`organization-leadership--${modifier}`"
    :aria-label="heading"
    :data-testid="panelTestId"
  >
    <div class="organization-leadership__heading center-ministers__heading">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h2>{{ heading }}</h2>
      </div>
      <span class="organization-leadership__count center-ministers__count">{{ people.length }} 位{{ countLabel }}</span>
    </div>
    <p v-if="description && !loading && !error && people.length" class="organization-leadership__description center-ministers__description">
      {{ description }}
    </p>
    <p v-if="loading" class="organization-leadership__status center-ministers__empty" role="status">正在加载负责人…</p>
    <p v-else-if="error" class="organization-leadership__status center-ministers__empty" role="alert">负责人加载失败：{{ error }}</p>
    <p v-else-if="!people.length" class="organization-leadership__status center-ministers__empty">{{ emptyText }}</p>
    <div v-else class="organization-leadership__grid center-ministers__grid">
      <article
        v-for="person in people"
        :key="person.id"
        class="organization-leadership-card center-minister-card"
        :data-testid="cardTestId"
      >
        <div class="organization-leadership-card__identity center-minister-card__identity">
          <HsdAvatar :name="person.name" :src="resolvePublicAvatar(person)" size="md" />
          <div>
            <h3>{{ person.name }}</h3>
            <span>{{ roleLabel }}</span>
          </div>
        </div>
        <div class="organization-leadership-card__meta center-minister-card__meta">
          <span>{{ person.centerName }}</span>
          <span>{{ person.memberDuty }}</span>
          <span v-if="person.baizeDirection">{{ person.baizeDirection }}</span>
        </div>
        <NuxtLink class="organization-leadership-card__link center-minister-card__link" :to="`/people/${person.id}`">
          查看成员详情 →
        </NuxtLink>
      </article>
    </div>
  </section>
</template>
