<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <header class="admin-page-heading">
    <div>
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p class="admin-page-heading__intro">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-heading__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
