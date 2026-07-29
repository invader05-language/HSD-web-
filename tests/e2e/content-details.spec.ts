import { expect, test } from "@playwright/test";

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
