import { expect, test } from "@playwright/test";

async function completeDemoLogin(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => Boolean(
    (document.querySelector("form") as Element & { __vueParentComponent?: unknown })?.__vueParentComponent
  ));
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
}

test("member profile lets the current user edit personal basics but not organization fields", async ({ page }) => {
  await page.goto("/member/profile");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fmember%2Fprofile$/);

  await completeDemoLogin(page);
  await expect(page).toHaveURL(/\/member\/profile$/);
  await expect(page.getByText("班级", { exact: true })).toBeVisible();
  await expect(page.getByText("当前身份", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/公开成员资料|公开头像|是否公开|手机号|微信号|待审核/)).toHaveCount(0);
  await expect(page.getByLabel("姓名")).toBeVisible();
  await expect(page.getByLabel("年级")).toBeVisible();
  await expect(page.getByLabel("班级")).toBeVisible();
  await expect(page.getByLabel("学号", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("实践方向")).toBeVisible();
  await expect(page.getByLabel("个人简介")).toBeVisible();
  await expect(page.getByText(/上传后自动用于公开成员展示/)).toBeVisible();
});

test("saved profile values project to public pages and the member menu", async ({ page }) => {
  await page.goto("/login?redirect=%2Fmember%2Fprofile");
  await completeDemoLogin(page);

  await page.getByLabel("姓名").fill("林同学已更新");
  await page.getByLabel("年级").fill("2027 级");
  await page.getByLabel("班级").fill("软件工程 3 班");
  await page.getByLabel("实践方向").fill("端到端实践方向");
  await page.getByLabel("个人简介").fill("端到端同步简介");
  await page.getByRole("button", { name: "保存个人资料" }).click();
  await expect(page.getByRole("status")).toContainText("资料已更新");

  await page.getByRole("link", { name: /个人荣誉/ }).click();
  await expect(page).toHaveURL(/\/people\/lin-development$/);
  await expect(page.getByRole("heading", { name: "林同学已更新" })).toBeVisible();
  await expect(page.getByText("端到端实践方向", { exact: true })).toBeVisible();
  await expect(page.getByText("端到端同步简介", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /林同学已更新的成员菜单/ }).click();
  await expect(page.getByRole("menuitem", { name: "编辑个人资料" })).toBeVisible();
  await expect(page.getByRole("link", { name: "登录" })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "个人中心" }).click();
  await expect(page).toHaveURL(/\/member$/);
  await expect(page.getByRole("heading", { name: "你好，林同学已更新" })).toBeVisible();
  await page.getByRole("navigation", { name: "成员空间导航" }).getByRole("link", { name: "编辑个人资料" }).click();
  await expect(page.getByLabel("年级")).toHaveValue("2027 级");
  await expect(page.getByLabel("班级")).toHaveValue("软件工程 3 班");

  await page.getByRole("button", { name: /林同学已更新的成员菜单/ }).click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "登录" })).toBeVisible();
});

test("avatar selection previews locally and the profile remains usable on mobile", async ({ page }) => {
  await page.goto("/login?redirect=%2Fmember%2Fprofile");
  await completeDemoLogin(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.locator("input[type=file]").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from("not-a-real-image")
  });
  await expect(page.getByRole("button", { name: "移除当前预览" })).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});
