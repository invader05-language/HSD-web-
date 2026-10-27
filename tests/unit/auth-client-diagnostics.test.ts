import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAuthClientDiagnostics,
  formatAuthClientDiagnostics,
  getAuthClientDiagnostics,
  recordAuthClientDiagnostic,
} from "../../app/utils/auth-client-diagnostics";

describe("auth client diagnostics", () => {
  beforeEach(() => clearAuthClientDiagnostics());

  it("keeps only a bounded, redacted in-memory event list", () => {
    for (let index = 0; index < 21; index += 1) {
      recordAuthClientDiagnostic({
        buildId: "build-1",
        phase: "login_post",
        kind: "http",
        status: 401,
        code: "INVALID_CREDENTIALS",
        attemptId: `attempt-${index}`,
        requestId: "server-request",
        credentialValidated: false,
        apiProtocol: "https:",
        route: "/admin/recruitment/batches/real-batch/applications/real-application?password=secret",
        navigationType: "navigate",
      });
    }

    const events = getAuthClientDiagnostics();
    expect(events).toHaveLength(20);
    expect(events[0].attemptId).toBe("attempt-1");
    const output = formatAuthClientDiagnostics();
    expect(output).toContain("/admin/recruitment/batches/:batchId/applications/:id");
    expect(output).not.toContain("real-batch");
    expect(output).not.toContain("real-application");
    expect(output).not.toContain("secret");
  });
});
