import { expect, test } from "@playwright/test";

test("mock audit log keeps its fixture branch without API reads", async ({ page }) => {
  await page.goto("/admin/logs");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "操作日志" })).toBeVisible();
  await expect(page.getByRole("table", { name: "管理员操作日志" })).toContainText("联盟总负责人");
  await expect(page.getByText(/IP 地址|请求环境|导出日志|保留 180 天/)).toHaveCount(0);
});
