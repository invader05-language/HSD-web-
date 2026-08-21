import {
  createApiRecruitmentGateway,
  type ApiRecruitmentGatewayOptions,
} from "../services/recruitment/api-recruitment.gateway";
import type { RecruitmentGateway } from "../services/recruitment/recruitment-gateway";

interface RecruitmentRuntimeConfig {
  apiBase: string;
  useMockApi: boolean;
}

export function createRecruitmentGatewayForRuntime(
  config: RecruitmentRuntimeConfig,
  options: Omit<ApiRecruitmentGatewayOptions, "apiBase"> = {},
): RecruitmentGateway | undefined {
  if (config.useMockApi) return undefined;
  return createApiRecruitmentGateway({ apiBase: config.apiBase, ...options });
}

export function useRecruitmentGateway(): RecruitmentGateway | undefined {
  const config = useRuntimeConfig() as { public: RecruitmentRuntimeConfig };
  return createRecruitmentGatewayForRuntime(config.public);
}
