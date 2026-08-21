import { describe, expect, it } from "vitest";
import { resolveApiRuntimeConfig } from "../../app/utils/api-runtime-config";

describe("browser API runtime configuration", () => {
  it("rejects enabling Mock API data in production", () => {
    expect(() => resolveApiRuntimeConfig({
      nodeEnv: "production",
      apiBase: "",
      useMockApi: true,
    })).toThrow("MOCK_API_FORBIDDEN_IN_PRODUCTION");
  });

  it("permits Mock API data in the explicit E2E-only production context", () => {
    expect(resolveApiRuntimeConfig({
      nodeEnv: "production",
      apiBase: "",
      useMockApi: true,
      e2eTestOnly: true,
    } as ApiRuntimeConfigInput & { e2eTestOnly: true })).toEqual({ apiBase: "", useMockApi: true });
  });

  it("allows an explicit Mock API only outside production", () => {
    expect(resolveApiRuntimeConfig({
      nodeEnv: "development",
      apiBase: "http://localhost:3001",
      useMockApi: true,
    })).toEqual({ apiBase: "http://localhost:3001", useMockApi: true });
  });
});
