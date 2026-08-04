import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const loginPage = readFileSync(resolve(process.cwd(), "app/pages/login.vue"), "utf8");
const helpLinkedPages = [
  "app/components/SiteFooter.vue",
  "app/pages/index.vue",
  "app/pages/join.vue",
  "app/pages/login.vue"
].map((path) => readFileSync(resolve(process.cwd(), path), "utf8"));

describe("login page copy", () => {
  it("does not expose prototype-only redirect or demo instructions", () => {
    expect(loginPage).not.toContain("登录后将继续前往");
    expect(loginPage).not.toContain("原型演示：使用");
  });

  it("does not promise disabled audit or recycle-bin features to administrators", () => {
    expect(loginPage).not.toContain("操作日志");
    expect(loginPage).not.toContain("回收站");
  });

  it("uses the exact owner-contact guidance instead of a Help Center link", () => {
    expect(loginPage).toContain(
      "无法登录或忘记账号时，请联系联盟总负责人核验身份并处理账号问题。"
    );
    expect(loginPage).not.toContain('to="/help');
    expect(helpLinkedPages.every((page) => !page.includes('to="/help'))).toBe(true);
  });
});
