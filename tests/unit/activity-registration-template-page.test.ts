import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("shared registration template page", () => {
  it("renders the published template separately from the editable draft", () => {
    const source = readFileSync(resolve("app/pages/admin/activities/registration-template.vue"), "utf8");

    expect(source).toContain("当前使用中");
    expect(source).toContain("编辑草稿");
    expect(source).toContain("publishedRevision");
    expect(source).toContain("workingRevision");
    expect(source).toContain("重新载入当前已发布模板");
  });

  it("keeps controls inset from the template card edges", () => {
    const source = readFileSync(resolve("app/assets/css/main.css"), "utf8");

    expect(source).toContain(".admin-template-field");
    expect(source).toMatch(/\.admin-template-field\s*\{[^}]*padding:\s*20px 24px/s);
    expect(source).toMatch(/\.admin-template-actions\s*\{[^}]*padding:\s*16px 24px/s);
  });
});
