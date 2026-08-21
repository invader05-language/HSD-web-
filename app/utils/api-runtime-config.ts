export interface ApiRuntimeConfigInput {
  nodeEnv: string | undefined;
  apiBase: string | undefined;
  useMockApi: boolean;
  e2eTestOnly?: boolean;
}

export interface ApiRuntimeConfig {
  apiBase: string;
  useMockApi: boolean;
}

export function resolveApiRuntimeConfig(input: ApiRuntimeConfigInput): ApiRuntimeConfig {
  if (input.nodeEnv === "production" && input.useMockApi && !input.e2eTestOnly) {
    throw new Error("MOCK_API_FORBIDDEN_IN_PRODUCTION");
  }

  return {
    apiBase: (input.apiBase ?? "").replace(/\/+$/, ""),
    useMockApi: input.useMockApi,
  };
}
