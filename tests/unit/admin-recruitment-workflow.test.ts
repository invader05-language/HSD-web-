import { describe, expect, it } from "vitest";
import {
  ADMIN_CANDIDATES,
  RECRUITMENT_BATCHES,
  REGULAR_CENTERS,
  getPublicationSummary
} from "../../app/data/recruitment-admin";

describe("recruitment administration workflow", () => {
  it("separates internal results that are ready from results still being assessed", () => {
    expect(getPublicationSummary(ADMIN_CANDIDATES)).toEqual({
      total: 8,
      ready: 3,
      pending: 5,
      selected: 3
    });
  });

  it("keeps White Ze out of offline final destinations", () => {
    expect(REGULAR_CENTERS).toEqual([
      "新媒体中心",
      "拓维策划中心",
      "人才发展中心"
    ]);
  });

  it("shows active draft and closed recruitment batches", () => {
    expect(RECRUITMENT_BATCHES.map((batch) => batch.status)).toEqual([
      "进行中",
      "草稿",
      "已结束"
    ]);
  });
});
