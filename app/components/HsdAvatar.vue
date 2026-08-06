<script setup lang="ts">
defineProps<{
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}>();
</script>

<template>
  <div class="hsd-avatar" :class="`hsd-avatar--${size || 'md'}`">
    <img v-if="src" :src="src" :alt="`${name}的头像`">
    <div v-else class="hsd-avatar__fallback" role="img" :aria-label="`${name}的默认 HSD 头像`">
      <span>HSD</span>
    </div>
  </div>
</template>
