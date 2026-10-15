import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublishedStageResults from '../../app/components/member/PublishedStageResults.vue';
import MemberCurrentRouting from '../../app/components/member/MemberCurrentRouting.vue';
import PrivateGroupCode from '../../app/components/member/PrivateGroupCode.vue';
import AssessmentGroupCodePanel from '../../app/components/admin/AssessmentGroupCodePanel.vue';
import type { MemberStageResultsDto } from '../../packages/api-client/src';
import type { RoundGroupGateway } from '../../app/services/recruitment/recruitment-gateway';
const missing = (round: number) => ({ id: null, round, version: 0, status: 'MISSING' as const, imageUrl: null });
const stages: MemberStageResultsDto = { batchId:'batch', batchName:'招新', center:{ id:'c1',name:'白泽开发中心' }, finalGroupCode:null, stages:[1,2,3].map(round => ({ round, outcome:'PASSED', publishedAt:'2026-10-14T00:00:00Z', groupCode:missing(round) })) };
const gateway = () => ({ getAssessmentGroupCodes:vi.fn().mockResolvedValue({batchId:'batch',centers:[{id:'c1',name:'新媒体中心',slug:'new-media',rounds:[missing(1)]}]}),readGroupCodeImage:vi.fn() }) as unknown as RoundGroupGateway;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open',''); };
  HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
  URL.createObjectURL = vi.fn().mockReturnValue('blob:private'); URL.revokeObjectURL = vi.fn();
});
describe('round result UI', () => {
  it('shows an ordinary adjustment destination, QR and explicit pending final state', () => {
    const wrapper = mount(MemberCurrentRouting, {
      props: {
        center: { id: 'talent', slug: 'talent-development', name: '人才发展中心' },
        round: 1,
        groupCode: { id: 'qr-adjusted', round: 1, version: 1, status: 'READY', imageUrl: '/qr' },
        finalResultPending: true,
        readImage: vi.fn(),
      },
      global: { stubs: { PrivateGroupCode: { props: ['code'], template: '<div class="qr">{{ code.id }}</div>' } } },
    });
    expect(wrapper.text()).toContain('人才发展中心');
    expect(wrapper.text()).toContain('最终结果待联盟总负责人发布');
    expect(wrapper.find('.qr').text()).toBe('qr-adjusted');
    wrapper.unmount();
  });
  it('refreshes center scope while preserving an upload in progress and its resumable task', async () => {
    const api = gateway(); let rejectUpload!: (cause: unknown) => void;
    const task = { batchId: 'batch', centerId: 'c1', round: 1, uploadId: 'pending-upload' };
    let signal: AbortSignal | undefined;
    api.uploadAssessmentGroupCode = vi.fn().mockImplementation((_batch, _center, _round, _version, _file, options) => {
      signal = options.signal; options.onProgress({ phase: 'uploading', uploadId: 'pending-upload' });
      return new Promise((_resolve, reject) => { rejectUpload = reject; });
    });
    const wrapper = mount(AssessmentGroupCodePanel, { props: { batchId: 'batch', owner: true, gateway: api, scopeRevision: '' } }); await flushPromises();
    const input = wrapper.get('input[type="file"]'); Object.defineProperty(input.element, 'files', { value: [new File(['image'], 'code.png', { type: 'image/png' })] });
    await input.trigger('change'); expect(wrapper.text()).toContain('正在上传二维码');
    api.getAssessmentGroupCodes = vi.fn().mockResolvedValue({ batchId: 'batch', centers: [{ id: 'c1', name: '新媒体中心', slug: 'new-media', rounds: [missing(1)] }, { id: 'baize', name: '白泽开发中心', slug: 'baize-development', rounds: [1, 2, 3].map(missing) }] });
    await wrapper.setProps({ scopeRevision: 'baize' }); await flushPromises();
    expect(wrapper.findAll('option').map(option => option.text())).toContain('白泽开发中心'); expect(wrapper.text()).toContain('正在上传二维码'); expect(signal?.aborted).toBe(false);
    rejectUpload({ task }); await flushPromises();
    expect(wrapper.findAll('button').some(button => button.text() === '检查保存状态并继续')).toBe(true);
    expect(api.uploadAssessmentGroupCode).toHaveBeenCalledTimes(1); wrapper.unmount();
  });
  it('keeps the loaded original image open when polling returns the same reference', async () => {
    const readImage=vi.fn().mockResolvedValue(new Blob(['image']));
    const code={id:'id',round:1,version:1,status:'READY' as const,imageUrl:'/api/v1/test/group-code/image?version=1'};
    const wrapper=mount(PrivateGroupCode,{props:{code,readImage}});
    await flushPromises();await wrapper.get('button[aria-label="查看二维码原图"]').trigger('click');await flushPromises();
    await wrapper.setProps({code:{...code}});await flushPromises();
    expect(readImage).toHaveBeenCalledTimes(1);expect(wrapper.find('dialog img').exists()).toBe(true);
    await wrapper.setProps({code:{...code,version:2,imageUrl:code.imageUrl+'2'}});await flushPromises();
    expect(readImage).toHaveBeenCalledTimes(2);expect(wrapper.find('dialog img').exists()).toBe(false);
    wrapper.unmount();
  });
  it('opens the original image as a native modal and clears it on keyboard cancellation', async () => {
    const showModal=vi.spyOn(HTMLDialogElement.prototype,'showModal');
    const wrapper=mount(PrivateGroupCode,{props:{code:{id:'id',round:1,version:1,status:'READY',imageUrl:'/api/v1/test/group-code/image?version=1'},readImage:vi.fn().mockResolvedValue(new Blob(['image']))}});
    await flushPromises();await wrapper.get('button[aria-label="查看二维码原图"]').trigger('click');await flushPromises();
    expect(showModal).toHaveBeenCalledTimes(1);
    await wrapper.get('dialog').trigger('cancel');await flushPromises();
    expect(wrapper.find('dialog img').exists()).toBe(false);
    wrapper.unmount();showModal.mockRestore();
  });
  it('highlights only the latest round and retains older passed rounds in collapsed history', () => {
    const wrapper = mount(PublishedStageResults,{props:{results:stages,readImage:vi.fn()}});
    expect(wrapper.find('.published-stages__current').text()).toContain('第 3 轮群二维码');
    expect(wrapper.find('details').attributes('open')).toBeUndefined();
    expect(wrapper.find('summary').text()).toContain('2');
    expect(wrapper.find('.published-stages__current').text()).toContain('二维码暂未上传');
    wrapper.unmount();
  });
  it('does not promote an old QR when the latest round fails', () => {
    const results = structuredClone(stages); results.stages[2]!.outcome='FAILED';results.stages[2]!.groupCode=null;
    const wrapper = mount(PublishedStageResults,{props:{results,readImage:vi.fn()}});
    expect(wrapper.find('.published-stages__current').exists()).toBe(false);
    expect(wrapper.text()).toContain('本轮考核未通过');expect(wrapper.find('details').exists()).toBe(true);wrapper.unmount();
  });
  it('renders only one round and no center selector for a scoped ordinary ADMIN', async () => {
    const wrapper=mount(AssessmentGroupCodePanel,{props:{batchId:'batch',owner:false,gateway:gateway()}});await flushPromises();
    expect(wrapper.findAll('article')).toHaveLength(1);expect(wrapper.find('select').exists()).toBe(false);wrapper.unmount();
  });
  it('keeps a saved configuration distinct from an image preview failure',async()=>{
    const api=gateway();api.getAssessmentGroupCodes=vi.fn().mockResolvedValue({batchId:'batch',centers:[{id:'c1',name:'人才发展中心',slug:'talent',rounds:[{id:'code',round:1,version:1,status:'READY',imageUrl:'/api/v1/group-code/image',uploadId:'upload',updatedAt:'2026-10-14T00:00:00Z'}]}]});
    api.readGroupCodeImage=vi.fn().mockRejectedValue({status:500});
    const wrapper=mount(AssessmentGroupCodePanel,{props:{batchId:'batch',owner:false,gateway:api}});await flushPromises();
    expect(wrapper.text()).toContain('已上传并保存');expect(wrapper.text()).toContain('预览加载失败');
    expect(wrapper.text()).not.toContain('二维码暂未上传');wrapper.unmount();
  });
  it('clears private configuration and prompts login when the image session expires',async()=>{
    const api=gateway();api.getAssessmentGroupCodes=vi.fn().mockResolvedValue({batchId:'batch',centers:[{id:'c1',name:'人才发展中心',slug:'talent',rounds:[{id:'code',round:1,version:1,status:'READY',imageUrl:'/api/v1/group-code/image',uploadId:'upload',updatedAt:'2026-10-14T00:00:00Z'}]}]});api.readGroupCodeImage=vi.fn().mockRejectedValue({status:401});
    const wrapper=mount(AssessmentGroupCodePanel,{props:{batchId:'batch',owner:false,gateway:api}});await flushPromises();
    expect(wrapper.text()).toContain('登录已过期');expect(wrapper.findAll('article')).toHaveLength(0);wrapper.unmount();
  });
  it('refreshes image reference only once on repeated 409 and releases private blobs', async () => {
    const readImage=vi.fn().mockRejectedValue({status:409}); const code={id:'id',round:1,version:1,status:'READY' as const,imageUrl:'/api/v1/test/group-code/image?version=1'};
    const wrapper=mount(PrivateGroupCode,{props:{code,readImage}});await flushPromises();expect(wrapper.emitted('refresh')).toHaveLength(1);
    await wrapper.setProps({code:{...code,version:2,imageUrl:code.imageUrl+'2'}});await flushPromises();expect(wrapper.emitted('refresh')).toHaveLength(1);
    readImage.mockResolvedValue(new Blob(['test'])); await wrapper.setProps({code:{...code,version:3}});await flushPromises();wrapper.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private');
  });
});
