import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, nextTick, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createApiContentGateway } from '../../app/services/content/api-content.gateway'
import { useHelpStore } from '../../app/stores/help'
import HelpPage from '../../app/pages/help.vue'
import AdminHelpPage from '../../app/pages/admin/content/help.vue'
import AdminRecordWorkspace from '../../app/components/admin/AdminRecordWorkspace.vue'

describe('Help production API integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); localStorage.clear()
    vi.stubGlobal('computed', computed); vi.stubGlobal('ref', ref); vi.stubGlobal('reactive', reactive); vi.stubGlobal('useHead', vi.fn()); vi.stubGlobal('onServerPrefetch', vi.fn())
    vi.stubGlobal('useState', (_key: string, init: () => unknown) => ref(init())); vi.stubGlobal('useNuxtApp', () => ({ isHydrating: false }))
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://api.example.test', useMockApi: false } }))
  })

  it('uses the generated stable-slug public Help route', async () => {
    const article = { slug: 'account-login', title: 'Account login', summary: 'Account access.', body: 'Contact the talent center.', publishedAt: '2026-08-12T00:00:00.000Z' }
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(article), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const gateway = createApiContentGateway({ apiBase: 'https://api.example.test/', fetcher, createRequestId: () => 'help-read-1' })

    expect(await gateway.help.public('account/login')).toEqual(article)
    expect(fetcher).toHaveBeenCalledWith('https://api.example.test/api/v1/public/help/account%2Flogin', { method: 'GET', credentials: 'include', headers: { 'X-Request-ID': 'help-read-1' } })
  })

  it('keeps public and management loading, error, and empty state API-only', async () => {
    localStorage.setItem('baiyun-hsd.help', JSON.stringify({ items: [{ slug: 'stale' }] }))
    const store = useHelpStore()
    await store.refreshPublic({ help: { listPublic: vi.fn().mockResolvedValue({ items: [] }) } } as never)
    expect(store.publicItems).toEqual([])
    expect(store.publicLoading).toBe(false)
    await store.refreshPublic({ help: { listPublic: vi.fn().mockRejectedValue(new Error('HELP_API_DOWN')) } } as never)
    expect(store.publicItems).toEqual([])
    expect(store.publicError).toMatchObject({ message: 'HELP_API_DOWN' })

    let resolve!: (value: { items: [] }) => void
    const pending = store.refreshAdmin({ help: { listAdmin: vi.fn(() => new Promise((done) => { resolve = done })) } } as never)
    expect(store.adminLoading).toBe(true)
    resolve({ items: [] })
    await pending
    expect(store.adminItems).toEqual([])
  })

  it('saves a draft and publishes using optimistic versions through the real gateway', async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: '92bc51c7-57f3-473b-a79a-210cc949c150', slug: 'login', status: 'draft', version: 2, publishedAt: null, workingRevision: { revisionNumber: 2, title: 'Login', summary: 'Summary', body: 'Body' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: '92bc51c7-57f3-473b-a79a-210cc949c150', slug: 'login', status: 'published', version: 3, publishedAt: '2026-08-12T00:00:00.000Z', workingRevision: { revisionNumber: 2, title: 'Login', summary: 'Summary', body: 'Body' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    const gateway = createApiContentGateway({ apiBase: 'https://api.example.test', fetcher, readCookie: () => 'csrf-value', createRequestId: () => 'help-mutation-1' })
    const store = useHelpStore()
    store.adminItems = [{ id: '92bc51c7-57f3-473b-a79a-210cc949c150', slug: 'login', status: 'draft', version: 1, publishedAt: null, workingRevision: { revisionNumber: 1, title: 'Old', summary: 'Old', body: 'Old' } }]
    await store.saveDraft(gateway, store.adminItems[0]!, { title: 'Login', summary: 'Summary', body: 'Body' })
    await store.publish(gateway, store.adminItems[0]!)
    expect(fetcher.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
      ['https://api.example.test/api/v1/admin/help/92bc51c7-57f3-473b-a79a-210cc949c150/draft', 'PATCH', JSON.stringify({ expectedVersion: 1, title: 'Login', summary: 'Summary', body: 'Body' })],
      ['https://api.example.test/api/v1/admin/help/92bc51c7-57f3-473b-a79a-210cc949c150/publish', 'POST', JSON.stringify({ expectedVersion: 2, confirmed: true })],
    ])
  })

  it('publishes the persisted current editor values with the returned optimistic version', async () => {
    const store = useHelpStore()
    const original = { id: '92bc51c7-57f3-473b-a79a-210cc949c151', slug: 'login', status: 'draft', version: 1, publishedAt: null, workingRevision: { revisionNumber: 1, title: 'Old', summary: 'Old', body: 'Old' } }
    store.adminItems = [original]
    const saved = { ...original, version: 2, workingRevision: { revisionNumber: 2, title: 'Editor title', summary: 'Editor summary', body: 'Editor body' } }
    const gateway = { help: { updateDraft: vi.fn().mockResolvedValue(saved), publish: vi.fn().mockResolvedValue({ ...saved, version: 3, status: 'published' }) } }
    const persisted = await store.saveDraft(gateway as never, original, { title: 'Editor title', summary: 'Editor summary', body: 'Editor body' })
    await store.publish(gateway as never, persisted!)
    expect(gateway.help.publish).toHaveBeenCalledWith(original.id, { expectedVersion: 2, confirmed: true })
  })

  it('renders production public loading, API content, errors, and empty state without fixtures', async () => {
    let resolve!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((done) => { resolve = done })))
    const wrapper = mount(defineComponent({ components: { HelpPage }, template: '<Suspense><HelpPage /></Suspense>' }), { global: { stubs: { PageBanner: true, EmptyState: { props: ['title', 'description'], template: '<div data-testid="empty">{{ title }} {{ description }}</div>' } } } })
    await flushPromises(); await nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('正在加载')
    resolve(new Response(JSON.stringify({ items: [{ slug: 'api-only', title: 'API only Help', summary: 'Published summary', body: 'Published body', publishedAt: '2026-08-12T00:00:00.000Z' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await flushPromises(); await nextTick()
    expect(wrapper.text()).toContain('API only Help')
    expect(wrapper.text()).not.toContain('招新报名与申请进度')

    wrapper.unmount(); setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'HELP_API_DOWN', message: 'Help service unavailable', requestId: 'req-help' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    const failed = mount(defineComponent({ components: { HelpPage }, template: '<Suspense><HelpPage /></Suspense>' }), { global: { stubs: { PageBanner: true, EmptyState: { props: ['title', 'description'], template: '<div data-testid="empty">{{ title }} {{ description }}</div>' } } } })
    await flushPromises(); await nextTick()
    expect(failed.get('[data-testid="empty"]').text()).toContain('Help service unavailable')
  })

  it('renders editable Help fixtures in explicit Mock mode', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '', useMockApi: true } }))
    vi.stubGlobal('definePageMeta', vi.fn())
    const wrapper = mount(AdminHelpPage, { attachTo: document.body, global: { components: { AdminRecordWorkspace }, stubs: { AdminPageHeading: true, AdminStatusPill: true } } })
    await flushPromises()
    expect(wrapper.text()).toContain('如何查询考核结果')
    const fixtureRow = wrapper.findAll('tr').find((row) => row.text().includes('如何查询考核结果'))!
    await fixtureRow.get('button').trigger('click')
    await nextTick()
    const titleInput = document.body.querySelector('aside input') as HTMLInputElement
    expect(titleInput.value).toBe('如何查询考核结果')
    titleInput.value = 'Mock fixture edited'
    titleInput.dispatchEvent(new Event('input'))
    expect(titleInput.value).toBe('Mock fixture edited')
    wrapper.unmount()
  })

  it('mounts production Help pages immediately and exposes loading before pending requests settle', async () => {
    vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))
    const publicPage = mount(HelpPage, { global: { stubs: { PageBanner: true, EmptyState: true } } })
    const adminPage = mount(AdminHelpPage, { global: { stubs: { AdminPageHeading: true } } })
    await nextTick()
    expect(publicPage.get('[role="status"]').text()).toContain('正在加载')
    expect(adminPage.get('[role="status"]').text()).toContain('正在加载')
  })

  it('renders production admin empty and error states from settled API requests', async () => {
    vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    const empty = mount(AdminHelpPage, { global: { stubs: { AdminPageHeading: true } } })
    await flushPromises(); await nextTick()
    expect(empty.text()).toContain('暂无帮助文章')
    empty.unmount(); setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ code: 'HELP_API_DOWN', message: 'Admin Help unavailable', requestId: 'req-admin-help' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    const failed = mount(AdminHelpPage, { global: { stubs: { AdminPageHeading: true } } })
    await flushPromises(); await nextTick()
    expect(failed.text()).toContain('Admin Help unavailable')
  })

})
