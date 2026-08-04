<script setup lang="ts">
definePageMeta({ layout: "admin" });
await navigateTo({ path: "/admin/content/home", query: { view: "visuals" } }, { redirectCode: 301, replace: true });
</script>

<template>
  <div />
</template>
