import { defineStore } from "pinia";

export interface PublicResourceSummary { slug: string; title: string; summary: string; kind: string; format: string; versionLabel: string; access: "public" | "member" }
export interface PublicResourceDetail extends PublicResourceSummary { content: string; variant?: Record<string, unknown> }
type ResourceGateway = { resources: { listPublic(): Promise<{ items: PublicResourceSummary[] }> }; resource(slug: string): Promise<PublicResourceDetail>; resourceVersion(slug: string, versionLabel: string): Promise<PublicResourceDetail> };
const errorFrom = (error: unknown) => { const value = error as { status?: unknown; code?: unknown; requestId?: unknown }; return error instanceof Error ? { status: typeof value.status === "number" ? value.status : undefined, code: typeof value.code === "string" ? value.code : "RESOURCE_API_REQUEST_FAILED", message: error.message, requestId: typeof value.requestId === "string" ? value.requestId : undefined } : { code: "RESOURCE_API_REQUEST_FAILED", message: "Resource API request failed" }; };

export const useResourcesStore = defineStore("resources", {
  state: () => ({ items: [] as PublicResourceSummary[], detail: undefined as PublicResourceDetail | undefined, apiModeActive: false, apiLoading: false, apiError: null as ReturnType<typeof errorFrom> | null }),
  actions: {
    activateApiMode() { this.apiModeActive = true; this.items = []; this.detail = undefined; this.apiError = null; },
    async refreshPublicFromApi(gateway: ResourceGateway) { this.activateApiMode(); this.apiLoading = true; try { this.items = (await gateway.resources.listPublic()).items; } catch (error) { this.apiError = errorFrom(error); } finally { this.apiLoading = false; } },
    async refreshPublicDetailFromApi(gateway: ResourceGateway, slug: string) { if (this.detail?.slug === slug) { this.apiModeActive = true; this.apiError = null; } else this.activateApiMode(); this.apiLoading = true; try { const list = await gateway.resources.listPublic(); this.items = list.items; const summary = list.items.find((item) => item.slug === slug); if (!summary) throw Object.assign(new Error("Resource not found"), { status: 404, code: "RESOURCE_NOT_FOUND" }); this.detail = summary.access === "member" ? await gateway.resourceVersion(slug, summary.versionLabel) : await gateway.resource(slug); return this.detail; } catch (error) { this.apiError = errorFrom(error); return undefined; } finally { this.apiLoading = false; } },
  },
});
