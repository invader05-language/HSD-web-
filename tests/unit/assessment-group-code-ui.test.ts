import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublishedStageResults from '../../app/components/member/PublishedStageResults.vue';
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
  it('refreshes image reference only once on repeated 409 and releases private blobs', async () => {
    const readImage=vi.fn().mockRejectedValue({status:409}); const code={id:'id',round:1,version:1,status:'READY' as const,imageUrl:'/api/v1/test/group-code/image?version=1'};
    const wrapper=mount(PrivateGroupCode,{props:{code,readImage}});await flushPromises();expect(wrapper.emitted('refresh')).toHaveLength(1);
    await wrapper.setProps({code:{...code,version:2,imageUrl:code.imageUrl+'2'}});await flushPromises();expect(wrapper.emitted('refresh')).toHaveLength(1);
    readImage.mockResolvedValue(new Blob(['test'])); await wrapper.setProps({code:{...code,version:3}});await flushPromises();wrapper.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private');
  });
});
