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
  await expect.poll(() => new URL(page.url()).pathname).toBe(target);
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

  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/forbidden");
  await expect.poll(() => new URL(page.url()).searchParams.get("from")).toBe("/admin/accounts");
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

test("owner qualification changes are confirmed without an audit-log entry point", async ({ page }) => {
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
  await expect(memberRow).toHaveCount(0);

  await expect(page.getByRole("link", { name: "操作日志", exact: true })).toHaveCount(0);
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
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin");
  await expect(page.getByRole("button", { name: /系统管理/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "管理员资格配置", exact: true })).toHaveCount(0);
});

test("mobile administration retains identity and filtered navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInToAdmin(page, "/admin", "media-admin");

  await expect(page.locator(".admin-topbar__identity")).toContainText("李同学 · 新媒体中心负责人");
  await expect(page.getByRole("heading", { level: 1, name: "管理工作台" })).toBeVisible();
  await expect(page.locator(".admin-dashboard-grid")).toHaveCSS("grid-template-columns", "1fr");
  await page.getByRole("button", { name: "打开管理导航" }).click();
  const mobileNavigation = page.getByRole("navigation", { name: "移动端管理导航" });
  await expect(mobileNavigation).toContainText("项目管理");
  await expect(mobileNavigation).not.toContainText("管理员资格配置");
});

test("dashboard presents a capability-aware operational workbench", async ({ page }) => {
  await signInToAdmin(page, "/admin");

  await expect(page.getByRole("heading", { level: 1, name: "管理工作台" })).toBeVisible();
  await expect(page.getByRole("region", { name: "核心管理指标" }).getByRole("link")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "优先队列" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "当前操作批次" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "内容发布动态" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "门户发布状态" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "媒体健康" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "操作日志", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "上传任务", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "新建" }).click();
  const quickActions = page.getByRole("menu", { name: "快捷新建" });
  await expect(quickActions).toContainText("发布 HSD 快讯");
  await expect(quickActions).toContainText("添加成员");
  await expect(quickActions).not.toContainText("上传学习资料");
});

test("member administration defaults formal profiles to public without visibility controls", async ({ page }) => {
  await signInToAdmin(page, "/admin/members");

  await expect(page.getByRole("heading", { level: 1, name: "全体成员" })).toBeVisible();
  await expect(page.getByRole("table", { name: "成员管理名单" })).toBeVisible();
  await expect(page.getByLabel("公开资料")).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "公开资料" })).toHaveCount(0);
  await expect(page.getByText("资料待审核", { exact: true })).toHaveCount(0);

  const mediaRow = page.getByRole("row").filter({ hasText: "李同学" });
  await expect(mediaRow.getByRole("cell", { name: "—", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "查看成员 林同学" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "林同学" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "内部资料" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "公开资料" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "成长与荣誉" })).toBeVisible();
  await page.getByRole("tab", { name: "公开资料" }).click();
  await expect(page.getByLabel("资料状态")).toHaveCount(0);
  await expect(page.getByText("公开状态", { exact: true })).toHaveCount(0);
});

test("core-member administration only adds eligible formal members and keeps centres read-only", async ({ page }) => {
  await signInToAdmin(page, "/admin/core-members");

  await expect(page.getByRole("heading", { level: 1, name: "核心人员配置" })).toBeVisible();
  await expect(page.getByText(/任期|公开展示|暂不公开|拖动手柄|部落介绍展示预览/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "编辑", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "移除", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "添加核心人员" }).click();
  const dialog = page.getByRole("dialog", { name: "添加核心人员" });
  await expect(dialog.getByText("高同学", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: /选择 高同学/ }).click();
  await dialog.getByRole("button", { name: "确认添加" }).click();
  await expect(page.getByRole("list", { name: "核心人员名单" })).toContainText("高同学");
  await expect(page.getByRole("list", { name: "核心人员名单" })).toContainText("核心人员");

  await page.reload();
  await expect(page.getByRole("list", { name: "核心人员名单" })).toContainText("高同学");

  await page.getByRole("link", { name: "中心组织", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "中心组织" })).toBeVisible();
  await expect(page.getByRole("button", { name: /配置中心资料/ })).toHaveCount(0);
  await expect(page.getByText("配置中心资料", { exact: false })).toHaveCount(0);
});

test("project activity and portal content share a clear draft review publish workflow", async ({ page }) => {
  await signInToAdmin(page, "/admin/projects");
  await expect(page.getByRole("heading", { level: 1, name: "项目管理" })).toBeVisible();
  await expect(page.getByRole("table", { name: "项目管理列表" })).toBeVisible();

  await page.getByRole("link", { name: "活动管理", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "活动管理" })).toBeVisible();
  await expect(page.getByText("报名名单", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /内容与门户/ }).click();
  await page.getByRole("link", { name: "官网内容", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "官网内容" })).toBeVisible();
  await expect(page.getByRole("link", { name: "新建内容" })).toHaveAttribute("href", "/admin/content/new");
  await expect(page.getByRole("option", { name: "待发布" })).toHaveCount(1);
  await expect(page.getByRole("table", { name: "官网内容列表" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "管理端导航" })
    .getByRole("link", { name: "门户配置", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "门户配置" })).toBeVisible();
  await expect(page.getByText("固定模块，不允许删除")).toBeVisible();
});

test("portal draft preview stays isolated until an owner publishes the full configuration", async ({ page }) => {
  await signInToAdmin(page, "/admin/content/home");

  await page.getByRole("button", { name: "下移 智巡先锋" }).click();
  await page.getByRole("button", { name: "预览门户草稿" }).click();
  const preview = page.getByRole("dialog", { name: "门户草稿预览" });
  await expect(preview.getByRole("list", { name: "精选项目预览" }).getByRole("listitem").first()).toContainText("智学领航");
  await preview.getByRole("button", { name: "关闭预览" }).click();

  await page.goto("/");
  await expect(page.locator(".featured-project h3")).toHaveText("智巡先锋");

  await page.goto("/admin/content/home");
  await page.getByRole("button", { name: "发布门户配置" }).click();
  const confirmation = page.getByRole("dialog", { name: /确认整份发布门户配置/ });
  await confirmation.getByRole("button", { name: "确认整份发布" }).click();
  await expect(page.getByRole("status")).toContainText("门户配置已整份发布");

  await page.goto("/");
  await expect(page.locator(".featured-project h3")).toHaveText("智学领航");
});

test("portal visuals are merged and the legacy banner route redirects to them", async ({ page }) => {
  await signInToAdmin(page, "/admin/content/home");
  await page.goto("/admin/content/banners");

  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/content/home");
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe("visuals");
  await expect(page.getByRole("heading", { level: 1, name: "门户配置" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "页面主视觉" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("官网首页主视觉素材")).toBeVisible();
  await expect(page.getByLabel("加入我们主视觉素材")).toBeVisible();
  await expect(page.getByText("招新按钮是否可用仍由招新批次控制")).toBeVisible();
});

test("media uploads and learning resources expose honest storage states", async ({ page }) => {
  await signInToAdmin(page, "/admin/media");
  await expect(page.getByRole("heading", { level: 1, name: "媒体素材库" })).toBeVisible();
  await expect(page.getByText("处理中", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "上传素材" }).click();
  await expect(page.getByRole("heading", { name: "上传新素材" })).toBeVisible();
  await expect(page.getByText("等待上传")).toBeVisible();
  await page.getByRole("button", { name: "关闭上传面板" }).click();
  await page.locator(".admin-asset-card").first().click();
  await expect(page.getByRole("button", { name: "移入回收站" })).toHaveCount(0);
  await page.getByRole("button", { name: "关闭素材详情" }).click();

  await page.getByRole("link", { name: "学习资料", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "学习资料" })).toBeVisible();
  await expect(page.getByRole("table", { name: "学习资料管理列表" })).toBeVisible();
  await page.getByRole("button", { name: "编辑资源 HarmonyOS 入门路线" }).click();
  await expect(page.getByText("版本历史")).toBeVisible();
  await expect(page.getByText("病毒扫描与 Office 转换将在后端接入")).toBeVisible();
});
