import { describe, expect, it } from "vitest";
import {
  ADMIN_AUDIT_RECORDS,
  filterAuditRecords
} from "../../app/data/admin-system";

describe("administration audit rules", () => {
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
