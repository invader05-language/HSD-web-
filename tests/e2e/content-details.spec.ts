import { expect, test } from "@playwright/test";

test("dynamic and activity views expose only their requested public record types", async ({ page }) => {
  const views = [
    { value: "all", label: "全部动态", shown: ["校园影像叙事与活动摄影", "从一次分享会，到一支真正协作的项目团队", "实训工作室暑期开放安排"] },
    { value: "activities", label: "活动", shown: ["校园影像叙事与活动摄影"], hidden: ["从一次分享会，到一支真正协作的项目团队", "实训工作室暑期开放安排"] },
    { value: "articles", label: "新闻", shown: ["从一次分享会，到一支真正协作的项目团队"], hidden: ["HarmonyOS 原生应用入门", "实训工作室暑期开放安排"] },
    { value: "notices", label: "公告", shown: ["实训工作室暑期开放安排"], hidden: ["HarmonyOS 原生应用入门", "从一次分享会，到一支真正协作的项目团队"] },
  ] as const;

  for (const view of views) {
    await page.goto(`/activities?view=${view.value}`);
    await expect(page.getByRole("heading", { level: 1, name: "动态与活动" })).toBeVisible();
    await expect(page.getByRole("link", { name: view.label, exact: true })).toHaveAttribute("aria-current", "page");
    for (const title of view.shown) await expect(page.getByRole("heading", { name: title })).toBeVisible();
    for (const title of view.hidden ?? []) await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  }
});

test("all public updates use their domain timeline time and keep detail routes", async ({ page }) => {
  await page.goto("/activities?view=all");
  const items = page.getByTestId("public-timeline-item");

  await expect(items).toHaveCount(5);
  await expect(items.nth(0)).toContainText("校园影像叙事与活动摄影");
  await expect(items.nth(3)).toContainText("从一次分享会，到一支真正协作的项目团队");
  await expect(items.nth(4)).toContainText("实训工作室暑期开放安排");
  await expect(page.getByRole("link", { name: /HarmonyOS 原生应用入门/ })).toHaveAttribute("href", "/activities/harmonyos-salon");
  await expect(page.getByRole("link", { name: /从一次分享会，到一支真正协作的项目团队/ })).toHaveAttribute("href", "/updates/project-team");
});

test("activity timeline keeps event dates in a stable non-wrapping date column", async ({ page }) => {
  await page.goto("/activities?view=activities");
  const firstDate = page.getByTestId("public-timeline-item").first().locator("time");
  await expect(firstDate).toHaveText("2026.08.22");
  await expect(firstDate).toHaveCSS("white-space", "nowrap");
});

test("published news and notices have public details while unknown updates return 404", async ({ page }) => {
  await page.goto("/updates/project-team");
  await expect(page.getByRole("heading", { level: 1, name: "从一次分享会，到一支真正协作的项目团队" })).toBeVisible();
  await expect(page.getByRole("article").getByText("记录成员从技术交流到原型落地。", { exact: true })).toBeVisible();
  await expect(page.getByText(/审核|退回|下架原因/)).toHaveCount(0);

  await page.goto("/updates/studio-hours");
  await expect(page.getByText("通知公告", { exact: true }).first()).toBeVisible();

  await page.goto("/updates/missing");
  await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "动态不存在" })).toBeVisible();
});

test("resource entries open details before any file action", async ({ page }) => {
  await page.goto("/resources");
  await page.getByRole("link", { name: /校园科创项目需求说明模板/ }).click();

  await expect(page).toHaveURL(/\/resources\/project-requirement-template$/);
  await expect(page.getByRole("heading", { level: 1, name: "校园科创项目需求说明模板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "文件暂未接入" })).toBeDisabled();
  await expect(page.getByText("DOCX", { exact: true })).toBeVisible();
});

test("unknown resource returns 404", async ({ page }) => {
  const response = await page.goto("/resources/missing");
  expect(response?.status()).toBe(404);
});

test("external resources are explicitly marked and open in a new tab", async ({ page }) => {
  await page.goto("/resources/harmonyos-official-docs");
  const link = page.getByRole("link", { name: "前往外部网站" });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
});

test("internal resource login continues to an honest unavailable state", async ({ page }) => {
  await page.goto("/resources/member-training-package");

  await expect(page.getByRole("button", { name: "文件暂未接入" })).toBeDisabled();
  await page.getByRole("link", { name: "登录查看下载权限" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fresources%2Fmember-training-package$/);
  await expect(page.getByLabel("学号或成员账号")).toBeVisible();

  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page).toHaveURL(/\/resources\/member-training-package$/);
  await expect(page.getByRole("button", { name: "文件暂未接入" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "登录查看下载权限" })).toHaveCount(0);
  await expect(page.getByText("已登录，文件接入后将开放成员下载权限。", { exact: true })).toBeVisible();
});

test("member results require login and continue back after demo sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "结果中心" }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get("redirect")).toBe("/member/results");
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page).toHaveURL(/\/member\/results$/);
  await expect(page.getByRole("heading", { level: 1, name: "结果中心" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "你已正式加入白泽开发中心" })).toBeVisible();
  await expect(page.getByText(/报到时间|报到地点|携带材料|确认加入|放弃名额/)).toHaveCount(0);
});

test("gallery pagination moves between distinct album pages", async ({ page }) => {
  await page.goto("/gallery");
  await page.waitForFunction(() => Boolean(
    (document.querySelector("#__nuxt") as Element & { __vue_app__?: unknown })?.__vue_app__
  ));

  await expect(page.getByRole("link", { name: /年度活动影像记录/ })).toBeVisible();
  await page.getByRole("button", { name: "下一页" }).click();

  await expect(page.getByRole("link", { name: /开发者训练营纪实/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /年度活动影像记录/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "2", exact: true })).toHaveClass(/is-active/);
  await expect(page.getByRole("button", { name: "上一页" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "下一页" })).toBeDisabled();
});

test("gallery page count follows the filtered result count", async ({ page }) => {
  await page.goto("/gallery");
  await page.waitForFunction(() => Boolean(
    (document.querySelector("#__nuxt") as Element & { __vue_app__?: unknown })?.__vue_app__
  ));

  await page.getByRole("button", { name: "海报设计", exact: true }).click();

  await expect(page.getByText("共 3 件作品", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "媒体作品分页" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "2", exact: true })).toHaveCount(0);
});

test("single-page catalogs do not expose dead previous or next controls", async ({ page }) => {
  for (const [path, label] of [
    ["/projects", "项目分页"],
    ["/activities", "活动分页"],
    ["/resources", "资源分页"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("navigation", { name: label })).toHaveCount(0);
  }
});

test("gallery album uses full media frames and an accessible lightbox", async ({ page }) => {
  await page.goto("/gallery");
  await page.getByRole("link", { name: /年度活动影像记录/ }).click();

  await expect(page).toHaveURL(/\/gallery\/annual-activity-record$/);
  const media = page.getByTestId("gallery-media");
  await expect(media).toHaveCount(12);
  await expect(media.first().locator(".media-placeholder")).toHaveCount(0);
  await expect(media.first().getByText("开场前的最后一次确认")).toBeVisible();
  await page.waitForFunction(() => Boolean(
    (document.querySelector("#__nuxt") as Element & { __vue_app__?: unknown })?.__vue_app__
  ));

  await media.first().click();
  const dialog = page.getByRole("dialog", { name: "照片浏览" });
  const closeButton = page.getByRole("button", { name: "关闭照片浏览" });
  await expect(dialog).toBeVisible();
  await expect(closeButton).toBeFocused();
  await expect(page.locator("body")).toHaveClass(/is-scroll-locked/);
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("分享与讨论")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/is-scroll-locked/);
  await expect(media.first()).toBeFocused();
});

test("gallery loads twelve more assets without replacing the first batch", async ({ page }) => {
  await page.goto("/gallery/annual-activity-record");
  await expect(page.getByTestId("gallery-media")).toHaveCount(12);
  await page.getByRole("button", { name: "继续加载 6 张" }).click();
  await expect(page.getByTestId("gallery-media")).toHaveCount(18);
});

test("unknown gallery album returns 404", async ({ page }) => {
  const response = await page.goto("/gallery/missing");
  expect(response?.status()).toBe(404);
});
