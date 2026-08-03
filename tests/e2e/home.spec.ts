import { expect, test } from "@playwright/test";

test("desktop homepage exposes the approved content sequence", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /鸿蒙启航/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "四大中心，共同完成一件事" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "把想法做成真实项目" })).toBeVisible();
  await expect(page.getByText("智巡先锋", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "由成员记录，也由成员创作" })).toBeVisible();
});

test("public detail remains open and personal signup continues through login", async ({ page }) => {
  await page.goto("/activities/harmonyos-salon");
  await expect(page.getByRole("heading", { name: "HarmonyOS 原生应用入门" })).toBeVisible();

  await page.getByRole("link", { name: "登录后提交报名" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.getByRole("heading", { name: "成员登录" })).toBeVisible();
});

test("homepage resource cards open their own detail pages before any file action", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /2026 成员训练营课程资料/ }).click();

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
    "/join",
    "/help"
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `${path} should not overflow horizontally`).toBe(false);
  }

  await page.goto("/");
  await page.getByRole("link", { name: "结果中心" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fmember%2Fresults$/);
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/member\/results$/);

  const resultsOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(resultsOverflow, "/member/results should not overflow horizontally").toBe(false);
});
