import { expect, test } from "@playwright/test";

async function completeCenterAdminLogin(
  page: import("@playwright/test").Page,
  expectedPath: string,
) {
  await page.getByLabel("学号或成员账号").fill("media-admin");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath.replaceAll("/", "\\/")}$`));
}

test("a center administrator cannot reach foreign content or portal configuration", async ({ page }) => {
  await page.goto("/admin/content/flash-recruitment-2026");
  await completeCenterAdminLogin(page, "/admin/content/flash-recruitment-2026");
  await expect(page).toHaveURL(/\/admin\/forbidden\?from=/);

  await page.getByRole("link", { name: "HSD 管理台" }).click();
  await expect(page.getByRole("heading", { name: "门户发布状态" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "配置门户 →" })).toHaveCount(0);
});

test("a center administrator cannot read a different center's application detail", async ({ page }) => {
  await page.goto("/admin/recruitment/batches/batch-current/applications/candidate-lin");
  await completeCenterAdminLogin(page, "/admin/recruitment/batches/batch-current/applications/candidate-lin");

  await expect(page.getByRole("heading", { name: "报名记录不存在", exact: true })).toBeVisible();
  await expect(page.getByLabel("联系方式")).toHaveCount(0);
});
