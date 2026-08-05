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

async function closeBatchBeforeAssessment(page: import("@playwright/test").Page) {
  await page.goto("/admin/recruitment/batches/batch-current");
  await page.getByRole("button", { name: "提前关闭" }).click();
  const dialog = page.getByRole("alertdialog", { name: /确认提前关闭/ });
  await dialog.getByRole("button", { name: "确认提前关闭" }).click();
  await expect(page.getByRole("status")).toContainText("提前关闭已完成");
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

  await page.getByRole("link", { name: "返回批次概览" }).click();
  await page.getByRole("link", { name: "考核台" }).click();
  await expect(page).toHaveURL(/\/admin\/recruitment\/batches\/batch-current\/assessment$/);
  await expect(page.getByText("全局当前轮次：第一轮考核")).toBeVisible();
  await expect(page.getByRole("button", { name: "推进至第二轮考核" })).toBeVisible();

  await page.getByRole("button", { name: "查看处理 王同学" }).click();
  const regularDrawer = page.getByRole("dialog", { name: "预备成员详情" });
  await expect(regularDrawer.getByLabel("第一轮结果")).toBeEnabled();
  await expect(regularDrawer.getByLabel("第二轮结果")).toHaveCount(0);
  await regularDrawer.getByRole("button", { name: "关闭详情" }).click();

  await page.getByRole("button", { name: "查看处理 林同学" }).click();
  const baizeDrawer = page.getByRole("dialog", { name: "预备成员详情" });
  await expect(baizeDrawer.getByLabel("第二轮结果")).toBeDisabled();
  await baizeDrawer.getByRole("button", { name: "关闭详情" }).click();

  await page.getByRole("button", { name: "查看处理 周同学" }).click();
  const candidateDrawer = page.getByRole("dialog", { name: "预备成员详情" });
  await candidateDrawer.getByLabel("第一轮结果").selectOption("passed");
  await candidateDrawer.getByLabel("内部备注").fill("第一轮通过，等待全局推进。");
  await candidateDrawer.getByRole("button", { name: "取消" }).click();
  await closeBatchBeforeAssessment(page);
  await page.goto("/admin/recruitment/batches/batch-current/assessment");
  await expect(page.getByRole("button", { name: "查看处理 周同学" })).toBeVisible();
  await page.getByRole("button", { name: "查看处理 周同学" }).click();
  const reopenedCandidateDrawer = page.getByRole("dialog", { name: "预备成员详情" });
  await reopenedCandidateDrawer.getByLabel("第一轮结果").selectOption("passed");
  await reopenedCandidateDrawer.getByLabel("内部备注").fill("第一轮通过，等待全局推进。");
  await reopenedCandidateDrawer.getByRole("button", { name: "保存结果" }).click();
  await reopenedCandidateDrawer.getByRole("button", { name: "确认保存" }).click();
  await expect(page.getByRole("status")).toContainText("结果已保存");
  await expect(candidateDrawer).toHaveCount(0);
  await expect(page.getByRole("row", { name: /周同学/ })).toHaveCount(0);

  await page.getByRole("link", { name: "返回批次概览" }).click();
  await page
    .getByRole("navigation", { name: "当前批次工作区" })
    .getByRole("link", { name: "结果发布" })
    .click();
  await expect(page).toHaveURL(/\/admin\/recruitment\/batches\/batch-current\/publish$/);
  await expect(page.getByRole("button", { name: "整批发布结果" })).toBeDisabled();
  await expect(page.getByText("发布范围：当前批次全部候选人")).toBeVisible();
});

test("batch detail presents a structured work area for active batches", async ({ page }) => {
  await page.goto("/admin/recruitment/batches/batch-current");
  await completeAdminDemoLogin(page, "admin-alliance", "/admin/recruitment/batches/batch-current");

  await expect(page.getByRole("heading", { level: 2, name: "批次工作区" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "生命周期记录" })).toBeVisible();
  await expect(page.getByRole("link", { name: /进入名单/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /进入考核台/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /进入结果发布/ })).toBeVisible();
  await expect(page.getByText("报名人数")).toBeVisible();
  await expect(page.getByText("开放中心")).toBeVisible();
});

test("ordinary admins can inspect a batch but cannot mutate its lifecycle", async ({ page }) => {
  await page.goto("/admin/recruitment/batches/batch-current");
  await completeAdminDemoLogin(page, "media-admin", "/admin/recruitment/batches/batch-current");

  const pauseButton = page.getByRole("button", { name: "暂停报名" });
  await expect(pauseButton).toBeDisabled();
  await expect(page.getByText("当前账号仅可查看与处理授权数据")).toBeVisible();

  await page.goto("/admin/recruitment/batches");
  await expect(page.getByRole("button", { name: "新建招新批次" })).toHaveCount(0);
});

test("draft publish readiness explains schedule conflicts and successful publish closes the dialog", async ({ page }) => {
  await page.goto("/admin/recruitment/batches");
  await completeAdminDemoLogin(page, "admin-alliance", "/admin/recruitment/batches");

  await page.getByRole("button", { name: "新建招新批次" }).click();
  const drawer = page.getByRole("dialog", { name: "新建招新批次" });
  await drawer.getByLabel("批次名称").fill("111");
  await drawer.getByLabel("报名开始时间").fill("2026-08-05");
  await drawer.getByLabel("报名截止时间").fill("2026-08-28");
  await drawer.getByRole("button", { name: "保存草稿" }).click();

  const draftRow = page.getByRole("article").filter({ hasText: "111" });
  await draftRow.getByRole("link", { name: /进入批次/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "111" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "发布准备检查" })).toBeVisible();
  await expect(page.getByText(/与「2026 秋季招新」重叠/)).toBeVisible();
  await expect(page.getByRole("button", { name: "发布批次" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "修改批次时间" })).toBeVisible();

  await page.goto("/admin/recruitment/batches");
  await page.getByRole("button", { name: "新建招新批次" }).click();
  const readyDrawer = page.getByRole("dialog", { name: "新建招新批次" });
  await readyDrawer.getByLabel("批次名称").fill("2027 春季补招");
  await readyDrawer.getByLabel("报名开始时间").fill("2027-02-20");
  await readyDrawer.getByLabel("报名截止时间").fill("2027-03-08");
  await readyDrawer.getByRole("button", { name: "保存草稿" }).click();

  const readyRow = page.getByRole("article").filter({ hasText: "2027 春季补招" });
  await readyRow.getByRole("link", { name: /进入批次/ }).click();
  await expect(page.getByRole("button", { name: "发布批次" })).toBeEnabled();
  await page.getByRole("button", { name: "发布批次" }).click();
  const dialog = page.getByRole("alertdialog", { name: /确认发布批次/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "确认发布批次" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("发布批次已完成");
});

test("closed batches use a processing entry while archived batches use archive wording", async ({ page }) => {
  await page.goto("/admin/recruitment/batches");
  await completeAdminDemoLogin(page, "admin-alliance", "/admin/recruitment/batches");

  const closedRow = page.getByRole("article").filter({ hasText: "2025 秋季招新" });
  await expect(closedRow.getByRole("link", { name: /处理收尾/ })).toBeVisible();
  await expect(closedRow.getByRole("link", { name: /查看归档/ })).toHaveCount(0);
});

test("an owner can record a not-admitted adjustment without choosing a destination center", async ({ page }) => {
  await page.goto("/admin/recruitment/batches/batch-current/assessment");
  await completeAdminDemoLogin(page, "admin-alliance", "/admin/recruitment/batches/batch-current/assessment");
  await closeBatchBeforeAssessment(page);
  await page.goto("/admin/recruitment/batches/batch-current/assessment");

  await page.getByRole("button", { name: "查看处理 陈同学" }).click();
  const drawer = page.getByRole("dialog", { name: "预备成员详情" });
  await drawer.getByLabel("第一轮结果").selectOption("failed");
  await drawer.getByRole("button", { name: "保存结果" }).click();
  await drawer.getByRole("button", { name: "确认保存" }).click();
  await expect(drawer).toHaveCount(0);

  await page.getByRole("button", { name: "查看处理 陈同学" }).click();
  const adjustmentDrawer = page.getByRole("dialog", { name: "预备成员详情" });
  await adjustmentDrawer.getByLabel("最终调剂结果").selectOption("not-admitted");
  await adjustmentDrawer.getByRole("button", { name: "保存结果" }).click();
  await adjustmentDrawer.getByRole("button", { name: "确认保存" }).click();

  await expect(page.getByRole("status")).toContainText("结果已保存");
  await expect(page.getByRole("row", { name: /陈同学/ })).toHaveCount(0);
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
