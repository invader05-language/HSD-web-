<script setup lang="ts">
import type { MemberProfile } from "~/data/member-profile";

type ActiveItem = "overview" | "applications" | "results" | "activities" | "growth" | "honors" | "profile";

const props = withDefaults(defineProps<{
  profile: Pick<MemberProfile, "name" | "identity">;
  avatarSrc?: string;
  active: ActiveItem;
  signingOut?: boolean;
  signOutError?: string;
}>(), { avatarSrc: undefined, signingOut: false, signOutError: "" });

defineEmits<{ signOut: [] }>();
</script>

<template>
  <aside class="member-space-nav">
    <div class="member-space__identity">
      <HsdAvatar :name="props.profile.name || '成员'" :src="props.avatarSrc" size="md" />
      <div><strong>{{ props.profile.name || "成员" }}</strong><span>{{ props.profile.identity || "成员" }}</span></div>
    </div>
    <nav aria-label="成员空间导航">
      <NuxtLink to="/member" :class="{ 'is-active': props.active === 'overview' }" :aria-current="props.active === 'overview' ? 'page' : undefined">个人概览</NuxtLink>
      <NuxtLink to="/member/applications" :class="{ 'is-active': props.active === 'applications' }" :aria-current="props.active === 'applications' ? 'page' : undefined">申请进度</NuxtLink>
      <NuxtLink to="/member/results" :class="{ 'is-active': props.active === 'results' }" :aria-current="props.active === 'results' ? 'page' : undefined">结果中心</NuxtLink>
      <NuxtLink to="/member/activities" :class="{ 'is-active': props.active === 'activities' }" :aria-current="props.active === 'activities' ? 'page' : undefined">活动与比赛</NuxtLink>
      <NuxtLink to="/member/growth" :class="{ 'is-active': props.active === 'growth' }" :aria-current="props.active === 'growth' ? 'page' : undefined">成长记录</NuxtLink>
      <NuxtLink to="/member/honors" :class="{ 'is-active': props.active === 'honors' }" :aria-current="props.active === 'honors' ? 'page' : undefined">我的荣誉</NuxtLink>
      <NuxtLink to="/member/profile" :class="{ 'is-active': props.active === 'profile' }" :aria-current="props.active === 'profile' ? 'page' : undefined">编辑个人资料</NuxtLink>
    </nav>
    <button type="button" :disabled="props.signingOut" @click="$emit('signOut')">{{ props.signingOut ? "退出中…" : "退出登录" }}</button>
    <p v-if="props.signOutError" role="alert">{{ props.signOutError }}</p>
  </aside>
</template>
