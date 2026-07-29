<script setup lang="ts">
const props = defineProps<{
  filters: readonly string[];
  modelValue: string;
  resultLabel: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <div class="filter-toolbar" aria-label="内容筛选">
    <div class="filter-toolbar__options">
      <button
        v-for="filter in props.filters"
        :key="filter"
        type="button"
        :class="{ 'is-active': modelValue === filter }"
        @click="emit('update:modelValue', filter)"
      >
        {{ filter }}
      </button>
    </div>
    <span>{{ resultLabel }}</span>
  </div>
</template>

