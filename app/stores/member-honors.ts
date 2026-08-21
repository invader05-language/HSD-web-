import { defineStore } from 'pinia'
import type { AdminHonorResponseDto, CreateHonorDto } from '../../packages/api-client/src'

type Gateway = { listMine(): Promise<{ items: AdminHonorResponseDto[] }>; submit(input: CreateHonorDto): Promise<AdminHonorResponseDto>; updateConsent(id: string, expectedVersion: number, consent: boolean): Promise<AdminHonorResponseDto> }
const errorFrom = (error: unknown) => error instanceof Error ? { message: error.message, code: typeof (error as any).code === 'string' ? (error as any).code : 'MEMBER_HONORS_API_FAILED' } : { message: 'Honor API request failed', code: 'MEMBER_HONORS_API_FAILED' }
export const useMemberHonorsStore = defineStore('member-honors', {
  state: () => ({ items: [] as AdminHonorResponseDto[], apiLoading: false, apiError: null as ReturnType<typeof errorFrom> | null }),
  actions: {
    async refresh(gateway: Gateway) { this.items = []; this.apiError = null; this.apiLoading = true; try { this.items = (await gateway.listMine()).items } catch (error) { this.apiError = errorFrom(error) } finally { this.apiLoading = false } },
    async submit(gateway: Gateway, input: CreateHonorDto) { this.apiError = null; this.apiLoading = true; try { const created = await gateway.submit(input); this.items = [created, ...this.items]; return created } catch (error) { this.apiError = errorFrom(error); return undefined } finally { this.apiLoading = false } },
    async updateConsent(gateway: Gateway, id: string, expectedVersion: number, consent: boolean) { this.apiError = null; this.apiLoading = true; try { const updated = await gateway.updateConsent(id, expectedVersion, consent); this.items = this.items.map((item) => item.id === id ? updated : item); return updated } catch (error) { this.apiError = errorFrom(error); return undefined } finally { this.apiLoading = false } },
  },
})
