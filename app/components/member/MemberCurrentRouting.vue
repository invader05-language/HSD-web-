<script setup lang="ts">
import PrivateGroupCode from "./PrivateGroupCode.vue";
import type { AssessmentCenterDto, GroupCodeReferenceDto } from "../../../packages/api-client/src";

defineProps<{
  center: AssessmentCenterDto;
  round?: number;
  groupCode?: GroupCodeReferenceDto | null;
  finalResultPending?: boolean;
  readImage: (url: string) => Promise<Blob>;
}>();
defineEmits<{ refresh: []; unauthorized: [] }>();
</script>

<template>
  <section class="member-current-routing" aria-label="当前考核去向">
    <p class="member-current-routing__eyebrow">所属中心</p>
    <h3>{{ center.name }}</h3>
    <p>部门群二维码</p>
    <p v-if="finalResultPending" class="member-current-routing__pending">最终结果待联盟总负责人发布</p>
    <PrivateGroupCode
      v-if="groupCode"
      :code="groupCode"
      :read-image="readImage"
      @refresh="$emit('refresh')"
      @unauthorized="$emit('unauthorized')"
    />
  </section>
</template>

<style scoped>
.member-current-routing { margin: 24px; border-top: 1px solid #e5e2dd; padding-top: 24px; text-align: center; }
.member-current-routing h3 { margin: 4px 0; }
.member-current-routing p { margin: 4px 0; }
.member-current-routing__eyebrow { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
.member-current-routing__pending { font-weight: 600; color: #9a5b18; }
</style>
