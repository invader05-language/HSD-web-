import { describe, expect, it } from "vitest";
import {
  ADMIN_AUDIT_RECORDS,
  filterAuditRecords,
  getRolePermission
} from "../../app/data/admin-system";

describe("administration roles and audit rules", () => {
  it("grants the alliance lead every prototype permission", () => {
    expect(getRolePermission("alliance-lead", "recruitment", "publish")).toBe(true);
    expect(getRolePermission("alliance-lead", "system", "edit")).toBe(true);
    expect(getRolePermission("alliance-lead", "media", "export")).toBe(true);
  });

  it("keeps center and media administrators inside their own scopes", () => {
    expect(getRolePermission("center-lead", "other-center-assessment", "edit")).toBe(false);
    expect(getRolePermission("media-admin", "system", "edit")).toBe(false);
    expect(getRolePermission("media-admin", "media", "review")).toBe(true);
  });

  it("filters audit records by actor, module and result", () => {
    expect(
      filterAuditRecords(ADMIN_AUDIT_RECORDS, {
        query: "发布",
        module: "招新与考核",
        result: "成功"
      }).map((record) => record.action)
    ).toEqual(["发布 2026 秋季招新录取结果"]);
  });
});
