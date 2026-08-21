import { createHsdApiClient, type ApiRequest, type ApiTransport, type ErrorResponse } from '../../../packages/api-client/src'

export interface ApiHonorsGatewayOptions { apiBase: string; fetcher?: typeof globalThis.fetch; readCookie?: (name: string) => string | undefined; createRequestId?: () => string }
export class HonorsApiError extends Error { constructor(readonly status: number, readonly code: string, message: string, readonly requestId?: string) { super(message); this.name = 'HonorsApiError' } }
const browserCookie = (name: string) => typeof document === 'undefined' ? undefined : document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${encodeURIComponent(name)}=`))?.slice(name.length + 1)
const isError = (value: unknown): value is ErrorResponse => Boolean(value && typeof value === 'object' && typeof (value as ErrorResponse).code === 'string' && typeof (value as ErrorResponse).message === 'string')

export function createApiHonorsGateway(options: ApiHonorsGatewayOptions) {
  const apiBase = options.apiBase.replace(/\/+$/, '')
  const fetcher = options.fetcher ?? globalThis.fetch
  const readCookie = options.readCookie ?? browserCookie
  const createRequestId = options.createRequestId ?? (() => globalThis.crypto?.randomUUID?.() ?? `honor-${Date.now()}`)
  const transport: ApiTransport = async (request: ApiRequest) => {
    const headers: Record<string, string> = { 'X-Request-ID': createRequestId() }
    if (request.method !== 'GET') {
      const csrf = readCookie('hsd_csrf')
      if (!csrf) throw new HonorsApiError(403, 'HONORS_CSRF_TOKEN_MISSING', 'Honor request could not be verified')
      headers['Content-Type'] = 'application/json'
      headers['X-CSRF-Token'] = decodeURIComponent(csrf)
    }
    const response = await fetcher(`${apiBase}${request.path}`, { method: request.method, credentials: 'include', headers, ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }) })
    const payload: unknown = await response.json()
    if (!response.ok) throw new HonorsApiError(response.status, isError(payload) ? payload.code : 'HONORS_API_REQUEST_FAILED', isError(payload) ? payload.message : 'Honor API request failed', isError(payload) ? payload.requestId : undefined)
    return payload
  }
  const client = createHsdApiClient(transport)
  return {
    listAdmin: () => client.honors.listAdmin(),
    approve: (id: string, expectedVersion: number) => client.honors.approve(id, { expectedVersion }),
    softDelete: (publicId: string, expectedVersion: number) => client.recycle.softDelete(publicId, { expectedVersion }),
    listMine: () => client.members.honors(),
    submit: (input: Parameters<typeof client.members.submitHonor>[0]) => client.members.submitHonor(input),
    updateConsent: (id: string, expectedVersion: number, publicConsent: boolean) => client.members.updateHonorConsent(id, { expectedVersion, publicConsent }),
  }
}
