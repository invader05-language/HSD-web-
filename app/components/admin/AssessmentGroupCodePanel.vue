<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { GroupCodeListDto } from '../../../packages/api-client/src';
import type { RoundGroupGateway } from '../../services/recruitment/recruitment-gateway';
import PrivateGroupCode from '../member/PrivateGroupCode.vue';
import { getRecruitmentAssessmentMessage } from '../../utils/recruitment-assessment-messages';
const props = defineProps<{ batchId: string; owner: boolean; gateway: RoundGroupGateway }>();
const data = ref<GroupCodeListDto>(), selected = ref(''), busy = ref(false), error = ref(''), success = ref('');
let generation = 0;
const center = computed(() => data.value?.centers.find(c => c.id === selected.value));
async function load() {
  const request = ++generation;
  try {
    const response = await props.gateway.getAssessmentGroupCodes(props.batchId);
    if (request !== generation) return;
    data.value = response;
    if (!response.centers.some(c => c.id === selected.value)) selected.value = response.centers[0]?.id ?? '';
    error.value = '';
  } catch (cause) { if (request === generation) error.value = getRecruitmentAssessmentMessage(cause, '二维码配置加载失败，请重试。'); }
}
watch(() => props.batchId, () => { data.value = undefined; selected.value = ''; void load(); }, { immediate: true });
async function upload(event: Event, round: number, version: number) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0]; input.value = '';
  if (!file || !center.value || busy.value) return;
  busy.value = true; error.value = ''; success.value = '';
  try { await props.gateway.uploadAssessmentGroupCode(props.batchId, center.value.id, round, version, file); success.value = '二维码已更新。'; await load(); }
  catch (cause) { error.value = getRecruitmentAssessmentMessage(cause, '上传未完成，请重试；原二维码继续有效。'); }
  finally { busy.value = false; }
}
async function remove(round: number, version: number) {
  if (!center.value || busy.value) return;
  busy.value = true; error.value = ''; success.value = '';
  try { await props.gateway.bindAssessmentGroupCode(props.batchId, center.value.id, round, version, null); success.value = '二维码已移除。'; await load(); }
  catch (cause) { error.value = getRecruitmentAssessmentMessage(cause, '移除未完成，请刷新后重试。'); }
  finally { busy.value = false; }
}
</script>

<template>
  <section class="assessment-codes" aria-label="分轮群二维码配置">
    <header><div><p class="eyebrow">群二维码</p><h2>分轮群二维码配置</h2></div><label v-if="owner && data?.centers.length">配置中心<select v-model="selected" :disabled="busy"><option v-for="item in data.centers" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><strong v-else>{{ center?.name }}</strong></header>
    <p>仅通过且已发布结果的用户可查看对应轮次二维码。支持 PNG、JPEG、WebP，最大 5 MiB。</p>
    <p v-if="error" role="alert">{{ error }} <button type="button" @click="load">刷新配置</button></p><p v-if="success" role="status">{{ success }}</p>
    <div v-if="center" class="assessment-codes__grid"><article v-for="code in center.rounds" :key="`${center.id}-${code.round}`"><h3>第 {{ code.round }} 轮</h3><PrivateGroupCode :code="code" :read-image="gateway.readGroupCodeImage" @refresh="load" /><div class="assessment-codes__actions"><label class="button" :class="{ 'is-disabled': busy }">{{ busy ? '处理中…' : code.status === 'READY' ? '替换二维码' : '上传二维码' }}<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy" :aria-label="`第${code.round}轮上传二维码`" @change="upload($event, code.round, code.version)"></label><button v-if="code.status === 'READY'" class="button button--ghost" type="button" :disabled="busy" @click="remove(code.round, code.version)">移除</button></div></article></div>
    <p v-else-if="data && !data.centers.length">当前批次没有可配置的中心。</p>
  </section>
</template>

<style scoped>
.assessment-codes { margin: 24px 0; padding: 28px; background: white; border: 1px solid #e5e2dd; }
.assessment-codes header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.assessment-codes h2 { margin: 0; font-size: 21px; }.assessment-codes > p { color: #696662; font-size: 14px; }
.assessment-codes select { display: block; min-width: 200px; padding: 8px; margin-top: 6px; }
.assessment-codes__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr)); gap: 20px; }
.assessment-codes__grid article { padding: 20px; border: 1px solid #e5e2dd; text-align: center; min-width: 0; }
.assessment-codes__grid h3 { margin: 0; font-size: 16px; }
.assessment-codes__actions { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }.assessment-codes__actions label { position: relative; cursor: pointer; overflow: hidden; }
.assessment-codes__actions input { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; }.is-disabled { opacity: .5; }
@media (max-width: 600px) { .assessment-codes { padding: 16px; } }
</style>
