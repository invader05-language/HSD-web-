import { expect, test } from "@playwright/test";

async function completeAdminDemoLogin(
  page: import("@playwright/test").Page,
  account: string,
  expectedPath: string
) {
  await page.getByLabel("学号或成员账号").fill(account);
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath.replaceAll("/", "\\/")}$`));
}

test("batch links preserve batchId context across roster, assessment and publication", async ({ page }) => {
  await page.goto("/admin/recruitment/batches");
  await completeAdminDemoLogin(page, "admin-alliance", "/admin/recruitment/batches");

  await page.getByRole("link", { name: "进入批次" }).first().click();
  await expect(page).toHaveURL(/\/admin\/recruitment\/batches\/batch-current$/);
  await expect(page.getByRole("heading", { level: 1, name: "2026 秋季招新" })).toBeVisible();

  await page.getByRole("link", { name: "报名名单" }).click();
  await expect(page).toHaveURL(/\/admin\/recruitment\/batches\/batch-current\/applications$/);
  await expect(page.getByRole("table", { name: "批次报名人员" })).toBeVisible();
  await expect(page.getByText("林同学")).toBeVisible();

  await page.getByRole("link", { name: "考核台" }).click();
  await expect(page).toHaveURL(/\/admin\/recruitment\/batches\/batch-current\/assessment$/);
  await expect(page.getByText("本批次考核名单")).toBeVisible();

  await page.getByRole("link", { name: "结果发布" }).click();
  await expect(page).toHaveURL(/\/admin\/recruitment\/batches\/batch-current\/publish$/);
  await expect(page.getByRole("button", { name: "发布所选结果" })).toBeVisible();
});

test("ordinary admins can inspect a batch but cannot mutate its lifecycle", async ({ page }) => {
  await page.goto("/admin/recruitment/batches/batch-current");
  await completeAdminDemoLogin(page, "media-admin", "/admin/recruitment/batches/batch-current");

  const pauseButton = page.getByRole("button", { name: "暂停报名" });
  await expect(pauseButton).toBeDisabled();
  await expect(page.getByText("普通管理员不会显示可执行的批次变更权限")).toBeVisible();
});

test("early open always asks for confirmation and competing open batch remains protected", async ({ page }) => {
  await page.goto("/admin/recruitment/batches/batch-next");
  await completeAdminDemoLogin(page, "admin-alliance", "/admin/recruitment/batches/batch-next");

  await page.getByRole("button", { name: "立即开放" }).click();
  const dialog = page.getByRole("alertdialog", { name: /确认立即开放/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("原计划时间")).toBeVisible();
  await dialog.getByRole("button", { name: "返回检查" }).click();
  await expect(dialog).toHaveCount(0);
});

test("roster data never leaks from the open batch into an archived batch", async ({ page }) => {
  await page.goto("/admin/recruitment/batches/batch-closed/applications");
  await completeAdminDemoLogin(page, "admin-alliance", "/admin/recruitment/batches/batch-closed/applications");

  await expect(page.getByRole("heading", { level: 1, name: /2025 秋季招新/ })).toBeVisible();
  await expect(page.getByRole("table", { name: "批次报名人员" })).toBeVisible();
  await expect(page.getByText("林同学")).toHaveCount(0);
});
