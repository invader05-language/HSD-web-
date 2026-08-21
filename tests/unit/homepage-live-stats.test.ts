import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("homepage live statistics", () => {
  it("renders the four counters from the public homepage stats API in production mode", () => {
    const source = readFileSync(resolve("app/pages/index.vue"), "utf8");
    expect(source).toContain("contentGateway.homepage.stats()");
    expect(source).toContain('label: "部落成员"');
    expect(source).toContain('label: "核心成员"');
    expect(source).toContain('label: "活跃中心"');
    expect(source).toContain('label: "公开项目"');
    expect(source).toContain("liveStats");
  });
});
