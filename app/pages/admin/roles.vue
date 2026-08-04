<script setup lang="ts">
import { useSessionStore } from "~/stores/session";

definePageMeta({ layout: "admin" });

const session = useSessionStore();
onMounted(() => {
  navigateTo(session.canManageAdminAccounts ? "/admin/accounts" : "/admin/forbidden", {
    replace: true
  });
});
</script>

<template>
  <p class="sr-only">正在跳转至兼容页面。</p>
</template>
