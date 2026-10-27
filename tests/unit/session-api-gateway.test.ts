import { describe, expect, it, vi } from "vitest";
import { createApiSessionGateway } from "../../app/services/api-session.gateway";
import { createSessionGatewayForRuntime } from "../../app/composables/useSessionGateway";

describe("production session API gateway", () => {
  it("creates the API session boundary only outside explicit Mock runtime mode", () => {
    expect(createSessionGatewayForRuntime({
      apiBase: "https://api.example.test",
      useMockApi: true,
    })).toBeUndefined();
    expect(createSessionGatewayForRuntime({
      apiBase: "https://api.example.test",
      useMockApi: false,
    })).toBeDefined();
  });

  it("posts credentials with cookies and then returns only the hydrated authoritative session", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        mustChangePassword: false,
        csrfToken: "bootstrap-csrf-is-cookie-managed",
        expiresAt: "2026-08-08T00:00:00.000Z",
      }), { status: 201, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        account: {
          id: "account-owner",
          adminLevel: "OWNER",
          adminCenterId: null,
          adminCenter: null,
          capabilities: ["recruitment.assessment.edit", "recruitment.result.publish"],
        },
        person: { id: "person-owner", name: "总负责人", status: "FORMAL_MEMBER" },
        mustChangePassword: false,
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiSessionGateway({
      apiBase: "https://api.example.test/",
      fetcher,
      createRequestId: () => "request-session-1",
    });

    const session = await gateway.login({
      account: "20260001",
      password: "safe-password",
      rememberMe: true,
    });

    expect(fetcher).toHaveBeenNthCalledWith(1, "https://api.example.test/api/v1/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": "request-session-1",
      },
      body: JSON.stringify({ account: "20260001", password: "safe-password", rememberMe: true }),
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://api.example.test/api/v1/auth/session", {
      method: "GET",
      credentials: "include",
      headers: { "X-Request-ID": "request-session-1" },
    });
    expect(session).toEqual({
      account: {
        id: "account-owner",
        adminLevel: "OWNER",
        adminCenterId: null,
        adminCenter: null,
        capabilities: ["recruitment.assessment.edit", "recruitment.result.publish"],
      },
      person: { id: "person-owner", name: "总负责人", status: "FORMAL_MEMBER" },
      mustChangePassword: false,
    });
    expect(session).not.toHaveProperty("csrfToken");
  });

  it("changes a first-login password through the CSRF-protected API and rehydrates the session", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        mustChangePassword: false,
        csrfToken: "rotated-cookie-csrf-only",
        expiresAt: "2026-08-08T00:00:00.000Z",
      }), { status: 201, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        account: { id: "account-member", adminLevel: "MEMBER", adminCenterId: null, adminCenter: null, capabilities: [] },
        person: { id: "person-member", name: "新成员", status: "PREPARATORY" },
        mustChangePassword: false,
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiSessionGateway({
      apiBase: "https://api.example.test",
      fetcher,
      readCookie: (name) => name === "hsd_csrf" ? "csrf-token%2Bvalue" : undefined,
      createRequestId: () => "request-password-1",
    });

    const session = await gateway.changePassword("safe-password-2026");

    expect(fetcher).toHaveBeenNthCalledWith(1, "https://api.example.test/api/v1/auth/change-password", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": "csrf-token+value",
        "X-Request-ID": "request-password-1",
      },
      body: JSON.stringify({ newPassword: "safe-password-2026" }),
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://api.example.test/api/v1/auth/session", {
      method: "GET",
      credentials: "include",
      headers: { "X-Request-ID": "request-password-1" },
    });
    expect(session.mustChangePassword).toBe(false);
    expect(session).not.toHaveProperty("csrfToken");
  });

  it("rejects password change before a request when the readable CSRF cookie is unavailable", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>();
    const gateway = createApiSessionGateway({
      apiBase: "https://api.example.test",
      fetcher,
      readCookie: () => undefined,
    });

    await expect(gateway.changePassword("safe-password-2026")).rejects.toMatchObject({
      name: "SessionApiError",
      code: "SESSION_CSRF_TOKEN_MISSING",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("revokes the server session through the CSRF-protected logout endpoint", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const gateway = createApiSessionGateway({
      apiBase: "https://api.example.test",
      fetcher,
      readCookie: (name) => name === "hsd_csrf" ? "logout-csrf%2Bvalue" : undefined,
      createRequestId: () => "request-logout-1",
    });

    await expect(gateway.logout()).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRF-Token": "logout-csrf+value",
        "X-Request-ID": "request-logout-1",
      },
    });
  });

  it("rejects logout before a request when the readable CSRF cookie is unavailable", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>();
    const gateway = createApiSessionGateway({
      apiBase: "https://api.example.test",
      fetcher,
      readCookie: () => undefined,
    });

    await expect(gateway.logout()).rejects.toMatchObject({
      name: "SessionApiError",
      code: "SESSION_CSRF_TOKEN_MISSING",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects an unexpected successful logout status because revocation is not proven", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const gateway = createApiSessionGateway({
      apiBase: "https://api.example.test",
      fetcher,
      readCookie: (name) => name === "hsd_csrf" ? "logout-csrf" : undefined,
    });

    await expect(gateway.logout()).rejects.toMatchObject({
      name: "SessionApiError",
      code: "SESSION_API_RESPONSE_CONTRACT_MISMATCH",
    });
  });

  it("preserves the safe error contract and retry timing from a login response", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      code: "LOGIN_RATE_LIMITED",
      message: "Too many login attempts. Please try again later.",
      requestId: "login-request-429",
      retryAfterSeconds: 42,
    }), { status: 429, headers: { "Retry-After": "60" } }));
    const gateway = createApiSessionGateway({ apiBase: "https://api.example.test", fetcher });

    await expect(gateway.login({ account: "member", password: " Raw Pass ", rememberMe: false }))
      .rejects.toMatchObject({
        status: 429,
        code: "LOGIN_RATE_LIMITED",
        message: "Too many login attempts. Please try again later.",
        requestId: "login-request-429",
        retryAfterSeconds: 42,
      });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("uses an HTTP-date Retry-After when the error body has no retry timing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T00:00:00.000Z"));
    try {
      const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
        code: "LOGIN_ACCOUNT_LOCKED", message: "This account is temporarily locked", requestId: "login-request-423",
      }), { status: 423, headers: { "Retry-After": "Wed, 07 Oct 2026 00:02:00 GMT" } }));
      const gateway = createApiSessionGateway({ apiBase: "https://api.example.test", fetcher });

      await expect(gateway.login({ account: "member", password: "password", rememberMe: false }))
        .rejects.toMatchObject({ status: 423, retryAfterSeconds: 120 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps status and a safe fallback message when the error response is not JSON", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("untrusted server details", { status: 503 }));
    const gateway = createApiSessionGateway({ apiBase: "https://api.example.test", fetcher });

    await expect(gateway.login({ account: "member", password: "password", rememberMe: false }))
      .rejects.toMatchObject({ status: 503, code: "SESSION_API_REQUEST_FAILED", message: "Session API request failed" });
  });

  it("keeps the login POST and session GET failures distinguishable", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        mustChangePassword: false,
        csrfToken: "cookie-managed",
        expiresAt: "2026-08-08T00:00:00.000Z",
      }), { status: 201, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: "SESSION_REQUIRED",
        message: "Session cookie was not accepted",
        requestId: "server-session-401",
      }), { status: 401, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiSessionGateway({
      apiBase: "https://api.example.test",
      fetcher,
      createRequestId: vi.fn()
        .mockReturnValueOnce("client-login-1")
        .mockReturnValueOnce("client-session-1"),
    });

    await expect(gateway.login({ account: "member", password: "password", rememberMe: false }))
      .rejects.toMatchObject({
        status: 401,
        phase: "session_get",
        credentialValidated: true,
        loginRequestId: "client-login-1",
        requestId: "server-session-401",
      });
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://api.example.test/api/v1/auth/session", expect.objectContaining({
      headers: { "X-Request-ID": "client-session-1" },
    }));
  });

  it("wraps a transport failure with the request phase", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    const gateway = createApiSessionGateway({
      apiBase: "https://api.example.test",
      fetcher,
      createRequestId: () => "client-login-transport",
    });

    await expect(gateway.login({ account: "member", password: "password", rememberMe: false }))
      .rejects.toMatchObject({
        phase: "login_post",
        kind: "transport",
        code: "SESSION_API_TRANSPORT_FAILED",
        credentialValidated: false,
      });
  });
});
