<script setup lang="ts">
const props = defineProps<{
  modelValue: number;
  pageCount: number;
  label: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [page: number];
}>();

const pages = computed(() => Array.from({ length: props.pageCount }, (_, index) => index + 1));

function selectPage(page: number) {
  emit("update:modelValue", Math.min(Math.max(page, 1), props.pageCount));
}
</script>

<template>
  <nav v-if="pageCount > 1" class="pagination" :aria-label="label">
    <button type="button" :disabled="modelValue === 1" @click="selectPage(modelValue - 1)">上一页</button>
    <button
      v-for="page in pages"
      :key="page"
      type="button"
      :class="{ 'is-active': modelValue === page }"
      :aria-current="modelValue === page ? 'page' : undefined"
      @click="selectPage(page)"
    >{{ page }}</button>
    <button type="button" :disabled="modelValue === pageCount" @click="selectPage(modelValue + 1)">下一页</button>
  </nav>
</template>
