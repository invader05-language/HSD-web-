import { defineStore } from 'pinia'
import type { CreateGrowthRecordDto, GrowthRecordResponseDto, UpdateGrowthRecordDto } from '../../packages/api-client/src'

type Gateway = {
  listMine(): Promise<{ items: GrowthRecordResponseDto[] }>
  create(input: CreateGrowthRecordDto): Promise<GrowthRecordResponseDto>
  update(id: string, input: UpdateGrowthRecordDto): Promise<GrowthRecordResponseDto>
  remove(id: string, expectedVersion: number): Promise<{ id: string; deleted: boolean; version: number }>
}
const errorFrom = (error: unknown) => error instanceof Error ? { message: error.message, code: typeof (error as any).code === 'string' ? (error as any).code : 'GROWTH_API_FAILED' } : { message: 'Growth API request failed', code: 'GROWTH_API_FAILED' }

export const useGrowthStore = defineStore('growth-records', {
  state: () => ({ items: [] as GrowthRecordResponseDto[], apiLoading: false, apiError: null as ReturnType<typeof errorFrom> | null }),
  actions: {
    async refresh(gateway: Gateway) { this.items = []; this.apiError = null; this.apiLoading = true; try { this.items = (await gateway.listMine()).items } catch (error) { this.apiError = errorFrom(error) } finally { this.apiLoading = false } },
    async create(gateway: Gateway, input: CreateGrowthRecordDto) { this.apiError = null; this.apiLoading = true; try { const created = await gateway.create(input); this.items = [created, ...this.items]; return created } catch (error) { this.apiError = errorFrom(error); return undefined } finally { this.apiLoading = false } },
    async update(gateway: Gateway, id: string, input: UpdateGrowthRecordDto) { this.apiError = null; this.apiLoading = true; try { const updated = await gateway.update(id, input); this.items = this.items.map((item) => item.id === id ? updated : item); return updated } catch (error) { this.apiError = errorFrom(error); return undefined } finally { this.apiLoading = false } },
    async remove(gateway: Gateway, id: string, expectedVersion: number) { this.apiError = null; this.apiLoading = true; try { const deleted = await gateway.remove(id, expectedVersion); this.items = this.items.filter((item) => item.id !== deleted.id); return deleted } catch (error) { this.apiError = errorFrom(error); return undefined } finally { this.apiLoading = false } },
  },
})
