import { expect, test } from "@playwright/test";

async function completeDemoLogin(page: import("@playwright/test").Page) {
  await expect(page.getByLabel("学号或成员账号")).toBeVisible();
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
}

test("member profile lets the current user edit personal basics but not organization fields", async ({ page }) => {
  await page.goto("/member/profile");
  await expect.poll(() => new URL(page.url()).searchParams.get("redirect")).toBe("/member/profile");

  await completeDemoLogin(page);
  await expect(page).toHaveURL(/\/member\/profile$/);
  await expect(page.getByText("班级", { exact: true })).toBeVisible();
  await expect(page.getByText("当前身份", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/公开成员资料|公开头像|是否公开|手机号|微信号|待审核/)).toHaveCount(0);
  await expect(page.getByLabel("姓名")).toBeVisible();
  await expect(page.getByLabel("年级")).toBeVisible();
  await expect(page.getByLabel("班级")).toBeVisible();
  await expect(page.getByLabel("学号", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("实践方向")).toHaveJSProperty("tagName", "SELECT");
  await expect(page.getByLabel("个人简介")).toBeVisible();
  await expect(page.getByText(/上传后自动用于公开成员展示/)).toBeVisible();
});

test("saved profile values project to public pages and the member menu", async ({ page }) => {
  await page.goto("/login?redirect=%2Fmember%2Fprofile");
  await completeDemoLogin(page);

  await page.getByLabel("姓名").fill("林同学已更新");
  await page.getByLabel("年级").fill("2027 级");
  await page.getByLabel("班级").fill("软件工程 3 班");
  await page.getByLabel("实践方向").selectOption("后端架构");
  await page.getByLabel("个人简介").fill("端到端同步简介");
  await page.getByRole("button", { name: "保存个人资料" }).click();
  await expect(page.getByRole("status")).toContainText("资料已更新");

  await page.getByRole("link", { name: /个人荣誉/ }).click();
  await expect(page).toHaveURL(/\/people\/lin-development$/);
  await expect(page.getByRole("heading", { name: "林同学已更新" })).toBeVisible();
  await expect(page.getByText("后端架构", { exact: true })).toBeVisible();
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

test("administrator member menus provide a return path to the management console", async ({ page }) => {
  await page.goto("/login?redirect=%2F");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: /张同学的成员菜单/ }).click();
  await expect(page.getByRole("menuitem", { name: "进入管理端" })).toBeVisible();
  await page.getByRole("menuitem", { name: "进入管理端" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("administrator member identities render all member-facing pages", async ({ page }) => {
  await page.goto("/login?redirect=%2Fmember");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page).toHaveURL(/\/member$/);
  await expect(page.getByRole("heading", { name: "你好，张同学" })).toBeVisible();

  await page.goto("/member/profile");
  await expect(page.getByRole("heading", { name: "编辑个人资料" })).toBeVisible();
  await expect(page.getByLabel("姓名")).toHaveValue("张同学");

  await page.goto("/member/results");
  await expect(page.getByRole("heading", { name: "结果中心" })).toBeVisible();
  await expect(page.getByLabel("当前招新批次").getByText("张同学", { exact: true })).toBeVisible();

  await page.goto("/join/apply");
  await expect(page.getByRole("heading", { name: "成员注册与招新报名" })).toBeVisible();
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

test("a newly created account must replace its initial password before entering member pages", async ({ page }) => {
  await page.goto("/admin/members");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await page.getByRole("button", { name: "添加成员" }).click();
  const drawer = page.getByRole("dialog", { name: "添加正式成员" });
  await drawer.getByLabel("姓名").fill("新成员");
  await drawer.getByLabel("学号 / 登录帐号").fill("20269999");
  await drawer.getByLabel("年级").fill("2026 级");
  await drawer.getByLabel("班级").fill("软件工程 3 班");
  await drawer.getByLabel("实践方向").selectOption("后端架构");
  await page.getByRole("button", { name: "确认添加" }).click();
  await page.getByRole("button", { name: "退出" }).click();

  await page.goto("/login?redirect=%2Fmember%2Fprofile");

  await page.getByLabel("学号或成员账号").fill("20269999");
  await page.getByLabel("密码", { exact: true }).fill("hsd1314");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page).toHaveURL(/\/member\/change-password/);
  await expect.poll(() => new URL(page.url()).searchParams.get("redirect")).toBe("/member/profile");
  await page.reload();
  await expect(page).toHaveURL(/\/member\/change-password/);
  await page.getByRole("textbox", { name: /^新密码/ }).fill("new-pass-2026");
  await page.getByLabel("确认新密码", { exact: true }).fill("new-pass-2026");
  await page.getByRole("button", { name: "保存新密码并继续" }).click();

  await expect(page).toHaveURL(/\/member\/profile$/);
  await expect(page.evaluate(() => window.localStorage.getItem("baiyun-hsd-admin-access")))
    .resolves.not.toContain("new-pass-2026");
});
