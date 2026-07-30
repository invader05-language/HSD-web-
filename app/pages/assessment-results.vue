<script setup lang="ts">
await navigateTo("/member/results", {
  replace: true,
  redirectCode: 301
});
</script>

<template>
  <div class="assessment-page" aria-live="polite">
    <div class="shell assessment-empty">
      <p>正在前往结果中心…</p>
    </div>
  </div>
</template>
