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
    expect(csv).toContain("白泽开发中心,新媒体中心,人才发展中心,鸿蒙开发,接受调剂,2026-09-20 09:00,2026-09-20 09:30,已确认,2026-07-30 14:28");
    expect(csv).not.toContain("internalNote");
  });

  it("exports the current interview snapshot and invalidation status", () => {
    const csv = serializeRecruitmentCsv([{
      ...ADMIN_CANDIDATES[0]!,
      interviewSelection: {
        status: "RESELECTION_REQUIRED",
        slotId: "slot-1",
        startAt: "2026-09-20T01:00:00.000Z",
        endAt: "2026-09-20T01:30:00.000Z",
        timezone: "Asia/Shanghai",
        canChange: true,
        invalidationReason: "原时段已调整",
      },
    }]);

    expect(csv.split("\r\n")[0]).toBe("\uFEFF姓名,学号,联系方式,第一志愿,第二志愿,第三志愿,白泽方向,是否接受调剂,面试开始（中国标准时间）,面试结束（中国标准时间）,面试安排状态,提交时间");
    expect(csv).toContain("2026-09-20 09:00,2026-09-20 09:30,待重新选择");
  });

  it("builds a stable, download-safe filename from the batch and local timestamp", () => {
    expect(buildRecruitmentExportName("2026 秋季招新", new Date("2026-08-03T16:30:00")))
      .toBe("HSD-2026秋季招新-报名名单-20260803-1630.csv");
  });
});
