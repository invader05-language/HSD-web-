import { createApiContentGateway, type ApiContentGatewayOptions } from "../services/content/api-content.gateway";

interface ContentRuntimeConfig { apiBase: string; useMockApi: boolean }
export function createContentGatewayForRuntime(config: ContentRuntimeConfig, options: Omit<ApiContentGatewayOptions, "apiBase"> = {}) { return config.useMockApi ? undefined : createApiContentGateway({ apiBase: config.apiBase, ...options }); }
export function useContentGateway() { const config = useRuntimeConfig() as { public: ContentRuntimeConfig }; return createContentGatewayForRuntime(config.public); }
