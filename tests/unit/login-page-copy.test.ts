import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const loginPage = readFileSync(resolve(process.cwd(), "app/pages/login.vue"), "utf8");

describe("login page copy", () => {
  it("does not expose prototype-only redirect or demo instructions", () => {
    expect(loginPage).not.toContain("登录后将继续前往");
    expect(loginPage).not.toContain("原型演示：使用");
  });
});
