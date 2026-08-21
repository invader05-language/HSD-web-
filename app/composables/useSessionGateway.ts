import {
  createApiSessionGateway,
  type ApiSessionGateway,
  type ApiSessionGatewayOptions,
} from "../services/api-session.gateway";

interface SessionRuntimeConfig {
  apiBase: string;
  useMockApi: boolean;
}

export function createSessionGatewayForRuntime(
  config: SessionRuntimeConfig,
  options: Omit<ApiSessionGatewayOptions, "apiBase"> = {},
): ApiSessionGateway | undefined {
  if (config.useMockApi) return undefined;
  return createApiSessionGateway({ apiBase: config.apiBase, ...options });
}

export function useSessionGateway(): ApiSessionGateway | undefined {
  const config = useRuntimeConfig() as { public: SessionRuntimeConfig };
  return createSessionGatewayForRuntime(config.public);
}
