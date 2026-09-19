import { describe, expect, it, vi } from "vitest";
import { createPasswordRecoveryGateway, PasswordRecoveryApiError } from "../../app/services/password-recovery/password-recovery.gateway";

describe("public password recovery flow", () => {
  it("submits only the account field and preserves the generic server response", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accepted: true, message: "若账号存在，联盟总负责人将在完成身份核验后处理。请勿重复提交。" }), { status: 202 }));
    const gateway = createPasswordRecoveryGateway({ apiBase: "https://api.example.test", fetcher, readCookie: () => undefined });
    await expect(gateway.submit("2026001001")).resolves.toMatchObject({ accepted: true });
    expect(fetcher).toHaveBeenCalledWith("https://api.example.test/api/v1/auth/password-recovery-requests", expect.objectContaining({ method: "POST", credentials: "include", body: JSON.stringify({ account: "2026001001" }) }));
  });

  it("maps rate limiting without exposing account state", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "PASSWORD_RECOVERY_RATE_LIMITED", message: "请求过于频繁，请稍后再试" }), { status: 429 }));
    const gateway = createPasswordRecoveryGateway({ apiBase: "https://api.example.test", fetcher, readCookie: () => undefined });
    await expect(gateway.submit("missing-account")).rejects.toEqual(expect.objectContaining({ status: 429, code: "PASSWORD_RECOVERY_RATE_LIMITED" } satisfies Partial<PasswordRecoveryApiError>));
  });
});
