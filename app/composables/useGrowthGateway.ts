import { createApiGrowthGateway, type ApiGrowthGatewayOptions } from '../services/growth/api-growth.gateway'

interface GrowthRuntimeConfig { apiBase: string; useMockApi: boolean }
export function createGrowthGatewayForRuntime(config: GrowthRuntimeConfig, options: Omit<ApiGrowthGatewayOptions, 'apiBase'> = {}) { return config.useMockApi ? undefined : createApiGrowthGateway({ apiBase: config.apiBase, ...options }) }
export function useGrowthGateway() { const config = useRuntimeConfig() as { public: GrowthRuntimeConfig }; return createGrowthGatewayForRuntime(config.public) }
