import {
  createApiPublicContentGateway,
  type ApiPublicContentGatewayOptions,
  type PublicContentGateway,
} from "../services/content/api-public-content.gateway";

interface PublicContentRuntimeConfig {
  apiBase: string;
  useMockApi: boolean;
}

export function createPublicContentGatewayForRuntime(
  config: PublicContentRuntimeConfig,
  options: Omit<ApiPublicContentGatewayOptions, "apiBase"> = {},
): PublicContentGateway | undefined {
  if (config.useMockApi) return undefined;
  return createApiPublicContentGateway({ apiBase: config.apiBase, ...options });
}

export function usePublicContentGateway(): PublicContentGateway | undefined {
  const config = useRuntimeConfig() as { public: PublicContentRuntimeConfig };
  return createPublicContentGatewayForRuntime(config.public);
}
