import { createApiAuditGateway, type ApiAuditGatewayOptions } from "../services/audit/api-audit.gateway";

interface AuditRuntimeConfig { apiBase: string; useMockApi: boolean; }
export function createAuditGatewayForRuntime(config: AuditRuntimeConfig, options: Omit<ApiAuditGatewayOptions, "apiBase"> = {}) { return config.useMockApi ? undefined : createApiAuditGateway({ apiBase: config.apiBase, ...options }); }
export function useAuditGateway() { const config = useRuntimeConfig() as { public: AuditRuntimeConfig }; return createAuditGatewayForRuntime(config.public); }
