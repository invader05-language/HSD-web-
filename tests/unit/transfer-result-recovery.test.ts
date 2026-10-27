import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { memberResultFromContext, stageResultsFromContext } from '../../app/data/member-results';
import PublishedStageResults from '../../app/components/member/PublishedStageResults.vue';
import PrivateGroupCode from '../../app/components/member/PrivateGroupCode.vue';

const baize = { id: 'baize', slug: 'baize-development', name: '白泽开发中心' };
const media = { id: 'media', slug: 'new-media', name: '新媒体中心' };
const code = { id: 'qr-entry', round: 1, version: 1, status: 'READY' as const, imageUrl: '/private/qr?version=1' };
const failed = { round: 1, center: baize, outcome: 'FAILED', publishedAt: '2026-10-15T05:34:02Z', groupCode: null };
const base = { batch: { id: 'batch', name: '秋季招新' }, application: { id: 'app', firstCenter: baize, acceptsAdjustment: true }, stages: [failed], adjustment: null, assessmentTransfer: null, currentRouting: null, finalResult: null };
const render = (context: any) => mount(PublishedStageResults, {
  props: { results: stageResultsFromContext(context)!, readImage: vi.fn() },
  global: { stubs: { PrivateGroupCode: { props: ['code'], template: '<div class="qr">{{ code?.id }}</div>' } } },
});
beforeEach(() => {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:private');
  URL.revokeObjectURL = vi.fn();
});

describe('published transfer result experience', () => {
  it.each(['人才发展中心', '新媒体中心', '拓维策划中心'])('shows adjusted center %s and QR instead of the superseded failure', name => {
    const center = { ...media, name };
    const context = { ...base, adjustment: { decision: 'ADMITTED', targetCenter: center, decidedAt: '2026-10-15T05:00:00Z', finalPublished: false }, currentRouting: { type: 'ADJUSTED', center, round: 1, groupCode: code } };
    const stages = stageResultsFromContext(context as any)!;
    expect(stages).toHaveProperty('currentRouting', context.currentRouting);
    expect(stages).toHaveProperty('adjustment', context.adjustment);
    const wrapper = render(context);
    expect(wrapper.text()).toContain(`已调入${name}`);
    expect(wrapper.find('.qr').text()).toBe('qr-entry');
    expect(wrapper.text()).not.toContain('本轮考核未通过');
    wrapper.unmount();
  });
  it('keeps the published Baize entry QR from the context and the current assessment round separate', () => {
    const context = { ...base, assessmentTransfer: { fromCenter: media, toCenter: baize, entryRound: 2, baizeDirection: 'BACKEND_ARCHITECTURE', publishedAt: failed.publishedAt, entryGroupCode: code }, currentRouting: { type: 'BAIZE_TRANSFER', center: baize, round: 2, groupCode: code } };
    const stages = stageResultsFromContext(context as any)!;
    expect(stages.entryGroupCode).toEqual(code);
    expect(stages.center?.name).toBe(baize.name);
    const result = memberResultFromContext(context as any);
    expect(result).toMatchObject({ identity: '预备成员', status: 'pending', finalResultPending: true, routingCenter: baize.name, routingRound: 2, routingGroupCode: code, finalDirection: '后端架构' });
    const wrapper = render(context);
    expect(wrapper.text()).toContain('已调入白泽开发中心');
    expect(wrapper.text()).toContain('qr-entry');
    expect(wrapper.text()).not.toContain('本轮考核未通过');
    expect(wrapper.text()).not.toContain('第 2 轮入场群二维码');
    wrapper.unmount();
  });
  it('also exposes the published pass destination and QR on the admission projection without promoting identity', () => {
    const context = { ...base, stages: [{ ...failed, outcome: 'PASSED', groupCode: code }], currentRouting: { type: 'PASSED_CONTINUE', center: baize, round: 2, groupCode: code } };
    expect(memberResultFromContext(context as any)).toMatchObject({ finalResultPending: true, identity: '预备成员', routingCenter: baize.name, routingGroupCode: code });
  });
  it('keeps the authoritative admitted center QR after final batch publication', () => {
    const context = { ...base, finalResult: { decision: 'ADMITTED', finalCenter: media, publishedAt: failed.publishedAt }, currentRouting: { type: 'ADJUSTED', center: media, round: 1, groupCode: code } };
    expect(stageResultsFromContext(context as any)?.finalGroupCode).toEqual(code);
    expect(memberResultFromContext(context as any)).toMatchObject({ status: 'admitted', identity: '正式成员', finalCenter: media.name });
  });
  it('does not turn a failed later round into a current success from an old transfer', () => {
    const context = { ...base, stages: [failed, { ...failed, round: 2 }], assessmentTransfer: { fromCenter: media, toCenter: baize, entryRound: 2, baizeDirection: 'BACKEND_ARCHITECTURE', publishedAt: failed.publishedAt, entryGroupCode: code } };
    const wrapper = render(context);
    expect(wrapper.text()).toContain('本轮考核未通过');
    expect(wrapper.find('.published-stages__current').exists()).toBe(false);
    expect(memberResultFromContext(context as any).routingCenter).toBeUndefined();
    wrapper.unmount();
  });
});

describe('private QR recovery during result polling', () => {
  it('reloads after the admin saves an updated QR into the same row object', async () => {
    const readImage = vi.fn().mockResolvedValue(new Blob(['image']));
    const row = reactive({ ...code });
    const wrapper = mount(PrivateGroupCode, { props: { code: row, readImage } });
    await flushPromises();
    Object.assign(row, { version: 2, imageUrl: '/private/qr?version=2' }); await flushPromises();
    await wrapper.setProps({ code: { ...row } }); await flushPromises();
    expect(readImage).toHaveBeenCalledTimes(2);
    expect(readImage).toHaveBeenLastCalledWith('/private/qr?version=2');
    wrapper.unmount();
  });
  it('recovers a transient 404 when polling returns the same reference', async () => {
    const readImage = vi.fn().mockRejectedValueOnce({ status: 404 }).mockResolvedValue(new Blob(['image']));
    const wrapper = mount(PrivateGroupCode, { props: { code, readImage } });
    await flushPromises();
    expect(wrapper.text()).toContain('二维码暂不可用');
    await wrapper.setProps({ code: { ...code } }); await flushPromises();
    expect(wrapper.find('img').exists()).toBe(true);
    expect(readImage).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
  it('bounds automatic retries for persistent failures and keeps manual retry available', async () => {
    const readImage = vi.fn().mockRejectedValue({ status: 404 });
    const wrapper = mount(PrivateGroupCode, { props: { code, readImage } });
    await flushPromises();
    for (let i = 0; i < 6; i++) { await wrapper.setProps({ code: { ...code } }); await flushPromises(); }
    expect(readImage).toHaveBeenCalledTimes(3);
    readImage.mockResolvedValue(new Blob(['image']));
    await wrapper.get('button').trigger('click'); await flushPromises();
    expect(wrapper.find('img').exists()).toBe(true);
    wrapper.unmount();
  });
  it.each([401, 403])('does not automatically retry authorization failure %s', async status => {
    const readImage = vi.fn().mockRejectedValue({ status });
    const wrapper = mount(PrivateGroupCode, { props: { code, readImage } });
    await flushPromises(); await wrapper.setProps({ code: { ...code } }); await flushPromises();
    expect(readImage).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
