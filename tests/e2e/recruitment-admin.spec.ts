import { expect, test } from "@playwright/test";

async function completeAdminDemoLogin(
  page: import("@playwright/test").Page,
  expectedPath = "/admin/recruitment"
) {
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath.replaceAll("/", "\\/")}$`));
}

test("administration workbench uses a dedicated shell inside the same Web app", async ({ page }) => {
  await page.goto("/admin/recruitment");
  await expect.poll(() => new URL(page.url()).searchParams.get("redirect")).toBe("/admin/recruitment");
  await expect.poll(() => new URL(page.url()).searchParams.get("mode")).toBe("admin");
  await completeAdminDemoLogin(page);

  await expect(page).toHaveURL(/\/admin\/recruitment$/);
  await expect(page.getByRole("heading", { level: 1, name: "2026 秋季招新 · 预备成员考核" })).toBeVisible();
  await expect(page.getByRole("link", { name: "HSD 管理台" })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回官网" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主导航" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "全部人员" })).toBeVisible();
  await expect(page.getByRole("button", { name: "白泽开发中心" })).toBeVisible();
  await expect(page.getByRole("table", { name: "预备成员名单" })).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasOverflow).toBe(false);
});

test("candidate details follow the global round and center-specific round count", async ({ page }) => {
  await page.goto("/admin/recruitment");
  await completeAdminDemoLogin(page);

  await page.getByRole("button", { name: "查看处理 林同学" }).click();
  const drawer = page.getByRole("dialog", { name: "预备成员详情" });

  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("全局当前轮次：第一轮考核")).toBeVisible();
  await expect(drawer.getByLabel("第一轮结果")).toBeEnabled();
  await expect(drawer.getByLabel("第二轮结果")).toBeDisabled();
  await expect(drawer.getByLabel("第三轮结果")).toBeDisabled();
  await drawer.getByRole("button", { name: "关闭详情" }).click();
  await expect(drawer).toHaveCount(0);
});

test("offline adjustment records only regular-center destinations", async ({ page }) => {
  await page.goto("/admin/recruitment");
  await completeAdminDemoLogin(page);

  await page.getByRole("button", { name: "查看处理 陈同学" }).click();
  const drawer = page.getByRole("dialog", { name: "预备成员详情" });

  await drawer.getByLabel("第一轮结果").selectOption("failed");
  await drawer.getByRole("button", { name: "保存结果" }).click();
  await drawer.getByRole("button", { name: "确认保存" }).click();

  const finalCenter = drawer.getByLabel("最终中心");

  await expect(finalCenter).toBeVisible();
  await expect(finalCenter.locator("option[value='白泽开发中心']")).toHaveCount(0);
  await expect(finalCenter.locator("option")).toHaveText([
    "请选择最终中心",
    "新媒体中心",
    "拓维策划中心",
    "人才发展中心"
  ]);
});

test("recruitment batches and publication complete the administration workflow", async ({ page }) => {
  await page.goto("/admin/recruitment/batches");
  await completeAdminDemoLogin(page, "/admin/recruitment/batches");
  await expect(page.getByRole("heading", { level: 1, name: "招新批次" })).toBeVisible();
  await expect(page.getByRole("button", { name: "新建招新批次" })).toBeVisible();

  await page.getByRole("link", { name: "报名人员", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "报名人员" })).toBeVisible();
  await expect(page.getByRole("table", { name: "招新报名人员" })).toBeVisible();

  await page.getByRole("link", { name: "结果发布", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "结果发布" })).toBeVisible();
  await expect(page.getByRole("button", { name: "整批发布结果" })).toBeVisible();
  await expect(page.getByText("内部保存不等于对成员公开")).toBeVisible();
});

test("application roster filters, sorts, and opens a read-only application record", async ({ page }) => {
  await page.goto("/admin/recruitment/applications");
  await completeAdminDemoLogin(page, "/admin/recruitment/applications");

  await page.getByLabel("搜索报名人").fill("林");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByLabel("排序").selectOption("submittedAt.asc");
  await page.getByRole("link", { name: "查看报名 林同学" }).click();

  await expect.poll(() => new URL(page.url()).pathname)
    .toBe("/admin/recruitment/applications/candidate-lin");
  await expect(page.getByRole("heading", { level: 1, name: "林同学" })).toBeVisible();
  await expect(page.getByLabel("联系方式")).toHaveValue("lin@example.com");
  await expect(page.getByText("2026-07-30 14:28 提交")).toBeVisible();
  const applicationRecord = page.locator("#admin-main-content");
  await expect(applicationRecord.getByRole("heading", { name: "考核处理", exact: true })).toHaveCount(0);
  await expect(applicationRecord.getByRole("heading", { name: "内部备注", exact: true })).toHaveCount(0);

  await page.goto("/admin/recruitment/applications/missing");

  await expect(page).toHaveURL(/\/admin\/recruitment\/applications\/missing$/);
  await expect(page.getByRole("heading", { name: "报名记录不存在", exact: true })).toBeVisible();
});
