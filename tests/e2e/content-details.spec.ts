import { expect, test } from "@playwright/test";

test("resource entries open details before any file action", async ({ page }) => {
  await page.goto("/resources");
  await page.getByRole("link", { name: /校园科创项目需求说明模板/ }).click();

  await expect(page).toHaveURL(/\/resources\/project-requirement-template$/);
  await expect(page.getByRole("heading", { level: 1, name: "校园科创项目需求说明模板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "文件暂未接入" })).toBeDisabled();
  await expect(page.getByText("DOCX", { exact: true })).toBeVisible();
});

test("unknown resource returns 404", async ({ page }) => {
  const response = await page.goto("/resources/missing");
  expect(response?.status()).toBe(404);
});

test("external resources are explicitly marked and open in a new tab", async ({ page }) => {
  await page.goto("/resources/harmonyos-official-docs");
  const link = page.getByRole("link", { name: "前往外部网站" });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
});

test("assessment results require login and continue back after demo sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "考核结果" }).click();

  await expect(page).toHaveURL(/\/login\?redirect=%2Fassessment-results$/);
  await page.getByLabel("成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page).toHaveURL(/\/assessment-results$/);
  await expect(page.getByRole("heading", { level: 1, name: "考核结果" })).toBeVisible();
  await expect(page.getByText("考核数据暂未接入", { exact: true })).toBeVisible();
  await expect(page.getByText(/分数|评级|排名|评语|通过状态/)).toHaveCount(0);
});
