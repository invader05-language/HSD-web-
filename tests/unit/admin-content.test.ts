import { describe, expect, it } from "vitest";
import {
  ADMIN_CONTENT_RECORDS,
  HOMEPAGE_SLOTS,
  canTransitionContent,
  filterAdminRecords
} from "../../app/data/admin-content";

describe("administration content workflow", () => {
  it("allows the confirmed editorial state path and blocks skipping review", () => {
    expect(canTransitionContent("草稿", "待审核")).toBe(true);
    expect(canTransitionContent("待审核", "已发布")).toBe(true);
    expect(canTransitionContent("已发布", "已下架")).toBe(true);
    expect(canTransitionContent("草稿", "已发布")).toBe(false);
  });

  it("combines text status and category filters", () => {
    expect(
      filterAdminRecords(ADMIN_CONTENT_RECORDS, {
        query: "招新",
        status: "已发布",
        category: "HSD 快讯"
      }).map((record) => record.title)
    ).toEqual(["2026 秋季招新通道开放"]);
  });

  it("keeps homepage modules fixed with explicit capacity", () => {
    expect(HOMEPAGE_SLOTS.map((slot) => [slot.label, slot.capacity])).toEqual([
      ["HSD 快讯", 1],
      ["推荐新闻", 3],
      ["精选项目", 4],
      ["近期活动", 3],
      ["媒体专题", 1],
      ["推荐资源", 3]
    ]);
  });
});
