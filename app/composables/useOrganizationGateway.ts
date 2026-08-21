import {
  createApiOrganizationGateway,
  type ApiOrganizationGatewayOptions,
} from "../services/organization/api-organization.gateway";
import type { OrganizationGateway } from "../services/organization/organization-gateway";

interface OrganizationRuntimeConfig {
  apiBase: string;
  useMockApi: boolean;
}

export function createOrganizationGatewayForRuntime(
  config: OrganizationRuntimeConfig,
  options: Omit<ApiOrganizationGatewayOptions, "apiBase"> = {},
): OrganizationGateway | undefined {
  if (config.useMockApi) return undefined;
  return createApiOrganizationGateway({ apiBase: config.apiBase, ...options });
}

export function useOrganizationGateway(): OrganizationGateway | undefined {
  const config = useRuntimeConfig() as { public: OrganizationRuntimeConfig };
  return createOrganizationGatewayForRuntime(config.public);
}
