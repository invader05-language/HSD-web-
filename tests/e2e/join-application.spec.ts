import { expect, test } from "@playwright/test";

async function completeDemoLogin(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => Boolean(
    (document.querySelector("form") as Element & { __vueParentComponent?: unknown })?.__vueParentComponent
  ));
  await page.getByLabel("学号或成员账号").fill("demo-applicant");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
}

test.describe("join recruitment application navigation", () => {
  test("shows the current batch and explains automatic batch linkage", async ({ page }) => {
    await page.goto("/join");

    await expect(page.getByRole("heading", { name: "2026 秋季招新" })).toBeVisible();
    await expect(page.getByText("系统会自动将本次报名关联到当前批次")).toBeVisible();
    await expect(page.getByRole("link", { name: "登录后填写报名表" }).first()).toBeVisible();
  });

  test("guest recruitment CTAs both continue through login", async ({ page }) => {
    await page.goto("/join");

    const ctas = page.getByRole("link", { name: "登录后填写报名表" });
    await expect(ctas).toHaveCount(2);
    await expect(ctas.nth(0)).toHaveAttribute("href", "/login?redirect=%2Fjoin%2Fapply");
    await expect(ctas.nth(1)).toHaveAttribute("href", "/login?redirect=%2Fjoin%2Fapply");

    for (let index = 0; index < 2; index += 1) {
      await page.goto("/join");
      await page.getByRole("link", { name: "登录后填写报名表" }).nth(index).click();
      await expect.poll(() => new URL(page.url()).searchParams.get("redirect")).toBe("/join/apply");
    }
  });

  test("authenticated recruitment CTAs go directly to the application", async ({ page }) => {
    for (let index = 0; index < 2; index += 1) {
      await page.goto("/login?redirect=%2Fjoin");
      await completeDemoLogin(page);
      await expect(page).toHaveURL(/\/join$/);

      const ctas = page.getByRole("link", { name: "开始填写报名表" });
      await expect(ctas).toHaveCount(2);
      await expect(ctas.nth(index)).toHaveAttribute("href", "/join/apply");
      await ctas.nth(index).click();
      await expect(page).toHaveURL(/\/join\/apply$/);
      await expect(page.getByRole("heading", { name: "成员注册与招新报名" })).toBeVisible();
    }
  });

  test("guest direct navigation to the application remains protected", async ({ page }) => {
    await page.goto("/join/apply");
    await expect.poll(() => new URL(page.url()).searchParams.get("redirect")).toBe("/join/apply");
    await expect(page.getByRole("heading", { name: "成员登录" })).toBeVisible();
  });

  test("a member completes the three-step registration without publishing private contact", async ({ page }) => {
    await page.goto("/login?redirect=%2Fjoin%2Fapply");
    await completeDemoLogin(page);

    await expect(page.getByRole("heading", { name: "成员注册与招新报名" })).toBeVisible();
    await expect(page.getByRole("button", { name: /完善个人资料/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /填写报名志愿/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /确认并提交/ })).toBeVisible();
    await expect(page.getByText("经历与期待")).toHaveCount(0);
    await expect(page.getByText(/上传后自动用于公开成员展示/)).toBeVisible();
    await expect(page.locator('[data-field="direction"]')).toHaveCount(0);
    await expect(page.getByText("20–180 个字符", { exact: false })).toHaveCount(0);

    await page.getByLabel("姓名", { exact: true }).fill("报名同学");
    await page.locator('[data-field="contact"] input').fill("applicant@example.com");
    await page.getByRole("button", { name: "下一步" }).click();
    await expect(page.getByRole("heading", { name: "填写报名志愿" })).toBeVisible();

    const firstChoice = page.locator('[data-field="firstChoice"] select');
    await firstChoice.selectOption("白泽开发中心");
    const baizeDirection = page.locator('[data-field="baizeDirection"] select');
    await expect(baizeDirection).toBeVisible();
    await baizeDirection.selectOption("鸿蒙开发");
    await firstChoice.selectOption("新媒体中心");
    await expect(baizeDirection).toHaveCount(0);
    await page.getByRole("radio", { name: "接受调剂", exact: true }).check();
    await page.getByRole("button", { name: "下一步" }).click();

    await expect(page.getByRole("heading", { name: "确认并提交" })).toBeVisible();
    await expect(page.getByText("applicant@example.com（仅招新联系）")).toBeVisible();
    await expect(page.getByText(/^实践方向：/)).toHaveCount(0);
    await page.getByRole("checkbox", { name: /我确认以上资料真实/ }).check();
    await page.getByRole("button", { name: "确认并提交报名" }).click();

    await expect(page.getByRole("heading", { name: "成员注册与招新报名已提交" })).toBeVisible();
    await expect(page.getByText("预备成员", { exact: true })).toBeVisible();
    await expect(page.getByText("待确定", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "进入个人中心" }).click();
    await expect(page.getByRole("heading", { name: "你好，报名同学" })).toBeVisible();
    await expect(page.getByText("已提交", { exact: true })).toBeVisible();
    await expect(page.locator("#application").getByText("预备成员", { exact: true })).toBeVisible();
    await expect(page.locator("#application").getByText("待确定", { exact: true })).toBeVisible();
    await expect(page.getByText("applicant@example.com", { exact: false })).toHaveCount(0);

    await page.getByRole("navigation", { name: "成员空间导航" }).getByRole("link", { name: "结果中心" }).click();
    await expect(page.getByRole("heading", { name: "录取结果待公布" })).toBeVisible();
    await expect(page.getByText("你已正式加入白泽开发中心")).toHaveCount(0);

    await page.goto("/people/core");
    await expect(page.getByRole("heading", { level: 2, name: "林同学" })).toBeVisible();
    await expect(page.getByText("报名同学", { exact: true })).toHaveCount(0);
  });

  test("application page identifies the captured batch before submission", async ({ page }) => {
    await page.goto("/login?redirect=%2Fjoin%2Fapply");
    await completeDemoLogin(page);

    await page.getByLabel("姓名", { exact: true }).fill("批次测试同学");
    await page.locator('[data-field="contact"] input').fill("batch@example.com");
    await page.getByRole("button", { name: "下一步" }).click();
    await page.locator('[data-field="firstChoice"] select').selectOption("新媒体中心");
    await page.getByRole("radio", { name: "接受调剂", exact: true }).check();
    await page.getByRole("button", { name: "下一步" }).click();

    await expect(page.getByText("当前批次：2026 秋季招新")).toBeVisible();
    await expect(page.getByText("系统将自动关联本批次，不支持手动切换")).toBeVisible();
  });

  test("a submitted application can be edited, withdrawn, resubmitted, and seen by administrators", async ({ page }) => {
    await page.goto("/login?redirect=/join/apply");
    await completeDemoLogin(page);

    await page.getByLabel("姓名", { exact: true }).fill("管理端联动同学");
    await page.locator('[data-field="contact"] input').fill("linked@example.com");
    await page.getByRole("button", { name: "下一步" }).click();
    await page.locator('[data-field="firstChoice"] select').selectOption("新媒体中心");
    await page.getByRole("radio", { name: "接受调剂", exact: true }).check();
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("checkbox", { name: /我确认以上资料真实/ }).check();
    await page.getByRole("button", { name: "确认并提交报名" }).click();

    await page.getByRole("button", { name: "修改报名" }).click();
    await page.getByRole("button", { name: /填写报名志愿/ }).click();
    await page.locator('[data-field="firstChoice"] select').selectOption("拓维策划中心");
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("checkbox", { name: /我确认以上资料真实/ }).check();
    await page.getByRole("button", { name: "确认并保存修改" }).click();
    await page.getByText("查看已提交报名摘要").click();
    await expect(page.getByText("第一志愿：拓维策划中心")).toBeVisible();

    await page.getByRole("button", { name: "撤回报名" }).click();
    await page.getByRole("button", { name: "确认撤回" }).click();
    await expect(page.getByText("报名已撤回，可在截止时间前修改后重新提交。")).toBeVisible();
    await page.getByRole("button", { name: /确认并提交/ }).click();
    await page.getByRole("checkbox", { name: /我确认以上资料真实/ }).check();
    await page.getByRole("button", { name: "确认并重新提交报名" }).click();

    await page.getByRole("link", { name: "进入个人中心" }).click();
    await page.getByRole("button", { name: "退出登录" }).click();
    await page.getByRole("link", { name: "登录" }).click();
    await page.getByRole("radio", { name: "管理员登录" }).check();
    await page.getByLabel("学号或成员账号").fill("admin-alliance");
    await page.getByLabel("密码", { exact: true }).fill("demo-password");
    await page.getByRole("button", { name: "登录并继续" }).click();
    await page.getByRole("button", { name: /招新与考核/ }).click();
    await page.getByRole("link", { name: "报名人员", exact: true }).click();

    const row = page.getByRole("row").filter({ hasText: "管理端联动同学" });
    await expect(row).toContainText("拓维策划中心");
    await row.getByRole("link", { name: "查看报名 管理端联动同学" }).click();
    await expect(page.getByRole("heading", { name: "管理端联动同学" })).toBeVisible();
    await expect(page.getByLabel("联系方式")).toHaveValue("linked@example.com");
  });

  test("future steps cannot bypass the required first-step contact field", async ({ page }) => {
    await page.goto("/login?redirect=%2Fjoin%2Fapply");
    await completeDemoLogin(page);

    await page.getByRole("button", { name: /03 确认并提交/ }).click();
    await expect(page.getByRole("heading", { name: "完善个人资料" })).toBeVisible();
    await expect(page.getByText("请填写 4–50 个字符的联系方式。")).toBeVisible();
  });
});
