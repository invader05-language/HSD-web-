<script setup lang="ts">
defineProps<{ status: string }>();
</script>

<template>
  <span class="admin-result-pill" :data-result="status">{{ status }}</span>
</template>
