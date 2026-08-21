import { defineStore } from 'pinia'
import type { AdminHelpResponseDto, PublicHelpResponseDto } from '../../packages/api-client/src'

type HelpGateway = { help: {
  listPublic(): Promise<{ items: PublicHelpResponseDto[] }>
  listAdmin(): Promise<{ items: AdminHelpResponseDto[] }>
  create(input: { slug: string; title: string; summary: string; body: string; expectedVersion: number }): Promise<AdminHelpResponseDto>
  updateDraft(id: string, input: { expectedVersion: number; title?: string; summary?: string; body?: string }): Promise<AdminHelpResponseDto>
  publish(id: string, input: { expectedVersion: number; confirmed: boolean }): Promise<AdminHelpResponseDto>
} }
const errorFrom = (error: unknown) => ({ code: typeof (error as any)?.code === 'string' ? (error as any).code : 'HELP_API_REQUEST_FAILED', message: error instanceof Error ? error.message : 'Help API request failed', status: typeof (error as any)?.status === 'number' ? (error as any).status : undefined, requestId: typeof (error as any)?.requestId === 'string' ? (error as any).requestId : undefined })

export const useHelpStore = defineStore('help', {
  state: () => ({ publicItems: [] as PublicHelpResponseDto[], adminItems: [] as AdminHelpResponseDto[], publicLoading: false, adminLoading: false, publicError: null as ReturnType<typeof errorFrom> | null, adminError: null as ReturnType<typeof errorFrom> | null }),
  actions: {
    async refreshPublic(gateway: HelpGateway) { this.publicItems = []; this.publicError = null; this.publicLoading = true; try { this.publicItems = (await gateway.help.listPublic()).items } catch (error) { this.publicError = errorFrom(error) } finally { this.publicLoading = false } },
    async refreshAdmin(gateway: HelpGateway) { this.adminItems = []; this.adminError = null; this.adminLoading = true; try { this.adminItems = (await gateway.help.listAdmin()).items } catch (error) { this.adminError = errorFrom(error) } finally { this.adminLoading = false } },
    async createDraft(gateway: HelpGateway, input: { slug: string; title: string; summary: string; body: string }) { this.adminError = null; try { const saved = await gateway.help.create({ ...input, expectedVersion: 0 }); this.replace(saved); return saved } catch (error) { this.adminError = errorFrom(error); return undefined } },
    async saveDraft(gateway: HelpGateway, article: AdminHelpResponseDto, input: { title: string; summary: string; body: string }) { this.adminError = null; try { const saved = await gateway.help.updateDraft(article.id, { expectedVersion: article.version, ...input }); this.replace(saved); return saved } catch (error) { this.adminError = errorFrom(error); return undefined } },
    async publish(gateway: HelpGateway, article: AdminHelpResponseDto) { this.adminError = null; try { const saved = await gateway.help.publish(article.id, { expectedVersion: article.version, confirmed: true }); this.replace(saved); return saved } catch (error) { this.adminError = errorFrom(error); return undefined } },
    replace(saved: AdminHelpResponseDto) { const index = this.adminItems.findIndex((item) => item.id === saved.id); if (index >= 0) this.adminItems[index] = saved; else this.adminItems.unshift(saved) },
  },
})
