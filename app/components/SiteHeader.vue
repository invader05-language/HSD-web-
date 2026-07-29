<script setup lang="ts">
import { SITE_CONFIG } from "~/data/site";

const route = useRoute();
const mobileOpen = ref(false);

watch(() => route.fullPath, () => {
  mobileOpen.value = false;
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
        <NuxtLink class="site-nav__login" to="/login">登录</NuxtLink>
      </nav>
    </div>
  </header>
</template>

