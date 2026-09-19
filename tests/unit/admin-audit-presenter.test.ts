import { describe, expect, it } from "vitest";
import { formatAuditProjection, presentAuditAction, presentAuditTarget } from "../../app/services/audit/admin-audit-presenter";

describe("readable audit presentation", () => {
  it("translates password reset and account target labels", () => {
    expect(presentAuditAction("account.password.reset")).toMatchObject({ label: "重置账号临时密码", module: "系统管理" });
    expect(presentAuditTarget({ targetType: "account", targetId: "account-id", before: null, after: null })).toMatchObject({ typeLabel: "平台账号", summary: "账号 account-id" });
    expect(formatAuditProjection({ status: "ENABLED", mustChangePassword: true })).toContain("下次登录需改密：是");
  });
});
