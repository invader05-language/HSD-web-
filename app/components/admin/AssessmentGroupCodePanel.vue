<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import type { GroupCodeListDto, GroupCodeReferenceDto } from '../../../packages/api-client/src';
import type { RoundGroupGateway } from '../../services/recruitment/recruitment-gateway';
import type { GroupCodeUploadOptions, GroupCodeUploadPhase, GroupCodeUploadTask } from '../../services/recruitment/group-code-upload';
import PrivateGroupCode from '../member/PrivateGroupCode.vue';
import { getRecruitmentAssessmentMessage } from '../../utils/recruitment-assessment-messages';
const props = defineProps<{ batchId: string; owner: boolean; gateway: RoundGroupGateway }>();
const data = ref<GroupCodeListDto>(), selected = ref(''), loading = ref(false), error = ref(''), expired = ref(false);
type Operation = { phase?: GroupCodeUploadPhase; message?: string; task?: GroupCodeUploadTask; uploadId?: string; failed?: boolean };
const operations = ref<Record<string, Operation>>({});
let generation = 0, epoch = 0, controller: AbortController | undefined;
const busy = ref(false);
const center = computed(() => data.value?.centers.find(c => c.id === selected.value));
const key = (round: number) => `${selected.value}:${round}`;
const operation = (round: number) => operations.value[key(round)];
const phaseText: Record<GroupCodeUploadPhase, string> = { validating: '正在校验图片…', uploading: '正在上传二维码…', checking: '文件已上传，正在安全检查…', saving: '安全检查通过，正在保存配置…', confirming: '正在核对服务器保存状态…', saved: '已上传并保存' };
function unauthorized() { epoch++; generation++; controller?.abort(); busy.value = false; loading.value = false; data.value = undefined; operations.value = {}; expired.value = true; error.value = '登录已过期，请重新登录后继续。'; }
async function load() {
  if (expired.value) return;
  const request = ++generation; loading.value = true;
  try {
    const response = await props.gateway.getAssessmentGroupCodes(props.batchId);
    if (request !== generation) return;
    data.value = response;
    if (!response.centers.some(c => c.id === selected.value)) selected.value = response.centers[0]?.id ?? '';
    error.value = '';
  } catch (cause) {
    if (request !== generation) return;
    if ((cause as { status?: number })?.status === 401) unauthorized();
    else error.value = getRecruitmentAssessmentMessage(cause, '二维码配置读取失败，请刷新；暂不能确认服务器配置。');
  } finally { if (request === generation) loading.value = false; }
}
watch(() => props.batchId, () => { epoch++; controller?.abort(); busy.value = false; data.value = undefined; selected.value = ''; operations.value = {}; expired.value = false; void load(); }, { immediate: true });
onBeforeUnmount(() => { epoch++; generation++; controller?.abort(); });
async function run(round: number, action: (options: GroupCodeUploadOptions) => Promise<GroupCodeReferenceDto>) {
  if (!center.value || busy.value || expired.value) return;
  const requestEpoch = epoch, operationKey = key(round), centerId = center.value.id;
  controller = new AbortController(); busy.value = true; operations.value[operationKey] = {};
  try {
    const saved = await action({ signal: controller.signal, onProgress: event => { if (requestEpoch === epoch) operations.value[operationKey] = { phase: event.phase, uploadId: event.uploadId }; } });
    if (requestEpoch !== epoch) return;
    const row = data.value?.centers.find(c => c.id === centerId)?.rounds.find(c => c.round === round);
    if (row) Object.assign(row, saved);
    operations.value[operationKey] = { message: saved.status === 'READY' ? '已上传并保存' : '二维码已移除。' };
    await load();
  } catch (cause) {
    if (requestEpoch !== epoch) return;
    if ((cause as { status?: number })?.status === 401) { unauthorized(); return; }
    const pending = (cause as { task?: GroupCodeUploadTask })?.task;
    const old = data.value?.centers.find(c => c.id === centerId)?.rounds.find(c => c.round === round);
    operations.value[operationKey] = {
      message: getRecruitmentAssessmentMessage(cause, '操作未完成，请重试。') + (pending ? '' : old?.status === 'READY' ? ' 原二维码继续有效。' : ' 本轮尚未配置二维码。'),
      task: pending, failed: !pending,
    };
  } finally { if (requestEpoch === epoch) busy.value = false; }
}
function upload(event: Event, round: number, version: number) {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = '';
  const batchId = props.batchId, centerId = center.value?.id;
  if (file && centerId) void run(round, options => props.gateway.uploadAssessmentGroupCode(batchId, centerId, round, version, file, options));
}
function resume(round: number) { const task = operation(round)?.task; if (task) void run(round, options => props.gateway.resumeAssessmentGroupCode(task, options)); }
function remove(round: number, version: number) {
  const batchId = props.batchId, centerId = center.value?.id;
  if (centerId) void run(round, () => props.gateway.bindAssessmentGroupCode(batchId, centerId, round, version, null));
}
function updatedAt(value: string | null | undefined) { return value ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value)) : ''; }
</script>

<template>
  <section class="assessment-codes" aria-label="分轮群二维码配置">
    <header><div><p class="eyebrow">群二维码</p><h2>分轮群二维码配置</h2></div><label v-if="owner && data?.centers.length">配置中心<select v-model="selected" :disabled="busy"><option v-for="item in data.centers" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><strong v-else>{{ center?.name }}</strong></header>
    <p>管理员保存后即可在此预览；成员通过且结果公开后可查看对应轮次二维码。支持 PNG、JPEG、WebP，最大 5 MiB。</p>
    <p v-if="error" role="alert">{{ error }} <a v-if="expired" href="/login?mode=admin">重新登录</a><button v-else type="button" :disabled="loading || busy" @click="load">刷新配置</button></p>
    <p v-if="loading && !data" role="status">正在读取二维码配置…</p>
    <div v-if="center" class="assessment-codes__grid"><article v-for="code in center.rounds" :key="`${center.id}-${code.round}`">
      <h3>第 {{ code.round }} 轮</h3>
      <PrivateGroupCode :code="code" context="admin" :read-image="gateway.readGroupCodeImage" @refresh="load" @unauthorized="unauthorized" />
      <p v-if="code.status === 'READY'" class="assessment-codes__saved">✓ 已上传并保存</p>
      <p v-if="code.updatedAt" class="assessment-codes__updated">最近更新：{{ updatedAt(code.updatedAt) }}</p>
      <p v-if="operation(code.round)?.phase" role="status">{{ phaseText[operation(code.round)!.phase!] }}</p>
      <p v-if="operation(code.round)?.message" :role="operation(code.round)?.failed ? 'alert' : 'status'">{{ operation(code.round)?.message }}</p>
      <div class="assessment-codes__actions">
        <button v-if="operation(code.round)?.task" type="button" class="button" :disabled="busy" @click="resume(code.round)">检查保存状态并继续</button>
        <label v-else class="button" :class="{ 'is-disabled': busy }">{{ busy ? '处理中…' : code.status === 'READY' ? '替换二维码' : '上传二维码' }}<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy" :aria-label="`第${code.round}轮上传二维码`" @change="upload($event, code.round, code.version)"></label>
        <button v-if="code.status === 'READY'" class="button button--ghost" type="button" :disabled="busy || !!operation(code.round)?.task" @click="remove(code.round, code.version)">移除</button>
      </div>
    </article></div>
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
.assessment-codes__saved { color: #326844; }.assessment-codes__updated { color: #696662; font-size: 12px; }
.assessment-codes__actions { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }.assessment-codes__actions label { position: relative; cursor: pointer; overflow: hidden; }
.assessment-codes__actions input { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; }.is-disabled { opacity: .5; }
@media (max-width: 600px) { .assessment-codes { padding: 16px; } }
</style>
