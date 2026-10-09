import { describe, expect, it } from "vitest";
import {
  ApiEndpointConfigurationError,
  resolveBrowserApiBase,
} from "../../app/utils/browser-api-base";

describe("resolveBrowserApiBase", () => {
  it("uses same-origin relative requests for an HTTPS page", () => {
    expect(resolveBrowserApiBase("https://114.132.236.244", "https://114.132.236.244/login")).toBe("");
  });

  it("repairs the known same-host HTTP value without sending HTTP", () => {
    expect(resolveBrowserApiBase("http://114.132.236.244", "https://114.132.236.244/login")).toBe("");
  });

  it("rejects a different HTTP origin before credentials can be sent", () => {
    expect(() => resolveBrowserApiBase("http://evil.example.test", "https://114.132.236.244/login"))
      .toThrow(ApiEndpointConfigurationError);
  });

  it("rejects credentials and unsupported protocols", () => {
    expect(() => resolveBrowserApiBase("https://user:pass@114.132.236.244", "https://114.132.236.244/login"))
      .toThrow(ApiEndpointConfigurationError);
    expect(() => resolveBrowserApiBase("file:///tmp/api", "https://114.132.236.244/login"))
      .toThrow(ApiEndpointConfigurationError);
  });

  it("keeps an explicit external HTTPS API for supported environments", () => {
    expect(resolveBrowserApiBase("https://api.example.test", "https://114.132.236.244/login"))
      .toBe("https://api.example.test");
  });
});
