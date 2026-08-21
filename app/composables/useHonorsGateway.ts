import { createApiHonorsGateway, type ApiHonorsGatewayOptions } from '../services/honors/api-honors.gateway'
import { createMockHonorsGateway } from '../services/honors/mock-honors.gateway'

interface HonorsRuntimeConfig { apiBase: string; useMockApi: boolean }
export function createHonorsGatewayForRuntime(config: HonorsRuntimeConfig, options: Omit<ApiHonorsGatewayOptions, 'apiBase'> = {}) { return config.useMockApi ? createMockHonorsGateway() : createApiHonorsGateway({ apiBase: config.apiBase, ...options }) }
export function useHonorsGateway() { const config = useRuntimeConfig() as { public: HonorsRuntimeConfig }; return createHonorsGatewayForRuntime(config.public) }
