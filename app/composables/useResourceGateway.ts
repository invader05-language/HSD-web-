import { createApiResourceGateway, type ApiResourceGatewayOptions } from "../services/resources/api-resource.gateway";

interface ResourceRuntimeConfig { apiBase: string; useMockApi: boolean; }
export function createResourceGatewayForRuntime(config: ResourceRuntimeConfig, options: Omit<ApiResourceGatewayOptions, "apiBase"> = {}) { return config.useMockApi ? undefined : createApiResourceGateway({ apiBase: config.apiBase, ...options }); }
export function useResourceGateway() { const config = useRuntimeConfig() as { public: ResourceRuntimeConfig }; return createResourceGatewayForRuntime(config.public); }
