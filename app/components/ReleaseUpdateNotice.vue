<script setup lang="ts">
const { updateAvailable, refreshToCurrentRelease } = useReleaseUpdate();
</script>

<template>
  <div v-if="updateAvailable" class="release-update-notice" role="status">
    <span>平台已更新，建议刷新页面。</span>
    <button type="button" @click="refreshToCurrentRelease">刷新页面</button>
  </div>
</template>

<style scoped>
.release-update-notice { position: fixed; z-index: 1000; right: 1rem; bottom: 1rem; display: flex; gap: .75rem; align-items: center; padding: .75rem 1rem; border: 1px solid var(--brand-red, #b1202b); background: #fff; color: #1f1d1c; box-shadow: 0 4px 18px rgb(0 0 0 / 12%); }
.release-update-notice button { border: 0; background: var(--brand-red, #b1202b); color: #fff; padding: .4rem .7rem; cursor: pointer; }
</style>
