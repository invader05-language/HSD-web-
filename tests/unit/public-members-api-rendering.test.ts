import { createPinia, setActivePinia } from 'pinia'
import { computed, createSSRApp, defineComponent, onMounted, ref, watch } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MemberDetailPage from '../../app/pages/people/[id].vue'
import MembersPage from '../../app/pages/people/members.vue'
import CorePage from '../../app/pages/people/core.vue'
import AboutPage from '../../app/pages/about.vue'

const publicId = '8a3b610d-6d5e-48ad-a591-4969f699ef02'
const member = (honors: Array<Record<string, unknown>>) => ({ publicId, name: 'API Member', grade: '2026', className: 'Class 1', avatar: { kind: 'default', variant: 'white-hsd' }, center: { publicSlug: 'baize-development', name: 'API Center' }, duty: 'REGULAR', honors: honors.map((honor) => ({ awardedDatePrecision: 'day', awardedDateLabel: '2026年8月1日', ...honor })), positions: [], bio: 'Server profile' })

describe('public member API rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.assign(globalThis, { computed, ref, watch, onMounted })
    vi.stubGlobal('useRoute', () => ({ params: { id: publicId } }))
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://api.example.test', useMockApi: false } }))
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('createError', (input: unknown) => Object.assign(new Error('route error'), input))
    vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => { await handler(); return { data: ref(null) } })
  })

  async function render(response: unknown) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    const app = createSSRApp(MemberDetailPage); app.use(createPinia())
    app.component('PageBanner', defineComponent({ props: { title: String }, template: '<h1>{{ title }}</h1>' }))
    app.component('HsdAvatar', defineComponent({ template: '<span />' })); app.component('NuxtLink', defineComponent({ template: '<a><slot /></a>' }))
    return renderToString(app)
  }

  it('renders only honors returned by the filtered public projection and removes them after consent withdrawal', async () => {
    const honor = { id: 'hon_public', title: 'Published Award', type: 'service', description: 'Published description', awardedAt: '2026-08-01', awardedDatePrecision: 'day', awardedDateLabel: '2026年8月1日', featured: false }
    const published = await render(member([honor]))
    expect(published).toContain('Published Award')
    expect(published).toContain('2026年8月1日')
    expect(published).not.toContain('Published description')
    expect(published).not.toContain('proofReference')
    const withdrawn = await render(member([]))
    expect(withdrawn).not.toContain('Published Award')
  })

  it('renders a historical unknown honor date label without exposing its internal anchor date', async () => {
    const honor = { id: 'hon_unknown', title: 'Historical Award', type: 'service', description: '', awardedAt: '2026-08-22', awardedDatePrecision: 'unknown', awardedDateLabel: '日期待补充', featured: false }
    const html = await render(member([honor]))

    expect(html).toContain('日期待补充')
    expect(html).not.toContain('>2026-08-22<')
  })

  it('renders the production member directory from the public members API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [member([{ id: 'hon_directory', title: 'Directory Award', type: 'service', description: '', awardedAt: '2026-08-01', featured: false }])] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    const app = createSSRApp(MembersPage); app.use(createPinia())
    app.component('PageBanner', defineComponent({ template: '<span />' })); app.component('HsdAvatar', defineComponent({ template: '<span />' }))
    app.component('NuxtLink', defineComponent({ template: '<a><slot /></a>' })); app.component('EmptyState', defineComponent({ template: '<div data-testid="empty" />' }))
    app.component('PaginationControls', defineComponent({ template: '<span />' }))
    const html = await renderToString(app)
    expect(html).toContain('API Member')
    expect(html).not.toContain('Directory Award')
    expect(html).not.toContain('data-testid="empty"')
  })

  it('renders the production core directory from the same authoritative public projection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{ ...member([]), duty: 'CORE', coreRole: { title: 'Lead', order: 1 } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    const app = createSSRApp(CorePage); app.use(createPinia())
    app.component('PageBanner', defineComponent({ template: '<span />' })); app.component('HsdAvatar', defineComponent({ template: '<span />' }))
    app.component('NuxtLink', defineComponent({ template: '<a><slot /></a>' })); app.component('EmptyState', defineComponent({ template: '<div data-testid="empty" />' })); app.component('PaginationControls', defineComponent({ template: '<span />' }))
    const html = await renderToString(app)
    expect(html).toContain('API Member')
    expect(html).not.toContain('data-testid="empty"')
  })

  it('renders real API names in the about-page core and member showcases', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [
        { ...member([]), publicId: 'core-zhou', name: '周颖琦', duty: 'CORE', coreRole: { title: '核心成员', order: 1 } },
        { ...member([]), publicId: 'member-xu', name: '许淦樾', duty: 'REGULAR' },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    const app = createSSRApp(AboutPage); app.use(createPinia())
    app.component('PageBanner', defineComponent({ template: '<span />' })); app.component('HsdAvatar', defineComponent({ template: '<span />' }))
    app.component('NuxtLink', defineComponent({ template: '<a><slot /></a>' }))
    const html = await renderToString(app)
    expect(html).toContain('周颖琦')
    expect(html).toContain('许淦樾')
    expect(html).not.toContain('林同学')
    expect(html).not.toContain('郭同学')
  })
})
