import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiPublicMembersGateway } from '../../app/services/members/api-public-members.gateway'

describe('public members API gateway request ids', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the public member directory when crypto.randomUUID is unavailable on HTTP', async () => {
    vi.stubGlobal('crypto', {})
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const gateway = createApiPublicMembersGateway({
      apiBase: 'http://114.132.236.244',
      fetcher,
    })

    await gateway.list()

    expect(fetcher).toHaveBeenCalledWith(
      'http://114.132.236.244/api/v1/public/members',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Request-ID': expect.stringMatching(/^web-/),
        }),
      }),
    )
  })
})
