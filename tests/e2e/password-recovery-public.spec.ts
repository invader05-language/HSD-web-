import { expect, test } from "@playwright/test";

test("public password recovery keeps the account state private", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "忘记密码？" })).toBeVisible();
  await page.getByRole("link", { name: "忘记密码？" }).click();

  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole("heading", { name: "忘记密码" })).toBeVisible();
  await page.getByRole("textbox", { name: "学号或成员账号" }).fill("abc");
  await page.getByRole("button", { name: "提交找回申请" }).click();
  await expect(page.getByText("请输入 4—64 个字符的学号或成员账号")).toBeVisible();

  await page.getByRole("textbox", { name: "学号或成员账号" }).fill("unknown-account");
  await page.getByRole("button", { name: "提交找回申请" }).click();
  await expect(page.getByRole("status")).toContainText("若账号存在");
  await expect(page.getByText("unknown-account", { exact: true })).toHaveCount(0);
  await expect(page.getByText("申请已提交", { exact: true })).toBeVisible();
});
