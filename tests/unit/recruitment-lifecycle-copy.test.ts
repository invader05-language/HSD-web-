import { describe, expect, it } from "vitest";
import {
  lifecycleChangeSummary,
  lifecycleSnapshotValue,
} from "../../app/utils/recruitment-lifecycle-copy";

describe("recruitment lifecycle display copy", () => {
  it("turns technical lifecycle statuses into readable Chinese labels", () => {
    expect(lifecycleSnapshotValue("DRAFT")).toBe("草稿");
    expect(lifecycleSnapshotValue("PUBLISHED")).toBe("已发布");
    expect(lifecycleSnapshotValue("CLOSED")).toBe("已关闭");
    expect(lifecycleSnapshotValue("FORCE_CLOSED")).toBe("管理员提前关闭");
    expect(lifecycleSnapshotValue("ARCHIVED")).toBe("已归档");
    expect(lifecycleSnapshotValue("NONE")).toBe("无");
  });

  it("summarizes a lifecycle event as one readable status change", () => {
    expect(lifecycleChangeSummary(
      { lifecycleStatus: "DRAFT", manualOverride: "NONE", version: 1 },
      { lifecycleStatus: "PUBLISHED", manualOverride: "NONE", version: 2 },
    )).toBe("草稿 → 已发布");
    expect(lifecycleChangeSummary(null, { lifecycleStatus: "DRAFT" })).toBe("创建为草稿");
    expect(lifecycleChangeSummary(
      { lifecycleStatus: "OPEN", manualOverride: "NONE" },
      { lifecycleStatus: "CLOSED", manualOverride: "FORCE_CLOSED" },
    )).toBe("开放报名 → 已关闭（管理员提前关闭）");
  });
});
