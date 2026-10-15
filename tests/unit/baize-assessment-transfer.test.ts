import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils';
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import Workbench from '../../app/components/admin/RecruitmentAssessmentWorkbench.vue';
import { useSessionStore } from '../../app/stores/session';
import { useRecruitmentBatchStore } from '../../app/stores/recruitment-batch';
const runtime = vi.hoisted(() => ({ gateway: undefined as any }));
vi.mock('../../app/composables/useRecruitmentGateway', () => ({ useRecruitmentGateway: () => runtime.gateway }));
enableAutoUnmount(afterEach);
import { isApiResponse, createHsdApiClient } from '../../packages/api-client/src';
import { createApiRecruitmentGateway } from '../../app/services/recruitment/api-recruitment.gateway';
import { useRecruitmentAssessmentStore, assessmentPersonalSaveKey, RECRUITMENT_ASSESSMENT_STORAGE_KEY } from '../../app/stores/recruitment-assessment';
import { getAssessmentRounds, getCurrentAssessmentRound, getAssessmentProcessingStatus } from '../../app/utils/recruitment-assessment-rules';
import PublishedStageResults from '../../app/components/member/PublishedStageResults.vue';
import { memberResultFromApi } from '../../app/data/member-results';
import { mapAdminApplication, formatAdminApplicationSubmittedAt } from '../../app/services/recruitment/admin-application-view';

const fromCenter = { id: 'media', slug: 'media', name: '新媒体中心' };
const toCenter = { id: 'baize', slug: 'baize-development', name: '白泽开发中心' };
const transfer = { id: 'transfer-1', fromCenter, toCenter, entryRound: 2, baizeDirection: 'BACKEND_ARCHITECTURE', createdAt: '2026-10-15T04:00:00.000Z' };
const candidate = { applicationId: 'application-1', person: { id: 'person-1', name: '候选人', studentId: '20260001', grade: '2026', className: '一班' }, acceptsAdjustment: true, baizeDirection: null, preferences: [{ rank: 'FIRST', center: fromCenter }], roundResults: [{ round: 1, outcome: 'FAILED', internalNote: '原中心备注', createdAt: '2026-10-15T03:00:00.000Z' }], adjustmentProposal: null, adjustmentDecision: null, finalResult: null, transferEligibility: { available: true, blockReason: null } };
const batch = { batch: { id: 'batch-1', name: '招新批次', lifecycleStatus: 'closed' }, currentRound: 1, status: 'ASSESSING', version: 3, publishedAt: null, pending: 0, adjustmentPending: 1, canAdvance: false, advanceBlocker: null, nextAction: 'RESOLVE_ADJUSTMENTS', capabilities: { assessmentTransfers: true }, items: [candidate] };
const catalog = { capabilities: { assessmentTransfers: true }, items: [fromCenter, { ...toCenter, action: 'TRANSFER_TO_ASSESSMENT', available: true, blockReason: null }] };
function gateway() {
  return { getAssessmentBatch: vi.fn().mockResolvedValue(batch), getAdjustmentTargets: vi.fn().mockResolvedValue(catalog), transferAssessment: vi.fn().mockResolvedValue({ version: 4, transfer }), getMyResults: vi.fn().mockResolvedValue({ items: [] }) } as any;
}
const record = { batchId: 'batch-1', candidateId: 'application-1', memberId: 'person-1', center: '新媒体中心', assessmentCenter: toCenter, entryRound: 2, transfer, acceptsAdjustment: true, roundOutcomes: { 1: 'failed' } } as any;
const qr = { round: 1, id: 'qr-entry', version: 1, status: 'READY', imageUrl: '/api/v1/recruitment/results/me/group-code/image' };
const stages = { batchId: 'batch-1', batchName: '招新批次', center: toCenter, stages: [{ round: 1, outcome: 'FAILED', publishedAt: '2026-10-15T05:00:00.000Z', groupCode: null, center: fromCenter }], transfer: { ...transfer, createdAt: undefined, publishedAt: '2026-10-15T05:00:00.000Z' }, entryGroupCode: qr, finalGroupCode: null } as any;

beforeEach(() => { localStorage.clear(); setActivePinia(createPinia());
  for (const [name, value] of Object.entries({ computed, nextTick, onBeforeUnmount, reactive, ref, watch })) vi.stubGlobal(name, value);
  vi.stubGlobal('useRoute', () => ({ params: {}, query: {} }));
});
afterEach(() => { vi.unstubAllGlobals(); runtime.gateway = undefined; });
describe('Baize transfer contract and client', () => {
  it('accepts opt-in catalog and transfer records without weakening old responses', () => {
    expect(isApiResponse('GET /api/v1/admin/recruitment/batches/{batchId}/assessments/adjustment-targets', catalog)).toBe(true);
    expect(isApiResponse('GET /api/v1/admin/recruitment/batches/{batchId}/assessments/adjustment-targets', { items: [fromCenter] })).toBe(true);
    expect(isApiResponse('POST /api/v1/admin/recruitment/batches/{batchId}/assessments/{applicationId}/assessment-transfers' as any, { version: 4, transfer })).toBe(true);
  });
  it('uses the transfer endpoint and opt-in catalog query with CSRF', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(catalog))).mockResolvedValueOnce(new Response(JSON.stringify({ version: 4, transfer }), { status: 201 }));
    const api = createApiRecruitmentGateway({ apiBase: 'http://api.test', fetcher, readCookie: () => 'csrf' }) as any;
    await api.getAdjustmentTargets('batch 1', true);
    await api.transferAssessment('batch 1', 'application 1', { targetCenterId: 'baize', baizeDirection: 'BACKEND_ARCHITECTURE', expectedCurrentRound: 1 });
    expect(fetcher.mock.calls[0][0]).toContain('includeAssessmentTransfers=true');
    expect(fetcher.mock.calls[1][0]).toContain('/assessments/application%201/assessment-transfers');
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ targetCenterId: 'baize', baizeDirection: 'BACKEND_ARCHITECTURE', expectedCurrentRound: 1 });
    expect(fetcher.mock.calls[1][1].headers['X-CSRF-Token']).toBe('csrf');
  });
  it('exports generated client transfer operation', async () => {
    const transport = vi.fn().mockResolvedValue({ version: 4, transfer });
    const client = createHsdApiClient(transport) as any;
    await client.recruitment.transferAssessment('batch-1', 'application-1', { targetCenterId: 'baize', baizeDirection: 'BACKEND_ARCHITECTURE', expectedCurrentRound: 1 });
    expect(transport.mock.calls[0][0].path).toContain('/assessment-transfers');
  });
});
describe('transfer path and API save recovery', () => {
  it('keeps ordinary and original Baize paths while ignoring source round one failure after transfer', () => {
    expect(getAssessmentRounds('新媒体中心')).toEqual([1]);
    expect(getAssessmentRounds('白泽开发中心')).toEqual([1, 2, 3]);
    expect(getAssessmentRounds(record)).toEqual([2, 3]);
    expect(getAssessmentProcessingStatus(record)).toBe('assessing');
    expect(getCurrentAssessmentRound(record, 1)).toBeUndefined();
    expect(getCurrentAssessmentRound(record, 2)).toBe(2);
    expect(getCurrentAssessmentRound(record, 3)).toBeUndefined();
    expect(getCurrentAssessmentRound({ ...record, roundOutcomes: { 1: 'failed', 2: 'passed' } }, 3)).toBe(3);
  });
  it('maps current assessment center separately and never offers Baize as final admission', async () => {
    const api = gateway(); api.getAssessmentBatch.mockResolvedValue({ ...batch, currentRound: 2, items: [{ ...candidate, assessmentCenter: toCenter, entryRound: 2, transfer }] });
    const store = useRecruitmentAssessmentStore(); await store.refreshAssessmentBatch('batch-1', api);
    expect(store.getCandidate('batch-1', 'application-1')).toMatchObject({ center: '新媒体中心', assessmentCenter: toCenter, entryRound: 2, transfer, currentPhase: '第二轮考核', processingStatus: 'assessing' });
    expect(store.getApiAdjustmentTargets('batch-1')).toEqual([fromCenter]);
    expect((store as any).getApiTransferTarget('batch-1')).toMatchObject(toCenter);
  });
  it('uses distinct batch/candidate/transfer save identity', () => {
    expect(assessmentPersonalSaveKey({ ...({ batchId: 'b1', candidateId: 'c', operation: 'transfer', round: 1 } as any) })).not.toBe(assessmentPersonalSaveKey({ ...({ batchId: 'b2', candidateId: 'c', operation: 'transfer', round: 1 } as any) }));
    expect(assessmentPersonalSaveKey({ candidateId: 'c', operation: 'transfer', round: 1 } as any)).not.toBe(assessmentPersonalSaveKey({ candidateId: 'c', operation: 'adjustment', round: 1 }));
  });
  it('retains acknowledged transfer if follow-up GET fails and refreshes with no second POST', async () => {
    const api = gateway(), store = useRecruitmentAssessmentStore(); await store.refreshAssessmentBatch('batch-1', api);
    api.getAssessmentBatch.mockRejectedValueOnce(new Error('offline'));
    const result = await (store as any).transferAssessmentFromApi(api, { batchId: 'batch-1', candidateId: 'application-1', targetCenterId: 'baize', baizeDirection: 'BACKEND_ARCHITECTURE' });
    expect(result).toMatchObject({ status: 'saved-refresh-failed', scope: { operation: 'transfer' } });
    expect(store.getCandidate('batch-1', 'application-1')).toMatchObject({ transfer, processingStatus: 'assessing' });
    api.getAssessmentBatch.mockResolvedValue({ ...batch, items: [{ ...candidate, transfer, assessmentCenter: toCenter, entryRound: 2 }] });
    await (store as any).refreshTransferSave(api, 'batch-1', result);
    expect(api.transferAssessment).toHaveBeenCalledTimes(1);
    await expect((store as any).transferAssessmentFromApi(api, { batchId: 'batch-1', candidateId: 'application-1', targetCenterId: 'baize', baizeDirection: 'BACKEND_ARCHITECTURE' })).rejects.toThrow('ASSESSMENT_TRANSFER_ALREADY_EXISTS');
  });
  it('resolves unknown POST only from authoritative transfer and blocks reopening/resubmission without a record', async () => {
    const api = gateway(), store = useRecruitmentAssessmentStore(); await store.refreshAssessmentBatch('batch-1', api);
    api.transferAssessment.mockRejectedValue(new Error('response lost'));
    const input = { batchId: 'batch-1', candidateId: 'application-1', targetCenterId: 'baize', baizeDirection: 'BACKEND_ARCHITECTURE' };
    const result = await (store as any).transferAssessmentFromApi(api, input);
    expect(result.status).toBe('unknown');
    await expect((store as any).transferAssessmentFromApi(api, input)).rejects.toThrow('ASSESSMENT_TRANSFER_SAVE_UNKNOWN');
    api.getAssessmentBatch.mockResolvedValue({ ...batch, currentRound: 2, items: [{ ...candidate, transfer, assessmentCenter: toCenter, entryRound: 2 }] });
    expect(await (store as any).refreshTransferSave(api, 'batch-1', result)).toMatchObject({ status: 'saved', refreshed: true });
    expect(api.transferAssessment).toHaveBeenCalledTimes(1);
  });
  it('refuses unsupported, unavailable and closed-window transfers before POST', async () => {
    for (const response of [{ ...batch, capabilities: undefined }, { ...batch, currentRound: 2 }, { ...batch, items: [{ ...candidate, transferEligibility: { available: false, blockReason: 'ASSESSMENT_TRANSFER_NOT_ALLOWED' } }] }]) {
      const api = gateway(); api.getAssessmentBatch.mockResolvedValue(response); const store = useRecruitmentAssessmentStore(); await store.refreshAssessmentBatch('batch-1', api);
      await expect((store as any).transferAssessmentFromApi(api, { batchId: 'batch-1', candidateId: 'application-1', targetCenterId: 'baize', baizeDirection: 'BACKEND_ARCHITECTURE' })).rejects.toThrow();
      expect(api.transferAssessment).not.toHaveBeenCalled();
    }
  });
});
describe('published transfer privacy, QR and historical directions', () => {
  const render = (results: any) => mount(PublishedStageResults, { props: { results, readImage: vi.fn() }, global: { stubs: { PrivateGroupCode: { props: ['code'], template: '<div class="qr">{{ code?.id }}</div>' } } } });
  it('shows published source failure, confirmed direction, wait for round two and entry QR without pretending a pass', () => {
    const wrapper = render(stages);
    expect(wrapper.text()).toContain('本轮考核未通过'); expect(wrapper.text()).toContain('新媒体中心');
    expect(wrapper.text()).toContain('已调入白泽开发中心'); expect(wrapper.text()).toContain('后端架构'); expect(wrapper.text()).toContain('待第二轮');
    expect(wrapper.text()).toContain('qr-entry');
    expect(render({ ...stages, transfer: null, entryGroupCode: null }).text()).not.toContain('已调入');
  });
  it('uses actual stage center and latest passed QR while keeping entry QR in history', () => {
    const wrapper = render({ ...stages, stages: [...stages.stages, { round: 2, center: toCenter, outcome: 'PASSED', publishedAt: '2026-10-15T06:00:00.000Z', groupCode: { ...qr, id: 'qr-two', round: 2 } }] });
    expect(wrapper.text()).toContain('第 2 轮 · 白泽开发中心');
    expect(wrapper.find('.published-stages__current').text()).toContain('qr-two');
    expect(wrapper.find('.published-stages__history').text()).toContain('qr-entry');
    expect(wrapper.find('.published-stages__history').text()).toContain('新媒体中心 · 未通过');
    const failed = render({ ...stages, stages: [...stages.stages, { round: 2, center: toCenter, outcome: 'FAILED', publishedAt: '2026-10-15T06:00:00.000Z', groupCode: null }] });
    expect(failed.find('.published-stages__current').exists()).toBe(false); expect(failed.text()).toContain('qr-entry');
  });
  it('uses confirmed final direction while retaining original intent', () => {
    const result = memberResultFromApi({ id: 'r', batch: { id: 'b', name: '招新' }, decision: 'ADMITTED', admissionSource: 'ADJUSTMENT', finalCenter: toCenter, baizeDirection: 'UI_UX_DESIGN', finalBaizeDirection: 'BACKEND_ARCHITECTURE', preferences: [{ rank: 'FIRST', center: fromCenter }], responsibleContacts: [], publishedAt: '2026-10-15T08:00:00.000Z' } as any);
    expect(result.finalDirection).toBe('后端架构'); expect(result.baizeInterestDirection).toBe('UI/UX 设计');
  });
  it('maps only scoped original round history and formats Shanghai timestamps', () => {
    const mapped = mapAdminApplication({ id: 'a', batchId: 'b', applicantProfileSnapshot: candidate.person, contact: '', preferences: [], baizeDirection: null, acceptsAdjustment: true, status: 'PROCESSING', version: 1, submittedAt: '2026-10-15T03:00:00.000Z', withdrawnAt: null, originalRoundResult: candidate.roundResults[0] } as any);
    expect(mapped).toHaveProperty('originalRoundResult', candidate.roundResults[0]);
    expect(formatAdminApplicationSubmittedAt('2026-10-15T03:00:00.000Z')).toContain('11:00:00');
    expect(formatAdminApplicationSubmittedAt('1970-01-01T00:00:00.000Z')).toBe('—');
  });
});

describe('existing workbench transfer flow', () => {
  function owner(level: 'OWNER' | 'ADMIN' = 'OWNER') { useSessionStore().applyApiSession({ account: { id: 'owner', adminLevel: level, adminCenterId: null, capabilities: ['recruitment.assessment.edit'] }, person: { id: 'owner', name: '负责人', status: 'FORMAL_MEMBER' }, mustChangePassword: false }); }
  async function open(api = gateway()) { runtime.gateway = api; const wrapper = mount(Workbench, { props: { batchId: 'batch-1' }, global: { stubs: { NuxtLink: true } } }); await flushPromises(); await wrapper.get('[aria-label="查看处理 候选人"]').trigger('click'); return { wrapper, api }; }
  it('offers owner transfer in existing result selector and requires a confirmed direction', async () => {
    owner(); const { wrapper, api } = await open();
    expect(wrapper.text()).toContain('当前考核中心分组');
    await wrapper.get('[aria-label="最终调剂结果"]').setValue('transfer-to-baize');
    const button = () => wrapper.findAll('button').find(b => b.text() === '保存结果')!;
    expect(button().attributes('disabled')).toBeDefined();
    await wrapper.get('[aria-label="白泽方向"]').setValue('BACKEND_ARCHITECTURE');
    expect(button().attributes('disabled')).toBeUndefined();
    await button().trigger('click'); expect(wrapper.get('[role="alertdialog"]').text()).toContain('第二轮');
    api.getAssessmentBatch.mockResolvedValue({ ...batch, version: 4, adjustmentPending: 0, canAdvance: true, items: [{ ...candidate, transfer, assessmentCenter: toCenter, entryRound: 2 }] });
    await wrapper.findAll('button').find(b => b.text() === '确认保存')!.trigger('click'); await flushPromises();
    expect(api.transferAssessment).toHaveBeenCalledTimes(1); expect(wrapper.text()).toContain('调剂转入，第2轮起'); expect(wrapper.text()).toContain('待第二轮');
    expect(wrapper.get('[role="dialog"]').text()).not.toContain('服务器当前最终结果');
  });
  it('keeps unknown transfer drafts and its submission guard when drawer is reopened', async () => {
    owner(); const { wrapper, api } = await open();
    await wrapper.get('[aria-label="最终调剂结果"]').setValue('transfer-to-baize'); await wrapper.get('[aria-label="白泽方向"]').setValue('BACKEND_ARCHITECTURE');
    api.transferAssessment.mockRejectedValue(new Error('lost response'));
    await wrapper.findAll('button').find(b => b.text() === '保存结果')!.trigger('click'); await wrapper.findAll('button').find(b => b.text() === '确认保存')!.trigger('click'); await flushPromises();
    await wrapper.get('[aria-label="关闭详情"]').trigger('click'); await wrapper.get('[aria-label="查看处理 候选人"]').trigger('click');
    expect(wrapper.get('[aria-label="最终调剂结果"]').element.value).toBe('transfer-to-baize'); expect(wrapper.get('[aria-label="白泽方向"]').element.value).toBe('BACKEND_ARCHITECTURE');
    expect(wrapper.get('[role="dialog"]').text()).toContain('暂不能确认保存状态'); expect(wrapper.find('[data-testid="assessment-reconfirm"]').exists()).toBe(false);
    expect(wrapper.findAll('button').find(b => b.text() === '保存结果')!.attributes('disabled')).toBeDefined();
  });
  it('hides transfer from ordinary admins and explains owner window closure', async () => {
    owner('ADMIN'); const first = await open(); expect(first.wrapper.find('option[value="transfer-to-baize"]').exists()).toBe(false); first.wrapper.unmount();
    owner(); const api = gateway(); api.getAssessmentBatch.mockResolvedValue({ ...batch, currentRound: 2 });
    const { wrapper } = await open(api); expect(wrapper.get('option[value="transfer-to-baize"]').attributes('disabled')).toBeDefined(); expect(wrapper.text()).toContain('第一轮');
  });
});

describe('Mock transfer lifecycle', () => {
  it('keeps Mock member transfer private until global round publication and publishes actual-center stages', () => {
    useSessionStore().signIn('admin-alliance', { requireAdmin: true });
    const store = useRecruitmentAssessmentStore(), state = store.getBatchState('batch-current');
    const original = state.records.find(r => r.center !== '白泽开发中心' && r.acceptsAdjustment)!; state.records = [original]; original.roundOutcomes = { 1: 'failed' }; original.finalDecision = undefined;
    (store as any).transferAssessment({ batchId: 'batch-current', candidateId: original.candidateId, baizeDirection: 'BACKEND_ARCHITECTURE', now: new Date('2026-10-15T04:00:00Z') });
    expect((store as any).getMockStageResults('batch-current', original.memberId)).toMatchObject({ transfer: null, entryGroupCode: null, stages: [] });
    useRecruitmentBatchStore().close('batch-current', true, new Date('2026-10-15T04:00:00Z'), '关闭'); store.advanceAssessmentRound('batch-current', true, new Date('2026-10-15T05:00:00Z'));
    expect((store as any).getMockStageResults('batch-current', original.memberId)).toMatchObject({ transfer: { baizeDirection: 'BACKEND_ARCHITECTURE', publishedAt: '2026-10-15T05:00:00.000Z' }, entryGroupCode: { round: 1 }, stages: [{ round: 1, outcome: 'FAILED', center: { name: original.center }, groupCode: null }] });
    store.saveRoundOutcome({ batchId: 'batch-current', candidateId: original.candidateId, round: 2, outcome: 'passed', now: new Date('2026-10-15T06:00:00Z') });
    expect((store as any).getMockStageResults('batch-current', original.memberId).stages).toHaveLength(1);
    store.advanceAssessmentRound('batch-current', true, new Date('2026-10-15T07:00:00Z'));
    expect((store as any).getMockStageResults('batch-current', original.memberId).stages[1]).toMatchObject({ round: 2, outcome: 'PASSED', center: { name: '白泽开发中心' }, baizeDirection: 'BACKEND_ARCHITECTURE', groupCode: { round: 2 } });
  });
  it('uses current-center permissions, waits for global advance and completes rounds two and three without an artificial source pass', () => {
    const session = useSessionStore(); session.signIn('admin-alliance', { requireAdmin: true });
    const store = useRecruitmentAssessmentStore(), state = store.getBatchState('batch-current');
    const original = state.records.find(r => r.center !== '白泽开发中心' && r.acceptsAdjustment)!;
    state.records = [original]; original.roundOutcomes = { 1: 'failed' }; original.finalDecision = undefined;
    (store as any).transferAssessment({ batchId: 'batch-current', candidateId: original.candidateId, baizeDirection: 'BACKEND_ARCHITECTURE', now: new Date('2026-10-15T04:00:00Z') });
    expect(store.getCandidate('batch-current', original.candidateId)).toMatchObject({ center: original.center, entryRound: 2, processingStatus: 'assessing' });
    expect(store.getCandidate('batch-current', original.candidateId)?.currentPhase).toBeUndefined();
    useRecruitmentBatchStore().close('batch-current', true, new Date('2026-10-15T04:00:00Z'), '关闭');
    store.advanceAssessmentRound('batch-current', true, new Date('2026-10-15T05:00:00Z'));
    store.saveRoundOutcome({ batchId: 'batch-current', candidateId: original.candidateId, round: 2, outcome: 'passed', now: new Date('2026-10-15T06:00:00Z') });
    store.advanceAssessmentRound('batch-current', true, new Date('2026-10-15T07:00:00Z'));
    store.saveRoundOutcome({ batchId: 'batch-current', candidateId: original.candidateId, round: 3, outcome: 'passed', now: new Date('2026-10-15T08:00:00Z') });
    expect(store.getCandidate('batch-current', original.candidateId)).toMatchObject({ roundOutcomes: { 1: 'failed', 2: 'passed', 3: 'passed' }, finalCenter: '白泽开发中心', finalBaizeDirection: 'BACKEND_ARCHITECTURE' });
  });
  it('preserves source round one note when Baize records later notes and denies source-center editing', () => {
    const session = useSessionStore(); session.signIn('admin-alliance', { requireAdmin: true });
    const store = useRecruitmentAssessmentStore(), state = store.getBatchState('batch-current');
    const original = state.records.find(r => r.center !== '白泽开发中心' && r.acceptsAdjustment)!; state.records = [original]; original.roundOutcomes = {}; original.finalDecision = undefined;
    store.saveRoundOutcome({ batchId: 'batch-current', candidateId: original.candidateId, round: 1, outcome: 'failed', internalNote: '原中心第一轮记录', now: new Date('2026-10-15T03:00:00Z') });
    (store as any).transferAssessment({ batchId: 'batch-current', candidateId: original.candidateId, baizeDirection: 'BACKEND_ARCHITECTURE', now: new Date('2026-10-15T04:00:00Z') });
    useRecruitmentBatchStore().close('batch-current', true, new Date('2026-10-15T04:00:00Z'), '关闭'); store.advanceAssessmentRound('batch-current', true, new Date('2026-10-15T05:00:00Z'));
    session.signIn('admin-media', { requireAdmin: true });
    expect(() => store.saveRoundOutcome({ batchId: 'batch-current', candidateId: original.candidateId, round: 2, outcome: 'passed', now: new Date('2026-10-15T06:00:00Z') })).toThrow('ASSESSMENT_EDIT_PERMISSION_REQUIRED');
    session.signIn('admin-alliance', { requireAdmin: true }); store.saveRoundOutcome({ batchId: 'batch-current', candidateId: original.candidateId, round: 2, outcome: 'failed', internalNote: '白泽第二轮记录', now: new Date('2026-10-15T06:00:00Z') });
    expect(store.getCandidate('batch-current', original.candidateId)).toHaveProperty('originalRoundResult', { round: 1, outcome: 'FAILED', internalNote: '原中心第一轮记录', createdAt: '2026-10-15T03:00:00.000Z' });
    store.recordAdjustmentDecision({ batchId: 'batch-current', candidateId: original.candidateId, decision: '人才发展中心', now: new Date('2026-10-15T07:00:00Z') });
    expect(store.getCandidate('batch-current', original.candidateId)?.finalBaizeDirection).toBeNull();
  });
  it('discards persisted partial or unsafe transfer fields', () => {
    const state = { batchId: 'batch-current', batchVersion: 1, version: 1, currentRound: 1, status: 'assessing', records: [{ ...record, batchId: 'batch-current', transfer: { ...transfer, futureInternalNote: 'private' } }], auditRecords: [] };
    localStorage.setItem(RECRUITMENT_ASSESSMENT_STORAGE_KEY, JSON.stringify({ version: 1, batches: { 'batch-current': state } }));
    expect(useRecruitmentAssessmentStore().batches['batch-current']).toBeUndefined();
  });
});
