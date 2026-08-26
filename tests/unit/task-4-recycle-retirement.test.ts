import { existsSync, readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { API_OPERATIONS, API_V1_PATHS, createHsdApiClient } from '../../packages/api-client/src'
import { RELEASE_FEATURES } from '../../app/config/release-features'
import { ADMIN_NAVIGATION, getAdminNavigationForAccess } from '../../app/data/admin-platform'
import { useHonorsStore } from '../../app/stores/honors'
import { createApiHonorsGateway } from '../../app/services/honors/api-honors.gateway'
import { createHonorsGatewayForRuntime } from '../../app/composables/useHonorsGateway'
import { RECYCLE_BIN_RETIRED_NOTICE, resolveDisabledRoute } from '../../app/utils/admin-release-access'

describe('Task 4 recycle-bin retirement', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('removes the recycle-bin feature and navigation entry from the admin surface', () => {
    expect('recycleBin' in RELEASE_FEATURES).toBe(false)
    expect(ADMIN_NAVIGATION.flatMap((group) => group.items).some((item) => item.id === 'recycle-bin')).toBe(false)
    expect(getAdminNavigationForAccess({ canManageAdminAccounts: true }).flatMap((group) => group.items).some((item) => item.to === '/admin/recycle-bin')).toBe(false)
  })

  it('redirects the retired route and all nested paths to admin with a retirement notice', () => {
    expect(resolveDisabledRoute('/admin/recycle-bin')).toEqual({ to: '/admin', notice: RECYCLE_BIN_RETIRED_NOTICE })
    expect(resolveDisabledRoute('/admin/recycle-bin/honors/retired-id')).toEqual({ to: '/admin', notice: RECYCLE_BIN_RETIRED_NOTICE })
  })

  it('keeps honors review and API gateway free of recycle mutations', () => {
    const honorsStore = useHonorsStore()
    const honorsGateway = createApiHonorsGateway({ apiBase: 'https://api.example.test', fetcher: vi.fn() })
    const mockHonorsGateway = createHonorsGatewayForRuntime({ apiBase: '', useMockApi: true })
    const honorsPage = readFileSync('app/pages/admin/honors.vue', 'utf8')

    expect('softDelete' in honorsStore).toBe(false)
    expect('softDelete' in honorsGateway).toBe(false)
    expect('softDelete' in mockHonorsGateway).toBe(false)
    expect(honorsPage).not.toContain('移入回收站')
    expect(honorsPage).toContain('审核通过')
  })

  it('removes retired page, store, gateway, and composable artifacts', () => {
    for (const path of [
      'app/pages/admin/recycle-bin.vue',
      'app/stores/recycle.ts',
      'app/composables/useRecycleGateway.ts',
      'app/services/recycle/api-recycle.gateway.ts',
      'app/services/recycle/mock-recycle.gateway.ts',
    ]) {
      expect(existsSync(path), path).toBe(false)
    }
  })

  it('does not expose recycle operations from the hand-written API client surface', () => {
    const client = createHsdApiClient(vi.fn() as never)
    expect('recycle' in client).toBe(false)
  })

  it('keeps the generated browser contract aligned with the retired OpenAPI surface', () => {
    const snapshot = JSON.parse(readFileSync('packages/api-client/openapi.snapshot.json', 'utf8')) as {
      paths: Record<string, unknown>
      components: { schemas: Record<string, unknown> }
    }
    const generated = readFileSync('packages/api-client/src/generated.ts', 'utf8')

    expect(Object.keys(API_OPERATIONS).some((operation) => operation.includes('recycle-bin'))).toBe(false)
    expect(Object.values(API_V1_PATHS).some((path) => path.includes('recycle-bin'))).toBe(false)
    expect(Object.keys(snapshot.paths).some((path) => path.includes('recycle-bin'))).toBe(false)
    expect(Object.keys(snapshot.components.schemas).some((name) => name.startsWith('Recycle') || name === 'HardDeleteRecycleDto' || name === 'HardDeleteResponseDto')).toBe(false)
    expect(generated).not.toContain('recycle-bin')
    expect(generated).not.toContain('Recycle')
    expect(generated).not.toContain('HardDeleteResponseDto')
  })
})
