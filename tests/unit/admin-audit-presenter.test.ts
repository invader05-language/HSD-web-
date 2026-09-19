import { describe, expect, it } from "vitest";
import { presentAuditAction, presentAuditTarget, presentAuditSnapshot } from "../../app/services/audit/admin-audit-presenter";

describe("readable audit presentation", () => {
  it("translates password reset and account target labels", () => {
    expect(presentAuditAction("account.password.reset")).toBe("重置账号为初始密码");
    expect(presentAuditTarget("account", "account-id")).toBe("成员账号 / account-id");
    expect(presentAuditSnapshot({ status: "ENABLED", mustChangePassword: true })).toContain("需首次改密: true");
  });
});
