// @vitest-environment node
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, createSSRApp, defineComponent, reactive, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import HelpPage from '../../app/pages/help.vue'
import AdminHelpPage from '../../app/pages/admin/content/help.vue'

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const renderPublic = async () => {
  const app = createSSRApp(HelpPage)
  app.use(createPinia())
  app.component('PageBanner', defineComponent({ template: '<div />' }))
  app.component('EmptyState', defineComponent({ props: { title: String, description: String }, template: '<div>{{ title }} {{ description }}</div>' }))
  return renderToString(app)
}

const renderAdmin = async () => {
  const app = createSSRApp(AdminHelpPage)
  app.use(createPinia())
  app.component('AdminPageHeading', defineComponent({ template: '<div />' }))
  return renderToString(app)
}

describe('Help real SSR integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('reactive', reactive)
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('useState', (_key: string, init: () => unknown) => ref(init()))
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://api.example.test', useMockApi: false } }))
  })

  it('awaits server prefetch before rendering public success and admin empty states', async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ items: [{ slug: 'ssr-help', title: 'SSR Help', summary: 'SSR summary', body: 'SSR body', publishedAt: '2026-08-12T00:00:00.000Z' }] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
    vi.stubGlobal('fetch', fetcher)

    expect(await renderPublic()).toContain('SSR Help')
    expect(await renderAdmin()).toContain('暂无帮助文章')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('awaits server prefetch before rendering public and admin API errors', async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ code: 'HELP_DOWN', message: 'SSR public unavailable', requestId: 'req-public-ssr' }, 503))
      .mockResolvedValueOnce(jsonResponse({ code: 'HELP_DOWN', message: 'SSR admin unavailable', requestId: 'req-admin-ssr' }, 503))
    vi.stubGlobal('fetch', fetcher)

    expect(await renderPublic()).toContain('SSR public unavailable')
    expect(await renderAdmin()).toContain('SSR admin unavailable')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
