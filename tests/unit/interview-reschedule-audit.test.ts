import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ApplicationsPage from '../../app/pages/admin/recruitment/batches/[batchId]/applications.vue';
import { validateApplicationDraft } from '../../app/utils/recruitment-application-form';

enableAutoUnmount(afterEach);
const routeState = reactive({ params: { batchId: 'audit-batch', id: undefined as string | undefined }, query: {} });
const oldStart = '2026-10-09T01:00:00.000Z';
const newStart = '2026-10-09T02:00:00.000Z';
let currentStart = oldStart;
let exportRequests = 0;

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  currentStart = oldStart;
  exportRequests = 0;
  for (const [name, value] of Object.entries({ computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch })) vi.stubGlobal(name, value);
  vi.stubGlobal('definePageMeta', vi.fn());
  vi.stubGlobal('useHead', vi.fn());
  vi.stubGlobal('useRoute', () => routeState);
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://api.example.test', useMockApi: false } }));
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async input => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/export.csv')) {
      exportRequests++;
      return new Response('name,start\r\nAudit,' + currentStart, { status: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="audit.csv"' } });
    }
    if (path.endsWith('/applications')) return new Response(JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [{
      id: 'audit-application', batchId: 'audit-batch', contact: 'audit@example.test', status: 'SUBMITTED', version: 1,
      acceptsAdjustment: true, baizeDirection: null, batchNameSnapshot: 'Audit', batchVersionAtSubmission: 1,
      applicantProfileSnapshot: { name: 'Audit', studentId: '2026000001', grade: '2026', className: 'Audit', contact: 'audit@example.test' },
      preferences: [], submittedAt: '2026-10-08T01:00:00.000Z', withdrawnAt: null,
      interviewSelection: { id: 'audit-slot', status: 'CONFIRMED', startAt: currentStart, endAt: '2026-10-09T02:30:00.000Z', timezone: 'Asia/Shanghai' },
    }] }), { status: 200 });
    if (path.endsWith('/audit-batch')) return new Response(JSON.stringify({
      id: 'audit-batch', name: 'Audit', startAt: '2026-10-08T00:00:00.000Z', endAt: '2026-10-08T20:00:00.000Z',
      timezone: 'Asia/Shanghai', lifecycleStatus: 'PUBLISHED', manualOverride: 'NONE',
      effectiveStatus: 'open', effectiveStatusReason: 'within-window', version: 1,
      publishedAt: '2026-10-08T00:00:00.000Z', actualOpenedAt: '2026-10-08T00:00:00.000Z',
      closedAt: null, archivedAt: null, createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z',
      applicationCount: 1, openCenters: [], responsibleAccounts: [], interviewSlots: [],
    }), { status: 200 });
    throw new Error('Unexpected audit fetch: ' + path);
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function mountRoster() {
  return mount(ApplicationsPage, { global: { stubs: {
    AdminPageHeading: { props: ['title', 'description'], template: '<header><h1>{{ title }}</h1><slot name="actions" /></header>' },
    NuxtLink: { props: ['to'], template: '<a><slot /></a>' }, NuxtPage: true, PaginationControls: true,
  } } });
}

describe('interview reschedule frontend closure audit', () => {
  it('refreshes the already-open admin roster when the administrator returns to the window', async () => {
    const wrapper = mountRoster();
    await flushPromises();
    expect(wrapper.text()).toContain('2026-10-09 09:00');
    currentStart = newStart;
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(wrapper.text()).toContain('2026-10-09 10:00');
    expect(wrapper.text()).not.toContain('2026-10-09 09:00');
    expect(wrapper.text()).not.toContain('2026-10-09 09:00');
  });

  it('fetches a fresh export even while the displayed roster still contains an older interview time', async () => {
    const wrapper = mountRoster();
    await flushPromises();
    currentStart = newStart;
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audit');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const exportButton = wrapper.findAll('button').find(button => button.text() === '导出报名表');
    expect(exportButton).toBeDefined();
    await exportButton!.trigger('click');
    await flushPromises();
    expect(exportRequests).toBe(1);
    const blob = createUrl.mock.calls[0][0] as Blob;
    expect(await blob.text()).toContain(newStart);
    expect(wrapper.text()).toContain('2026-10-09 10:00');
  });

  it('permits retaining an applicants existing reservation when its slot is full', () => {
    const errors = validateApplicationDraft({ contact: '13800000000', firstChoice: '新媒体中心', acceptsAdjustment: true, interviewSlotId: 'already-held-slot' }, {
      now: new Date('2026-10-08T00:00:00.000Z'), interviewSlots: [{
        id: 'already-held-slot', startAt: oldStart, endAt: '2026-10-09T01:30:00.000Z', timezone: 'Asia/Shanghai',
        status: 'ACTIVE', capacity: 1, confirmedCount: 1, remainingCapacity: 0, version: 1,
      }],
      heldInterviewSlotId: 'already-held-slot',
    });
    expect(errors.interviewSlotId).toBeUndefined();

    const anotherApplicantErrors = validateApplicationDraft({ contact: '13800000000', firstChoice: '新媒体中心', acceptsAdjustment: true, interviewSlotId: 'already-held-slot' }, {
      now: new Date('2026-10-08T00:00:00.000Z'), interviewSlots: [{
        id: 'already-held-slot', startAt: oldStart, endAt: '2026-10-09T01:30:00.000Z', timezone: 'Asia/Shanghai',
        status: 'ACTIVE', capacity: 1, confirmedCount: 1, remainingCapacity: 0, version: 1,
      }],
    });
    expect(anotherApplicantErrors.interviewSlotId).toBe('该面试时段已不可选，请重新选择。');
  });
});
