import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createApiRecycleGateway } from '../../app/services/recycle/api-recycle.gateway'
import { useRecycleStore } from '../../app/stores/recycle'
import { createRecycleGatewayForRuntime } from '../../app/composables/useRecycleGateway'
import RecyclePage from '../../app/pages/admin/recycle-bin.vue'
import { useSessionStore } from '../../app/stores/session'
import { RELEASE_FEATURES } from '../../app/config/release-features'
import { getAdminNavigationForAccess } from '../../app/data/admin-platform'
import { resolveDisabledRoute } from '../../app/utils/admin-release-access'

describe('Recycle production API integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); localStorage.clear()
    vi.stubGlobal('computed', computed); vi.stubGlobal('ref', ref); vi.stubGlobal('reactive', reactive); vi.stubGlobal('useHead', vi.fn()); vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://api.example.test', useMockApi: false } }))
  })

  it('uses generated routes with request correlation, CSRF, optimistic versions, and explicit purge confirmation', async () => {
    const item = { id: 'hon_external_1', type: 'honor', title: 'Recoverable honor', centerName: 'Alpha', deletedAt: '2026-08-01T00:00:00.000Z', retentionEndsAt: '2026-08-31T00:00:00.000Z', version: 2, restoreEligible: true }
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [item] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...item, version: 3, deletedAt: null, retentionEndsAt: null, restoreEligible: false }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ deleted: true, id: item.id }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const gateway = createApiRecycleGateway({ apiBase: 'https://api.example.test/', fetcher, readCookie: () => 'csrf-token', createRequestId: () => 'recycle-ui-1' })
    await gateway.list()
    await gateway.restore(item.id, item.version)
    await gateway.hardDelete(item.id, item.version, true)
    expect(fetcher.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
      ['https://api.example.test/api/v1/admin/recycle-bin', 'GET', undefined],
      ['https://api.example.test/api/v1/admin/recycle-bin/honors/hon_external_1/restore', 'POST', JSON.stringify({ expectedVersion: 2 })],
      ['https://api.example.test/api/v1/admin/recycle-bin/honors/hon_external_1', 'DELETE', JSON.stringify({ expectedVersion: 2, confirmed: true })],
    ])
    expect(fetcher.mock.calls[1]?.[1]?.headers).toEqual({ 'X-Request-ID': 'recycle-ui-1', 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-token' })
  })

  it('provides an interactive explicit Mock gateway without sharing production failure fallback', async () => {
    const mock = createRecycleGatewayForRuntime({ apiBase: '', useMockApi: true })!
    const initial = await mock.list()
    expect(initial.items.length).toBeGreaterThan(0)
    const store = useRecycleStore(); await store.refresh(mock)
    const first = store.items[0]!
    expect(await store.restore(mock, first)).toBe(true)
    expect(store.items.find((item) => item.id === first.id)).toBeUndefined()
    await store.refresh(mock)
    const purge = store.items[0]!
    expect(await store.hardDelete(mock, purge, true)).toBe(true)
    expect(store.items.find((item) => item.id === purge.id)).toBeUndefined()
  })

  it('renders explicit Mock fixtures and performs restore and owner purge from the mounted page', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '', useMockApi: true } }))
    vi.stubGlobal('confirm', vi.fn(() => true))
    useSessionStore().signIn('admin-alliance', { requireAdmin: true })
    const wrapper = mount(RecyclePage, { global: { stubs: { AdminPageHeading: true } } })
    await flushPromises(); await nextTick()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    const restoredId = wrapper.get('tbody tr small').text()
    await wrapper.findAll('tbody tr')[0]!.findAll('button')[0]!.trigger('click')
    await flushPromises(); await nextTick()
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).not.toContain(restoredId)
    const purgedId = wrapper.get('tbody tr small').text()
    const ownerButtons = wrapper.get('tbody tr').findAll('button')
    expect(ownerButtons).toHaveLength(2)
    await ownerButtons[1]!.trigger('click'); await flushPromises(); await nextTick()
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
    expect(wrapper.text()).not.toContain(purgedId)
  })

  it('keeps production loading, error, and empty states API-only without localStorage fallback', async () => {
    localStorage.setItem('baiyun-hsd.recycle', JSON.stringify({ items: [{ id: 'stale-local' }] }))
    const store = useRecycleStore()
    let resolve!: (value: { items: [] }) => void
    const pending = store.refresh({ list: vi.fn(() => new Promise((done) => { resolve = done })) } as never)
    expect(store.loading).toBe(true); expect(store.items).toEqual([])
    resolve({ items: [] }); await pending
    expect(store.loading).toBe(false); expect(store.items).toEqual([])
    await store.refresh({ list: vi.fn().mockRejectedValue(new Error('RECYCLE_API_DOWN')) } as never)
    expect(store.items).toEqual([]); expect(store.error).toMatchObject({ message: 'RECYCLE_API_DOWN' })
  })

  it('updates the store only after successful restore or hard deletion', async () => {
    const item = { id: 'hon_external_2', type: 'honor' as const, title: 'Recoverable honor', centerName: 'Alpha', deletedAt: '2026-08-01T00:00:00.000Z', retentionEndsAt: '2026-08-31T00:00:00.000Z', version: 2, restoreEligible: true }
    const store = useRecycleStore(); store.items = [item]
    await store.restore({ restore: vi.fn().mockRejectedValue(new Error('RESTORE_FAILED')) } as never, item)
    expect(store.items).toEqual([item])
    await store.hardDelete({ hardDelete: vi.fn().mockResolvedValue({ deleted: true, id: item.id }) } as never, item, true)
    expect(store.items).toEqual([])
  })

  it('enables only the completed recycle route and navigation feature', () => {
    expect(RELEASE_FEATURES.recycleBin).toBe(true)
    expect(resolveDisabledRoute('/admin/recycle-bin', RELEASE_FEATURES)).toBeUndefined()
    const ids = getAdminNavigationForAccess({ canManageAdminAccounts: false }, RELEASE_FEATURES).flatMap((group) => group.items.map((item) => item.id))
    expect(ids).toContain('recycle-bin')
    expect(RELEASE_FEATURES.auditLog).toBe(false); expect(RELEASE_FEATURES.uploadTasks).toBe(false)
  })

  it('renders production loading, API empty, and failure states without fixtures', async () => {
    let resolve!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((done) => { resolve = done })))
    const wrapper = mount(RecyclePage, { global: { stubs: { AdminPageHeading: true } } })
    await nextTick(); expect(wrapper.get('[role="status"]').text()).toContain('正在加载')
    resolve(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await flushPromises(); await nextTick(); expect(wrapper.text()).toContain('暂无可恢复记录')
    expect(wrapper.text()).not.toContain('旧版招新 Banner')
    wrapper.unmount(); setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'RECYCLE_DOWN', message: 'Recycle unavailable', requestId: 'req-recycle' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    const failed = mount(RecyclePage, { global: { stubs: { AdminPageHeading: true } } })
    await flushPromises(); expect(failed.text()).toContain('Recycle unavailable')
  })
})
