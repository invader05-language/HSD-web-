import { describe, expect, it } from "vitest";
import { assertCurrentSessionFixture, currentSessionFixture } from "../e2e/support/current-session-fixtures";

describe("current session e2e fixtures", () => {
  it("rejects the legacy scoped-admin response without adminCenter", () => {
    expect(() => assertCurrentSessionFixture({
      account: {
        id: "account-admin",
        adminLevel: "ADMIN",
        adminCenterId: "center-media",
        capabilities: [],
      },
      person: { id: "person-admin", name: "中心管理员", status: "FORMAL_MEMBER" },
      mustChangePassword: false,
    })).toThrow("GET /api/v1/auth/session");
  });

  it.each([
    ["OWNER", null],
    ["MEMBER", null],
    ["ADMIN", { id: "center-media", name: "新媒体中心", role: "CENTER_MINISTER" }],
  ] as const)("creates a contract-valid %s response", (adminLevel, expectedCenter) => {
    const response = currentSessionFixture({
      accountId: "account-id",
      personId: "person-id",
      name: "测试成员",
      adminLevel,
      ...(adminLevel === "ADMIN" ? { center: expectedCenter } : {}),
    });

    expect(response.account.adminCenter).toEqual(expectedCenter);
    expect(() => assertCurrentSessionFixture(response)).not.toThrow();
  });
});
