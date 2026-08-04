<script setup lang="ts">
import {
  getAdminNavigationForAccess,
  getAdminNavigationState,
  getAdminTopbarLabel
} from "~/data/admin-platform";
import { getAdminQualificationLabel } from "~/data/admin-system";
import { useSessionStore } from "~/stores/session";

const route = useRoute();
const session = useSessionStore();
const activeNavigation = computed(() => getAdminNavigationState(route.path));
const topbarLabel = computed(() => getAdminTopbarLabel(route.path));
const navigation = computed(() => getAdminNavigationForAccess(session));
const currentIdentity = computed(() => session.currentAccount ?? null);
const adminLevelLabel = computed(() => session.currentAccount
  ? getAdminQualificationLabel(session.currentAccount)
  : "未登录");
const expandedGroups = ref(new Set([activeNavigation.value.groupId]));
const mobileNavigationOpen = ref(false);

watch(
  () => activeNavigation.value.groupId,
  (groupId) => {
    expandedGroups.value = new Set([...expandedGroups.value, groupId]);
  }
);

watch(
  () => route.fullPath,
  () => {
    mobileNavigationOpen.value = false;
  }
);

function toggleGroup(groupId: string) {
  const next = new Set(expandedGroups.value);
  if (next.has(groupId)) {
    next.delete(groupId);
  } else {
    next.add(groupId);
  }
  expandedGroups.value = next;
}
</script>

<template>
  <div class="admin-frame">
    <a class="skip-link" href="#admin-main-content">跳至管理内容</a>

    <aside class="admin-sidebar">
      <NuxtLink class="admin-brand" to="/admin/recruitment" aria-label="HSD 管理台">
        <span>&lt; HSD &gt;</span>
        <strong>管理台</strong>
      </NuxtLink>

      <div class="admin-sidebar__section">
        <span>Administration</span>
        <p>联盟业务与内容管理</p>
      </div>

      <nav aria-label="管理端导航">
        <section
          v-for="(group, groupIndex) in navigation"
          :key="group.id"
          class="admin-nav-group"
          :class="{ 'is-current': activeNavigation.groupId === group.id }"
        >
          <button
            type="button"
            :aria-expanded="expandedGroups.has(group.id)"
            @click="toggleGroup(group.id)"
          >
            <span>{{ String(groupIndex + 1).padStart(2, "0") }}</span>
            <strong>{{ group.label }}</strong>
            <i aria-hidden="true">{{ expandedGroups.has(group.id) ? "−" : "+" }}</i>
          </button>
          <div v-if="expandedGroups.has(group.id)">
            <NuxtLink
              v-for="item in group.items"
              :key="item.id"
              :to="item.to"
              :class="{ 'is-active': activeNavigation.itemId === item.id }"
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </section>
      </nav>

      <div class="admin-sidebar__footer">
        <span>当前身份</span>
        <strong>{{ currentIdentity?.name ?? "未登录" }}</strong>
        <small>{{ adminLevelLabel }} · {{ currentIdentity?.account ?? "-" }}</small>
      </div>
    </aside>

    <div class="admin-workspace">
      <header class="admin-topbar">
        <div>
          <span>{{ topbarLabel.group }}</span>
          <strong>/ {{ topbarLabel.page }}</strong>
        </div>
        <div class="admin-topbar__actions">
          <NuxtLink to="/">返回官网</NuxtLink>
          <span class="admin-topbar__identity">{{ currentIdentity?.name ?? "未登录" }} · {{ adminLevelLabel }}</span>
          <button
            type="button"
            class="admin-mobile-nav-trigger"
            :aria-expanded="mobileNavigationOpen"
            aria-controls="admin-mobile-navigation"
            aria-label="打开管理导航"
            @click="mobileNavigationOpen = !mobileNavigationOpen"
          ><span aria-hidden="true">&#9776;</span></button>
          <button type="button" @click="session.signOut(); navigateTo('/')">退出</button>
        </div>
      </header>

      <nav
        v-if="mobileNavigationOpen"
        id="admin-mobile-navigation"
        class="admin-mobile-nav"
        aria-label="移动端管理导航"
      >
        <section v-for="group in navigation" :key="group.id">
          <strong>{{ group.label }}</strong>
          <NuxtLink
            v-for="item in group.items"
            :key="item.id"
            :to="item.to"
            :class="{ 'is-active': activeNavigation.itemId === item.id }"
            @click="mobileNavigationOpen = false"
          >{{ item.label }}</NuxtLink>
        </section>
      </nav>

      <main id="admin-main-content">
        <slot />
      </main>
    </div>
  </div>
</template>
