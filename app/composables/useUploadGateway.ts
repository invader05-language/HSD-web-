import { createApiUploadGateway, type ApiUploadGatewayOptions } from "../services/uploads/api-upload.gateway";

interface UploadRuntimeConfig { apiBase: string; useMockApi: boolean; }
export function createUploadGatewayForRuntime(config: UploadRuntimeConfig, options: Omit<ApiUploadGatewayOptions, "apiBase"> = {}) { return config.useMockApi ? undefined : createApiUploadGateway({ apiBase: config.apiBase, ...options }); }
export function useUploadGateway() { const config = useRuntimeConfig() as { public: UploadRuntimeConfig }; return createUploadGatewayForRuntime(config.public); }
