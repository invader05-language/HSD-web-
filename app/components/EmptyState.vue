<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  description?: string;
}>(), {
  title: "暂时没有匹配内容",
  description: "请尝试切换筛选条件，或稍后再回来查看。"
});
</script>

<template>
  <div class="empty-state">
    <div class="empty-state__message" role="status">
      <strong>{{ title }}</strong>
      <p>{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>
