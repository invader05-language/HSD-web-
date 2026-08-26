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
    <div class="member-space-nav__identity">
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

<style scoped>
.member-space-nav {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 34px 24px;
  background: var(--near-black);
  color: #fff;
}

.member-space-nav__identity {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 30px;
  border-bottom: 1px solid #494542;
}

.member-space-nav__identity > div {
  display: grid;
  min-width: 0;
}

.member-space-nav__identity strong,
.member-space-nav__identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-space-nav__identity span {
  color: #aaa39e;
}

.member-space-nav nav {
  display: grid;
  margin-top: 24px;
}

.member-space-nav nav a,
.member-space-nav > button {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  padding: 0 12px;
  border: 0;
  border-left: 3px solid transparent;
  background: transparent;
  color: #d7d2ce;
  cursor: pointer;
  text-align: left;
}

.member-space-nav nav a:hover,
.member-space-nav nav a:focus-visible,
.member-space-nav > button:hover,
.member-space-nav > button:focus-visible,
.member-space-nav nav a.is-active {
  border-left-color: var(--brand-red);
  background: #302d2a;
  color: #fff;
}

.member-space-nav > button {
  margin-top: 24px;
}

.member-space-nav > button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.member-space-nav > p {
  margin: 10px 0 0;
  color: #eea2a8;
  font-size: 13px;
}

@media (max-width: 900px) {
  .member-space-nav {
    display: none;
  }
}
</style>
