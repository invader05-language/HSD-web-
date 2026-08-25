import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const files = [
  "app/pages/index.vue",
  "app/pages/activities/index.vue",
  "app/pages/activities/[slug].vue",
  "app/pages/join.vue",
  "app/pages/join/apply.vue",
  "app/pages/member/index.vue",
  "app/pages/member/results.vue",
];

describe("retired technical and AI-styled copy", () => {
  it("does not expose the retired decorative labels or login-only activity copy", () => {
    const source = files.map((file) => readFileSync(resolve(root, file), "utf8")).join("\n");
    for (const phrase of [
      "Four Centers",
      "Real Projects",
      "Media Gallery",
      "Portal Selection",
      "Recruitment Schedule",
      "Member Registration · Recruitment",
      "活动详情无需登录",
      "浏览活动详情无需登录",
      "子工作区尚未接入",
      "数据尚未接入",
      "演示数据",
    ]) expect(source).not.toContain(phrase);
  });
});
