<script setup lang="ts">
import {
  getAdminNavigationForAccess,
  getAdminNavigationState,
  getAdminTopbarLabel
} from "~/data/admin-platform";
import { RELEASE_FEATURES } from "~/config/release-features";
import { getAdminQualificationLabel } from "~/data/admin-system";
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import { createReleaseNoticeState } from "~/utils/admin-release-access";

const route = useRoute();
const session = useSessionStore();
const sessionGateway = useSessionGateway();
const apiRuntime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const activeNavigation = computed(() => getAdminNavigationState(route.path));
const topbarLabel = computed(() => getAdminTopbarLabel(route.path));
const navigation = computed(() => getAdminNavigationForAccess({
  canManageAdminAccounts: session.canManageAdminAccounts,
  canManageOrganizationPersonnel: session.canManageAdminAccounts,
  canConfigurePortal: session.hasCapability("portal.configure"),
}, RELEASE_FEATURES, { useMockApi: apiRuntime.public.useMockApi }));
const currentIdentity = computed(() => session.currentAccount ?? null);
const { notice: releaseNotice, receive: receiveReleaseNotice } = createReleaseNoticeState();
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

function clearReleaseNoticeQuery() {
  if (!import.meta.client) return;

  const url = new URL(window.location.href);
  url.searchParams.delete("notice");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function syncReleaseNotice(value: unknown) {
  if (receiveReleaseNotice(value)) {
    clearReleaseNoticeQuery();
  }
}

onMounted(() => {
  syncReleaseNotice(route.query.notice);
});

watch(
  () => route.query.notice,
  (notice) => syncReleaseNotice(notice)
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

async function signOut() {
  const signedOut = await session.signOutForRuntime(apiRuntime.public, sessionGateway);
  if (signedOut) await navigateTo("/");
}
</script>

<template>
  <div class="admin-frame">
    <a class="skip-link" href="#admin-main-content">跳至管理内容</a>

    <aside class="admin-sidebar">
      <NuxtLink class="admin-brand" to="/admin" aria-label="HSD 管理台">
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
          <button type="button" :disabled="session.isSigningOut" @click="signOut">{{ session.isSigningOut ? "退出中…" : "退出" }}</button>
          <span v-if="session.signOutError" class="admin-signout-error" role="alert">{{ session.signOutError }}</span>
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
        <p v-if="releaseNotice" class="admin-release-notice" role="status">
          {{ releaseNotice }}
        </p>
        <slot />
      </main>
    </div>
  </div>
</template>
