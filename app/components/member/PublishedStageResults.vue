<script setup lang="ts">
import { computed } from 'vue';
import PrivateGroupCode from './PrivateGroupCode.vue';
import type { MemberStageResultsDto } from '../../../packages/api-client/src';
const props = defineProps<{ results: MemberStageResultsDto; readImage: (url: string) => Promise<Blob> }>();
defineEmits<{ refresh: []; unauthorized: [] }>();
const stages = computed(() => [...props.results.stages].sort((a, b) => b.round - a.round));
const latest = computed(() => stages.value[0]);
const history = computed(() => stages.value.slice(1).filter(s => s.outcome === 'PASSED'));
const time = (value: string) => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
</script>

<template>
  <article class="member-result-card published-stages">
    <header class="member-result-card__header"><span>{{ results.batchName }} · {{ results.center?.name }}</span><strong class="member-result-status">已发布结果</strong></header>
    <template v-if="latest">
      <div class="member-result-summary"><p>第 {{ latest.round }} 轮考核</p><h2>{{ latest.outcome === 'PASSED' ? '本轮考核通过' : '本轮考核未通过' }}</h2><p>发布时间：{{ time(latest.publishedAt) }}</p></div>
      <section v-if="latest.outcome === 'PASSED'" class="published-stages__current"><h3>第 {{ latest.round }} 轮群二维码</h3><PrivateGroupCode v-if="latest.groupCode" :key="`${results.batchId}-${latest.round}`" :code="latest.groupCode" :read-image="readImage" @refresh="$emit('refresh')" @unauthorized="$emit('unauthorized')" /></section>
      <details v-if="history.length" class="published-stages__history"><summary>查看已通过轮次（{{ history.length }}）</summary><section v-for="stage in history" :key="stage.round"><h3>第 {{ stage.round }} 轮 · 已通过</h3><PrivateGroupCode v-if="stage.groupCode" :code="stage.groupCode" :read-image="readImage" @refresh="$emit('refresh')" @unauthorized="$emit('unauthorized')" /></section></details>
    </template>
    <p v-else class="published-stages__pending">暂无已发布的阶段考核结果</p>
  </article>
</template>

<style scoped>
.published-stages { min-width: 0; }
.published-stages__current { text-align: center; margin: 0 24px 24px; border-top: 1px solid #e7e4df; padding-top: 24px; }
.published-stages__current h3 { margin: 0; font-size: 16px; }
.published-stages__history { margin: 24px; padding: 20px; background: #f8f7f4; }
.published-stages__history summary { cursor: pointer; font-weight: 600; }
.published-stages__history section { padding-top: 20px; text-align: center; }
.published-stages__pending { padding: 32px; }
</style>
