import { describe, expect, it } from "vitest";
import type { AdminAuditListRow } from "../../app/services/audit/admin-audit-list";
import {
  formatAuditOccurredAt,
  formatAuditProjection,
  presentAuditAction,
  presentAuditTarget,
} from "../../app/services/audit/admin-audit-presenter";

const row = (overrides: Partial<AdminAuditListRow> = {}): AdminAuditListRow => ({
  id: "event-1",
  actor: "联盟负责人",
  actorAccount: "owner",
  actorType: "account",
  action: "account.password.reset",
  targetType: "account",
  targetId: "11111111-1111-4111-8111-111111111111",
  reason: null,
  occurredAt: "2026-09-19T00:00:00.000Z",
  before: { status: "ENABLED", version: 1 },
  after: { status: "ENABLED", version: 2, mustChangePassword: true },
  ...overrides,
});

describe("admin audit presenter", () => {
  it("localizes known actions and keeps the technical code", () => {
    expect(presentAuditAction("account.password.reset")).toEqual({
      label: "重置账号临时密码",
      module: "系统管理",
      technicalCode: "account.password.reset",
    });
  });

  it("uses a readable target summary and truncates a UUID when no name exists", () => {
    expect(presentAuditTarget(row())).toEqual({
      typeLabel: "平台账号",
      summary: "账号 11111111…",
      technicalType: "account",
      technicalId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("formats safe projection keys and values without exposing raw machine labels", () => {
    expect(formatAuditProjection({ status: "ENABLED", version: 2, mustChangePassword: true })).toBe(
      "状态：已启用\n版本：2\n下次登录需改密：是",
    );
  });

  it("formats audit timestamps in China Standard Time", () => {
    expect(formatAuditOccurredAt("2026-09-19T00:00:00.000Z")).toBe("2026/09/19 08:00:00 (UTC+8)");
  });

  it("falls back safely for unknown action and target codes", () => {
    expect(presentAuditAction("future.new.action").label).toBe("其他系统操作");
    expect(presentAuditTarget(row({ targetType: "FutureThing", targetId: "target-1" })).typeLabel).toBe("其他对象");
  });
});
