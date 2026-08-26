import { defineStore } from 'pinia'
import type { AdminHonorResponseDto } from '../../packages/api-client/src'

type HonorsGateway = { listAdmin(): Promise<{ items: AdminHonorResponseDto[] }>; approve(id: string, expectedVersion: number): Promise<AdminHonorResponseDto> }
const errorFrom = (error: unknown) => { const value = error as { status?: unknown; code?: unknown; requestId?: unknown }; return error instanceof Error ? { status: typeof value.status === 'number' ? value.status : undefined, code: typeof value.code === 'string' ? value.code : 'HONORS_API_REQUEST_FAILED', message: error.message, requestId: typeof value.requestId === 'string' ? value.requestId : undefined } : { code: 'HONORS_API_REQUEST_FAILED', message: 'Honor API request failed' } }

export const useHonorsStore = defineStore('honors', {
  state: () => ({ items: [] as AdminHonorResponseDto[], apiModeActive: false, apiLoading: false, apiError: null as ReturnType<typeof errorFrom> | null }),
  actions: {
    activateApiMode() { this.apiModeActive = true; this.items = []; this.apiError = null },
    async refresh(gateway: HonorsGateway) { this.activateApiMode(); this.apiLoading = true; try { this.items = (await gateway.listAdmin()).items } catch (error) { this.apiError = errorFrom(error) } finally { this.apiLoading = false } },
    async approve(gateway: HonorsGateway, id: string, expectedVersion: number) { this.apiLoading = true; this.apiError = null; try { const updated = await gateway.approve(id, expectedVersion); this.items = this.items.map((item) => item.id === id ? updated : item); return updated } catch (error) { this.apiError = errorFrom(error); return undefined } finally { this.apiLoading = false } },
  },
})
