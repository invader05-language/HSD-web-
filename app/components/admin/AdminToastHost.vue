<script setup lang="ts">
import { useAdminToast } from "~/composables/useAdminToast";

const { toast, dismiss } = useAdminToast();
</script>

<template>
  <Teleport to="body">
    <div class="admin-toast-viewport" aria-live="polite" aria-atomic="true">
      <Transition name="admin-toast" mode="out-in">
        <div v-if="toast" :key="toast.id" class="admin-toast" :class="`admin-toast--${toast.kind}`" data-testid="admin-toast" role="status">
          <span>{{ toast.message }}</span>
          <button type="button" aria-label="关闭提示" @click="dismiss">×</button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
