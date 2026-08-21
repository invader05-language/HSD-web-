import vue from '@vitejs/plugin-vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, createSSRApp, defineComponent, nextTick, reactive, ref, type App, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createViteServer, type Vite } from 'vitest/node'
import HelpPage from '../../app/pages/help.vue'
import AdminHelpPage from '../../app/pages/admin/content/help.vue'
import { useHelpStore } from '../../app/stores/help'

type PayloadState = Record<string, unknown>

let vite: Vite.ViteDevServer

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const registerNuxtComponents = (app: App) => {
  app.component('PageBanner', defineComponent({ template: '<div />' }))
  app.component('EmptyState', defineComponent({ props: { title: String, description: String }, template: '<div>{{ title }} {{ description }}</div>' }))
  app.component('AdminPageHeading', defineComponent({ template: '<div />' }))
  app.component('AdminRecordWorkspace', defineComponent({ template: '<div />' }))
}

const installGlobals = (payload: PayloadState, isHydrating: boolean) => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('useHead', vi.fn())
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://api.example.test', useMockApi: false } }))
  vi.stubGlobal('useNuxtApp', () => ({ isHydrating }))
  vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
    if (!(key in payload)) payload[key] = init()
    return computed({
      get: () => payload[key] as T,
      set: (value) => { payload[key] = value },
    })
  })
}

const renderServer = async (path: string, fetcher: typeof globalThis.fetch) => {
  const payload: PayloadState = {}
  installGlobals(payload, false)
  vi.stubGlobal('fetch', fetcher)
  const module = await vite.ssrLoadModule(`${path}?help-hydration=${Math.random()}`)
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = createSSRApp(module.default)
  app.use(pinia)
  registerNuxtComponents(app)
  const html = await renderToString(app)
  return { html, payload: JSON.parse(JSON.stringify(payload)) as PayloadState }
}

const hydrateClient = async (component: Component, html: string, payload: PayloadState, fetcher: typeof globalThis.fetch) => {
  document.body.innerHTML = `<div id="app">${html}</div>`
  installGlobals(payload, true)
  vi.stubGlobal('fetch', fetcher)
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = createSSRApp(component)
  app.use(pinia)
  registerNuxtComponents(app)
  app.mount(document.querySelector('#app')!)
  await nextTick()
  return { app, pinia, root: document.querySelector('#app')! }
}

describe('Help SSR payload hydration', () => {
  beforeAll(async () => {
    vite = await createViteServer({
      configFile: false,
      appType: 'custom',
      server: { middlewareMode: true },
      plugins: [vue()],
      resolve: { alias: { '~': new URL('../../app', import.meta.url).pathname } },
    })
  })

  beforeEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  afterAll(async () => { await vite?.close() })

  it('hydrates public success without a duplicate request, loading flash, or mismatch, then allows refresh loading', async () => {
    const serverFetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => response({ items: [{ slug: 'hydrated-help', title: 'Hydrated Help', summary: 'Server summary', body: 'Server body', publishedAt: '2026-08-12T00:00:00.000Z' }] }))
    const server = await renderServer('/app/pages/help.vue', serverFetch)
    expect(server.html).toContain('Hydrated Help')
    expect(server.payload['help-public-initial']).toMatchObject({ initialized: true, items: [{ title: 'Hydrated Help' }] })

    const clientFetch = vi.fn<typeof globalThis.fetch>(() => new Promise<Response>(() => undefined))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const hydrated = await hydrateClient(HelpPage, server.html, server.payload, clientFetch)

    expect(hydrated.root.textContent).toContain('Hydrated Help')
    expect(hydrated.root.querySelector('[role="status"]')).toBeNull()
    expect(clientFetch).not.toHaveBeenCalled()
    expect(consoleError.mock.calls.flat().join(' ')).not.toMatch(/hydration|mismatch/i)

    const store = useHelpStore(hydrated.pinia)
    let resolveRefresh!: (value: { items: [] }) => void
    const listPublic = vi.fn(() => new Promise<{ items: [] }>((resolve) => { resolveRefresh = resolve }))
    const refresh = store.refreshPublic({ help: { listPublic } } as never)
    await nextTick()
    expect(hydrated.root.querySelector('[role="status"]')?.textContent).toContain('正在加载')
    resolveRefresh({ items: [] })
    await refresh
    hydrated.app.unmount()
    consoleError.mockRestore()
  }, 15_000)

  it('hydrates the admin empty state without clearing it or issuing a duplicate request', async () => {
    const serverFetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => response({ items: [] }))
    const server = await renderServer('/app/pages/admin/content/help.vue', serverFetch)
    expect(server.html).toContain('暂无帮助文章')
    expect(server.payload['help-admin-initial']).toMatchObject({ initialized: true, items: [] })

    const clientFetch = vi.fn<typeof globalThis.fetch>(() => new Promise<Response>(() => undefined))
    const hydrated = await hydrateClient(AdminHelpPage, server.html, server.payload, clientFetch)

    expect(hydrated.root.textContent).toContain('暂无帮助文章')
    expect(hydrated.root.querySelector('[role="status"]')).toBeNull()
    expect(clientFetch).not.toHaveBeenCalled()
    hydrated.app.unmount()
  }, 15_000)
})
