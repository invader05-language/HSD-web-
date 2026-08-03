<script setup lang="ts">
import { SITE_CONFIG } from "~/data/site";
import { useSessionStore } from "~/stores/session";
import { useCurrentMember } from "~/composables/useCurrentMember";

const route = useRoute();
const session = useSessionStore();
const { profile: currentMember } = useCurrentMember();
const mobileOpen = ref(false);
const memberMenuOpen = ref(false);
const memberControl = ref<HTMLElement | null>(null);

watch(() => route.fullPath, () => {
  mobileOpen.value = false;
  memberMenuOpen.value = false;
});

function closeMemberMenuOnOutsideClick(event: MouseEvent) {
  if (memberControl.value && !memberControl.value.contains(event.target as Node)) {
    memberMenuOpen.value = false;
  }
}

function handleMemberMenuKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") memberMenuOpen.value = false;
}

function signOut() {
  memberMenuOpen.value = false;
  session.signOut();
  navigateTo("/");
}

onMounted(() => {
  document.addEventListener("click", closeMemberMenuOnOutsideClick);
  document.addEventListener("keydown", handleMemberMenuKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeMemberMenuOnOutsideClick);
  document.removeEventListener("keydown", handleMemberMenuKeydown);
});
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner shell">
      <NuxtLink class="brand-lockup" to="/" aria-label="返回白云 HSD 开发者部落首页">
        <span class="brand-lockup__mark">{{ SITE_CONFIG.shortName }}</span>
        <span class="brand-lockup__name">{{ SITE_CONFIG.name }}</span>
      </NuxtLink>

      <button
        class="nav-toggle"
        type="button"
        :aria-expanded="mobileOpen"
        aria-controls="site-navigation"
        @click="mobileOpen = !mobileOpen"
      >
        {{ mobileOpen ? "关闭" : "菜单" }}
      </button>

      <nav id="site-navigation" class="site-nav" :class="{ 'site-nav--open': mobileOpen }" aria-label="主导航">
        <NuxtLink
          v-for="item in SITE_CONFIG.navigation"
          :key="item.to"
          :to="item.to"
          :class="{ 'is-active': route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to)) }"
        >
          {{ item.label }}
        </NuxtLink>
        <NuxtLink v-if="!session.isAuthenticated" class="site-nav__login" to="/login">登录</NuxtLink>
        <div v-else ref="memberControl" class="site-nav__member">
          <button
            class="site-nav__member-trigger"
            type="button"
            :aria-expanded="memberMenuOpen"
            aria-haspopup="menu"
            :aria-label="`${currentMember.name}的成员菜单`"
            @click.stop="memberMenuOpen = !memberMenuOpen"
          >
            <HsdAvatar :name="currentMember.name" :src="currentMember.avatarUrl" size="sm" />
            <strong>{{ currentMember.name }}</strong>
            <span aria-hidden="true">⌄</span>
          </button>
          <nav v-if="memberMenuOpen" class="site-nav__member-menu" aria-label="成员账户菜单" role="menu">
            <NuxtLink role="menuitem" to="/member">个人中心</NuxtLink>
            <NuxtLink role="menuitem" to="/member/profile">编辑个人资料</NuxtLink>
            <NuxtLink role="menuitem" to="/member/results">结果中心</NuxtLink>
            <hr>
            <button role="menuitem" type="button" @click="signOut">退出登录</button>
          </nav>
        </div>
      </nav>
    </div>
  </header>
</template>
