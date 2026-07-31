import { expect, test } from "@playwright/test";

async function completeDemoLogin(page: import("@playwright/test").Page) {
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
}

test.describe("join recruitment application navigation", () => {
  test("guest recruitment CTAs both continue through login", async ({ page }) => {
    await page.goto("/join");

    const ctas = page.getByRole("link", { name: "登录后填写报名表" });
    await expect(ctas).toHaveCount(2);
    await expect(ctas.nth(0)).toHaveAttribute("href", "/login?redirect=%2Fjoin%2Fapply");
    await expect(ctas.nth(1)).toHaveAttribute("href", "/login?redirect=%2Fjoin%2Fapply");

    for (let index = 0; index < 2; index += 1) {
      await page.goto("/join");
      await page.getByRole("link", { name: "登录后填写报名表" }).nth(index).click();
      await expect(page).toHaveURL(/\/login\?redirect=%2Fjoin%2Fapply$/);
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
    await expect(page).toHaveURL(/\/login\?redirect=%2Fjoin%2Fapply$/);
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
    await page.getByRole("radio", { name: "接受调剂" }).check();
    await page.getByRole("button", { name: "下一步" }).click();

    await expect(page.getByRole("heading", { name: "确认并提交" })).toBeVisible();
    await expect(page.getByText("applicant@example.com（仅招新联系）")).toBeVisible();
    await page.getByRole("checkbox", { name: /我确认以上资料真实/ }).check();
    await page.getByRole("button", { name: "确认并提交报名" }).click();

    await expect(page.getByRole("heading", { name: "成员注册与招新报名已提交" })).toBeVisible();
    await expect(page.getByText("预备成员", { exact: true })).toBeVisible();
    await expect(page.getByText("待确定", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "进入个人中心" }).click();
    await expect(page.getByRole("heading", { name: "你好，报名同学" })).toBeVisible();
    await expect(page.getByText("已提交", { exact: true })).toBeVisible();
    await expect(page.getByText("预备成员", { exact: true })).toBeVisible();
    await expect(page.getByText("待确定", { exact: true })).toBeVisible();
    await expect(page.getByText("applicant@example.com", { exact: false })).toHaveCount(0);
  });

  test("future steps cannot bypass the required first-step contact field", async ({ page }) => {
    await page.goto("/login?redirect=%2Fjoin%2Fapply");
    await completeDemoLogin(page);

    await page.getByRole("button", { name: /03 确认并提交/ }).click();
    await expect(page.getByRole("heading", { name: "完善个人资料" })).toBeVisible();
    await expect(page.getByText("请填写 4–50 个字符的联系方式。")).toBeVisible();
  });
});
