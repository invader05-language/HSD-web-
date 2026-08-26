import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { createApiHonorsGateway } from '../../app/services/honors/api-honors.gateway'
import { createHonorsGatewayForRuntime } from '../../app/composables/useHonorsGateway'
import { useHonorsStore } from '../../app/stores/honors'
import { useMemberHonorsStore } from '../../app/stores/member-honors'
import { computed, createSSRApp, defineComponent, reactive, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import MemberHonorsPage from '../../app/pages/member/honors.vue'

describe('Honors production API integration', () => {
  beforeEach(() => { setActivePinia(createPinia()); localStorage.clear() })

  it('uses the generated honors contract with CSRF and request correlation', async () => {
    const approved = { id: '9005f216-3ea1-4e37-86f8-15f906505e5d', publicId: 'hon_contract_approved', personId: '5c3e57e2-379e-450c-866f-16745f6a54f1', centerId: 'd83e2372-3776-4854-9418-eaf831251bea', memberName: 'Member', title: 'Award', type: 'service', description: '', awardedAt: '2026-08-01', awardedDatePrecision: 'day', awardedDateLabel: '2026年8月1日', proofReference: '', publicConsent: true, status: 'approved', version: 2, submittedAt: '2026-08-01T00:00:00.000Z' }
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(approved), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const gateway = createApiHonorsGateway({ apiBase: 'https://api.example.test/', fetcher, readCookie: () => 'csrf-token', createRequestId: () => 'honor-ui-1' })
    await gateway.listAdmin()
    expect(fetcher).toHaveBeenCalledWith('https://api.example.test/api/v1/admin/honors', { method: 'GET', credentials: 'include', headers: { 'X-Request-ID': 'honor-ui-1' } })
    await gateway.approve(approved.id, 1)
    expect(fetcher).toHaveBeenLastCalledWith(`https://api.example.test/api/v1/admin/honors/${approved.id}/approve`, {
      method: 'POST', credentials: 'include', headers: { 'X-Request-ID': 'honor-ui-1', 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-token' }, body: JSON.stringify({ expectedVersion: 1 }),
    })
  })

  it('keeps production Honors API-only through loading, error, and empty states', async () => {
    localStorage.setItem('baiyun-hsd.honors', JSON.stringify({ items: [{ id: 'stale-local' }] }))
    const store = useHonorsStore()
    const pending = store.refresh({ listAdmin: vi.fn().mockReturnValue(new Promise(() => undefined)) } as never)
    expect(store.apiLoading).toBe(true)
    expect(store.items).toEqual([])
    void pending
    const failed = useHonorsStore()
    await failed.refresh({ listAdmin: vi.fn().mockRejectedValue(new Error('HONORS_API_DOWN')) } as never)
    expect(failed.items).toEqual([])
    expect(failed.apiError).toMatchObject({ message: 'HONORS_API_DOWN' })
    await failed.refresh({ listAdmin: vi.fn().mockResolvedValue({ items: [] }) } as never)
    expect(failed.items).toEqual([])
    expect(failed.apiError).toBeNull()
  })

  it('renders the admin page from the API store and never production local fixtures', () => {
    const page = readFileSync('app/pages/admin/honors.vue', 'utf8')
    expect(page).toContain('useHonorsStore')
    expect(page).toContain('useHonorsGateway')
    expect(page).toContain('apiLoading')
    expect(page).toContain('apiError')
    expect(page).not.toContain('HONOR_REVIEW_RECORDS')
    expect(page).not.toContain('localStorage')
  })

  it('submits honors and updates consent through the generated member contract', async () => {
    const record = { id: '9005f216-3ea1-4e37-86f8-15f906505e5d', publicId: 'hon_contract_member', personId: '5c3e57e2-379e-450c-866f-16745f6a54f1', centerId: 'd83e2372-3776-4854-9418-eaf831251bea', memberName: 'Member', title: 'Award', type: 'service', description: '', awardedAt: '2026-08-01', awardedDatePrecision: 'day', awardedDateLabel: '2026年8月1日', proofReference: '', publicConsent: false, status: 'approved', version: 1, submittedAt: '2026-08-01T00:00:00.000Z' }
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(record), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...record, publicConsent: true, version: 2 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...record, publicConsent: false, version: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const gateway = createApiHonorsGateway({ apiBase: 'https://api.example.test', fetcher, readCookie: () => 'csrf', createRequestId: () => 'member-honor-1' })
    const store = useMemberHonorsStore()
    await store.submit(gateway, { expectedVersion: 0, title: 'Award', type: 'service', description: '', awardedAt: '2026-08-01', proofReference: '', publicConsent: false })
    await store.updateConsent(gateway, record.id, 1, true)
    expect(store.items[0]).toMatchObject({ publicConsent: true, version: 2 })
    await store.updateConsent(gateway, record.id, 2, false)
    expect(store.items[0]).toMatchObject({ publicConsent: false, version: 3 })
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['https://api.example.test/api/v1/members/me/honors', `https://api.example.test/api/v1/members/me/honors/${record.id}/consent`, `https://api.example.test/api/v1/members/me/honors/${record.id}/consent`])
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ expectedVersion: 1, publicConsent: true }) })
  })

  it('keeps member production honor failures API-only without localStorage restoration', async () => {
    localStorage.setItem('baiyun-hsd.honors', JSON.stringify({ items: [{ id: 'stale' }] }))
    const store = useMemberHonorsStore()
    await store.refresh({ listMine: vi.fn().mockRejectedValue(new Error('MEMBER_HONORS_DOWN')) } as never)
    expect(store.items).toEqual([])
    expect(store.apiError).toMatchObject({ message: 'MEMBER_HONORS_DOWN' })
  })

  it('renders the member production honor lifecycle and its empty state from the API', async () => {
    vi.stubGlobal('computed', computed); vi.stubGlobal('ref', ref); vi.stubGlobal('reactive', reactive); vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://api.example.test', useMockApi: false } }))
    vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => { await handler(); return { data: ref(null) } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    const app = createSSRApp(MemberHonorsPage); app.use(createPinia())
    app.component('EmptyState', defineComponent({ props: { title: String }, template: '<div data-testid="empty">{{ title }}</div>' }))
    const html = await renderToString(app)
    expect(html).toContain('data-testid="member-honor-form"')
    expect(html).toContain('data-testid="empty"')
  })
})

describe('Honors explicit Mock integration', () => {
  it('provides an interactive gateway and approves a pending Honor in closure state', async () => {
    const gateway = createHonorsGatewayForRuntime({ apiBase: '', useMockApi: true })!
    const pending = (await gateway.listAdmin()).items.find((item) => item.status === 'pending')!

    const approved = await gateway.approve(pending.id, pending.version)

    expect(approved).toMatchObject({ id: pending.id, status: 'approved', version: pending.version + 1 })
    expect((await gateway.listAdmin()).items.find((item) => item.id === pending.id)).toEqual(approved)
  })

  it('persists member submission and consent changes in the Mock gateway', async () => {
    const gateway = createHonorsGatewayForRuntime({ apiBase: '', useMockApi: true })!
    const before = await gateway.listMine()

    const created = await gateway.submit({
      expectedVersion: 0,
      title: 'Mock member submission',
      type: 'service',
      description: 'Created through the member store contract',
      awardedAt: '2026-08-12',
      proofReference: 'mock-proof.pdf',
      publicConsent: false,
    })
    const consented = await gateway.updateConsent(created.id, created.version, true)

    expect(created).toMatchObject({ title: 'Mock member submission', publicConsent: false, status: 'pending', version: 1 })
    expect(consented).toMatchObject({ id: created.id, publicConsent: true, version: 2 })
    const mine = await gateway.listMine()
    expect(mine.items).toHaveLength(before.items.length + 1)
    expect(mine.items.find((item) => item.id === created.id)).toEqual(consented)
  })

  it('rejects stale versions without changing Mock state', async () => {
    const gateway = createHonorsGatewayForRuntime({ apiBase: '', useMockApi: true })!
    const pending = (await gateway.listAdmin()).items.find((item) => item.status === 'pending')!
    await gateway.approve(pending.id, pending.version)
    const stateAfterApproval = await gateway.listAdmin()

    await expect(gateway.approve(pending.id, pending.version)).rejects.toThrow('MOCK_HONORS_VERSION_CONFLICT')

    expect(await gateway.listAdmin()).toEqual(stateAfterApproval)
  })

})
