import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, account: string, target: string) {
  await page.goto(target);
  await page.getByLabel("学号或成员账号").fill(account);
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
}

test("owner can open the password recovery inbox", async ({ page }) => {
  await signIn(page, "admin-alliance", "/admin/password-recovery");
  await expect(page).toHaveURL(/\/admin\/password-recovery$/);
  await expect(page.getByRole("heading", { name: "密码恢复申请" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "管理端导航" })).toContainText("密码恢复申请");
  await expect(page.getByText("当前没有符合条件的申请。", { exact: true })).toBeVisible();
});

test("center administrators cannot see or open the owner-only inbox", async ({ page }) => {
  await signIn(page, "media-admin", "/admin/password-recovery");
  await expect(page).toHaveURL(/\/admin\/forbidden\?from=\/admin\/password-recovery$/);
  await expect(page.getByText("联盟总负责人资格", { exact: true })).toBeVisible();
});
