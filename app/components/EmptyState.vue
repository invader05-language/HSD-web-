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
  <div class="empty-state" role="status">
    <strong>{{ title }}</strong>
    <p>{{ description }}</p>
  </div>
</template>
