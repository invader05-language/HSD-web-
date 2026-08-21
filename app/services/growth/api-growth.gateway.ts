import { createHsdApiClient, type ApiRequest, type ApiTransport, type ErrorResponse, type UpdateGrowthRecordDto } from '../../../packages/api-client/src'

export interface ApiGrowthGatewayOptions { apiBase: string; fetcher?: typeof globalThis.fetch; readCookie?: (name: string) => string | undefined; createRequestId?: () => string }
export class GrowthApiError extends Error { constructor(readonly status: number, readonly code: string, message: string, readonly requestId?: string) { super(message); this.name = 'GrowthApiError' } }
const browserCookie = (name: string) => typeof document === 'undefined' ? undefined : document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${encodeURIComponent(name)}=`))?.slice(name.length + 1)
const isError = (value: unknown): value is ErrorResponse => Boolean(value && typeof value === 'object' && typeof (value as ErrorResponse).code === 'string' && typeof (value as ErrorResponse).message === 'string')

export function createApiGrowthGateway(options: ApiGrowthGatewayOptions) {
  const apiBase = options.apiBase.replace(/\/+$/, '')
  const fetcher = options.fetcher ?? globalThis.fetch
  const readCookie = options.readCookie ?? browserCookie
  const createRequestId = options.createRequestId ?? (() => {
    const uuid = globalThis.crypto?.randomUUID?.()
    return uuid ? `growth_${uuid.replaceAll('-', '')}` : `growth_${Date.now()}`
  })
  const transport: ApiTransport = async (request: ApiRequest) => {
    const headers: Record<string, string> = { 'X-Request-ID': createRequestId() }
    if (request.method !== 'GET') {
      const csrf = readCookie('hsd_csrf')
      if (!csrf) throw new GrowthApiError(403, 'GROWTH_CSRF_TOKEN_MISSING', 'Growth record request could not be verified')
      headers['Content-Type'] = 'application/json'
      headers['X-CSRF-Token'] = decodeURIComponent(csrf)
    }
    const response = await fetcher(`${apiBase}${request.path}`, { method: request.method, credentials: 'include', headers, ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }) })
    const payload: unknown = await response.json()
    if (!response.ok) throw new GrowthApiError(response.status, isError(payload) ? payload.code : 'GROWTH_API_REQUEST_FAILED', isError(payload) ? payload.message : 'Growth API request failed', isError(payload) ? payload.requestId : undefined)
    return payload
  }
  const client = createHsdApiClient(transport)
  return {
    listMine: () => client.members.growthRecords(),
    detail: (id: string) => client.members.growthRecord(id),
    create: (input: Parameters<typeof client.members.createGrowthRecord>[0]) => client.members.createGrowthRecord(input),
    update: (id: string, input: UpdateGrowthRecordDto) => client.members.updateGrowthRecord(id, input),
    remove: (id: string, expectedVersion: number) => client.members.deleteGrowthRecord(id, { expectedVersion }),
  }
}
