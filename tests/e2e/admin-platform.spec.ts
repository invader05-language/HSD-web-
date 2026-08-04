import { expect, test } from "@playwright/test";

async function signInToAdmin(
  page: import("@playwright/test").Page,
  target = "/admin/recruitment",
  account = "admin-alliance"
) {
  await page.goto(target);
  await page.getByLabel("学号或成员账号").fill(account);
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(new RegExp(`${target.replace("/", "\\/")}$`));
}

test("administration shell exposes all domains and fills the full desktop height", async ({ page }) => {
  await signInToAdmin(page);

  const sidebar = page.locator(".admin-sidebar");
  const frame = page.locator(".admin-frame");
  const viewport = page.viewportSize();
  const sidebarBox = await sidebar.boundingBox();

  expect(sidebarBox?.height).toBe(viewport?.height);
  await expect(page.getByRole("navigation", { name: "管理端导航" })).toContainText("媒体与资源");
  await expect(page.getByRole("navigation", { name: "管理端导航" })).toContainText("系统管理");

  const backgroundImage = await frame.evaluate(
    (element) => getComputedStyle(element).backgroundImage
  );
  expect(backgroundImage).toContain("linear-gradient");
});

test("administration navigation stays isolated from the public site header", async ({ page }) => {
  await signInToAdmin(page);

  await expect(page.getByRole("navigation", { name: "主导航" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "返回官网" })).toBeVisible();
});

test("administrator denial identifies the owner-only destination", async ({ page }) => {
  await page.goto("/admin/accounts");
  await page.getByLabel("学号或成员账号").fill("media-admin");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page).toHaveURL(/\/admin\/forbidden\?from=%2Fadmin%2Faccounts$/);
  await expect(page.getByText("联盟总负责人资格", { exact: true })).toBeVisible();
});

test("login modes reject members from administrator access and admit qualified accounts", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("radio", { name: "成员登录" })).toBeChecked();
  await page.getByRole("radio", { name: "管理员登录" }).check();
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page.getByRole("alert")).toContainText("该账号未获管理员资格");

  await page.getByLabel("学号或成员账号").fill("media-admin");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("owner qualification changes are confirmed and written to the audit log", async ({ page }) => {
  await signInToAdmin(page, "/admin/accounts");

  const accounts = page.getByRole("table", { name: "管理员资格配置列表" });
  const confirm = page.getByRole("alertdialog");
  const adminRow = accounts.getByRole("row").filter({ hasText: "media-admin" });

  await page.getByRole("button", { name: "添加管理员" }).click();
  const addDialog = page.getByRole("dialog", { name: "添加管理员" });
  await addDialog.getByLabel("搜索平台用户").fill("demo-member");
  await addDialog.getByRole("button", { name: /选择 demo-member/ }).click();
  await addDialog.getByLabel("管理级别").selectOption({ label: "白泽开发中心负责人" });
  await addDialog.getByRole("button", { name: "确认添加" }).click();
  const memberRow = accounts.getByRole("row").filter({ hasText: "demo-member" });
  await expect(memberRow).toContainText("白泽开发中心负责人");

  await adminRow.getByRole("button", { name: "停用管理员资格" }).click();
  await confirm.getByRole("button", { name: "确认变更" }).click();
  await expect(adminRow).toContainText("已停用");

  await adminRow.getByRole("button", { name: "启用管理员资格" }).click();
  await confirm.getByRole("button", { name: "确认变更" }).click();
  await expect(adminRow).toContainText("已启用");

  await memberRow.getByRole("button", { name: "撤销资格" }).click();
  await confirm.getByRole("button", { name: "确认变更" }).click();
  await expect(memberRow).toContainText("普通成员");

  await page.getByRole("link", { name: "操作日志", exact: true }).click();
  const audit = page.getByRole("table", { name: "管理员操作日志" });
  await expect(audit).toContainText("分配中心负责人资格");
  await expect(audit).toContainText("停用管理员资格");
  await expect(audit).toContainText("启用管理员资格");
  await expect(audit).toContainText("撤销管理员资格");
});

test("a newly qualified account can start an admin session but cannot manage accounts", async ({ page }) => {
  await signInToAdmin(page, "/admin/accounts");

  const accounts = page.getByRole("table", { name: "管理员资格配置列表" });
  await page.getByRole("button", { name: "添加管理员" }).click();
  const addDialog = page.getByRole("dialog", { name: "添加管理员" });
  await addDialog.getByLabel("搜索平台用户").fill("demo-member");
  await addDialog.getByRole("button", { name: /选择 demo-member/ }).click();
  await addDialog.getByLabel("管理级别").selectOption({ label: "白泽开发中心负责人" });
  await addDialog.getByRole("button", { name: "确认添加" }).click();

  await page.getByRole("button", { name: "退出" }).click();
  await page.getByRole("link", { name: "登录", exact: true }).click();
  await page.getByRole("radio", { name: "管理员登录" }).check();
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("button", { name: /系统管理/ }).click();
  await expect(page.getByRole("link", { name: "管理员资格配置", exact: true })).toHaveCount(0);
});

test("mobile administration retains identity and filtered navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInToAdmin(page, "/admin/recruitment", "media-admin");

  await expect(page.locator(".admin-topbar__identity")).toContainText("李同学 · 新媒体中心负责人");
  await page.getByRole("button", { name: "打开管理导航" }).click();
  const mobileNavigation = page.getByRole("navigation", { name: "移动端管理导航" });
  await expect(mobileNavigation).toContainText("项目管理");
  await expect(mobileNavigation).not.toContainText("管理员资格配置");
});

test("dashboard prioritizes actionable work instead of decorative charts", async ({ page }) => {
  await signInToAdmin(page, "/admin");

  await expect(page.getByRole("heading", { level: 1, name: "管理工作台" })).toBeVisible();
  await expect(page.getByRole("region", { name: "核心管理指标" }).getByRole("link")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "今日待办" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "招新进度" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "媒体与存储" })).toBeVisible();

  await page.getByRole("button", { name: "新建" }).click();
  await expect(page.getByRole("menu", { name: "快捷新建" })).toContainText("上传学习资料");
});

test("member administration separates internal public and growth information", async ({ page }) => {
  await signInToAdmin(page, "/admin/members");

  await expect(page.getByRole("heading", { level: 1, name: "全体成员" })).toBeVisible();
  await expect(page.getByRole("table", { name: "成员管理名单" })).toBeVisible();
  await page.getByRole("link", { name: "查看成员 林同学" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "林同学" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "内部资料" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "公开资料" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "成长与荣誉" })).toBeVisible();
});

test("project activity and portal content share a clear draft review publish workflow", async ({ page }) => {
  await signInToAdmin(page, "/admin/projects");
  await expect(page.getByRole("heading", { level: 1, name: "项目管理" })).toBeVisible();
  await expect(page.getByRole("table", { name: "项目管理列表" })).toBeVisible();

  await page.getByRole("link", { name: "活动管理", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "活动管理" })).toBeVisible();
  await expect(page.getByText("报名名单", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /内容与门户/ }).click();
  await page.getByRole("link", { name: "内容管理", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "内容管理" })).toBeVisible();
  await expect(page.getByText("保存草稿")).toBeVisible();

  await page.getByRole("link", { name: "首页配置", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "首页内容配置" })).toBeVisible();
  await expect(page.getByText("固定模块，不允许删除")).toBeVisible();
});

test("media uploads and learning resources expose honest storage states", async ({ page }) => {
  await signInToAdmin(page, "/admin/media");
  await expect(page.getByRole("heading", { level: 1, name: "媒体素材库" })).toBeVisible();
  await expect(page.getByText("处理中", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "上传素材" }).click();
  await expect(page.getByRole("heading", { name: "上传新素材" })).toBeVisible();
  await expect(page.getByText("等待上传")).toBeVisible();
  await page.getByRole("button", { name: "关闭上传面板" }).click();

  await page.getByRole("link", { name: "学习资料", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "学习资料" })).toBeVisible();
  await expect(page.getByRole("table", { name: "学习资料管理列表" })).toBeVisible();
  await page.getByRole("button", { name: "编辑资源 HarmonyOS 入门路线" }).click();
  await expect(page.getByText("版本历史")).toBeVisible();
  await expect(page.getByText("病毒扫描与 Office 转换将在后端接入")).toBeVisible();
});

test("audit records make sensitive operations reviewable", async ({ page }) => {
  await signInToAdmin(page, "/admin/logs");
  await expect(page.getByRole("heading", { level: 1, name: "操作日志" })).toBeVisible();
  await expect(page.getByRole("table", { name: "管理员操作日志" })).toBeVisible();
  await expect(page.getByRole("button", { name: "变更前 / 变更后" }).first()).toBeVisible();
});
