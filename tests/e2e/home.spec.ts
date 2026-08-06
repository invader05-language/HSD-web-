import { expect, test } from "@playwright/test";

test("desktop homepage exposes the approved content sequence", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /鸿蒙启航/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "四大中心，共同完成一件事" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "把想法做成真实项目" })).toBeVisible();
  await expect(page.getByText("智巡先锋", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "由成员记录，也由成员创作" })).toBeVisible();
});

test("homepage derives published flash and news when homepage slots are not manually curated", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("2026 秋季招新通道开放", { exact: true })).toBeVisible();
  await expect(page.getByText("从一次分享会，到一支真正协作的项目团队", { exact: true })).toBeVisible();
  await expect(page.getByText("暂无已发布快讯", { exact: true })).toHaveCount(0);
  await expect(page.getByText("暂无已发布动态", { exact: true })).toHaveCount(0);
});

test("homepage renders every curated domain through the published portal projection", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".featured-project h3")).toHaveText("智巡先锋");
  await expect(page.locator(".activities-list .activity-row")).toHaveCount(3);
  await expect(page.locator(".resource-list > a")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /年度活动影像记录/ })).toHaveAttribute("href", "/gallery/annual-activity-record");
});

test("legacy Help Center routes redirect once to their enabled fallback", async ({ page }) => {
  await page.goto("/help");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("当前版本暂未开放", { exact: true })).toBeVisible();
  await expect(page.getByRole("contentinfo").locator('a[href="/help"]')).toHaveCount(0);

  await page.goto("/admin/content");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);
  await expect.poll(() => page.evaluate(
    () => sessionStorage.getItem("baiyun-hsd.session")
  )).not.toBeNull();

  await page.goto("/admin/content/help");
  await expect(page).toHaveURL(/\/admin\/content$/);
  await expect(page.getByText("当前版本暂未开放", { exact: true })).toBeVisible();
});

test("public detail remains open and personal signup continues through login", async ({ page }) => {
  await page.goto("/activities/harmonyos-salon");
  await expect(page.getByRole("heading", { name: "HarmonyOS 原生应用入门" })).toBeVisible();

  await page.getByRole("link", { name: "登录后提交报名" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.getByRole("heading", { name: "成员登录" })).toBeVisible();
  await expect(page.getByText(/登录后将继续前往/)).toHaveCount(0);
});

test("authenticated activity signup uses the current session without asking for login again", async ({ page }) => {
  await page.goto("/login?redirect=%2Factivities%2Fharmonyos-salon");
  await expect(page.getByLabel("成员账号")).toBeVisible();
  await page.getByLabel("成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/activities\/harmonyos-salon$/);

  const signupLinks = page.getByRole("link", { name: "立即报名", exact: true });
  await expect(signupLinks).toHaveCount(2);
  await expect(page.getByText("登录后报名", { exact: true })).toHaveCount(0);
  await expect(page.getByText("登录后提交报名", { exact: true })).toHaveCount(0);

  for (let index = 0; index < 2; index += 1) {
    await expect(signupLinks.nth(index)).toHaveAttribute("href", "/activities/harmonyos-salon?signup=1");
  }
});

test("homepage resource cards open their own detail pages before any file action", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /2026 成员训练营课程包/ }).click();

  await expect(page).toHaveURL(/\/resources\/member-training-package$/);
  await expect(page.getByRole("button", { name: "文件暂未接入" })).toBeDisabled();
});

test("desktop routes do not overflow horizontally", async ({ page }) => {
  for (const path of [
    "/",
    "/about",
    "/people/core",
    "/people/members",
    "/centers",
    "/centers/baize-development",
    "/centers/new-media",
    "/centers/tuowei-planning",
    "/centers/talent-development",
    "/projects",
    "/activities",
    "/gallery",
    "/gallery/annual-activity-record",
    "/resources",
    "/resources/project-requirement-template",
    "/people/lin-development",
    "/join"
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `${path} should not overflow horizontally`).toBe(false);
  }

  await page.goto("/");
  await page.getByRole("link", { name: "结果中心" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("redirect")).toBe("/member/results");
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/member\/results$/);

  const resultsOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(resultsOverflow, "/member/results should not overflow horizontally").toBe(false);
});
