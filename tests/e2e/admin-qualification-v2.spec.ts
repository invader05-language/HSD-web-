import { expect, test } from "@playwright/test";

async function signInAsOwner(page: import("@playwright/test").Page) {
  await page.goto("/admin/accounts");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/admin\/accounts$/);
}

test("owner can add a platform user with a center administrator level", async ({ page }) => {
  await signInAsOwner(page);

  await page.getByRole("button", { name: "添加管理员" }).click();
  const dialog = page.getByRole("dialog", { name: "添加管理员" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("搜索平台用户").fill("demo-member");
  await dialog.getByRole("button", { name: /选择 demo-member/ }).click();
  await dialog.getByLabel("管理级别").selectOption({ label: "白泽开发中心负责人" });
  await dialog.getByRole("button", { name: "确认添加" }).click();

  const row = page.getByRole("row").filter({ hasText: "demo-member" });
  await expect(row).toContainText("白泽开发中心负责人");
  await expect(row).toContainText("已启用");
});

test("administrator assignment can reassign an existing center administrator", async ({ page }) => {
  await signInAsOwner(page);

  await page.getByRole("button", { name: "添加管理员" }).click();
  const dialog = page.getByRole("dialog", { name: "添加管理员" });
  await dialog.getByLabel("搜索平台用户").fill("media-admin");
  const candidate = dialog.getByRole("button", { name: /选择 media-admin/ });
  await expect(candidate.locator(".admin-candidate-name")).toHaveText("李同学");
  await expect(candidate.locator(".admin-candidate-affiliation")).toHaveText("新媒体中心");
  await expect(candidate.locator(".admin-candidate-identity")).toHaveText("新媒体中心负责人");
  await expect(candidate).not.toContainText("member-li");
  await candidate.click();
  await dialog.getByLabel("管理级别").selectOption({ label: "拓维策划中心负责人" });
  await dialog.getByRole("button", { name: "确认添加" }).click();

  const row = page.getByRole("row").filter({ hasText: "media-admin" });
  await expect(row).toContainText("拓维策划中心负责人");
});

test("owner can add a second protected owner but cannot exceed two", async ({ page }) => {
  await signInAsOwner(page);

  await page.getByRole("button", { name: "增设联盟总负责人" }).click();
  const dialog = page.getByRole("dialog", { name: "增设联盟总负责人" });
  await dialog.getByLabel("搜索平台用户").fill("demo-member");
  await dialog.getByRole("button", { name: /选择 demo-member/ }).click();
  await dialog.getByRole("button", { name: "确认添加" }).click();

  await expect(page.getByText("2/2 个负责人席位")).toBeVisible();
  await expect(page.getByRole("button", { name: "增设联盟总负责人" })).toBeDisabled();
});

test("authenticated member and administrator sessions survive a browser refresh", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/member$/);
  await page.reload();
  await expect(page).toHaveURL(/\/member$/);
  await expect(page.getByText("你好，林同学")).toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();
  await page.goto("/login?mode=admin");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.reload();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(".admin-topbar__identity")).toContainText("张同学");
});
