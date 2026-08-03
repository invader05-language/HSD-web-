import { describe, expect, it } from "vitest";
import { ADMIN_CANDIDATES } from "../../app/data/recruitment-admin";
import {
  buildRecruitmentExportName,
  serializeRecruitmentCsv
} from "../../app/utils/recruitment-export";

describe("recruitment roster CSV export", () => {
  it("serializes the approved columns with a UTF-8 BOM and formula-safe cells", () => {
    const csv = serializeRecruitmentCsv([{
      ...ADMIN_CANDIDATES[0]!,
      name: "=SUM(1,1)",
      contact: "first,\"quoted\"\nsecond"
    }]);

    expect(csv.startsWith("\uFEFF姓名,学号,联系方式")).toBe(true);
    expect(csv).toContain("\"'=SUM(1,1)\"");
    expect(csv).toContain("\"first,\"\"quoted\"\"\nsecond\"");
    expect(csv).toContain("白泽开发中心,新媒体中心,人才发展中心,鸿蒙开发,接受调剂,2026-07-30 14:28");
    expect(csv).not.toContain("internalNote");
  });

  it("builds a stable, download-safe filename from the batch and local timestamp", () => {
    expect(buildRecruitmentExportName("2026 秋季招新", new Date("2026-08-03T16:30:00")))
      .toBe("HSD-2026秋季招新-报名名单-20260803-1630.csv");
  });
});
