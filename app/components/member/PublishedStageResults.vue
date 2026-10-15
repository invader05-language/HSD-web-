<script setup lang="ts">
import { computed } from 'vue';
import PrivateGroupCode from './PrivateGroupCode.vue';
import type { MemberStageResultsDto } from '../../../packages/api-client/src';
import { baizeDirectionLabel } from '../../utils/baize-direction-label';
const props = defineProps<{ results: MemberStageResultsDto; readImage: (url: string) => Promise<Blob> }>();
defineEmits<{ refresh: []; unauthorized: [] }>();
const stages = computed(() => [...props.results.stages].sort((a, b) => b.round - a.round));
const publishedTransfer = computed(() => props.results.transfer?.publishedAt ? props.results.transfer : undefined);
const visibleStages = computed(() => publishedTransfer.value
  ? stages.value.filter(stage => !(stage.round === 1 && stage.outcome === 'FAILED'))
  : stages.value);
const latest = computed(() => visibleStages.value[0]);
const history = computed(() => visibleStages.value.slice(1).filter(s => publishedTransfer.value || s.outcome === 'PASSED'));
const entryCode = computed(() => publishedTransfer.value ? props.results.entryGroupCode : undefined);
const waitingForEntry = computed(() => Boolean(publishedTransfer.value && (latest.value?.round ?? 0) < 2));
const time = (value: string) => Number.isFinite(Date.parse(value)) && new Date(value).getUTCFullYear() !== 1970
  ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '—';
</script>

<template>
  <article class="member-result-card published-stages">
    <header class="member-result-card__header"><span>{{ results.batchName }} · {{ results.center?.name }}</span><strong class="member-result-status">已发布结果</strong></header>
    <section v-if="publishedTransfer" class="member-result-summary published-stages__transfer"><p>原第一志愿：{{ publishedTransfer.fromCenter.name }}</p><h2>已调入{{ publishedTransfer.toCenter.name }}</h2><p>确认方向：{{ baizeDirectionLabel(publishedTransfer.baizeDirection) }} · 调剂转入，第2轮起</p></section>
    <section v-if="waitingForEntry && entryCode" class="published-stages__current"><h3>{{ publishedTransfer?.toCenter.name }} · 第一轮入场群二维码</h3><PrivateGroupCode :code="entryCode" :read-image="readImage" @refresh="$emit('refresh')" @unauthorized="$emit('unauthorized')" /></section>
    <template v-if="latest">
      <div class="member-result-summary"><p>第 {{ latest.round }} 轮 · {{ latest.center?.name ?? results.center?.name }}</p><h2>{{ latest.outcome === 'PASSED' ? '本轮考核通过' : '本轮考核未通过' }}</h2><p>发布时间：{{ time(latest.publishedAt) }}</p></div>
      <section v-if="latest.outcome === 'PASSED'" class="published-stages__current"><h3>第 {{ latest.round }} 轮群二维码</h3><PrivateGroupCode v-if="latest.groupCode" :key="`${results.batchId}-${latest.round}`" :code="latest.groupCode" :read-image="readImage" @refresh="$emit('refresh')" @unauthorized="$emit('unauthorized')" /></section>
      <details v-if="history.length || (entryCode && !waitingForEntry)" class="published-stages__history"><summary>{{ publishedTransfer ? '查看历史结果与群二维码' : `查看已通过轮次（${history.length}）` }}</summary><section v-if="entryCode && !waitingForEntry"><h3>{{ publishedTransfer?.toCenter.name }} · 第一轮入场群二维码（调剂转入）</h3><PrivateGroupCode :code="entryCode" :read-image="readImage" @refresh="$emit('refresh')" @unauthorized="$emit('unauthorized')" /></section><section v-for="stage in history" :key="stage.round"><h3>第 {{ stage.round }} 轮 · {{ stage.center?.name ?? results.center?.name }} · {{ stage.outcome === 'PASSED' ? '已通过' : '未通过' }}</h3><PrivateGroupCode v-if="stage.outcome === 'PASSED' && stage.groupCode" :code="stage.groupCode" :read-image="readImage" @refresh="$emit('refresh')" @unauthorized="$emit('unauthorized')" /></section></details>
    </template>
    <p v-else-if="!publishedTransfer" class="published-stages__pending">暂无已发布的阶段考核结果</p>
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
