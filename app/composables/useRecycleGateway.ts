import { createApiRecycleGateway, type ApiRecycleGatewayOptions } from '../services/recycle/api-recycle.gateway'
import { createMockRecycleGateway } from '../services/recycle/mock-recycle.gateway'
interface RecycleRuntimeConfig { apiBase: string; useMockApi: boolean }
export function createRecycleGatewayForRuntime(config: RecycleRuntimeConfig, options: Omit<ApiRecycleGatewayOptions, 'apiBase'> = {}) { return config.useMockApi ? createMockRecycleGateway() : createApiRecycleGateway({ apiBase: config.apiBase, ...options }) }
export function useRecycleGateway() { const config = useRuntimeConfig() as { public: RecycleRuntimeConfig }; return createRecycleGatewayForRuntime(config.public) }
