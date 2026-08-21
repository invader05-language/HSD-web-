import { createHsdApiClient, type ApiRequest, type ApiTransport, type ErrorResponse } from '../../../packages/api-client/src'
export interface ApiRecycleGatewayOptions { apiBase: string; fetcher?: typeof globalThis.fetch; readCookie?: (name: string) => string | undefined; createRequestId?: () => string }
export class RecycleApiError extends Error { constructor(readonly status: number, readonly code: string, message: string, readonly requestId?: string) { super(message); this.name = 'RecycleApiError' } }
const browserCookie = (name: string) => typeof document === 'undefined' ? undefined : document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${encodeURIComponent(name)}=`))?.slice(name.length + 1)
const isError = (value: unknown): value is ErrorResponse => Boolean(value && typeof value === 'object' && typeof (value as ErrorResponse).code === 'string' && typeof (value as ErrorResponse).message === 'string')
export function createApiRecycleGateway(options: ApiRecycleGatewayOptions) {
  const apiBase = options.apiBase.replace(/\/+$/, ''); const fetcher = options.fetcher ?? globalThis.fetch; const readCookie = options.readCookie ?? browserCookie; const createRequestId = options.createRequestId ?? (() => globalThis.crypto?.randomUUID?.() ?? `recycle-${Date.now()}`)
  const transport: ApiTransport = async (request: ApiRequest) => {
    const headers: Record<string, string> = { 'X-Request-ID': createRequestId() }
    if (request.method !== 'GET') { const csrf = readCookie('hsd_csrf'); if (!csrf) throw new RecycleApiError(403, 'RECYCLE_CSRF_TOKEN_MISSING', 'Recycle request could not be verified'); headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = decodeURIComponent(csrf) }
    const response = await fetcher(`${apiBase}${request.path}`, { method: request.method, credentials: 'include', headers, ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }) }); const payload: unknown = await response.json()
    if (!response.ok) throw new RecycleApiError(response.status, isError(payload) ? payload.code : 'RECYCLE_API_REQUEST_FAILED', isError(payload) ? payload.message : 'Recycle API request failed', isError(payload) ? payload.requestId : undefined)
    return payload
  }
  const client = createHsdApiClient(transport)
  return { list: () => client.recycle.list(), softDelete: (publicId: string, expectedVersion: number) => client.recycle.softDelete(publicId, { expectedVersion }), restore: (publicId: string, expectedVersion: number) => client.recycle.restore(publicId, { expectedVersion }), hardDelete: (publicId: string, expectedVersion: number, confirmed: boolean) => client.recycle.hardDelete(publicId, { expectedVersion, confirmed }) }
}
