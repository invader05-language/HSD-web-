import { createHsdApiClient, type ApiRequest, type ApiTransport, type ErrorResponse } from '../../../packages/api-client/src'
export function createApiPublicMembersGateway(options: { apiBase: string; fetcher?: typeof fetch; createRequestId?: () => string }) {
  const base = options.apiBase.replace(/\/+$/, ''); const fetcher = options.fetcher ?? fetch; const id = options.createRequestId ?? (() => globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`)
  const transport: ApiTransport = async (request: ApiRequest) => { const response = await fetcher(`${base}${request.path}`, { method: request.method, credentials: 'include', headers: { 'X-Request-ID': id() } }); const body: unknown = await response.json(); if (!response.ok) { const e = body as ErrorResponse; throw Object.assign(new Error(e.message ?? 'Public members request failed'), { status: response.status, code: e.code }) } return body }
  return createHsdApiClient(transport).publicMembers
}
