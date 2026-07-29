import { describe, expect, it } from "vitest";
import { SITE_CONFIG } from "../../app/data/site";

describe("SITE_CONFIG", () => {
  it("uses the approved public brand and desktop navigation", () => {
    expect(SITE_CONFIG.name).toBe("白云 HSD 开发者部落");
    expect(SITE_CONFIG.navigation.map((item) => item.label)).toEqual([
      "首页",
      "部落介绍",
      "四大中心",
      "项目成果",
      "活动中心",
      "媒体画廊",
      "资源中心",
      "加入我们"
    ]);
  });
});
