<script setup lang="ts">
import {
  ADMIN_NAVIGATION,
  getAdminNavigationState
} from "~/data/admin-platform";
import { useSessionStore } from "~/stores/session";

const route = useRoute();
const session = useSessionStore();
const activeNavigation = computed(() => getAdminNavigationState(route.path));
const expandedGroups = ref(new Set([activeNavigation.value.groupId]));

watch(
  () => activeNavigation.value.groupId,
  (groupId) => {
    expandedGroups.value = new Set([...expandedGroups.value, groupId]);
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
          v-for="(group, groupIndex) in ADMIN_NAVIGATION"
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
        <strong>联盟总负责人</strong>
        <small>前端原型账号</small>
      </div>
    </aside>

    <div class="admin-workspace">
      <header class="admin-topbar">
        <div>
          <span>组织管理</span>
          <strong>/ 招新考核</strong>
        </div>
        <div class="admin-topbar__actions">
          <NuxtLink to="/">返回官网</NuxtLink>
          <span>{{ session.memberName }}</span>
          <button type="button" @click="session.signOut(); navigateTo('/')">退出</button>
        </div>
      </header>

      <main id="admin-main-content">
        <slot />
      </main>
    </div>
  </div>
</template>
