import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, createSSRApp, defineComponent, reactive, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createApiGrowthGateway } from '../../app/services/growth/api-growth.gateway'
import { useGrowthStore } from '../../app/stores/growth'
import MemberGrowthPage from '../../app/pages/member/growth.vue'

const record = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Delivered accessibility audit',
  category: 'project',
  reflection: 'Learned to validate with keyboard users.',
  occurredOn: '2026-08-10',
  version: 1,
  createdAt: '2026-08-10T12:00:00.000Z',
  updatedAt: '2026-08-10T12:00:00.000Z',
}

describe('Growth production API integration', () => {
  beforeEach(() => { setActivePinia(createPinia()); localStorage.clear(); vi.unstubAllGlobals() })

  it('uses generated member Growth transport with CSRF and request correlation for CRUD', async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(record), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...record, version: 2, title: 'Updated' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: record.id, deleted: true, version: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const gateway = createApiGrowthGateway({ apiBase: 'https://api.example.test/', fetcher, readCookie: () => 'csrf-token', createRequestId: () => 'growth-ui-1' })

    await gateway.listMine()
    await gateway.create({ expectedVersion: 0, title: record.title, category: record.category, reflection: record.reflection, occurredOn: record.occurredOn })
    await gateway.update(record.id, { expectedVersion: 1, title: 'Updated', category: record.category, reflection: record.reflection, occurredOn: record.occurredOn })
    await gateway.remove(record.id, 2)

    expect(fetcher.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ['https://api.example.test/api/v1/members/me/growth-records', 'GET'],
      ['https://api.example.test/api/v1/members/me/growth-records', 'POST'],
      [`https://api.example.test/api/v1/members/me/growth-records/${record.id}`, 'PATCH'],
      [`https://api.example.test/api/v1/members/me/growth-records/${record.id}`, 'DELETE'],
    ])
    expect(fetcher.mock.calls[1]?.[1]?.headers).toEqual({ 'X-Request-ID': 'growth-ui-1', 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-token' })
  })

  it('normalizes the default browser request ID so the server preserves correlation', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' })
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await createApiGrowthGateway({ apiBase: 'https://api.example.test', fetcher }).listMine()

    expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual({ 'X-Request-ID': 'growth_11111111111141118111111111111111' })
  })

  it('keeps production Growth API-only through loading, error, and empty states', async () => {
    localStorage.setItem('baiyun-hsd.growth-records', JSON.stringify({ items: [{ id: 'stale-local-growth' }] }))
    const store = useGrowthStore()
    const pending = store.refresh({ listMine: vi.fn().mockReturnValue(new Promise(() => undefined)) } as never)
    expect(store.apiLoading).toBe(true)
    expect(store.items).toEqual([])
    void pending

    const failed = useGrowthStore()
    await failed.refresh({ listMine: vi.fn().mockRejectedValue(new Error('GROWTH_API_DOWN')) } as never)
    expect(failed.items).toEqual([])
    expect(failed.apiError).toMatchObject({ message: 'GROWTH_API_DOWN' })

    await failed.refresh({ listMine: vi.fn().mockResolvedValue({ items: [] }) } as never)
    expect(failed.items).toEqual([])
    expect(failed.apiError).toBeNull()
  })

  it('renders the real member page empty and error states from the API store', async () => {
    vi.stubGlobal('computed', computed); vi.stubGlobal('ref', ref); vi.stubGlobal('reactive', reactive); vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://api.example.test', useMockApi: false } }))
    vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => { await handler(); return { data: ref(null) } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    const app = createSSRApp(MemberGrowthPage); app.use(createPinia())
    app.component('EmptyState', defineComponent({ props: { title: String }, template: '<div data-testid="empty">{{ title }}</div>' }))
    const emptyHtml = await renderToString(app)
    expect(emptyHtml).toContain('data-testid="growth-record-form"')
    expect(emptyHtml).toContain('data-testid="empty"')

    const loadingPinia = createPinia()
    setActivePinia(loadingPinia)
    useGrowthStore().apiLoading = true
    vi.stubGlobal('useAsyncData', async () => ({ data: ref(null) }))
    const loadingApp = createSSRApp(MemberGrowthPage); loadingApp.use(loadingPinia)
    loadingApp.component('EmptyState', defineComponent({ props: { title: String }, template: '<div>{{ title }}</div>' }))
    expect(await renderToString(loadingApp)).toContain('role="status"')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'DOWN', message: 'Growth unavailable', requestId: 'req-1' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => { await handler(); return { data: ref(null) } })
    const failedApp = createSSRApp(MemberGrowthPage); failedApp.use(createPinia())
    failedApp.component('EmptyState', defineComponent({ props: { title: String }, template: '<div>{{ title }}</div>' }))
    expect(await renderToString(failedApp)).toContain('role="alert"')
  })

  it('renders member-owned records with edit and delete actions', async () => {
    vi.stubGlobal('computed', computed); vi.stubGlobal('ref', ref); vi.stubGlobal('reactive', reactive); vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://api.example.test', useMockApi: false } }))
    vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => { await handler(); return { data: ref(null) } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [record] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    const app = createSSRApp(MemberGrowthPage); app.use(createPinia())
    app.component('EmptyState', defineComponent({ props: { title: String }, template: '<div>{{ title }}</div>' }))

    const html = await renderToString(app)

    expect(html).toContain('Delivered accessibility audit')
    expect(html).toContain('>编辑</button>')
    expect(html).toContain('>删除</button>')
  })
})
